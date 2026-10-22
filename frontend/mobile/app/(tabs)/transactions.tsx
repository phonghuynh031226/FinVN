import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { useFilterStore } from '../../src/store/filterStore';
import { useTransactions, useUpdateTransactionNote } from '../../src/hooks/useTransactions';
import { FilterBar } from '../../src/components/finance/FilterBar';
import { TransactionItem } from '../../src/components/finance/TransactionItem';
import { LoadingState } from '../../src/components/common/LoadingState';
import { ErrorState } from '../../src/components/common/ErrorState';
import { EmptyState } from '../../src/components/common/EmptyState';
import { Transaction } from '../../src/types/transaction';
import { formatVND, maskAccountNumber } from '../../src/utils/currency';
import { formatDisplayDateTime } from '../../src/utils/date';

export default function TransactionsScreen() {
  const { filter, setSearchQuery, setTypeFilter } = useFilterStore();
  const {
    data: transactions = [],
    isLoading,
    error,
    refetch,
  } = useTransactions(filter);

  const updateNoteMutation = useUpdateTransactionNote();

  // Chi tiết giao dịch đang xem
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editNote, setEditNote] = useState('');

  const openTxDetail = (tx: Transaction) => {
    setSelectedTx(tx);
    setEditCategory(tx.userCategory || tx.category || '');
    setEditNote(tx.userNote || '');
  };

  const handleSaveNote = async () => {
    if (!selectedTx) return;
    try {
      await updateNoteMutation.mutateAsync({
        id: selectedTx.id,
        userCategory: editCategory.trim(),
        userNote: editNote.trim(),
      });
      setSelectedTx(null);
      Alert.alert('Thành công', 'Đã lưu phân loại và ghi chú cho giao dịch.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể lưu thay đổi.');
    }
  };

  const typeOptions: { id: 'ALL' | 'INCOME' | 'EXPENSE'; label: string }[] = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'INCOME', label: 'Tiền vào (+)' },
    { id: 'EXPENSE', label: 'Tiền ra (-)' },
  ];

  return (
    <View style={styles.container}>
      {/* 1. Bộ lọc tài khoản & thời gian */}
      <FilterBar />

      {/* 2. Thanh tìm kiếm và bộ lọc loại */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo nội dung, phân loại..."
          placeholderTextColor="#94A3B8"
          value={filter.searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.typeSelector}>
          {typeOptions.map((opt) => {
            const isActive = (filter.type || 'ALL') === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.typeButton, isActive && styles.typeButtonActive]}
                onPress={() => setTypeFilter(opt.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.typeButtonText, isActive && styles.typeButtonTextActive]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. Danh sách giao dịch */}
      {isLoading ? (
        <LoadingState message="Đang tải danh sách giao dịch..." />
      ) : error ? (
        <ErrorState
          message="Không thể tải danh sách giao dịch. Vui lòng thử lại."
          onRetry={refetch}
        />
      ) : transactions.length === 0 ? (
        <EmptyState
          title="Không tìm thấy giao dịch nào"
          description="Thử thay đổi bộ lọc hoặc thêm giao dịch mới."
        />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransactionItem transaction={item} onPress={() => openTxDetail(item)} />
          )}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      )}

      {/* Nút Floating Action Button thêm giao dịch */}
      <Link href="/modal" asChild>
        <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </Link>

      {/* Modal chi tiết và sửa phân loại/ghi chú */}
      <Modal
        visible={Boolean(selectedTx)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTx(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chi tiết Giao dịch</Text>

            {selectedTx && (
              <View style={styles.modalBody}>
                {/* Số tiền lớn */}
                <View style={styles.amountBox}>
                  <Text
                    style={[
                      styles.modalAmount,
                      { color: selectedTx.type === 'INCOME' ? '#16A34A' : '#DC2626' },
                    ]}
                  >
                    {selectedTx.type === 'INCOME' ? '+' : '-'}
                    {formatVND(selectedTx.amount)}
                  </Text>
                  <Text style={styles.modalTime}>
                    {formatDisplayDateTime(selectedTx.transactionDate)}
                  </Text>
                </View>

                {/* Dữ liệu gốc từ Ngân hàng (Không cho phép sửa) */}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tài khoản:</Text>
                  <Text style={styles.infoValue}>
                    {selectedTx.bankAccount
                      ? `${selectedTx.bankAccount.displayName} (${maskAccountNumber(
                          selectedTx.bankAccount.accountNumber
                        )})`
                      : '---'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nội dung gốc:</Text>
                  <Text style={styles.infoValue}>
                    {selectedTx.description || '(Không có)'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Nguồn ghi nhận:</Text>
                  <Text style={styles.infoValue}>
                    {selectedTx.source === 'SEPAY'
                      ? `SePay (Mã: ${selectedTx.sourceReference || 'N/A'})`
                      : 'Thủ công'}
                  </Text>
                </View>

                {/* Phần người dùng có thể tùy chỉnh: Phân loại & Ghi chú */}
                <View style={styles.editSection}>
                  <Text style={styles.inputLabel}>Phân loại của bạn:</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ví dụ: Ăn uống, Tiền nhà, Lương..."
                    value={editCategory}
                    onChangeText={setEditCategory}
                  />

                  <Text style={[styles.inputLabel, { marginTop: 10 }]}>Ghi chú thêm:</Text>
                  <TextInput
                    style={[styles.textInput, { height: 64 }]}
                    placeholder="Nhập ghi chú cá nhân..."
                    multiline
                    value={editNote}
                    onChangeText={setEditNote}
                  />
                </View>

                {/* Các nút hành động */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setSelectedTx(null)}
                  >
                    <Text style={styles.cancelButtonText}>Đóng</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveNote}
                    disabled={updateNoteMutation.isPending}
                  >
                    <Text style={styles.saveButtonText}>
                      {updateNoteMutation.isPending ? 'Đang lưu...' : 'Lưu ghi chú'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#0284C7',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 80,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalBody: {
    gap: 12,
  },
  amountBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 6,
  },
  modalAmount: {
    fontSize: 26,
    fontWeight: '800',
  },
  modalTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    width: 110,
  },
  infoValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  editSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0284C7',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
