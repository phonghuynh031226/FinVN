import React from 'react';
import { Transaction } from '../../types/transaction';
import { formatSignedVND } from '../../utils/currency';
import { formatDisplayDateTime } from '../../utils/date';
import { X, Shield, Calendar, CreditCard, FileText, Wifi } from 'lucide-react';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (id: string, updates: { userCategory?: string; userNote?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !transaction) return null;

  const isIncome = transaction.type === 'INCOME';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="glass-card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '28px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                background: isIncome ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                color: isIncome ? '#10b981' : '#fb7185',
              }}
            >
              {isIncome ? 'Thu nhập (+)' : 'Chi tiêu (-)'}
            </span>
            {transaction.source === 'BANK_API' && (
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Wifi size={11} /> API Ngân hàng
              </span>
            )}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Big Amount */}
        <div style={{ textAlign: 'center', margin: '16px 0 24px 0' }}>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: isIncome ? '#10b981' : '#fb7185',
            }}
          >
            {formatSignedVND(transaction.amount, transaction.type)}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {formatDisplayDateTime(transaction.transactionDate)}
          </div>
        </div>

        {/* Details Grid */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: 'var(--bg-tertiary)',
            padding: '18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            fontSize: '0.875rem',
          }}
        >
          {/* Bank */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard size={15} /> Tài khoản:
            </span>
            <span style={{ fontWeight: 600 }}>
              {transaction.bankAccount
                ? `${transaction.bankAccount.bankName} (${transaction.bankAccount.displayName})`
                : 'Mặc định'}
            </span>
          </div>

          {/* Reference code */}
          {transaction.sourceReference && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={15} /> Mã tham chiếu (Ref):
              </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#818cf8' }}>
                {transaction.sourceReference}
              </span>
            </div>
          )}

          {/* Raw Bank Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} /> Nội dung ngân hàng gốc:
            </span>
            <div
              style={{
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                wordBreak: 'break-all',
              }}
            >
              {transaction.description || 'Không có mô tả gốc'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
