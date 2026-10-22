from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

# Cấu hình UTF-8 cho Windows console
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

from app.adapters.vcb import VCBAdapter
from app.main import ConnectRequest


def get_auto_browser_id() -> str:
    # 1. Kiểm tra file lưu cấu hình vcb_browser_id.txt nếu có
    id_file = Path(__file__).resolve().parent / "vcb_browser_id.txt"
    if id_file.exists():
        saved_id = id_file.read_text(encoding="utf-8").strip()
        if saved_id:
            return saved_id

    # 2. Tự động sinh mã Browser ID định danh phần cứng máy tính (32 ký tự hex)
    import hashlib
    import platform
    import uuid
    seed = f"{platform.node()}-{platform.machine()}-{uuid.getnode()}"
    auto_id = hashlib.md5(seed.encode()).hexdigest()
    try:
        id_file.write_text(auto_id, encoding="utf-8")
    except Exception:
        pass
    return auto_id


def main():
    print("=" * 60)
    print("🔍 KIỂM THỬ KẾT NỐI & LỊCH SỬ GIAO DỊCH VIETCOMBANK (VCB)")
    print("=" * 60)

    # 1. Nhận thông tin đăng nhập (Chỉ cần 2 thông tin)
    if len(sys.argv) >= 3:
        username = sys.argv[1].strip()
        password = sys.argv[2].strip()
        browser_id = sys.argv[3].strip() if len(sys.argv) >= 4 else get_auto_browser_id()
    else:
        username = input("Nhập tên đăng nhập VCB (SĐT): ").strip()
        password = input("Nhập mật khẩu VCB DigiBank: ").strip()
        browser_id = get_auto_browser_id()

    if not username or not password:
        print("\n❌ LỖI: Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu!")
        sys.exit(1)

    print(f"⚡ Browser ID tự động: {browser_id}")

    adapter = VCBAdapter()
    req = ConnectRequest(
        username=username,
        password=password,
        browser_id=browser_id,
    )

    # 2. Kiểm thử lấy số dư thực tế
    print("\n[1/2] Đang kết nối, giải mã và kiểm tra số dư thực tế Vietcombank...")
    try:
        snapshot = adapter.connect(req)
        print("✅ KẾT NỐI VCB THÀNH CÔNG!")
        print(f"   • Số tài khoản VCB: {snapshot.account_number}")
        if snapshot.account_holder_name:
            print(f"   • Chủ tài khoản:     {snapshot.account_holder_name}")
        print(f"   • Số dư khả dụng:   {snapshot.current_balance:,.0f} {snapshot.currency}")
    except Exception as e:
        print(f"❌ THẤT BẠI: {e}")
        sys.exit(1)

    # 3. Kiểm thử lấy lịch sử giao dịch 30 ngày
    today = date.today()
    from_date = today - timedelta(days=30)
    print(f"\n[2/2] Đang tải lịch sử giao dịch từ {from_date.strftime('%d/%m/%Y')} đến {today.strftime('%d/%m/%Y')}...")

    try:
        transactions = adapter.transactions(req, from_date, today)
        print(f"✅ TẢI THÀNH CÔNG: Tìm thấy {len(transactions)} giao dịch!")

        if transactions:
            print("\n📋 5 GIAO DỊCH GẦN NHẤT:")
            for idx, tx in enumerate(transactions[:5], 1):
                raw_amt = str(tx.get("Amount") or tx.get("amount") or "0").replace(",", "").replace(".", "").strip()
                amount = int(raw_amt) if raw_amt.isdigit() else 0
                cd = str(tx.get("CD") or tx.get("DorCCode") or "").strip()
                is_income = (cd == "+") or (cd.upper() == "C")
                tag = "[+ THU]" if is_income else "[- CHI]"
                date_str = tx.get("TransactionDate") or tx.get("tranDate") or tx.get("PostingDate") or "N/A"
                desc = tx.get("Description") or tx.get("Remark") or ""
                ref = tx.get("Reference") or tx.get("SeqNo") or ""

                print(f"   {idx}. {tag} {amount:,.0f} VND | Ngày: {date_str} | Mã: {ref}")
                print(f"      Nội dung: {desc}")
        else:
            print("   (Không có giao dịch nào phát sinh trong 30 ngày qua)")

        print("\n" + "=" * 60)
        print("🎉 TẤT CẢ 2 TÍNH NĂNG VCB ĐÃ SẴN SÀNG TÍCH HỢP!")
        print("=" * 60)
    except Exception as e:
        print(f"❌ THẤT BẠI KHI TẢI LỊCH SỬ GIAO DỊCH: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
