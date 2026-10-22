import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0284C7',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
          color: '#0F172A',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📊</Text>,
          headerTitle: 'Tài chính Cá nhân',
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Giao dịch',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📝</Text>,
          headerTitle: 'Danh sách Giao dịch',
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: 'Tài khoản',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏦</Text>,
          headerTitle: 'Tài khoản Ngân hàng',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Cài đặt',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>⚙️</Text>,
          headerTitle: 'Cài đặt & SePay',
        }}
      />
      {/* Ẩn tab template two mặc định nếu còn file */}
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
