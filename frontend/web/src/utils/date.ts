import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { DateRange, DateRangePreset } from '../types/filter';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

export function getNowInVietnam(): dayjs.Dayjs {
  return dayjs().tz(VIETNAM_TIMEZONE);
}

export function getDateRangeByPreset(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string
): DateRange {
  const now = getNowInVietnam();

  switch (preset) {
    case 'TODAY': {
      const todayStr = now.format('YYYY-MM-DD');
      return {
        preset,
        startDate: todayStr,
        endDate: todayStr,
        label: 'Hôm nay',
      };
    }
    case 'LAST_7_DAYS': {
      const start = now.subtract(7, 'day').format('YYYY-MM-DD');
      const end = now.format('YYYY-MM-DD');
      return {
        preset,
        startDate: start,
        endDate: end,
        label: '7 ngày qua',
      };
    }
    case 'LAST_30_DAYS': {
      // 30 ngày qua: Tính từ ngày hiện tại lui về 30 ngày (ví dụ: 23/09/2026 - 23/10/2026)
      const start = now.subtract(30, 'day').format('YYYY-MM-DD');
      const end = now.format('YYYY-MM-DD');
      return {
        preset,
        startDate: start,
        endDate: end,
        label: '30 ngày qua',
      };
    }
    case 'THIS_MONTH': {
      // Tháng này: Tính từ ngày 1 của tháng đến ngày hiện tại (ví dụ: 01/10/2026 - 23/10/2026)
      const start = now.startOf('month').format('YYYY-MM-DD');
      const end = now.format('YYYY-MM-DD');
      return {
        preset,
        startDate: start,
        endDate: end,
        label: `Tháng này (${now.format('MM/YYYY')})`,
      };
    }
    case 'THIS_YEAR': {
      const start = now.startOf('year').format('YYYY-MM-DD');
      const end = now.endOf('year').format('YYYY-MM-DD');
      return {
        preset,
        startDate: start,
        endDate: end,
        label: `Năm nay (${now.format('YYYY')})`,
      };
    }
    case 'CUSTOM': {
      const start = customStart || now.startOf('month').format('YYYY-MM-DD');
      const end = customEnd || now.format('YYYY-MM-DD');
      return {
        preset,
        startDate: start,
        endDate: end,
        label: `${dayjs(start).format('DD/MM/YYYY')} - ${dayjs(end).format('DD/MM/YYYY')}`,
      };
    }
    default:
      return getDateRangeByPreset('THIS_MONTH');
  }
}

export function formatDisplayDateTime(isoString: string): string {
  if (!isoString) return '';
  return dayjs(isoString).tz(VIETNAM_TIMEZONE).format('DD/MM/YYYY HH:mm');
}

export function formatDisplayDate(isoString: string): string {
  if (!isoString) return '';
  return dayjs(isoString).tz(VIETNAM_TIMEZONE).format('DD/MM/YYYY');
}

export function formatDisplayTime(isoString: string): string {
  if (!isoString) return '';
  return dayjs(isoString).tz(VIETNAM_TIMEZONE).format('HH:mm');
}

export function getLocalDateString(isoString: string): string {
  if (!isoString) return '';
  return dayjs(isoString).tz(VIETNAM_TIMEZONE).format('YYYY-MM-DD');
}
