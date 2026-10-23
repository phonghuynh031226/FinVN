# Data, Schema & Testing Rules — Cơ sở dữ liệu, Migration và Kiểm thử

## Schema Database (PostgreSQL)

### Bảng `users`
```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Bảng `bank_accounts`
```sql
CREATE TABLE bank_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name       TEXT NOT NULL CHECK (char_length(bank_name) BETWEEN 1 AND 100),
  display_name    TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 50),
  account_number  TEXT NOT NULL,                  -- lưu đầy đủ, che khi trả API
  initial_balance BIGINT NOT NULL DEFAULT 0,      -- VND, đơn vị đồng
  current_balance BIGINT NOT NULL DEFAULT 0,
  deleted_at      TIMESTAMPTZ,                    -- soft delete
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_number)
);
```

### Bảng `transactions`
```sql
CREATE TABLE transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  account_id       UUID NOT NULL REFERENCES bank_accounts(id),
  amount           BIGINT NOT NULL CHECK (amount > 0),   -- VND, luôn dương
  type             TEXT NOT NULL CHECK (type IN ('INCOME','EXPENSE','TRANSFER')),
  category         TEXT,
  user_category    TEXT,                   -- phân loại do user sửa
  description      TEXT,                  -- mô tả gốc từ ngân hàng
  user_note        TEXT,                  -- ghi chú do user thêm
  transaction_date TIMESTAMPTZ NOT NULL,
  source           TEXT NOT NULL DEFAULT 'MANUAL',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_reference)       -- chống giao dịch trùng theo nguồn
);
```

## Quy tắc Migration

- **MUST** đặt migration file theo thứ tự sequential.
- **DO NOT** xóa hoặc sửa migration đã chạy trên production; tạo migration mới để sửa.
- Mỗi migration phải có section `-- UP` và `-- DOWN` (rollback).
- **MUST** chạy migration trong transaction; rollback tự động nếu có lỗi.
- Thêm index cho các truy vấn thường dùng:
  ```sql
  CREATE INDEX idx_transactions_user_date ON transactions (user_id, transaction_date DESC);
  CREATE INDEX idx_transactions_account   ON transactions (account_id, transaction_date DESC);
  CREATE INDEX idx_bank_accounts_user     ON bank_accounts (user_id) WHERE deleted_at IS NULL;
  ```

## Đồng bộ giao dịch ngân hàng

- Chuẩn hóa giao dịch từ bank connector và tránh tạo bản ghi trùng theo mã tham chiếu nếu nguồn ngân hàng cung cấp.
- Giữ nguyên nội dung và dữ liệu gốc nhận từ ngân hàng; phân loại/ghi chú do người dùng sửa phải lưu riêng.
- Cập nhật số dư tài khoản nhất quán sau mỗi giao dịch mới.

## Yêu cầu kiểm thử (Testing)

### Phạm vi test bắt buộc

**1. Finance calculations (unit tests)**
- Tính `totalIncome`, `totalExpense`, `netAmount` với dữ liệu fixture cố định.
- Lọc đúng theo khoảng thời gian (tháng này, tháng trước, 7 ngày, tùy chỉnh).
- Lọc đúng theo tài khoản (một tài khoản, tất cả tài khoản).
- `currentBalance` không bị cộng vào `totalIncome`/`totalExpense`.
- Tổng số dư nhiều tài khoản = SUM từng tài khoản (không nhân đôi).

**2. Validation (unit tests)**
- Tên ngân hàng/tên hiển thị trống → lỗi validation.
- `amount` = 0, âm, hoặc vượt giới hạn → lỗi.
- `startDate > endDate` → lỗi.
- `accountId` không thuộc user → lỗi 403.
- Thiếu field bắt buộc → lỗi 400 với thông báo tiếng Việt.

**3. Account deletion (integration tests)**
- Xóa tài khoản (soft delete) → giao dịch giữ nguyên, `deletedAt` được set.
- Query tổng quan không tính tài khoản đã xóa vào `currentBalance`.
- Query lịch sử vẫn hiển thị giao dịch của tài khoản đã xóa (với label "Tài khoản đã xóa").

### Quy tắc viết test

- **MUST** dùng test fixtures; không gọi external API trong unit test.
- Tên test phải mô tả hành vi: `"should not count deleted account balance in total"`.
- Coverage tối thiểu cho `services/` và `utils/`: 80% line coverage.
- **DO NOT** viết test chỉ kiểm tra implementation detail; test hành vi (behavior).
- Chạy `tsc --noEmit`, `eslint`, và toàn bộ test suite trước khi merge PR; sửa mọi lỗi phát hiện được.
