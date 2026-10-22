import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useFilterStore } from '../../store/filterStore';
import { useAccounts } from '../../hooks/useAccounts';
import { DateRangePreset } from '../../types/filter';
import { maskAccountNumber } from '../../utils/currency';

export const FilterBar: React.FC = () => {
  const { filter, setAccountId, setDateRangePreset } = useFilterStore();
  const { data: accounts = [] } = useAccounts();
  const [isAccountModalVisible, setAccountModalVisible] = useState(false);

  const selectedAccount =
    filter.accountId === 'ALL'
      ? null
      : accounts.find((a) => a.id === filter.accountId);

  const accountDisplayLabel = selectedAccount
    ? `${selectedAccount.displayName} (${maskAccountNumber(selectedAccount.accountNumber)})`
    : 'Tất cả tài khoản';

  const presets: { id: DateRangePreset; label: string }[] = [
    { id: 'THIS_MONTH', label: 'Tháng này' },
    { id: 'LAST_MONTH', label: 'Tháng trước' },
    { id: 'LAST_7_DAYS', label: '7 ngày' },
  ];

  return (
    <View style={styles.container}>
      {/* 1. Chọn tài khoản */}
      <View style={styles.accountSelectorWrapper}>
        <TouchableOpacity
          style={styles.accountButton}
          onPress={() => setAccountModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.accountIcon}>🏦</Text>
          <Text style={styles.accountText} numberOfLines={1}>
            {accountDisplayLabel}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Chọn mốc thời gian */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timeFilterList}
      >
        {presets.map((p) => {
          const isActive = filter.dateRange.preset === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.presetChip, isActive && styles.presetChipActive]}
              onPress={() => setDateRangePreset(p.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetText, isActive && styles.presetTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal chọn tài khoản */}
      <Modal
        visible={isAccountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setAccountModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn tài khoản theo dõi</Text>

            <TouchableOpacity
              style={[
                styles.modalOption,
                filter.accountId === 'ALL' && styles.modalOptionActive,
              ]}
              onPress={() => {
                setAccountId('ALL');
                setAccountModalVisible(false);
              }}
            >
              <Text style={styles.optionIcon}>🌐</Text>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Tất cả tài khoản</Text>
                <Text style={styles.optionSubtitle}>Tổng hợp toàn bộ tài chính</Text>
              </View>
              {filter.accountId === 'ALL' && <Text style={styles.checkIcon}>✓</Text>}
            </TouchableOpacity>

            {accounts.map((acc) => {
              const isSelected = filter.accountId === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.modalOption, isSelected && styles.modalOptionActive]}
                  onPress={() => {
                    setAccountId(acc.id);
                    setAccountModalVisible(false);
                  }}
                >
                  <Text style={styles.optionIcon}>💳</Text>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>{acc.displayName}</Text>
                    <Text style={styles.optionSubtitle}>
                      {acc.bankName} • {maskAccountNumber(acc.accountNumber)}
                    </Text>
                  </View>
                  {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  accountSelectorWrapper: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  accountIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  accountText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  chevron: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
  },
  timeFilterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  presetChipActive: {
    backgroundColor: '#0284C7',
  },
  presetText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  presetTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  modalOptionActive: {
    backgroundColor: '#E0F2FE',
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 16,
    color: '#0284C7',
    fontWeight: '700',
  },
});
