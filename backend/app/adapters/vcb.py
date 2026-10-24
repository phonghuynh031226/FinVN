from __future__ import annotations

import logging
import hashlib
from datetime import date
from pathlib import Path

from ..main import AccountSnapshot, ConnectRequest
from .vcb_lib.main import VCB

logger = logging.getLogger("vcb-adapter")

import time
import uuid
from datetime import date, timedelta

from ..exceptions import VCBNeedOtpException


def split_date_chunks(start_date: date, end_date: date, chunk_days: int = 90) -> list[tuple[date, date]]:
    chunks = []
    cur = start_date
    while cur <= end_date:
        nxt = min(cur + timedelta(days=chunk_days), end_date)
        chunks.append((cur, nxt))
        cur = nxt + timedelta(days=1)
    return chunks


class VCBAdapter:
    _session_cache: dict[str, tuple[VCB, float]] = {}  # username -> (client, timestamp)

    def __init__(self) -> None:
        self.client_class = VCB

    @classmethod
    def clear_session_cache(cls, username: str = "") -> None:
        if username:
            cls._session_cache.pop(username.strip(), None)
        else:
            cls._session_cache.clear()

    @staticmethod
    def _browser_id_path(username: str) -> Path:
        account_key = hashlib.sha256(username.strip().encode("utf-8")).hexdigest()
        directory = Path(__file__).resolve().parents[2] / "data" / "vcb_browser_ids"
        directory.mkdir(parents=True, exist_ok=True)
        return directory / f"{account_key}.txt"

    @classmethod
    def get_saved_browser_id(cls, username: str) -> str:
        import os
        # 0. Ưu tiên biến môi trường VCB_BROWSER_ID nếu có
        env_bid = os.getenv("VCB_BROWSER_ID", "").strip()
        if env_bid:
            return env_bid

        path = cls._browser_id_path(username)
        if path.exists():
            val = path.read_text(encoding="utf-8").strip()
            if val:
                return val

        # Fallback đọc từ các file cấu hình vcb_browser_id.txt
        fallback_candidates = [
            Path("/app/vcb_browser_id.txt"),
            Path(__file__).resolve().parents[2] / "vcb_browser_id.txt",
            Path(__file__).resolve().parents[1] / "vcb_browser_id.txt",
            Path(__file__).resolve().parents[3] / "backend" / "vcb_browser_id.txt",
            Path(__file__).resolve().parents[2] / "data" / "vcb_browser_ids" / "fb1edc8841f6cd8a8127ad612c7aeed020fe45ee5ec46ee9646149f465502a89.txt",
        ]
        for fb in fallback_candidates:
            if fb.exists():
                txt = fb.read_text(encoding="utf-8").strip()
                if txt:
                    return txt

        # Giá trị mặc định đã kích hoạt thiết bị tin cậy trên hệ thống Vietcombank Digibank
        return "cd9d5bd00fad51bf3ae77007749fb19c"

    @classmethod
    def save_browser_id(cls, username: str, browser_id: str) -> None:
        cls._browser_id_path(username).write_text(browser_id.strip(), encoding="utf-8")
        # Đồng thời lưu vào vcb_browser_id.txt để dùng chung
        try:
            for p in [Path("/app/vcb_browser_id.txt"), Path(__file__).resolve().parents[2] / "vcb_browser_id.txt"]:
                p.write_text(browser_id.strip(), encoding="utf-8")
        except Exception:
            pass

    def _login_client(self, request: ConnectRequest, allow_new_browser: bool = True, use_cache: bool = True) -> VCB:
        uname = request.username.strip()
        now = time.time()

        # Kiểm tra phiên đăng nhập còn hiệu lực trong bộ nhớ đệm (TTL: 5 phút = 300s)
        if use_cache and uname in self._session_cache:
            cached_client, cached_time = self._session_cache[uname]
            if now - cached_time < 300 and getattr(cached_client, "is_login", False):
                logger.info(f"⚡ Tái sử dụng phiên kết nối VCB đã lưu cho {uname}")
                return cached_client

        saved_browser_id = self.get_saved_browser_id(uname)
        supplied_browser_id = (request.browser_id or "").strip()
        browser_id = supplied_browser_id or saved_browser_id
        if not browser_id:
            browser_id = uuid.uuid4().hex

        client = self.client_class(
            username=uname,
            password=request.password,
            browserID=browser_id,
        )

        if not client.is_login:
            self._session_cache.pop(uname, None)
            error_code = client.login_message or "Đăng nhập VCB thất bại"
            raw_data = getattr(client, "login_raw_data", {}).get("data", {})
            raw_code = str(raw_data.get("code") or "")

            if "019" in str(error_code) or raw_code == "019" or "chưa mở login web" in str(error_code):
                raise ValueError("Tài khoản VCB của bạn chưa bật tính năng đăng nhập trên trình duyệt web.")
            
            # Xử lý trường hợp phát hiện trình duyệt mới (mã lỗi 20231)
            is_otp_needed = (
                raw_code == "20231"
                or "20231" in str(error_code)
                or "chưa được kích hoạt" in str(error_code)
                or "not activated" in str(error_code)
                or "trình duyệt chưa xác thực" in str(error_code)
            )

            if is_otp_needed:
                raw_data_data = raw_data.get("data", {}) if isinstance(raw_data.get("data"), dict) else raw_data
                b_token = raw_data_data.get("browserToken") or raw_data.get("browserToken") or ""
                dur = int(raw_data_data.get("durationWaiting") or raw_data.get("durationWaiting") or 90)
                raise VCBNeedOtpException(
                    message="Vietcombank yêu cầu xác thực OTP cho trình duyệt mới.",
                    browser_id=browser_id,
                    browser_token=b_token,
                    duration=dur,
                )

            if "3005" in str(error_code) or "Unable username or password" in str(error_code):
                raise ValueError("Tên đăng nhập hoặc mật khẩu Vietcombank không chính xác.")
            raise ValueError(f"Lỗi đăng nhập VCB: {error_code}")

        self._session_cache[uname] = (client, now)
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
            browser_id=client.browserID,
            browserId=client.browserID,
        )

    def transactions(
        self, request: ConnectRequest, from_date: date, to_date: date
    ) -> list[dict]:
        client = self._login_client(request)
        target_account = (request.account_number or client.accountNo or "").strip()

        # Giới hạn tối đa 365 ngày (1 năm từ quá khứ đến hiện tại theo quy định VCB)
        max_past = date.today() - timedelta(days=365)
        if from_date < max_past:
            from_date = max_past

        # Chia nhỏ khoảng thời gian thành các đợt tối đa 90 ngày (chuẩn quy định VCB)
        chunks = split_date_chunks(from_date, to_date, chunk_days=90)
        all_txs = []
        seen_refs = set()
        failures = []

        for idx, (c_from, c_to) in enumerate(chunks):
            str_from = c_from.strftime("%d/%m/%Y")
            str_to = c_to.strftime("%d/%m/%Y")

            try:
                page_index = 0
                while True:
                    page_data = client._transaction_history(str_from, str_to, page_index, account_no=target_account)
                    if not page_data or not page_data.get("status"):
                        err_msg = page_data.get("message") if page_data else "Không có phản hồi từ VCB"
                        logger.warning(f"VCB _transaction_history đợt {str_from}-{str_to} (page {page_index}): {err_msg}")
                        failures.append(f"{str_from}–{str_to}: {err_msg}")
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
                failures.append(f"{str_from}–{str_to}: {e}")

            if idx < len(chunks) - 1:
                time.sleep(0.3)  # Nghỉ nhẹ giữa các đợt tránh bị ngân hàng chặn rate limit

        if not all_txs and failures:
            raise ValueError("Không lấy được lịch sử giao dịch VCB. " + "; ".join(failures))
        return all_txs
