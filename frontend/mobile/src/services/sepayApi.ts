/**
 * SePay Client Service (Mobile layer)
 * Quy tắc:
 * - KHÔNG chứa SePay API Key hoặc Webhook Secret trên Mobile.
 * - KHÔNG nhận hoặc lưu trữ mật khẩu, mã PIN hoặc mã OTP ngân hàng.
 * - Chỉ giao tiếp trạng thái kết nối thông qua Backend.
 */

export interface SePayConfigStatus {
  isConfigured: boolean;
  webhookUrl: string;
  guideMessage: string;
}

export const sepayApi = {
  /**
   * Kiểm tra thông tin cấu hình SePay từ server
   */
  async checkConfiguration(): Promise<SePayConfigStatus> {
    const backendUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const isReady = Boolean(backendUrl && !backendUrl.includes('your-project-id'));

    const webhookEndpoint = isReady
      ? `${backendUrl}/functions/v1/sepay-webhook`
      : 'https://[your-supabase-id].supabase.co/functions/v1/sepay-webhook';

    return {
      isConfigured: isReady,
      webhookUrl: webhookEndpoint,
      guideMessage: isReady
        ? 'Máy chủ đã sẵn sàng nhận Webhook từ SePay.'
        : 'Cần cấu hình biến môi trường SEPAY_WEBHOOK_SECRET và SEPAY_API_KEY trên máy chủ backend.',
    };
  },
};
