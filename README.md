# Ứng Dụng Quản Lý Tài Chính Cá Nhân (Personal Finance App)

Ứng dụng web quản lý tài chính cá nhân dành cho người Việt, được xây dựng bằng **React**, **TypeScript** và **Supabase PostgreSQL**, hỗ trợ đồng bộ giao dịch ngân hàng qua bank gateway.

---

## 🌟 Tính Năng Nổi Bật

### 1. Quản lý Tài khoản Ngân hàng
- Thêm nhiều tài khoản ngân hàng (Vietcombank, Techcombank, MBBank, ACB, BIDV...).
- Đặt tên gợi nhớ cá nhân hóa (ví dụ: "Nhận lương", "Tiền tiết kiệm", "Quỹ sinh hoạt").
- Che một phần số tài khoản khi hiển thị (chỉ hiện 4 số cuối, ví dụ: `****8888`).
- Chỉnh sửa tên hiển thị và **Xóa tài khoản an toàn (Soft delete)**: Xác nhận trước khi xóa, bảo toàn toàn bộ lịch sử giao dịch để không làm sai số liệu báo cáo tài chính hoặc tạo giao dịch mồ côi.

### 2. Tổng quan Tài chính & Bộ lọc Trực quan
- Xem tổng hợp tất cả tài khoản hoặc lọc riêng từng tài khoản.
- Lọc theo kỳ thời gian: **Tháng này**, **Tháng trước**, **7 ngày gần nhất**, hoặc khoảng ngày tùy chỉnh.
- **Phân biệt rõ ràng**:
  - `Tổng số dư hiện tại`: Số dư thực tế hiện có trong các tài khoản.
  - `Tiền vào (+)`: Tổng thu nhập phát sinh trong kỳ lọc.
  - `Tiền ra (-)`: Tổng chi tiêu phát sinh trong kỳ lọc.
  - `Chênh lệch`: Thu trừ chi trong kỳ.
  - *Tuyệt đối không cộng số dư hiện tại vào tổng giao dịch*.

### 3. Sổ Giao dịch & Quản lý Thu/Chi
- Danh sách giao dịch theo trình tự thời gian, hiển thị rõ ràng ngày giờ theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`).
- Tìm kiếm tức thời theo nội dung giao dịch, danh mục hoặc ghi chú.
- Lọc nhanh theo loại: *Tất cả*, *Tiền vào (+)*, *Tiền ra (-)*.
- Cho phép người dùng chỉnh sửa phân loại và ghi chú cá nhân mà **bảo toàn nguyên vẹn dữ liệu gốc** từ ngân hàng (số tiền, ngày giờ, nội dung chuyển khoản gốc).
- Thêm giao dịch thủ công nhanh với giao diện tối ưu cho người mới.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 🌐 1. Chạy Web App (ReactJS + Vite)
Ứng dụng Web hoàn chỉnh viết bằng ReactJS + TypeScript và giao diện Fintech hiện đại:
```bash
cd frontend/web
npm install
npm run dev
```
Truy cập: `http://localhost:5173/`

---

## 🔒 Cấu hình Supabase và Bank Connector

### 1. Biến môi trường

`.env.example` ở thư mục gốc ghi lại các biến mẫu cho bank gateway. Không đưa khóa bí mật vào biến môi trường của web.

Để chạy web, sao chép `frontend/web/.env.example` thành `frontend/web/.env.local`. Đặt `VITE_BANK_CONNECTOR_URL=http://localhost:8787`; nếu dùng Supabase, thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.

### 2. Thiết lập Database & Migration
Các file SQL migration nằm trong thư mục `supabase/migrations/`:
- `001_init_schema.sql`: Khởi tạo các bảng tài khoản, giao dịch và hồ sơ, đồng thời thiết lập Row Level Security (RLS).
- `002_indexes.sql`: Tạo indexes tối ưu tốc độ truy vấn và Database Trigger tự động cập nhật số dư tài khoản khi có giao dịch.


---

