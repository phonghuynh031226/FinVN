from __future__ import annotations

import base64
import hashlib
import io
import json
import logging
import os
import secrets
import ssl
import time
import urllib.error
import urllib.request
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from Crypto.Cipher import AES, PKCS1_v1_5
from Crypto.PublicKey import RSA
from Crypto.Util import Counter
from PIL import Image

from ..exceptions import BIDVNeedConfirmAppException, BIDVNeedOtpException
from ..main import AccountSnapshot, ConnectRequest, NormalizedTransaction, TransactionRequest

logger = logging.getLogger("bidv-adapter")

# Khóa công khai của máy chủ BIDV trích xuất từ SmartBanking Web
BIDV_SERVER_PUBKEY_B64 = (
    "LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ"
    "2dLQ0FRRUF5NmJDOXViNDZWRHdaTDVyd3RiVwoydkJsSHNxR3puNmtyOE9YN2RLbitqSFp4SnhIU09Hd1RscW"
    "krL1FzU1o4d2JVRGt5SzY2YXRZQjRZMDZqMUhTClJpbUxHMnpLSzZCd3F0TXdNMVZCd2VweTZuQitKc2JvYm1"
    "2REluVS84Y0FyZFFSVk53V01IV3dWMFpCMGEzd3AKRkN2VlN3RjYxekZoNWFHMUdiZnZrYndkaDRicFJhODYw"
    "TVR5SzE5K3JSWGJvUk9RbVFZWGZMV2Jyc0k3dmMzUQpGUmZnSElkaDNiYVZkMG1qbWdNaEU5eVh3enJvT3hkN"
    "DE4YVdVUTllU1kxeG1FbVg5UXluRzlkWUJNbC96enVTCm1NNkNmSndLZHNzd0tGMHZtaFJTTE9CditqL2pBQk"
    "FEY25yY0loY0JTM0VuVHRTWERRUG4vTy9vc3F2UnU1cQp4dlFJREFRQUIKLS0tLS1FTkQgUFVCTElDIEtFWS0"
    "tLS0t"
)
BIDV_SERVER_PUBKEY_PEM = base64.b64decode(BIDV_SERVER_PUBKEY_B64).decode("utf-8")

# OCR Singleton cho Captcha
_DDDD_OCR_INSTANCE = None


def get_ocr_instance():
    global _DDDD_OCR_INSTANCE
    if _DDDD_OCR_INSTANCE is None:
        try:
            import ddddocr
            _DDDD_OCR_INSTANCE = ddddocr.DdddOcr(show_ad=False)
        except Exception as exc:
            logger.warning(f"Không thể khởi tạo ddddocr: {exc}")
    return _DDDD_OCR_INSTANCE


