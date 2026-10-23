"""Script kiểm thử độc lập 2 tính năng BIDV SmartBanking:
1. Lấy số dư tài khoản thực tế.
2. Lấy lịch sử giao dịch thu/chi (30 ngày gần nhất).

Cách chạy:
  python backend/test_bidv.py
hoặc:
  python backend/test_bidv.py <username> <password> [account_number]
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

# Thêm đường dẫn backend vào sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.adapters.bidv import BIDVAdapter
from app.main import ConnectRequest, TransactionRequest


def main():
    print("=" * 60)
    print("🔍 KIỂM THỬ KẾT NỐI & LỊCH SỬ GIAO DỊCH BIDV SMARTBANKING")
    print("=" * 60)

    if len(sys.argv) >= 3:
        username = sys.argv[1].strip()
        password = sys.argv[2].strip()
        account_number = sys.argv[3].strip() if len(sys.argv) >= 4 else None
    else:
        username = input("Nhập tên đăng nhập BIDV (Số điện thoại): ").strip()
        if not username:
            print("❌ Lỗi: Tên đăng nhập không được để trống!")
            return
        password = input("Nhập mật khẩu BIDV SmartBanking: ").strip()
        if not password:
            print("❌ Lỗi: Mật khẩu không được để trống!")
            return
        acct_input = input("Nhập số tài khoản BIDV (bấm Enter để tự lấy tài khoản mặc định): ").strip()
        account_number = acct_input if acct_input else None

    adapter = BIDVAdapter()
    req = ConnectRequest(
        username=username,
        password=password,
        account_number=account_number,
    )

    # 1. TEST LẤY SỐ DƯ
    print("\n[1/2] Đang kết nối, giải Captcha AI và kiểm tra số dư thực tế BIDV...")
    print("      (Nếu là thiết bị mới lần đầu, vui lòng mở app BIDV trên điện thoại bấm 'Xác nhận')...")

    try:
        snapshot = adapter.connect(req)
        print("✅ KẾT NỐI BIDV THÀNH CÔNG!")
        print(f"   • Số tài khoản BIDV: {snapshot.account_number}")
        if snapshot.account_holder_name:
            print(f"   • Chủ tài khoản:     {snapshot.account_holder_name}")
        print(f"   • Số dư khả dụng:   {snapshot.current_balance:,.0f} {snapshot.currency}")
    except Exception as e:
        print(f"❌ THẤT BẠI: {e}")
        sys.exit(1)

    # 2. TEST LẤY LỊCH SỬ GIAO DỊCH 30 NGÀY
    today = date.today()
    from_date = today - timedelta(days=30)
    print(f"\n[2/2] Đang tải lịch sử giao dịch từ {from_date.strftime('%d/%m/%Y')} đến {today.strftime('%d/%m/%Y')}...")

    tx_req = TransactionRequest(
        username=username,
        password=password,
        account_number=snapshot.account_number,
        from_date=from_date,
        to_date=today,
    )

    try:
        transactions = adapter.transactions(tx_req)
        print(f"✅ TẢI THÀNH CÔNG: Tìm thấy {len(transactions)} giao dịch!")

        total_income = sum(tx.amount for tx in transactions if tx.type == "INCOME")
        total_expense = sum(tx.amount for tx in transactions if tx.type == "EXPENSE")
        net = total_income - total_expense

        print("\n📊 TỔNG KẾT DÒNG TIỀN (30 NGÀY QUA):")
        print(f"   • Số dư hiện tại:   {snapshot.current_balance:,.0f} {snapshot.currency}")
        print(f"   • Tổng tiền vào (+): {total_income:,.0f} VND ({len([t for t in transactions if t.type == 'INCOME'])} giao dịch)")
        print(f"   • Tổng tiền ra  (-): {total_expense:,.0f} VND ({len([t for t in transactions if t.type == 'EXPENSE'])} giao dịch)")
        print(f"   • Chênh lệch ròng:   {net:+,.0f} VND")

        if transactions:
            print(f"\n📋 DANH SÁCH {min(len(transactions), 20)} GIAO DỊCH GẦN NHẤT:")
            for idx, tx in enumerate(transactions[:20], 1):
                tag = "🟢 [+ THU]" if tx.type == "INCOME" else "🔴 [- CHI]"
                date_str = tx.transaction_date or "N/A"
                desc = tx.description or ""
                ref = tx.reference or ""
                print(f"   {idx:02d}. {tag} {tx.amount:>12,.0f} VND | {date_str} | Ref: {ref}")
                print(f"       Nội dung: {desc}")
        else:
            print("   (Không có giao dịch nào phát sinh trong 30 ngày qua)")

        print("\n" + "=" * 60)
        print("🎉 KIỂM THỬ HOÀN TẤT - BẠN CÓ THỂ ĐỐI CHIẾU VỚI APP SMARTBANKING!")
        print("=" * 60)
    except Exception as e:
        print(f"❌ THẤT BẠI KHI TẢI LỊCH SỬ GIAO DỊCH: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
