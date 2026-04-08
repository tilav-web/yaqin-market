import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Platform, Modal, Animated, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { useAuthStore } from '../../src/store/auth.store';
import { authApi } from '../../src/api/auth';
import { usersApi } from '../../src/api/users';
import { useTranslation } from '../../src/i18n';
import type { Lang } from '../../src/i18n';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  icon: IoniconsName;
  color: string;
  bg: string;
  label: string;
  sub?: string;
  onPress: () => void;
}

// ─── Language Picker Drawer ───────────────────────────────────────────────────
function LangPickerDrawer({
  visible, onClose, lang, onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  lang: Lang;
  onSelect: (l: Lang) => void;
}) {
  const slideY = useRef(new Animated.Value(300)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 300, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const OPTIONS: { value: Lang; flag: string; label: string; sub: string }[] = [
    { value: 'uz', flag: '🇺🇿', label: "O'zbek", sub: "Ilova o'zbek tilida" },
    { value: 'ru', flag: '🇷🇺', label: 'Русский', sub: 'Приложение на русском' },
  ];

  return (
    <Modal transparent visible={visible} onRequestClose={onClose} animationType="none">
      {/* Backdrop */}
      <Animated.View style={[d.backdrop, { opacity: bgOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[d.sheet, { transform: [{ translateY: slideY }] }]}>
        {/* Handle */}
        <View style={d.handle} />

        <Text style={d.title}>Tilni tanlang / Выберите язык</Text>

        <View style={d.optionsWrap}>
          {OPTIONS.map((opt) => {
            const selected = lang === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[d.option, selected && d.optionActive]}
                onPress={() => { onSelect(opt.value); onClose(); }}
                activeOpacity={0.8}
              >
                <Text style={d.flag}>{opt.flag}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[d.optLabel, selected && { color: Colors.primary }]}>{opt.label}</Text>
                  <Text style={d.optSub}>{opt.sub}</Text>
                </View>
                <View style={[d.check, selected && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}>
                  {selected && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: Platform.OS === 'ios' ? 28 : 16 }} />
      </Animated.View>
    </Modal>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { logout, role, isAuthenticated } = useAuthStore();
  const { lang, setLang, tr } = useTranslation();
  const [langDrawerOpen, setLangDrawerOpen] = useState(false);

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
          <Text style={s.name}>{tr('profile_not_logged')}</Text>
          <Text style={s.phone}>{tr('profile_login_required')}</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl }}>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/(auth)/login')}>
            <Ionicons name="log-in-outline" size={20} color={Colors.white} />
            <Text style={s.loginBtnTxt}>{tr('login')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const fullName =
    user?.first_name && user.first_name !== '-'
      ? `${user.first_name} ${user.last_name ?? ''}`.trim()
      : tr('tab_profile');

  const initials = fullName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const roleLabel =
    role === 'SELLER' ? (lang === 'ru' ? 'Продавец' : 'Sotuvchi')
    : role === 'COURIER' ? (lang === 'ru' ? 'Курьер' : 'Kuryer')
    : role === 'SUPER_ADMIN' ? 'Super Admin'
    : (lang === 'ru' ? 'Покупатель' : 'Xaridor');

  const handleLogout = () => {
    Alert.alert(tr('logout_confirm'), tr('logout_confirm_msg'), [
      { text: tr('cancel'), style: 'cancel' },
      {
        text: tr('logout'),
        style: 'destructive',
        onPress: async () => {
          await authApi.logout().catch(() => {});
          await logout();
          router.replace('/(customer)/home');
        },
      },
    ]);
  };

  const renderRolePanel = () => {
    if (role === 'SELLER') return (
      <PanelCard
        icon="storefront" color="#E53935" bg="#FFEBEE"
        title={lang === 'ru' ? "Панель магазина" : "Do'kon paneli"}
        sub={lang === 'ru' ? "Товары, заказы и настройки" : "Mahsulotlar, buyurtmalar va sozlamalar"}
        badge={lang === 'ru' ? 'Продавец' : 'Sotuvchi'}
        badgeColor={Colors.primary}
        onPress={() => router.push('/(seller)/dashboard')}
      />
    );
    if (role === 'COURIER') return (
      <PanelCard
        icon="bicycle" color="#FF5722" bg="#FBE9E7"
        title={lang === 'ru' ? "Панель курьера" : "Kuryer paneli"}
        sub={lang === 'ru' ? "Заказы доставки и маршруты" : "Yetkazish buyurtmalari va yo'nalishlar"}
        badge={lang === 'ru' ? 'Курьер' : 'Kuryer'}
        badgeColor="#FF5722"
        onPress={() => router.push('/(courier)/nearby')}
      />
    );
    return null;
  };

  const renderApplyCards = () => {
    if (role !== 'CUSTOMER' && role !== null) return null;
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>{tr('start_business')}</Text>
        <View style={{ gap: Spacing.sm }}>
          <ApplyCard
            icon="storefront-outline" color={Colors.primary} bg={Colors.primarySurface}
            title={tr('become_seller')} sub={tr('become_seller_sub')}
            onPress={() => router.push('/(customer)/apply-seller')}
          />
          <ApplyCard
            icon="bicycle-outline" color="#FF5722" bg="#FBE9E7"
            title={tr('become_courier')} sub={tr('become_courier_sub')}
            onPress={() => router.push('/(customer)/apply-courier')}
          />
        </View>
      </View>
    );
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: tr('activity'),
      items: [
        {
          icon: 'cube-outline', color: Colors.primary, bg: Colors.primarySurface,
          label: tr('my_orders'), sub: tr('my_orders_sub'),
          onPress: () => router.push('/(customer)/orders'),
        },
        {
          icon: 'megaphone-outline', color: '#FF5722', bg: '#FBE9E7',
          label: tr('my_broadcast'), sub: tr('my_broadcast_sub'),
          onPress: () => router.push('/(customer)/broadcast-cart'),
        },
        {
          icon: 'chatbubbles-outline', color: '#00897B', bg: '#E0F2F1',
          label: lang === 'ru' ? 'Сообщения' : 'Xabarlar',
          sub: lang === 'ru' ? 'Переписки с магазинами' : "Do'konlar bilan yozishmalar",
          onPress: () => router.push('/(customer)/chat'),
        },
        {
          icon: 'wallet-outline', color: '#9C27B0', bg: '#F3E5F5',
          label: lang === 'ru' ? 'Кошелёк' : 'Hamyon',
          sub: lang === 'ru' ? 'Баланс и транзакции' : 'Balans va tranzaksiyalar',
          onPress: () => router.push('/(customer)/wallet'),
        },
      ],
    },
    {
      title: tr('settings'),
      items: [
        {
          icon: 'language-outline', color: '#00897B', bg: '#E0F2F1',
          label: tr('language'),
          sub: lang === 'uz' ? "O'zbek tili" : 'Русский язык',
          onPress: () => setLangDrawerOpen(true),
        },
        {
          icon: 'notifications-outline', color: '#9C27B0', bg: '#F3E5F5',
          label: tr('notifications'), sub: tr('notifications_sub'),
          onPress: () => {},
        },
        {
          icon: 'location-outline', color: '#2196F3', bg: '#E3F2FD',
          label: lang === 'ru' ? 'Мои адреса' : 'Manzillarim',
          sub: lang === 'ru' ? 'Сохранённые адреса' : 'Saqlangan manzillar',
          onPress: () => router.push('/(customer)/my-locations'),
        },
        {
          icon: 'help-circle-outline', color: '#00897B', bg: '#E0F2F1',
          label: tr('help'), sub: tr('help_sub'),
          onPress: () => router.push('/(customer)/help'),
        },
        {
          icon: 'information-circle-outline', color: Colors.textSecondary, bg: Colors.background,
          label: tr('about'), sub: tr('about_sub'),
          onPress: () => router.push('/(customer)/about'),
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
          <TouchableOpacity style={s.editBtn} onPress={() => router.push('/(customer)/edit-profile')}>
            <Ionicons name="pencil" size={12} color={Colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={s.name}>{fullName}</Text>
        <Text style={s.phone}>+998 {auth?.phone ?? '— — —'}</Text>
        <View style={s.rolePill}>
          <Ionicons
            name={role === 'SELLER' ? 'storefront-outline' : role === 'COURIER' ? 'bicycle-outline' : 'person-outline'}
            size={12} color={Colors.primary}
          />
          <Text style={s.roleText}>{roleLabel}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: lang === 'ru' ? 'Заказы' : 'Buyurtma', value: '0', icon: 'cube-outline' as IoniconsName },
          { label: lang === 'ru' ? 'Потрачено' : "So'm sarflandi", value: '0', icon: 'wallet-outline' as IoniconsName },
          { label: lang === 'ru' ? 'Адрес' : 'Manzil', value: '0', icon: 'location-outline' as IoniconsName },
        ].map((stat, i) => (
          <View key={i} style={[s.statCard, i < 2 && s.statBorder]}>
            <Ionicons name={stat.icon} size={18} color={Colors.primary} />
            <Text style={s.statVal}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {(role === 'SELLER' || role === 'COURIER') && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{lang === 'ru' ? 'Моя панель' : 'Mening panelim'}</Text>
            {renderRolePanel()}
          </View>
        )}

        {renderApplyCards()}

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
              <Text style={[s.rowLabel, { color: Colors.error, flex: 1 }]}>{tr('logout')}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.version}>Yaqin Market v1.0.0</Text>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Lang Picker Drawer */}
      <LangPickerDrawer
        visible={langDrawerOpen}
        onClose={() => setLangDrawerOpen(false)}
        lang={lang}
        onSelect={setLang}
      />
    </SafeAreaView>
  );
}

// ── Panel Card ────────────────────────────────────────────────────────────────
function PanelCard({ icon, color, bg, title, sub, badge, badgeColor, onPress }: {
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
function ApplyCard({ icon, color, bg, title, sub, onPress }: {
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

// ─── Styles ───────────────────────────────────────────────────────────────────
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
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md, ...Shadow.sm, borderLeftWidth: 4,
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 12, color: Colors.textHint, lineHeight: 17 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  arrowBox: { width: 28, height: 28, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});

const d = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: Spacing.md,
    ...Shadow.lg,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.divider,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 16, fontWeight: '700', color: Colors.textPrimary,
    textAlign: 'center', marginBottom: Spacing.md,
  },
  optionsWrap: { gap: Spacing.sm },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 2, borderColor: 'transparent',
  },
  optionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySurface,
  },
  flag: { fontSize: 32 },
  optLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  optSub: { fontSize: 12, color: Colors.textHint, marginTop: 2 },
  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.divider,
    alignItems: 'center', justifyContent: 'center',
  },
});
