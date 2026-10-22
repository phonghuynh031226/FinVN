import React, { useState } from 'react';
import { getBankInfo } from '../../constants/vietnamBanks';

interface BankLogoProps {
  bankName: string;
  size?: number;
}

export const BankLogo: React.FC<BankLogoProps> = ({ bankName, size = 32 }) => {
  const bankInfo = getBankInfo(bankName);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      title={`${bankInfo.shortName} - ${bankInfo.name}`}
      style={{
        height: `${size}px`,
        minWidth: `${size + 16}px`,
        maxWidth: '80px',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        padding: '3px 8px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {!hasError ? (
        <img
          src={bankInfo.logoUrl}
          alt={bankInfo.shortName}
          onError={() => setHasError(true)}
          style={{
            maxHeight: `${size - 6}px`,
            maxWidth: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
          loading="lazy"
        />
      ) : (
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.02em',
          }}
        >
          {bankInfo.shortName}
        </span>
      )}
    </div>
  );
};
