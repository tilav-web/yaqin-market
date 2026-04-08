import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { useAuthStore } from '../../src/store/auth.store';
import { authApi } from '../../src/api/auth';
import { usersApi } from '../../src/api/users';
import { ordersApi } from '../../src/api/orders';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const COURIER_COLOR = '#FF5722';

export default function CourierProfileScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const { data: user } = useQuery({ queryKey: ['user-me'], queryFn: usersApi.getMe });
  const { data: auth } = useQuery({ queryKey: ['auth-me'], queryFn: authApi.getMe });
  const { data: delivered } = useQuery({
    queryKey: ['courier-history'],
    queryFn: () => ordersApi.getMyCourierOrders('DELIVERED'),
  });

  const deliveredOrders = Array.isArray(delivered) ? delivered : [];
  const totalEarnings = deliveredOrders.reduce((s: number, o: any) => s + Number(o.total_price ?? 0), 0);

  const fullName =
    user?.first_name && user.first_name !== '-'
      ? `${user.first_name} ${user.last_name ?? ''}`.trim()
      : 'Kuryer';

  const initials = fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = () => {
    Alert.alert('Hisobdan chiqish', 'Rostdan ham chiqmoqchimisiz?', [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'Chiqish', style: 'destructive',
        onPress: async () => {
          await authApi.logout().catch(() => {});
          await logout();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  const menuItems: { icon: IoniconsName; color: string; bg: string; label: string; sub: string; onPress: () => void }[] = [
    {
      icon: 'person-outline', color: '#2196F3', bg: '#E3F2FD',
      label: 'Shaxsiy ma\'lumotlar', sub: 'Ism, telefon va profil',
      onPress: () => {},
    },
    {
      icon: 'notifications-outline', color: '#9C27B0', bg: '#F3E5F5',
      label: 'Bildirishnomalar', sub: 'Push xabarlar sozlamasi',
      onPress: () => {},
    },
    {
      icon: 'home-outline', color: Colors.primary, bg: Colors.primarySurface,
      label: 'Xaridor sahifasiga o\'tish', sub: 'Mahsulotlar va buyurtmalar',
      onPress: () => router.replace('/(customer)/home'),
    },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Hero */}
      <View style={s.header}>
        <View style={s.decorCircle1} />
        <View style={s.decorCircle2} />
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
        </View>
        <Text style={s.name}>{fullName}</Text>
        <Text style={s.phone}>+998 {auth?.phone ?? '— — —'}</Text>
        <View style={s.rolePill}>
          <Ionicons name="bicycle-outline" size={12} color={COURIER_COLOR} />
          <Text style={s.roleText}>Kuryer</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: 'Yetkazildi', value: String(deliveredOrders.length), icon: 'checkmark-circle-outline' as IoniconsName },
          { label: 'Daromad', value: `${(totalEarnings / 1000).toFixed(0)}K`, icon: 'cash-outline' as IoniconsName },
          { label: 'Reyting', value: '5.0', icon: 'star-outline' as IoniconsName },
        ].map((stat, i) => (
          <View key={i} style={[s.statCard, i < 2 && s.statBorder]}>
            <Ionicons name={stat.icon} size={18} color={COURIER_COLOR} />
            <Text style={s.statVal}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Menu */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sozlamalar</Text>
          <View style={s.card}>
            {menuItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[s.row, idx < menuItems.length - 1 && s.rowBorder]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[s.iconBox, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <View style={s.rowText}>
                  <Text style={s.rowLabel}>{item.label}</Text>
                  <Text style={s.rowSub}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textHint} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <View style={s.section}>
          <View style={s.card}>
            <TouchableOpacity style={s.row} onPress={handleLogout} activeOpacity={0.7}>
              <View style={[s.iconBox, { backgroundColor: Colors.errorSurface }]}>
                <Ionicons name="log-out-outline" size={18} color={Colors.error} />
              </View>
              <Text style={[s.rowLabel, { color: Colors.error, flex: 1 }]}>Hisobdan chiqish</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.version}>Yaqin Market v1.0.0</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: COURIER_COLOR,
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute', width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -40,
  },
  decorCircle2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: -20,
  },
  avatarWrap: { marginBottom: Spacing.sm },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarTxt: { fontSize: 28, fontWeight: '700', color: Colors.white },
  name: { fontSize: 20, fontWeight: '700', color: Colors.white, marginBottom: 3 },
  phone: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: Spacing.sm },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.white,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full,
  },
  roleText: { fontSize: 12, fontWeight: '600', color: COURIER_COLOR },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: -20,
    borderRadius: Radius.lg,
    ...Shadow.md,
    overflow: 'hidden',
  },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 3 },
  statBorder: { borderRightWidth: 1, borderRightColor: Colors.divider },
  statVal: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textHint, fontWeight: '500' },

  scroll: { flex: 1 },
  section: { marginTop: Spacing.md, paddingHorizontal: Spacing.md },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textHint,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: Spacing.xs, paddingLeft: 4,
  },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, ...Shadow.sm, overflow: 'hidden' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 14, gap: Spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  iconBox: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  rowSub: { fontSize: 12, color: Colors.textHint, marginTop: 1 },
  version: { textAlign: 'center', fontSize: 11, color: Colors.textHint, marginTop: Spacing.md },
});
