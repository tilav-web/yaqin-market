import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { ordersApi } from '../../src/api/orders';
import { storesApi } from '../../src/api/stores';
import { useSocket } from '../../src/hooks/useSocket';
import { useTranslation } from '../../src/i18n';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const STATUS_CFG = (lang: string): Record<string, { label: string; color: string; bg: string }> => ({
  PENDING:    { label: lang === 'ru' ? 'Ожидает' : 'Kutilmoqda',     color: Colors.statusPending,    bg: '#FFF3E0' },
  ACCEPTED:   { label: lang === 'ru' ? 'Принят' : 'Qabul',           color: Colors.statusAccepted,   bg: '#E3F2FD' },
  READY:      { label: lang === 'ru' ? 'Готов' : 'Tayyor',           color: Colors.statusReady,      bg: '#F3E5F5' },
  DELIVERING: { label: lang === 'ru' ? 'Доставляется' : 'Yetkazmoqda', color: Colors.statusDelivering, bg: '#FBE9E7' },
  DELIVERED:  { label: lang === 'ru' ? 'Доставлен' : 'Yetkazildi',   color: Colors.statusDelivered,  bg: '#E8F5E9' },
  CANCELLED:  { label: lang === 'ru' ? 'Отменён' : 'Bekor',          color: Colors.statusCancelled,  bg: '#F5F5F5' },
});

