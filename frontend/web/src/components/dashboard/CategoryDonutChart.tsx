import React, { useState } from 'react';
import { Transaction } from '../../types/transaction';
import { formatVND } from '../../utils/currency';
import { getCategoryDef } from '../../constants/categories';
import { PieChart as PieIcon } from 'lucide-react';

interface CategoryDonutChartProps {
  transactions: Transaction[];
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ transactions }) => {
  const [activeType, setActiveType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const filtered = transactions.filter((t) => t.type === activeType);
  const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);

  // Group by category
  const categoryMap: Record<string, number> = {};
  filtered.forEach((t) => {
    const cat = t.userCategory || t.category || 'Khác';
    categoryMap[cat] = (categoryMap[cat] || 0) + t.amount;
  });

  const categories = Object.keys(categoryMap)
    .map((name) => ({
      name,
      amount: categoryMap[name],
      percentage: totalAmount > 0 ? (categoryMap[name] / totalAmount) * 100 : 0,
      def: getCategoryDef(name),
    }))
    .sort((a, b) => b.amount - a.amount);

  // SVG Donut calculations
  const radius = 65;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  return (
    <div className="glass-card" style={{ padding: '24px', flex: 1, minWidth: '320px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PieIcon size={18} color="#06b6d4" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Phân bổ theo danh mục</h3>
        </div>
        <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
          <button
            onClick={() => setActiveType('EXPENSE')}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeType === 'EXPENSE' ? 'rgba(244, 63, 94, 0.2)' : 'transparent',
              color: activeType === 'EXPENSE' ? '#fb7185' : 'var(--text-secondary)',
            }}
          >
            Chi tiêu
          </button>
          <button
            onClick={() => setActiveType('INCOME')}
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeType === 'INCOME' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: activeType === 'INCOME' ? '#10b981' : 'var(--text-secondary)',
            }}
          >
            Thu nhập
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Chưa có giao dịch {activeType === 'EXPENSE' ? 'chi tiêu' : 'thu nhập'} trong kỳ này.
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '24px' }}>
          {/* SVG Donut */}
          <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto' }}>
            <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth={strokeWidth}
              />
              {categories.map((c) => {
                const strokeDasharray = `${(c.percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -accumulatedAngle;
                accumulatedAngle += (c.percentage / 100) * circumference;
                const isHovered = hoveredCategory === c.name;

                return (
                  <circle
                    key={c.name}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke={c.def.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    style={{
                      transition: 'stroke-width 0.2s ease, opacity 0.2s',
                      opacity: hoveredCategory && !isHovered ? 0.45 : 1,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setHoveredCategory(c.name)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  />
                );
              })}
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <span style={{ fontSize: '0.675rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Tổng {activeType === 'EXPENSE' ? 'chi' : 'thu'}
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {formatVND(totalAmount)}
              </span>
            </div>
          </div>

          {/* Legend list */}
          <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categories.slice(0, 5).map((c) => (
              <div
                key={c.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: hoveredCategory === c.name ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                }}
                onMouseEnter={() => setHoveredCategory(c.name)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: c.def.color,
                    }}
                  />
                  <span style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {c.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {c.percentage.toFixed(0)}%
                  </span>
                  <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
                    {formatVND(c.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
