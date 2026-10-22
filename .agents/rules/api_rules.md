# NGUYÊN TẮC VÀ QUY TRÌNH PHÁT TRIỂN DỰ ÁN (PROJECT DEVELOPMENT RULES)

Tài liệu này là quy chuẩn bắt buộc agent AI phải tuân thủ nghiêm ngặt trong mọi phiên làm việc tiếp theo của dự án **Quản lý tài chính cá nhân**.

---

## 1. NGUYÊN TẮC HOẠT ĐỘNG BẮT BUỘC (CORE PRINCIPLES)

1. **Phân tích trước khi hành động**:
   - Luôn đọc và phân tích kỹ tài liệu, code hiện hữu trước khi viết code mới.
   - Không tự ý xóa các file mã nguồn cốt lõi; dọn dẹp file thừa (mock, duplicate) phải xác minh tính an toàn.
2. **Quy trình 2 pha khi làm tính năng lớn**:
   - **Pha 1**: Đọc tài liệu, lên kế hoạch chi tiết các file cần sửa/tạo mới, trình người dùng duyệt.
   - **Pha 2**: Khi người dùng đồng ý mới bắt tay vào code.
3. **Bảo mật thông tin người dùng (Security & Privacy)**:
   - Tuyệt đối KHÔNG in (log) mật khẩu, OTP, access token nhạy cảm ra console hoặc lưu file bừa bãi.
   - Các mã định danh quan trọng (như `browser_id`, `access_token`) phải được lưu vào file cấu hình riêng biệt (`.env`, `vcb_browser_id.txt`), không hardcode trong repo public.
4. **Kiểm thử dòng lệnh trước khi tích hợp Web (Terminal First)**:
   - Mọi API bên thứ 3 (như Ngân hàng MB, VCB, BIDV...) PHẢI được kiểm thử thành công qua script độc lập (như `test_vcb.py`, `test_mb.py`) trước khi đấu nối vào Web.
5. **Ghi chép lịch sử công việc (Mandatory Worklog Tracking)**:
   - Sau mỗi yêu cầu/tính năng người dùng giao, BẮT BUỘC phải cập nhật ngay vào file [`DEV_HISTORY.md`](file:///d:/DU%20AN%20CA%20NHAN/Qu%E1%BA%A3n%20l%C3%BD%20t%C3%A0i%20ch%C3%ADnh/DEV_HISTORY.md):
     + Yêu cầu của người dùng.
     + Công việc đã thực hiện.
     + File đã tạo mới / chỉnh sửa.
     + Tên hàm / component / API cụ thể.
     + Kết quả kiểm thử thực tế.

---

## 2. QUY TRÌNH KHI TÍCH HỢP API NGÂN HÀNG (BANK API WORKFLOW)

Khi tích hợp bất kỳ ngân hàng nào (VCB, MBBank, BIDV...), agent phải tuân thủ 5 bước chuẩn hóa:

### Bước 1: Nhận diện kiến trúc xác thực của Bank
- Kiểm tra cơ chế mã hóa (RSA Public Key, AES, CRC, v.v.).
- Kiểm tra cơ chế định danh thiết bị (`browserId`, `deviceId`, User-Agent, Fingerprint).
- Kiểm tra cơ chế Captcha (dạng ảnh base64, token).

### Bước 2: Xử lý Captcha Offline & Độc lập
- Ưu tiên giải pháp OCR chạy Offline 100% trên máy nội bộ (NumPy / ONNX / OpenCV) để không phụ thuộc server bên ngoài (tránh lỗi 206 HuggingFace sleeping, mạng chập chờn).
- Tích hợp cơ chế tự động thử lại (Retry loop) tối đa 3-5 lần nếu mã Captcha giải chưa khớp (`0111`).

### Bước 3: Định danh thiết bị & Lưu trữ Session
- Vietcombank: Sử dụng `browserId` đã được kích hoạt OTP trên hệ thống VCB (lưu tại `backend/vcb_browser_id.txt`).
- Backend phải LUÔN ưu tiên nạp mã `browserId` đã được xác thực từ file lưu trữ nội bộ, tránh để phía Frontend client đo sai kích thước màn hình rồi gửi đè lên làm hỏng session.

### Bước 4: Chuẩn hóa dữ liệu đầu ra (Normalization)
Mọi Adapter ngân hàng phải trả về đúng cấu trúc chuẩn hóa `NormalizedTransaction` và `AccountSnapshot`:
- `amount`: Số nguyên dương (VND).
- `type`: `"INCOME"` (Thu nhập, khi CD = `+` hoặc `C`) hoặc `"EXPENSE"` (Chi tiêu, khi CD = `-` hoặc `D`).
- `transaction_date`: Định dạng chuỗi ngày tháng chuẩn.
- `description`: Nội dung giao dịch.
- `reference`: Mã tham chiếu/số bút toán.
- `raw_data`: Toàn bộ JSON gốc của ngân hàng để đối soát.

### Bước 5: Kiểm thử và Kết nối Web
- Viết script kiểm thử `test_<bank>.py` nhận thông tin từ dòng lệnh.
- Đảm bảo Backend FastAPI trả về `HTTP 200 OK` cho cả 2 endpoint:
  + `POST /api/banks/{bank}/connect` (Lấy số dư thực tế).
  + `POST /api/banks/{bank}/transactions` (Lấy lịch sử giao dịch).
- Đấu nối giao diện Web Modal: Tự động kết nối và đồng bộ vào cơ sở dữ liệu.

---

## 3. CÁCH LÀM KHI GẶP LỖI THIẾT BỊ / BROWSER ID
- Mã lỗi `20231` (VCB): Trình duyệt chưa xác thực thiết bị mới bằng SMS OTP.
- Khi cần lấy thông số phiên làm việc đã xác thực trên trình duyệt của người dùng:
  + Hướng dẫn người dùng mở Chrome DevTools Console.
  + Gõ `allow pasting` -> gõ `sessionStorage`.
  + Sử dụng lệnh `copy(JSON.stringify(sessionStorage))` để lấy toàn bộ dữ liệu phiên.
  + Trích xuất mã 32 ký tự tại key hash của `sessionStorage` để lưu vào `vcb_browser_id.txt`.
