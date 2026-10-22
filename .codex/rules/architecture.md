# Architecture Rules — Quản lý Tài chính Cá nhân

## Công nghệ nền tảng

- **Mobile**: React Native + Expo (SDK 50+) + TypeScript strict mode.
- **Backend**: Node.js (Express hoặc Fastify) + PostgreSQL, hoặc Supabase (PostgreSQL + Auth + Edge Functions).
- **Ngôn ngữ**: TypeScript cho cả mobile và backend; `"strict": true` trong mọi `tsconfig.json`.
- **State management**: Zustand hoặc React Query (TanStack Query) cho mobile; không dùng Redux trừ khi đã có sẵn.

## Phân chia layers (Separation of Concerns)

```
mobile/
  src/
    screens/        # Màn hình, chỉ chứa UI logic
    components/     # UI components tái sử dụng
    hooks/          # Custom hooks (useTransactions, useAccounts…)
    services/       # Gọi API, không chứa business logic
    store/          # State management (Zustand stores)
    utils/          # Tiện ích thuần: format, validation, date
    types/          # TypeScript types và interfaces dùng chung
    constants/      # Hằng số: route names, error codes, limits
    navigation/     # React Navigation stack/tab setup

backend/
  src/
    routes/         # HTTP route definitions
    controllers/    # Xử lý request/response
    services/       # Business logic
    repositories/   # Truy vấn database (không để SQL thô ở service)
    middlewares/    # Auth, validation, rate limiting, error handling
    webhooks/       # Xử lý webhook từ SePay
    db/
      migrations/   # Schema migrations (sequential, không xóa)
      seeds/        # Dữ liệu mẫu cho dev/test
    types/          # Shared types
    config/         # Đọc env vars; KHÔNG hardcode giá trị nhạy cảm
```

## Quy tắc bắt buộc

- **MUST** tách biệt hoàn toàn: screen không gọi database, repository không chứa business logic.
- **MUST** mọi cấu hình nhạy cảm (API key, webhook secret, DB URL) chỉ tồn tại trong biến môi trường backend, không bao giờ trong code mobile.
- **MUST** định nghĩa types trong `types/` và tái sử dụng; không định nghĩa inline type phức tạp trong component.
- **DO NOT** import trực tiếp từ `backend/` trong `mobile/` và ngược lại.
- **DO NOT** để business logic (tính tổng thu/chi, lọc giao dịch) trong screen component.
- **DO NOT** dùng `any` trong TypeScript trừ khi có comment giải thích rõ lý do và phạm vi.

## Shared Types

- Nếu mobile và backend cùng dùng một type (ví dụ `Transaction`, `BankAccount`), đặt vào package `shared/` hoặc `packages/types/` và import ở cả hai bên.
- Không copy-paste type giữa hai bên — gây mất đồng bộ.

## Environment & Config

- Mobile: dùng Expo Constants / `expo-constants` để đọc `EXPO_PUBLIC_*` vars (chỉ URL backend, không secret).
- Backend: dùng `dotenv` + validation schema (ví dụ `zod`) để kiểm tra env vars bắt buộc khi khởi động.
- **MUST** có file `.env.example` mô tả mọi biến cần thiết; không commit `.env` thật.

## API Contract

- Backend expose RESTful API; version prefix `/api/v1/`.
- Mọi response lỗi phải có format thống nhất: `{ error: { code, message, details? } }`.
- Mọi response thành công list: `{ data: T[], meta: { total, page, limit } }`.
- **MUST** document endpoint mới bằng JSDoc hoặc OpenAPI comment ngay khi tạo.
