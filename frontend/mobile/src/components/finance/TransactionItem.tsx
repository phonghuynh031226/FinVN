import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Transaction } from '../../types/transaction';
import { formatVND, maskAccountNumber } from '../../utils/currency';
import { formatDisplayDateTime } from '../../utils/date';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
}) => {
  const isIncome = transaction.type === 'INCOME';
  const displayTitle =
    transaction.userCategory ||
    transaction.category ||
    transaction.description ||
    'Giao dịch';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: isIncome ? '#DCFCE7' : '#FEE2E2' },
        ]}
      >
        <Text style={[styles.iconText, { color: isIncome ? '#16A34A' : '#DC2626' }]}>
          {isIncome ? '↓' : '↑'}
        </Text>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text
            style={[
              styles.amount,
              { color: isIncome ? '#16A34A' : '#DC2626' },
            ]}
          >
            {isIncome ? '+' : '-'}
            {formatVND(transaction.amount)}
          </Text>
        </View>

        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle} numberOfLines={1}>
            {transaction.bankAccount
              ? `${transaction.bankAccount.displayName} (${maskAccountNumber(
                  transaction.bankAccount.accountNumber
                )})`
              : 'Tài khoản ngân hàng'}
          </Text>
          <Text style={styles.timeText}>
            {formatDisplayDateTime(transaction.transactionDate)}
          </Text>
        </View>

        {/* Badges */}
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.sourceBadge,
              transaction.source === 'SEPAY'
                ? styles.sepayBadge
                : styles.manualBadge,
            ]}
          >
            <Text
              style={[
                styles.sourceText,
                transaction.source === 'SEPAY'
                  ? styles.sepayText
                  : styles.manualText,
              ]}
            >
              {transaction.source === 'SEPAY' ? 'SePay Đồng bộ' : 'Thủ công'}
            </Text>
          </View>
          {transaction.userNote ? (
            <Text style={styles.noteSnippet} numberOfLines={1}>
              💬 {transaction.userNote}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
    fontWeight: '700',
  },
  detailsContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sepayBadge: {
    backgroundColor: '#E0F2FE',
  },
  manualBadge: {
    backgroundColor: '#F1F5F9',
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  sepayText: {
    color: '#0369A1',
  },
  manualText: {
    color: '#64748B',
  },
  noteSnippet: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
    flex: 1,
  },
});
