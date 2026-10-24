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
import { ToastContainer, ToastMessage } from './components/common/Toast';

import { BankAccount, CreateBankAccountInput, UpdateBankAccountInput, getBankProvider } from './types/bankAccount';
import { Transaction, CreateTransactionInput, FinancialSummary } from './types/transaction';
import { TransactionFilter } from './types/filter';
import { getDateRangeByPreset } from './utils/date';
import { dataService } from './services/dataService';
import { storageService } from './services/storage';
import { bankApiService } from './services/bankApi';
import { authService } from './services/authService';
import { WelcomeView } from './components/welcome/WelcomeView';
import { Plus, CreditCard, RefreshCw } from 'lucide-react';

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
    if (!authService.isAuthenticated()) {
      setAccounts([]);
      setTransactions([]);
      setSummary({
        totalIncome: 0,
        totalExpense: 0,
        netAmount: 0,
        totalBalance: 0,
      });
      return;
    }

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
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Auto Sync: force = true để bỏ qua cooldown, silent = true để không hiện popup toast khởi động
  const autoSyncAccounts = useCallback(async (force = false, silent = false) => {
    if (!authService.isAuthenticated()) {
      setIsSyncingAll(false);
      return;
    }
    try {
      if (force && !silent) {
        setIsSyncingAll(true);
      }
      const accs = await dataService.getAccounts();
      const credsMap = storageService.getBankCredentials();
      const now = Date.now();
      const COOLDOWN_MS = 15 * 60 * 1000; // 15 phút an toàn

      let anyUpdated = false;
      let totalImportedCount = 0;

      await Promise.allSettled(
        accs.map(async (acc) => {
          let creds: { username: string; password?: string; browserId?: string } | undefined = credsMap[acc.id];
          if (!creds) {
            creds = Object.values(credsMap).find(
              (c: any) => c.accountNumber === acc.accountNumber || c.username === acc.accountNumber
            );
            if (creds?.username && creds?.password) {
              storageService.saveAccountCredential(acc.id, creds);
            }
          }
          if (!creds?.password) {
            const lastSync = acc.lastSyncedAt || 0;
            if (!force && now - lastSync < COOLDOWN_MS) return;
            try {
              await bankApiService.syncSavedAccount(acc.id);
              anyUpdated = true;
            } catch (err: any) {
              if (!silent) addToast('error', `Lỗi đồng bộ ${acc.bankName}: ${err.message || 'không thể đồng bộ'}`);
            }
            return;
          }
          if (!creds?.username || !creds?.password) return;

          // Bỏ qua nếu chưa đủ thời gian cooldown (trừ khi force = true)
          const lastSync = acc.lastSyncedAt || 0;
          if (!force && now - lastSync < COOLDOWN_MS) {
            return;
          }

          const provider = getBankProvider(acc.bankName);

          try {
            if (!silent) {
              addToast('info', `Đang tự động đồng bộ ${acc.bankName}...`);
            }

            // 1. Lấy số dư mới nhất
            const conn = await bankApiService.connect({
              provider,
              username: creds.username,
              password: creds.password,
              accountNumber: acc.accountNumber,
              browserId: creds.browserId,
            });

            const activeBrowserId = conn.browserId || creds.browserId;

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
                browserId: activeBrowserId,
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

            // 4. Lưu lại browserId mới (nếu có) và cập nhật lastSyncedAt
            storageService.saveAccountCredential(acc.id, {
              username: creds.username,
              password: creds.password,
              browserId: activeBrowserId,
            });

            await dataService.updateAccount(acc.id, {
              currentBalance: conn.currentBalance,
              lastSyncedAt: now,
            });

            anyUpdated = true;
            totalImportedCount += importRes.importedCount;
            if (importRes.importedCount > 0 || importRes.correctedCount > 0) {
              addToast('info', `⚡ ${acc.bankName}: thêm ${importRes.importedCount} giao dịch, sửa ngày ${importRes.correctedCount} giao dịch.`);
            }
          } catch (err: any) {
            console.warn(`Tự động đồng bộ ${acc.bankName} tạm hoãn:`, err.message);
            if (!silent) {
              const msg = err.message || '';
              const isGW21 = msg.includes('GW21') || msg.includes('Customer is invalid');
              const displayMsg = isGW21
                ? `${acc.bankName}: Tên đăng nhập hoặc mật khẩu không chính xác (mã GW21). Vui lòng kiểm tra lại Tên đăng nhập trên App MBBank.`
                : `Lỗi đồng bộ ${acc.bankName}: ${msg}`;
              addToast('error', displayMsg);
            }
          }
        })
      );

      if (anyUpdated) {
        await refreshData();
      }
      if (!silent && anyUpdated) {
        addToast('success', `⚡ Đã hoàn tất đồng bộ tự động tất cả tài khoản ngân hàng!`);
      }
    } catch (e) {
      console.error('Lỗi khi chạy auto-sync:', e);
    } finally {
      setIsSyncingAll(false);
    }
  }, [addToast, refreshData]);

  // 1. Tải dữ liệu chính khi filter thay đổi
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Lắng nghe thay đổi trạng thái đăng nhập
  useEffect(() => {
    const unsub = authService.subscribe((user) => {
      if (!user) {
        setAccounts([]);
        setTransactions([]);
        setSummary({ totalIncome: 0, totalExpense: 0, netAmount: 0, totalBalance: 0 });
      } else {
        refreshData();
      }
    });
    return () => unsub();
  }, [refreshData]);

  // 2. Tự động đồng bộ ngay khi vừa mở ứng dụng + thiết lập chu kỳ cập nhật định kỳ mỗi 30 phút
  useEffect(() => {
    // Luôn chạy cập nhật ngay lập tức khi người dùng mở Web (chỉ khi đã đăng nhập)
    if (!hasAutoSyncedRef.current && authService.isAuthenticated()) {
      hasAutoSyncedRef.current = true;
      autoSyncAccounts(true, false);
    }

    // Thiết lập chu kỳ tự động cập nhật ngầm định kỳ mỗi 30 phút (30 * 60 * 1000 ms)
    const intervalId = setInterval(() => {
      if (authService.isAuthenticated()) {
        autoSyncAccounts(true, true);
      }
    }, 30 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [autoSyncAccounts]);

  // Account Handlers
  const handleCreateAccount = async (
    input: CreateBankAccountInput,
    credentials?: { username: string; password: string; browserId?: string }
  ) => {
    const provider = getBankProvider(input.bankName);

    const newAcc = await dataService.createAccount({
      ...input,
      lastSyncedAt: Date.now(),
    });

    // Lưu credentials an toàn cục bộ cho tài khoản để tự động đồng bộ khi mở web
    if (credentials?.username && credentials?.password) {
      storageService.saveAccountCredential(newAcc.id, {
        username: credentials.username,
        password: credentials.password,
        browserId: credentials.browserId,
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
            browserId: credentials.browserId,
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

  const handleOpenSync = async () => {
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

    const credsMap = storageService.getBankCredentials();
    let creds: { username: string; password?: string; browserId?: string } | undefined = credsMap[target.id];
    if (!creds) {
      // Tìm fallback nếu ID tài khoản vừa được cấp từ PostgreSQL
      creds = Object.values(credsMap).find(
        (c: any) => c.accountNumber === target.accountNumber || c.username === target.accountNumber
      ) || Object.values(credsMap)[0];
      if (creds?.username && creds?.password) {
        storageService.saveAccountCredential(target.id, creds);
      }
    }
    if (creds?.username && creds?.password) {
      addToast('info', `Đang tải giao dịch mới nhất từ ${target.bankName}...`);
      await autoSyncAccounts(true, false);
      return;
    }

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

  // Export CSV
  const handleExportCSV = async () => {
    const allTxs = await dataService.getTransactions(filter);
    dataService.exportTransactionsToCSV(allTxs);
    addToast('info', `Đã xuất ${allTxs.length} giao dịch ra file CSV!`);
  };

  // Titles
  const getTabTitle = () => {
    if (!authService.isAuthenticated()) {
      return {
        title: 'Chào mừng đến với FinVn',
        subtitle: 'Hệ thống Quản lý Tài chính & Đồng bộ Ngân hàng Thông minh',
      };
    }
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
          subtitle: 'Quản lý các tài khoản ngân hàng đã liên kết',
        };
    }
  };

  const { title, subtitle } = getTabTitle();

  // Khi chưa đăng nhập: Hiển thị toàn màn hình Trang Chào Mừng độc lập (KHÔNG hiển thị Header hay Sidebar)
  if (!authService.isAuthenticated()) {
    return (
      <div style={{ height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' }}>
        <WelcomeView
          theme={theme}
          onToggleTheme={toggleTheme}
          onLoginSuccess={() => {
            refreshData();
            autoSyncAccounts(true, true);
            addToast('success', 'Đăng nhập thành công! Chào mừng bạn trở lại.');
          }}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    );
  }

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
        onLogout={() => {
          setAccounts([]);
          setTransactions([]);
          setSummary({ totalIncome: 0, totalExpense: 0, netAmount: 0, totalBalance: 0 });
          addToast('info', 'Đã đăng xuất an toàn. Dữ liệu tài chính đã được bảo mật.');
        }}
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
          onSyncAll={() => autoSyncAccounts(true)}
          isSyncing={isSyncingAll}
          accounts={accounts}
          filter={filter}
          onFilterChange={setFilter}
          showFilters={authService.isAuthenticated() && (currentTab === 'dashboard' || currentTab === 'transactions')}
          isAuthenticated={authService.isAuthenticated()}
        />

        <main className="page-body">
          {/* TAB 1: DASHBOARD */}
          {currentTab === 'dashboard' && (
            <div className="animate-fade-in">
              {/* Stat Cards */}
              <StatCards
                summary={summary}
                dateRangeLabel={filter.dateRange.label}
                accountCount={
                  filter.accountId === 'ALL'
                    ? accounts.length
                    : accounts.some((account) => account.id === filter.accountId)
                      ? 1
                      : 0
                }
                isAggregated={filter.accountId === 'ALL'}
              />

              {/* Row: Dòng tiền theo thời gian & Giao dịch gần đây */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                  gap: '20px',
                  marginBottom: '8px',
                  alignItems: 'stretch',
                }}
              >
                <CashflowChart
                  transactions={transactions}
                  startDate={filter.dateRange?.startDate}
                  endDate={filter.dateRange?.endDate}
                />
                <TransactionList
                  transactions={transactions.slice(0, 4)}
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
                    Hãy thêm tài khoản ngân hàng của bạn (BIDV, Vietcombank, MB...) để bắt đầu quản lý số dư và theo dõi giao dịch.
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
                      onSync={(a) => setSyncAccount(a)}
                      onDelete={handleDeleteAccount}
                      onQuickUpdate={handleUpdateAccount}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: SETTINGS */}
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
