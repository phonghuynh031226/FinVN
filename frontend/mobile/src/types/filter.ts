export type DateRangePreset =
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'LAST_7_DAYS'
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
}
