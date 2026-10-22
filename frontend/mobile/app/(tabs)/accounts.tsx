import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from '../../src/hooks/useAccounts';
import { AccountCard } from '../../src/components/finance/AccountCard';
import { LoadingState } from '../../src/components/common/LoadingState';
import { ErrorState } from '../../src/components/common/ErrorState';
import { EmptyState } from '../../src/components/common/EmptyState';
import { BankAccount } from '../../src/types/bankAccount';
import { BankAccountSchema } from '../../src/utils/validation';
import { parseAmount } from '../../src/utils/currency';

export default function AccountsScreen() {
  const { data: accounts = [], isLoading, error, refetch } = useAccounts();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();

  // Modal thêm tài khoản
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalanceStr, setInitialBalanceStr] = useState('0');

  // Modal sửa tài khoản
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');

  const resetAddForm = () => {
    setBankName('');
    setDisplayName('');
    setAccountNumber('');
    setInitialBalanceStr('0');
  };

  const handleCreateAccount = async () => {
    const parsedBal = parseAmount(initialBalanceStr);
    const initialBalance = parsedBal !== undefined ? parsedBal : 0;

    const validationResult = BankAccountSchema.safeParse({
      bankName,
      displayName,
      accountNumber,
      initialBalance,
    });

    if (!validationResult.success) {
      const firstError =
        validationResult.error.issues?.[0]?.message ||
        validationResult.error.message ||
        'Thông tin tài khoản không hợp lệ.';
      Alert.alert('Lỗi nhập liệu', firstError);
      return;
    }

    try {
      await createMutation.mutateAsync({
        bankName: bankName.trim(),
        displayName: displayName.trim(),
        accountNumber: accountNumber.trim(),
        initialBalance,
      });

      setAddModalOpen(false);
      resetAddForm();
      Alert.alert('Thành công', 'Đã thêm tài khoản ngân hàng mới.');
    } catch (e: any) {
      Alert.alert('Thất bại', e?.message || 'Không thể tạo tài khoản.');
    }
  };

  const handleOpenEdit = (acc: BankAccount) => {
    setEditingAccount(acc);
    setEditDisplayName(acc.displayName);
  };

  const handleSaveEdit = async () => {
    if (!editingAccount) return;
    if (!editDisplayName.trim()) {
      Alert.alert('Lỗi', 'Tên hiển thị không được để trống.');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingAccount.id,
        input: { displayName: editDisplayName.trim() },
      });
      setEditingAccount(null);
      Alert.alert('Thành công', 'Đã cập nhật tên tài khoản.');
    } catch (e: any) {
      Alert.alert('Thất bại', e?.message || 'Không thể cập nhật.');
    }
  };

  // Xác nhận xóa tài khoản bảo toàn dữ liệu (Soft delete)
  const handleDeleteConfirm = (acc: BankAccount) => {
    Alert.alert(
      'Xác nhận xóa tài khoản',
      `Bạn có chắc muốn xóa tài khoản "${acc.displayName}"?\n\nLưu ý: Tất cả lịch sử giao dịch của tài khoản này vẫn được lưu giữ an toàn để không làm sai số liệu báo cáo của bạn. Tài khoản sẽ không còn xuất hiện trong danh sách hoạt động.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa tài khoản',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(acc.id);
              Alert.alert('Đã xóa', 'Tài khoản đã được gỡ khỏi danh sách.');
            } catch (e: any) {
              Alert.alert('Lỗi', e?.message || 'Không thể xóa tài khoản.');
            }
          },
        },
      ]
    );
  };

  const commonBanks = [
    'Vietcombank',
    'Techcombank',
    'MBBank',
    'ACB',
    'BIDV',
    'VietinBank',
    'VPBank',
    'TPBank',
  ];

  return (
    <View style={styles.container}>
      {/* Nút thêm tài khoản */}
      <View style={styles.topBar}>
        <Text style={styles.headerSubtitle}>
          Quản lý danh sách tài khoản ngân hàng liên kết
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddModalOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+ Thêm tài khoản</Text>
        </TouchableOpacity>
      </View>

      {/* Danh sách tài khoản */}
      {isLoading ? (
        <LoadingState message="Đang tải danh sách tài khoản..." />
      ) : error ? (
        <ErrorState
          message="Không thể tải danh sách tài khoản."
          onRetry={refetch}
        />
      ) : accounts.length === 0 ? (
        <EmptyState
          title="Chưa có tài khoản ngân hàng"
          description="Bấm vào nút '+ Thêm tài khoản' bên trên để bắt đầu theo dõi thu chi."
        />
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AccountCard
              account={item}
              onEdit={() => handleOpenEdit(item)}
              onDelete={() => handleDeleteConfirm(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refetch}
        />
      )}

      {/* Modal Thêm tài khoản */}
      <Modal
        visible={isAddModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thêm Tài khoản Ngân hàng</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Chọn ngân hàng nhanh */}
              <Text style={styles.fieldLabel}>Chọn nhanh ngân hàng:</Text>
              <View style={styles.bankTagContainer}>
                {commonBanks.map((b) => (
                  <TouchableOpacity
                    key={b}
                    style={[styles.bankTag, bankName === b && styles.bankTagActive]}
                    onPress={() => setBankName(b)}
                  >
                    <Text
                      style={[
                        styles.bankTagText,
                        bankName === b && styles.bankTagTextActive,
                      ]}
                    >
                      {b}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Tên ngân hàng *</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Vietcombank, Techcombank..."
                value={bankName}
                onChangeText={setBankName}
              />

              <Text style={styles.fieldLabel}>Tên gợi nhớ của bạn *</Text>
              <TextInput
                style={styles.input}
                placeholder="VD: Nhận lương, Tiền chi tiêu, Tiết kiệm..."
                value={displayName}
                onChangeText={setDisplayName}
              />

              <Text style={styles.fieldLabel}>Số tài khoản ngân hàng *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập 6 - 20 chữ số tài khoản"
                keyboardType="numeric"
                value={accountNumber}
                onChangeText={setAccountNumber}
              />

              <Text style={styles.fieldLabel}>Số dư ban đầu (₫)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={initialBalanceStr}
                onChangeText={setInitialBalanceStr}
              />

              <Text style={styles.securityNote}>
                🔒 Bảo mật: Ứng dụng không yêu cầu mật khẩu, mã PIN hay mã OTP ngân hàng.
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setAddModalOpen(false);
                    resetAddForm();
                  }}
                >
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleCreateAccount}
                  disabled={createMutation.isPending}
                >
                  <Text style={styles.submitBtnText}>
                    {createMutation.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Sửa tên hiển thị tài khoản */}
      <Modal
        visible={Boolean(editingAccount)}
        animationType="fade"
        transparent
        onRequestClose={() => setEditingAccount(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>Đổi tên hiển thị</Text>
            <Text style={styles.fieldLabel}>Tên gợi nhớ:</Text>
            <TextInput
              style={styles.input}
              value={editDisplayName}
              onChangeText={setEditDisplayName}
              placeholder="VD: Nhận lương, Tiền gia đình"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditingAccount(null)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSaveEdit}
                disabled={updateMutation.isPending}
              >
                <Text style={styles.submitBtnText}>
                  {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Text>
              </TouchableOpacity>
            </View>
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
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    paddingVertical: 10,
    paddingBottom: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalContentSmall: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  bankTagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  bankTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bankTagActive: {
    backgroundColor: '#0284C7',
  },
  bankTagText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  bankTagTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  securityNote: {
    fontSize: 11,
    color: '#0369A1',
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
