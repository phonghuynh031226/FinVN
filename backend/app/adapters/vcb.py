from __future__ import annotations

import logging
import sys
from datetime import date
from pathlib import Path

from ..main import AccountSnapshot, ConnectRequest

logger = logging.getLogger("vcb-adapter")

# Định vị thư mục mã nguồn VCB trong TÀI LIỆU API BANK
SOURCE_PATH = (
    Path(__file__).resolve().parents[3]
    / "TÀI LIỆU API BANK"
    / "VCB-API-master"
    / "VCB-API-master"
)

if SOURCE_PATH.exists() and str(SOURCE_PATH) not in sys.path:
    sys.path.insert(0, str(SOURCE_PATH))

try:
    from main import VCB
except ImportError:
    # Fallback nếu đường dẫn là 1 cấp thư mục
    FALLBACK_PATH = (
        Path(__file__).resolve().parents[3]
        / "TÀI LIỆU API BANK"
        / "VCB-API-master"
    )
    if str(FALLBACK_PATH) not in sys.path:
        sys.path.insert(0, str(FALLBACK_PATH))
    from main import VCB


import time
import uuid
from datetime import date, timedelta

class VCBNeedOtpException(Exception):
    def __init__(self, message: str, browser_id: str, browser_token: str, duration: int = 90):
        super().__init__(message)
        self.message = message
        self.browser_id = browser_id
        self.browser_token = browser_token
        self.duration = duration


def split_date_chunks(start_date: date, end_date: date, chunk_days: int = 30) -> list[tuple[date, date]]:
    chunks = []
    cur = start_date
    while cur <= end_date:
        nxt = min(cur + timedelta(days=chunk_days), end_date)
        chunks.append((cur, nxt))
        cur = nxt + timedelta(days=1)
    return chunks


class VCBAdapter:
    def __init__(self) -> None:
        self.client_class = VCB

    def _login_client(self, request: ConnectRequest, allow_new_browser: bool = True) -> VCB:
        id_file = Path(__file__).resolve().parents[2] / "vcb_browser_id.txt"
        saved_id = id_file.read_text(encoding="utf-8").strip() if id_file.exists() else ""
        
        # Nếu client truyền browser_id hoặc đã lưu từ trước, dùng nó; ngược lại sinh mới
        browser_id = (request.browser_id or "").strip() or saved_id
        if not browser_id:
            browser_id = uuid.uuid4().hex

        client = self.client_class(
            username=request.username.strip(),
            password=request.password,
            browserID=browser_id,
        )

        if not client.is_login:
            error_code = client.login_message or "Đăng nhập VCB thất bại"
            if "019" in str(error_code) or "chưa mở login web" in str(error_code):
                raise ValueError("Tài khoản VCB của bạn chưa bật tính năng đăng nhập trên trình duyệt web.")
            
            # Xử lý trường hợp phát hiện trình duyệt mới (mã lỗi 20231)
            if "20231" in str(error_code) or "not activated" in str(error_code) or "trình duyệt chưa xác thực" in str(error_code):
                raw_data = getattr(client, "login_raw_data", {}).get("data", {})
                b_token = raw_data.get("browserToken") or ""
                dur = int(raw_data.get("durationWaiting") or 90)
                raise VCBNeedOtpException(
                    message="Vietcombank yêu cầu xác thực OTP cho trình duyệt mới.",
                    browser_id=browser_id,
                    browser_token=b_token,
                    duration=dur,
                )

            if "3005" in str(error_code) or "Unable username or password" in str(error_code):
                raise ValueError("Tên đăng nhập hoặc mật khẩu Vietcombank không chính xác.")
            raise ValueError(f"Lỗi đăng nhập VCB: {error_code}")

        return client

    def connect(self, request: ConnectRequest) -> AccountSnapshot:
        client = self._login_client(request)

        balance_res = client._get_account_balance(format=int)
        if not balance_res.get("status"):
            raise ValueError(
                f"Không thể truy vấn số dư VCB: {balance_res.get('code')}"
            )

        current_balance = int(balance_res.get("balance", 0))
        account_number = str(client.accountNo or request.account_number or "")
        account_holder_name = None
        
        # Trích xuất tên chủ tài khoản nếu VCB trả về
        full_content = balance_res.get("full_content", {})
        if "accountDetail" in full_content:
            account_holder_name = full_content["accountDetail"].get("customerName")

        return AccountSnapshot(
            account_number=account_number,
            account_holder_name=account_holder_name,
            current_balance=current_balance,
            currency="VND",
            accountNumber=account_number,
            currentBalance=current_balance,
            accountHolderName=account_holder_name,
        )

import time
from datetime import date, timedelta

def split_date_chunks(start_date: date, end_date: date, chunk_days: int = 30) -> list[tuple[date, date]]:
    chunks = []
    cur = start_date
    while cur <= end_date:
        nxt = min(cur + timedelta(days=chunk_days), end_date)
        chunks.append((cur, nxt))
        cur = nxt + timedelta(days=1)
    return chunks

    def transactions(
        self, request: ConnectRequest, from_date: date, to_date: date
    ) -> list[dict]:
        client = self._login_client(request)

        # Giới hạn tối đa 365 ngày (1 năm từ quá khứ đến hiện tại theo quy định VCB)
        max_past = date.today() - timedelta(days=365)
        if from_date < max_past:
            from_date = max_past

        # Chia nhỏ khoảng thời gian thành các đợt tối đa 30 ngày
        chunks = split_date_chunks(from_date, to_date, chunk_days=30)
        all_txs = []
        seen_refs = set()

        for idx, (c_from, c_to) in enumerate(chunks):
            str_from = c_from.strftime("%d/%m/%Y")
            str_to = c_to.strftime("%d/%m/%Y")

            try:
                page_index = 0
                while True:
                    page_data = client._transaction_history(str_from, str_to, page_index)
                    if not page_data or not page_data.get("status"):
                        break

                    txs = page_data.get("history") or []
                    for tx in txs:
                        ref = str(tx.get("Reference") or tx.get("SeqNo") or "").strip()
                        key = ref if ref else f"{tx.get('TransactionDate')}-{tx.get('Amount')}-{tx.get('Description')}"
                        if key not in seen_refs:
                            seen_refs.add(key)
                            all_txs.append(tx)

                    # Kiểm tra xem có trang tiếp theo không (VCB trả về nextIndex: "0" nếu hết trang)
                    next_idx = str(page_data.get("next_index", "0")).strip()
                    if next_idx in ["0", "", "None", "False"]:
                        break
                    page_index += 1
            except Exception as e:
                logger.warning(f"Lỗi khi tải lịch sử VCB đợt {str_from} - {str_to}: {e}")

            if idx < len(chunks) - 1:
                time.sleep(0.3)  # Nghỉ nhẹ giữa các đợt tránh bị ngân hàng chặn rate limit

        return all_txs
