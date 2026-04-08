import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { apiClient } from '../../src/api/client';
import { useAuthStore } from '../../src/store/auth.store';
import { useTranslation } from '../../src/i18n';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function formatDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getTransactionIcon(type?: string): { icon: IoniconsName; color: string; bg: string } {
  switch (type) {
    case 'TOP_UP':
    case 'REFUND':
    case 'CASHBACK':
      return { icon: 'arrow-down-outline', color: Colors.success, bg: Colors.successSurface };
    case 'PAYMENT':
    case 'WITHDRAWAL':
      return { icon: 'arrow-up-outline', color: Colors.error, bg: Colors.errorSurface };
    default:
      return { icon: 'swap-horizontal-outline', color: Colors.info, bg: Colors.infoSurface };
  }
}

export default function WalletScreen() {
  const router = useRouter();
  const { lang, tr } = useTranslation();
  const { isAuthenticated } = useAuthStore();

  const { data: wallet, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ['wallet-my'],
    queryFn: () => apiClient.get('/wallet/my').then((r) => r.data),
    enabled: isAuthenticated,
  });

  const { data: transactions, isLoading: txLoading, refetch: refetchTx } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => apiClient.get('/wallet/transactions').then((r) => r.data),
    enabled: isAuthenticated,
  });

  const isLoading = walletLoading || txLoading;
  const txList = Array.isArray(transactions) ? transactions : transactions?.data ?? [];
  const balance = wallet?.balance ?? 0;

  const refetch = () => {
    refetchWallet();
    refetchTx();
  };

  // Not logged in
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={s.title}>{lang === 'ru' ? 'Кошелёк' : 'Hamyon'}</Text>
        </View>
        <View style={s.loginWrap}>
          <View style={s.loginIconBox}>
            <Ionicons name="wallet-outline" size={44} color={Colors.primaryLight} />
          </View>
          <Text style={s.loginTitle}>
            {lang === 'ru' ? 'Войдите, чтобы видеть кошелёк' : "Hamyonni ko'rish uchun kiring"}
          </Text>
          <Text style={s.loginSub}>
            {lang === 'ru' ? 'Ваш баланс и история транзакций' : "Balansingiz va tranzaksiyalar tarixi"}
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
        <Text style={s.title}>{lang === 'ru' ? 'Кошелёк' : 'Hamyon'}</Text>
      </View>

      {/* Balance Card */}
      <View style={s.balanceCard}>
        <View style={s.balanceDecor1} />
        <View style={s.balanceDecor2} />
        <View style={s.balanceIconRow}>
          <View style={s.balanceIconBox}>
            <Ionicons name="wallet" size={24} color={Colors.primary} />
          </View>
          <Text style={s.balanceLabel}>{lang === 'ru' ? 'Ваш баланс' : 'Sizning balansingiz'}</Text>
        </View>
        <Text style={s.balanceAmount}>{Number(balance).toLocaleString()} <Text style={s.balanceCurrency}>so'm</Text></Text>
      </View>

      {/* Transactions */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{lang === 'ru' ? 'История транзакций' : 'Tranzaksiyalar tarixi'}</Text>
      </View>

      <FlatList
        data={txList}
        keyExtractor={(item, idx) => item.id ?? String(idx)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <Ionicons name="receipt-outline" size={44} color={Colors.primaryLight} />
              </View>
              <Text style={s.emptyTitle}>
                {lang === 'ru' ? 'Нет транзакций' : 'Tranzaksiyalar yo\'q'}
              </Text>
              <Text style={s.emptySub}>
                {lang === 'ru'
                  ? 'Ваши транзакции появятся здесь'
                  : "Tranzaksiyalaringiz shu yerda ko'rinadi"}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const txIcon = getTransactionIcon(item.type);
          const isIncome = ['TOP_UP', 'REFUND', 'CASHBACK'].includes(item.type);
          return (
            <View style={s.txCard}>
              <View style={[s.txIconBox, { backgroundColor: txIcon.bg }]}>
                <Ionicons name={txIcon.icon} size={20} color={txIcon.color} />
              </View>
              <View style={s.txContent}>
                <Text style={s.txDesc} numberOfLines={1}>
                  {item.description ?? item.type ?? (lang === 'ru' ? 'Транзакция' : 'Tranzaksiya')}
                </Text>
                <Text style={s.txDate}>{formatDate(item.created_at)}</Text>
              </View>
              <Text style={[s.txAmount, { color: isIncome ? Colors.success : Colors.error }]}>
                {isIncome ? '+' : '-'}{Number(item.amount).toLocaleString()} so'm
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

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

  balanceCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: -10,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    ...Shadow.md,
    overflow: 'hidden',
  },
  balanceDecor1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primarySurface,
    top: -40,
    right: -30,
    opacity: 0.5,
  },
  balanceDecor2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primarySurface,
    bottom: -20,
    left: -20,
    opacity: 0.4,
  },
  balanceIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  balanceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  balanceAmount: { fontSize: 32, fontWeight: '800', color: Colors.textPrimary },
  balanceCurrency: { fontSize: 18, fontWeight: '600', color: Colors.textSecondary },

  sectionHeader: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textHint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingLeft: 4,
  },

  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100, paddingTop: 0 },

  txCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadow.sm,
  },
  txIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txContent: { flex: 1, gap: 2 },
  txDesc: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  txDate: { fontSize: 11, color: Colors.textHint },
  txAmount: { fontSize: 15, fontWeight: '700' },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: Spacing.sm },
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

  loginWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  loginIconBox: { width: 96, height: 96, borderRadius: 28, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  loginTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  loginSub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', lineHeight: 19 },
  loginBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 13, borderRadius: Radius.full, marginTop: Spacing.sm, ...Shadow.sm },
  loginBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
