import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Link } from 'expo-router';
import { useFilterStore } from '../../src/store/filterStore';
import { useFinancialSummary } from '../../src/hooks/useFinancialSummary';
import { useTransactions } from '../../src/hooks/useTransactions';
import { FilterBar } from '../../src/components/finance/FilterBar';
import { BalanceOverviewCard } from '../../src/components/finance/BalanceOverviewCard';
import { TransactionItem } from '../../src/components/finance/TransactionItem';
import { LoadingState } from '../../src/components/common/LoadingState';
import { ErrorState } from '../../src/components/common/ErrorState';
import { EmptyState } from '../../src/components/common/EmptyState';

export default function HomeScreen() {
  const { filter } = useFilterStore();
  const {
    data: summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useFinancialSummary(filter);

  const {
    data: transactions = [],
    isLoading: isTxLoading,
    error: txError,
    refetch: refetchTransactions,
  } = useTransactions(filter);

  const isRefreshing = isSummaryLoading || isTxLoading;

  const onRefresh = () => {
    refetchSummary();
    refetchTransactions();
  };

  const recentTransactions = transactions.slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      {/* 1. Thanh lọc tài khoản & thời gian */}
      <FilterBar />

      {/* 2. Thẻ tổng quan số dư & thu chi */}
      {isSummaryLoading && !summary ? (
        <LoadingState message="Đang tính toán số liệu tài chính..." />
      ) : summaryError ? (
        <ErrorState
          message="Không thể tải báo cáo số dư. Vui lòng thử lại."
          onRetry={refetchSummary}
        />
      ) : summary ? (
        <BalanceOverviewCard
          summary={summary}
          dateRangeLabel={filter.dateRange.label}
        />
      ) : null}

      {/* 3. Phần giao dịch gần đây */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
        <Link href="/(tabs)/transactions" asChild>
          <TouchableOpacity activeOpacity={0.7}>
            <Text style={styles.seeAllText}>Xem tất cả ({transactions.length}) →</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {isTxLoading && transactions.length === 0 ? (
        <LoadingState message="Đang tải danh sách giao dịch..." />
      ) : txError ? (
        <ErrorState
          message="Không thể tải giao dịch gần đây."
          onRetry={refetchTransactions}
        />
      ) : recentTransactions.length === 0 ? (
        <EmptyState
          title="Chưa có giao dịch trong kỳ này"
          description="Hãy thêm giao dịch thủ công hoặc kết nối SePay để đồng bộ tự động."
        />
      ) : (
        <View style={styles.transactionList}>
          {recentTransactions.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} />
          ))}
        </View>
      )}

      {/* Nút thêm giao dịch nhanh */}
      <View style={styles.quickActionContainer}>
        <Link href="/modal" asChild>
          <TouchableOpacity style={styles.quickAddButton} activeOpacity={0.8}>
            <Text style={styles.quickAddText}>+ Ghi chép giao dịch mới</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '600',
  },
  transactionList: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  quickAddButton: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  quickAddText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