class BIDVCrypto:
    """Xử lý mã hóa RSA + AES-256-CTR hai chiều cho BIDV SmartBanking."""

    def __init__(self) -> None:
        # Sinh cặp khóa RSA 1024-bit của client cho phiên
        self.client_key = RSA.generate(1024)
        client_pub_pem = self.client_key.publickey().export_key().decode("utf-8")
        self.client_pub_b64 = (
            client_pub_pem.replace("-----BEGIN PUBLIC KEY-----", "")
            .replace("-----END PUBLIC KEY-----", "")
            .replace("\n", "")
            .replace("\r", "")
            .strip()
        )
        self.server_pub_key = RSA.import_key(BIDV_SERVER_PUBKEY_PEM)

    def encrypt(self, payload: dict) -> dict:
        """Mã hóa request gửi lên máy chủ BIDV."""
        data = dict(payload)
        data["clientPubKey"] = self.client_pub_b64
        data_json = json.dumps(data, separators=(",", ":")).encode("utf-8")

        # 32 bytes AES key và 16 bytes IV ngẫu nhiên
        aes_key = secrets.token_bytes(32)
        iv = secrets.token_bytes(16)

        # Mã hóa AES-256-CTR
        initial_value = int.from_bytes(iv, byteorder="big")
        ctr = Counter.new(128, initial_value=initial_value)
        cipher_aes = AES.new(aes_key, AES.MODE_CTR, counter=ctr)
        ciphertext = cipher_aes.encrypt(data_json)

        d_b64 = base64.b64encode(iv + ciphertext).decode("utf-8")

        # Mã hóa AES key bằng server RSA public key (PKCS1 v1.5)
        aes_key_b64 = base64.b64encode(aes_key)
        cipher_rsa = PKCS1_v1_5.new(self.server_pub_key)
        rsa_encrypted = cipher_rsa.encrypt(aes_key_b64)
        k_b64 = base64.b64encode(rsa_encrypted).decode("utf-8")

        return {"d": d_b64, "k": k_b64}

    def decrypt(self, encrypted_obj: dict) -> dict:
        """Giải mã phản hồi từ máy chủ BIDV."""
        k_b64 = encrypted_obj.get("k")
        d_b64 = encrypted_obj.get("d")
        if not k_b64 or not d_b64:
            return encrypted_obj

        # 1. Giải mã k bằng client RSA private key
        rsa_cipher = PKCS1_v1_5.new(self.client_key)
        rsa_ciphertext = base64.b64decode(k_b64)
        sentinel = secrets.token_bytes(32)
        aes_key_b64 = rsa_cipher.decrypt(rsa_ciphertext, sentinel)
        if aes_key_b64 == sentinel:
            raise ValueError("Giải mã RSA khóa phiên từ máy chủ BIDV thất bại.")

        aes_key = base64.b64decode(aes_key_b64)

        # 2. Giải mã d bằng AES-256-CTR
        raw_d = base64.b64decode(d_b64)
        iv = raw_d[:16]
        ciphertext = raw_d[16:]

        initial_value = int.from_bytes(iv, byteorder="big")
        ctr = Counter.new(128, initial_value=initial_value)
        cipher_aes = AES.new(aes_key, AES.MODE_CTR, counter=ctr)
        plaintext = cipher_aes.decrypt(ciphertext)

        return json.loads(plaintext.decode("utf-8"))


