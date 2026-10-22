export type DateRangePreset =
  | 'TODAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'THIS_YEAR'
  | 'CUSTOM';

export interface DateRange {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string;
}

export interface TransactionFilter {
  accountId: string | 'ALL';
  dateRange: DateRange;
  searchQuery?: string;
  type?: 'ALL' | 'INCOME' | 'EXPENSE';
  category?: string | 'ALL';
}
