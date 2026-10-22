import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar, TabKey } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { StatCards } from './components/dashboard/StatCards';
import { CashflowChart } from './components/dashboard/CashflowChart';
import { AccountCard } from './components/accounts/AccountCard';
import { AccountModal } from './components/accounts/AccountModal';
import { SyncBankModal } from './components/accounts/SyncBankModal';
import { TransactionList } from './components/transactions/TransactionList';
import { TransactionModal } from './components/transactions/TransactionModal';
import { TransactionDetailModal } from './components/transactions/TransactionDetailModal';
import { SepaySimulatorModal } from './components/sepay/SepaySimulatorModal';
import { SettingsView } from './components/settings/SettingsView';
import { ToastContainer, ToastMessage } from './components/common/Toast';

import { BankAccount, CreateBankAccountInput, UpdateBankAccountInput } from './types/bankAccount';
import { Transaction, CreateTransactionInput, FinancialSummary } from './types/transaction';
import { TransactionFilter } from './types/filter';
import { getDateRangeByPreset } from './utils/date';
import { dataService, SepayWebhookPayload } from './services/dataService';
import { storageService } from './services/storage';
import { bankApiService } from './services/bankApi';
import { Plus, CreditCard, Zap, RefreshCw } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentTab, setCurrentTab] = useState<TabKey>('dashboard');
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [syncAccount, setSyncAccount] = useState<BankAccount | null>(null);

  // Core Data State
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpense: 0,
    netAmount: 0,
    totalBalance: 0,
  });

  // Filter State
  const [filter, setFilter] = useState<TransactionFilter>({
    accountId: 'ALL',
    dateRange: getDateRangeByPreset('THIS_MONTH'),
    type: 'ALL',
    category: 'ALL',
  });

  // Modal State
  const [isAddTxModalOpen, setAddTxModalOpen] = useState(false);
  const [isAccountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isSepayModalOpen, setSepayModalOpen] = useState(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Toggle Theme
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Fetch Data
  const refreshData = useCallback(async () => {
    try {
      const [accs, txs, sum] = await Promise.all([
        dataService.getAccounts(),
        dataService.getTransactions(filter),
        dataService.getFinancialSummary(filter),
      ]);
      setAccounts(accs);
      setTransactions(txs);
      setSummary(sum);
    } catch (e: any) {
      console.error(e);
      addToast('error', e.message || 'Lỗi tải dữ liệu');
    }
  }, [filter, addToast]);

  // Ref để đảm bảo auto-sync chỉ chạy đúng 1 lần khi load app, chống loop render
  const hasAutoSyncedRef = useRef(false);

  // Auto Sync on load với cơ chế Cooldown 15 phút bảo vệ tài khoản
  const autoSyncAccounts = useCallback(async () => {
    try {
      const accs = await dataService.getAccounts();
      const credsMap = storageService.getBankCredentials();
      const now = Date.now();
      const COOLDOWN_MS = 15 * 60 * 1000; // 15 phút an toàn tuyệt đối tránh quét

      let anyUpdated = false;

      for (const acc of accs) {
        const creds = credsMap[acc.id];
        if (!creds?.username || !creds?.password) continue;

        // Kiểm tra xem đã qua 15 phút kể từ lần đồng bộ trước chưa
        const lastSync = acc.lastSyncedAt || 0;
        if (now - lastSync < COOLDOWN_MS) {
          // Chưa đủ 15 phút, bỏ qua để bảo vệ tài khoản ngân hàng không bị quét
          continue;
        }

        const isVCB = acc.bankName.includes('Vietcombank') || acc.bankName === 'VCB';
        const provider = isVCB ? 'VCB' : 'MB';

        try {
          // 1. Lấy số dư mới nhất
          const conn = await bankApiService.connect({
            provider,
            username: creds.username,
            password: creds.password,
            accountNumber: acc.accountNumber,
            browserId: creds.browserId,
          });

          // 2. Tải 30 ngày giao dịch
          const today = new Date();
          const from = new Date(today);
          from.setDate(today.getDate() - 30);
          const formatDate = (d: Date) => d.toISOString().slice(0, 10);

          const bankTxs = await bankApiService.getTransactions(
            {
              provider,
              username: creds.username,
              password: creds.password,
              accountNumber: conn.accountNumber || acc.accountNumber,
              browserId: creds.browserId,
            },
            formatDate(from),
            formatDate(today)
          );

          // 3. Nhập vào cơ sở dữ liệu
          const importRes = await dataService.importBankTransactions(
            acc.id,
            bankTxs,
            conn.currentBalance
          );

          // 4. Cập nhật lastSyncedAt
          await dataService.updateAccount(acc.id, {
            currentBalance: conn.currentBalance,
            lastSyncedAt: now,
          });

          anyUpdated = true;
          if (importRes.importedCount > 0) {
            addToast('info', `⚡ Tự động nạp ${importRes.importedCount} giao dịch mới từ ${acc.bankName}!`);
          }
        } catch (err: any) {
          console.warn(`Tự động đồng bộ ${acc.bankName} tạm hoãn:`, err.message);
        }
      }

      if (anyUpdated) {
        await refreshData();
      }
    } catch (e) {
      console.error('Lỗi khi chạy auto-sync:', e);
    }
  }, [addToast, refreshData]);

  // 1. Tải dữ liệu chính khi filter thay đổi
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // 2. Tự động đồng bộ ngầm đúng 1 lần duy nhất khi người dùng mở Web
  useEffect(() => {
    if (hasAutoSyncedRef.current) return;
    hasAutoSyncedRef.current = true;
    autoSyncAccounts();
  }, [autoSyncAccounts]);

  // Account Handlers
  const handleCreateAccount = async (
    input: CreateBankAccountInput,
    credentials?: { username: string; password: string }
  ) => {
    const isVCB = input.bankName.includes('Vietcombank') || input.bankName === 'VCB';
    const provider = isVCB ? 'VCB' : 'MB';

    const newAcc = await dataService.createAccount({
      ...input,
      lastSyncedAt: Date.now(),
    });

    // Lưu credentials an toàn cục bộ cho tài khoản để tự động đồng bộ khi mở web
    if (credentials?.username && credentials?.password) {
      storageService.saveAccountCredential(newAcc.id, {
        username: credentials.username,
        password: credentials.password,
      });
    }

    addToast(
      'success',
      `Kết nối ${input.displayName} thành công! Số dư thực tế: ${input.initialBalance.toLocaleString('vi-VN')} VND`
    );

    // Tự động kéo 30 ngày giao dịch từ ngân hàng về ngay lập tức
    if (credentials?.username && credentials?.password) {
      try {
        const today = new Date();
        const from = new Date(today);
        from.setDate(today.getDate() - 30);
        const formatDate = (d: Date) => d.toISOString().slice(0, 10);

        const bankTxs = await bankApiService.getTransactions(
          {
            provider,
            username: credentials.username,
            password: credentials.password,
            accountNumber: input.accountNumber,
          },
          formatDate(from),
          formatDate(today)
        );

        if (bankTxs.length > 0) {
          const importRes = await dataService.importBankTransactions(newAcc.id, bankTxs);
          addToast('info', `Đã tự động nạp ${importRes.importedCount} giao dịch thực tế từ ${input.bankName} vào sổ!`);
        }
      } catch (err: any) {
        console.error('Không thể tự động tải giao dịch:', err);
      }
    }

    await refreshData();
  };

  const handleOpenSync = () => {
    if (accounts.length === 0) {
      addToast('info', 'Vui lòng kết nối tài khoản ngân hàng trước khi đồng bộ.');
      setEditingAccount(null);
      setAccountModalOpen(true);
      return;
    }
    const target =
      filter.accountId !== 'ALL'
        ? accounts.find((a) => a.id === filter.accountId) || accounts[0]
        : accounts[0];
    setSyncAccount(target);
  };

  const handleUpdateAccount = async (id: string, updates: UpdateBankAccountInput) => {
    await dataService.updateAccount(id, updates);
    addToast('success', 'Đã cập nhật thông tin tài khoản!');
    await refreshData();
  };

  const handleDeleteAccount = async (acc: BankAccount) => {
    if (
      window.confirm(
        `Xác nhận xóa tài khoản "${acc.displayName}"?\n\nLưu ý: Tất cả lịch sử giao dịch vẫn được giữ nguyên an toàn để bảo toàn báo cáo của bạn.`
      )
    ) {
      await dataService.softDeleteAccount(acc.id);
      addToast('info', `Đã gỡ tài khoản "${acc.displayName}" khỏi danh sách hoạt động.`);
      await refreshData();
    }
  };

  // Transaction Handlers
  const handleCreateTransaction = async (input: CreateTransactionInput) => {
    await dataService.createTransaction(input);
    addToast('success', 'Đã ghi nhận giao dịch mới!');
    await refreshData();
  };

  const handleUpdateTransaction = async (
    id: string,
    updates: { userCategory?: string; userNote?: string }
  ) => {
    await dataService.updateTransaction(id, updates);
    addToast('success', 'Đã cập nhật ghi chú giao dịch!');
    await refreshData();
  };

  const handleDeleteTransaction = async (id: string) => {
    await dataService.deleteTransaction(id);
    addToast('info', 'Đã xóa giao dịch và hoàn lại số dư tài khoản.');
    await refreshData();
  };

  // SePay Simulator Handler
  const handleSimulateSepay = async (payload: SepayWebhookPayload) => {
    await dataService.simulateSepayWebhook(payload);
    addToast('success', `⚡ Nhận webhook SePay thành công! Giao dịch đã được đồng bộ tự động.`);
    await refreshData();
  };

  // Export CSV
  const handleExportCSV = async () => {
    const allTxs = await dataService.getTransactions(filter);
    dataService.exportTransactionsToCSV(allTxs);
    addToast('info', `Đã xuất ${allTxs.length} giao dịch ra file CSV!`);
  };

  // Titles
  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'Báo cáo & Phân tích tài chính',
          subtitle: `Theo dõi dòng tiền, số dư và báo cáo giao dịch ${filter.dateRange.label}`,
        };
      case 'transactions':
        return {
          title: 'Sổ giao dịch chi tiết',
          subtitle: 'Tìm kiếm, lọc và phân loại mọi khoản thu nhập & chi tiêu',
        };
      case 'accounts':
        return {
          title: 'Tài khoản ngân hàng',
          subtitle: 'Quản lý các tài khoản liên kết và theo dõi trạng thái SePay Webhook',
        };
      case 'sepay':
        return {
          title: 'Tích hợp & Mô phỏng SePay',
          subtitle: 'Kiểm thử nhận giao dịch chuyển khoản ngân hàng tự động qua Webhook',
        };
      case 'settings':
        return {
          title: 'Cài đặt & Hướng dẫn',
          subtitle: 'Cấu hình hệ thống, cam kết bảo mật và hướng dẫn kết nối ngân hàng',
        };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        totalBalance={summary.totalBalance}
        theme={theme}
        onToggleTheme={toggleTheme}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Header
          title={title}
          subtitle={subtitle}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          onOpenAddTransaction={handleOpenSync}
          onOpenAddAccount={() => {
            setEditingAccount(null);
            setAccountModalOpen(true);
          }}
          onOpenSepaySimulator={() => setSepayModalOpen(true)}
          accounts={accounts}
          filter={filter}
          onFilterChange={setFilter}
          showFilters={currentTab === 'dashboard' || currentTab === 'transactions'}
        />

        <main className="page-body">
          {/* TAB 1: DASHBOARD */}
          {currentTab === 'dashboard' && (
            <div className="animate-fade-in">
              {/* Stat Cards */}
              <StatCards
                summary={summary}
                dateRangeLabel={filter.dateRange.label}
                accountCount={accounts.length}
              />

              {/* Row: Dòng tiền theo thời gian & Giao dịch gần đây */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                  gap: '20px',
                  marginBottom: '16px',
                  alignItems: 'stretch',
                }}
              >
                <CashflowChart transactions={transactions} />
                <TransactionList
                  transactions={transactions.slice(0, 6)}
                  filter={filter}
                  onFilterChange={setFilter}
                  onSelectTransaction={setSelectedTx}
                  onOpenAddModal={handleOpenSync}
                  onExportCSV={handleExportCSV}
                  title="Giao dịch gần đây"
                  isCompact={true}
                />
              </div>

            </div>
          )}

          {/* TAB 2: TRANSACTIONS */}
          {currentTab === 'transactions' && (
            <div className="animate-fade-in">
              <TransactionList
                transactions={transactions}
                filter={filter}
                onFilterChange={setFilter}
                onSelectTransaction={setSelectedTx}
                onOpenAddModal={handleOpenSync}
                onExportCSV={handleExportCSV}
                title="Sổ giao dịch toàn diện"
                isCompact={false}
              />
            </div>
          )}

          {/* TAB 3: BANK ACCOUNTS */}
          {currentTab === 'accounts' && (
            <div className="animate-fade-in">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Danh sách tài khoản ({accounts.length})</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Mỗi tài khoản được bảo toàn lịch sử giao dịch ngay cả khi ngừng sử dụng.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingAccount(null);
                    setAccountModalOpen(true);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={16} /> Thêm tài khoản mới
                </button>
              </div>

              {accounts.length === 0 ? (
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
                    <CreditCard size={28} />
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Chưa có tài khoản ngân hàng nào</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '420px' }}>
                    Hãy thêm tài khoản ngân hàng của bạn (Vietcombank, Techcombank, MB, ACB...) để bắt đầu quản lý số dư và theo dõi giao dịch.
                  </p>
                  <button
                    onClick={() => {
                      setEditingAccount(null);
                      setAccountModalOpen(true);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '8px' }}
                  >
                    <Plus size={16} /> Thêm tài khoản ngay
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '24px',
                  }}
                >
                  {accounts.map((acc) => (
                    <AccountCard
                      key={acc.id}
                      account={acc}
                      onEdit={(a) => {
                        setEditingAccount(a);
                        setAccountModalOpen(true);
                      }}
                      onDelete={handleDeleteAccount}
                      onQuickUpdate={handleUpdateAccount}
                      onSync={(a) => setSyncAccount(a)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SEPAY SIMULATOR TAB */}
          {currentTab === 'sepay' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-card" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                    }}
                  >
                    <Zap size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Trung tâm Kiểm thử SePay Webhook</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Mô phỏng tức thì biến động số dư chuyển khoản đến hoặc đi để kiểm tra tính năng đồng bộ tự động.
                    </p>
                  </div>
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Khi bạn bấm nút dưới đây, hệ thống sẽ mô phỏng một webhook payload chuẩn từ SePay, tự động kiểm tra tính duy nhất (Idempotent), khớp số tài khoản ngân hàng và cập nhật số dư ngay lập tức trên dashboard.
                </p>

                <button onClick={() => setSepayModalOpen(true)} className="btn btn-primary btn-lg">
                  <Zap size={18} /> Mở bảng điều khiển Mô phỏng Webhook
                </button>
              </div>

              {/* Webhook transaction ledger */}
              <TransactionList
                transactions={transactions.filter((t) => t.source === 'SEPAY')}
                filter={filter}
                onFilterChange={setFilter}
                onSelectTransaction={setSelectedTx}
                onOpenAddModal={() => setAddTxModalOpen(true)}
                onExportCSV={handleExportCSV}
                title="Lịch sử các giao dịch đồng bộ qua SePay"
                isCompact={true}
              />
            </div>
          )}

          {/* TAB: SETTINGS */}
          {currentTab === 'settings' && <SettingsView onResetData={refreshData} />}
        </main>
      </div>

      {/* MODALS */}
      {/* 1. Add Transaction Modal */}
      <TransactionModal
        isOpen={isAddTxModalOpen}
        onClose={() => setAddTxModalOpen(false)}
        onSubmit={handleCreateTransaction}
        accounts={accounts}
        defaultAccountId={filter.accountId !== 'ALL' ? filter.accountId : undefined}
      />

      {/* 2. Add / Edit Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setAccountModalOpen(false);
          setEditingAccount(null);
        }}
        onSubmit={handleCreateAccount}
        editingAccount={editingAccount}
        onUpdate={handleUpdateAccount}
        existingAccounts={accounts}
      />

      {/* 3. Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTx}
        isOpen={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        onUpdate={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
      />

      {/* 4. SePay Simulator Modal */}
      <SepaySimulatorModal
        isOpen={isSepayModalOpen}
        onClose={() => setSepayModalOpen(false)}
        onSimulate={handleSimulateSepay}
        accounts={accounts}
      />

      {/* 5. Sync Bank Modal */}
      {syncAccount && (
        <SyncBankModal
          isOpen={Boolean(syncAccount)}
          onClose={() => setSyncAccount(null)}
          account={syncAccount}
          onSuccess={(msg) => {
            addToast('success', msg);
            refreshData();
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
