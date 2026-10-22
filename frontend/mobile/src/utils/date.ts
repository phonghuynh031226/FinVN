import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { DateRange, DateRangePreset } from '../types/filter';

dayjs.extend(utc);
dayjs.extend(timezone);

export const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

export function getNowInVietnam(): dayjs.Dayjs {
  return dayjs().tz(VIETNAM_TIMEZONE);
}

/**
 * Lấy khoảng ngày chuẩn theo múi giờ Việt Nam
 */
export function getDateRangeByPreset(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string
): DateRange {
  const now = getNowInVietnam();

  switch (preset) {
    case 'THIS_MONTH': {
      const start = now.startOf('month').format('YYYY-MM-DD');
      const end = now.endOf('month').format('YYYY-MM-DD');
      return {
        preset,
        startDate: start,
        endDate: end,
        label: `Tháng này (${now.format('MM/YYYY')})`,
      };
    }
    case 'LAST_MONTH': {
      const lastMonth = now.subtract(1, 'month');
      const start = lastMonth.startOf('month').format('YYYY-MM-DD');
      const end = lastMonth.endOf('month').format('YYYY-MM-DD');
      return {
        preset,
        startDate: start,
        endDate: end,
        label: `Tháng trước (${lastMonth.format('MM/YYYY')})`,
      };
    }
    case 'LAST_7_DAYS': {
      const start = now.subtract(6, 'day').format('YYYY-MM-DD');
      const end = now.format('YYYY-MM-DD');
      return {
        preset,
        startDate: start,
        endDate: end,
        label: '7 ngày gần nhất',
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

/**
 * Kiểm tra ngày bắt đầu không được sau ngày kết thúc (so sánh định dạng YYYY-MM-DD)
 */
export function isDateRangeValid(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return false;
  return startDate <= endDate;
}

/**
 * Định dạng ngày giờ hiển thị theo kiểu Việt Nam
 */
export function formatDisplayDateTime(isoString: string): string {
  if (!isoString) return '';
  return dayjs(isoString).tz(VIETNAM_TIMEZONE).format('DD/MM/YYYY HH:mm');
}

export function formatDisplayDate(isoString: string): string {
  if (!isoString) return '';
  return dayjs(isoString).tz(VIETNAM_TIMEZONE).format('DD/MM/YYYY');
}
