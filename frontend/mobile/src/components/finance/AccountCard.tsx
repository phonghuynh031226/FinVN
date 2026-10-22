import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BankAccount } from '../../types/bankAccount';
import { formatVND, maskAccountNumber } from '../../utils/currency';

interface AccountCardProps {
  account: BankAccount;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onDelete,
}) => {
  const getSepayStatusBadge = () => {
    switch (account.sepayStatus) {
      case 'CONNECTED':
        return {
          label: 'SePay: Đã kết nối',
          bgColor: '#DCFCE7',
          textColor: '#15803D',
        };
      case 'PENDING':
        return {
          label: 'SePay: Đang kết nối',
          bgColor: '#FEF9C3',
          textColor: '#A16207',
        };
      case 'ERROR':
        return {
          label: 'SePay: Lỗi kết nối',
          bgColor: '#FEE2E2',
          textColor: '#B91C1C',
        };
      default:
        return {
          label: 'SePay: Chưa kết nối',
          bgColor: '#F1F5F9',
          textColor: '#64748B',
        };
    }
  };

  const statusBadge = getSepayStatusBadge();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.bankInfo}>
          <Text style={styles.bankName}>{account.bankName}</Text>
          <Text style={styles.displayName}>{account.displayName}</Text>
          <Text style={styles.accountNumber}>
            STK: {maskAccountNumber(account.accountNumber)}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusBadge.bgColor },
          ]}
        >
          <Text style={[styles.statusText, { color: statusBadge.textColor }]}>
            {statusBadge.label}
          </Text>
        </View>
      </View>

      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
        <Text style={styles.balanceValue}>{formatVND(account.currentBalance)}</Text>
      </View>

      <View style={styles.actionsRow}>
        {onEdit && (
          <TouchableOpacity style={styles.editButton} onPress={onEdit} activeOpacity={0.7}>
            <Text style={styles.editButtonText}>Chỉnh sửa</Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteButtonText}>Xóa tài khoản</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bankInfo: {
    flex: 1,
    marginRight: 8,
  },
  bankName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    textTransform: 'uppercase',
  },
  displayName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  accountNumber: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  balanceContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
  },
  balanceLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 12,
  },
  editButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
});
