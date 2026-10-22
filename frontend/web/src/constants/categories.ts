export interface CategoryDef {
  name: string;
  type: 'INCOME' | 'EXPENSE';
  color: string;
  bgLight: string;
  icon: string;
}

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { name: 'Ăn uống', type: 'EXPENSE', color: '#f59e0b', bgLight: 'rgba(245, 158, 11, 0.15)', icon: 'Utensils' },
  { name: 'Mua sắm', type: 'EXPENSE', color: '#ec4899', bgLight: 'rgba(236, 72, 153, 0.15)', icon: 'ShoppingBag' },
  { name: 'Nhà ở & Tiện ích', type: 'EXPENSE', color: '#8b5cf6', bgLight: 'rgba(139, 92, 246, 0.15)', icon: 'Home' },
  { name: 'Đi lại & Xăng xe', type: 'EXPENSE', color: '#06b6d4', bgLight: 'rgba(6, 182, 212, 0.15)', icon: 'Car' },
  { name: 'Hóa đơn dịch vụ', type: 'EXPENSE', color: '#ef4444', bgLight: 'rgba(239, 68, 68, 0.15)', icon: 'Receipt' },
  { name: 'Giải trí & Du lịch', type: 'EXPENSE', color: '#3b82f6', bgLight: 'rgba(59, 130, 246, 0.15)', icon: 'Film' },
  { name: 'Sức khỏe & Y tế', type: 'EXPENSE', color: '#10b981', bgLight: 'rgba(16, 185, 129, 0.15)', icon: 'HeartPulse' },
  { name: 'Giáo dục & Học tập', type: 'EXPENSE', color: '#14b8a6', bgLight: 'rgba(20, 184, 166, 0.15)', icon: 'GraduationCap' },
  { name: 'Chi tiêu khác', type: 'EXPENSE', color: '#64748b', bgLight: 'rgba(100, 116, 139, 0.15)', icon: 'MoreHorizontal' },
];

export const INCOME_CATEGORIES: CategoryDef[] = [
  { name: 'Lương', type: 'INCOME', color: '#10b981', bgLight: 'rgba(16, 185, 129, 0.15)', icon: 'Banknote' },
  { name: 'Thưởng', type: 'INCOME', color: '#06b6d4', bgLight: 'rgba(6, 182, 212, 0.15)', icon: 'Award' },
  { name: 'Đầu tư & Cổ tức', type: 'INCOME', color: '#3b82f6', bgLight: 'rgba(59, 130, 246, 0.15)', icon: 'TrendingUp' },
  { name: 'Kinh doanh phụ', type: 'INCOME', color: '#8b5cf6', bgLight: 'rgba(139, 92, 246, 0.15)', icon: 'Briefcase' },
  { name: 'Quà tặng', type: 'INCOME', color: '#ec4899', bgLight: 'rgba(236, 72, 153, 0.15)', icon: 'Gift' },
  { name: 'Lãi tiết kiệm', type: 'INCOME', color: '#f59e0b', bgLight: 'rgba(245, 158, 11, 0.15)', icon: 'PiggyBank' },
  { name: 'Thu nhập khác', type: 'INCOME', color: '#64748b', bgLight: 'rgba(100, 116, 139, 0.15)', icon: 'PlusCircle' },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function getCategoryDef(categoryName?: string | null): CategoryDef {
  if (!categoryName) {
    return { name: 'Chưa phân loại', type: 'EXPENSE', color: '#94a3b8', bgLight: 'rgba(148, 163, 184, 0.15)', icon: 'Tag' };
  }
  const found = ALL_CATEGORIES.find((c) => c.name.toLowerCase() === categoryName.toLowerCase());
  return (
    found || {
      name: categoryName,
      type: 'EXPENSE',
      color: '#8b5cf6',
      bgLight: 'rgba(139, 92, 246, 0.15)',
      icon: 'Tag',
    }
  );
}
