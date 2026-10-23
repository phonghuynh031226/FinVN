import React from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Percent,
} from 'lucide-react';
import { FinancialSummary } from '../../types/transaction';
import { formatVND } from '../../utils/currency';

interface StatCardsProps {
  summary: FinancialSummary;
  dateRangeLabel: string;
  accountCount: number;
  isAggregated: boolean;
}

export const StatCards: React.FC<StatCardsProps> = ({
  summary,
  dateRangeLabel,
  accountCount,
  isAggregated,
}) => {
  const savingsRate =
    summary.totalIncome > 0
      ? Math.max(0, Math.min(100, Math.round((summary.netAmount / summary.totalIncome) * 100)))
      : 0;

  const isNetPositive = summary.netAmount >= 0;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '14px',
        marginBottom: '12px',
      }}
    >
      {/* 1. Tổng số dư hiện tại */}
      <div
        className="glass-card animate-fade-in"
        style={{
          padding: '12px 18px',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, var(--bg-card) 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, transparent 70%)',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Tổng số dư thực tế
          </span>
          <div
            style={{
              padding: '8px',
              borderRadius: '12px',
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#818cf8',
            }}
          >
            <Wallet size={20} />
          </div>
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
          {formatVND(summary.totalBalance)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.785rem', color: 'var(--text-muted)' }}>
          <span className="badge badge-neutral">
            {accountCount} {isAggregated ? 'tài khoản hoạt động' : 'tài khoản được chọn'}
          </span>
          <span>{isAggregated ? 'Đã cộng dồn' : 'Số dư riêng lẻ'}</span>
        </div>
      </div>

      {/* 2. Tiền vào (Thu nhập) */}
      <div
        className="glass-card animate-fade-in"
        style={{
          padding: '12px 18px',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-card) 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Tiền vào (Thu nhập)
          </span>
          <div
            style={{
              padding: '8px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
            }}
          >
            <ArrowDownLeft size={20} />
          </div>
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginBottom: '8px' }}>
          +{formatVND(summary.totalIncome)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.785rem', color: 'var(--text-muted)' }}>
          <span className="badge badge-income">{dateRangeLabel}</span>
        </div>
      </div>

      {/* 3. Tiền ra (Chi tiêu) */}
      <div
        className="glass-card animate-fade-in"
        style={{
          padding: '12px 18px',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, var(--bg-card) 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Tiền ra (Chi tiêu)
          </span>
          <div
            style={{
              padding: '8px',
              borderRadius: '12px',
              background: 'rgba(244, 63, 94, 0.12)',
              color: '#fb7185',
            }}
          >
            <ArrowUpRight size={20} />
          </div>
        </div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fb7185', marginBottom: '8px' }}>
          -{formatVND(summary.totalExpense)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.785rem', color: 'var(--text-muted)' }}>
          <span className="badge badge-expense">{dateRangeLabel}</span>
        </div>
      </div>

      {/* 4. Chênh lệch / Thu ròng */}
      <div
        className="glass-card animate-fade-in"
        style={{
          padding: '12px 18px',
          position: 'relative',
          overflow: 'hidden',
          background: isNetPositive
            ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, var(--bg-card) 100%)'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-card) 100%)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Chênh lệch (Thu - Chi)
          </span>
          <div
            style={{
              padding: '8px',
              borderRadius: '12px',
              background: isNetPositive ? 'rgba(6, 182, 212, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: isNetPositive ? '#06b6d4' : '#ef4444',
            }}
          >
            <TrendingUp size={20} />
          </div>
        </div>
        <div
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: isNetPositive ? '#06b6d4' : '#ef4444',
            marginBottom: '8px',
          }}
        >
          {isNetPositive ? '+' : ''}
          {formatVND(summary.netAmount)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.785rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Tỷ lệ tiết kiệm:</span>
          <span style={{ fontWeight: 700, color: isNetPositive ? '#06b6d4' : '#ef4444' }}>
            {savingsRate}%
          </span>
        </div>
        {/* Progress bar */}
        <div
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '9999px',
            backgroundColor: 'var(--border-subtle)',
            marginTop: '6px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${savingsRate}%`,
              height: '100%',
              borderRadius: '9999px',
              backgroundColor: isNetPositive ? '#06b6d4' : '#ef4444',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
};
