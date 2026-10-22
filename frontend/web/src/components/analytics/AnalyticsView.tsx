import React from 'react';
import { Transaction, FinancialSummary } from '../../types/transaction';
import { formatVND } from '../../utils/currency';
import { getCategoryDef } from '../../constants/categories';
import { PieChart, TrendingUp, TrendingDown, Target, Award, ArrowUpRight } from 'lucide-react';

interface AnalyticsViewProps {
  transactions: Transaction[];
  summary: FinancialSummary;
  dateRangeLabel: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  summary,
  dateRangeLabel,
}) => {
  const expenseTxs = transactions.filter((t) => t.type === 'EXPENSE');
  const incomeTxs = transactions.filter((t) => t.type === 'INCOME');

  // Category breakdown for expenses
  const categoryMap: Record<string, { count: number; total: number }> = {};
  expenseTxs.forEach((t) => {
    const cat = t.userCategory || t.category || 'Khác';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { count: 0, total: 0 };
    }
    categoryMap[cat].count += 1;
    categoryMap[cat].total += t.amount;
  });

  const categoryList = Object.entries(categoryMap)
    .map(([name, data]) => ({
      name,
      ...data,
      percent: summary.totalExpense > 0 ? (data.total / summary.totalExpense) * 100 : 0,
      def: getCategoryDef(name),
    }))
    .sort((a, b) => b.total - a.total);

  // Top 5 biggest expenses
  const topExpenses = [...expenseTxs].sort((a, b) => b.amount - a.amount).slice(0, 5);

  const savingsRate =
    summary.totalIncome > 0
      ? Math.max(0, Math.min(100, Math.round((summary.netAmount / summary.totalIncome) * 100)))
      : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      {/* Overview KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              <Award size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tỷ lệ tiết kiệm ròng</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800 }}>{savingsRate}%</div>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {savingsRate >= 20
              ? 'Tuyệt vời! Bạn đang duy trì tỷ lệ tiết kiệm trên 20% theo quy tắc 50/30/20.'
              : 'Hãy chú ý các khoản chi tiêu tùy ý để tối ưu hóa tỷ lệ tiết kiệm tháng này.'}
          </p>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' }}>
              <TrendingDown size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tổng giao dịch chi tiêu</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800 }}>{expenseTxs.length} giao dịch</div>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Trung bình: {expenseTxs.length > 0 ? formatVND(Math.round(summary.totalExpense / expenseTxs.length)) : '0 ₫'} / giao dịch.
          </p>
        </div>

        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tổng giao dịch thu nhập</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800 }}>{incomeTxs.length} giao dịch</div>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Tổng dòng tiền vào kỳ {dateRangeLabel}: +{formatVND(summary.totalIncome)}.
          </p>
        </div>
      </div>

      {/* Main Breakdown Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Category Breakdown Table */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Chi tiêu theo nhóm danh mục</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{dateRangeLabel}</span>
          </div>

          {categoryList.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Không có dữ liệu chi tiêu trong kỳ này
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {categoryList.map((c) => (
                <div key={c.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.def.color }} />
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({c.count} GD)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 700 }}>{formatVND(c.total)}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.785rem', width: '38px', textAlign: 'right' }}>
                        {c.percent.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '6px', borderRadius: '9999px', background: 'rgba(255, 255, 255, 0.08)' }}>
                    <div
                      style={{
                        width: `${c.percent}%`,
                        height: '100%',
                        borderRadius: '9999px',
                        background: c.def.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top 5 Biggest Expenses */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Top 5 khoản chi lớn nhất</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lớn nhất đến nhỏ nhất</span>
          </div>

          {topExpenses.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Chưa có chi tiêu nào được ghi nhận
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topExpenses.map((tx, idx) => (
                <div
                  key={tx.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: 'rgba(244, 63, 94, 0.2)',
                        color: '#fb7185',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {tx.userNote || tx.description}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {tx.bankAccount?.bankName} • {tx.userCategory || tx.category}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fb7185' }}>
                    -{formatVND(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
