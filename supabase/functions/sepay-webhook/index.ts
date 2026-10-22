// Supabase Edge Function: sepay-webhook
// Deno TypeScript Runtime

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface SePayWebhookPayload {
  id: number;
  gateway: string;
  transactionDate: string; // "YYYY-MM-DD HH:mm:ss"
  accountNumber: string;
  subAccount?: string | null;
  code?: string | null;
  content: string;
  transferType: "in" | "out";
  description: string;
  transferAmount: number;
  accumulated?: number;
  referenceCode?: string;
}

serve(async (req: Request) => {
  // Chỉ nhận HTTP POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 1. Xác thực Secret Key / API Token từ SePay
  const configuredSecret = Deno.env.get("SEPAY_WEBHOOK_SECRET");
  const incomingAuthHeader = req.headers.get("Authorization") || "";
  const incomingSecretKey = req.headers.get("X-Secret-Key") || "";
  
  // SePay có thể gửi header dạng 'Apikey <key>' hoặc 'Bearer <key>' hoặc 'X-Secret-Key: <key>'
  const isSecretValid =
    configuredSecret &&
    (incomingSecretKey === configuredSecret ||
      incomingAuthHeader === `Apikey ${configuredSecret}` ||
      incomingAuthHeader === `Bearer ${configuredSecret}` ||
      incomingAuthHeader === configuredSecret);

  if (!isSecretValid) {
    console.error("Unauthorized SePay Webhook request");
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized webhook request" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let rawPayload: SePayWebhookPayload;
  try {
    rawPayload = await req.json();
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Ghi log webhook event ban đầu
  const { data: eventRecord, error: eventErr } = await supabase
    .from("webhook_events")
    .insert({
      source: "SEPAY",
      raw_payload: rawPayload,
      status: "PENDING",
      received_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  const eventId = eventRecord?.id;

  try {
    const {
      id: sepayTxId,
      accountNumber,
      transferAmount,
      transferType,
      transactionDate,
      content,
      description,
      referenceCode,
      gateway,
    } = rawPayload;

    const sourceRef = referenceCode || String(sepayTxId);

    // 3. Kiểm tra Idempotency - Chống trùng lặp giao dịch
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id")
      .eq("source", "SEPAY")
      .eq("source_reference", sourceRef)
      .maybeSingle();

    if (existingTx) {
      console.log(`Duplicate transaction detected. SourceRef: ${sourceRef}. Skipping.`);
      if (eventId) {
        await supabase
          .from("webhook_events")
          .update({
            status: "SKIPPED",
            error_message: "Duplicate transaction skipped",
            processed_at: new Date().toISOString(),
          })
          .eq("id", eventId);
      }
      return new Response(JSON.stringify({ success: true, message: "Duplicate skipped" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Tìm tài khoản ngân hàng liên kết
    // Match theo account_number (xóa dấu cách nếu có)
    const sanitizedAccNum = String(accountNumber).trim();
    const { data: account, error: accErr } = await supabase
      .from("bank_accounts")
      .select("id, user_id, current_balance")
      .eq("account_number", sanitizedAccNum)
      .is("deleted_at", null)
      .maybeSingle();

    if (!account || accErr) {
      const errMsg = `Bank account ${sanitizedAccNum} not found in system or deleted`;
      console.warn(errMsg);
      if (eventId) {
        await supabase
          .from("webhook_events")
          .update({
            status: "SKIPPED",
            error_message: errMsg,
            processed_at: new Date().toISOString(),
          })
          .eq("id", eventId);
      }
      // Vẫn trả về 200 để SePay không retry dồn dập với tài khoản không quản lý
      return new Response(JSON.stringify({ success: true, message: errMsg }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 5. Chuẩn hóa ngày giờ sang ISO (SePay gửi format YYYY-MM-DD HH:mm:ss múi giờ VN +07:00)
    let parsedDate = new Date();
    if (transactionDate) {
      // Thay thế khoảng trắng thành T và thêm timezone +07:00
      const formattedDateStr = transactionDate.replace(" ", "T") + "+07:00";
      const d = new Date(formattedDateStr);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      }
    }

    const txType: "INCOME" | "EXPENSE" = transferType === "in" ? "INCOME" : "EXPENSE";

    // 6. Insert giao dịch
    const { error: insertTxErr } = await supabase.from("transactions").insert({
      user_id: account.user_id,
      account_id: account.id,
      amount: Math.abs(transferAmount),
      type: txType,
      category: txType === "INCOME" ? "Thu nhập" : "Chi tiêu chung",
      description: content || description || `Giao dịch ${gateway}`,
      transaction_date: parsedDate.toISOString(),
      source: "SEPAY",
      source_reference: sourceRef,
      raw_data: rawPayload,
    });

    if (insertTxErr) {
      throw insertTxErr;
    }

    // 7. Cập nhật trạng thái webhook_events thành PROCESSED
    if (eventId) {
      await supabase
        .from("webhook_events")
        .update({
          status: "PROCESSED",
          processed_at: new Date().toISOString(),
        })
        .eq("id", eventId);
    }

    console.log(`Successfully processed SePay transaction ${sourceRef} for account ${sanitizedAccNum}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error processing SePay webhook:", err);
    if (eventId) {
      await supabase
        .from("webhook_events")
        .update({
          status: "FAILED",
          error_message: err?.message || String(err),
          processed_at: new Date().toISOString(),
        })
        .eq("id", eventId);
    }

    // Trả 500 để SePay thử lại theo retry policy
    return new Response(
      JSON.stringify({ success: false, error: "Internal processing error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
