import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, Zap, Database, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { storageService } from '../../services/storage';

interface SettingsViewProps {
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onResetData }) => {
  const [copied, setCopied] = useState(false);
  const webhookUrl = 'https://[your-project].supabase.co/functions/v1/sepay-webhook';

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc muốn xóa sạch toàn bộ dữ liệu? Tất cả tài khoản ngân hàng và lịch sử giao dịch sẽ được đưa về trạng thái trống.')) {
      storageService.clearAll();
      onResetData();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }} className="animate-fade-in">
      {/* 1. Tích hợp SePay Webhook */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Zap size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Tích hợp Tự động hóa qua SePay</h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                Tự động nhận biến động số dư các ngân hàng Việt Nam (Vietcombank, Techcombank, MBBank...)
              </p>
            </div>
          </div>
          <span className="badge badge-connected" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            ● Hoạt động
          </span>
        </div>

        {/* Webhook endpoint box */}
        <div
          style={{
            background: 'var(--bg-tertiary)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
            WEBHOOK ENDPOINT URL DÀNH CHO SEPAY DASHBOARD:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <code
              style={{
                flex: 1,
                padding: '10px 14px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                color: '#818cf8',
                wordBreak: 'break-all',
              }}
            >
              {webhookUrl}
            </code>
            <button onClick={handleCopy} className="btn btn-secondary btn-sm" style={{ padding: '10px 16px' }}>
              {copied ? (
                <>
                  <Check size={16} color="#10b981" /> Đã sao chép
                </>
              ) : (
                <>
                  <Copy size={16} /> Sao chép URL
                </>
              )}
            </button>
          </div>
        </div>

        {/* Setup steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>3 Bước kích hoạt đồng bộ tự động:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontWeight: 700, color: '#818cf8', marginBottom: '4px' }}>Bước 1: my.sepay.vn</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Đăng ký tài khoản tại cổng SePay và kết nối tài khoản ngân hàng của bạn.
              </p>
            </div>
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontWeight: 700, color: '#818cf8', marginBottom: '4px' }}>Bước 2: Cài đặt Webhooks</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Dán URL trên vào mục Cài đặt Webhooks và chọn phương thức xác thực API Key / Secret Token.
              </p>
            </div>
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontWeight: 700, color: '#818cf8', marginBottom: '4px' }}>Bước 3: Tự động ghi nhận</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Mỗi khi có tiền vào/ra tài khoản ngân hàng, hệ thống lập tức cập nhật số dư và ghi sổ.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Cam kết Bảo mật Tài chính */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <Lock size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Cam kết Bảo mật & Quyền riêng tư</h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Kiến trúc an toàn tối đa cho dữ liệu tài chính người dùng
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <ShieldCheck size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>
              <strong>Không lưu trữ thông tin nhạy cảm:</strong> Ứng dụng tuyệt đối không bao giờ yêu cầu mật khẩu ngân hàng, mã PIN hay mã xác thực OTP.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <ShieldCheck size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>
              <strong>Bảo vệ số tài khoản:</strong> Mọi số tài khoản ngân hàng đều được che tự động (ví dụ: ****8888) khi hiển thị trên giao diện người dùng.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <ShieldCheck size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ color: 'var(--text-secondary)' }}>
              <strong>Xóa tài khoản an toàn (Soft Delete):</strong> Khi xóa tài khoản ngân hàng, toàn bộ lịch sử giao dịch vẫn được lưu giữ toàn vẹn để không làm sai lệch báo cáo dòng tiền của bạn.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Dữ liệu & Lưu trữ */}
      <div className="glass-card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
              }}
            >
              <Database size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Quản lý Dữ liệu Hệ thống</h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                Dữ liệu hiện được lưu trữ an toàn trực tiếp trên trình duyệt (LocalStorage)
              </p>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '18px' }}>
          Nếu bạn muốn đưa tất cả dữ liệu tài khoản và giao dịch về trạng thái trống ban đầu để bắt đầu ghi chép tài chính cá nhân từ đầu, hãy bấm nút dưới đây.
        </p>

        <button onClick={handleReset} className="btn btn-secondary" style={{ color: '#fb7185', borderColor: 'rgba(251, 113, 133, 0.3)' }}>
          <RefreshCw size={16} /> Xóa sạch toàn bộ dữ liệu (Reset hệ thống)
        </button>
      </div>
    </div>
  );
};
