import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { useAuthStore } from '../../src/store/auth.store';
import { authApi } from '../../src/api/auth';
import { usersApi } from '../../src/api/users';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  icon: IoniconsName;
  color: string;
  bg: string;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, role } = useAuthStore();

  const { data: user } = useQuery({ queryKey: ['user-me'], queryFn: usersApi.getMe });
  const { data: auth } = useQuery({ queryKey: ['auth-me'], queryFn: authApi.getMe });
  const { data: orders } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => (authApi as any).getMe?.() ?? Promise.resolve(null),
  });

  const fullName =
    user?.first_name && user.first_name !== '-'
      ? `${user.first_name} ${user.last_name ?? ''}`.trim()
      : 'Foydalanuvchi';

  const initials = fullName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleLabel =
    role === 'SELLER' ? 'Sotuvchi' : role === 'COURIER' ? 'Kuryer' : 'Xaridor';

  const handleLogout = () => {
    Alert.alert('Hisobdan chiqish', 'Rostdan ham chiqmoqchimisiz?', [
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

  const menuSections: MenuSection[] = [
    {
      title: 'Faoliyat',
      items: [
        {
          icon: 'cube-outline',
          color: Colors.primary,
          bg: Colors.primarySurface,
          label: 'Buyurtmalarim',
          sub: 'Barcha buyurtmalar tarixi',
          onPress: () => router.push('/(customer)/orders'),
        },
        {
          icon: 'megaphone-outline',
          color: '#FF5722',
          bg: '#FBE9E7',
          label: 'Umumiy buyurtmalarim',
          sub: 'Broadcast tarixim',
          onPress: () => {},
        },
        {
          icon: 'heart-outline',
          color: '#E91E63',
          bg: '#FCE4EC',
          label: 'Sevimli do\'konlar',
          sub: 'Obuna bo\'lgan do\'konlar',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Sozlamalar',
      items: [
        {
          icon: 'location-outline',
          color: '#2196F3',
          bg: '#E3F2FD',
          label: 'Manzillarim',
          sub: 'Yetkazib berish manzillari',
          onPress: () => {},
        },
        {
          icon: 'notifications-outline',
          color: '#9C27B0',
          bg: '#F3E5F5',
          label: 'Bildirishnomalar',
          sub: 'Push xabarlar sozlamasi',
          onPress: () => {},
        },
        {
          icon: 'language-outline',
          color: '#00897B',
          bg: '#E0F2F1',
          label: 'Til sozlamasi',
          sub: "O'zbek / Русский",
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Boshqa',
      items: [
        {
          icon: 'help-circle-outline',
          color: Colors.textSecondary,
          bg: Colors.background,
          label: 'Yordam markazi',
          onPress: () => {},
        },
        {
          icon: 'document-text-outline',
          color: Colors.textSecondary,
          bg: Colors.background,
          label: 'Foydalanish shartlari',
          onPress: () => {},
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Hero Header ── */}
      <View style={s.hero}>
        <View style={s.decorCircle1} />
        <View style={s.decorCircle2} />

        {/* Avatar */}
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          <TouchableOpacity style={s.editBtn}>
            <Ionicons name="pencil" size={12} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <Text style={s.name}>{fullName}</Text>
        <Text style={s.phone}>+998 {auth?.phone ?? '— — —'}</Text>

        {/* Role pill */}
        <View style={s.rolePill}>
          <Ionicons
            name={role === 'SELLER' ? 'storefront-outline' : role === 'COURIER' ? 'bicycle-outline' : 'person-outline'}
            size={12}
            color={Colors.primary}
          />
          <Text style={s.roleText}>{roleLabel}</Text>
        </View>
      </View>

      {/* ── Stats ── */}
      <View style={s.statsRow}>
        {[
          { label: 'Buyurtma', value: '0', icon: 'cube-outline' as IoniconsName },
          { label: 'Sarflangan', value: "0 so'm", icon: 'wallet-outline' as IoniconsName },
          { label: 'Manzil', value: '0', icon: 'location-outline' as IoniconsName },
        ].map((stat, i) => (
          <View key={i} style={[s.statCard, i < 2 && s.statBorder]}>
            <Ionicons name={stat.icon} size={18} color={Colors.primary} />
            <Text style={s.statVal}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Menu ── */}
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {menuSections.map((section) => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <View style={s.card}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[s.row, idx < section.items.length - 1 && s.rowBorder]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[s.iconBox, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={s.rowText}>
                    <Text style={s.rowLabel}>{item.label}</Text>
                    {item.sub && <Text style={s.rowSub}>{item.sub}</Text>}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textHint} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

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

        {/* Version */}
        <Text style={s.version}>Yaqin Market v1.0.0</Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  hero: {
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

  avatarWrap: { position: 'relative', marginBottom: Spacing.sm },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarTxt: { fontSize: 30, fontWeight: '700', color: Colors.white },
  editBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  name: { fontSize: 20, fontWeight: '700', color: Colors.white, marginBottom: 3 },
  phone: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: Spacing.sm },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 5,
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
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 3,
  },
  statBorder: { borderRightWidth: 1, borderRightColor: Colors.divider },
  statVal: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textHint, fontWeight: '500' },

  scroll: { flex: 1 },
  section: { marginTop: Spacing.md, paddingHorizontal: Spacing.md },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textHint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    gap: Spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  rowSub: { fontSize: 12, color: Colors.textHint, marginTop: 1 },

  version: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textHint,
    marginTop: Spacing.md,
  },
});
