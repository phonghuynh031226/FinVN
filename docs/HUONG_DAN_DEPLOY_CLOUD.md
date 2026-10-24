# 🚀 HƯỚNG DẪN TRIỂN KHAI FINVN LÊN CLOUD (FULL-STACK DEPLOYMENT)

Tài liệu này ghi lại chi tiết toàn bộ quy trình triển khai thực tế hệ thống **FinVN** lên môi trường đám mây (Cloud) hoàn toàn **miễn phí 100%**, đảm bảo bảo mật, hiệu năng cao và tự động hóa CI/CD khi cập nhật mã nguồn qua GitHub.

---

## 🏛️ 1. Kiến Trúc Triển Khai (Cloud Architecture)

| Tầng (Layer) | Nền tảng Cloud | Địa chỉ / Domain Production | Vai trò |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | `https://fin-vn.vercel.app` | Giao diện React + Vite (Zero-scroll, Dark/Light mode) |
| **Backend** | **Render.com** | `https://finvn-4jk6.onrender.com` | FastAPI API Gateway, kết nối ngân hàng & xử lý CAPTCHA |
| **Database** | **Supabase** | `db.atzhpaouaqearsrkvesv.supabase.co` | PostgreSQL lưu trữ User, tài khoản ngân hàng và giao dịch |
| **Auth** | **Google Cloud** | OAuth 2.0 Web Client | Đăng nhập tài khoản Google an toàn, cấp Session & CSRF |

---

## 📋 2. Quy Trình Triển Khai Chi Tiết (Từng Bước)

### BƯỚC 1: Triển khai Frontend lên Vercel

