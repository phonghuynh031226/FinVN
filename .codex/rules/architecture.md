# Architecture Rules — Quản lý Tài chính Cá nhân

## Công nghệ nền tảng

- **Frontend**: React + Vite + TypeScript strict mode + TailwindCSS / Lucide Icons (`frontend/web`).
- **Backend**: Python 3.10+ + FastAPI + Uvicorn (`backend/`).
- **Direct Bank Integration**: Bộ adapter ngân hàng nội bộ chạy độc lập (MBBank, Vietcombank, BIDV) giải Captcha OCR offline.
- **Database**: Supabase / PostgreSQL.

## Phân chia cấu trúc thư mục

```
frontend/web/
  src/
    components/     # UI components (dashboard, transactions, accounts, layout...)
    services/       # API call (bankApi, dataService, supabase...)
    types/          # TypeScript types và interfaces (transaction, bankAccount...)
    utils/          # Tiện ích: format tiền tệ, ngày tháng, helpers

backend/
  app/
    adapters/       # Module kết nối trực tiếp ngân hàng (MB, VCB, BIDV, OCR)
    main.py         # FastAPI application & API endpoints
  requirements.txt  # Dependencies Python
```

## Quy tắc bắt buộc

- **MUST** tách biệt hoàn toàn: Web UI gọi API Backend hoặc Supabase, không hardcode credentials trong mã nguồn.
- **MUST** bảo mật thông tin tài khoản ngân hàng: không lưu mật khẩu hay mã OTP ngân hàng vĩnh viễn trong database công khai.
- **MUST** định nghĩa types trong `frontend/web/src/types/` rõ ràng, không dùng `any` bừa bãi.
- **MUST** có xử lý timeout và retry đối với các API cổng ngân hàng có độ trễ mạng.
