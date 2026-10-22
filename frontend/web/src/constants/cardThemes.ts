export interface CardColorPreset {
  id: string;
  name: string;
  gradient: string;
  dotColor: string;
}

export const CARD_COLOR_PRESETS: CardColorPreset[] = [
  {
    id: 'emerald',
    name: 'Lục Bảo (Emerald)',
    gradient: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
    dotColor: '#10b981',
  },
  {
    id: 'crimson',
    name: 'Đỏ Ruby (Crimson)',
    gradient: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)',
    dotColor: '#ef4444',
  },
  {
    id: 'royal-blue',
    name: 'Lam Sapphire (Royal Blue)',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
    dotColor: '#3b82f6',
  },
  {
    id: 'purple',
    name: 'Tím Thạch Anh (Amethyst)',
    gradient: 'linear-gradient(135deg, #581c87 0%, #8b5cf6 100%)',
    dotColor: '#8b5cf6',
  },
  {
    id: 'titanium',
    name: 'Đen Titan (Dark Obsidian)',
    gradient: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
    dotColor: '#52525b',
  },
  {
    id: 'rose-gold',
    name: 'Hồng Sunset (Rose Gold)',
    gradient: 'linear-gradient(135deg, #881337 0%, #e11d48 100%)',
    dotColor: '#e11d48',
  },
  {
    id: 'cyan',
    name: 'Xanh Ngọc (Ocean Cyan)',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)',
    dotColor: '#06b6d4',
  },
  {
    id: 'gold',
    name: 'Vàng Kim (Amber Gold)',
    gradient: 'linear-gradient(135deg, #92400e 0%, #f59e0b 100%)',
    dotColor: '#f59e0b',
  },
];

export const RANDOM_PURPOSE_NAMES = [
  'Lương',
  'Nhận lương & Chi tiêu',
  'Quỹ tiết kiệm',
  'Đầu tư sinh lời',
  'Chi tiêu gia đình',
  'Mua sắm & Du lịch',
  'Kinh doanh',
  'Quỹ khẩn cấp',
  'Chi phí sinh hoạt',
  'Tiết kiệm kỳ hạn',
];

export function getRandomPurposeName(current?: string): string {
  const filtered = RANDOM_PURPOSE_NAMES.filter((n) => n !== current);
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex] || 'Lương';
}
