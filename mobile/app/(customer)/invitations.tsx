import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import {
  staffApi,
  type StaffRole,
  type StoreStaffInvitation,
} from '../../src/api/store-staff';
import { haptics } from '../../src/utils/haptics';

const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: 'egasi',
  MANAGER: 'boshqaruvchi',
  OPERATOR: 'operator',
  PACKER: 'yig\'uvchi',
  COURIER: 'kuryer',
};

const ROLE_COLOR: Record<StaffRole, string> = {
  OWNER: '#7C3AED',
  MANAGER: '#2563EB',
  OPERATOR: '#0891B2',
  PACKER: '#059669',
  COURIER: '#EA580C',
};

const ROLE_DESC: Record<StaffRole, string> = {
  OWNER: 'Do\'kon egasi sifatida to\'liq huquqlar',
  MANAGER: 'Do\'konni boshqarish, xodim qo\'shish',
  OPERATOR: 'Buyurtmalarni qabul qilish va rad etish',
  PACKER: 'Buyurtmalarni yig\'ish va tayyor deb belgilash',
  COURIER: 'Buyurtmalarni mijozlarga yetkazib berish',
};

export default function InvitationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: invitations = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<StoreStaffInvitation[]>({
    queryKey: ['my-invitations'],
    queryFn: staffApi.myInvitations,
  });

  const respondMutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: 'ACCEPT' | 'REJECT';
    }) => staffApi.respond(id, action),
    onSuccess: (_, vars) => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
      queryClient.invalidateQueries({ queryKey: ['my-staff-stores'] });

      if (vars.action === 'ACCEPT') {
        Alert.alert(
          'Qabul qilindi!',
          'Endi siz do\'kon xodimisiz. Sotuvchi paneliga o\'ting.',
          [
            { text: 'OK' },
            {
              text: 'Sotuvchi paneliga',
              onPress: () => router.replace('/(seller)/dashboard'),
            },
          ],
        );
      }
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Xato', err?.response?.data?.message ?? 'Xato');
    },
  });

  const confirmAction = (inv: StoreStaffInvitation, action: 'ACCEPT' | 'REJECT') => {
    if (action === 'ACCEPT') {
      Alert.alert(
        'Taklifni qabul qilish',
        `"${inv.store?.name}" do'konida ${ROLE_LABEL[inv.role]} bo'lishni qabul qilasizmi?`,
        [
          { text: 'Bekor', style: 'cancel' },
          {
            text: 'Ha, qabul qilaman',
            onPress: () => respondMutation.mutate({ id: inv.id, action }),
          },
        ],
      );
    } else {
      Alert.alert(
        'Taklifni rad etish',
        'Taklifni rad etmoqchimisiz?',
        [
          { text: 'Bekor', style: 'cancel' },
          {
            text: 'Rad etish',
            style: 'destructive',
            onPress: () => respondMutation.mutate({ id: inv.id, action }),
          },
        ],
      );
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Takliflar</Text>
          <Text style={s.headerSub}>Xodimlik takliflari</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: Spacing.xl * 2 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
      >
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
        ) : invitations.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="mail-open-outline" size={56} color={Colors.textHint} />
            <Text style={s.emptyTitle}>Takliflar yo'q</Text>
            <Text style={s.emptySub}>
              Do'konlar sizni xodim sifatida taklif qilsa, shu yerda ko'rinadi
            </Text>
          </View>
        ) : (
          invitations.map((inv) => {
            const daysLeft = Math.max(
              0,
              Math.ceil(
                (new Date(inv.expires_at).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24),
              ),
            );
            return (
              <View key={inv.id} style={s.card}>
                <View style={s.cardTop}>
                  <View
                    style={[
                      s.iconBox,
                      { backgroundColor: ROLE_COLOR[inv.role] + '20' },
                    ]}
                  >
                    <Ionicons
                      name="storefront"
                      size={24}
                      color={ROLE_COLOR[inv.role]}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.storeName}>{inv.store?.name ?? '—'}</Text>
                    <Text style={s.inviteText}>
                      Sizni{' '}
                      <Text style={{ color: ROLE_COLOR[inv.role], fontWeight: '700' }}>
                        {ROLE_LABEL[inv.role]}
                      </Text>{' '}
                      qilib taklif qilmoqda
                    </Text>
                  </View>
                </View>

                <View style={s.roleInfo}>
                  <Ionicons
                    name="information-circle-outline"
                    size={14}
                    color={Colors.textHint}
                  />
                  <Text style={s.roleInfoTxt}>{ROLE_DESC[inv.role]}</Text>
                </View>

                {inv.inviter && (
                  <View style={s.meta}>
                    <Ionicons name="person-outline" size={12} color={Colors.textHint} />
                    <Text style={s.metaTxt}>
                      {inv.inviter.first_name} {inv.inviter.last_name} yubordi
                    </Text>
                    <Text style={s.metaDot}>·</Text>
                    <Text style={s.metaTxt}>{daysLeft} kun qoldi</Text>
                  </View>
                )}

                {inv.message && (
                  <Text style={s.inviteMsg}>"{inv.message}"</Text>
                )}

                <View style={s.btnRow}>
                  <TouchableOpacity
                    style={[s.btn, s.rejectBtn]}
                    onPress={() => confirmAction(inv, 'REJECT')}
                    disabled={respondMutation.isPending}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close" size={16} color={Colors.error} />
                    <Text style={s.rejectTxt}>Rad etish</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.btn, s.acceptBtn]}
                    onPress={() => confirmAction(inv, 'ACCEPT')}
                    disabled={respondMutation.isPending}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                    <Text style={s.acceptTxt}>Qabul qilish</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.sm : Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },

  scroll: { flex: 1, backgroundColor: Colors.background },

  emptyCard: {
    margin: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 60,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  emptySub: {
    fontSize: 13,
    color: Colors.textHint,
    textAlign: 'center',
    lineHeight: 18,
  },

  card: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  inviteText: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  roleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
  },
  roleInfoTxt: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  metaTxt: { fontSize: 11, color: Colors.textHint },
  metaDot: { fontSize: 11, color: Colors.textHint, marginHorizontal: 2 },

  inviteMsg: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: '#FFFBEB',
    borderRadius: Radius.sm,
    fontSize: 12,
    fontStyle: 'italic',
    color: '#92400E',
  },

  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: Radius.md,
  },
  rejectBtn: {
    backgroundColor: '#FEE2E2',
  },
  acceptBtn: {
    backgroundColor: Colors.primary,
  },
  rejectTxt: { fontSize: 13, fontWeight: '700', color: Colors.error },
  acceptTxt: { fontSize: 13, fontWeight: '700', color: Colors.white },
});
