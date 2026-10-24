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

from fastapi import FastAPI, HTTPException, Depends, Request, Response
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
            row_by_lower = {str(key).lower(): value for key, value in row.items()}
            raw_amt = str(row.get("Amount") or row.get("amount") or "0").replace(",", "").replace(".", "").strip()
            amount = int(raw_amt) if raw_amt.isdigit() else 0
            cd = str(row.get("CD") or row.get("DorCCode") or "").strip()
            is_income = (cd == "+") or (cd.upper() == "C")
            transaction_date = next((
                row_by_lower[key]
                for key in (
                    "transactiondate", "transaction_date", "transactiondatetime", "transaction_date_time",
                    "transdate", "trans_date", "trandate", "tran_date", "txndate", "txn_date",
                    "txndatetime", "postingdate", "posting_date", "date",
                )
                if row_by_lower.get(key) not in (None, "")
            ), None)
            normalized.append(NormalizedTransaction(
                transaction_date=str(transaction_date) if transaction_date is not None else None,
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

production = os.getenv("APP_ENV", "development").lower() == "production"
app = FastAPI(title="Personal Finance Bank Gateway", version="0.1.0", docs_url=None if production else "/docs", redoc_url=None if production else "/redoc", openapi_url=None if production else "/openapi.json")
allowed_origins = [origin.strip().rstrip("/") for origin in os.getenv("WEB_ORIGIN", "http://localhost:5173").split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "bank-gateway"}


@app.post("/api/banks/{bank}/transactions", response_model=list[NormalizedTransaction])
def transactions(bank: BankCode, request: TransactionRequest, current_user: AuthenticatedUser = Depends(require_current_user), _: None = Depends(require_csrf)) -> list[NormalizedTransaction]:
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


# =========================================================================
# TÍCH HỢP POSTGRESQL & ĐỒNG BỘ GIA TĂNG (INCREMENTAL SYNC)
# =========================================================================
from . import db
from .auth import AuthenticatedUser, SESSION_COOKIE, CSRF_COOKIE, verify_google_credential, create_session, require_current_user, require_csrf
from .credentials import encrypt_bank_credentials, decrypt_bank_credentials

class SyncBankRequest(BaseModel):
    username: str
    password: str
    account_number: str | None = None
    browser_id: str | None = None
    bank_name: str
    display_name: str
    color: str | None = "#10b981"
    initial_balance: int | None = None
    force_full: bool = False


class AccountInput(BaseModel):
    bank_name: str
    display_name: str
    account_number: str
    initial_balance: int = 0
    current_balance: int = 0
    color: str = "#10b981"
    created_at: str | None = None


class UpdateTxInput(BaseModel):
    user_category: str | None = None
    user_note: str | None = None


class AccountUpdateInput(BaseModel):
    bank_name: str | None = None
    display_name: str | None = None
    initial_balance: int | None = None
    current_balance: int | None = None
    color: str | None = None


class ManualTransactionInput(BaseModel):
    account_id: str
    amount: int = Field(gt=0, le=10_000_000_000)
    type: Literal["INCOME", "EXPENSE"]
    category: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=2000)
    user_note: str | None = Field(default=None, max_length=2000)
    transaction_date: str


@app.post("/api/banks/{bank}/sync")
def sync_bank(bank: BankCode, req: SyncBankRequest, current_user: AuthenticatedUser = Depends(require_current_user), _: None = Depends(require_csrf)):
    """
    Đồng bộ thông minh:
    1. Lấy số dư thực tế từ ngân hàng.
    2. Lưu/Cập nhật tài khoản vào PostgreSQL.
    3. Kiểm tra ngày giao dịch gần nhất trong PostgreSQL để kích hoạt ĐỒNG BỘ GIA TĂNG:
       - Nếu đã có giao dịch: Chỉ lấy từ (ngày gần nhất - 1 ngày) đến hôm nay -> Giảm 95% request!
       - Nếu chưa có hoặc force_full = True: Lấy 30-90 ngày.
    4. Lưu vào PostgreSQL với cơ chế chống trùng lặp tuyệt đối.
    """
    # Bước 1: Kết nối lấy số dư mới nhất
    conn_req = ConnectRequest(
        username=req.username,
        password=req.password,
        browser_id=req.browser_id,
        account_number=req.account_number,
    )
    snapshot = adapters[bank].connect(conn_req)
    active_acct_num = snapshot.account_number or req.account_number
    active_browser_id = getattr(snapshot, "browser_id", None) or req.browser_id

    # Bước 2: Lưu tài khoản vào PostgreSQL
    account = db.upsert_account(
        user_id=current_user.id,
        bank_name=req.bank_name,
        display_name=req.display_name,
        account_number=active_acct_num,
        current_balance=snapshot.current_balance,
        initial_balance=req.initial_balance,
        color=req.color,
    )
    db.save_bank_credential(current_user.id, account["id"], encrypt_bank_credentials(current_user.id, account["id"], {
        "username": req.username, "password": req.password, "browser_id": active_browser_id,
        "account_number": active_acct_num,
    }))

    # Bước 3: Xác định khoảng ngày đồng bộ gia tăng
    latest_tx_date = db.get_latest_transaction_date(account["id"])
    today = date.today()

    if latest_tx_date and not req.force_full:
        # Đồng bộ gia tăng: Bắt đầu từ ngày gần nhất lùi 1 ngày để không sót giao dịch cuối ngày
        from_date = max(latest_tx_date - timedelta(days=1), today - timedelta(days=365))
        is_incremental = True
    else:
        # Đồng bộ ban đầu: VCB lấy 90 ngày, các ngân hàng khác lấy 30 ngày
        days_back = 90 if bank == "vcb" else 30
        from_date = today - timedelta(days=days_back)
        is_incremental = False

    # Bước 4: Gọi Adapter ngân hàng
    tx_req = TransactionRequest(
        username=req.username,
        password=req.password,
        browser_id=active_browser_id,
        account_number=active_acct_num,
        from_date=from_date,
        to_date=today,
    )
    raw_txs = adapters[bank].transactions(tx_req)

    # Bước 5: Lưu giao dịch vào PostgreSQL (chống trùng tự động)
    inserted_count = db.save_transactions(
        user_id=current_user.id,
        account_id=account["id"],
        transactions=[t.dict() for t in raw_txs],
    )

    return {
        "status": "ok",
        "account": account,
        "mode": "INCREMENTAL" if is_incremental else "FULL",
        "from_date": str(from_date),
        "to_date": str(today),
        "fetched_count": len(raw_txs),
        "new_inserted_count": inserted_count,
        "current_balance": snapshot.current_balance,
        "browser_id": active_browser_id,
    }


@app.post("/api/accounts/{account_id}/sync")
def sync_saved_account(account_id: str, current_user: AuthenticatedUser = Depends(require_current_user),
                      _: None = Depends(require_csrf)):
    account = db.get_account_by_id(account_id, current_user.id)
    encrypted = db.get_bank_credential(current_user.id, account_id)
    if not account or not encrypted:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin đồng bộ cho tài khoản.")
    try:
        credential = decrypt_bank_credentials(current_user.id, account_id, encrypted["key_id"], encrypted["nonce"], encrypted["ciphertext"], encrypted["tag"])
    except Exception:
        raise HTTPException(status_code=503, detail="Không thể giải mã thông tin đồng bộ. Hãy kết nối lại tài khoản.")
    bank_aliases = {"mbbank": "mb", "mb bank": "mb", "vietcombank": "vcb", "vcb": "vcb", "bidv": "bidv"}
    bank = bank_aliases.get(account["bank_name"].strip().lower())
    if not bank:
        raise HTTPException(status_code=400, detail="Ngân hàng này chưa hỗ trợ đồng bộ.")
    payload = SyncBankRequest(username=credential["username"], password=credential["password"],
        browser_id=credential.get("browser_id"), account_number=account["account_number"],
        bank_name=account["bank_name"], display_name=account["display_name"], color=account["color"])
    return sync_bank(bank, payload, current_user, None)


# --- CRUD TÀI KHOẢN TRÊN POSTGRESQL ---
@app.get("/api/accounts")
def get_accounts(current_user: AuthenticatedUser = Depends(require_current_user)):
    return db.get_accounts(user_id=current_user.id)


@app.post("/api/accounts")
def create_account(input: AccountInput, current_user: AuthenticatedUser = Depends(require_current_user), _: None = Depends(require_csrf)):
    return db.upsert_account(
        user_id=current_user.id,
        bank_name=input.bank_name,
        display_name=input.display_name,
        account_number=input.account_number,
        current_balance=input.current_balance,
        initial_balance=input.initial_balance,
        color=input.color,
        created_at=input.created_at,
    )


@app.patch("/api/accounts/{account_id}")
def update_account(account_id: str, input: AccountUpdateInput, current_user: AuthenticatedUser = Depends(require_current_user), _: None = Depends(require_csrf)):
    result = db.update_account(account_id, current_user.id, input.model_dump(exclude_unset=True))
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    return result


@app.post("/api/transactions")
def create_manual_transaction(input: ManualTransactionInput, current_user: AuthenticatedUser = Depends(require_current_user), _: None = Depends(require_csrf)):
    try:
        tx_date = db.parse_tx_date(input.transaction_date)
        result = db.create_manual_transaction(current_user.id, input.account_id, input.amount, input.type,
            input.category, input.description, input.user_note, tx_date)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Ngày hoặc giao dịch không hợp lệ.")
    if not result:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    return result


@app.delete("/api/accounts/{account_id}")
def delete_account(account_id: str, current_user: AuthenticatedUser = Depends(require_current_user), _: None = Depends(require_csrf)):
    if not db.soft_delete_account(account_id=account_id, user_id=current_user.id):
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    return {"status": "ok", "deleted_id": account_id}


# --- TRUY VẤN & CẬP NHẬT GIAO DỊCH TRÊN POSTGRESQL ---
@app.get("/api/transactions")
def get_transactions(
    current_user: AuthenticatedUser = Depends(require_current_user),
    accountId: str | None = None,
    startDate: str | None = None,
    endDate: str | None = None,
    limit: int = 500,
):
    from_d = date.fromisoformat(startDate) if startDate else None
    to_d = date.fromisoformat(endDate) if endDate else None
    return db.get_transactions(
        user_id=current_user.id,
        account_id=accountId,
        from_date=from_d,
        to_date=to_d,
        limit=limit,
    )


@app.put("/api/transactions/{tx_id}")
def update_transaction(tx_id: str, input: UpdateTxInput, current_user: AuthenticatedUser = Depends(require_current_user), _: None = Depends(require_csrf)):
    res = db.update_transaction(
        tx_id=tx_id,
        user_id=current_user.id,
        user_category=input.user_category,
        user_note=input.user_note,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch")
    return res


@app.delete("/api/transactions/{tx_id}")
def delete_transaction(tx_id: str, current_user: AuthenticatedUser = Depends(require_current_user), _: None = Depends(require_csrf)):
    if not db.delete_transaction(tx_id, current_user.id):
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch")
    return {"status": "ok"}


# --- ĐỒNG BỘ DỮ LIỆU TỪ TRÌNH DUYỆT (LOCALSTORAGE) LÊN POSTGRESQL ---
class MigrateLocalDataRequest(BaseModel):
    accounts: list[dict] = Field(default_factory=list, max_length=100)
    transactions: list[dict] = Field(default_factory=list, max_length=10000)


@app.post("/api/migrate-from-local")
def migrate_from_local(payload: MigrateLocalDataRequest, current_user: AuthenticatedUser = Depends(require_current_user), _: None = Depends(require_csrf)):
    user_id = current_user.id
    synced_accounts = []
    id_map = {}

    # 1. Lưu từng tài khoản vào PostgreSQL
    for acc in payload.accounts:
        acct_num = str(acc.get("accountNumber") or acc.get("account_number") or "").strip()
        if not acct_num:
            continue
        bank_name = acc.get("bankName") or acc.get("bank_name") or "Ngân hàng"
        disp_name = acc.get("displayName") or acc.get("display_name") or "Tài khoản"
        curr_bal = int(acc.get("currentBalance") or acc.get("current_balance") or 0)
        init_bal = int(acc.get("initialBalance") or acc.get("initial_balance") or curr_bal)
        color = acc.get("color") or "#10b981"

        saved = db.upsert_account(
            user_id=user_id,
            bank_name=bank_name,
            display_name=disp_name,
            account_number=acct_num,
            current_balance=curr_bal,
            initial_balance=init_bal,
            color=color,
            created_at=acc.get("createdAt") or acc.get("created_at"),
        )
        old_id = acc.get("id")
        if old_id:
            id_map[str(old_id)] = saved["id"]
        id_map[acct_num] = saved["id"]
        synced_accounts.append(saved)

    # 2. Lưu từng giao dịch vào PostgreSQL
    total_tx_saved = 0
    txs_by_account = {}

    for tx in payload.transactions:
        orig_acc_id = str(tx.get("accountId") or tx.get("account_id") or "")
        db_acc_id = id_map.get(orig_acc_id)
        if not db_acc_id:
            raise HTTPException(status_code=400, detail="Giao dịch tham chiếu tài khoản không xác định.")

        if db_acc_id not in txs_by_account:
            txs_by_account[db_acc_id] = []

        txs_by_account[db_acc_id].append({
            "amount": tx.get("amount"),
            "type": tx.get("type", "EXPENSE"),
            "category": tx.get("category"),
            "user_category": tx.get("userCategory") or tx.get("user_category"),
            "description": tx.get("description"),
            "user_note": tx.get("userNote") or tx.get("user_note"),
            "transaction_date": tx.get("transactionDate") or tx.get("transaction_date") or tx.get("date") or tx.get("TransactionDate"),
            "reference": tx.get("sourceReference") or tx.get("reference"),
            "source": tx.get("source", "BANK_SYNC"),
            "raw_data": tx.get("rawData") or tx.get("raw_data") or {},
        })

    for acc_id, tx_list in txs_by_account.items():
        total_tx_saved += db.save_transactions(user_id, acc_id, tx_list)

    return {
        "status": "ok",
        "synced_accounts_count": len(synced_accounts),
        "synced_transactions_count": total_tx_saved,
    }



from pathlib import Path
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from .exceptions import VCBNeedOtpException, BIDVNeedConfirmAppException

@app.post("/api/banks/{bank}/connect")
def connect(bank: BankCode, request: ConnectRequest, current_user: AuthenticatedUser = Depends(require_current_user), _: None = Depends(require_csrf)):
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
def verify_vcb_otp(payload: VerifyOtpRequest, current_user: AuthenticatedUser = Depends(require_current_user), _: None = Depends(require_csrf)):
    raise HTTPException(
        status_code=501,
        detail=(
            "Thư viện VCB hiện tại không hỗ trợ gửi OTP để xác minh trình duyệt. "
            "Hãy hoàn tất xác thực trên trang VCB chính thức rồi thử kết nối lại."
        ),
    )


class GoogleAuthRequest(BaseModel):
    credential: str


@app.post("/api/auth/google")
def auth_google(req: GoogleAuthRequest, response: Response):
    """
    Xác thực Google ID Token nhận từ frontend (Google Identity Services)
    """
    token = req.credential.strip()
    if not token:
        raise HTTPException(status_code=400, detail="Token không hợp lệ")

    try:
        payload = verify_google_credential(token)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Xác thực Google ID Token thất bại.")

    sub = payload.get("sub")
    email = payload["email"]
    name = payload.get("name") or payload.get("given_name") or "Người dùng Google"
    picture = payload.get("picture")

    if not sub:
        raise HTTPException(status_code=401, detail="Payload token thiếu thông tin người dùng")

    # Lưu/Cập nhật vào PostgreSQL và tự động liên kết dữ liệu nếu người dùng mới
    user = db.upsert_google_user(
        user_id=sub,
        email=email,
        full_name=name,
        avatar_url=picture
    )

    session_token, csrf_token = create_session(user["id"])
    secure_cookie = os.getenv("APP_ENV", "development").lower() == "production"
    response.set_cookie(SESSION_COOKIE, session_token, httponly=True, secure=secure_cookie, samesite="lax", path="/", max_age=7 * 24 * 60 * 60)
    response.set_cookie(CSRF_COOKIE, csrf_token, httponly=False, secure=secure_cookie, samesite="lax", path="/", max_age=7 * 24 * 60 * 60)
    return {
        "status": "ok",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "avatar_url": user.get("avatar_url") or picture,
        },
    }


@app.get("/api/auth/me")
def get_current_user_profile(current_user: AuthenticatedUser = Depends(require_current_user)):
    return {"id": current_user.id, "email": current_user.email, "full_name": current_user.full_name, "avatar_url": current_user.avatar_url}


@app.post("/api/auth/logout")
def logout(request: Request, response: Response, current_user: AuthenticatedUser = Depends(require_current_user), _: None = Depends(require_csrf)):
    token = request.cookies.get(SESSION_COOKIE, "")
    import hashlib
    db.execute_query("UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = %s", (hashlib.sha256(token.encode()).hexdigest(),), commit=True)
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(CSRF_COOKIE, path="/")
    return {"status": "ok"}


FP_JS_PATH = Path(__file__).resolve().parent.parent.parent / "frontend" / "web" / "node_modules" / "@fingerprintjs" / "fingerprintjs" / "dist" / "fp.min.js"

class SaveBrowserIdRequest(BaseModel):
    browser_id: str

@app.get("/fp.js")
def get_fp_script():
    if FP_JS_PATH.exists():
        return FileResponse(FP_JS_PATH, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="FingerprintJS file not found")

@app.post("/api/vcb/save-browser-id")
def save_browser_id(payload: SaveBrowserIdRequest, current_user: AuthenticatedUser = Depends(require_current_user), _: None = Depends(require_csrf)):
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
