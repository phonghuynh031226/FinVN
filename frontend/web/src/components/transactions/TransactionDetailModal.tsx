import React, { useState, useEffect } from 'react';
import { Transaction } from '../../types/transaction';
import { formatSignedVND } from '../../utils/currency';
import { formatDisplayDateTime } from '../../utils/date';
import { ALL_CATEGORIES } from '../../constants/categories';
import { X, Trash2, Edit3, Shield, Zap, Calendar, CreditCard, FileText, Wifi } from 'lucide-react';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: { userCategory?: string; userNote?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [userCategory, setUserCategory] = useState('');
  const [userNote, setUserNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (transaction) {
      setUserCategory(transaction.userCategory || transaction.category || '');
      setUserNote(transaction.userNote || '');
      setIsEditing(false);
      setConfirmDelete(false);
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  const isIncome = transaction.type === 'INCOME';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(transaction.id, {
        userCategory,
        userNote: userNote.trim() || undefined,
      });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      await onDelete(transaction.id);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
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
          maxWidth: '520px',
          padding: '28px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)',
                background: isIncome ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                color: isIncome ? '#10b981' : '#fb7185',
              }}
            >
              {isIncome ? 'Thu nhập (+)' : 'Chi tiêu (-)'}
            </span>
            {transaction.source === 'SEPAY' && (
              <span className="badge badge-sepay">
                <Zap size={11} /> SePay Webhook
              </span>
            )}
            {transaction.source === 'BANK_API' && (
              <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Wifi size={11} /> API Ngân hàng
              </span>
            )}
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Big Amount */}
        <div style={{ textAlign: 'center', margin: '16px 0 24px 0' }}>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: isIncome ? '#10b981' : '#fb7185',
            }}
          >
            {formatSignedVND(transaction.amount, transaction.type)}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {formatDisplayDateTime(transaction.transactionDate)}
          </div>
        </div>

        {/* Details Grid */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            background: 'var(--bg-tertiary)',
            padding: '18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            fontSize: '0.875rem',
          }}
        >
          {/* Bank */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard size={15} /> Tài khoản:
            </span>
            <span style={{ fontWeight: 600 }}>
              {transaction.bankAccount
                ? `${transaction.bankAccount.bankName} (${transaction.bankAccount.displayName})`
                : 'Mặc định'}
            </span>
          </div>

          {/* Reference code */}
          {transaction.sourceReference && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={15} /> Mã tham chiếu (Ref):
              </span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#818cf8' }}>
                {transaction.sourceReference}
              </span>
            </div>
          )}

          {/* Raw Bank Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} /> Nội dung ngân hàng gốc:
            </span>
            <div
              style={{
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                wordBreak: 'break-all',
              }}
            >
              {transaction.description || 'Không có mô tả gốc'}
            </div>
          </div>

          {/* User editable category */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Phân loại danh mục:</span>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 8px', fontSize: '0.75rem', color: '#818cf8' }}
                >
                  <Edit3 size={13} /> Chỉnh sửa
                </button>
              )}
            </div>

            {isEditing ? (
              <select
                className="select-field"
                value={userCategory}
                onChange={(e) => setUserCategory(e.target.value)}
                style={{ fontSize: '0.85rem', padding: '8px 12px' }}
              >
                {ALL_CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.type === 'INCOME' ? 'Thu' : 'Chi'})
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ color: '#818cf8', fontWeight: 600 }}>{userCategory || 'Chưa phân loại'}</span>
            )}
          </div>

          {/* User editable note */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Ghi chú cá nhân:</span>
            {isEditing ? (
              <input
                type="text"
                className="input-field"
                placeholder="Thêm ghi chú cá nhân..."
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                style={{ fontSize: '0.85rem', padding: '8px 12px' }}
              />
            ) : (
              <span style={{ color: 'var(--text-secondary)' }}>
                {userNote || 'Chưa có ghi chú cá nhân'}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          {confirmDelete ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="btn btn-danger btn-sm"
              >
                Xác nhận xóa
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="btn btn-secondary btn-sm"
              >
                Hủy
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="btn btn-ghost btn-sm"
              style={{ color: '#fb7185' }}
            >
              <Trash2 size={16} /> Xóa giao dịch
            </button>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Hủy sửa
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn btn-primary btn-sm"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </>
            ) : (
              <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
