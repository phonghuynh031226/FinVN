import React, { useState } from 'react';
import { Transaction } from '../../types/transaction';
import { formatVND, formatCompactVND } from '../../utils/currency';
import { formatDisplayDate, getLocalDateString } from '../../utils/date';
import { BarChart3, TrendingUp, ArrowDownLeft, ArrowUpRight, Calendar, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';

interface CashflowChartProps {
  transactions: Transaction[];
  startDate?: string;
  endDate?: string;
}

export const CashflowChart: React.FC<CashflowChartProps> = ({ transactions, startDate, endDate }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<'BAR' | 'AREA'>('BAR');

  // Group transactions by local Vietnam date (YYYY-MM-DD)
  const dateMap: Record<string, { income: number; expense: number; count: number; txs: Transaction[] }> = {};

  transactions.forEach((tx) => {
    const day = getLocalDateString(tx.transactionDate);
    if (!day) return;
    if (!dateMap[day]) {
      dateMap[day] = { income: 0, expense: 0, count: 0, txs: [] };
    }
    if (tx.type === 'INCOME') {
      dateMap[day].income += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      dateMap[day].expense += tx.amount;
    }
    dateMap[day].count += 1;
    dateMap[day].txs.push(tx);
  });

  // Tạo danh sách đầy đủ tất cả các ngày liên tục trong khoảng [startDate, endDate]
  let allDays: string[] = [];
  if (startDate && endDate) {
    let cur = dayjs(startDate);
    const end = dayjs(endDate);
    let guard = 0;
    while ((cur.isBefore(end, 'day') || cur.isSame(end, 'day')) && guard < 65) {
      allDays.push(cur.format('YYYY-MM-DD'));
      cur = cur.add(1, 'day');
      guard++;
    }
  }

  // Fallback nếu không truyền khoảng ngày
  if (allDays.length === 0) {
    const recordedDays = Object.keys(dateMap).sort();
    if (recordedDays.length > 0) {
      allDays = recordedDays.slice(-14);
    } else {
      allDays = [dayjs().format('YYYY-MM-DD')];
    }
  }

  const totalDays = allDays.length;

  // Tính tổng thu, tổng chi và giá trị đỉnh trong kỳ
  let totalPeriodIncome = 0;
  let totalPeriodExpense = 0;
  let actualMaxVal = 0;

  allDays.forEach((d) => {
    const item = dateMap[d];
    if (item) {
      totalPeriodIncome += item.income;
      totalPeriodExpense += item.expense;
      if (item.income > actualMaxVal) actualMaxVal = item.income;
      if (item.expense > actualMaxVal) actualMaxVal = item.expense;
    }
  });

  const netPeriod = totalPeriodIncome - totalPeriodExpense;
  // Dynamic scale: thêm 15% khoảng thở để cột đỉnh không chạm trần
  const maxVal = actualMaxVal > 0 ? actualMaxVal * 1.15 : 100000;

  // Thứ trong tuần tiếng Việt
  const getWeekdayShort = (dateStr: string) => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[dayjs(dateStr).day()];
  };

  // Giữ nhãn ngày thoáng, đồng thời luôn đánh dấu ngày đầu và ngày cuối kỳ.
  const labelInterval = totalDays > 8 ? Math.ceil((totalDays - 1) / 6) : 1;
  const labelMeta = allDays.map((_, index) => ({
    show:
      totalDays <= 8 ||
      index === 0 ||
      index === totalDays - 1 ||
      index % labelInterval === 0,
  }));

  return (
    <div
      className="glass-card"
      style={{
        padding: '16px 18px',
        flex: 1,
        minWidth: '320px',
        height: '360px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 1. Header Khung Biểu Đồ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <BarChart3 size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
              Dòng tiền theo thời gian
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {totalDays === 1
                ? 'Hôm nay'
                : `${totalDays} ngày (${dayjs(allDays[0]).format('DD/MM')} – ${dayjs(allDays[totalDays - 1]).format('DD/MM')})`}
            </span>
          </div>
        </div>

        {/* Legend & Toggle Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {totalDays > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent-income)' }} />
                <span style={{ color: 'var(--accent-income)', fontWeight: 700 }}>+{formatCompactVND(totalPeriodIncome)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent-expense)' }} />
                <span style={{ color: 'var(--accent-expense)', fontWeight: 700 }}>-{formatCompactVND(totalPeriodExpense)}</span>
              </div>
            </div>
          )}

          {totalDays > 3 && (
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-tertiary)',
                padding: '2px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setChartMode('BAR')}
                style={{
                  padding: '3px 7px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  background: chartMode === 'BAR' ? 'var(--accent-primary-gradient)' : 'transparent',
                  color: chartMode === 'BAR' ? '#ffffff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Chế độ cột"
              >
                <BarChart3 size={13} />
              </button>
              <button
                type="button"
                onClick={() => setChartMode('AREA')}
                style={{
                  padding: '3px 7px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  background: chartMode === 'AREA' ? 'var(--accent-primary-gradient)' : 'transparent',
                  color: chartMode === 'AREA' ? '#ffffff' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Chế độ đường sóng xu hướng"
              >
                <TrendingUp size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. CHẾ ĐỘ RIÊNG CHO BỘ LỌC "HÔM NAY" (1 NGÀY DUY NHẤT) */}
      {totalDays === 1 ? (
        (() => {
          const todayStr = allDays[0];
          const todayData = dateMap[todayStr] || { income: 0, expense: 0, count: 0, txs: [] };
          const hasTodayActivity = todayData.income > 0 || todayData.expense > 0;
          const maxAmount = Math.max(todayData.income, todayData.expense, 1);
          const incomePct = Math.round((todayData.income / maxAmount) * 100);
          const expensePct = Math.round((todayData.expense / maxAmount) * 100);

          return (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '6px 4px 2px 4px',
              }}
            >
              {/* So sánh 2 thanh Thu nhập & Chi tiêu hôm nay */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
                {/* Thanh Thu nhập */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
                      <ArrowDownLeft size={16} /> Tiền vào hôm nay
                    </div>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>
                      +{formatVND(todayData.income)}
                    </span>
                  </div>
                  <div style={{ height: '14px', width: '100%', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${hasTodayActivity ? Math.max(8, incomePct) : 0}%`,
                        background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                        borderRadius: '6px',
                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Thanh Chi tiêu */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#fb7185', fontWeight: 600 }}>
                      <ArrowUpRight size={16} /> Tiền ra hôm nay
                    </div>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fb7185' }}>
                      -{formatVND(todayData.expense)}
                    </span>
                  </div>
                  <div style={{ height: '14px', width: '100%', background: 'rgba(251, 113, 133, 0.1)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${hasTodayActivity ? Math.max(8, expensePct) : 0}%`,
                        background: 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)',
                        borderRadius: '6px',
                        boxShadow: '0 0 10px rgba(244, 63, 94, 0.5)',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Tóm tắt dòng tiền ròng & giao dịch trong ngày */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Chênh lệch dòng tiền hôm nay</div>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: netPeriod >= 0 ? '#06b6d4' : '#ef4444',
                    }}
                  >
                    {netPeriod >= 0 ? `+${formatVND(netPeriod)}` : `-${formatVND(Math.abs(netPeriod))}`}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Số giao dịch</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {todayData.count} phát sinh
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        /* 3. CHẾ ĐỘ ĐA NGÀY (7 NGÀY, THÁNG NÀY, 30 NGÀY) */
        <div
          style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            paddingTop: '16px',
            paddingBottom: totalDays > 8 ? '36px' : '22px',
          }}
        >
          {/* Đường lưới ngang nền (Grid lines) & Nhãn trục Y */}
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 0,
              right: 0,
              bottom: totalDays > 8 ? 38 : 24,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {[1, 0.5, 0].map((ratio) => (
              <div
                key={ratio}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    width: '36px',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {ratio === 0 ? '0 ₫' : formatCompactVND(maxVal * ratio)}
                </span>
                <div
                  style={{
                    flex: 1,
                    borderTop: '1px dashed var(--border-subtle)',
                    height: 0,
                  }}
                />
              </div>
            ))}
          </div>

          {/* CHẾ ĐỘ 1: BIỂU ĐỒ CỘT (BAR CHART) */}
          {chartMode === 'BAR' ? (
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                alignItems: 'flex-end',
                height: '100%',
                paddingLeft: '44px',
                gap: totalDays <= 8 ? '8px' : totalDays <= 16 ? '4px' : '2px',
              }}
            >
              {allDays.map((day, idx) => {
                const data = dateMap[day] || { income: 0, expense: 0, count: 0, txs: [] };
                const hasActivity = data.income > 0 || data.expense > 0;
                const chartAvailableHeight = totalDays > 8 ? 155 : 175; // px khả dụng cho cột
                const incomeHeight = data.income > 0 ? Math.max(6, Math.round((data.income / maxVal) * chartAvailableHeight)) : 0;
                const expenseHeight = data.expense > 0 ? Math.max(6, Math.round((data.expense / maxVal) * chartAvailableHeight)) : 0;
                const isHovered = hoveredIdx === idx;

                const meta = labelMeta[idx] || { show: false, staggered: false };
                const showLabel = meta.show || isHovered;

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
                    {/* Tooltip khi rê chuột */}
                    {isHovered && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          marginBottom: '8px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-hover)',
                          backdropFilter: 'blur(12px)',
                          borderRadius: '10px',
                          padding: '9px 13px',
                          fontSize: '0.75rem',
                          zIndex: 30,
                          whiteSpace: 'nowrap',
                          boxShadow: 'var(--shadow-lg)',
                          pointerEvents: 'none',
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: '5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={13} color="var(--accent-primary)" />
                          {getWeekdayShort(day)}, {dayjs(day).format('DD/MM/YYYY')}
                        </div>
                        {hasActivity ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div style={{ color: 'var(--accent-income)', fontWeight: 700 }}>+ {formatVND(data.income)}</div>
                            <div style={{ color: 'var(--accent-expense)', fontWeight: 700 }}>- {formatVND(data.expense)}</div>
                            <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '4px', paddingTop: '4px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                              {data.count} giao dịch
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Không phát sinh giao dịch</div>
                        )}
                      </div>
                    )}

                    {/* Các cột bar hoặc dấu chấm mốc */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: totalDays <= 8 ? '4px' : '2px',
                        width: '100%',
                        justifyContent: 'center',
                        minHeight: '4px',
                      }}
                    >
                      {hasActivity ? (
                        <>
                          {incomeHeight > 0 && (
                            <div
                              style={{
                                width: totalDays <= 8 ? '16px' : '45%',
                                maxWidth: '16px',
                                height: `${incomeHeight}px`,
                                background: 'linear-gradient(180deg, var(--accent-income) 0%, rgba(16, 185, 129, 0.4) 100%)',
                                borderRadius: '4px 4px 1px 1px',
                                transition: 'height 0.3s ease, filter 0.2s',
                                filter: isHovered ? 'brightness(1.2) drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))' : 'none',
                              }}
                            />
                          )}
                          {expenseHeight > 0 && (
                            <div
                              style={{
                                width: totalDays <= 8 ? '16px' : '45%',
                                maxWidth: '16px',
                                height: `${expenseHeight}px`,
                                background: 'linear-gradient(180deg, var(--accent-expense) 0%, rgba(244, 63, 94, 0.4) 100%)',
                                borderRadius: '4px 4px 1px 1px',
                                transition: 'height 0.3s ease, filter 0.2s',
                                filter: isHovered ? 'brightness(1.2) drop-shadow(0 0 6px rgba(244, 63, 94, 0.5))' : 'none',
                              }}
                            />
                          )}
                        </>
                      ) : (
                        <div
                          style={{
                            width: '4px',
                            height: '1px',
                            background: isHovered ? 'var(--accent-primary)' : 'var(--border-subtle)',
                            transition: 'background 0.2s',
                          }}
                        />
                      )}
                    </div>

                    {/* Nhãn ngày trục hoành (X-Axis) - Hiển thị ngày cho ngày có lịch sử, dấu chấm cho ngày trống */}
                    {showLabel ? (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: -18,
                          fontSize: totalDays <= 8 ? '0.72rem' : '0.65rem',
                          color: isHovered
                            ? 'var(--accent-primary)'
                            : hasActivity
                            ? 'var(--text-primary)'
                            : 'var(--text-muted)',
                          fontWeight: hasActivity || isHovered ? 700 : 600,
                          whiteSpace: 'nowrap',
                          letterSpacing: '-0.3px',
                          transition: 'color 0.15s ease',
                          ...(idx === 0
                            ? { left: 0 }
                            : idx === totalDays - 1
                            ? { right: 0 }
                            : { left: '50%', transform: 'translateX(-50%)' }),
                        }}
                      >
                        {totalDays <= 8 ? `${getWeekdayShort(day)} ` : ''}
                        {day.slice(8, 10)}/{day.slice(5, 7)}
                      </span>
                    ) : (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: -11,
                          width: '3px',
                          height: '3px',
                          borderRadius: '50%',
                          background: isHovered ? 'var(--accent-primary)' : 'var(--border-subtle)',
                          transition: 'background 0.2s',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* CHẾ ĐỘ 2: ĐƯỜNG CONG SÓNG SVG (AREA SPLINE CHART) */
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                width: '100%',
                height: '100%',
                paddingLeft: '44px',
                boxSizing: 'border-box',
              }}
            >
              <svg
                style={{ width: '100%', height: '100%', overflow: 'visible' }}
                viewBox={`0 0 ${allDays.length * 20} 180`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="areaIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="areaExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {(() => {
                  const width = allDays.length * 20;
                  const height = 170;
                  const stepX = width / (allDays.length - 1 || 1);

                  const incomePoints = allDays.map((d, i) => {
                    const val = dateMap[d]?.income || 0;
                    const y = height - (val / maxVal) * height;
                    return { x: i * stepX, y };
                  });

                  const expensePoints = allDays.map((d, i) => {
                    const val = dateMap[d]?.expense || 0;
                    const y = height - (val / maxVal) * height;
                    return { x: i * stepX, y };
                  });

                  const buildPath = (pts: { x: number; y: number }[]) => {
                    if (pts.length === 0) return '';
                    let p = `M ${pts[0].x} ${pts[0].y}`;
                    for (let i = 1; i < pts.length; i++) {
                      const prev = pts[i - 1];
                      const curr = pts[i];
                      const cx = (prev.x + curr.x) / 2;
                      p += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
                    }
                    return p;
                  };

                  const incomeLine = buildPath(incomePoints);
                  const expenseLine = buildPath(expensePoints);
                  const incomeArea = `${incomeLine} L ${width} ${height} L 0 ${height} Z`;
                  const expenseArea = `${expenseLine} L ${width} ${height} L 0 ${height} Z`;

                  return (
                    <>
                      <path d={incomeArea} fill="url(#areaIncomeGrad)" />
                      <path d={incomeLine} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

                      <path d={expenseArea} fill="url(#areaExpenseGrad)" />
                      <path d={expenseLine} fill="none" stroke="#fb7185" strokeWidth="2.5" strokeLinecap="round" />
                    </>
                  );
                })()}
              </svg>

              {/* Nhãn 2 đầu mốc thời gian */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -18,
                  left: 44,
                  right: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                <span>{dayjs(allDays[0]).format('DD/MM/YYYY')}</span>
                <span>{dayjs(allDays[Math.floor(allDays.length / 2)]).format('DD/MM/YYYY')}</span>
                <span>{dayjs(allDays[allDays.length - 1]).format('DD/MM/YYYY')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
