# Finance Logic Rules — Số dư, Thu/Chi, Lọc và Tiền tệ

## Định nghĩa thuật ngữ

| Thuật ngữ | Định nghĩa |
|-----------|-----------|
| `currentBalance` | Số dư hiện tại của tài khoản ngân hàng (điểm thực tế tại thời điểm truy vấn) |
| `totalIncome` | Tổng tiền vào trong kỳ lọc đang chọn |
| `totalExpense` | Tổng tiền ra trong kỳ lọc đang chọn (lưu là số dương, chỉ dấu âm khi hiển thị) |
| `netAmount` | `totalIncome - totalExpense` trong kỳ |

## Quy tắc tính toán

- **MUST** phân biệt rõ `currentBalance` và `totalIncome`/`totalExpense`/`netAmount` — không cộng số dư vào tổng giao dịch.
- `totalIncome` = SUM các giao dịch type = `INCOME` trong kỳ lọc, thuộc (các) tài khoản đang lọc.
- `totalExpense` = SUM các giao dịch type = `EXPENSE` trong kỳ lọc, thuộc (các) tài khoản đang lọc.
- Khi lọc "Tất cả tài khoản", tổng số dư = SUM `currentBalance` của tất cả tài khoản thuộc user — không cộng số dư nhiều lần cho cùng một tài khoản.
- **DO NOT** cộng `initialBalance` vào `currentBalance` mà không điều chỉnh theo lịch sử giao dịch.

## Khoảng thời gian lọc

- Các khoảng mặc định:
  - **Tháng này**: từ ngày 1 đầu tháng 00:00:00 đến cuối ngày hôm nay hoặc cuối tháng.
  - **Tháng trước**: từ ngày 1 đến ngày cuối tháng trước (inclusive).
  - **7 ngày gần nhất**: từ 7 ngày trước (00:00:00) đến hiện tại.
  - **Tùy chỉnh**: `startDate ≤ endDate`; cả hai phải hợp lệ.
- **MUST** dùng múi giờ `Asia/Ho_Chi_Minh` khi xác định ranh giới ngày; không dùng UTC naïve.
- **MUST** kiểm tra `startDate <= endDate`; trả lỗi validation nếu vi phạm.
- Khi khoảng lọc thay đổi, tất cả số liệu (`totalIncome`, `totalExpense`, `netAmount`) và danh sách giao dịch phải được recompute/refetch đồng thời.

## Giao dịch

- Trường `amount` **MUST** là số nguyên dương (VND không có decimal) hoặc Decimal với scale=2 nếu hỗ trợ ngoại tệ; không lưu dấu âm trong cột `amount`.
- Dấu âm/dương chỉ biểu thị qua trường `type: 'INCOME' | 'EXPENSE'`.
- **DO NOT** trộn lẫn logic "giao dịch nội bộ giữa hai tài khoản cùng user" (transfer) với INCOME/EXPENSE trừ khi có type riêng `TRANSFER`.
- Mỗi giao dịch phải có `accountId` hợp lệ; không tạo giao dịch mồ côi (orphan).

## Xóa tài khoản ngân hàng

- **MUST** hiển thị dialog xác nhận với thông tin: số giao dịch liên quan và cách xử lý (giữ lại lịch sử với trạng thái "tài khoản đã xóa", hay xóa cùng giao dịch).
- **MUST** chọn một trong hai chiến lược nhất quán:
  - **Soft delete**: đánh dấu tài khoản `deleted_at`, giao dịch giữ nguyên `accountId`, query tổng thu/chi không tính tài khoản đã xóa vào "hiện tại" nhưng vẫn giữ lịch sử.
  - **Cascade**: xóa cả giao dịch; cần cảnh báo rõ trước khi xác nhận.
- **DO NOT** xóa tài khoản mà không xử lý giao dịch liên quan — gây số liệu sai hoặc orphan record.
- Sau khi xóa, tổng số dư tổng hợp phải cập nhật lại ngay (không còn cộng tài khoản đã xóa).

## Định dạng tiền tệ

- **MUST** dùng `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })`.
- Tiền vào hiển thị màu xanh với dấu `+`; tiền ra hiển thị màu đỏ với dấu `−`.
- Không hiển thị số thập phân cho VND (VND không có xu).
- **DO NOT** dùng `parseFloat` trực tiếp với chuỗi số tiền từ user input — parse qua hàm tiện ích có validation.

## Phân loại giao dịch (Category)

- Người dùng được phép sửa `category` và `note` của một giao dịch.
- **DO NOT** cho phép sửa `amount`, `type`, `date`, `reference`, hoặc `rawData` của giao dịch đồng bộ từ ngân hàng — đây là dữ liệu gốc không thể thay đổi.
- Phân loại do user sửa phải lưu riêng (cột `userCategory`, `userNote`), không ghi đè `originalDescription`.
