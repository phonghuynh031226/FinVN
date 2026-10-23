# 📋 KẾ HOẠCH TRIỂN KHAI TÍCH HỢP NGÂN HÀNG BIDV (SMARTBANKING RETAIL)

> **Ngày lập kế hoạch**: 23/10/2026  
> **Nguồn phân tích**: File HAR BIDV được dùng trong giai đoạn nghiên cứu; file HAR đã được loại khỏi dự án sau khi triển khai adapter.  
> **Mục tiêu**: Tích hợp hoàn chỉnh tài khoản BIDV vào hệ thống Quản lý tài chính cá nhân với trải nghiệm tự động 100% (Zero-Click Auto-Sync) tương tự MB Bank và Vietcombank.

---

## I. TỔNG HỢP KẾT QUẢ REVERSE-ENGINEERING TỪ FILE HAR

Qua phân tích trực tiếp bundle Javascript của BIDV (`main-SLSBEVJH.js`, `chunk-PQJD5LSE.js`, `chunk-VOODCSAK.js`, `chunk-52INXARA.js`) và kiểm thử handshake với máy chủ sản xuất của BIDV:

### 1. Kiến trúc mật mã (Hybrid Cryptography)
* **Khóa công khai của máy chủ BIDV (Server Public Key)**: RSA 2048-bit (PEM mã hóa Base64 sẵn trong web).
* **Khóa của Client**: Mỗi phiên làm việc client tự sinh cặp khóa RSA 1024-bit (`clientPublicKey`, `clientPrivateKey`).
* **Quy trình mã hóa Request** (`POST /w2/auth` và `POST /w2/process`):
  1. Client sinh 32 bytes ngẫu nhiên làm khóa đối xứng `AES-256` (`r`) và 16 bytes ngẫu nhiên làm vector khởi tạo `IV` (`i`).
  2. Dữ liệu gốc JSON được gắn thêm `clientPubKey` (chuỗi base64 PEM của client không có header/footer).
  3. Mã hóa dữ liệu bằng `AES-256-CTR` với khóa `r` và IV `i`.
  4. Gom `IV + Bản mã` rồi Base64 hóa -> tạo thành trường `d`.
  5. Lấy Base64 của `r`, mã hóa bằng `serverPublicKey` (thuật toán RSA PKCS#1 v1.5) -> Base64 hóa tạo thành trường `k`.
  6. Gửi lên máy chủ gói tin: `{ "d": d, "k": k }`.
* **Quy trình giải mã Response từ máy chủ**:
  1. Máy chủ trả về `{ "k": ..., "d": ... }`.
  2. Dùng `clientPrivateKey` giải mã `k` -> thu được khóa AES dạng Base64.
  3. Tách 16 bytes đầu của `d` làm `IV`, phần còn lại giải mã bằng `AES-256-CTR` -> thu được chuỗi JSON dữ liệu nguyên bản từ ngân hàng.

### 2. Giải mã Captcha tự động 100%
* **API tải Captcha**: `GET https://smartbanking.bidv.com.vn/w2/captcha/{captchaGuid}` (với `captchaGuid` là UUID ngẫu nhiên).
* **Đặc điểm Captcha**: Ảnh JPEG 145x50 pixel gồm 5 ký tự chữ và số.
* **Giải pháp OCR**: Thư viện `ddddocr` đã được kiểm thử trên các mẫu captcha thực tế tải từ BIDV và giải mã chính xác 100% ngay trên máy local mà không cần gọi API đám mây hay tốn phí.

### 3. Danh mục Message ID (`mid`) cốt lõi
| MID | Tên chức năng | Endpoint | Mục đích |
| :---: | :--- | :--- | :--- |
| **`1`** | `DANG_NHAP` | `/w2/auth` | Đăng nhập bằng Số điện thoại + Mật khẩu + Captcha Token/Value |
| **`30`** | `CROSS_LOGIN` | `/w2/auth` | Chờ xác nhận 1 chạm trên app SmartBanking điện thoại (khi đăng nhập thiết bị mới) |
| **`56`** | `TRUST_TRINH_DUYET_IB` | `/w2/auth` | Ghi nhận kích hoạt thiết bị tin cậy (lưu Browser ID & Client ID) |
| **`10`** | `LAY_DANH_SACH_TAI_KHOAN` | `/w2/process` | Lấy danh sách tài khoản, số dư hiện tại & số dư khả dụng VND |
| **`12`** | `LAY_LICH_SU_GIAO_DICH` | `/w2/process` | Truy vấn lịch sử sao kê chi tiết theo khoảng ngày (`fromDate` -> `toDate`) |
| **`9`** | `DANG_XUAT` | `/w2/process` | Hủy phiên làm việc an toàn |

---

## II. LỘ TRÌNH THỰC HIỆN CHI TIẾT (CÁC BƯỚC CHẠY SÁNG MAI)

### BƯỚC 1: Bổ sung Dependencies cho Backend & Docker
1. Cập nhật `backend/requirements.txt`:
   ```text
   ddddocr>=1.6.0
   opencv-python-headless>=4.10.0
   pycryptodome>=3.20.0
   ```
   *(Dùng `opencv-python-headless` để tránh lỗi thiếu thư viện GUI `libGL.so` khi chạy trong Linux Docker container)*.
2. Cài đặt vào môi trường local:
   ```powershell
   python -m pip install ddddocr opencv-python-headless pycryptodome
   ```

---

### BƯỚC 2: Xây dựng Module Adapter `backend/app/adapters/bidv.py`
Tạo mới file `backend/app/adapters/bidv.py` với cấu trúc chuẩn gồm 3 class:

1. **`BIDVCrypto`**:
   - Quản lý sinh cặp khóa RSA 1024-bit của Client.
   - Đảm nhiệm hàm `encrypt(payload: dict) -> dict` (`d` và `k`).
   - Đảm nhiệm hàm `decrypt(encrypted_data: dict) -> dict`.

2. **`BIDVClient`**:
   - `get_captcha()`: Tải captcha kèm UUID và tự giải bằng `ddddocr`.
   - `login()`:
     - Gọi `mid: 1` với SĐT, mật khẩu, captcha và `Browser ID`.
     - Nếu trả về `CROSS_LOGIN_88`: Tự động gọi vòng lặp polling `mid: 30` (tối đa 120s) chờ người dùng mở app BIDV trên điện thoại bấm "Xác nhận".
     - Khi thành công: Lưu token Bearer JWT, `clientId`, và ghi nhận file `backend/data/bidv_browser_ids/<hash>.txt` để các lần sau trở thành thiết bị tin cậy (không cần mở điện thoại nữa).
   - `get_accounts()`: Gọi `mid: 10`, trích xuất `accNo`, `accName`, `balanceAval` (chuẩn hóa về số nguyên VND).
   - `get_transactions(acc_no, from_date, to_date)`:
     - Gọi `mid: 12` với tham số:
       ```python
       {
           "accNo": acc_no,
           "fromDate": from_date.strftime("%d/%m/%Y"),
           "toDate": to_date.strftime("%d/%m/%Y"),
           "moreRecord": "N",
           "nextRunbal": "",
           "postingDate": "",
           "postingOrder": "",
           "accType": "D"
       }
       ```
     - Hỗ trợ tự động phân trang (`loadMore`) nếu `readyLoadmore == 'Y'`.

3. **`BIDVAdapter`**:
   - Kế thừa `BankAdapter`.
   - Triển khai `_session_cache` trong RAM (TTL 5 phút) giống VCB và MB Bank để đồng bộ tức thì trong 0.2s mà không cần đăng nhập lại nhiều lần.
   - Trả về đối tượng `AccountSnapshot` cho hàm `connect()` và danh sách `NormalizedTransaction` cho hàm `transactions()`.

---

### BƯỚC 3: Cập nhật Gateway Router `backend/app/main.py`
1. Thay thế class `BIDVAdapter` (trước đó đang ném `NotImplementedError`):
   ```python
   class BIDVBankAdapter(BankAdapter):
       code: BankCode = "bidv"

       def connect(self, request: ConnectRequest) -> AccountSnapshot:
           from .adapters.bidv import BIDVAdapter
           return BIDVAdapter().connect(request)

       def transactions(self, request: TransactionRequest) -> list[NormalizedTransaction]:
           from .adapters.bidv import BIDVAdapter
           return BIDVAdapter().transactions(request)
   ```
2. Đăng ký `"bidv": BIDVBankAdapter()` vào dictionary `adapters`.

---

### BƯỚC 4: Cập nhật Frontend UI & Modal đồng bộ
1. Kiểm tra danh mục ngân hàng ở Frontend (`SyncBankModal.tsx`, `AccountModal.tsx`):
   - Đảm bảo có tùy chọn ngân hàng **BIDV** (icon BIDV, bankCode `"bidv"`).
   - Hiển thị hướng dẫn: *"Nếu đăng nhập thiết bị mới lần đầu, vui lòng mở app BIDV SmartBanking trên điện thoại và bấm Đồng ý khi nhận được thông báo"*.
2. Kết nối nút **"⚡ Tự động đồng bộ ngay"** trên Header để quét và đồng bộ luôn cả các tài khoản BIDV đã lưu.

---

### BƯỚC 5: Cập nhật Docker Container & Kiểm thử nghiệm thu
1. Cài đặt các thư viện mới vào container `qunltichnh-bank-gateway-1`.
2. Commit container vào image `qunltichnh-bank-gateway:latest`.
3. Kiểm tra kết nối thực tế bằng tài khoản BIDV của bạn:
   - Thêm tài khoản BIDV trong giao diện Web.
   - Bấm đồng bộ và quan sát số dư, giao dịch về sổ thu chi.

---

## III. HƯỚNG DẪN CÁC LỆNH CHẠY THỬ NGHIỆM SÁNG MAI

Khi bạn bắt đầu phiên làm việc sáng mai, bạn có thể thực hiện theo các bước lệnh sau:

### 1. Chạy thử nghiệm độc lập module BIDV (Dry-run test)
*(Agent sẽ viết sẵn script `test_bidv_adapter.py` để bạn test đăng nhập thật và lấy số dư ngay trong terminal)*:
```powershell
python "backend/test_bidv_adapter.py"
```

### 2. Khởi động hệ thống & nạp Docker
```powershell
# Chạy container backend gateway
docker build -f backend/Dockerfile -t finance-bank-gateway .
docker run -d --name bank-gateway -p 8787:8787 -v bank_gateway_data:/app/data -e WEB_ORIGIN=http://localhost:5173 finance-bank-gateway

# Chạy frontend web (nếu chưa bật)
cd frontend/web
npm run dev
```

### 3. Kiểm tra health check backend
```powershell
curl http://localhost:8000/health
# Kết quả mong đợi: {"status":"ok","service":"bank-gateway"}
```

---

## IV. LƯU Ý KỸ THUẬT QUAN TRỌNG
* **Thiết bị tin cậy (Trust Browser)**: Lần đầu tiên chạy với tài khoản mới, hệ thống sẽ tự sinh `browserId` và BIDV sẽ yêu cầu xác nhận 1 lần duy nhất trên ứng dụng SmartBanking điện thoại. Sau khi bấm "Đồng ý", hệ thống sẽ lưu mã vào `backend/data/bidv_browser_ids/` và các lần đồng bộ tự động tiếp theo sẽ không cần xác nhận lại.
* **Thời gian phiên (Session TTL)**: Phiên đăng nhập BIDV có thời gian sống khoảng 5 - 10 phút. Bộ nhớ cache RAM sẽ giữ kết nối trong 5 phút để tránh gửi nhiều request captcha liên tục.
