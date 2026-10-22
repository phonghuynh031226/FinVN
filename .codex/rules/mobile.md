# Mobile Development Rules — React Native + Expo + TypeScript

## Cấu hình dự án

- **MUST** dùng Expo SDK (SDK 50+), TypeScript strict, và Expo Router hoặc React Navigation v6+.
- **MUST** bật `expo-modules` theo tài liệu Expo chính thức; không tự cấu hình native module khi có giải pháp Expo.
- File entry point: `app/_layout.tsx` (Expo Router) hoặc `App.tsx` (React Navigation).
- `tsconfig.json` phải có `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`.

## Navigation

- Dùng type-safe navigation: định nghĩa `RootStackParamList` và `BottomTabParamList`; không dùng `navigation.navigate("Screen" as any)`.
- Mỗi màn hình phải là một file riêng trong `screens/`; không nhét nhiều màn hình vào một file.
- Tab chính tối thiểu: **Tổng quan**, **Giao dịch**, **Tài khoản**, **Cài đặt**.

## Component & UI

- **MUST** dùng `StyleSheet.create` hoặc thư viện styled-components/NativeWind (nếu đã chọn); không inline style phức tạp.
- Component chỉ nhận props có type rõ ràng; không truyền `object` hay `any` làm prop.
- Mọi màn hình phải xử lý trạng thái: **loading**, **empty**, **error**, **success** — không để màn hình trắng.
- Hiển thị `ActivityIndicator` hoặc skeleton khi đang tải dữ liệu.
- Hiển thị thông báo lỗi bằng tiếng Việt; không hiện stack trace ra UI.

## Bộ lọc và tổng quan

- Bộ lọc tài khoản và thời gian phải là state được quản lý ở cấp màn hình (hoặc store), không phải local state của component con.
- Khi bộ lọc thay đổi, **tất cả** số liệu (tổng số dư, tổng thu, tổng chi, danh sách giao dịch) phải re-fetch hoặc re-compute nhất quán trong cùng một render cycle.
- **DO NOT** tính tổng thu/chi ở component; ủy thác cho hook `useFinancialSummary` hoặc nhận từ API.

## Danh sách giao dịch

- Dùng `FlatList` với `keyExtractor` là `transaction.id` (string UUID).
- Implement **infinite scroll** hoặc **pagination** (Load thêm) khi danh sách > 20 items.
- Không render toàn bộ giao dịch trong một lần — sẽ gây giật trên thiết bị thực.
- Skeleton loader hoặc placeholder khi đang tải trang đầu.

## Định dạng dữ liệu

- **MUST** dùng `Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })` để định dạng tiền.
- **MUST** hiển thị ngày giờ theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`); dùng `date-fns-tz` hoặc `dayjs` với plugin timezone.
- Số tài khoản ngân hàng **MUST** che một phần khi hiển thị: hiện 4 số cuối, phần còn lại dùng `****`.

## Xử lý lỗi và mạng

- Mọi API call phải được bọc trong try/catch; lỗi phải được bắt và hiển thị thông báo thân thiện.
- Xử lý HTTP status: 401 → redirect login, 403 → hiện "Không có quyền", 404 → "Không tìm thấy", 5xx → "Lỗi hệ thống, vui lòng thử lại".
- **DO NOT** để app crash khi API trả về `null`, array rỗng hoặc thiếu field bất kỳ.
- Dùng optional chaining (`?.`) và nullish coalescing (`??`) khi truy cập dữ liệu từ API.

## Bảo mật mobile

- **DO NOT** lưu JWT, token, hay thông tin nhạy cảm trong `AsyncStorage` không mã hóa; dùng `expo-secure-store`.
- **DO NOT** log giá trị token hoặc dữ liệu cá nhân ra console trong production build.
- **DO NOT** lưu hoặc hiển thị mật khẩu, OTP, mã PIN ngân hàng dưới bất kỳ hình thức nào.

## Accessibility & UX

- Mọi nút bấm phải có `accessibilityLabel` mô tả hành động bằng tiếng Việt.
- Kích thước touch target tối thiểu 44×44 dp.
- Trước thao tác xóa (tài khoản, giao dịch), **MUST** hiện `Alert.alert` xác nhận với mô tả hậu quả.
