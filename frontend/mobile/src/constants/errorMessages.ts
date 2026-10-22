export const ERROR_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Không có kết nối mạng. Vui lòng kiểm tra lại đường truyền internet.',
  TIMEOUT: 'Yêu cầu kết nối quá thời gian chờ. Vui lòng thử lại.',
  UNAUTHORIZED: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện hành động này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
  SERVER_ERROR: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau giây lát.',
  UNKNOWN_ERROR: 'Đã có lỗi xảy ra. Vui lòng thử lại.',

  // Validation ngân hàng
  BANK_NAME_REQUIRED: 'Vui lòng chọn hoặc nhập tên ngân hàng.',
  BANK_NAME_TOO_LONG: 'Tên ngân hàng không được vượt quá 100 ký tự.',
  DISPLAY_NAME_REQUIRED: 'Vui lòng nhập tên hiển thị (ví dụ: Nhận lương, Tiết kiệm).',
  DISPLAY_NAME_TOO_LONG: 'Tên hiển thị không được vượt quá 50 ký tự.',
  ACCOUNT_NUMBER_INVALID: 'Số tài khoản phải gồm từ 6 đến 20 chữ số.',
  ACCOUNT_NUMBER_EXISTS: 'Số tài khoản này đã được thêm vào hệ thống của bạn.',
  INITIAL_BALANCE_INVALID: 'Số dư ban đầu không được âm và không vượt quá 999.999.999.999 ₫.',

  // Validation giao dịch
  AMOUNT_REQUIRED: 'Vui lòng nhập số tiền giao dịch hợp lệ.',
  AMOUNT_OUT_OF_RANGE: 'Số tiền phải lớn hơn 0 và không vượt quá 999.999.999.999 ₫.',
  ACCOUNT_REQUIRED: 'Vui lòng chọn tài khoản thực hiện giao dịch.',
  TRANSACTION_DATE_FUTURE: 'Ngày giao dịch không thể ở tương lai.',
  DATE_RANGE_INVALID: 'Ngày bắt đầu không được sau ngày kết thúc.',

  // SePay
  SEPAY_NOT_CONFIGURED: 'Chưa cấu hình thông tin kết nối SePay trên máy chủ.',
  SEPAY_CONNECT_FAILED: 'Không thể kết nối với dịch vụ SePay. Vui lòng kiểm tra lại cấu hình.',
};
