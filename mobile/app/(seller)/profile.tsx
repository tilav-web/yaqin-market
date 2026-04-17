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
import { storesApi } from '../../src/api/stores';
import { ordersApi } from '../../src/api/orders';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function SellerProfileScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const { data: user } = useQuery({ queryKey: ['user-me'], queryFn: usersApi.getMe });
  const { data: auth } = useQuery({ queryKey: ['auth-me'], queryFn: authApi.getMe });
  const { data: myStores } = useQuery({ queryKey: ['my-stores'], queryFn: storesApi.getMyStores });
  const { data: allOrders } = useQuery({
    queryKey: ['store-orders-all'],
    queryFn: () => ordersApi.getStoreOrders(),
  });

  const store = myStores?.[0];
  const orders = Array.isArray(allOrders) ? allOrders : [];
  const delivered = orders.filter((o: any) => o.status === 'DELIVERED');
  const revenue = delivered.reduce((s: number, o: any) => s + Number(o.total_price ?? 0), 0);

  const fullName =
    user?.first_name && user.first_name !== '-'
      ? `${user.first_name} ${user.last_name ?? ''}`.trim()
      : 'Sotuvchi';

  const initials = fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = () => {
    Alert.alert('Hisobdan chiqish', 'Rostdan ham chiqmoqchimisiz?', [
      { text: 'Bekor qilish', style: 'cancel' },
      {
        text: 'Chiqish', style: 'destructive',
        onPress: async () => {
          await authApi.logout().catch(() => {});
          await logout();
          router.replace('/(customer)/home');
        },
      },
    ]);
  };

  const menuItems: { icon: IoniconsName; color: string; bg: string; label: string; sub: string; onPress: () => void }[] = [
    {
      icon: 'storefront-outline', color: Colors.primary, bg: Colors.primarySurface,
      label: 'Do\'kon sozlamalari', sub: store?.name ?? 'Do\'kon nomi va manzil',
      onPress: () => {},
    },
    {
      icon: 'bicycle-outline', color: '#00897B', bg: '#E0F2F1',
      label: 'Yetkazib berish', sub: 'Radius, narx va shartlar',
      onPress: () => router.push('/(seller)/delivery-settings'),
    },
    {
      icon: 'person-outline', color: '#2196F3', bg: '#E3F2FD',
      label: 'Shaxsiy ma\'lumotlar', sub: 'Ism, telefon va profil',
      onPress: () => {},
    },
    {
      icon: 'notifications-outline', color: '#9C27B0', bg: '#F3E5F5',
      label: 'Bildirishnomalar', sub: 'Yangi buyurtma xabarlari',
      onPress: () => {},
    },
    {
      icon: 'home-outline', color: '#FF5722', bg: '#FBE9E7',
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
          <Ionicons name="storefront-outline" size={12} color={Colors.primary} />
          <Text style={s.roleText}>{store?.name ?? 'Sotuvchi'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: 'Jami buyurtma', value: String(orders.length), icon: 'cube-outline' as IoniconsName },
          { label: 'Yetkazildi', value: String(delivered.length), icon: 'checkmark-circle-outline' as IoniconsName },
          { label: 'Daromad', value: `${(revenue / 1000).toFixed(0)}K`, icon: 'cash-outline' as IoniconsName },
        ].map((stat, i) => (
          <View key={i} style={[s.statCard, i < 2 && s.statBorder]}>
            <Ionicons name={stat.icon} size={18} color={Colors.primary} />
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
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    backgroundColor: Colors.primary,
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
  roleText: { fontSize: 12, fontWeight: '600', color: Colors.primary },

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

  scroll: { flex: 1, backgroundColor: Colors.background },
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
