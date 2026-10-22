import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAccounts } from '../src/hooks/useAccounts';
import { useCreateTransaction } from '../src/hooks/useTransactions';
import { TransactionType } from '../src/types/transaction';
import { parseAmount, maskAccountNumber } from '../src/utils/currency';
import { TransactionSchema } from '../src/utils/validation';

export default function AddTransactionModal() {
  const router = useRouter();
  const { data: accounts = [] } = useAccounts();
  const createTxMutation = useCreateTransaction();

  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts[0]?.id || ''
  );
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [userNote, setUserNote] = useState('');

  const expenseCategories = [
    'Ăn uống',
    'Mua sắm',
    'Nhà ở',
    'Đi lại',
    'Hóa đơn',
    'Giải trí',
    'Khác',
  ];

  const incomeCategories = ['Lương', 'Thưởng', 'Đầu tư', 'Quà tặng', 'Thu nhập khác'];

  const availableCategories = type === 'EXPENSE' ? expenseCategories : incomeCategories;

  const handleSubmit = async () => {
    if (!selectedAccountId) {
      Alert.alert('Chưa chọn tài khoản', 'Vui lòng chọn tài khoản ngân hàng.');
      return;
    }

    const parsedAmount = parseAmount(amountStr);
    if (!parsedAmount) {
      Alert.alert('Số tiền không hợp lệ', 'Vui lòng nhập số tiền lớn hơn 0 đồng.');
      return;
    }

    const validationResult = TransactionSchema.safeParse({
      accountId: selectedAccountId,
      amount: parsedAmount,
      type,
      category: category || 'Chung',
      description,
      userNote,
    });

    if (!validationResult.success) {
      const errMsg =
        validationResult.error.issues?.[0]?.message ||
        validationResult.error.message ||
        'Dữ liệu giao dịch không hợp lệ.';
      Alert.alert('Lỗi nhập liệu', errMsg);
      return;
    }

    try {
      await createTxMutation.mutateAsync({
        accountId: selectedAccountId,
        amount: parsedAmount,
        type,
        category: category || (type === 'INCOME' ? 'Thu nhập khác' : 'Chi tiêu khác'),
        description: description.trim() || (type === 'INCOME' ? 'Khoản thu' : 'Khoản chi'),
        userNote: userNote.trim(),
      });

      Alert.alert('Thành công', 'Đã lưu giao dịch mới.');
      router.back();
    } catch (e: any) {
      Alert.alert('Thất bại', e?.message || 'Không thể tạo giao dịch.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Chọn loại: Thu / Chi */}
      <View style={styles.typeSelector}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            type === 'EXPENSE' && styles.typeButtonExpenseActive,
          ]}
          onPress={() => {
            setType('EXPENSE');
            setCategory('');
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.typeButtonText,
              type === 'EXPENSE' && styles.typeButtonTextActive,
            ]}
          >
            - Tiền ra (Chi tiêu)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeButton,
            type === 'INCOME' && styles.typeButtonIncomeActive,
          ]}
          onPress={() => {
            setType('INCOME');
            setCategory('');
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.typeButtonText,
              type === 'INCOME' && styles.typeButtonTextActive,
            ]}
          >
            + Tiền vào (Thu nhập)
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Nhập số tiền */}
      <View style={styles.amountInputContainer}>
        <Text style={styles.currencySymbol}>₫</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          value={amountStr}
          onChangeText={setAmountStr}
          autoFocus
        />
      </View>

      {/* 3. Chọn tài khoản */}
      <Text style={styles.fieldLabel}>Tài khoản ngân hàng *</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.accountList}
      >
        {accounts.map((acc) => {
          const isSelected = selectedAccountId === acc.id;
          return (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.accountChip,
                isSelected && styles.accountChipSelected,
              ]}
              onPress={() => setSelectedAccountId(acc.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.accountChipTitle,
                  isSelected && styles.accountChipTitleSelected,
                ]}
              >
                {acc.displayName}
              </Text>
              <Text
                style={[
                  styles.accountChipSub,
                  isSelected && styles.accountChipSubSelected,
                ]}
              >
                {maskAccountNumber(acc.accountNumber)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 4. Chọn danh mục */}
      <Text style={styles.fieldLabel}>Danh mục giao dịch</Text>
      <View style={styles.categoryContainer}>
        {availableCategories.map((c) => {
          const isSelected = category === c;
          return (
            <TouchableOpacity
              key={c}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipSelected,
              ]}
              onPress={() => setCategory(c)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryText,
                  isSelected && styles.categoryTextSelected,
                ]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 5. Nội dung giao dịch */}
      <Text style={styles.fieldLabel}>Nội dung / Mô tả</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Ví dụ: Cơm trưa, Siêu thị, Lương tháng 10..."
        value={description}
        onChangeText={setDescription}
      />

      {/* 6. Ghi chú cá nhân */}
      <Text style={styles.fieldLabel}>Ghi chú thêm (tùy chọn)</Text>
      <TextInput
        style={[styles.textInput, { height: 60 }]}
        placeholder="Ghi chú chi tiết cho bản thân..."
        multiline
        value={userNote}
        onChangeText={setUserNote}
      />

      {/* Nút lưu */}
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={createTxMutation.isPending}
        activeOpacity={0.8}
      >
        <Text style={styles.submitButtonText}>
          {createTxMutation.isPending ? 'Đang ghi nhận...' : 'Lưu Giao Dịch'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonExpenseActive: {
    backgroundColor: '#DC2626',
  },
  typeButtonIncomeActive: {
    backgroundColor: '#16A34A',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 120,
    textAlign: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 10,
  },
  accountList: {
    gap: 8,
    marginBottom: 10,
  },
  accountChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  accountChipSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  accountChipTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  accountChipTitleSelected: {
    color: '#0369A1',
  },
  accountChipSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  accountChipSubSelected: {
    color: '#0284C7',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  categoryChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#0284C7',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 6,
  },
  submitButton: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