1. Đăng nhập [Vercel.com](https://vercel.com) bằng tài khoản GitHub chứa repository `FinVN`.
2. Bấm **Add New...** -> **Project** -> Chọn repository **`phonghuynh031226/FinVN`** -> Bấm **Import**.
3. **Cấu hình dự án (Project Configuration)**:
   * **Project Name**: `fin-vn`
   * **Root Directory**: Bấm nút **`Edit`** -> Chọn thư mục **`frontend/web`** *(Bắt buộc vì frontend nằm trong thư mục con)*.
   * **Framework Preset**: Vercel tự động nhận diện là **`Vite`**.
   * **Build and Output Settings**: Giữ nguyên mặc định (`npm run build` và `dist`).
4. **Cấu hình biến môi trường (Environment Variables)**:
   * Thêm 2 biến sau:
     * `VITE_GOOGLE_CLIENT_ID`: `48951440016-c9ptnm4iermt0is06hi75uag28vh2750.apps.googleusercontent.com`
     * `VITE_BANK_CONNECTOR_URL`: Tạm thời để `http://localhost:8787` (hoặc URL backend Render sau Bước 3).
5. Bấm nút **`Deploy`**. Sau ~1 phút, website sẽ hoạt động tại domain: `https://fin-vn.vercel.app`.

---

### BƯỚC 2: Cấu hình Google Cloud Console OAuth

1. Truy cập [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Nhấp vào tên **Web Client ID** của dự án.
3. Thêm domain Vercel vào 2 mục:
   * **Authorized JavaScript origins**:
     * `https://fin-vn.vercel.app`
     * `http://localhost:5173` *(cho môi trường dev)*
   * **Authorized redirect URIs**:
     * `https://fin-vn.vercel.app`
     * `http://localhost:5173`
4. Bấm **Save** (Lưu lại).

---

### BƯỚC 3: Khởi tạo Cơ sở Dữ liệu PostgreSQL trên Supabase

1. Truy cập [Supabase.com](https://supabase.com) -> Đăng nhập bằng GitHub -> Bấm **New Project**.
2. **Thiết lập dự án**:
   * **Name**: `finvn-db`
   * **Database Password**: Bấm **`Generate a password`** -> **Copy lưu mật khẩu này vào Notepad**.
   * **Region**: Chọn **`Asia-Pacific`** (hoặc Singapore/Seoul).
   * Bấm **Create new project** (chờ 1-2 phút).
3. **Chạy Migration tạo bảng dữ liệu**:
   * Nhìn vào thanh menu bên trái, bấm vào icon **`>_` (SQL Editor)**.
   * Bấm **`New query`**.
   * Mở file [`sql/init_postgres.sql`](file:///d:/DU%20AN%20CA%20NHAN/Qu%E1%BA%A3n%20l%C3%BD%20t%C3%A0i%20ch%C3%ADnh/sql/init_postgres.sql) trong dự án, copy toàn bộ nội dung dán vào ô soạn thảo.
   * Bấm nút màu xanh **`Run`**. Khi cửa sổ cảnh báo hiện lên, chọn **`Run without RLS`** *(để Backend Python có quyền quản trị trực tiếp)*.
   * Kết quả báo `Success. No rows returned` là đã khởi tạo thành công 5 bảng: `users`, `user_sessions`, `bank_accounts`, `bank_credentials`, `transactions`.
4. **Lấy chuỗi kết nối (Connection String)**:
   * Bấm nút màu xanh **`Connect`** ở thanh menu trên cùng.
   * Chọn tab **`Direct Connection string`** (hoặc **`Session pooler`**).
   * Copy chuỗi kết nối:
     ```text
     postgresql://postgres:[YOUR-PASSWORD]@db.atzhpaouaqearsrkvesv.supabase.co:5432/postgres
     ```
   * Thay `[YOUR-PASSWORD]` bằng mật khẩu đã tạo ở trên.

---

### BƯỚC 4: Triển khai Backend FastAPI lên Render.com

1. Truy cập [Render.com](https://dashboard.render.com) -> Đăng nhập bằng tài khoản GitHub.
2. Bấm **`New +`** -> Chọn **`Web Service`** -> Chọn repository **`phonghuynh031226/FinVN`**.
3. **Cấu hình thông số dịch vụ**:
   * **Name**: `finvn-api` (hoặc `FinVN`)
   * **Language**: **`Docker`** *(Render tự động nhận diện Dockerfile)*
   * **Branch**: `main`
   * **Region**: `Singapore (Southeast Asia)` hoặc `Oregon`
   * **Root Directory**: Để trống
   * ⚠️ **Dockerfile Path**: Điền **`backend/Dockerfile`**
   * ⚠️ **Compute Plan**: Click chọn gói **`$0 / month  Free`** *(mặc định Render chọn gói $7, hãy đổi sang Free)*
4. **Khai báo biến môi trường (Environment Variables)**:
   * Kéo xuống mục **Environment Variables**, bấm **`+ Add Environment Variable`** và điền 6 biến:

   | Key | Value | Mô tả |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql://postgres:[MẬT_KHẨU]@db.atzhpaouaqearsrkvesv.supabase.co:5432/postgres` | Chuỗi kết nối Supabase ở Bước 3 |
   | `APP_ENV` | `production` | Kích hoạt cờ bảo mật Cookie HTTPS |
   | `WEB_ORIGIN` | `https://fin-vn.vercel.app` | Cho phép CORS từ domain Frontend Vercel |
   | `GOOGLE_CLIENT_ID` | `48951440016-c9ptnm4iermt0is06hi75uag28vh2750.apps.googleusercontent.com` | Client ID xác thực token Google |
   | `BANK_CREDENTIALS_KEYRING` | `v1:y8-NAQyA2sBN7MMhqdIbsGFhXcwzrnDC4l3uqUJUXh0=` | Khóa AES 32-bytes mã hóa tài khoản ngân hàng |
   | `BANK_CREDENTIALS_ACTIVE_KEY` | `v1` | Tên phiên bản khóa đang hoạt động |

5. Bấm nút màu đen **`Deploy web service`**. Chờ Render build container (khoảng 1-2 phút).
6. Khi hoàn tất, Render báo `Deploy succeeded | Live` và cấp URL:
   * **Backend URL**: `https://finvn-4jk6.onrender.com`
   * **Kiểm tra trạng thái**: Mở `https://finvn-4jk6.onrender.com/health` -> Phản hồi `{"status":"ok","service":"bank-gateway"}`.

---

### BƯỚC 5: Kết Nối Hoàn Chỉnh Frontend Vercel với Backend Render

1. Quay lại trang quản trị dự án trên Vercel: [`https://vercel.com/huynh-thanh-phong/fin-vn`](https://vercel.com/huynh-thanh-phong/fin-vn).
2. Vào **Settings** -> **Environment Variables**.
3. Cập nhật biến **`VITE_BANK_CONNECTOR_URL`**:
   * **Value**: `https://finvn-4jk6.onrender.com`
   * Bấm **Save**.
4. Chuyển sang tab **Deployments** trên Vercel:
   * Bấm vào nút **3 chấm `...`** bên cạnh bản build mới nhất -> Chọn **Redeploy**.
5. Sau 30 giây, quá trình kết nối hoàn tất 100%!

---

## 🔍 3. Kiểm Thử Hệ Thống Sau Triển Khai (Verification Checklist)

- [x] Truy cập `https://fin-vn.vercel.app` -> Hiển thị trang Chào mừng sang trọng, vừa khít 100% màn hình, không có thanh cuộn thừa.
- [x] Bấm nút **Đăng nhập với Google** -> Đăng nhập thành công, điều hướng vào Dashboard.
- [x] Backend kết nối ổn định với Supabase PostgreSQL (`pooler.supabase.com:5432`).
- [x] Kiểm tra `/health` trên Render phản hồi `{"status":"ok"}`.
- [x] Dữ liệu tài khoản ngân hàng và lịch sử giao dịch đồng bộ chính xác và bảo mật.

---

## 🔄 4. Quy Trình Cập Nhật Mã Nguồn (CI/CD Workflow)

Kể từ bây giờ, mỗi khi bạn chỉnh sửa mã nguồn và thực hiện lệnh:
```bash
git add .
git commit -m "feat/fix: mô tả thay đổi"
git push origin main
```
* **Vercel** sẽ tự động bắt sự kiện commit và build lại Frontend trong 30 giây.
* **Render** sẽ tự động bắt sự kiện commit và build lại container Docker Backend trong 1-2 phút.
* Toàn bộ quy trình cập nhật hoàn toàn tự động mà không cần can thiệp thủ công!
