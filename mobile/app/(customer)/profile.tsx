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
}

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, role, isAuthenticated } = useAuthStore();

  const { data: user } = useQuery({
    queryKey: ['user-me'],
    queryFn: usersApi.getMe,
    enabled: isAuthenticated,
  });
  const { data: auth } = useQuery({
    queryKey: ['auth-me'],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });

  // Not logged in — show login prompt
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <View style={s.decorCircle1} />
          <View style={s.decorCircle2} />
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Ionicons name="person-outline" size={36} color="rgba(255,255,255,0.7)" />
            </View>
          </View>
          <Text style={s.name}>Tizimga kirmadingiz</Text>
          <Text style={s.phone}>Profil va buyurtmalar uchun kirish kerak</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl }}>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <Ionicons name="log-in-outline" size={20} color={Colors.white} />
            <Text style={s.loginBtnTxt}>Kirish</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(auth)/welcome')}>
            <Text style={{ fontSize: 14, color: Colors.primary, fontWeight: '600' }}>Ro'yxatdan o'tish</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
    role === 'SELLER' ? 'Sotuvchi'
    : role === 'COURIER' ? 'Kuryer'
    : role === 'SUPER_ADMIN' ? 'Super Admin'
    : 'Xaridor';

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

  // Role-specific panel card
  const renderRolePanel = () => {
    if (role === 'SELLER') {
      return (
        <PanelCard
          icon="storefront"
          color="#E53935"
          bg="#FFEBEE"
          title="Do'kon paneli"
          sub="Mahsulotlar, buyurtmalar va do'kon sozlamalari"
          badge="Sotuvchi"
          badgeColor={Colors.primary}
          onPress={() => router.push('/(seller)/dashboard')}
        />
      );
    }
    if (role === 'COURIER') {
      return (
        <PanelCard
          icon="bicycle"
          color="#FF5722"
          bg="#FBE9E7"
          title="Kuryer paneli"
          sub="Yetkazish buyurtmalari va yo'nalishlar"
          badge="Kuryer"
          badgeColor="#FF5722"
          onPress={() => router.push('/(courier)/nearby')}
        />
      );
    }
    if (role === 'SUPER_ADMIN') {
      return (
        <PanelCard
          icon="shield-checkmark"
          color="#9C27B0"
          bg="#F3E5F5"
          title="Admin panel"
          sub="Tizim boshqaruvi"
          badge="Admin"
          badgeColor="#9C27B0"
          onPress={() => {}}
        />
      );
    }
    return null;
  };

  // Apply cards for CUSTOMER only
  const renderApplyCards = () => {
    if (role !== 'CUSTOMER' && role !== null) return null;
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>Biznesni boshlang</Text>
        <View style={{ gap: Spacing.sm }}>
          <ApplyCard
            icon="storefront-outline"
            color={Colors.primary}
            bg={Colors.primarySurface}
            title="Sotuvchi bo'lish"
            sub="Do'koningizni oching va mahsulot soting"
            onPress={() => router.push('/(customer)/apply-seller')}
          />
          <ApplyCard
            icon="bicycle-outline"
            color="#FF5722"
            bg="#FBE9E7"
            title="Kuryer bo'lish"
            sub="Bo'sh vaqtingizda yetkazib toping"
            onPress={() => router.push('/(customer)/apply-courier')}
          />
        </View>
      </View>
    );
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
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
          label: "Sevimli do'konlar",
          sub: "Obuna bo'lgan do'konlar",
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
          <TouchableOpacity style={s.editBtn}>
            <Ionicons name="pencil" size={12} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={s.name}>{fullName}</Text>
        <Text style={s.phone}>+998 {auth?.phone ?? '— — —'}</Text>
        <View style={s.rolePill}>
          <Ionicons
            name={
              role === 'SELLER' ? 'storefront-outline'
              : role === 'COURIER' ? 'bicycle-outline'
              : role === 'SUPER_ADMIN' ? 'shield-checkmark-outline'
              : 'person-outline'
            }
            size={12}
            color={Colors.primary}
          />
          <Text style={s.roleText}>{roleLabel}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: 'Buyurtma', value: '0', icon: 'cube-outline' as IoniconsName },
          { label: "So'm sarflandi", value: '0', icon: 'wallet-outline' as IoniconsName },
          { label: 'Manzil', value: '0', icon: 'location-outline' as IoniconsName },
        ].map((stat, i) => (
          <View key={i} style={[s.statCard, i < 2 && s.statBorder]}>
            <Ionicons name={stat.icon} size={18} color={Colors.primary} />
            <Text style={s.statVal}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Role panel (seller/courier/admin) */}
        {(role === 'SELLER' || role === 'COURIER' || role === 'SUPER_ADMIN') && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Mening paneliм</Text>
            {renderRolePanel()}
          </View>
        )}

        {/* Apply cards (customer only) */}
        {renderApplyCards()}

        {/* Menu sections */}
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

        {/* Help */}
        <View style={s.section}>
          <View style={s.card}>
            {[
              { icon: 'help-circle-outline' as IoniconsName, label: 'Yordam markazi', sub: 'FAQ va qo\'llab-quvvatlash', onPress: () => {} },
              { icon: 'document-text-outline' as IoniconsName, label: 'Foydalanish shartlari', sub: '', onPress: () => {} },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[s.row, idx === 0 && s.rowBorder]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[s.iconBox, { backgroundColor: Colors.background }]}>
                  <Ionicons name={item.icon} size={18} color={Colors.textSecondary} />
                </View>
                <View style={s.rowText}>
                  <Text style={s.rowLabel}>{item.label}</Text>
                  {item.sub ? <Text style={s.rowSub}>{item.sub}</Text> : null}
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

// ── Panel Card (seller/courier/admin) ────────────────────────────────────────
function PanelCard({
  icon, color, bg, title, sub, badge, badgeColor, onPress,
}: {
  icon: IoniconsName; color: string; bg: string;
  title: string; sub: string; badge: string; badgeColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[pc.card, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.88}>
      <View style={[pc.iconBox, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <Text style={pc.title}>{title}</Text>
          <View style={[pc.badge, { backgroundColor: badgeColor + '18' }]}>
            <Text style={[pc.badgeTxt, { color: badgeColor }]}>{badge}</Text>
          </View>
        </View>
        <Text style={pc.sub}>{sub}</Text>
      </View>
      <Ionicons name="arrow-forward-circle" size={26} color={color} />
    </TouchableOpacity>
  );
}

// ── Apply Card ────────────────────────────────────────────────────────────────
function ApplyCard({
  icon, color, bg, title, sub, onPress,
}: {
  icon: IoniconsName; color: string; bg: string;
  title: string; sub: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[pc.card, { borderLeftColor: color }]} onPress={onPress} activeOpacity={0.88}>
      <View style={[pc.iconBox, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={pc.title}>{title}</Text>
        <Text style={pc.sub}>{sub}</Text>
      </View>
      <View style={[pc.arrowBox, { backgroundColor: color }]}>
        <Ionicons name="chevron-forward" size={14} color={Colors.white} />
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

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
  avatarWrap: { position: 'relative', marginBottom: Spacing.sm },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
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

  scroll: { flex: 1 },
  section: { marginTop: Spacing.md, paddingHorizontal: Spacing.md },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textHint,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: Spacing.xs, paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    ...Shadow.sm, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 14, gap: Spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  iconBox: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  rowSub: { fontSize: 12, color: Colors.textHint, marginTop: 1 },

  loginBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl, paddingVertical: 14,
    borderRadius: Radius.full, ...Shadow.md,
  },
  loginBtnTxt: { fontSize: 16, fontWeight: '700', color: Colors.white },
  version: { textAlign: 'center', fontSize: 11, color: Colors.textHint, marginTop: Spacing.md },
});

const pc = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.sm,
    borderLeftWidth: 4,
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 12, color: Colors.textHint, lineHeight: 17 },
  badge: {
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  arrowBox: { width: 28, height: 28, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
