# Bank Gateway và Docker

## Kiến trúc

Web gọi một API duy nhất:

- `POST /api/banks/mb/connect`
- `POST /api/banks/vcb/connect`
- `POST /api/banks/bidv/connect`
- `GET /health`

Gateway dùng FastAPI/Python và chọn adapter theo mã ngân hàng. Frontend không cần biết bên trong adapter dùng mã nguồn nào. Thư viện VCB và model CAPTCHA nằm trong `backend/app/adapters/vcb_lib/`, vì vậy Docker chỉ cần đóng gói thư mục backend.

## Chạy backend bằng Docker

Mở PowerShell tại thư mục gốc dự án:

```powershell
docker build -f backend/Dockerfile -t finance-bank-gateway .
docker volume create bank_gateway_data
docker run -d --name bank-gateway -p 8787:8787 -v bank_gateway_data:/app/data -e WEB_ORIGIN=http://localhost:5173 --restart unless-stopped finance-bank-gateway
```

Kiểm tra gateway:

```powershell
Invoke-WebRequest http://localhost:8787/health
```

Chạy web ở terminal khác:

```powershell
cd frontend/web
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Dừng gateway:

```powershell
docker stop bank-gateway
docker rm bank-gateway
```

Xem log:

```powershell
docker logs -f bank-gateway
```

## Trạng thái hiện tại

MB, VCB và BIDV có adapter được triển khai trong `backend/app/adapters/`. MB dùng thư viện Python được cài qua `backend/requirements.txt`; mã nguồn VCB và model CAPTCHA được đóng gói trong `backend/app/adapters/vcb_lib/`. BIDV được triển khai trực tiếp trong backend.

Không đặt mật khẩu ngân hàng vào Dockerfile, git hoặc log. Các API không chính thức có thể thay đổi hoặc bị ngân hàng chặn.
