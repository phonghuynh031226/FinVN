import React, { useState } from 'react';
import { BankAccount, UpdateBankAccountInput } from '../../types/bankAccount';
import { getBankInfo } from '../../constants/vietnamBanks';
import { maskAccountNumber } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/date';
import { BankLogo } from './BankLogo';
import { Edit3, Trash2, Eye, EyeOff } from 'lucide-react';

interface AccountCardProps {
  account: BankAccount;
  onEdit: (account: BankAccount) => void;
  onDelete: (account: BankAccount) => void;
  onQuickUpdate?: (id: string, updates: UpdateBankAccountInput) => Promise<void>;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onDelete,
  onQuickUpdate,
}) => {
  const bankInfo = getBankInfo(account.bankName);
  const [isHovered, setIsHovered] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);

  // Background gradient: user's custom choice or default bank gradient
  const cardGradient = account.color || bankInfo.gradient;

  return (
    <div
      className="animate-fade-in"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: isHovered
          ? '0 20px 40px rgba(0, 0, 0, 0.45), 0 0 20px rgba(255, 255, 255, 0.1)'
          : '0 10px 25px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        background: cardGradient,
        color: '#ffffff',
        padding: '24px',
        minHeight: '190px',
        justifyContent: 'space-between',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        transform: isHovered ? 'translateY(-4px)' : 'none',
        boxSizing: 'border-box',
      }}
    >
      {/* Decorative glossy foil shine overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '45%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Decorative subtle concentric security lines */}
      <div
        style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-15px',
          right: '-15px',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          pointerEvents: 'none',
        }}
      />

      {/* 1. Card Top: Bank Name, Purpose & Bank Logo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          zIndex: 2,
        }}
      >
        <div>
          <div
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              letterSpacing: '-0.01em',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            {bankInfo.shortName}
          </div>

          {/* Subtitle / Purpose with Randomize button */}
          {/* Subtitle / Purpose */}
          <div style={{ marginTop: '4px' }}>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                opacity: 0.92,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)',
              }}
            >
              {account.displayName}
            </span>
          </div>
        </div>

        {/* Top Right: Bank Logo */}
        <BankLogo bankName={account.bankName} size={32} />
      </div>

      {/* 2. Card Middle: Account Number & Eye Toggle (Ẩn / Hiện STK) */}
      <div
        style={{
          margin: '20px 0 16px 0',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: '1.45rem',
            letterSpacing: '0.22em',
            fontWeight: 700,
            opacity: 0.95,
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {showAccountNumber ? account.accountNumber : maskAccountNumber(account.accountNumber)}
        </div>

        {/* Nút Ẩn / Hiện Số tài khoản */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowAccountNumber(!showAccountNumber);
          }}
          title={showAccountNumber ? 'Ẩn số tài khoản' : 'Hiện đầy đủ số tài khoản'}
          style={{
            background: 'rgba(255, 255, 255, 0.18)',
            border: 'none',
            color: '#ffffff',
            borderRadius: '6px',
            width: '32px',
            height: '32px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)';
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          {showAccountNumber ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>

      {/* 3. Card Bottom: Created Date & Action Controls (Sửa thẻ, Xóa thẻ) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 2,
          paddingTop: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          gap: '8px',
        }}
      >
        {/* Ngày thêm ngân hàng */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: '0.675rem',
              opacity: 0.75,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: 600,
            }}
          >
            Ngày thêm
          </span>
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              opacity: 0.95,
              fontFamily: "'Courier New', Courier, monospace",
            }}
          >
            {formatDisplayDate(account.createdAt)}
          </span>
        </div>

        {/* Nút hành động */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
          onClick={() => onEdit(account)}
          title="Chỉnh sửa thông tin & đổi màu thẻ"
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.18)',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)')}
        >
          <Edit3 size={14} />
          <span>Sửa thẻ</span>
        </button>
        <button
          onClick={() => onDelete(account)}
          title="Xóa tài khoản này"
          style={{
            padding: '6px 10px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.35)',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.6)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.35)')}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  </div>
);
};
