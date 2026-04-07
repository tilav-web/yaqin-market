import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { useAuthStore } from '../../src/store/auth.store';
import { authApi } from '../../src/api/auth';
import { usersApi } from '../../src/api/users';

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, role } = useAuthStore();

  const { data: user } = useQuery({
    queryKey: ['user-me'],
    queryFn: usersApi.getMe,
  });

  const { data: auth } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.getMe,
  });

  const handleLogout = () => {
    Alert.alert('Chiqish', 'Hisobdan chiqishni tasdiqlaysizmi?', [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'Chiqish',
        style: 'destructive',
        onPress: async () => {
          await authApi.logout().catch(() => {});
          await logout();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  const menuItems = [
    { icon: '📦', label: 'Buyurtmalarim', onPress: () => router.push('/(customer)/orders') },
    { icon: '📢', label: 'Umumiy buyurtmalarim', onPress: () => {} },
    { icon: '📍', label: 'Manzillarim', onPress: () => {} },
    { icon: '🔔', label: 'Bildirishnomalar', onPress: () => {} },
    { icon: '❓', label: 'Yordam', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.first_name ?? auth?.role ?? 'U')[0].toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.name}>
            {user?.first_name !== '-' ? `${user?.first_name} ${user?.last_name}` : 'Foydalanuvchi'}
          </Text>
          <Text style={styles.phone}>+998 {auth?.phone}</Text>
          <Text style={styles.roleBadge}>
            {role === 'SELLER' ? '🏪 Sotuvchi' : role === 'COURIER' ? '🏍️ Kuryer' : '👤 Xaridor'}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Chiqish</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: Colors.white },
  name: { ...Typography.title, color: Colors.white },
  phone: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  roleBadge: { ...Typography.caption, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  scroll: { flex: 1 },
  menu: {
    backgroundColor: Colors.white,
    marginTop: Spacing.md,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.md,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.md,
  },
  menuIcon: { fontSize: 20 },
  menuLabel: { ...Typography.body, flex: 1 },
  menuArrow: { fontSize: 20, color: Colors.textHint },
  logoutBtn: {
    margin: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.errorSurface,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  logoutText: { ...Typography.button, color: Colors.error },
});
