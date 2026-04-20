import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, Platform, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { notificationsApi, type NotificationItem, type NotificationType } from '../../src/api/notifications';
import { useTranslation } from '../../src/i18n';
import { haptics } from '../../src/utils/haptics';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
type FilterTab = 'all' | 'unread';

const PAGE_SIZE = 20;

const TYPE_META: Record<
  NotificationType,
  { icon: IoniconsName; color: string; bg: string; label_uz: string; label_ru: string }
> = {
  ORDER:     { icon: 'cube-outline',          color: '#2196F3', bg: '#E3F2FD', label_uz: 'Buyurtma', label_ru: 'Заказ' },
  CHAT:      { icon: 'chatbubble-outline',    color: '#4CAF50', bg: '#E8F5E9', label_uz: 'Xabar',    label_ru: 'Сообщение' },
  CHANGE:    { icon: 'cash-outline',          color: '#D97706', bg: '#FEF3C7', label_uz: 'Qaytim',   label_ru: 'Сдача' },
  WALLET:    { icon: 'wallet-outline',        color: '#7C3AED', bg: '#EDE9FE', label_uz: 'Hamyon',   label_ru: 'Кошелёк' },
  BROADCAST: { icon: 'megaphone-outline',     color: '#FF5722', bg: '#FBE9E7', label_uz: 'Broadcast',label_ru: 'Запрос' },
  REVIEW:    { icon: 'star-outline',          color: '#FFB020', bg: '#FFF8E1', label_uz: 'Sharh',    label_ru: 'Отзыв' },
  COURIER:   { icon: 'bicycle-outline',       color: '#EC407A', bg: '#FCE4EC', label_uz: 'Kuryer',   label_ru: 'Курьер' },
  SYSTEM:    { icon: 'settings-outline',      color: '#607D8B', bg: '#ECEFF1', label_uz: 'Tizim',    label_ru: 'Система' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { lang } = useTranslation();
  const [filter, setFilter] = useState<FilterTab>('all');

  const {
    data: pages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['notifications', filter],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      notificationsApi.list({
        page: pageParam as number,
        limit: PAGE_SIZE,
        filter,
      }),
    getNextPageParam: (last) => last.meta.hasMore ? last.meta.page + 1 : undefined,
  });

  const items = useMemo(
    () => pages?.pages.flatMap((p) => p.items) ?? [],
    [pages],
  );

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      haptics.success();
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => notificationsApi.deleteAll(),
    onSuccess: () => {
      haptics.success();
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const handleTap = useCallback((n: NotificationItem) => {
    haptics.light();
    // Mark as read
    if (!n.read_at) markReadMutation.mutate(n.id);

    // Navigate based on type/data
    const orderId = n.data?.order_id;
    const convId = n.data?.conversation_id;
    const type = n.data?.type ?? n.type;

    if (orderId) {
      router.push({ pathname: '/(customer)/order/[id]', params: { id: orderId } });
    } else if (convId) {
      router.push('/(customer)/chat');
    } else if (type === 'LOW_BALANCE' || type === 'BALANCE_DEPLETED' || n.type === 'WALLET') {
      router.push('/(customer)/wallet');
    } else if (n.type === 'BROADCAST') {
      router.push('/(customer)/cart');
    }
  }, [markReadMutation, router]);

  const confirmDelete = (n: NotificationItem) => {
    haptics.warning();
    Alert.alert(
      lang === 'ru' ? 'Удалить' : "O'chirish",
      lang === 'ru' ? 'Это уведомление удалить?' : 'Bu bildirishnomani o\'chirasizmi?',
      [
        { text: lang === 'ru' ? 'Отмена' : 'Bekor', style: 'cancel' },
        {
          text: lang === 'ru' ? 'Удалить' : "O'chirish",
          style: 'destructive',
          onPress: () => { haptics.heavy(); deleteMutation.mutate(n.id); },
        },
      ],
    );
  };

  const confirmDeleteAll = () => {
    haptics.warning();
    Alert.alert(
      lang === 'ru' ? 'Очистить всё' : 'Hammasini tozalash',
      lang === 'ru'
        ? 'Все уведомления будут удалены. Продолжить?'
        : "Barcha bildirishnomalar o'chiriladi. Davom etasizmi?",
      [
        { text: lang === 'ru' ? 'Отмена' : 'Bekor', style: 'cancel' },
        {
          text: lang === 'ru' ? 'Удалить' : "O'chirish",
          style: 'destructive',
          onPress: () => { haptics.heavy(); deleteAllMutation.mutate(); },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const meta = TYPE_META[item.type] ?? TYPE_META.SYSTEM;
    const unread = !item.read_at;
    return (
      <TouchableOpacity
        style={[s.card, unread && s.cardUnread]}
        onPress={() => handleTap(item)}
        onLongPress={() => confirmDelete(item)}
        activeOpacity={0.85}
      >
        <View style={[s.iconBox, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.titleRow}>
            <Text style={[s.title, unread && s.titleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            {unread && <View style={s.dot} />}
          </View>
          <Text style={s.body} numberOfLines={2}>{item.body}</Text>
          <View style={s.metaRow}>
            <Text style={[s.typeTag, { color: meta.color }]}>
              {lang === 'ru' ? meta.label_ru : meta.label_uz}
            </Text>
            <Text style={s.time}>{formatTime(item.createdAt, lang)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>
            {lang === 'ru' ? 'Уведомления' : 'Bildirishnomalar'}
          </Text>
          <TouchableOpacity
            style={s.moreBtn}
            onPress={() => {
              Alert.alert(
                lang === 'ru' ? 'Действия' : 'Amallar',
                '',
                [
                  {
                    text: lang === 'ru' ? 'Отметить все прочитанными' : "Hammasini o'qilgan deb belgilash",
                    onPress: () => markAllReadMutation.mutate(),
                  },
                  {
                    text: lang === 'ru' ? 'Очистить всё' : 'Hammasini tozalash',
                    style: 'destructive',
                    onPress: confirmDeleteAll,
                  },
                  { text: lang === 'ru' ? 'Отмена' : 'Bekor', style: 'cancel' },
                ],
              );
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
        <View style={s.tabs}>
          {(['all', 'unread'] as FilterTab[]).map((t) => {
            const active = filter === t;
            return (
              <TouchableOpacity
                key={t}
                style={[s.tab, active && s.tabActive]}
                onPress={() => { haptics.select(); setFilter(t); }}
                activeOpacity={0.85}
              >
                <Text style={[s.tabTxt, active && s.tabTxtActive]}>
                  {t === 'all'
                    ? (lang === 'ru' ? 'Все' : 'Barchasi')
                    : (lang === 'ru' ? 'Непрочитанные' : "O'qilmagan")}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : items.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIconBox}>
            <Ionicons name="notifications-off-outline" size={40} color={Colors.primaryLight} />
          </View>
          <Text style={s.emptyTitle}>
            {filter === 'unread'
              ? (lang === 'ru' ? 'Все прочитано' : 'Hammasi o\'qilgan')
              : (lang === 'ru' ? 'Уведомлений нет' : 'Bildirishnomalar yo\'q')}
          </Text>
          <Text style={s.emptySub}>
            {lang === 'ru'
              ? 'Здесь появятся уведомления о заказах, сообщениях и выплатах'
              : "Buyurtmalar, xabarlar va to'lovlar haqida bildirishnomalar shu yerda paydo bo'ladi"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            <View style={{ padding: Spacing.md, alignItems: 'center' }}>
              {isFetchingNextPage && <ActivityIndicator color={Colors.primary} />}
              <View style={{ height: 40 }} />
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function formatTime(iso: string, lang: 'uz' | 'ru'): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;

  if (diff < 60) return lang === 'ru' ? 'только что' : 'hozir';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return lang === 'ru' ? `${m} мин` : `${m} daq`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return lang === 'ru' ? `${h} ч` : `${h} soat`;
  }
  if (diff < 86400 * 7) {
    const days = Math.floor(diff / 86400);
    return lang === 'ru' ? `${days} д` : `${days} kun`;
  }
  return d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
    day: 'numeric',
    month: 'short',
  });
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.xs : 0,
    paddingBottom: Spacing.sm,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    gap: Spacing.sm,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.white },
  moreBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.lg,
    padding: 3,
    gap: 3,
  },
  tab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: Radius.md,
  },
  tabActive: { backgroundColor: Colors.white, ...Shadow.sm },
  tabTxt: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  tabTxtActive: { color: Colors.primary },

  center: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, padding: Spacing.lg,
  },
  emptyIconBox: {
    width: 88, height: 88, borderRadius: 26,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.sm },
  emptySub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', lineHeight: 19, paddingHorizontal: Spacing.md },

  list: {
    padding: Spacing.md,
    backgroundColor: Colors.background,
    minHeight: '100%',
  },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    ...Shadow.sm,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  titleUnread: { fontWeight: '800' },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  body: { fontSize: 12, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  metaRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 6,
  },
  typeTag: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  time: { fontSize: 11, color: Colors.textHint },
});
