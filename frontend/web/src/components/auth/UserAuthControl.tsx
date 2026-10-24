import React, { useEffect, useRef, useState } from 'react';
import { User, LogOut, CheckCircle2, ChevronDown, ShieldCheck } from 'lucide-react';
import { authService } from '../../services/authService';
import { UserProfile } from '../../types/user';

interface UserAuthControlProps {
  theme?: 'dark' | 'light';
  onLoginSuccess?: (user: UserProfile) => void;
  onLogout?: () => void;
}

export const UserAuthControl: React.FC<UserAuthControlProps> = ({
  theme = 'dark',
  onLoginSuccess,
  onLogout,
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(authService.getCurrentUser());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = authService.subscribe((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Khởi tạo nút Google Sign In khi chưa đăng nhập
  useEffect(() => {
    if (!currentUser && googleBtnRef.current) {
      authService.renderGoogleButton(
        googleBtnRef.current,
        (user) => {
          setLoginError(null);
          if (onLoginSuccess) onLoginSuccess(user);
        },
        (err) => {
          setLoginError(err);
        },
        {
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          width: 210,
        }
      );
    }
  }, [currentUser, theme]);

  const handleLogout = () => {
    authService.logout();
    setIsDropdownOpen(false);
    if (onLogout) onLogout();
  };

  if (currentUser) {
    const avatarLetter = (currentUser.full_name || currentUser.email || 'U')[0].toUpperCase();

    return (
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px 4px 6px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            boxShadow: 'var(--shadow-sm)',
          }}
          title={`Tài khoản: ${currentUser.full_name} (${currentUser.email})`}
        >
          {currentUser.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.full_name}
              referrerPolicy="no-referrer"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid var(--accent-primary)',
              }}
            />
          ) : (
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--accent-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {avatarLetter}
            </div>
          )}

          <div style={{ textAlign: 'left', maxWidth: '120px' }}>
            <div
              style={{
                fontSize: '0.825rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentUser.full_name}
            </div>
          </div>

          <ChevronDown size={14} color="var(--text-muted)" />
        </button>

        {isDropdownOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              width: '260px',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-hover)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.3)',
              padding: '16px',
              zIndex: 1000,
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.full_name}
                  referrerPolicy="no-referrer"
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--accent-primary)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                  }}
                >
                  {avatarLetter}
                </div>
              )}
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {currentUser.full_name}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={currentUser.email}
                >
                  {currentUser.email}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: 'var(--accent-income)',
                fontWeight: 600,
                marginBottom: '12px',
              }}
            >
              <CheckCircle2 size={13} />
              <span>Đã kết nối tài khoản Google</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--accent-expense)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
            >
              <LogOut size={14} />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Khi chưa đăng nhập: Hiển thị container Google Sign In
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', position: 'relative' }}>
      <div
        ref={googleBtnRef}
        style={{
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
        }}
      />
      {loginError && (
        <span
          style={{
            fontSize: '0.72rem',
            color: 'var(--accent-expense)',
            marginTop: '4px',
            position: 'absolute',
            top: '100%',
            right: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {loginError}
        </span>
      )}
    </div>
  );
};
