import React, { useEffect, useRef } from 'react';
import {
  CreditCard,
  Database,
  Moon,
  ShieldCheck,
  Sun,
  Wallet,
  BarChart3,
  Sparkles,
  Lock,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { UserProfile } from '../../types/user';

interface WelcomeViewProps {
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onLoginSuccess?: (user: UserProfile) => void;
}

const highlights = [
  { icon: Wallet, label: 'Theo dõi tài khoản tự động' },
  { icon: BarChart3, label: 'Xem thu chi rõ ràng' },
  { icon: ShieldCheck, label: 'Dữ liệu lưu cục bộ 100%' },
];

const supportedBanks = [
  { name: 'Vietcombank', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' },
  { name: 'MBBank', color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' },
  { name: 'BIDV', color: '#38bdf8', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)' },
];

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  theme = 'dark',
  onToggleTheme,
  onLoginSuccess,
}) => {
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!googleButtonRef.current) return;

    authService.renderGoogleButton(
      googleButtonRef.current,
      (user) => onLoginSuccess?.(user),
      () => {},
      {
        theme: theme === 'dark' ? 'filled_black' : 'outline',
        width: 270,
      }
    );
  }, [theme, onLoginSuccess]);

  return (
    <div className="welcome-page">
      {/* Ambient background glows */}
      <div className="welcome-ambient-glow" />

      {/* TOP HEADER */}
      <header className="welcome-nav">
        <div className="welcome-brand">
          <img src="/logo.png" alt="FinVn" />
          <span>FinVn</span>
          <span className="welcome-pro">PRO</span>
        </div>

        <div className="welcome-status-badge">
          <span className="welcome-pulse-dot" />
          <span>Local-First PostgreSQL • Sẵn sàng kết nối</span>
        </div>

        {onToggleTheme && (
          <button
            type="button"
            className="welcome-theme-button"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
            aria-label={theme === 'dark' ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
          >
            {theme === 'dark' ? <Moon size={15} color="#818cf8" /> : <Sun size={15} color="#f59e0b" />}
            <span>{theme === 'dark' ? 'Tối' : 'Sáng'}</span>
          </button>
        )}
      </header>

      {/* MAIN VIEWPORT (FITS 100% WITHOUT SCROLLING) */}
      <main className="welcome-main">
        <div className="welcome-copy">
          <div className="welcome-eyebrow">
            <Sparkles size={14} />
            <span>QUẢN LÝ TÀI CHÍNH CÁ NHÂN</span>
          </div>

          <h1>
            Tiền bạc rõ ràng,
            <span className="welcome-gradient-text"> cuộc sống nhẹ nhàng.</span>
          </h1>

          <p className="welcome-description">
            Tự động đồng bộ số dư, thu chi và giao dịch ngân hàng trong một nơi gọn gàng.
          </p>

          {/* COMPACT GLASS LOGIN CARD */}
          <section className="welcome-login-card" aria-labelledby="welcome-login-title">
            <div className="welcome-login-icon">
              <Database size={18} />
            </div>

            <div className="welcome-card-header">
              <h2 id="welcome-login-title">Đăng nhập để tiếp tục</h2>
              <p>Dữ liệu tài chính được lưu an toàn trên PostgreSQL cục bộ máy bạn.</p>
            </div>

            <div className="welcome-google-button" ref={googleButtonRef} />

            {/* Supported Banks Row inside card */}
            <div className="welcome-banks-row">
              {supportedBanks.map((b) => (
                <span
                  key={b.name}
                  className="welcome-bank-badge"
                  style={{ color: b.color, background: b.bg, borderColor: b.border }}
                >
                  <span className="welcome-bank-dot" style={{ background: b.color }} />
                  {b.name}
                </span>
              ))}
            </div>

            <span className="welcome-privacy-note">
              <Lock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
              Đăng nhập an toàn qua Google OAuth 2.0 • Không lưu mật khẩu
            </span>
          </section>
        </div>

        {/* 3 FEATURE PILLS */}
        <ul className="welcome-highlights" aria-label="Tính năng chính">
          {highlights.map(({ icon: Icon, label }) => (
            <li key={label}>
              <span className="welcome-highlight-icon">
                <Icon size={16} />
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </main>

      {/* FOOTER */}
      <footer className="welcome-footer">
        FinVn PRO <span>•</span> Vietcombank <span>•</span> MBBank <span>•</span> BIDV <span>•</span> Bảo mật Local-First 100%
      </footer>
    </div>
  );
};
