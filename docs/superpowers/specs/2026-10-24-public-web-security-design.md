# Thiết kế bảo mật trước khi deploy FinVn công khai

## Ý định

Đưa ứng dụng quản lý tài chính cá nhân lên Internet công khai mà mỗi người dùng Google chỉ truy cập được dữ liệu và thông tin kết nối ngân hàng của chính họ. Giữ trải nghiệm tự đồng bộ ngân hàng, đồng thời lưu các bí mật ngân hàng ở backend dưới dạng mã hóa.

## Mục tiêu

- Xác minh Google ID token bằng thư viện Google phía backend, bao gồm chữ ký, issuer, audience đúng client ID, thời hạn và trạng thái email đã xác minh.
- Sau đăng nhập, cấp phiên backend trong cookie `HttpOnly`, `Secure` ở production, `SameSite=Lax`; backend tự lấy user ID từ phiên và mọi API dữ liệu đều yêu cầu phiên hợp lệ.
- Lưu/thu hồi phiên ở PostgreSQL; đăng xuất thu hồi phiên ở server. Kiểm tra Origin/CSRF cho các thao tác ghi.
- Cô lập CRUD tài khoản, giao dịch, đồng bộ ngân hàng và migrate theo user lấy từ phiên; API không nhận `user_id` do client tự chọn.
- Mã hóa thông tin đăng nhập ngân hàng bằng AES-256-GCM trước khi lưu; chỉ giải mã trong bộ nhớ khi cần đồng bộ. Khóa phiên bản hóa được cấu hình qua secret manager của host, không lưu trong DB/repo.
- Đưa tạo/sửa/xóa tài khoản và giao dịch về PostgreSQL làm nguồn dữ liệu bền vững; tránh trả thành công khi backend ghi thất bại.
- Cấu hình production có HTTPS/reverse proxy, CORS cùng origin hoặc allowlist chính xác, giới hạn tốc độ/kích thước request, lỗi không lộ stack trace, và DB dùng tài khoản quyền tối thiểu.
- Sửa hướng dẫn deploy Docker để khai báo đầy đủ DB host, secret, volume, origin và cách kiểm tra kết nối.

## Ngoài phạm vi

- Không thay đổi luồng nghiệp vụ ngân hàng hoặc định dạng lịch sử giao dịch ngoài phần cần để phân quyền và lưu credentials an toàn.
- Không đổi sang nhà cung cấp OAuth hay database khác.
- Không tuyên bố mã hóa backend bảo vệ khỏi chính tiến trình/backend bị chiếm quyền: dịch vụ cần giải mã credentials trong bộ nhớ để gọi ngân hàng.

## Giả định và hành vi

- Website cho phép người dùng Google đăng ký/đăng nhập như hiện tại; mỗi tài khoản có không gian dữ liệu riêng.
- Giữ tự đồng bộ. Username, password, browser ID/session material được gửi qua HTTPS, xác thực trước, mã hóa ở backend và lưu riêng theo tài khoản ngân hàng. Frontend không lưu mật khẩu hay ID token bền vững trong `localStorage`.
- Khóa mã hóa được cung cấp qua secret manager hoặc biến môi trường bảo mật của nền tảng, có ID phiên bản và quy trình xoay khóa. Mất khóa có nghĩa là không giải mã được credentials cũ; cần xác định quy trình backup/rotation trước production.
- Production phục vụ web và API cùng site qua reverse proxy nếu nền tảng cho phép; nếu khác site, cấu hình cookie/CORS/CSRF theo origin HTTPS cụ thể.
- **Dữ liệu PostgreSQL cũ (đã chốt với người dùng)**: trước tiên tạo bản sao lưu và báo cáo số lượng/phân bố bản ghi theo user, kiểm tra liên kết account/transaction và dữ liệu demo. Không tự gắn lại user, không xóa dữ liệu và không in nội dung tài chính/credentials trong báo cáo. Việc remap hoặc xóa cần quyết định sau khi người dùng xem báo cáo.
- **Thời hạn phiên (quyết định triển khai)**: hết hạn sau 12 giờ không hoạt động, tối đa 7 ngày; hoạt động làm mới idle timeout nhưng không vượt quá thời hạn tuyệt đối. Đăng xuất thu hồi ngay; thay đổi hoặc xem lại credentials ngân hàng yêu cầu phiên hợp lệ.
- **Xoay khóa credentials (quyết định triển khai)**: mỗi ciphertext ghi key ID/version; backend đọc khóa hiện hành và khóa cũ trong giai đoạn chuyển đổi. Sao lưu trước, mã hóa lại theo lô bằng khóa mới, xác minh tất cả bản ghi, rồi mới bỏ khóa cũ. Không xóa khóa cũ nếu còn ciphertext cần nó.

