import React, { useState, useEffect } from 'react';
import {
  Menu,
  Calendar,
  Filter,
  ChevronDown,
  Zap,
  Plus,
} from 'lucide-react';
import { BankAccount } from '../../types/bankAccount';
import { TransactionFilter, DateRangePreset } from '../../types/filter';
import { getDateRangeByPreset } from '../../utils/date';
import dayjs from 'dayjs';

interface HeaderProps {
  title: string;
  subtitle: string;
  onOpenMobileMenu: () => void;
  onOpenAddTransaction: () => void;
  onOpenAddAccount: () => void;
  onSyncAll?: () => void;
  isSyncing?: boolean;
  accounts: BankAccount[];
  filter: TransactionFilter;
  onFilterChange: (newFilter: TransactionFilter) => void;
  showFilters?: boolean;
  isAuthenticated?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenMobileMenu,
  onOpenAddAccount,
  onSyncAll,
  isSyncing = false,
  accounts,
  filter,
  onFilterChange,
  showFilters = true,
  isAuthenticated = false,
}) => {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState(filter.dateRange.startDate);
  const [customEnd, setCustomEnd] = useState(filter.dateRange.endDate);

  useEffect(() => {
    setCustomStart(filter.dateRange.startDate);
    setCustomEnd(filter.dateRange.endDate);
  }, [filter.dateRange.startDate, filter.dateRange.endDate]);

  const handleAccountChange = (accountId: string) => {
    onFilterChange({
      ...filter,
      accountId,
    });
  };

  const handlePresetChange = (preset: DateRangePreset) => {
    setShowCustomPicker(false);
    const newRange = getDateRangeByPreset(preset);
    onFilterChange({
      ...filter,
      dateRange: newRange,
    });
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    const newRange = getDateRangeByPreset('CUSTOM', customStart, customEnd);
    onFilterChange({
      ...filter,
      dateRange: newRange,
    });
    setShowCustomPicker(false);
  };

  // 4 mốc chuẩn App Ngân hàng Việt Nam
  const bankDatePresets = [
    {
      preset: 'TODAY' as DateRangePreset,
      label: 'Hôm nay',
      tooltip: 'Chỉ các giao dịch phát sinh trong hôm nay',
    },
    {
      preset: 'LAST_7_DAYS' as DateRangePreset,
      label: '7 ngày qua',
      tooltip: 'Từ 7 ngày trước đến hôm nay',
    },
    {
      preset: 'LAST_30_DAYS' as DateRangePreset,
      label: '30 ngày qua',
      tooltip: 'Từ 30 ngày trước đến ngày hiện tại (ví dụ: 23/09 - 23/10)',
    },
    {
      preset: 'THIS_MONTH' as DateRangePreset,
      label: 'Tháng này',
      tooltip: 'Từ ngày 01 của tháng đến ngày hiện tại (ví dụ: 01/10 - 23/10)',
    },
  ];

  return (
    <header
      className="glass-panel"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        padding: '10px 28px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Title & mobile menu toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onOpenMobileMenu}
            className="btn btn-ghost btn-sm"
            style={{ padding: '8px', display: 'none' }}
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {title}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{subtitle}</p>
          </div>
        </div>

        {/* Right side actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAuthenticated && onSyncAll && (
            <button
              type="button"
              onClick={onSyncAll}
              disabled={isSyncing}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: 'var(--accent-primary)',
                borderColor: 'rgba(99, 102, 241, 0.35)',
                fontWeight: 600,
              }}
              title="Tự động kết nối tất cả ngân hàng, cập nhật số dư thực tế và nạp giao dịch mới"
            >
              <Zap size={14} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Đang tự động đồng bộ...' : '⚡ Tự động đồng bộ ngay'}</span>
            </button>
          )}

        </div>
      </div>

      {/* Global Filter Bar */}
      {showFilters && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '14px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {/* Account selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Tài khoản:
            </span>
            <select
              className="select-field"
              value={filter.accountId}
              onChange={(e) => handleAccountChange(e.target.value)}
              style={{
                width: 'auto',
                padding: '6px 12px',
                fontSize: '0.85rem',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <option value="ALL">Tất cả tài khoản ({accounts.length})</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} - {acc.displayName} (****{acc.accountNumber.slice(-4)})
                </option>
              ))}
            </select>
          </div>

          {/* Date range presets: Chuẩn App Ngân Hàng Việt Nam */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', position: 'relative' }}>
            <Calendar size={15} color="var(--text-muted)" style={{ marginRight: '4px' }} />
            {bankDatePresets.map((item) => {
              const isActive = filter.dateRange.preset === item.preset;
              return (
                <button
                  key={item.preset}
                  onClick={() => handlePresetChange(item.preset)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    background: isActive ? 'var(--accent-primary-gradient)' : 'var(--bg-secondary)',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    borderColor: isActive ? 'transparent' : 'var(--border-subtle)',
                    boxShadow: isActive ? 'var(--shadow-sm)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  {item.label}
                </button>
              );
            })}

            {/* Nút Tùy chọn ngày (Từ ngày - Đến ngày) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowCustomPicker(!showCustomPicker)}
                title="Tự chọn khoảng ngày tùy chỉnh"
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1px solid',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                  background: filter.dateRange.preset === 'CUSTOM' ? 'var(--accent-primary-gradient)' : 'var(--bg-secondary)',
                  color: filter.dateRange.preset === 'CUSTOM' ? '#ffffff' : 'var(--text-secondary)',
                  borderColor: filter.dateRange.preset === 'CUSTOM' ? 'transparent' : 'var(--border-subtle)',
                  boxShadow: filter.dateRange.preset === 'CUSTOM' ? 'var(--shadow-sm)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>
                  {filter.dateRange.preset === 'CUSTOM' ? filter.dateRange.label : 'Tùy chọn ngày'}
                </span>
                <ChevronDown size={14} />
              </button>

              {/* Popup chọn khoảng ngày Từ ngày ... Đến ngày ... */}
              {showCustomPicker && (
                <div
                  className="glass-card animate-fade-in"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    zIndex: 100,
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                    border: '1px solid var(--border-hover)',
                    width: '300px',
                  }}
                >
                  <form onSubmit={handleApplyCustom}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
                      Chọn khoảng thời gian
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          Từ ngày:
                        </label>
                        <input
                          type="date"
                          className="input-field"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          required
                          style={{ padding: '6px 10px', fontSize: '0.85rem', width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          Đến ngày:
                        </label>
                        <input
                          type="date"
                          className="input-field"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          required
                          style={{ padding: '6px 10px', fontSize: '0.85rem', width: '100%' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setShowCustomPicker(false)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 12px', fontSize: '0.785rem' }}
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm"
                          style={{ padding: '5px 14px', fontSize: '0.785rem' }}
                        >
                          Áp dụng
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Nhãn hiển thị chính xác khoảng ngày bộ lọc đang áp dụng */}
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title={`Khoảng ngày đang áp dụng: ${dayjs(filter.dateRange.startDate).format('DD/MM/YYYY')} đến ${dayjs(filter.dateRange.endDate).format('DD/MM/YYYY')}`}
            >
              📅 {dayjs(filter.dateRange.startDate).format('DD/MM/YYYY')} – {dayjs(filter.dateRange.endDate).format('DD/MM/YYYY')}
            </span>
          </div>
        </div>
      )}
    </header>
  );
};
