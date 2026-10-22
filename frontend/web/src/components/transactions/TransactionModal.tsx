import React, { useState, useEffect } from 'react';
import { CreateTransactionInput, TransactionType } from '../../types/transaction';
import { BankAccount } from '../../types/bankAccount';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants/categories';
import { parseAmount, formatVND } from '../../utils/currency';
import { X, DollarSign, Calendar, Tag, CreditCard, AlignLeft } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTransactionInput) => Promise<void>;
  accounts: BankAccount[];
  defaultAccountId?: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accounts,
  defaultAccountId,
}) => {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [selectedAccountId, setSelectedAccountId] = useState(defaultAccountId || accounts[0]?.id || '');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].name);
  const [description, setDescription] = useState('');
  const [userNote, setUserNote] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (defaultAccountId) setSelectedAccountId(defaultAccountId);
      else if (accounts[0]) setSelectedAccountId(accounts[0].id);
      setAmountStr('');
      setDescription('');
      setUserNote('');
      setErrorMsg('');
      setCategory(type === 'EXPENSE' ? EXPENSE_CATEGORIES[0].name : INCOME_CATEGORIES[0].name);
    }
  }, [isOpen, defaultAccountId, accounts]);

  useEffect(() => {
    setCategory(type === 'EXPENSE' ? EXPENSE_CATEGORIES[0].name : INCOME_CATEGORIES[0].name);
  }, [type]);

  if (!isOpen) return null;

  const quickAmounts = [
    { label: '+50k', value: 50000 },
    { label: '+100k', value: 100000 },
    { label: '+200k', value: 200000 },
    { label: '+500k', value: 500000 },
    { label: '+1 Tr', value: 1000000 },
    { label: '+2 Tr', value: 2000000 },
    { label: '+5 Tr', value: 5000000 },
  ];

  const handleAddQuickAmount = (val: number) => {
    const current = parseAmount(amountStr) || 0;
    setAmountStr((current + val).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedAccountId) {
      setErrorMsg('Vui lòng chọn tài khoản ngân hàng');
      return;
    }

    const parsed = parseAmount(amountStr);
    if (!parsed || parsed <= 0) {
      setErrorMsg('Vui lòng nhập số tiền hợp lệ lớn hơn 0 ₫');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        accountId: selectedAccountId,
        amount: parsed,
        type,
        category,
        description: description.trim() || (type === 'INCOME' ? 'Thu nhập thủ công' : 'Chi tiêu thủ công'),
        userNote: userNote.trim() || undefined,
        transactionDate: new Date(transactionDate).toISOString(),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể ghi nhận giao dịch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div
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
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Thêm giao dịch mới</h2>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Ghi chép thu chi thủ công vào tài khoản cá nhân
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fb7185',
              fontSize: '0.85rem',
              marginBottom: '18px',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Type Switcher: Chi tiêu / Thu nhập */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            background: 'var(--bg-tertiary)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
          }}
        >
          <button
            type="button"
            onClick={() => setType('EXPENSE')}
            style={{
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              background: type === 'EXPENSE' ? 'var(--accent-expense-gradient)' : 'transparent',
              color: type === 'EXPENSE' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: type === 'EXPENSE' ? '0 2px 8px var(--accent-expense-glow)' : 'none',
            }}
          >
            Chi tiêu (-)
          </button>
          <button
            type="button"
            onClick={() => setType('INCOME')}
            style={{
              padding: '10px',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              background: type === 'INCOME' ? 'var(--accent-income-gradient)' : 'transparent',
              color: type === 'INCOME' ? '#ffffff' : 'var(--text-secondary)',
              boxShadow: type === 'INCOME' ? '0 2px 8px var(--accent-income-glow)' : 'none',
            }}
          >
            Thu nhập (+)
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Amount Field */}
          <div className="input-group">
            <label className="input-label">Số tiền (VND)</label>
            <div className="input-with-icon">
              <DollarSign size={20} className="input-icon-left" />
              <input
                type="text"
                className="input-field"
                placeholder="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                autoFocus
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: type === 'INCOME' ? '#10b981' : '#fb7185',
                }}
              />
            </div>
            {parseAmount(amountStr) !== undefined && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                = {formatVND(parseAmount(amountStr) || 0)}
              </span>
            )}
          </div>

          {/* Quick Amount Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
            {quickAmounts.map((q) => (
              <button
                type="button"
                key={q.label}
                onClick={() => handleAddQuickAmount(q.value)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Account select */}
          <div className="input-group">
            <label className="input-label">Tài khoản ngân hàng</label>
            <div className="input-with-icon">
              <CreditCard size={18} className="input-icon-left" />
              <select
                className="select-field"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                style={{ paddingLeft: '42px' }}
              >
                {accounts.length === 0 ? (
                  <option value="">-- Chưa có tài khoản ngân hàng nào --</option>
                ) : (
                  accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.displayName} (Số dư: {formatVND(acc.currentBalance)})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Category Select */}
          <div className="input-group">
            <label className="input-label">Danh mục phân loại</label>
            <div className="input-with-icon">
              <Tag size={18} className="input-icon-left" />
              <select
                className="select-field"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ paddingLeft: '42px' }}
              >
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="input-group">
            <label className="input-label">Ngày & Giờ giao dịch</label>
            <div className="input-with-icon">
              <Calendar size={18} className="input-icon-left" />
              <input
                type="datetime-local"
                className="input-field"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>
          </div>

          {/* Ghi chú cá nhân */}
          <div className="input-group">
            <label className="input-label">Ghi chú cá nhân</label>
            <div className="input-with-icon">
              <AlignLeft size={18} className="input-icon-left" />
              <input
                type="text"
                className="input-field"
                placeholder="Ví dụ: Ăn trưa đồng nghiệp, Mua sách Tiki..."
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
              />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Hủy
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Đang lưu...' : 'Ghi nhận giao dịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
