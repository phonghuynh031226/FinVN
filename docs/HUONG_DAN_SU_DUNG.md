# 📖 HƯỚNG DẪN SỬ DỤNG ỨNG DỤNG QUẢN LÝ TÀI CHÍNH CÁ NHÂN

Hệ thống hỗ trợ quản lý chi tiêu, dòng tiền và tự động đồng bộ số dư & lịch sử giao dịch thật 100% từ 3 ngân hàng lớn tại Việt Nam: **BIDV**, **Vietcombank (VCB)** và **MB Bank (MB)**.

---

## I. TRUY CẬP VÀ KHỞI ĐỘNG HỆ THỐNG

### 1. Sử dụng trực tiếp trên Cloud (Khuyên dùng)
Bạn không cần cài đặt bất kỳ công cụ nào trên máy, truy cập trực tiếp website đã triển khai:
* **Địa chỉ ứng dụng**: [`https://fin-vn.vercel.app`](https://fin-vn.vercel.app)
* Đăng nhập an toàn bằng tài khoản Google (OAuth 2.0). Dữ liệu được đồng bộ và lưu trữ bảo mật trên cơ sở dữ liệu Supabase PostgreSQL.

### 2. Khởi động cục bộ (Môi trường phát triển Localhost)
Nếu muốn phát triển hoặc chạy thử dưới máy cá nhân:
1. **Khởi động Backend Bank Gateway**:
   ```powershell
   cd "d:\DU AN CA NHAN\Quản lý tài chính\backend"
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8787 --reload
   ```
   - Kiểm tra trạng thái: Mở trình duyệt truy cập `http://localhost:8787/health` -> Nhận phản hồi `{"status": "ok", "service": "bank-gateway"}`.

2. **Khởi động Web Frontend**:
   ```powershell
   cd "d:\DU AN CA NHAN\Quản lý tài chính\frontend\web"
   npm run dev
   ```
   - Truy cập giao diện ứng dụng tại: `http://localhost:5173`.

---

## II. HƯỚNG DẪN KẾT NỐI TÀI KHOẢN NGÂN HÀNG

Bấm nút **"Thêm tài khoản"** ở góc phải thanh Header hoặc trên màn hình Quản lý Tài khoản để mở popup liên kết:

### 1. Ngân hàng BIDV (SmartBanking)
- **Quy trình kết nối**:
  1. Chọn ngân hàng **BIDV — Ngân hàng TMCP Đầu tư và Phát triển Việt Nam**.
  2. Nhập **Số điện thoại** đăng ký SmartBanking và **Mật khẩu**.
  3. Chọn màu sắc thẻ hiển thị theo sở thích -> Bấm **"Kết nối tài khoản"**.
- **Xác thực 1 chạm trên điện thoại (Lần đầu tiên)**:
  - Hệ thống AI sẽ tự động giải mã Captcha và gửi yêu cầu đăng nhập lên BIDV.
  - Khi BIDV phát hiện kết nối từ thiết bị mới, ứng dụng SmartBanking trên điện thoại của bạn sẽ nhận được thông báo cấp quyền đăng nhập thiết bị.
  - Bạn chỉ cần **mở app BIDV trên điện thoại và bấm "Xác nhận / Đồng ý"**.
  - Hệ thống backend sẽ tự động bắt lấy tín hiệu xác nhận thành công, lưu lại định danh thiết bị tin cậy (`browser_id` & `client_id`) vào database và bộ nhớ.
- **Lợi ích**: Từ các lần kết nối và đồng bộ tiếp theo, bạn **không cần mở điện thoại nữa**, hệ thống sẽ tự động đăng nhập và cập nhật số dư trong 0.2 giây!

---

### 2. Ngân hàng Vietcombank (VCB DigiBank)
- **Chuẩn bị (Bắt buộc làm 1 lần duy nhất trên điện thoại)**:
  1. Mở ứng dụng **VCB DigiBank** trên điện thoại.
  2. Vào mục **Cài đặt** ➔ **Quản lý đăng nhập kênh**.
  3. Gạt bật tính năng: **"Cài đặt đăng nhập VCB DigiBank trên WEB"**.
- **Quy trình kết nối**:
  1. Chọn ngân hàng **Vietcombank**.
  2. Nhập **Số điện thoại** đăng ký DigiBank và **Mật khẩu**.
  3. Bấm **"Kết nối tài khoản"**.
  4. Hệ thống đã được tích hợp sẵn định danh thiết bị tin cậy (**Browser ID**) chuẩn của Vietcombank. Quá trình kết nối diễn ra tự động hoàn toàn, giải mã Captcha và lấy số dư ngay lập tức mà **không cần nhập mã SMS OTP**.
  5. Sau khi kết nối thành công, thông tin đăng nhập được mã hóa AES-256-GCM lưu trữ an toàn trong cơ sở dữ liệu để phục vụ tính năng tự động đồng bộ số dư.

---

### 3. Ngân hàng MB Bank (Ngân hàng Quân Đội)
- **Quy trình kết nối**:
  1. Chọn ngân hàng **MBBank**.
  2. Nhập **Tên đăng nhập** (SĐT hoặc CCCD) và **Mật khẩu** App MBBank.
  3. Bấm **"Kết nối tài khoản"**. Hệ thống tự động giải Captcha và kết nối lấy số dư ngay lập tức mà không yêu cầu thêm thao tác nào.

---

## III. CƠ CHẾ ĐỒNG BỘ GIAO DỊCH (AUTO-SYNC 100%)

Hệ thống được thiết kế theo chuẩn **Zero-Click Auto-Sync** để người dùng không phải thao tác thủ công:

### 1. Tự động đồng bộ khi mở Web
- Mỗi khi bạn mở hoặc tải lại trang web `http://localhost:5173`, hệ thống sẽ tự động quét ngầm tất cả tài khoản ngân hàng đã lưu (BIDV, VCB, MB Bank), cập nhật số dư mới nhất và nạp các giao dịch mới phát sinh vào sổ thu chi.
- **Cơ chế Cooldown an toàn 15 phút**: Nếu tài khoản vừa mới được đồng bộ trong vòng 15 phút qua, hệ thống sẽ bỏ qua để tránh gửi quá nhiều request liên tục lên ngân hàng.

### 2. Nút "⚡ Tự động đồng bộ ngay" trên Header
- Nằm ở góc trên bên phải thanh Header.
- Bấm nút này để kích hoạt đồng bộ toàn bộ tài khoản ngay lập tức (bỏ qua Cooldown 15 phút) khi bạn vừa chuyển khoản hoặc nhận tiền và muốn thấy số dư cập nhật tức thì.

### 3. Đồng bộ tùy chọn ngày trong popup tài khoản
- Tại từng thẻ tài khoản ngân hàng, bấm nút icon **Đồng bộ** để mở popup đồng bộ chuyên sâu:
  - Chọn khoảng ngày: **7 ngày**, **15 ngày**, **30 ngày**, **90 ngày**, **180 ngày**, hoặc **365 ngày (1 năm)**.
  - Với các khoảng thời gian dài (>30 ngày), hệ thống tự động chia nhỏ thành các đợt 30 ngày tuần tự để đảm bảo ngân hàng không chặn tải và lấy trọn vẹn 100% lịch sử giao dịch.

---

## IV. XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

### 1. Sự cố với BIDV SmartBanking
- **Quá thời gian chờ xác nhận (120s)**: Hãy đảm bảo điện thoại của bạn có kết nối mạng Internet để nhận được thông báo đẩy từ app BIDV SmartBanking. Nếu không thấy thông báo, hãy mở trực tiếp app BIDV trên điện thoại trong khi đang bấm kết nối trên web.
- **Sai tên đăng nhập hoặc mật khẩu**: Kiểm tra lại số điện thoại và mật khẩu đăng nhập SmartBanking (lưu ý chữ hoa/thường).

### 2. Sự cố với Vietcombank
- **Lỗi 019 / Chưa mở login web**: Vào app VCB trên điện thoại -> Cài đặt -> Quản lý đăng nhập kênh -> Bật "Đăng nhập VCB DigiBank trên WEB".
- **Hết hạn mã OTP**: Nhập mã OTP trong vòng 90 giây kể từ lúc nhận được tin nhắn SMS. Nếu hết thời gian, bấm nút **"Quay lại"** và bấm kết nối lại để ngân hàng gửi mã mới.

### 3. Sự cố Backend & Kết nối mạng
- **Báo lỗi "Không thể kết nối máy chủ ngân hàng"**:
  1. Kiểm tra cửa sổ terminal chạy backend xem có bị tắt không.
  2. Mở trình duyệt vào `http://localhost:8787/health` để kiểm tra backend còn hoạt động không.
  3. Đảm bảo file `frontend/web/.env.local` có cấu hình: `VITE_BANK_CONNECTOR_URL=http://localhost:8787`.

---

## V. AN TOÀN & BẢO MẬT DỮ LIỆU

- Mọi thông tin đăng nhập phục vụ tự động đồng bộ được lưu trữ an toàn trong `localStorage` trên trình duyệt cá nhân của bạn, không gửi sang bất kỳ bên thứ 3 nào.
- Phiên đăng nhập ngân hàng được bảo vệ bằng bộ nhớ đệm RAM tự động hủy sau 5 phút (`TTL = 300s`).
- Thiết bị tin cậy (`browser_id`) được băm mật mã và quản lý độc lập theo từng tài khoản.
