import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getThemeDetails = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={19} color="var(--accent-income, #10b981)" style={{ flexShrink: 0 }} />,
          borderColor: 'rgba(16, 185, 129, 0.4)',
          borderLeft: '4px solid var(--accent-income, #10b981)',
        };
      case 'error':
        return {
          icon: <AlertCircle size={19} color="var(--accent-expense, #e11d48)" style={{ flexShrink: 0 }} />,
          borderColor: 'rgba(225, 29, 72, 0.4)',
          borderLeft: '4px solid var(--accent-expense, #e11d48)',
        };
      default:
        return {
          icon: <Info size={19} color="var(--accent-primary, #6366f1)" style={{ flexShrink: 0 }} />,
          borderColor: 'rgba(99, 102, 241, 0.4)',
          borderLeft: '4px solid var(--accent-primary, #6366f1)',
        };
    }
  };

  const themeDetails = getThemeDetails();

  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 18px',
        background: 'var(--bg-secondary)',
        border: `1px solid ${themeDetails.borderColor}`,
        borderLeft: themeDetails.borderLeft,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        pointerEvents: 'auto',
      }}
    >
      {themeDetails.icon}
      <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
        {toast.message}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px',
        }}
        title="Đóng thông báo"
      >
        <X size={16} />
      </button>
    </div>
  );
};