class BIDVClient:
    """Client giao tiếp trực tiếp với hệ thống BIDV SmartBanking Web API."""

    BASE_URL = "https://smartbanking.bidv.com.vn/w2"

    def __init__(self, username: str, password: str, browser_id: str = "", client_id: str = "") -> None:
        self.username = username.strip()
        self.password = password
        self.browser_id = browser_id.strip()
        self.client_id = client_id.strip()

        self.crypto = BIDVCrypto()
        self.jwt_token: str | None = None
        self.session_id: str | None = None
        self.user_info: dict = {}
        self.is_login: bool = False
        self.login_message: str = ""

        # Thiết lập SSL context
        self.ssl_ctx = ssl.create_default_context()
        self.ssl_ctx.check_hostname = False
        self.ssl_ctx.verify_mode = ssl.CERT_NONE

    def _get_captcha(self) -> tuple[str, str]:
        """Tải ảnh captcha và tự động nhận diện bằng OCR (đảm bảo đủ 5 ký tự)."""
        ocr = get_ocr_instance()
        for _ in range(4):
            guid = str(uuid.uuid4())
            url = f"{self.BASE_URL}/captcha/{guid}"
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    ),
                    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                },
            )
            with urllib.request.urlopen(req, context=self.ssl_ctx, timeout=10) as res:
                img_bytes = res.read()

            if ocr:
                try:
                    captcha_val = ocr.classification(img_bytes)
                    cleaned = "".join(ch for ch in (captcha_val or "").strip() if ch.isalnum())
                    if len(cleaned) == 5:
                        return guid, cleaned.lower()
                except Exception as exc:
                    logger.warning(f"Lỗi khi OCR captcha BIDV: {exc}")

            # Fallback qua VCBLocalOCR nếu có
            try:
                from .vcb_ocr import VCBLocalOCR
                img = Image.open(io.BytesIO(img_bytes))
                vcb_val = VCBLocalOCR().predict(img)
                if vcb_val and len(vcb_val.strip()) == 5:
                    return guid, vcb_val.strip()
            except Exception:
                pass

        return guid, "00000"

    def _make_request(self, endpoint_path: str, payload: dict, referer: str = "") -> tuple[dict, dict]:
        """Gửi request mã hóa tới máy chủ BIDV và giải mã kết quả trả về."""
        url = f"{self.BASE_URL}/{endpoint_path.lstrip('/')}"
        encrypted_body = self.crypto.encrypt(payload)

        req_id = f"{secrets.randbelow(10**15):015d}"
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Language": "vi",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            "X-Request-ID": req_id,
            "Origin": "https://smartbanking.bidv.com.vn",
            "Referer": referer or "https://smartbanking.bidv.com.vn/",
        }
        if self.jwt_token:
            headers["Authorization"] = f"Bearer {self.jwt_token}"

        req = urllib.request.Request(
            url,
            data=json.dumps(encrypted_body).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        res_headers = {}
        try:
            with urllib.request.urlopen(req, context=self.ssl_ctx, timeout=20) as res:
                for k, v in res.headers.items():
                    res_headers[k.lower()] = v
                raw_bytes = res.read()
                data = json.loads(raw_bytes.decode("utf-8"))
                decrypted = self.crypto.decrypt(data)
                return decrypted, res_headers
        except urllib.error.HTTPError as err:
            for k, v in err.headers.items():
                res_headers[k.lower()] = v
            try:
                err_raw = err.read().decode("utf-8")
                err_data = json.loads(err_raw)
                decrypted = self.crypto.decrypt(err_data)
                return decrypted, res_headers
            except Exception:
                raise ValueError(f"Lỗi phản hồi HTTP {err.code} từ máy chủ BIDV") from err

    def login(self, max_retries: int = 10) -> bool:
        """Đăng nhập BIDV SmartBanking với cơ chế thử lại Captcha tự động."""
        for attempt in range(1, max_retries + 1):
            guid, captcha_val = self._get_captcha()
            payload = {
                "mid": 1,
                "user": self.username,
                "pin": self.password,
                "captchaToken": guid,
                "captchaValue": captcha_val,
                "DT": "WINDOWS",
                "PM": "Chrome",
                "OV": "120.0",
                "appVersion": "3.14.2.71",
                "E": self.browser_id,
                "clientId": self.client_id,
                "lang": "vi",
            }

            resp, res_headers = self._make_request(
                "auth",
                payload,
                referer="https://smartbanking.bidv.com.vn/dang-nhap",
            )

            # Cập nhật Bearer token từ response headers nếu có
            auth_header = res_headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                self.jwt_token = auth_header[7:].strip()

            code = str(resp.get("code") or resp.get("codeFull") or "")
            des = resp.get("des") or resp.get("message") or ""

            # Mã IB01: Captcha sai hoặc hết hạn -> thử lại
            if code == "IB01" or "Check code" in des:
                logger.info(f"Captcha BIDV thử lại (lần {attempt}/{max_retries})...")
                time.sleep(0.5)
                continue

            # Trường hợp cần xác nhận trên app điện thoại (Cross Login)
            login_type = str(resp.get("loginType") or "")
            if (
                code in ["CROSS_LOGIN_88", "CROSS-LOGIN-88"]
                or login_type in ["15", "8", "trust_trinh_duyet", "xac_thuc_MB"]
                or bool(resp.get("crossLoginExpire"))
                or "Chờ xác nhận" in des
                or "xác nhận trên ứng dụng" in des.lower()
            ):
                token_mb = resp.get("token") or self.jwt_token
                logger.info(f"BIDV yêu cầu xác thực thiết bị mới (loginType={login_type}). Đang chờ xác nhận trên ứng dụng di động...")
                return self._handle_cross_login(token_mb)

            # Đăng nhập thành công (code "00" hoặc thành công bình thường)
            if code in ["00", "0", ""] and (resp.get("user") or self.jwt_token):
                self.is_login = True
                self.user_info = resp
                if resp.get("sessionId"):
                    self.session_id = resp["sessionId"]
                return True

            # Lỗi mật khẩu hoặc tên đăng nhập
            if code in ["55", "WRONG_PASSWORD"]:
                self.login_message = "Tên đăng nhập hoặc mật khẩu BIDV không chính xác."
                raise ValueError(self.login_message)

            self.login_message = des or f"Đăng nhập BIDV thất bại (Mã: {code})"
            raise ValueError(self.login_message)

        self.login_message = "Không thể giải đúng mã Captcha BIDV sau 5 lần thử. Vui lòng thử lại."
        raise ValueError(self.login_message)

    def _handle_cross_login(self, token_mb: str | None, timeout_seconds: int = 120) -> bool:
        """Thực hiện vòng lặp polling chờ người dùng mở app BIDV bấm Đồng ý."""
        start_time = time.time()
        logger.info(f"Bắt đầu chờ xác nhận trên app BIDV trong tối đa {timeout_seconds}s...")
        poll_count = 0

        while time.time() - start_time < timeout_seconds:
            time.sleep(2.5)
            poll_count += 1
            if poll_count % 4 == 0:
                elapsed = int(time.time() - start_time)
                logger.info(f"Đang chờ người dùng bấm 'Xác nhận' trên app BIDV SmartBanking ({elapsed}s/{timeout_seconds}s)...")
            payload = {
                "mid": 30,
                "user": self.username,
                "token": token_mb or "",
                "lang": "vi",
                "DT": "WINDOWS",
                "PM": "Chrome",
                "OV": "120.0",
                "appVersion": "3.14.2.71",
                "E": self.browser_id,
                "clientId": self.client_id,
            }

            resp, res_headers = self._make_request(
                "auth",
                payload,
                referer="https://smartbanking.bidv.com.vn/dang-nhap/xac-thuc-mb",
            )
            auth_header = res_headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                self.jwt_token = auth_header[7:].strip()

            code = str(resp.get("code") or resp.get("codeFull") or "")

            # Vẫn đang chờ người dùng bấm xác nhận
            if (
                code in ["CROSS_LOGIN_88", "CROSS-LOGIN-88", "88"]
                or "Chờ" in (resp.get("des") or "")
                or "chờ" in (resp.get("des") or "").lower()
            ):
                continue

            # Người dùng đã bấm đồng ý trên điện thoại
            if code in ["00", "0", ""] and (resp.get("user") or self.jwt_token or resp.get("clientId")):
                self.is_login = True
                self.user_info = resp
                if resp.get("sessionId"):
                    self.session_id = resp["sessionId"]
                new_client_id = resp.get("clientId")
                if new_client_id:
                    self.client_id = str(new_client_id)
                    BIDVAdapter.save_device_credentials(self.username, self.browser_id, self.client_id)
                logger.info("✅ Xác thực BIDV SmartBanking trên điện thoại thành công!")
                return True

            err_des = resp.get("des") or resp.get("message") or "Người dùng từ chối xác thực trên ứng dụng di động."
            raise ValueError(f"Xác nhận BIDV thất bại: {err_des}")

        raise ValueError("Đã hết thời gian chờ xác nhận đăng nhập trên app BIDV SmartBanking (120s).")

    def get_accounts(self) -> list[dict[str, Any]]:
        """Lấy danh sách tài khoản thanh toán và số dư khả dụng (mid: 10)."""
        if not self.is_login:
            raise ValueError("Chưa đăng nhập BIDV SmartBanking.")

        payload = {
            "mid": 10,
            "function": "6",
            "accType": "",
            "lang": "vi",
            "user": self.username,
            "DT": "WINDOWS",
            "PM": "Chrome",
            "OV": "120.0",
            "appVersion": "3.14.2.71",
            "E": self.browser_id,
            "clientId": self.client_id,
        }

        resp, _ = self._make_request(
            "process",
            payload,
            referer="https://smartbanking.bidv.com.vn/tai-khoan",
        )

        code = str(resp.get("code") or resp.get("codeFull") or "")
        if code and code not in ["00", "0"]:
            des = resp.get("des") or resp.get("message") or f"Lỗi truy vấn tài khoản BIDV ({code})"
            logger.warning(f"Lấy danh sách tài khoản BIDV thất bại: {des} (code={code})")
            if code == "98":
                self.is_login = False
            raise ValueError(des)

        acc_list = resp.get("accList") or []
        return acc_list

    def get_transactions(
        self,
        account_number: str,
        from_date: date,
        to_date: date,
    ) -> list[dict[str, Any]]:
        """Lấy lịch sử sao kê chi tiết tài khoản (mid: 12)."""
        if not self.is_login:
            raise ValueError("Chưa đăng nhập BIDV SmartBanking.")

        all_transactions: list[dict[str, Any]] = []
        more_record = "N"
        next_runbal = ""
        posting_date = ""
        posting_order = ""
        file_indicator = ""

        # Giới hạn tối đa 10 trang để tránh vòng lặp vô tận
        for _ in range(10):
            payload = {
                "mid": 12,
                "function": "6",
                "accNo": account_number.strip(),
                "fromDate": from_date.strftime("%Y%m%d"),
                "toDate": to_date.strftime("%Y%m%d"),
                "moreRecord": more_record,
                "nextRunbal": next_runbal,
                "postingDate": posting_date,
                "postingOrder": posting_order,
                "fileIndicator": file_indicator,
                "accType": "D",
                "lang": "vi",
                "user": self.username,
                "DT": "WINDOWS",
                "PM": "Chrome",
                "OV": "120.0",
                "appVersion": "3.14.2.71",
                "E": self.browser_id,
                "clientId": self.client_id,
            }

            resp, _ = self._make_request(
                "process",
                payload,
                referer="https://smartbanking.bidv.com.vn/tai-khoan",
            )

            code = str(resp.get("code") or resp.get("codeFull") or "")
            if code and code not in ["00", "0"]:
                des = resp.get("des") or resp.get("message") or f"Lỗi lấy lịch sử BIDV ({code})"
                logger.warning(f"Lấy lịch sử giao dịch BIDV thất bại: {des} (code={code})")
                break

            txn_list = resp.get("txnList") or []
            if isinstance(txn_list, list):
                all_transactions.extend(txn_list)

            # Kiểm tra phân trang
            if resp.get("moreRecord") == "Y" and txn_list:
                more_record = "Y"
                last_txn = txn_list[-1]
                next_runbal = str(last_txn.get("balance") or last_txn.get("runbal") or "")
                posting_date = str(last_txn.get("postingDate") or "")
                posting_order = str(last_txn.get("postingOrder") or "")
                file_indicator = str(last_txn.get("fileIndicator") or "")
            else:
                break

        return all_transactions


class BIDVAdapter:
    """Adapter tích hợp BIDV SmartBanking theo chuẩn BankAdapter của hệ thống."""

    _session_cache: dict[str, tuple[BIDVClient, float]] = {}  # username -> (client, timestamp)

    @classmethod
    def clear_session_cache(cls, username: str = "") -> None:
        """Xóa cache phiên đăng nhập."""
        if username:
            cls._session_cache.pop(username.strip(), None)
        else:
            cls._session_cache.clear()

    @staticmethod
    def _credentials_path(username: str) -> Path:
        """Đường dẫn lưu trữ browser_id và client_id theo băm SĐT."""
        account_key = hashlib.sha256(username.strip().encode("utf-8")).hexdigest()
        directory = Path(__file__).resolve().parents[2] / "data" / "bidv_browser_ids"
        directory.mkdir(parents=True, exist_ok=True)
        return directory / f"{account_key}.json"

    @classmethod
    def get_saved_device_credentials(cls, username: str) -> tuple[str, str]:
        """Đọc browser_id và client_id đã kích hoạt."""
        path = cls._credentials_path(username)
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                return data.get("browser_id", ""), data.get("client_id", "")
            except Exception:
                pass
        return "", ""

    @classmethod
    def save_device_credentials(cls, username: str, browser_id: str, client_id: str) -> None:
        """Lưu lại browser_id và client_id để tái sử dụng làm thiết bị tin cậy."""
        path = cls._credentials_path(username)
        content = {
            "browser_id": browser_id.strip(),
            "client_id": client_id.strip(),
            "updated_at": datetime.now().isoformat(),
        }
        path.write_text(json.dumps(content, indent=2), encoding="utf-8")

    def _login_client(self, request: ConnectRequest, use_cache: bool = True) -> BIDVClient:
        uname = request.username.strip()
        now = time.time()

        # Kiểm tra phiên đăng nhập trong cache RAM (TTL 5 phút = 300s)
        if use_cache and uname in self._session_cache:
            cached_client, cached_time = self._session_cache[uname]
            if now - cached_time < 300 and getattr(cached_client, "is_login", False):
                logger.info(f"⚡ Tái sử dụng phiên kết nối BIDV đã lưu cho {uname}")
                return cached_client

        saved_bid, saved_cid = self.get_saved_device_credentials(uname)
        browser_id = (request.browser_id or "").strip() or saved_bid
        client_id = (getattr(request, "client_id", None) or "").strip() or saved_cid
        if not browser_id:
            browser_id = f"BIDV_{secrets.token_hex(16)}"

        client = BIDVClient(
            username=uname,
            password=request.password,
            browser_id=browser_id,
            client_id=client_id,
        )

        client.login(max_retries=10)
        if not client.is_login:
            self._session_cache.pop(uname, None)
            raise ValueError(client.login_message or "Đăng nhập BIDV thất bại.")

        # Lưu credentials
        self.save_device_credentials(uname, client.browser_id, client.client_id)
        self._session_cache[uname] = (client, now)
        return client

    def connect(self, request: ConnectRequest) -> AccountSnapshot:
        """Đăng nhập và lấy thông tin số dư tài khoản BIDV."""
        if not request.username.strip() or not request.password:
            raise ValueError("Thiếu tên đăng nhập hoặc mật khẩu BIDV.")

        client = self._login_client(request, use_cache=True)
        acc_list = client.get_accounts()
        if not acc_list:
            raise ValueError("Không tìm thấy tài khoản thanh toán nào trong tài khoản BIDV này.")

        target_acc = None
        if request.account_number:
            acc_num = request.account_number.strip()
            for acc in acc_list:
                if str(acc.get("accNo") or "").strip() == acc_num:
                    target_acc = acc
                    break
            if not target_acc:
                raise ValueError(f"Không tìm thấy số tài khoản {request.account_number} trong danh sách BIDV.")
        else:
            # Chọn tài khoản mặc định (showDefault) hoặc tài khoản đầu tiên
            target_acc = next((a for a in acc_list if a.get("showDefault")), acc_list[0])

        # Chuẩn hóa số dư (loại bỏ phần thập phân nếu có trước khi trích xuất số nguyên)
        raw_balance = str(target_acc.get("balanceAval") or target_acc.get("balance") or "0").split(".")[0]
        clean_digits = "".join(ch for ch in raw_balance if ch.isdigit() or ch == "-")
        current_balance = int(clean_digits) if clean_digits else 0

        acc_no = str(target_acc.get("accNo") or "")
        acc_name = target_acc.get("accName") or "Chủ tài khoản BIDV"

        return AccountSnapshot(
            account_number=acc_no,
            account_holder_name=acc_name,
            current_balance=current_balance,
            currency=target_acc.get("ccy") or "VND",
            accountNumber=acc_no,
            currentBalance=current_balance,
            accountHolderName=acc_name,
            browser_id=client.browser_id,
            browserId=client.browser_id,
            client_id=client.client_id,
        )

    def transactions(self, request: TransactionRequest) -> list[NormalizedTransaction]:
        """Truy vấn sao kê chi tiết và chuẩn hóa sang NormalizedTransaction."""
        if not request.username.strip() or not request.password:
            raise ValueError("Thiếu tên đăng nhập hoặc mật khẩu BIDV.")

        client = self._login_client(request, use_cache=True)

        target_acc_no = (request.account_number or "").strip()
        if not target_acc_no:
            acc_list = client.get_accounts()
            if not acc_list:
                raise ValueError("Không tìm thấy tài khoản BIDV để lấy sao kê.")
            target_acc = next((a for a in acc_list if a.get("showDefault")), acc_list[0])
            target_acc_no = str(target_acc.get("accNo") or "")

        raw_txns = client.get_transactions(
            account_number=target_acc_no,
            from_date=request.from_date,
            to_date=request.to_date,
        )

        normalized: list[NormalizedTransaction] = []
        for row in raw_txns:
            raw_amt_str = str(row.get("amount") or "0").replace(",", "").strip()
            raw_amt_int_part = raw_amt_str.split(".")[0]
            clean_amt_digits = "".join(ch for ch in raw_amt_int_part if ch.isdigit())
            amount = int(clean_amt_digits) if clean_amt_digits else 0

            txn_type_str = str(row.get("txnType") or "").strip()
            is_income = (
                txn_type_str == "+"
                or "+" in raw_amt_str
                or "POSITIVE" in txn_type_str.upper()
                or "CR" in txn_type_str.upper()
            )

            # Ngày giao dịch (txnDate có dạng DD/MM/YYYY)
            date_str = str(row.get("txnDate") or row.get("postingDate") or "")

            # Nội dung giao dịch (BIDV trả trong txnRemark)
            desc = str(
                row.get("txnRemark")
                or row.get("remark")
                or row.get("txnDesc")
                or row.get("description")
                or ""
            ).strip()
            ref_no = str(row.get("refNo") or row.get("seqNo") or row.get("postingOrder") or "").strip()

            normalized.append(
                NormalizedTransaction(
                    transaction_date=date_str,
                    amount=amount,
                    type="INCOME" if is_income else "EXPENSE",
                    description=desc,
                    reference=ref_no,
                    raw_data=row,
                )
            )

        return normalized
