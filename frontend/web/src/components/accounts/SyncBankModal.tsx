import React, { useState } from 'react';
import { BankAccount } from '../../types/bankAccount';
import { bankApiService } from '../../services/bankApi';
import { dataService } from '../../services/dataService';
import { X, RefreshCw, Lock, UserRound, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SyncBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: BankAccount;
  onSuccess: (message: string) => void;
}

export const SyncBankModal: React.FC<SyncBankModalProps> = ({
  isOpen,
  onClose,
  account,
  onSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [days, setDays] = useState<'7' | '15' | '30' | '90' | '180' | '365'>('30');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [savedBrowserId, setSavedBrowserId] = useState('');

  // Tự động điền credentials đã lưu nếu có
  React.useEffect(() => {
    if (isOpen && account?.id) {
      import('../../services/storage').then(({ storageService }) => {
        const credsMap = storageService.getBankCredentials();
        const saved = credsMap[account.id];
        if (saved?.username) setUsername(saved.username);
        if (saved?.password) setPassword(saved.password);
        if (saved?.browserId) setSavedBrowserId(saved.browserId);
      });
    }
  }, [isOpen, account?.id]);

  if (!isOpen) return null;

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg(`Vui lòng nhập tên đăng nhập và mật khẩu ${account.bankName}.`);
      return;
    }

    setIsLoading(true);
    setStatusMessage(`Đang kết nối ${account.bankName} & giải Captcha AI...`);

    try {
      const isVCB = account.bankName.includes('Vietcombank') || account.bankName === 'VCB';
      const provider = isVCB ? 'VCB' : 'MB';

      const today = new Date();
      const from = new Date(today);
      from.setDate(today.getDate() - Number(days));

      const formatDate = (d: Date) => d.toISOString().slice(0, 10);

      // 1. Lấy số dư mới nhất
      setStatusMessage(`Đang kết nối ${account.bankName} & lấy số dư...`);
      const connectResult = await bankApiService.connect({
        provider,
        username: username.trim(),
        password,
        accountNumber: account.accountNumber,
        browserId: savedBrowserId || undefined,
      });

      const activeBrowserId = connectResult.browserId || savedBrowserId || undefined;

      // 2. Lấy lịch sử giao dịch
      setStatusMessage('Đang tải lịch sử giao dịch thu/chi...');
      const transactions = await bankApiService.getTransactions(
        {
          provider,
          username: username.trim(),
          password,
          accountNumber: connectResult.accountNumber || account.accountNumber,
          browserId: activeBrowserId,
        },
        formatDate(from),
        formatDate(today)
      );

      // 3. Nhập vào cơ sở dữ liệu web
      setStatusMessage('Đang đồng bộ vào sổ giao dịch...');
      const importResult = await dataService.importBankTransactions(
        account.id,
        transactions,
        connectResult.currentBalance
      );

      // 4. Lưu credentials để phục vụ auto-sync ngầm khi mở web
      const { storageService } = await import('../../services/storage');
      storageService.saveAccountCredential(account.id, {
        username: username.trim(),
        password,
        browserId: activeBrowserId,
      });

      await dataService.updateAccount(account.id, {
        currentBalance: connectResult.currentBalance,
        lastSyncedAt: Date.now(),
      });

      onSuccess(
        `Đồng bộ ${account.bankName} thành công! Nhập mới ${importResult.importedCount} giao dịch, số dư hiện tại: ${importResult.updatedBalance.toLocaleString('vi-VN')} VND`
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Đồng bộ thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
      setStatusMessage('');
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
          maxWidth: '460px',
          padding: '28px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={20} className="text-primary" /> Đồng bộ giao dịch {account.bankName}
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Tài khoản: <strong>{account.displayName}</strong> ({account.accountNumber})
            </p>
          </div>
          <button onClick={onClose} disabled={isLoading} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fb7185',
              fontSize: '0.825rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSync}>
          <div className="input-group">
            <label className="input-label">Tên đăng nhập {account.bankName} (SĐT / CCCD)</label>
            <div className="input-with-icon">
              <UserRound size={18} className="input-icon-left" />
              <input
                className="input-field"
                type="text"
                placeholder={`Nhập tên đăng nhập ${account.bankName}`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Mật khẩu {account.bankName}</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon-left" />
              <input
                className="input-field"
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Khoảng thời gian quét giao dịch</label>
            <div className="input-with-icon">
              <Calendar size={18} className="input-icon-left" />
              <select
                className="select-field"
                value={days}
                onChange={(e) => setDays(e.target.value as any)}
                disabled={isLoading}
                style={{ paddingLeft: '42px' }}
              >
                <option value="7">7 ngày gần nhất (Quét siêu tốc ~1 giây)</option>
                <option value="15">15 ngày gần nhất</option>
                <option value="30">30 ngày gần nhất (Khuyên dùng)</option>
                <option value="90">90 ngày gần nhất (1 Quý)</option>
                <option value="180">180 ngày gần nhất (6 tháng)</option>
                <option value="365">365 ngày (1 năm - Tối đa ngân hàng hỗ trợ)</option>
              </select>
            </div>
            {Number(days) > 30 && (
              <p style={{ fontSize: '0.75rem', color: '#a5b4fc', marginTop: '6px', lineHeight: 1.4 }}>
                ⚡ Tự động chia nhỏ thành các đợt 30 ngày tuần tự để ngân hàng không chặn tải.
              </p>
            )}
          </div>

          {isLoading && (
            <div
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#a5b4fc',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <RefreshCw size={16} className="animate-spin" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" onClick={onClose} disabled={isLoading} className="btn btn-ghost btn-sm">
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-sm"
              style={{ minWidth: '130px', justifyContent: 'center' }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Đang xử lý...
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} /> Bắt đầu đồng bộ
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
