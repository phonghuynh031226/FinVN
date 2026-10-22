import {
  getDateRangeByPreset,
  isDateRangeValid,
  formatDisplayDateTime,
  formatDisplayDate,
} from '../src/utils/date';

describe('Date & Timezone Utilities (Asia/Ho_Chi_Minh)', () => {
  it('tạo khoảng ngày Tháng này hợp lệ', () => {
    const range = getDateRangeByPreset('THIS_MONTH');
    expect(range.preset).toBe('THIS_MONTH');
    expect(range.startDate).toBeDefined();
    expect(range.endDate).toBeDefined();
    expect(range.startDate <= range.endDate).toBe(true);
    expect(range.label).toContain('Tháng này');
  });

  it('tạo khoảng ngày 7 ngày gần nhất hợp lệ', () => {
    const range = getDateRangeByPreset('LAST_7_DAYS');
    expect(range.preset).toBe('LAST_7_DAYS');
    expect(range.startDate <= range.endDate).toBe(true);
    expect(range.label).toBe('7 ngày gần nhất');
  });

  it('kiểm tra tính hợp lệ của khoảng ngày (isDateRangeValid)', () => {
    expect(isDateRangeValid('2026-10-01', '2026-10-16')).toBe(true);
    expect(isDateRangeValid('2026-10-16', '2026-10-16')).toBe(true);
    // Ngày bắt đầu sau ngày kết thúc -> false
    expect(isDateRangeValid('2026-10-20', '2026-10-10')).toBe(false);
  });

  it('định dạng ngày giờ hiển thị theo chuẩn Việt Nam', () => {
    const iso = '2026-10-16T07:30:00Z'; // 14:30 giờ VN (+7)
    const formatted = formatDisplayDateTime(iso);
    expect(formatted).toContain('16/10/2026');
    expect(formatted).toContain('14:30');
  });
});
