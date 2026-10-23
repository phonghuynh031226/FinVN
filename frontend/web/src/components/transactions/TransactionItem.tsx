import React from 'react';
import { Transaction } from '../../types/transaction';
import { formatSignedVND } from '../../utils/currency';
import { formatDisplayDateTime } from '../../utils/date';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface TransactionItemProps {
  transaction: Transaction;
  onClick: (transaction: Transaction) => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onClick }) => {
  const isIncome = transaction.type === 'INCOME';

  return (
    <div
      onClick={() => onClick(transaction)}
      className="glass-card animate-fade-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '9px 12px',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        gap: '10px',
        background: 'rgba(255, 255, 255, 0.03)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateX(3px)';
        e.currentTarget.style.borderColor = isIncome ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
      }}
    >
      {/* Left: Type Icon & Details */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isIncome ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            color: isIncome ? '#10b981' : '#fb7185',
            flexShrink: 0,
          }}
        >
          {isIncome ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
        </div>

        <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
          <div
            style={{
              marginBottom: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {transaction.userNote || transaction.description || 'Giao dịch không tên'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.785rem', color: 'var(--text-muted)' }}>
            <span>{formatDisplayDateTime(transaction.transactionDate)}</span>
            {transaction.bankAccount?.bankName && (
              <>
                <span>•</span>
                <span>{transaction.bankAccount.bankName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: Amount */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontSize: '1.05rem',
            fontWeight: 800,
            color: isIncome ? '#10b981' : '#fb7185',
          }}
        >
          {formatSignedVND(transaction.amount, transaction.type)}
        </div>
      </div>
    </div>
  );
};
