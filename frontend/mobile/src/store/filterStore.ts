import { create } from 'zustand';
import { DateRangePreset, TransactionFilter } from '../types/filter';
import { getDateRangeByPreset, isDateRangeValid } from '../utils/date';

interface FilterState {
  filter: TransactionFilter;
  setAccountId: (accountId: string | 'ALL') => void;
  setDateRangePreset: (preset: DateRangePreset, customStart?: string, customEnd?: string) => void;
  setSearchQuery: (query: string) => void;
  setTypeFilter: (type: 'ALL' | 'INCOME' | 'EXPENSE') => void;
  resetFilter: () => void;
}

const initialDateRange = getDateRangeByPreset('THIS_MONTH');

const initialFilter: TransactionFilter = {
  accountId: 'ALL',
  dateRange: initialDateRange,
  searchQuery: '',
  type: 'ALL',
};

export const useFilterStore = create<FilterState>((set) => ({
  filter: initialFilter,

  setAccountId: (accountId) =>
    set((state) => ({
      filter: { ...state.filter, accountId },
    })),

  setDateRangePreset: (preset, customStart, customEnd) => {
    if (preset === 'CUSTOM' && customStart && customEnd) {
      if (!isDateRangeValid(customStart, customEnd)) {
        throw new Error('Ngày bắt đầu không được sau ngày kết thúc.');
      }
    }
    const newRange = getDateRangeByPreset(preset, customStart, customEnd);
    set((state) => ({
      filter: { ...state.filter, dateRange: newRange },
    }));
  },

  setSearchQuery: (searchQuery) =>
    set((state) => ({
      filter: { ...state.filter, searchQuery },
    })),

  setTypeFilter: (type) =>
    set((state) => ({
      filter: { ...state.filter, type },
    })),

  resetFilter: () =>
    set({
      filter: {
        ...initialFilter,
        dateRange: getDateRangeByPreset('THIS_MONTH'),
      },
    }),
}));
