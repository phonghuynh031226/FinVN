# Ứng Dụng Quản Lý Tài Chính Cá Nhân (Personal Finance App)

Ứng dụng mobile quản lý tài chính cá nhân dành cho người Việt, được xây dựng bằng **React Native (Expo SDK 58)**, **TypeScript Strict Mode** và **Supabase PostgreSQL**, hỗ trợ đồng bộ tự động giao dịch ngân hàng qua **SePay Webhook**.

---

## 🌟 Tính Năng Nổi Bật

### 1. Quản lý Tài khoản Ngân hàng
- Thêm nhiều tài khoản ngân hàng (Vietcombank, Techcombank, MBBank, ACB, BIDV...).
- Đặt tên gợi nhớ cá nhân hóa (ví dụ: "Nhận lương", "Tiền tiết kiệm", "Quỹ sinh hoạt").
- Che một phần số tài khoản khi hiển thị (chỉ hiện 4 số cuối, ví dụ: `****8888`).
- Theo dõi trạng thái kết nối SePay: *Chưa kết nối*, *Đang kết nối*, *Đã kết nối*, *Lỗi*.
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

### 4. Tích hợp SePay Webhook An toàn
- **Kiến trúc bảo mật cao**: Mobile app **không** lưu trữ bất kỳ API Key, Webhook Secret hay thông tin đăng nhập ngân hàng nào.
- Toàn bộ webhook từ SePay được xử lý tại Backend (**Supabase Edge Functions**) với xác thực qua `X-Secret-Key`.
- **Cơ chế Idempotency**: Dùng mã tham chiếu ngân hàng (`referenceCode` / `source_reference`) để loại bỏ hoàn toàn nguy cơ giao dịch trùng lặp khi webhook gửi lại.

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

### 📱 2. Chạy Mobile App (React Native Expo)
```bash
cd frontend/mobile
npm install
npm start
```
- Dùng ứng dụng **Expo Go** quét mã QR trên màn hình terminal để mở app trên điện thoại Android/iOS.


---

## 🔒 Cấu Hình SePay & Supabase (Backend)

### 1. Biến Môi trường (`.env`)
Sao chép `.env.example` thành `.env`:
```bash
# Supabase Configuration (Dùng trên Mobile)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# SePay Secret (Chỉ cấu hình tại Backend / Supabase Edge Functions)
SEPAY_WEBHOOK_SECRET=your_sepay_secret_key
SEPAY_API_KEY=your_sepay_api_token
```

*Lưu ý: Nếu chưa cấu hình Supabase, ứng dụng sẽ tự động chạy ở chế độ **Bộ nhớ cục bộ Demo** với dữ liệu mẫu sẵn có để bạn có thể trải nghiệm toàn bộ tính năng ngay lập tức.*

### 2. Thiết lập Database & Migration
Các file SQL migration nằm trong thư mục `supabase/migrations/`:
- `001_init_schema.sql`: Khởi tạo bảng `profiles`, `bank_accounts`, `transactions`, `webhook_events` và thiết lập Row Level Security (RLS).
- `002_indexes.sql`: Tạo indexes tối ưu tốc độ truy vấn và Database Trigger tự động cập nhật số dư tài khoản khi có giao dịch.

### 3. Cấu hình Webhook trên SePay Dashboard
1. Đăng nhập vào [my.sepay.vn](https://my.sepay.vn) và thêm tài khoản ngân hàng của bạn.
2. Vào mục **Webhooks** ➔ **Thêm Webhook**.
3. Điền URL: `https://[your-project-id].supabase.co/functions/v1/sepay-webhook`.
4. Chọn phương thức xác thực `API Key / Secret Token` và điền giá trị tương ứng với `SEPAY_WEBHOOK_SECRET`.

---

## 🧪 Kiểm Thử Tự Động (Testing)

Chạy bộ kiểm thử tự động với Jest:
```bash
cd mobile
npm test
```

Kiểm tra kiểu dữ liệu với TypeScript Strict:
```bash
cd mobile
npm run type-check
```