## Hướng kiến trúc đã chọn

### A. Phiên opaque lưu phía server (đề xuất)

Backend xác minh Google ID token lúc đăng nhập, tạo session secret ngẫu nhiên, chỉ lưu hash của secret trong bảng phiên, và gửi secret vào cookie an toàn. Mỗi API xác minh phiên còn hiệu lực, lấy user ID từ bản ghi phiên, rồi áp điều kiện sở hữu ở DB. Đăng xuất thu hồi phiên.

Ưu điểm: thu hồi phiên ngay, không để ID token OAuth làm token API dài hạn, và phân quyền được thực thi tập trung. Đổi lại cần migration bảng phiên và xử lý cookie/CSRF.

### B. Dùng Google ID token cho mọi API

Backend xác minh token ở mọi request. Cách này tránh bảng phiên, nhưng ID token có thời hạn ngắn, cần xử lý đăng nhập lại/refresh và có thêm chi phí xác minh; không chọn cho ứng dụng cần phiên ổn định.

### C. Chỉ dựa vào `user_id` client hoặc CORS

Không có xác thực thực sự và không bảo vệ API khỏi gọi trực tiếp; loại bỏ.

## Lưu thông tin ngân hàng

Dùng AES-256-GCM từ PyCryptodome đã có trong backend. Lưu nonce, ciphertext, authentication tag và key version cùng nhau trong bảng credentials có khóa ngoại đến tài khoản và user. AAD gắn ciphertext với user/account để ngăn tráo dữ liệu giữa các hàng. Khóa 32 byte được lấy từ secret manager; không có khóa mặc định. Lưu ý mọi request đồng bộ cần xác thực người dùng và chỉ được truy cập credential cùng user.

## Phân quyền và dữ liệu

- Dependency xác thực duy nhất tạo `current_user`; handler không tin `user_id` trong query/body.
- Mọi truy vấn/update/delete giới hạn theo user; kiểm tra account ownership trước khi lưu giao dịch, đồng bộ hoặc sửa.
- Endpoint migrate chỉ nhận dữ liệu cho user hiện tại, giới hạn payload, không tự gán giao dịch account không nhận diện được sang account đầu tiên.
- CRUD thủ công phải ghi DB trước, cập nhật cache sau; lỗi DB phải hiện lỗi và không giả vờ lưu thành công.

## Rủi ro còn lại

- Backend hoặc host bị chiếm quyền có thể đọc khóa và giải mã credentials; giảm thiểu bằng secret manager, phân quyền host/DB, cập nhật dependency, log đã làm sạch, backup bảo vệ và giám sát.
- Tự đồng bộ chạy trên backend cần giới hạn tần suất theo user/account và timeout; chống lạm dụng endpoint đăng nhập/kết nối ngân hàng.
- Cookie phiên yêu cầu cấu hình chính xác giữa local development và HTTPS production; không bật wildcard CORS cùng credentials.

## Tiêu chí chấp nhận

- Gọi API dữ liệu không có phiên hoặc với phiên hết hạn nhận 401; người dùng A không thể đọc/sửa/xóa dữ liệu người dùng B kể cả khi tự gửi ID của B.
- Google token có sai audience/issuer, hết hạn hoặc không hợp lệ không thể tạo phiên.
- Cookie production có `HttpOnly`, `Secure`, `SameSite`; logout thu hồi phiên; request ghi không có Origin/CSRF hợp lệ bị từ chối.
- Password ngân hàng không xuất hiện ở localStorage, log, response API hoặc plaintext trong DB; reconnect/autosync vẫn hoạt động với credential mã hóa.
- CRUD tài khoản/giao dịch còn nguyên sau refresh và thiết bị khác; lỗi DB không được báo thành công.
- Deploy sạch từ hướng dẫn có health check, kết nối DB đúng, migration áp dụng và API không lộ tài liệu debug công khai.
- Build frontend, kiểm thử backend auth/ownership/crypto/CRUD và quét advisory dependency đều có kết quả được ghi nhận trước khi công khai.
