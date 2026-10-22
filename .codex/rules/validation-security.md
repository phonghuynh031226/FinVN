# Validation & Security Rules — Kiểm tra dữ liệu, Phân quyền và Xử lý lỗi

## Nguyên tắc tổng quát

- **MUST** validate ở cả **client (mobile)** và **server (backend)** — không chỉ một bên.
- Server là nguồn sự thật; client validation chỉ để UX nhanh hơn, không thay thế server validation.
- **MUST** dùng thư viện schema validation (ví dụ: `zod` cho TypeScript) ở backend; không validate thủ công bằng if-else lồng nhau.
- Mọi lỗi validation trả về HTTP 400 với format: `{ error: { code: "VALIDATION_ERROR", message: "...", fields: { fieldName: "mô tả lỗi bằng tiếng Việt" } } }`.

## Validation tài khoản ngân hàng

- `bankName`: bắt buộc, không trống, tối đa 100 ký tự.
- `displayName` (tên hiển thị do user đặt, ví dụ "Nhận lương"): bắt buộc, không trống, tối đa 50 ký tự, chỉ chứa ký tự Unicode hợp lệ.
- `accountNumber`: bắt buộc, độ dài 6–20 ký tự số; kiểm tra format theo ngân hàng nếu có thể.
- `initialBalance`: số nguyên không âm, không vượt 999,999,999,999 VND.
- Trùng tài khoản: nếu `accountNumber` đã tồn tại trong hệ thống của user, trả lỗi "Số tài khoản đã được thêm".

## Validation giao dịch

- `amount`: số nguyên dương, tối thiểu 1, tối đa 999,999,999,999 (không nhập giá trị âm).
- `type`: phải là `'INCOME'` hoặc `'EXPENSE'` (enum; từ chối giá trị khác).
- `transactionDate`: ISO 8601 hợp lệ; không chấp nhận ngày trong tương lai xa (> 1 ngày kể từ now).
- `accountId`: phải tồn tại trong DB và thuộc về `userId` đang gửi request — kiểm tra ở backend.
- `description`/`note`: tối đa 500 ký tự; loại bỏ ký tự control; không cho phép HTML/script.

## Validation bộ lọc thời gian

- `startDate` và `endDate` phải là ngày hợp lệ (ISO 8601 hoặc `YYYY-MM-DD`).
- `startDate` **MUST** ≤ `endDate`; trả lỗi "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc" nếu vi phạm.
- Khoảng lọc không được vượt quá 2 năm (để tránh query quá lớn).
- **DO NOT** truyền giá trị `startDate`/`endDate` chưa validate vào SQL query — dùng parameterized query.

## Phân quyền (Authorization)

- **MUST** kiểm tra `userId` từ JWT/session đối với mọi resource (tài khoản, giao dịch, webhook settings).
- Mọi endpoint **MUST** có middleware xác thực auth trước khi đến controller.
- Backend **MUST** kiểm tra: `account.userId === req.user.id` trước mọi thao tác đọc/ghi/xóa tài khoản và giao dịch.
- **DO NOT** tin vào `userId` do client gửi lên trong body; luôn lấy từ token đã xác thực.
- Trả HTTP 403 (không phải 404) khi resource tồn tại nhưng không thuộc về user hiện tại — để không lộ thông tin tồn tại.

## Bảo vệ dữ liệu nhạy cảm

- **DO NOT** lưu mật khẩu, OTP, mã PIN ngân hàng dưới bất kỳ hình thức nào.
- **DO NOT** log số tài khoản đầy đủ, số dư cụ thể, hay thông tin cá nhân ở level INFO trong production.
- Số tài khoản chỉ lưu đầy đủ trong DB (có encrypt nếu cần); khi trả về API chỉ hiện 4 số cuối: `****1234`.
- JWT secret **MUST** trong env var; token expiry tối đa 7 ngày; implement refresh token.

## Xử lý lỗi và edge cases

- **DO NOT** để exception chưa catch lan ra response người dùng — có global error handler middleware.
- **MUST** xử lý: mất mạng, timeout (set timeout 30s cho API call), response rỗng, null fields, JSON parse error.
- Khi API trả `null` hoặc thiếu field, dùng default value hợp lý thay vì crash; log warning.
- Danh sách giao dịch rỗng: hiển thị empty state "Chưa có giao dịch nào" — không crash, không spinner vô hạn.
- Khi xóa tài khoản thất bại ở backend, mobile phải hiển thị lỗi và **không** xóa tài khoản khỏi local state.

## Thông báo lỗi người dùng

- **MUST** hiển thị thông báo lỗi bằng tiếng Việt, ngắn gọn, dễ hiểu.
- Nếu có hướng dẫn khắc phục, phải ghi rõ: ví dụ "Kiểm tra kết nối mạng và thử lại."
- **DO NOT** hiển thị: stack trace, SQL error, internal server message, hay mã lỗi kỹ thuật ra màn hình người dùng cuối.
- Map mã lỗi HTTP sang thông báo tiếng Việt trong constants: `ERROR_MESSAGES['NETWORK_ERROR'] = "Không có kết nối mạng."`.

## Rate Limiting & Anti-abuse

- **MUST** có rate limiting cho endpoint nhạy cảm: login, webhook, connect SePay (ví dụ 10 req/phút/IP).
- Validate kích thước payload webhook: từ chối nếu > 1MB.
- **DO NOT** expose thông tin nội bộ (version, framework, DB type) trong response header.
