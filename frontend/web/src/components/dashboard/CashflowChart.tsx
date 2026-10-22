import React, { useState } from 'react';
import { Transaction } from '../../types/transaction';
import { formatVND, formatCompactVND } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/date';
import { BarChart3 } from 'lucide-react';

interface CashflowChartProps {
  transactions: Transaction[];
}

export const CashflowChart: React.FC<CashflowChartProps> = ({ transactions }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Group transactions by date
  const dateMap: Record<string, { income: number; expense: number; count: number }> = {};

  transactions.forEach((tx) => {
    const day = tx.transactionDate.slice(0, 10);
    if (!dateMap[day]) {
      dateMap[day] = { income: 0, expense: 0, count: 0 };
    }
    if (tx.type === 'INCOME') {
      dateMap[day].income += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      dateMap[day].expense += tx.amount;
    }
    dateMap[day].count += 1;
  });

  const sortedDays = Object.keys(dateMap).sort().slice(-10); // Show last 10 active days

  const maxVal = Math.max(
    ...sortedDays.map((d) => Math.max(dateMap[d].income, dateMap[d].expense)),
    1000000
  );

  return (
    <div
      className="glass-card"
      style={{
        padding: '18px 20px',
        flex: 1,
        minWidth: '320px',
        height: '280px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={18} color="#818cf8" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Dòng tiền theo thời gian</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.785rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Tiền vào</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#fb7185' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Tiền ra</span>
          </div>
        </div>
      </div>

      {sortedDays.length === 0 ? (
        <div
          style={{
            padding: '40px 0',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Chưa có dữ liệu giao dịch trong kỳ này để vẽ biểu đồ.
        </div>
      ) : (
        <div
          style={{
            height: '210px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '12px',
            paddingBottom: '28px',
            position: 'relative',
          }}
        >
          {sortedDays.map((day, idx) => {
            const data = dateMap[day];
            const incomeHeight = Math.max(4, Math.round((data.income / maxVal) * 150));
            const expenseHeight = Math.max(4, Math.round((data.expense / maxVal) * 150));
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={day}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  cursor: 'pointer',
                  position: 'relative',
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip on hover */}
                {isHovered && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      marginBottom: '8px',
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid var(--border-hover)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 12px',
                      fontSize: '0.75rem',
                      zIndex: 20,
                      whiteSpace: 'nowrap',
                      boxShadow: 'var(--shadow-lg)',
                      pointerEvents: 'none',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>
                      {formatDisplayDate(day)}
                    </div>
                    <div style={{ color: '#10b981' }}>+ {formatVND(data.income)}</div>
                    <div style={{ color: '#fb7185' }}>- {formatVND(data.expense)}</div>
                  </div>
                )}

                {/* Bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', width: '100%', justifyContent: 'center' }}>
                  <div
                    style={{
                      width: '45%',
                      maxWidth: '18px',
                      height: `${incomeHeight}px`,
                      background: 'linear-gradient(180deg, #10b981 0%, rgba(16, 185, 129, 0.6) 100%)',
                      borderRadius: '4px 4px 1px 1px',
                      transition: 'height 0.3s ease, filter 0.2s',
                      filter: isHovered ? 'brightness(1.2)' : 'none',
                    }}
                  />
                  <div
                    style={{
                      width: '45%',
                      maxWidth: '18px',
                      height: `${expenseHeight}px`,
                      background: 'linear-gradient(180deg, #fb7185 0%, rgba(251, 113, 133, 0.6) 100%)',
                      borderRadius: '4px 4px 1px 1px',
                      transition: 'height 0.3s ease, filter 0.2s',
                      filter: isHovered ? 'brightness(1.2)' : 'none',
                    }}
                  />
                </div>

                {/* Date Label */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    fontSize: '0.7rem',
                    color: isHovered ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: isHovered ? 700 : 500,
                  }}
                >
                  {day.slice(8, 10)}/{day.slice(5, 7)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
