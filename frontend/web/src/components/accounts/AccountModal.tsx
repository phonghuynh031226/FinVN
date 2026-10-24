import React, { useState, useEffect, useRef } from 'react';
import { BankAccount, BankProvider, CreateBankAccountInput, UpdateBankAccountInput } from '../../types/bankAccount';
import { VIETNAM_BANKS, getBankInfo } from '../../constants/vietnamBanks';
import { CARD_COLOR_PRESETS } from '../../constants/cardThemes';
import { bankApiService } from '../../services/bankApi';
import {
  X,
  Building2,
  Tag,
  Palette,
  Check,
  LockKeyhole,
  UserRound,
  Wifi,
  RefreshCw,
  Eye,
  EyeOff,
  Smartphone,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateBankAccountInput, credentials?: { username: string; password: string; browserId?: string }) => Promise<void>;
  editingAccount?: BankAccount | null;
  onUpdate?: (id: string, updates: UpdateBankAccountInput) => Promise<void>;
  existingAccounts?: BankAccount[];
}

const SUPPORTED_BANKS = VIETNAM_BANKS.filter((b) =>
  ['MB', 'VCB', 'BIDV'].includes(b.code)
);

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingAccount,
  onUpdate,
}) => {
  const [bankName, setBankName] = useState('Vietcombank');
  const [displayName, setDisplayName] = useState('');
  const [apiUsername, setApiUsername] = useState('');
  const [apiPassword, setApiPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(CARD_COLOR_PRESETS[0].gradient);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('');

  // Luồng xác thực OTP thiết bị mới
  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');
  const [otpValue, setOtpValue] = useState('');
  const [browserToken, setBrowserToken] = useState('');
  const [targetBrowserId, setTargetBrowserId] = useState('');
  const [countdown, setCountdown] = useState(90);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (editingAccount) {
      setBankName(editingAccount.bankName);
      setDisplayName(editingAccount.displayName);
      setSelectedColor(editingAccount.color || getBankInfo(editingAccount.bankName).gradient);
    } else {
      setBankName('Vietcombank');
      setDisplayName('');
      setApiUsername('');
      setApiPassword('');
      setShowPassword(false);
      setSelectedColor(getBankInfo('Vietcombank').gradient || CARD_COLOR_PRESETS[0].gradient);
    }
    setErrorMsg('');
    setStatusText('');
    setStep('FORM');
    setOtpValue('');
    setBrowserToken('');
    setTargetBrowserId('');
    if (timerRef.current) clearInterval(timerRef.current);
  }, [editingAccount, isOpen]);

  // Bộ đếm ngược thời gian OTP 90s
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

  if (!isOpen) return null;

  const handleBankChange = (newBank: string) => {
    setBankName(newBank);
    if (!editingAccount) {
      const bankDefault = getBankInfo(newBank);
      setSelectedColor(bankDefault.gradient);
    }
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (editingAccount) {
      if (!displayName.trim()) {
        setErrorMsg('Vui lòng nhập tên gợi nhớ cho tài khoản');
        return;
      }
      if (!onUpdate) return;
      setIsSubmitting(true);
      try {
        await onUpdate(editingAccount.id, {
          displayName: displayName.trim(),
          bankName,
          color: selectedColor,
        });
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || 'Không thể cập nhật tài khoản');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // --- KẾT NỐI THẬT TỪ NGÂN HÀNG ---
    if (!apiUsername.trim() || !apiPassword) {
      setErrorMsg('Vui lòng nhập tên đăng nhập và mật khẩu Internet Banking để kết nối.');
      return;
    }

    setIsSubmitting(true);
    setStatusText('Đang đăng nhập ngân hàng & giải Captcha AI...');

    try {
      const bankCode = getBankInfo(bankName).code as BankProvider;
      const result = await bankApiService.connect({
        provider: bankCode,
        username: apiUsername.trim(),
        password: apiPassword,
      });

      // Nếu ngân hàng yêu cầu OTP xác thực trình duyệt mới
      if (result.status === 'NEED_OTP') {
        setBrowserToken(result.browserToken || '');
        setTargetBrowserId(result.browserId || '');
        setCountdown(result.duration || 90);
        setStep('OTP');
        setIsSubmitting(false);
        setStatusText('');
        return;
      }

      // Đăng nhập thành công ngay lập tức
      setStatusText('Đã xác thực thành công! Đang lưu thông tin...');

      const finalDisplayName =
        displayName.trim() || result.accountHolderName || `${bankName} - ${(result.accountNumber || '').slice(-4)}`;

      await onSubmit(
        {
          bankName,
          displayName: finalDisplayName,
          accountNumber: result.accountNumber || '',
          initialBalance: result.currentBalance || 0,
          color: selectedColor,
        },
        {
          username: apiUsername.trim(),
          password: apiPassword,
          browserId: result.browserId,
        }
      );

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Kết nối ngân hàng thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsSubmitting(false);
      setStatusText('');
    }
  };

  // Xác nhận OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue.trim() || otpValue.length < 4) {
      setErrorMsg('Vui lòng nhập đầy đủ mã OTP từ tin nhắn SMS.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setStatusText('Đang xác thực OTP & kích hoạt trình duyệt tin cậy...');

    try {
      const bankCode = getBankInfo(bankName).code as BankProvider;
      const result = await bankApiService.verifyOtp({
        provider: bankCode,
        username: apiUsername.trim(),
        password: apiPassword,
        browserId: targetBrowserId,
        browserToken: browserToken,
        otp: otpValue.trim(),
      });

      setStatusText('Xác thực thiết bị thành công! Đang hoàn tất...');

      const finalDisplayName =
        displayName.trim() || result.accountHolderName || `${bankName} - ${(result.accountNumber || '').slice(-4)}`;

      await onSubmit(
        {
          bankName,
          displayName: finalDisplayName,
          accountNumber: result.accountNumber || '',
          initialBalance: result.currentBalance || 0,
          color: selectedColor,
        },
        {
          username: apiUsername.trim(),
          password: apiPassword,
          browserId: targetBrowserId,
        }
      );

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Mã OTP không chính xác hoặc đã hết hạn.');
    } finally {
      setIsSubmitting(false);
      setStatusText('');
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
          maxWidth: '470px',
          padding: '20px 22px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          position: 'relative',
          maxHeight: '94vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              {step === 'OTP' ? (
                <>
                  <ShieldCheck size={20} className="text-primary" />
                  Kích hoạt trình duyệt Vietcombank
                </>
              ) : (
                <>
                  <Wifi size={18} className="text-primary" />
                  {editingAccount ? 'Chỉnh sửa tài khoản' : 'Kết nối ngân hàng thật'}
                </>
              )}
            </h2>
            <p style={{ fontSize: '0.785rem', color: 'var(--text-muted)', marginTop: '3px', marginBottom: 0 }}>
              {step === 'OTP'
                ? 'Nhập mã SMS OTP do Vietcombank vừa gửi về điện thoại để cấp quyền vĩnh viễn'
                : editingAccount
                ? 'Tùy chỉnh thông tin hiển thị tài khoản'
                : 'Đăng nhập trực tiếp để tự động lấy số dư và đồng bộ giao dịch thật 100%'}
            </p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="btn btn-ghost btn-sm" style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Hướng dẫn lỗi mã 019 (Chưa bật đăng nhập trên web) */}
        {errorMsg && (errorMsg.includes('chưa bật tính năng đăng nhập') || errorMsg.includes('019')) && (
          <div
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#d97706',
              fontSize: '0.825rem',
              marginBottom: '18px',
              lineHeight: 1.5,
            }}
          >
            <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <AlertCircle size={16} /> Bắt buộc bật trên App Vietcombank (1 lần duy nhất):
            </div>
            <ol style={{ paddingLeft: '18px', margin: 0 }}>
              <li>Mở app <strong>VCB DigiBank</strong> trên điện thoại.</li>
              <li>Vào <strong>Cài đặt</strong> ➔ <strong>Quản lý đăng nhập kênh</strong>.</li>
              <li>Gạt bật tùy chọn: <strong>"Cài đặt đăng nhập VCB DigiBank trên WEB"</strong>.</li>
            </ol>
          </div>
        )}

        {/* Thông báo lỗi thông thường */}
        {errorMsg && !errorMsg.includes('chưa bật tính năng đăng nhập') && !errorMsg.includes('019') && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(225, 29, 72, 0.1)',
              border: '1px solid rgba(225, 29, 72, 0.3)',
              color: 'var(--accent-expense)',
              fontWeight: 600,
              fontSize: '0.85rem',
              marginBottom: '18px',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* === BƯỚC 2: NHẬP MÃ XÁC THỰC OTP === */}
        {step === 'OTP' ? (
          <form onSubmit={handleVerifyOtp}>
            <div
              style={{
                textAlign: 'center',
                padding: '20px 10px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-lg)',
                border: '1px dashed rgba(255, 255, 255, 0.15)',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <Smartphone size={28} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
                Xác thực SMS OTP
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto' }}>
                Mã xác thực gồm 6 chữ số đã được Vietcombank gửi tới số điện thoại: <strong>{apiUsername}</strong>
              </p>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                <input
                  type="text"
                  maxLength={8}
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  disabled={isSubmitting}
                  autoFocus
                  style={{
                    width: '240px',
                    height: '54px',
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

              <div style={{ marginTop: '14px', fontSize: '0.8rem', color: countdown > 0 ? 'var(--accent-primary)' : 'var(--accent-expense)', fontWeight: 600 }}>
                {countdown > 0 ? (
                  <span>
                    Mã có hiệu lực trong: <strong>{Math.floor(countdown / 60).toString().padStart(2, '0')}:{(countdown % 60).toString().padStart(2, '0')}</strong>
                  </span>
                ) : (
                  <span>Mã OTP đã hết thời gian chờ. Vui lòng bấm gửi lại.</span>
                )}
              </div>
            </div>

            {isSubmitting && (
              <div
                style={{
                  marginBottom: '14px',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--accent-income)',
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <RefreshCw size={16} className="animate-spin" />
                <span>{statusText || 'Đang xác thực...'}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setStep('FORM')}
                disabled={isSubmitting}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} /> Quay lại
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={isSubmitting || otpValue.length < 4}
                  className="btn btn-primary"
                  style={{ minWidth: '160px', justifyContent: 'center' }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" /> Đang kích hoạt...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} /> Xác nhận kích hoạt
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* === BƯỚC 1: NHẬP TÀI KHOẢN & MẬT KHẨU === */
          <form onSubmit={handleConnectSubmit}>
            {/* Ngân hàng phát hành */}
            <div className="input-group" style={{ marginBottom: '10px', gap: '4px' }}>
              <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Ngân hàng liên kết</label>
              <div className="input-with-icon">
                <Building2 size={16} className="input-icon-left" />
                <select
                  className="select-field"
                  value={bankName}
                  onChange={(e) => handleBankChange(e.target.value)}
                  disabled={Boolean(editingAccount) || isSubmitting}
                  style={{ padding: '0 12px 0 42px', height: '40px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                >
                  {SUPPORTED_BANKS.map((b) => (
                    <option key={b.code} value={b.shortName}>
                      {b.shortName} — {b.name} {b.code === 'VCB' ? '(SMS OTP)' : b.code === 'BIDV' ? '(SmartBanking - App 1 chạm)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!editingAccount && (
              <>
                {/* Tên đăng nhập */}
                <div className="input-group" style={{ marginBottom: '10px', gap: '4px' }}>
                  <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Tên đăng nhập Internet Banking (SĐT / CCCD)</label>
                  <div className="input-with-icon">
                    <UserRound size={16} className="input-icon-left" />
                    <input
                      className="input-field"
                      type="text"
                      value={apiUsername}
                      onChange={(e) => setApiUsername(e.target.value)}
                      placeholder={
                        bankName === 'BIDV'
                          ? 'Nhập SĐT đăng ký BIDV SmartBanking'
                          : bankName.includes('MB')
                          ? 'Nhập tên đăng nhập MB Bank'
                          : 'Nhập SĐT đăng ký VCB Digibank'
                      }
                      disabled={isSubmitting}
                      autoComplete="off"
                      style={{ padding: '8px 12px 8px 42px', height: '40px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                </div>

                {/* Mật khẩu */}
                <div className="input-group" style={{ marginBottom: '10px', gap: '4px' }}>
                  <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>Mật khẩu Internet Banking</label>
                  <div className="input-with-icon" style={{ position: 'relative' }}>
                    <LockKeyhole size={16} className="input-icon-left" />
                    <input
                      className="input-field"
                      type={showPassword ? 'text' : 'password'}
                      value={apiPassword}
                      onChange={(e) => setApiPassword(e.target.value)}
                      placeholder="Nhập mật khẩu"
                      disabled={isSubmitting}
                      autoComplete="new-password"
                      style={{ padding: '8px 40px 8px 42px', height: '40px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Tên gợi nhớ */}
            <div className="input-group" style={{ marginBottom: '10px', gap: '4px' }}>
              <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                Tên gợi nhớ {editingAccount ? '' : '(Để trống sẽ tự lấy Tên chủ tài khoản)'}
              </label>
              <div className="input-with-icon">
                <Tag size={16} className="input-icon-left" />
                <input
                  type="text"
                  className="input-field"
                  placeholder={editingAccount ? 'Nhập tên gợi nhớ' : 'Ví dụ: Chi tiêu hàng ngày, Quỹ tiết kiệm...'}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isSubmitting}
                  style={{ padding: '8px 12px 8px 42px', height: '40px', fontSize: '0.875rem', boxSizing: 'border-box' }}
                  required={Boolean(editingAccount)}
                />
              </div>
            </div>

            {/* Chọn màu sắc thẻ */}
            <div className="input-group" style={{ marginBottom: '10px', gap: '4px' }}>
              <label className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Palette size={14} /> Chọn màu sắc thẻ
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: '6px',
                  marginTop: '2px',
                }}
              >
                {CARD_COLOR_PRESETS.map((preset) => {
                  const isSelected = selectedColor === preset.gradient;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedColor(preset.gradient)}
                      disabled={isSubmitting}
                      style={{
                        height: '24px',
                        borderRadius: '6px',
                        background: preset.gradient,
                        border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.2)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? '0 0 8px rgba(255,255,255,0.6)' : 'none',
                        transition: 'all 0.15s',
                      }}
                      title={preset.name}
                    >
                      {isSelected && <Check size={13} color="#ffffff" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {!editingAccount && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: bankName === 'BIDV' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                  border: `1px solid ${bankName === 'BIDV' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                  color: bankName === 'BIDV' ? 'var(--accent-income)' : 'var(--accent-primary)',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  lineHeight: 1.4,
                }}
              >
                {bankName === 'BIDV' ? (
                  <>
                    <Smartphone size={15} style={{ flexShrink: 0 }} />
                    <span>
                      <strong>BIDV SmartBanking:</strong> Mở app trên điện thoại và bấm <strong>"Xác nhận"</strong> khi có thông báo để kích hoạt vĩnh viễn.
                    </span>
                  </>
                ) : (
                  <>
                    <Wifi size={15} style={{ flexShrink: 0 }} />
                    <span>
                      Hệ thống tự động nhận diện thiết bị mới và chuyển sang xác thực SMS OTP tiện lợi.
                    </span>
                  </>
                )}
              </div>
            )}

            {isSubmitting && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--accent-income)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <RefreshCw size={15} className="animate-spin" />
                <span>{statusText || 'Đang xử lý...'}</span>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="btn btn-secondary btn-sm"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-sm"
                style={{ minWidth: '140px', justifyContent: 'center', padding: '8px 16px', fontSize: '0.85rem' }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Đang kết nối...
                  </>
                ) : editingAccount ? (
                  'Lưu thay đổi'
                ) : (
                  <>
                    <Wifi size={14} /> Kết nối tài khoản
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
