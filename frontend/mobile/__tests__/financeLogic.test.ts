import { transactionsApi } from '../src/services/transactionsApi';
import { TransactionFilter } from '../src/types/filter';

describe('Finance Business Logic', () => {
  it('phân biệt rõ số dư hiện tại và tổng thu/chi trong kỳ', async () => {
    const filter: TransactionFilter = {
      accountId: 'ALL',
      dateRange: {
        preset: 'THIS_MONTH',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        label: 'Tháng 10',
      },
    };

    const summary = await transactionsApi.getFinancialSummary(filter);

    // 1. Phải có tổng số dư
    expect(summary.totalBalance).toBeGreaterThan(0);

    // 2. Không được cộng số dư vào totalIncome
    expect(summary.totalIncome).not.toBe(summary.totalBalance);

    // 3. Chênh lệch phải bằng totalIncome - totalExpense
    expect(summary.netAmount).toBe(summary.totalIncome - summary.totalExpense);
  });

  it('lọc chính xác theo tài khoản cụ thể', async () => {
    const filterAcc1: TransactionFilter = {
      accountId: 'acc-1',
      dateRange: {
        preset: 'THIS_MONTH',
        startDate: '2000-01-01',
        endDate: '2099-12-31',
        label: 'Tất cả thời gian',
      },
    };

    const txsAcc1 = await transactionsApi.getTransactions(filterAcc1);
    // Mọi giao dịch trả về phải thuộc về accountId 'acc-1'
    for (const tx of txsAcc1) {
      expect(tx.accountId).toBe('acc-1');
    }
  });

  it('tổng số dư khi xem Tất cả tài khoản bằng tổng các tài khoản thành phần', async () => {
    const filterAll: TransactionFilter = {
      accountId: 'ALL',
      dateRange: {
        preset: 'THIS_MONTH',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        label: 'Tháng 10',
      },
    };
    const summaryAll = await transactionsApi.getFinancialSummary(filterAll);

    const filterAcc1: TransactionFilter = { ...filterAll, accountId: 'acc-1' };
    const filterAcc2: TransactionFilter = { ...filterAll, accountId: 'acc-2' };

    const summary1 = await transactionsApi.getFinancialSummary(filterAcc1);
    const summary2 = await transactionsApi.getFinancialSummary(filterAcc2);

    expect(summaryAll.totalBalance).toBe(summary1.totalBalance + summary2.totalBalance);
  });
});
