import React, { useState } from 'react';
import {
  Receipt,
  CreditCard,
  Zap,
  PieChart,
  Sun,
  Moon,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  LucideIcon,
} from 'lucide-react';

export type TabKey = 'dashboard' | 'transactions' | 'accounts';

interface SidebarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  totalBalance?: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  totalBalance,
  theme,
  onToggleTheme,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed: propCollapsed,
  onToggleCollapse,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [isHoverBtn, setIsHoverBtn] = useState(false);

  const isCollapsed = propCollapsed !== undefined ? propCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    if (onToggleCollapse) onToggleCollapse();
    else setInternalCollapsed(!internalCollapsed);
  };

  const menuItems: { key: TabKey; label: string; icon: LucideIcon; badge?: string }[] = [
    { key: 'dashboard' as TabKey, label: 'Báo cáo phân tích', icon: PieChart },
    { key: 'transactions' as TabKey, label: 'Sổ giao dịch', icon: Receipt },
    { key: 'accounts' as TabKey, label: 'Tài khoản ngân hàng', icon: CreditCard },
  ];

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 40,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      <aside
        className="glass-panel"
        style={{
          width: isCollapsed ? '76px' : '280px',
          height: '100vh',
          position: 'sticky',
          top: 0,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          borderRight: '1px solid var(--border-subtle)',
          padding: isCollapsed ? '24px 10px' : '24px 16px',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s ease',
          transform: isMobileOpen ? 'translateX(0)' : undefined,
          boxSizing: 'border-box',
        }}
      >
        {/* NÚT THU GỌN / MỞ RỘNG MENU (CHỈ KHI NGƯỜI DÙNG BẤM CLICK CHUỘT) */}
        <button
          type="button"
          aria-label={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          title={isCollapsed ? 'Bấm để mở rộng menu' : 'Bấm để thu gọn menu'}
          onClick={toggleCollapse}
          onMouseEnter={() => setIsHoverBtn(true)}
          onMouseLeave={() => setIsHoverBtn(false)}
          style={{
            position: 'absolute',
            top: '28px',
            right: '-13px',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'var(--bg-secondary)',
            border: isHoverBtn ? '1px solid var(--accent-primary)' : '1px solid var(--border-hover)',
            color: isHoverBtn ? 'var(--accent-primary)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-md)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isHoverBtn ? 'scale(1.15)' : 'scale(1)',
            zIndex: 60,
          }}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>

        {/* Logo Brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: isCollapsed ? '0 0 24px 0' : '0 8px 24px 8px',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={24} color="#ffffff" />
          </div>
          {!isCollapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                  FinVn
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: '#818cf8',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                >
                  PRO
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Quản Lý Tài Chính
              </div>
            </div>
          )}
        </div>

        {/* Navigation items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.key;
            return (
              <button
                key={item.key}
                title={isCollapsed ? item.label : undefined}
                onClick={() => {
                  onSelectTab(item.key);
                  if (onCloseMobile) onCloseMobile();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: isCollapsed ? '12px' : '12px 14px',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0.05) 100%)'
                    : 'transparent',
                  color: isActive ? '#818cf8' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.925rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                  borderLeft: !isCollapsed && isActive ? '3px solid #6366f1' : '3px solid transparent',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon size={20} color={isActive ? '#818cf8' : 'currentColor'} style={{ flexShrink: 0 }} />
                {!isCollapsed && <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>}
                {!isCollapsed && item.badge && (
                  <span
                    className="pulse-live"
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      background: 'rgba(16, 185, 129, 0.2)',
                      color: '#10b981',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
                {!isCollapsed && isActive && <ChevronRight size={16} opacity={0.7} />}
              </button>
            );
          })}
        </nav>

        {/* Theme Switcher Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
            overflow: 'hidden',
          }}
        >
          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Chế độ hiển thị</span>
            </div>
          )}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: isCollapsed ? '8px' : '6px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {theme === 'dark' ? (
              <>
                <Moon size={14} color="#818cf8" /> {!isCollapsed && 'Tối'}
              </>
            ) : (
              <>
                <Sun size={14} color="#f59e0b" /> {!isCollapsed && 'Sáng'}
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
