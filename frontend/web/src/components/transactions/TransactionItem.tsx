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
        padding: '10px 14px',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        gap: '10px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateX(3px)';
        e.currentTarget.style.borderColor = isIncome ? 'var(--accent-income)' : 'var(--accent-expense)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.03)';
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
            color: isIncome ? 'var(--accent-income)' : 'var(--accent-expense)',
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.785rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            <span>{formatDisplayDateTime(transaction.transactionDate)}</span>
            {transaction.bankAccount?.bankName && (
              <>
                <span style={{ color: 'var(--border-hover)' }}>•</span>
                <span style={{ color: 'var(--text-muted)' }}>{transaction.bankAccount.bankName}</span>
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
            color: isIncome ? 'var(--accent-income)' : 'var(--accent-expense)',
          }}
        >
          {formatSignedVND(transaction.amount, transaction.type)}
        </div>
      </div>
    </div>
  );
};
