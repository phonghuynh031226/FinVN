import React, { useState } from 'react';
import { BankAccount } from '../../types/bankAccount';
import { SepayWebhookPayload } from '../../services/dataService';
import { parseAmount, formatVND } from '../../utils/currency';
import { X, Zap, ArrowDownLeft, ArrowUpRight, DollarSign, RefreshCw, CheckCircle2 } from 'lucide-react';

interface SepaySimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (payload: SepayWebhookPayload) => Promise<void>;
  accounts: BankAccount[];
}

export const SepaySimulatorModal: React.FC<SepaySimulatorModalProps> = ({
  isOpen,
  onClose,
  onSimulate,
  accounts,
}) => {
  const [transferType, setTransferType] = useState<'in' | 'out'>('in');
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [amountStr, setAmountStr] = useState('1500000');
  const [content, setContent] = useState('CONG TY ABC CHUYEN TIEN THUONG DU AN');
  const [customRef, setCustomRef] = useState(`SEPAY_${Math.floor(100000 + Math.random() * 900000)}`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const targetAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const presets = [
    {
      label: '💰 Lương tháng (+25tr)',
      type: 'in' as const,
      amount: '25000000',
      content: 'CONG TY CP CONG NGHE ABC TRA LUONG THANG 10',
    },
    {
      label: '🎁 Thưởng dự án (+5tr)',
      type: 'in' as const,
      amount: '5000000',
      content: 'THUONG NONG DU AN XUAT SAC QUY 3',
    },
    {
      label: '🍲 Ăn uống Gogi (-850k)',
      type: 'out' as const,
      amount: '850000',
      content: 'THANH TOAN QR NHA HANG GOGI HOUSE CS2',
    },
    {
      label: '🛒 Mua hàng Shopee (-320k)',
      type: 'out' as const,
      amount: '320000',
      content: 'SHOPEEPAY THANH TOAN DON HANG SP998124',
    },
    {
      label: '⚡ Tiền điện EVN (-1.8tr)',
      type: 'out' as const,
      amount: '1800000',
      content: 'THANH TOAN TIEN DIEN EVN THANG 10 MA KH PE09001',
    },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setTransferType(p.type);
    setAmountStr(p.amount);
    setContent(p.content);
    setCustomRef(`SEPAY_${Math.floor(100000 + Math.random() * 900000)}`);
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!targetAccount) {
      setErrorMsg('Vui lòng chọn tài khoản nhận webhook');
      return;
    }

    const amt = parseAmount(amountStr);
    if (!amt || amt <= 0) {
      setErrorMsg('Số tiền phải lớn hơn 0 ₫');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: SepayWebhookPayload = {
        gateway: targetAccount.bankName,
        transactionDate: new Date().toISOString(),
        accountNumber: targetAccount.accountNumber,
        code: null,
        content: content.trim(),
        transferType,
        transferAmount: amt,
        accumulated:
          transferType === 'in'
            ? targetAccount.currentBalance + amt
            : targetAccount.currentBalance - amt,
        referenceCode: customRef.trim(),
      };

      await onSimulate(payload);
      setSuccessMsg(`Đã nhận thành công Webhook SePay! Tài khoản ${targetAccount.displayName} đã cập nhật số dư.`);
      setCustomRef(`SEPAY_${Math.floor(100000 + Math.random() * 900000)}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Mô phỏng webhook thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          maxWidth: '540px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Zap size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Mô phỏng Webhook SePay</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Test tự động nhận biến động số dư ngân hàng theo thời gian thực
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Quick Presets */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            Kịch bản giao dịch mẫu:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {presets.map((p) => (
              <button
                type="button"
                key={p.label}
                onClick={() => handleApplyPreset(p)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {successMsg && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={18} /> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fb7185',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSimulate}>
          {/* Transfer Type */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              background: 'var(--bg-tertiary)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
            }}
          >
            <button
              type="button"
              onClick={() => setTransferType('in')}
              style={{
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
                background: transferType === 'in' ? 'var(--accent-income-gradient)' : 'transparent',
                color: transferType === 'in' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              Tiền vào ngân hàng (IN)
            </button>
            <button
              type="button"
              onClick={() => setTransferType('out')}
              style={{
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
                background: transferType === 'out' ? 'var(--accent-expense-gradient)' : 'transparent',
                color: transferType === 'out' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              Tiền ra / Chi tiêu (OUT)
            </button>
          </div>

          {/* Account select */}
          <div className="input-group">
            <label className="input-label">Tài khoản đích</label>
            <select
              className="select-field"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              {accounts.length === 0 ? (
                <option value="">-- Chưa có tài khoản ngân hàng nào --</option>
              ) : (
                accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} - {acc.displayName} (STK: {acc.accountNumber})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Amount */}
          <div className="input-group">
            <label className="input-label">Số tiền chuyển khoản (VND)</label>
            <div className="input-with-icon">
              <DollarSign size={18} className="input-icon-left" />
              <input
                type="text"
                className="input-field"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: transferType === 'in' ? '#10b981' : '#fb7185',
                }}
              />
            </div>
            {parseAmount(amountStr) !== undefined && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                = {formatVND(parseAmount(amountStr) || 0)}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="input-group">
            <label className="input-label">Nội dung chuyển khoản (Content)</label>
            <input
              type="text"
              className="input-field"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="VD: NGUYEN VAN A CHUYEN TIEN..."
              required
            />
          </div>

          {/* Reference Code */}
          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label">Mã giao dịch ngân hàng (referenceCode)</label>
              <button
                type="button"
                onClick={() => setCustomRef(`SEPAY_${Math.floor(100000 + Math.random() * 900000)}`)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#818cf8',
                  fontSize: '0.725rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RefreshCw size={11} /> Đổi mã
              </button>
            </div>
            <input
              type="text"
              className="input-field"
              value={customRef}
              onChange={(e) => setCustomRef(e.target.value)}
              style={{ fontFamily: 'monospace' }}
              required
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Đóng
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              <Zap size={16} />
              {isSubmitting ? 'Đang gửi...' : 'Bắn Webhook Thử Nghiệm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
