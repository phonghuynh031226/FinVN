from __future__ import annotations

import logging
import re
from datetime import date, datetime, time, timedelta
import time as pytime
import mbbank

from ..main import AccountSnapshot, ConnectRequest, NormalizedTransaction, TransactionRequest

logger = logging.getLogger("mb_adapter")


class MBAdapter:
    """Adapter kết nối trực tiếp với MB Bank sử dụng mbbank-lib."""

    def _get_client(self, username: str, password: str) -> mbbank.MBBank:
        try:
            return mbbank.MBBank(
                username=username.strip(),
                password=password,
                retry_times=5,
            )
        except Exception as exc:
            raise ValueError(f"Không thể khởi tạo kết nối MB Bank: {exc}") from exc

    def connect(self, request: ConnectRequest) -> AccountSnapshot:
        """Đăng nhập và lấy thông tin số dư tài khoản MB Bank."""
        if not request.username.strip() or not request.password:
            raise ValueError("Thiếu tên đăng nhập hoặc mật khẩu MB Bank.")

        client = self._get_client(request.username, request.password)
        try:
            balance_resp = client.getBalance()
        except Exception as exc:
            raise ValueError(f"Đăng nhập MB Bank thất bại. Vui lòng kiểm tra lại tài khoản, mật khẩu hoặc captcha: {exc}") from exc

        accounts = balance_resp.acct_list or []
        if not accounts and balance_resp.internationalAcctList:
            accounts = balance_resp.internationalAcctList

        if not accounts:
            raise ValueError("Không tìm thấy tài khoản ngân hàng nào trong tài khoản MB này.")

        target_account = None
        if request.account_number:
            for acct in accounts:
                if acct.acctNo == request.account_number.strip():
                    target_account = acct
                    break
            if not target_account:
                raise ValueError(f"Không tìm thấy số tài khoản {request.account_number} trong danh sách tài khoản MB.")
        else:
            target_account = accounts[0]

        # Chuẩn hóa số dư thành số nguyên VND
        raw_balance_str = str(target_account.currentBalance or "0")
        clean_balance_digits = re.sub(r"[^\d-]", "", raw_balance_str)
        current_balance = int(clean_balance_digits) if clean_balance_digits else 0

        return AccountSnapshot(
            account_number=target_account.acctNo,
            account_holder_name=target_account.acctNm,
            current_balance=current_balance,
            currency=target_account.ccyCd or "VND",
            accountNumber=target_account.acctNo,
            accountHolderName=target_account.acctNm,
            currentBalance=current_balance,
        )

    def transactions(self, request: TransactionRequest) -> list[NormalizedTransaction]:
        """Lấy lịch sử giao dịch thu/chi MB Bank trong khoảng ngày."""
        if not request.username.strip() or not request.password:
            raise ValueError("Thiếu tên đăng nhập hoặc mật khẩu MB Bank.")

        client = self._get_client(request.username, request.password)

        account_no = request.account_number
        if not account_no:
            snapshot = self.connect(request)
            account_no = snapshot.account_number

        # Giới hạn tối đa 365 ngày (1 năm từ quá khứ đến hiện tại theo quy định MB Bank)
        max_past = date.today() - timedelta(days=365)
        effective_from = request.from_date if request.from_date >= max_past else max_past

        # Chia nhỏ khoảng ngày thành các đợt tối đa 5 ngày để không bao giờ bị MBBank giới hạn 30 giao dịch/lần gọi
        chunks = []
        cur = effective_from
        while cur <= request.to_date:
            nxt = min(cur + timedelta(days=5), request.to_date)
            chunks.append((cur, nxt))
            cur = nxt + timedelta(days=1)

        logger.info(f"[MBBank] Bat dau tra cuu tai khoan {account_no} tu {effective_from} den {request.to_date} ({len(chunks)} dot)...")

        results: list[NormalizedTransaction] = []
        seen_refs = set()

        for idx, (c_from, c_to) in enumerate(chunks):
            start_dt = datetime.combine(c_from, time.min)
            end_dt = datetime.combine(c_to, time.max)

            try:
                history_resp = client.getTransactionAccountHistory(
                    accountNo=account_no,
                    from_date=start_dt,
                    to_date=end_dt,
                )
                tx_list = history_resp.transactionHistoryList or []
                logger.info(f"[MBBank] Dot {idx + 1}/{len(chunks)} ({c_from} -> {c_to}): lay duoc {len(tx_list)} giao dich")

                for tx in tx_list:
                    ref_key = str(tx.refNo or tx.docId or "").strip()
                    dedup_key = ref_key if ref_key else f"{tx.transactionDate}-{tx.creditAmount}-{tx.debitAmount}-{tx.description}"
                    if dedup_key in seen_refs:
                        continue
                    seen_refs.add(dedup_key)

                    credit_clean = re.sub(r"[^\d]", "", str(tx.creditAmount or "0"))
                    debit_clean = re.sub(r"[^\d]", "", str(tx.debitAmount or "0"))
                    credit = int(credit_clean) if credit_clean else 0
                    debit = int(debit_clean) if debit_clean else 0

                    is_income = credit > 0
                    amount = credit if is_income else debit

                    raw_dict = tx.model_dump() if hasattr(tx, "model_dump") else (tx.dict() if hasattr(tx, "dict") else {})

                    results.append(
                        NormalizedTransaction(
                            transaction_date=tx.transactionDate or tx.postingDate,
                            amount=amount,
                            type="INCOME" if is_income else "EXPENSE",
                            description=tx.description or tx.addDescription,
                            reference=tx.refNo or tx.docId,
                            raw_data=raw_dict,
                        )
                    )
            except Exception as exc:
                logger.warning(f"[MBBank] Loi dot {c_from} -> {c_to}: {exc}")

            if idx < len(chunks) - 1:
                pytime.sleep(0.3)  # Nghỉ nhẹ giữa các đợt

        logger.info(f"[MBBank] Hoan tat! Tong cong {len(results)} giao dich duy nhat.")
        return results