function fmt(n: number) { return n.toLocaleString(); }
function timeStr(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function SellerDashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const { lang, t } = useTranslation();

  const { data: myStores, isLoading: loadingStore } = useQuery({ queryKey: ['my-stores'], queryFn: storesApi.getMyStores });
  const { data: pendingOrders, refetch, isLoading } = useQuery({
    queryKey: ['store-orders', 'PENDING'],
    queryFn: () => ordersApi.getStoreOrders('PENDING'),
  });
  const { data: allOrders } = useQuery({
    queryKey: ['store-orders-all'],
    queryFn: () => ordersApi.getStoreOrders(),
  });

  useSocket('seller', (event) => {
    if (event === 'order:new-direct') qc.invalidateQueries({ queryKey: ['store-orders'] });
    if (event === 'broadcast:request_created') qc.invalidateQueries({ queryKey: ['broadcast-feed'] });
  });

  const store = myStores?.[0];
  const orders = Array.isArray(allOrders) ? allOrders : [];
  const pending = Array.isArray(pendingOrders) ? pendingOrders : [];

  const today = new Date();
  const todayOrders = orders.filter((o: any) => {
    const d = new Date(o.created_at ?? o.createdAt);
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  });
  const todayRevenue = todayOrders
    .filter((o: any) => o.status === 'DELIVERED')
    .reduce((s: number, o: any) => s + Number(o.total_price), 0);
  const acceptedCount = orders.filter((o: any) => o.status === 'ACCEPTED').length;

  const quickActions: { icon: IoniconsName; label: string; color: string; bg: string; path: string }[] = [
    { icon: 'megaphone-outline', label: lang === 'ru' ? 'Общие' : 'Umumiy',         color: '#FF9800', bg: '#FFF3E0', path: '/(seller)/broadcast-feed' },
    { icon: 'cube-outline',      label: lang === 'ru' ? 'Заказы' : 'Buyurtmalar',   color: '#2196F3', bg: '#E3F2FD', path: '/(seller)/orders' },
    { icon: 'bag-outline',       label: lang === 'ru' ? 'Товары' : 'Mahsulotlar',   color: Colors.primary, bg: Colors.primarySurface, path: '/(seller)/products' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.decorCircle1} />
        <View style={s.decorCircle2} />
        <View style={s.headerTop}>
          <View>
            <Text style={s.greeting}>{lang === 'ru' ? 'Здравствуйте 👋' : 'Assalomu alaykum 👋'}</Text>
            <Text style={s.storeName}>{store?.name ?? (lang === 'ru' ? 'Мой магазин' : "Do'konim")}</Text>
          </View>
          <View style={s.headerRight}>
            <View style={[s.statusPill, { backgroundColor: store?.is_active ? '#C8E6C9' : '#FFCDD2' }]}>
              <View style={[s.statusDot, { backgroundColor: store?.is_active ? Colors.success : Colors.error }]} />
              <Text style={[s.statusTxt, { color: store?.is_active ? Colors.success : Colors.error }]}>
                {store?.is_active ? (lang === 'ru' ? 'Активен' : 'Faol') : (lang === 'ru' ? 'Неактивен' : 'Nofaol')}
              </Text>
            </View>
            <TouchableOpacity style={s.notifBtn}>
              <Ionicons name="notifications-outline" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { label: lang === 'ru' ? 'Заказы сегодня' : "Bugun buyurtma", value: String(todayOrders.length), icon: 'cube-outline' as IoniconsName, color: Colors.white },
            { label: lang === 'ru' ? 'Ожидает' : 'Kutilmoqda',            value: String(pending.length),      icon: 'time-outline' as IoniconsName, color: '#FFD54F' },
            { label: lang === 'ru' ? 'Доход' : 'Daromad',                 value: fmt(todayRevenue),           icon: 'cash-outline' as IoniconsName, color: '#A5D6A7' },
          ].map((stat, i) => (
            <View key={i} style={[s.statCard, i > 0 && { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.15)' }]}>
              <Ionicons name={stat.icon} size={16} color={stat.color} />
              <Text style={[s.statVal, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />}
      >
        {/* Quick actions */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{lang === 'ru' ? 'Быстрые действия' : 'Tezkor amallar'}</Text>
          <View style={s.actionsRow}>
            {quickActions.map(a => (
              <TouchableOpacity key={a.label} style={s.actionCard} onPress={() => router.push(a.path as any)} activeOpacity={0.85}>
                <View style={[s.actionIcon, { backgroundColor: a.bg }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={s.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Active indicator */}
        {acceptedCount > 0 && (
          <TouchableOpacity style={s.activeBanner} onPress={() => router.push('/(seller)/orders')} activeOpacity={0.88}>
            <View style={s.activePulse}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            </View>
            <Text style={s.activeBannerTxt}>{lang === 'ru' ? `${acceptedCount} заказов готовятся` : `${acceptedCount} ta buyurtma tayyorlanmoqda`}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.success} />
          </TouchableOpacity>
        )}

        {/* Pending orders */}
        <View style={s.section}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>{lang === 'ru' ? 'Новые заказы' : 'Yangi buyurtmalar'}</Text>
            {pending.length > 0 && (
              <View style={s.countBadge}>
                <Text style={s.countBadgeTxt}>{pending.length}</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => router.push('/(seller)/orders')} style={{ marginLeft: 'auto' }}>
              <Text style={s.seeAll}>{lang === 'ru' ? 'Все' : 'Barchasi'}</Text>
            </TouchableOpacity>
          </View>

          {pending.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={28} color={Colors.success} />
              <Text style={s.emptyCardTxt}>{lang === 'ru' ? 'Пока нет новых заказов' : "Hozircha yangi buyurtma yo'q"}</Text>
            </View>
          ) : (
            pending.slice(0, 5).map((order: any) => (
              <TouchableOpacity
                key={order.id}
                style={s.orderCard}
                onPress={() => router.push({ pathname: '/(seller)/order/[id]', params: { id: order.id } })}
                activeOpacity={0.88}
              >
                <View style={s.orderLeft}>
                  <View style={s.orderTypeIcon}>
                    <Ionicons
                      name={order.order_type === 'BROADCAST' ? 'megaphone-outline' : 'storefront-outline'}
                      size={16}
                      color={order.order_type === 'BROADCAST' ? '#FF9800' : Colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={s.orderNum}>{order.order_number}</Text>
                    <Text style={s.orderMeta}>{order.items?.length ?? 0} {lang === 'ru' ? 'товаров' : 'ta mahsulot'} · {timeStr(order.created_at ?? order.createdAt)}</Text>
                  </View>
                </View>
                <View style={s.orderRight}>
                  <Text style={s.orderPrice}>{fmt(Number(order.total_price))} {lang === 'ru' ? 'сум' : "so'm"}</Text>
                  <View style={[s.statusChip, { backgroundColor: STATUS_CFG(lang)['PENDING'].bg }]}>
                    <Text style={[s.statusChipTxt, { color: STATUS_CFG(lang)['PENDING'].color }]}>{lang === 'ru' ? 'Новый' : 'Yangi'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Store info card */}
        {store && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{lang === 'ru' ? 'Информация о магазине' : "Do'kon ma'lumotlari"}</Text>
            <View style={s.storeCard}>
              <View style={s.storeCardRow}>
                <View style={s.storeCardIcon}>
                  <Ionicons name="storefront" size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.storeCardName}>{store.name}</Text>
                  {store.address && <Text style={s.storeCardAddr}>{store.address}</Text>}
                </View>
                <TouchableOpacity style={s.editStoreBtn}>
                  <Ionicons name="settings-outline" size={18} color={Colors.textHint} />
                </TouchableOpacity>
              </View>
              <View style={s.storeStats}>
                {[
                  { label: lang === 'ru' ? 'Всего заказов' : 'Jami buyurtma', value: String(orders.length) },
                  { label: lang === 'ru' ? 'Доставлено' : "Yetkazilgan", value: String(orders.filter((o: any) => o.status === 'DELIVERED').length) },
                  { label: lang === 'ru' ? 'Отменено' : 'Bekor qilingan', value: String(orders.filter((o: any) => o.status === 'CANCELLED').length) },
                ].map((item, i) => (
                  <View key={i} style={[s.storeStat, i > 0 && { borderLeftWidth: 1, borderLeftColor: Colors.divider }]}>
                    <Text style={s.storeStatVal}>{item.value}</Text>
                    <Text style={s.storeStatLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.xs : 0,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  decorCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', top: -80, right: -60 },
  decorCircle2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -40, left: -40 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  greeting: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  storeName: { fontSize: 20, fontWeight: '800', color: Colors.white, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontWeight: '700' },
  notifBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.lg, overflow: 'hidden' },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 3 },
  statVal: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

  scroll: { flex: 1, backgroundColor: Colors.background },
  section: { marginTop: Spacing.md, paddingHorizontal: Spacing.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  seeAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  countBadge: { backgroundColor: Colors.primary, borderRadius: Radius.full, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  countBadgeTxt: { color: Colors.white, fontSize: 11, fontWeight: '700' },

  actionsRow: { flexDirection: 'row', gap: Spacing.sm },
  actionCard: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, alignItems: 'center', gap: Spacing.sm, ...Shadow.sm },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },

  activeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: '#E8F5E9', borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: '#C8E6C9',
  },
  activePulse: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#C8E6C9', alignItems: 'center', justifyContent: 'center' },
  activeBannerTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.success },

  emptyCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, ...Shadow.sm },
  emptyCardTxt: { fontSize: 14, color: Colors.textSecondary },

  orderCard: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadow.sm, marginBottom: Spacing.sm,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  orderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  orderTypeIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  orderNum: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  orderMeta: { fontSize: 12, color: Colors.textHint, marginTop: 2 },
  orderRight: { alignItems: 'flex-end', gap: 4 },
  orderPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  statusChipTxt: { fontSize: 11, fontWeight: '700' },

  storeCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, ...Shadow.sm, overflow: 'hidden' },
  storeCardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
  storeCardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  storeCardName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  storeCardAddr: { fontSize: 12, color: Colors.textHint, marginTop: 2 },
  editStoreBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  storeStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.divider },
  storeStat: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 3 },
  storeStatVal: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  storeStatLabel: { fontSize: 10, color: Colors.textHint, textAlign: 'center' },
});
