import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { chatApi } from '../../src/api/chat';
import { useAuthStore } from '../../src/store/auth.store';
import { useTranslation } from '../../src/i18n';

function formatTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function ChatScreen() {
  const router = useRouter();
  const { lang, tr } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: chatApi.getConversations,
    enabled: isAuthenticated,
  });

  const list = Array.isArray(conversations) ? conversations : [];

  // Not logged in
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={s.title}>{lang === 'ru' ? 'Сообщения' : 'Xabarlar'}</Text>
        </View>
        <View style={s.loginWrap}>
          <View style={s.loginIconBox}>
            <Ionicons name="chatbubbles-outline" size={44} color={Colors.primaryLight} />
          </View>
          <Text style={s.loginTitle}>
            {lang === 'ru' ? 'Войдите, чтобы видеть сообщения' : "Xabarlarni ko'rish uchun kiring"}
          </Text>
          <Text style={s.loginSub}>
            {lang === 'ru' ? 'Все ваши переписки будут здесь' : "Barcha yozishmalaringiz shu yerda bo'ladi"}
          </Text>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/(auth)/login')} activeOpacity={0.85}>
            <Ionicons name="log-in-outline" size={18} color={Colors.white} />
            <Text style={s.loginBtnTxt}>{tr('login')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>{lang === 'ru' ? 'Сообщения' : 'Xabarlar'}</Text>
        <Text style={s.subtitle}>
          {list.length} {lang === 'ru' ? 'чатов' : 'ta suhbat'}
        </Text>
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Ionicons name="chatbubbles-outline" size={44} color={Colors.primaryLight} />
              </View>
              <Text style={s.emptyTitle}>
                {lang === 'ru' ? 'Нет сообщений' : 'Xabarlar yo\'q'}
              </Text>
              <Text style={s.emptySub}>
                {lang === 'ru'
                  ? 'Здесь будут ваши переписки с магазинами'
                  : "Do'konlar bilan yozishmalaringiz shu yerda ko'rinadi"}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            activeOpacity={0.88}
            onPress={() => {
              Alert.alert('Tez orada', lang === 'ru' ? 'Скоро будет доступно' : 'Tez orada ishga tushadi');
            }}
          >
            <View style={s.avatarCircle}>
              {item.store?.logo ? (
                <Ionicons name="storefront" size={20} color={Colors.primary} />
              ) : (
                <Ionicons name="storefront" size={20} color={Colors.primary} />
              )}
            </View>
            <View style={s.cardContent}>
              <View style={s.cardTop}>
                <Text style={s.storeName} numberOfLines={1}>
                  {item.store?.name ?? (lang === 'ru' ? 'Чат' : 'Suhbat')}
                </Text>
                <Text style={s.time}>{formatTime(item.last_message_at ?? item.updated_at)}</Text>
              </View>
              <Text style={s.lastMsg} numberOfLines={1}>
                {item.last_message ?? (lang === 'ru' ? 'Нет сообщений' : 'Xabar yo\'q')}
              </Text>
            </View>
            {item.unread_count > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{item.unread_count}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },

  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.xs : 0,
    paddingBottom: Spacing.md,
    gap: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },

  list: { flexGrow: 1, backgroundColor: Colors.background, padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.sm,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1, gap: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storeName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: Spacing.sm },
  time: { fontSize: 11, color: Colors.textHint },
  lastMsg: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeTxt: { fontSize: 11, fontWeight: '700', color: Colors.white },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyIconBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', paddingHorizontal: 40 },

  loginWrap: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  loginIconBox: { width: 96, height: 96, borderRadius: 28, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  loginTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  loginSub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', lineHeight: 19 },
  loginBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 13, borderRadius: Radius.full, marginTop: Spacing.sm, ...Shadow.sm },
  loginBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
