import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { sepayApi, SePayConfigStatus } from '../../src/services/sepayApi';
import { isSupabaseConfigured } from '../../src/services/supabase';

export default function SettingsScreen() {
  const [sepayStatus, setSepayStatus] = useState<SePayConfigStatus | null>(null);

  useEffect(() => {
    sepayApi.checkConfiguration().then(setSepayStatus);
  }, []);

  const handleCopyWebhookUrl = () => {
    if (sepayStatus?.webhookUrl) {
      Alert.alert(
        'Webhook URL',
        `Endpoint nhận giao dịch:\n\n${sepayStatus.webhookUrl}\n\nHãy dán URL này vào mục Webhooks trên SePay Dashboard.`
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Trạng thái kết nối SePay */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tích hợp Ngân hàng qua SePay</Text>
          <View
            style={[
              styles.badge,
              sepayStatus?.isConfigured ? styles.badgeSuccess : styles.badgeWarning,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                sepayStatus?.isConfigured
                  ? styles.badgeTextSuccess
                  : styles.badgeTextWarning,
              ]}
            >
              {sepayStatus?.isConfigured ? 'Sẵn sàng' : 'Chưa cấu hình khóa'}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>
          {sepayStatus?.guideMessage ||
            'Hệ thống tự động đồng bộ giao dịch từ các ngân hàng Việt Nam qua Webhook chính thức của SePay.'}
        </Text>

        <View style={styles.urlBox}>
          <Text style={styles.urlLabel}>Webhook Endpoint của bạn:</Text>
          <Text style={styles.urlText} numberOfLines={2}>
            {sepayStatus?.webhookUrl}
          </Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={handleCopyWebhookUrl}
            activeOpacity={0.7}
          >
            <Text style={styles.copyBtnText}>📋 Xem chi tiết URL</Text>
          </TouchableOpacity>
        </View>

        {/* Các bước hướng dẫn */}
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>3 bước kết nối SePay:</Text>
          <Text style={styles.stepItem}>
            1. Đăng ký tài khoản tại <Text style={styles.boldText}>my.sepay.vn</Text> và liên kết ngân hàng của bạn.
          </Text>
          <Text style={styles.stepItem}>
            2. Thêm Webhook URL ở trên vào phần Cài đặt Webhooks trên SePay.
          </Text>
          <Text style={styles.stepItem}>
            3. Điền <Text style={styles.boldText}>SEPAY_WEBHOOK_SECRET</Text> vào biến môi trường Backend.
          </Text>
        </View>
      </View>

      {/* 2. Cam kết Bảo mật An toàn */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>🔒 Cam kết Bảo mật Tài chính</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>
            • Ứng dụng <Text style={styles.boldText}>tuyệt đối không</Text> yêu cầu hoặc lưu trữ mật khẩu đăng nhập, mã PIN hoặc mã OTP ngân hàng của bạn.
          </Text>
          <Text style={styles.bulletItem}>
            • Số tài khoản ngân hàng luôn được che một phần (ví dụ: ****1234) khi hiển thị.
          </Text>
          <Text style={styles.bulletItem}>
            • Khóa bí mật SePay được lưu trữ riêng tại máy chủ backend, không bao giờ nằm trong mã ứng dụng mobile.
          </Text>
          <Text style={styles.bulletItem}>
            • Cơ chế chống trùng lặp (Idempotency) đảm bảo không có giao dịch nào bị cộng đúp khi nhận webhook lặp lại.
          </Text>
        </View>
      </View>

      {/* 3. Trạng thái Backend */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Môi trường Hệ thống</Text>
        <View style={styles.envRow}>
          <Text style={styles.envLabel}>Cơ sở dữ liệu:</Text>
          <Text style={styles.envValue}>
            {isSupabaseConfigured
              ? 'Supabase PostgreSQL (Đã liên kết)'
              : 'Bộ nhớ cục bộ Demo (Chưa cấu hình Supabase URL)'}
          </Text>
        </View>
        <View style={styles.envRow}>
          <Text style={styles.envLabel}>Đơn vị tiền tệ:</Text>
          <Text style={styles.envValue}>Việt Nam Đồng (VND)</Text>
        </View>
        <View style={styles.envRow}>
          <Text style={styles.envLabel}>Múi giờ chuẩn:</Text>
          <Text style={styles.envValue}>Asia/Ho_Chi_Minh (GMT+7)</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSuccess: {
    backgroundColor: '#DCFCE7',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextSuccess: {
    color: '#15803D',
  },
  badgeTextWarning: {
    color: '#B45309',
  },
  description: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  urlBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  urlLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  urlText: {
    fontSize: 12,
    color: '#0284C7',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  copyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  stepsContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 12,
  },
  stepsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 6,
  },
  stepItem: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 4,
  },
  boldText: {
    fontWeight: '700',
  },
  bulletList: {
    marginTop: 8,
    gap: 8,
  },
  bulletItem: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  envRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  envLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  envValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },
});
