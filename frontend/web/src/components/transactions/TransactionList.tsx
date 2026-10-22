import React from 'react';
import { Transaction } from '../../types/transaction';
import { TransactionFilter } from '../../types/filter';
import { TransactionItem } from './TransactionItem';
import { Search, Download, FileText, Receipt, RefreshCw } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  filter: TransactionFilter;
  onFilterChange: (newFilter: TransactionFilter) => void;
  onSelectTransaction: (transaction: Transaction) => void;
  onOpenAddModal: () => void;
  onExportCSV: () => void;
  title?: string;
  isCompact?: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  filter,
  onFilterChange,
  onSelectTransaction,
  onOpenAddModal,
  onExportCSV,
  title = 'Sổ giao dịch',
  isCompact = false,
}) => {
  const handleSearchChange = (q: string) => {
    onFilterChange({
      ...filter,
      searchQuery: q,
    });
  };

  const handleTypeChange = (type: 'ALL' | 'INCOME' | 'EXPENSE') => {
    onFilterChange({
      ...filter,
      type,
    });
  };

  // KHI Ở CHẾ ĐỘ COMPACT (NẰM TRONG KHUNG GLASS-CARD CẠNH BIỂU ĐỒ DÒNG TIỀN)
  if (isCompact) {
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
          overflow: 'hidden',
        }}
      >
        {/* Tiêu đề & Nút thao tác tương tự khung Phân bổ theo danh mục */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={18} color="#06b6d4" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{title}</h3>
            <span
              className="badge badge-neutral"
              style={{ fontSize: '0.7rem', padding: '2px 7px' }}
            >
              {transactions.length} GD
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onExportCSV}
              className="btn btn-secondary btn-sm"
              style={{ padding: '5px 10px', fontSize: '0.785rem' }}
              title="Xuất danh sách ra CSV"
            >
              <Download size={13} />
              <span>CSV</span>
            </button>
            <button
              onClick={onOpenAddModal}
              className="btn btn-primary btn-sm"
              style={{ padding: '5px 12px', fontSize: '0.785rem' }}
              title="Đồng bộ giao dịch thật từ ngân hàng"
            >
              <RefreshCw size={13} />
              <span>Đồng bộ ngân hàng</span>
            </button>
          </div>
        </div>

        {/* Danh sách giao dịch bên trong khung */}
        {transactions.length === 0 ? (
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
            Chưa có giao dịch gần đây trong kỳ này.
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              flex: 1,
              maxHeight: '210px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {transactions.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} onClick={onSelectTransaction} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // KHI Ở TAB "SỔ GIAO DỊCH" (FULL PAGE VIEW)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* List Header & Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{title}</h2>
          <span className="badge badge-neutral">{transactions.length} giao dịch</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onExportCSV}
            className="btn btn-secondary btn-sm"
            title="Xuất danh sách ra file Excel / CSV"
          >
            <Download size={15} />
            <span>Xuất CSV</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="btn btn-primary btn-sm"
            title="Đồng bộ giao dịch thật từ ngân hàng"
          >
            <RefreshCw size={15} />
            <span>Đồng bộ ngân hàng</span>
          </button>
        </div>
      </div>

      <div
        className="glass-card"
        style={{
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Search Bar */}
        <div className="input-with-icon" style={{ width: '100%' }}>
          <Search size={18} className="input-icon-left" />
          <input
            type="text"
            className="input-field"
            placeholder="Tìm theo nội dung giao dịch, danh mục, số tiền, mã tham chiếu..."
            value={filter.searchQuery || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Filters row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {/* Type Filter Buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {(
              [
                { key: 'ALL', label: 'Tất cả' },
                { key: 'INCOME', label: 'Thu nhập (+)' },
                { key: 'EXPENSE', label: 'Chi tiêu (-)' },
              ] as const
            ).map((t) => {
              const isActive = (filter.type || 'ALL') === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => handleTypeChange(t.key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: '1px solid',
                    cursor: 'pointer',
                    background: isActive ? 'var(--accent-primary-gradient)' : 'var(--bg-tertiary)',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    borderColor: isActive ? 'transparent' : 'var(--border-subtle)',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transaction Items */}
      {transactions.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8',
            }}
          >
            <FileText size={28} />
          </div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Chưa tìm thấy giao dịch nào</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
            Không có giao dịch nào khớp với bộ lọc hiện tại. Bấm nút bên dưới để tự động lấy giao dịch thực tế từ tài khoản ngân hàng.
          </p>
          <button onClick={onOpenAddModal} className="btn btn-primary btn-sm" style={{ marginTop: '8px' }}>
            <RefreshCw size={15} /> Đồng bộ giao dịch từ Ngân hàng
          </button>
        </div>
      ) : (
        <div>
          {transactions.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} onClick={onSelectTransaction} />
          ))}
        </div>
      )}
    </div>
  );
};
