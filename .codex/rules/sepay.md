# SePay Integration Rules — Kết nối An toàn qua Backend

## Nguyên tắc cốt lõi

- **DO NOT** đặt SePay API key, webhook secret, hay bất kỳ thông tin xác thực SePay nào trong code mobile, `app.json`, `app.config.js`, hay bất kỳ file nào được commit vào repository.
- **MUST** toàn bộ logic SePay (gọi API, xác minh webhook, xử lý token) chỉ nằm ở backend (`backend/src/webhooks/` và `backend/src/services/sepay/`).
- Mobile chỉ giao tiếp với backend của dự án; không bao giờ gọi trực tiếp API SePay từ mobile.

## Cấu hình và môi trường

- Các biến môi trường backend bắt buộc (xem `.env.example`):
  ```
  SEPAY_API_KEY=          # API key từ SePay dashboard
  SEPAY_WEBHOOK_SECRET=   # Secret để xác minh chữ ký webhook
  SEPAY_BASE_URL=         # https://my.sepay.vn/userapi hoặc sandbox URL
  ```
- **MUST** validate sự tồn tại của các biến này khi server khởi động; crash sớm với thông báo rõ nếu thiếu.
- **DO NOT** log giá trị của `SEPAY_API_KEY` hay `SEPAY_WEBHOOK_SECRET` ở bất kỳ level nào.

## Luồng kết nối tài khoản

1. User nhập thông tin tài khoản ngân hàng trên mobile (tên, số tài khoản — không nhập password/OTP/PIN ngân hàng).
2. Mobile gửi yêu cầu kết nối đến backend endpoint `/api/v1/accounts/:id/sepay/connect`.
3. Backend gọi SePay API để đăng ký/liên kết tài khoản và lưu kết quả kết nối (trạng thái, account ref) vào database.
4. Backend trả về trạng thái kết nối cho mobile; mobile chỉ hiển thị trạng thái — không giữ credential.
- Trạng thái kết nối: `NOT_CONNECTED | PENDING | CONNECTED | ERROR`.
- **DO NOT** tuyên bố trạng thái `CONNECTED` nếu chưa nhận được xác nhận thành công từ SePay API.

## Xử lý Webhook

- **MUST** xác minh chữ ký webhook tại middleware trước khi xử lý payload:
  ```typescript
  // Ví dụ xác minh HMAC-SHA256 (tuỳ cơ chế SePay hỗ trợ):
  const signature = req.headers['x-sepay-signature'];
  const expected = crypto
    .createHmac('sha256', process.env.SEPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  if (signature !== expected) return res.status(401).json({ error: 'Invalid signature' });
  ```
- Nếu SePay dùng cơ chế xác thực khác (IP whitelist, token header), **MUST** implement đúng theo tài liệu chính thức hiện hành — không tự suy đoán.
- **MUST** trả về HTTP 200 cho SePay ngay sau khi xác minh thành công; xử lý bất đồng bộ (queue/job) nếu cần.
- **MUST** ghi log mọi webhook nhận được: timestamp, reference, status (xử lý thành công / bỏ qua trùng / lỗi).

## Chống giao dịch trùng (Idempotency)

- **MUST** dùng `referenceCode` hoặc `transactionId` từ SePay làm unique key.
- Trước khi insert giao dịch mới, kiểm tra `SELECT 1 FROM transactions WHERE source_reference = $1`.
- Nếu đã tồn tại: log "duplicate webhook skipped" và trả 200 — không insert, không báo lỗi.
- Database phải có constraint: `UNIQUE (source, source_reference)`.

## Thử lại và xử lý lỗi

- Nếu xử lý webhook thất bại (database lỗi, timeout): log lỗi chi tiết, trả 500 để SePay retry (nếu SePay hỗ trợ retry).
- **MUST** có bảng/queue `webhook_events` lưu raw payload, trạng thái xử lý và lần retry — để có thể reprocess thủ công.
- Implement endpoint admin `/api/v1/admin/webhooks/:id/reprocess` để xử lý lại webhook thất bại.

## Môi trường chưa cấu hình

- Nếu `SEPAY_API_KEY` chưa được set, backend **MUST** trả về lỗi rõ ràng khi gọi endpoint liên quan đến SePay, không giả vờ kết nối thành công.
- Trên mobile, hiển thị trạng thái "Chưa cấu hình kết nối SePay" và hướng dẫn liên hệ admin/cấu hình — không crash.
- File `.env.example` **MUST** có hướng dẫn từng bước để lấy SePay API key và cấu hình webhook URL.
