# Hướng dẫn cài đặt

## Yêu cầu

- Windows, macOS hoặc Linux.
- Python 3.12 trở lên.
- Node.js và npm tương thích với Vite trong `frontend/web/package.json`.
- Tài khoản Supabase nếu muốn dùng cơ sở dữ liệu đám mây; chế độ demo cục bộ không bắt buộc.

## Cài đặt cấu hình Supabase (tùy chọn)

1. Tạo dự án Supabase.
2. Chạy lần lượt các migration trong `supabase/migrations/` bằng SQL Editor.
3. Cấu hình các biến `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` nếu ứng dụng web cần kết nối Supabase. Không đưa service role key vào frontend.

## Cài đặt và chạy backend ngân hàng

Từ thư mục gốc dự án:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8787 --reload
```

Kiểm tra backend tại `http://localhost:8787/health`. Thư viện VCB và model CAPTCHA đã được đóng gói trong `backend/app/adapters/vcb_lib/`, nên backend không cần đọc mã nguồn bên ngoài.

## Cài đặt và chạy web

Mở terminal thứ hai tại thư mục gốc:

```powershell
cd frontend/web
npm install
```

Tạo `frontend/web/.env.local`:

```dotenv
VITE_BANK_CONNECTOR_URL=http://localhost:8787
```

Nếu dùng Supabase, bổ sung URL và anon key theo cấu hình dự án. Sau đó chạy:

```powershell
npm run dev
```

Mở `http://localhost:5173`.

## Chạy bằng Docker

Từ thư mục gốc dự án:

```powershell
docker build -f backend/Dockerfile -t finance-bank-gateway .
docker volume create bank_gateway_data
docker run -d --name bank-gateway -p 8787:8787 -v bank_gateway_data:/app/data -e WEB_ORIGIN=http://localhost:5173 --restart unless-stopped finance-bank-gateway
```

Lệnh này khởi động bank gateway ở cổng `8787`. Web vẫn cần chạy riêng theo hướng dẫn trên và cấu hình `VITE_BANK_CONNECTOR_URL` trỏ đến gateway. Dừng backend bằng `docker stop bank-gateway`.

## Lỗi thường gặp

- **Không tìm thấy model hoặc thư viện VCB:** xác nhận thư mục `backend/app/adapters/vcb_lib/` có mã nguồn và file `model/captcha_model.h5`.
- **Lỗi kết nối từ web:** kiểm tra backend đang chạy, URL `VITE_BANK_CONNECTOR_URL` và khởi động lại Vite sau khi sửa `.env.local`.
- **Thiếu thư viện Python:** kích hoạt môi trường ảo rồi chạy lại `python -m pip install -r requirements.txt`.
- **CORS:** mặc định gateway chỉ cho phép origin `http://localhost:5173`; đặt `WEB_ORIGIN` phù hợp nếu dùng origin khác.

## Ghi chú

Các adapter ngân hàng dùng API không chính thức và có thể ngừng hoạt động khi ngân hàng thay đổi hệ thống. Lần kết nối VCB trên thiết bị mới có thể cần người dùng nhập OTP SMS. Không ghi mật khẩu hoặc OTP vào log, mã nguồn hay kho Git.
