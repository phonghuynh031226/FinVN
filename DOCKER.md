# Bank Gateway và Docker Compose

## Kiến trúc

Web gọi một API duy nhất:

- `POST /api/banks/mb/connect`
- `POST /api/banks/vcb/connect`
- `POST /api/banks/bidv/connect`
- `GET /health`

Gateway dùng FastAPI/Python và chọn adapter theo mã ngân hàng. Frontend không cần biết bên trong adapter dùng mã nguồn nào.

## Chạy bằng Docker Desktop

Mở PowerShell tại thư mục gốc dự án:

```powershell
docker compose up --build
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
docker compose down
```

Xem log:

```powershell
docker compose logs -f bank-gateway
```

## Trạng thái hiện tại

Docker và gateway contract đã sẵn sàng, nhưng ba adapter vẫn trả `501` có chủ đích. Cần port từng API không chính thức vào `backend/app/adapters/`:

- MB: port logic login/captcha/balance/transactions từ TypeScript.
- VCB: tái sử dụng logic Python trong thư mục tài liệu.
- BIDV: chuyển logic ký RSA và SOAP từ PHP sang Python.

Không đặt mật khẩu ngân hàng vào Dockerfile, git hoặc log. Các API không chính thức có thể thay đổi hoặc bị ngân hàng chặn.
