"""Script kiểm thử độc lập 2 tính năng MB Bank:
1. Lấy số dư tài khoản thực tế.
2. Lấy lịch sử giao dịch thu/chi (30 ngày gần nhất).

Cách chạy:
  python backend/test_mb.py
hoặc:
  python backend/test_mb.py <username> <password> [account_number]
"""

from __future__ import annotations

import getpass
import sys
from datetime import date, timedelta
from pathlib import Path

# Đảm bảo in tiếng Việt / emoji trên Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Đảm bảo import được app
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.adapters.mb import MBAdapter
from app.main import ConnectRequest, TransactionRequest


def format_vnd(amount: int) -> str:
    return f"{amount:,.0f} VND".replace(",", ".")


def main():
    print("=" * 60)
    print("🔍 KIỂM THỬ KẾT NỐI & LỊCH SỬ GIAO DỊCH MB BANK")
    print("=" * 60)

    if len(sys.argv) >= 3:
        username = sys.argv[1]
        password = sys.argv[2]
        account_number = sys.argv[3] if len(sys.argv) >= 4 else None
    else:
        username = input("Nhập tên đăng nhập MB Bank (SĐT / CCCD): ").strip()
        if not username:
            print("❌ Lỗi: Tên đăng nhập không được để trống!")
            return
        password = input("Nhập mật khẩu MB Bank: ").strip()
        if not password:
            print("❌ Lỗi: Mật khẩu không được để trống!")
            return
        acct_input = input("Nhập số tài khoản MB (bấm Enter để tự lấy tài khoản chính): ").strip()
        account_number = acct_input if acct_input else None

    adapter = MBAdapter()

    # 1. TEST LẤY SỐ DƯ
    print("\n[1/2] Đang đăng nhập và kiểm tra số dư thực tế...")
    try:
        connect_req = ConnectRequest(
            username=username,
            password=password,
            account_number=account_number,
        )
        snapshot = adapter.connect(connect_req)
        print("✅ KẾT NỐI THÀNH CÔNG!")
        print(f"  • Chủ tài khoản : {snapshot.account_holder_name}")
        print(f"  • Số tài khoản  : {snapshot.account_number}")
        print(f"  • Số dư thực tế : {format_vnd(snapshot.current_balance)}")
        print(f"  • Đơn vị tiền tệ: {snapshot.currency}")
        actual_account_no = snapshot.account_number
    except Exception as exc:
        print(f"❌ THẤT BẠI: {exc}")
        return

    # 2. TEST LẤY LỊCH SỬ GIAO DỊCH
    today = date.today()
    from_date = today - timedelta(days=30)
    print(f"\n[2/2] Đang tải lịch sử giao dịch 30 ngày ({from_date.strftime('%d/%m/%Y')} -> {today.strftime('%d/%m/%Y')})...")

    try:
        tx_req = TransactionRequest(
            username=username,
            password=password,
            account_number=actual_account_no,
            from_date=from_date,
            to_date=today,
        )
        transactions = adapter.transactions(tx_req)
        print(f"✅ TÌM THẤY {len(transactions)} GIAO DỊCH:")

        if not transactions:
            print("  (Không có giao dịch nào phát sinh trong 30 ngày qua)")
        else:
            print("-" * 80)
            print(f"{'Thời gian':<18} | {'Loại':<10} | {'Số tiền':<15} | {'Mã GD':<12} | {'Nội dung'}")
            print("-" * 80)
            for tx in transactions:
                type_label = "🟢 TIỀN VÀO" if tx.type == "INCOME" else "🔴 TIỀN RA"
                amount_str = f"+{format_vnd(tx.amount)}" if tx.type == "INCOME" else f"-{format_vnd(tx.amount)}"
                dt_str = tx.transaction_date or "N/A"
                ref_str = tx.reference or "N/A"
                desc = (tx.description or "")[:35]
                print(f"{dt_str:<18} | {type_label:<10} | {amount_str:<15} | {ref_str:<12} | {desc}")
            print("-" * 80)

    except Exception as exc:
        print(f"❌ THẤT BẠI KHI LẤY GIAO DỊCH: {exc}")
        return

    print("\n🎉 HOÀN TẤT KIỂM THỬ THÀNH CÔNG CẢ 2 TÍNH NĂNG!")


if __name__ == "__main__":
    main()
