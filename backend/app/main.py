from __future__ import annotations

import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import os
from datetime import date, timedelta
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BankCode = Literal["mb", "vcb", "bidv"]


class ConnectRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    browser_id: str | None = None
    account_number: str | None = None


class AccountSnapshot(BaseModel):
    account_number: str
    account_holder_name: str | None = None
    current_balance: int
    currency: str = "VND"
    accountNumber: str | None = None
    currentBalance: int | None = None
    accountHolderName: str | None = None


class TransactionRequest(ConnectRequest):
    from_date: date
    to_date: date


class NormalizedTransaction(BaseModel):
    transaction_date: str | None = None
    amount: int
    type: Literal["INCOME", "EXPENSE"]
    description: str | None = None
    reference: str | None = None
    raw_data: dict


class BankAdapter:
    code: BankCode

    def connect(self, request: ConnectRequest) -> AccountSnapshot:
        raise NotImplementedError


    def transactions(self, request: TransactionRequest) -> list[NormalizedTransaction]:
        raise NotImplementedError


class MBBankAdapter(BankAdapter):
    code: BankCode = "mb"

    def connect(self, request: ConnectRequest) -> AccountSnapshot:
        from .adapters.mb import MBAdapter
        return MBAdapter().connect(request)

    def transactions(self, request: TransactionRequest) -> list[NormalizedTransaction]:
        from .adapters.mb import MBAdapter
        return MBAdapter().transactions(request)


class VietcombankAdapter(BankAdapter):
    code: BankCode = "vcb"

    def connect(self, request: ConnectRequest) -> AccountSnapshot:
        from .adapters.vcb import VCBAdapter
        return VCBAdapter().connect(request)

    def transactions(self, request: TransactionRequest) -> list[NormalizedTransaction]:
        from .adapters.vcb import VCBAdapter
        rows = VCBAdapter().transactions(request, request.from_date, request.to_date)
        normalized: list[NormalizedTransaction] = []
        for row in rows:
            raw_amt = str(row.get("Amount") or row.get("amount") or "0").replace(",", "").replace(".", "").strip()
            amount = int(raw_amt) if raw_amt.isdigit() else 0
            cd = str(row.get("CD") or row.get("DorCCode") or "").strip()
            is_income = (cd == "+") or (cd.upper() == "C")
            normalized.append(NormalizedTransaction(
                transaction_date=row.get("TransactionDate") or row.get("tranDate") or row.get("PostingDate") or "",
                amount=amount,
                type="INCOME" if is_income else "EXPENSE",
                description=row.get("Description") or row.get("Remark") or "",
                reference=row.get("Reference") or row.get("SeqNo") or "",
                raw_data=row,
            ))
        return normalized


class BIDVBankAdapter(BankAdapter):
    code: BankCode = "bidv"

    def connect(self, request: ConnectRequest) -> AccountSnapshot:
        from .adapters.bidv import BIDVAdapter
        return BIDVAdapter().connect(request)

    def transactions(self, request: TransactionRequest) -> list[NormalizedTransaction]:
        from .adapters.bidv import BIDVAdapter
        return BIDVAdapter().transactions(request)


adapters: dict[BankCode, BankAdapter] = {
    "mb": MBBankAdapter(),
    "vcb": VietcombankAdapter(),
    "bidv": BIDVBankAdapter(),
}

app = FastAPI(title="Personal Finance Bank Gateway", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("WEB_ORIGIN", "http://localhost:5173")],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "bank-gateway"}


@app.post("/api/banks/{bank}/transactions", response_model=list[NormalizedTransaction])
def transactions(bank: BankCode, request: TransactionRequest) -> list[NormalizedTransaction]:
    if request.to_date < request.from_date:
        raise HTTPException(status_code=400, detail="Khoảng ngày không hợp lệ.")
    if request.to_date - request.from_date > timedelta(days=366):
        raise HTTPException(
            status_code=400,
            detail="Khoảng thời gian tra cứu tối đa là 1 năm (365 ngày theo quy định ngân hàng).",
        )
    try:
        return adapters[bank].transactions(request)
    except NotImplementedError as error:
        raise HTTPException(status_code=501, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error) or "Không thể lấy lịch sử giao dịch.") from error


from pathlib import Path
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from .exceptions import VCBNeedOtpException, BIDVNeedConfirmAppException

