import React, { useState, useEffect, useRef } from 'react';
import { BankAccount, getBankProvider } from '../../types/bankAccount';
import { bankApiService } from '../../services/bankApi';
import { dataService } from '../../services/dataService';
import {
  X,
  RefreshCw,
  Lock,
  UserRound,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';

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
  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [days, setDays] = useState<'7' | '15' | '30' | '90' | '180' | '365'>('30');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [savedBrowserId, setSavedBrowserId] = useState('');

  // Trạng thái xác thực OTP
  const [otpValue, setOtpValue] = useState('');
  const [targetBrowserId, setTargetBrowserId] = useState('');
  const [browserToken, setBrowserToken] = useState('');
  const [countdown, setCountdown] = useState(90);
  const timerRef = useRef<any>(null);

  // Đếm ngược thời gian chờ OTP
  useEffect(() => {
    if (step === 'OTP' && countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, countdown]);

  // Tự động điền credentials đã lưu nếu có
  useEffect(() => {
    if (isOpen && account?.id) {
      setStep('FORM');
      setOtpValue('');
      setErrorMsg('');
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

  // Hoàn tất tải giao dịch và lưu dữ liệu
  const finishSync = async (activeBrowserId: string, currentBalance: number, targetAccountNo?: string, activeClientId?: string) => {
    const provider = getBankProvider(account.bankName);
    setStatusMessage('Đang lưu thông tin mã hóa và đồng bộ giao dịch...');
    const result = await bankApiService.syncBank({
      provider, username: username.trim(), password,
      accountNumber: targetAccountNo || account.accountNumber,
      browserId: activeBrowserId,
      clientId: activeClientId,
      bankName: account.bankName, displayName: account.displayName, color: account.color,
      initialBalance: account.initialBalance, forceFull: true,
    });

    const finalBrowserId = result.browser_id || activeBrowserId;
    const finalClientId = result.client_id || activeClientId;
    const { storageService } = await import('../../services/storage');
    storageService.saveAccountCredential(account.id, {
      username: username.trim(),
      password,
      browserId: finalBrowserId,
      clientId: finalClientId,
    });

    onSuccess(
      `Đồng bộ ${account.bankName} thành công! Đã lưu ${result.new_inserted_count} giao dịch mới. Số dư: ${result.current_balance.toLocaleString('vi-VN')} VND`
    );
    onClose();
  };

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
      const provider = getBankProvider(account.bankName);

      // 1. Lấy số dư mới nhất
      setStatusMessage(`Đang kết nối ${account.bankName} & lấy số dư...`);
      const connectResult = await bankApiService.connect({
        provider,
        username: username.trim(),
        password,
        accountNumber: account.accountNumber,
        browserId: savedBrowserId || undefined,
      });

      // Nếu ngân hàng phát hiện trình duyệt mới và yêu cầu OTP SMS
      if (connectResult.status === 'NEED_OTP') {
        setTargetBrowserId(connectResult.browserId || savedBrowserId || '');
        setBrowserToken(connectResult.browserToken || '');
        setCountdown(connectResult.duration || 90);
        setStep('OTP');
        setIsLoading(false);
        setStatusMessage('');
        return;
      }

      const activeBrowserId = connectResult.browserId || savedBrowserId || undefined;
      const activeClientId = connectResult.clientId || undefined;
      await finishSync(activeBrowserId || '', connectResult.currentBalance || 0, connectResult.accountNumber, activeClientId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đồng bộ thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue.trim() || otpValue.length < 4) {
      setErrorMsg('Vui lòng nhập đầy đủ mã OTP từ tin nhắn SMS.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setStatusMessage('Đang xác thực OTP & kích hoạt trình duyệt tin cậy...');

    try {
      const provider = getBankProvider(account.bankName);

      const result = await bankApiService.verifyOtp({
        provider,
        username: username.trim(),
        password,
        browserId: targetBrowserId,
        browserToken: browserToken,
        otp: otpValue.trim(),
      });

      setStatusMessage('Kích hoạt trình duyệt thành công! Đang tải dữ liệu giao dịch...');
      await finishSync(targetBrowserId, result.currentBalance || 0, result.accountNumber, result.clientId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Mã OTP không chính xác hoặc đã hết hiệu lực.');
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
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '480px',
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
              {step === 'OTP' ? (
                <>
                  <ShieldCheck size={22} className="text-primary" /> Xác thực SMS OTP Vietcombank
                </>
              ) : (
                <>
                  <RefreshCw size={20} className="text-primary" /> Đồng bộ giao dịch {account.bankName}
                </>
              )}
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
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(225, 29, 72, 0.1)',
              border: '1px solid rgba(225, 29, 72, 0.3)',
              color: 'var(--accent-expense)',
              fontWeight: 600,
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {step === 'FORM' ? (
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
                <p style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', marginTop: '6px', lineHeight: 1.4, fontWeight: 500 }}>
                  ⚡ Tự động chia nhỏ thành các đợt 30 ngày tuần tự để ngân hàng không chặn tải.
                </p>
              )}
              {getBankProvider(account.bankName) === 'BIDV' && (
                <p style={{ fontSize: '0.78rem', color: 'var(--accent-income)', marginTop: '6px', lineHeight: 1.4, fontWeight: 500 }}>
                  📱 BIDV: Nếu đây là lần đầu đồng bộ thiết bị này, hãy mở app BIDV SmartBanking trên điện thoại và bấm Xác nhận khi có yêu cầu.
                </p>
              )}
            </div>

            {isLoading && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--accent-primary)',
                  fontWeight: 600,
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
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div
              style={{
                textAlign: 'center',
                padding: '16px 0 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                marginBottom: '18px',
              }}
            >
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
                Vietcombank vừa gửi một mã xác thực <strong>SMS OTP</strong> đến số điện thoại đăng ký Digibank của bạn.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <input
                  type="text"
                  maxLength={6}
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  disabled={isLoading}
                  autoFocus
                  style={{
                    width: '240px',
                    height: '52px',
                    textAlign: 'center',
                    fontSize: '1.75rem',
                    letterSpacing: '10px',
                    fontWeight: 800,
                    borderRadius: '12px',
                    border: '2px solid rgba(99, 102, 241, 0.5)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    color: '#ffffff',
                    outline: 'none',
                    boxShadow: '0 0 15px rgba(99, 102, 241, 0.25)',
                  }}
                />
              </div>

              <div style={{ marginTop: '12px', fontSize: '0.8rem', color: countdown > 0 ? 'var(--accent-primary)' : 'var(--accent-expense)', fontWeight: 600 }}>
                {countdown > 0 ? (
                  <span>
                    Hiệu lực: <strong>{Math.floor(countdown / 60).toString().padStart(2, '0')}:{(countdown % 60).toString().padStart(2, '0')}</strong>
                  </span>
                ) : (
                  <span>Mã OTP đã hết thời gian. Vui lòng bấm quay lại để gửi lại.</span>
                )}
              </div>
            </div>

            {isLoading && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--accent-income)',
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '16px',
                }}
              >
                <RefreshCw size={16} className="animate-spin" />
                <span>{statusMessage || 'Đang xử lý...'}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setStep('FORM')}
                disabled={isLoading}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} /> Quay lại
              </button>

              <button
                type="submit"
                disabled={isLoading || otpValue.length < 4}
                className="btn btn-primary btn-sm"
                style={{ minWidth: '150px', justifyContent: 'center' }}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Đang kích hoạt...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> Xác thực & Đồng bộ
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
