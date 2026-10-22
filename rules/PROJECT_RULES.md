# SỔ TAY NGUYÊN TẮC VÀ QUY TRÌNH KỸ THUẬT (PROJECT RULES & GUIDELINES)

Tài liệu này tổng hợp toàn bộ các nguyên tắc, prompt chuẩn và quy trình thao tác khi làm việc với API ngân hàng và hệ thống trong dự án **Quản lý tài chính cá nhân**.

---

## 🎯 1. NGUYÊN TẮC CỐT LÕI (CORE PRINCIPLES)

1. **Lập kế hoạch trước khi code (Plan First)**:
   - Khi nhận yêu cầu mới, phân tích tài liệu và cấu trúc file hiện có.
   - Trình bày giải pháp gồm: *File tạo mới*, *File sửa đổi*, *Logic hàm* để người dùng xác nhận trước khi sửa code.
2. **Bảo mật tuyệt đối (Zero Leaks)**:
   - Không in mật khẩu, mã OTP, chữ ký số hoặc private key ra màn hình terminal / log.
   - Thông tin nhạy cảm lưu trong biến môi trường hoặc file nội bộ (`vcb_browser_id.txt`), không push lên kho code công khai.
3. **Engine OCR Captcha chạy Offline 100%**:
   - Mọi ngân hàng có captcha hình ảnh phải được giải bằng model AI chạy trực tiếp trên máy nội bộ (NumPy / ONNX / OpenCV).
   - Tuyệt đối không phụ thuộc vào server miễn phí bên thứ ba (như HuggingFace free space dễ bị ngủ, trả về mã 206 HTML spinner).
4. **Kiểm thử độc lập qua Terminal (Terminal Verification)**:
   - Luôn có script test độc lập (`test_vcb.py`, `test_mb.py`...) để kiểm tra toàn bộ luồng kết nối trước khi đưa lên giao diện Web.
5. **Ghi chép lịch sử công việc tự động (Mandatory Logging)**:
   - Sau mỗi tính năng hoàn thành, bắt buộc phải cập nhật vào file [`DEV_HISTORY.md`](file:///d:/DU%20AN%20CA%20NHAN/Qu%E1%BA%A3n%20l%C3%BD%20t%C3%A0i%20ch%C3%ADnh/DEV_HISTORY.md) để theo dõi tiến độ và đối soát sau này.

---

## 📋 2. CẤU TRÚC LOG CHUẨN KHI GHI NHẬN CÔNG VIỆC

Mỗi khi agent thực hiện một yêu cầu mới (ví dụ: làm tính năng Login, trang Thống kê, Đồng bộ giao dịch...), agent PHẢI ghi vào file [`DEV_HISTORY.md`](file:///d:/DU%20AN%20CA%20NHAN/Qu%E1%BA%A3n%20l%C3%BD%20t%C3%A0i%20ch%C3%ADnh/DEV_HISTORY.md) theo mẫu sau:

```markdown
### [Ngày/Tháng/Năm - Giờ] - TÊN TÍNH NĂNG / YÊU CẦU

- **Yêu cầu người dùng**: <Tóm tắt chính xác nội dung người dùng yêu cầu>
- **Công việc đã làm**:
  1. <Bước 1>
  2. <Bước 2>
- **File tạo mới**:
  - `đường/dẫn/file.py`: <Mục đích và chức năng>
- **File chỉnh sửa**:
  - `đường/dẫn/file.tsx`: <Các thay đổi cụ thể>
- **Hàm / Component chính**:
  - `TênHàm()` / `<TênComponent />`: <Mô tả chức năng>
- **Kết quả kiểm thử**:
  - <Kết quả chạy terminal / HTTP Status Code / dữ liệu thực tế>
```

---

## 🏦 3. QUY TRÌNH THAO TÁC KHI TÍCH HỢP API NGÂN HÀNG

### Bước 1: Khảo sát tài liệu API
- Đọc thư mục `TÀI LIỆU API BANK`.
- Xác định endpoint xác thực, cấu trúc payload mã hóa (RSA Public Key, AES-CBC).

### Bước 2: Thiết kế Engine giải Captcha
- Load trọng số mô hình hoặc dùng ma trận NumPy offline.
- Tích hợp vòng lặp thử lại (Retry loop) 3-5 lần khi gặp mã lỗi captcha không khớp (`0111`).

### Bước 3: Cơ chế Browser ID & Xác thực thiết bị (VCB)
- Đối với Vietcombank, thiết bị mới đăng nhập lần đầu sẽ nhận mã lỗi `20231` (Trình duyệt chưa xác thực).
- Để trích xuất Browser ID chuẩn đã xác thực từ trình duyệt Chrome của người dùng:
  + Mở F12 Console trên trang `vcbdigibank.vietcombank.com.vn`.
  + Gõ `allow pasting` -> gõ `copy(JSON.stringify(sessionStorage))` -> lấy mã hash 32 ký tự.
  + Lưu mã này vào [`backend/vcb_browser_id.txt`](file:///d:/DU%20AN%20CA%20NHAN/Qu%E1%BA%A3n%20l%C3%BD%20t%C3%A0i%20ch%C3%ADnh/backend/vcb_browser_id.txt).
- Backend **luôn ưu tiên đọc từ file `vcb_browser_id.txt`**, không phụ thuộc vào giá trị client gửi lên để tránh lệch kích thước màn hình responsive.

### Bước 4: Chuẩn hóa dữ liệu giao dịch
Cấu trúc chuẩn của 1 giao dịch trong toàn hệ thống:
```python
class NormalizedTransaction(BaseModel):
    transaction_date: str   # Ngày giao dịch (VD: 15/10/2026)
    amount: int             # Số tiền nguyên dương (VD: 1600000)
    type: str               # "INCOME" (Thu nhập) hoặc "EXPENSE" (Chi tiêu)
    description: str        # Nội dung giao dịch
    reference: str          # Mã giao dịch / số tham chiếu
    raw_data: dict          # JSON gốc từ ngân hàng
```

### Bước 5: Đấu nối Backend & Frontend Web
- Backend FastAPI: Expose endpoint `POST /api/banks/{bank}/connect` và `POST /api/banks/{bank}/transactions`.
- Frontend React: Bấm "Kết nối ngay", hiển thị số dư thực tế và đồng bộ lịch sử giao dịch vào cơ sở dữ liệu.
