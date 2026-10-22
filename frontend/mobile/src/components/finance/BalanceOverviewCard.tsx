import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FinancialSummary } from '../../types/transaction';
import { formatVND } from '../../utils/currency';

interface BalanceOverviewCardProps {
  summary: FinancialSummary;
  dateRangeLabel: string;
}

export const BalanceOverviewCard: React.FC<BalanceOverviewCardProps> = ({
  summary,
  dateRangeLabel,
}) => {
  const isNetPositive = summary.netAmount >= 0;

  return (
    <View style={styles.card}>
      {/* 1. Số dư hiện tại */}
      <View style={styles.balanceHeader}>
        <Text style={styles.balanceTitle}>TỔNG SỐ DƯ HIỆN TẠI</Text>
        <Text style={styles.balanceAmount}>{formatVND(summary.totalBalance)}</Text>
      </View>

      <View style={styles.divider} />

      {/* 2. Kỳ lọc giao dịch */}
      <View style={styles.periodRow}>
        <Text style={styles.periodText}>Kỳ báo cáo: {dateRangeLabel}</Text>
      </View>

      {/* 3. Thu vào - Chi ra */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <View style={styles.metricLabelRow}>
            <View style={[styles.indicator, { backgroundColor: '#10B981' }]} />
            <Text style={styles.metricLabel}>Tiền vào</Text>
          </View>
          <Text style={[styles.metricValue, { color: '#059669' }]}>
            +{formatVND(summary.totalIncome)}
          </Text>
        </View>

        <View style={styles.verticalDivider} />

        <View style={styles.metricItem}>
          <View style={styles.metricLabelRow}>
            <View style={[styles.indicator, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.metricLabel}>Tiền ra</Text>
          </View>
          <Text style={[styles.metricValue, { color: '#DC2626' }]}>
            -{formatVND(summary.totalExpense)}
          </Text>
        </View>
      </View>

      {/* 4. Chênh lệch (Net) trong kỳ */}
      <View style={styles.netRow}>
        <Text style={styles.netLabel}>Chênh lệch trong kỳ:</Text>
        <Text
          style={[
            styles.netValue,
            { color: isNetPositive ? '#059669' : '#DC2626' },
          ]}
        >
          {isNetPositive ? '+' : ''}
          {formatVND(summary.netAmount)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0284C7',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  balanceHeader: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  balanceTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#BAE6FD',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginVertical: 14,
  },
  periodRow: {
    marginBottom: 10,
    alignItems: 'center',
  },
  periodText: {
    fontSize: 11,
    color: '#E0F2FE',
    fontWeight: '500',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  netLabel: {
    fontSize: 12,
    color: '#E0F2FE',
    fontWeight: '500',
  },
  netValue: {
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
});