@app.post("/api/banks/{bank}/connect")
def connect(bank: BankCode, request: ConnectRequest):
    try:
        return adapters[bank].connect(request)
    except VCBNeedOtpException as otp_err:
        return JSONResponse(
            status_code=200,
            content={
                "status": "NEED_OTP",
                "message": otp_err.message,
                "browser_id": otp_err.browser_id,
                "browser_token": otp_err.browser_token,
                "duration": otp_err.duration,
            },
        )
    except BIDVNeedConfirmAppException as app_err:
        return JSONResponse(
            status_code=200,
            content={
                "status": "NEED_CONFIRM_APP",
                "message": app_err.message,
                "user": app_err.user,
                "duration": app_err.duration,
            },
        )
    except NotImplementedError as error:
        raise HTTPException(status_code=501, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=502, detail=str(error) or "Kết nối ngân hàng thất bại.") from error


class VerifyOtpRequest(BaseModel):
    username: str
    password: str
    browser_id: str
    browser_token: str
    otp: str


@app.post("/api/banks/vcb/verify-otp")
def verify_vcb_otp(payload: VerifyOtpRequest):
    raise HTTPException(
        status_code=501,
        detail=(
            "Thư viện VCB hiện tại không hỗ trợ gửi OTP để xác minh trình duyệt. "
            "Hãy hoàn tất xác thực trên trang VCB chính thức rồi thử kết nối lại."
        ),
    )
FP_JS_PATH = Path(__file__).resolve().parent.parent.parent / "frontend" / "web" / "node_modules" / "@fingerprintjs" / "fingerprintjs" / "dist" / "fp.min.js"

class SaveBrowserIdRequest(BaseModel):
    browser_id: str

@app.get("/fp.js")
def get_fp_script():
    if FP_JS_PATH.exists():
        return FileResponse(FP_JS_PATH, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="FingerprintJS file not found")

@app.post("/api/vcb/save-browser-id")
def save_browser_id(payload: SaveBrowserIdRequest):
    bid = payload.browser_id.strip()
    if not bid:
        raise HTTPException(status_code=400, detail="Browser ID cannot be empty")
    return {"status": "ok", "saved_browser_id": bid}

@app.get("/browser-id", response_class=HTMLResponse)
def browser_id_page():
    return """<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lấy Browser ID Vietcombank Tự Động</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      box-sizing: border-box;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 28px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    h1 {
      font-size: 20px;
      margin-top: 0;
      color: #38bdf8;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.5;
    }
    .id-box {
      background: #0f172a;
      border: 2px dashed #0284c7;
      border-radius: 10px;
      padding: 14px;
      font-family: monospace;
      font-size: 16px;
      color: #34d399;
      margin: 20px 0;
      word-break: break-all;
      user-select: all;
    }
    .btn {
      background: #0284c7;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover { background: #0369a1; }
    .status {
      margin-top: 16px;
      font-size: 14px;
      font-weight: 500;
    }
    .success { color: #34d399; }
    .error { color: #f87171; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚡ NHẬN DIỆN BROWSER ID VIETCOMBANK</h1>
    <p>Trang web tự động đo Fingerprint của trình duyệt này và lưu vào hệ thống:</p>
    <div class="id-box" id="bid-text">Đang nhận diện vân tay trình duyệt...</div>
    <div class="status" id="status-text"></div>
  </div>

  <script src="/fp.js"></script>
  <script>
    async function init() {
      const bidText = document.getElementById('bid-text');
      const statusText = document.getElementById('status-text');
      try {
        const fp = await FingerprintJS.load({ monitoring: false });
        const result = await fp.get();
        const visitorId = result.visitorId;
        bidText.innerText = visitorId;

        // Tự động lưu thẳng vào Backend
        const resp = await fetch('/api/vcb/save-browser-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ browser_id: visitorId })
        });
        if (resp.ok) {
          statusText.className = 'status success';
          statusText.innerHTML = '✅ Đã tự động lưu Browser ID vào hệ thống thành công!<br>Bạn có thể chạy lại test hoặc kết nối ngay.';
        } else {
          statusText.className = 'status error';
          statusText.innerText = '❌ Không thể lưu tự động. Vui lòng copy mã trên.';
        }
      } catch (err) {
        bidText.innerText = 'Lỗi nhận diện: ' + err.message;
        statusText.className = 'status error';
        statusText.innerText = 'Không thể chạy FingerprintJS.';
      }
    }
    window.onload = init;
  </script>
</body>
</html>
"""
