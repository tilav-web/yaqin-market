import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { storesApi } from '../../src/api/stores';
import {
  staffApi,
  type StaffRole,
  type UserSearchResult,
  type StoreStaff,
} from '../../src/api/store-staff';
import { haptics } from '../../src/utils/haptics';

const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: 'Egasi',
  MANAGER: 'Boshqaruvchi',
  OPERATOR: 'Operator',
  PACKER: 'Yig\'uvchi',
  COURIER: 'Kuryer',
};

const ROLE_COLOR: Record<StaffRole, string> = {
  OWNER: '#7C3AED',
  MANAGER: '#2563EB',
  OPERATOR: '#0891B2',
  PACKER: '#059669',
  COURIER: '#EA580C',
};

const INVITABLE_ROLES: StaffRole[] = ['MANAGER', 'OPERATOR', 'PACKER', 'COURIER'];

export default function SellerStaffScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: myStores } = useQuery({
    queryKey: ['my-stores'],
    queryFn: storesApi.getMyStores,
  });
  const store = myStores?.[0];
  const storeId = store?.id ?? '';

  const { data: staff = [], isLoading: staffLoading } = useQuery<StoreStaff[]>({
    queryKey: ['store-staff', storeId],
    queryFn: () => staffApi.listStoreStaff(storeId),
    enabled: !!storeId,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ['store-invitations', storeId],
    queryFn: () => staffApi.listStoreInvitations(storeId),
    enabled: !!storeId,
  });

  const removeMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      staffApi.removeStaff(storeId, userId),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['store-staff', storeId] });
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Xato', err?.response?.data?.message ?? 'Xato');
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (id: string) => staffApi.cancelInvitation(id),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['store-invitations', storeId] });
    },
  });

  const askRemove = (s: StoreStaff) => {
    Alert.alert(
      'Xodimni chetlatish',
      `${s.user?.first_name ?? ''} ${s.user?.last_name ?? ''} endi do'kon xodimi bo'lmaydi. Davom etamizmi?`,
      [
        { text: 'Bekor', style: 'cancel' },
        {
          text: 'Chetlatish',
          style: 'destructive',
          onPress: () => removeMutation.mutate({ userId: s.user_id }),
        },
      ],
    );
  };

  if (!storeId) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Xodimlar</Text>
          <Text style={s.headerSub}>{store?.name}</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => {
            haptics.light();
            setInviteOpen(true);
          }}
        >
          <Ionicons name="person-add" size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Pending invitations */}
        {invitations.length > 0 && (
          <>
            <Text style={s.sectionTitle}>
              Kutilayotgan takliflar ({invitations.length})
            </Text>
            {invitations.map((inv: any) => (
              <View key={inv.id} style={[s.card, s.inviteCard]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>
                    {inv.invitee?.first_name ?? ''} {inv.invitee?.last_name ?? ''}
                  </Text>
                  <Text style={s.phone}>
                    +998 {inv.invitee?.auth?.phone ?? '—'}
                  </Text>
                  <View
                    style={[
                      s.rolePill,
                      { backgroundColor: ROLE_COLOR[inv.role as StaffRole] + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        s.roleTxt,
                        { color: ROLE_COLOR[inv.role as StaffRole] },
                      ]}
                    >
                      {ROLE_LABEL[inv.role as StaffRole]}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => cancelInviteMutation.mutate(inv.id)}
                >
                  <Ionicons name="close" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        <Text style={s.sectionTitle}>Hozirgi xodimlar ({staff.length})</Text>
        {staffLoading ? (
          <ActivityIndicator style={{ marginTop: 30 }} color={Colors.primary} />
        ) : staff.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="people-outline" size={40} color={Colors.textHint} />
            <Text style={s.emptyTitle}>Hali xodim yo'q</Text>
            <Text style={s.emptySub}>
              Yuqoridagi "+" tugmachasi orqali xodim qo'shing
            </Text>
          </View>
        ) : (
          staff.map((st: StoreStaff) => (
            <View key={st.id} style={s.card}>
              <View style={s.avatar}>
                <Text style={s.avatarTxt}>
                  {(st.user?.first_name?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>
                  {st.user?.first_name ?? ''} {st.user?.last_name ?? ''}
                </Text>
                <Text style={s.phone}>
                  +998 {st.user?.auth?.phone ?? '—'}
                </Text>
                <View
                  style={[
                    s.rolePill,
                    { backgroundColor: ROLE_COLOR[st.role] + '20' },
                  ]}
                >
                  <Text style={[s.roleTxt, { color: ROLE_COLOR[st.role] }]}>
                    {ROLE_LABEL[st.role]}
                  </Text>
                </View>
              </View>
              {st.role !== 'OWNER' && (
                <TouchableOpacity
                  style={s.removeBtn}
                  onPress={() => askRemove(st)}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        storeId={storeId}
      />
    </SafeAreaView>
  );
}

// ─── Invite Modal ───────────────────────────────────────────────────────────

function InviteModal({
  open,
  onClose,
  storeId,
}: {
  open: boolean;
  onClose: () => void;
  storeId: string;
}) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<UserSearchResult | null>(null);
  const [role, setRole] = useState<StaffRole>('OPERATOR');

  const { data: results = [], isFetching } = useQuery<UserSearchResult[]>({
    queryKey: ['user-search', storeId, query],
    queryFn: () => staffApi.searchUsers(query, storeId),
    enabled: open && query.trim().length >= 2,
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      staffApi.invite({
        store_id: storeId,
        invitee_id: selected!.id,
        role,
      }),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['store-invitations', storeId] });
      setQuery('');
      setSelected(null);
      setRole('OPERATOR');
      onClose();
      Alert.alert('Taklif yuborildi', 'Foydalanuvchi javobini kutmoqdamiz');
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Xato', err?.response?.data?.message ?? 'Xato');
    },
  });

  return (
    <Modal
      transparent
      visible={open}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={s.modalBackdrop} onPress={onClose}>
        <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Xodim qo'shish</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {!selected ? (
            <>
              <View style={s.searchWrap}>
                <Ionicons name="search" size={18} color={Colors.textHint} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Ism yoki raqam bilan qidirish..."
                  placeholderTextColor={Colors.textHint}
                  value={query}
                  onChangeText={setQuery}
                  autoFocus
                />
              </View>

              {query.trim().length < 2 ? (
                <View style={s.hintBox}>
                  <Ionicons name="information-circle-outline" size={20} color={Colors.textHint} />
                  <Text style={s.hintTxt}>
                    Kamida 2 ta harf yoki 3 ta raqam kiriting
                  </Text>
                </View>
              ) : isFetching ? (
                <ActivityIndicator style={{ marginTop: 20 }} color={Colors.primary} />
              ) : results.length === 0 ? (
                <View style={s.hintBox}>
                  <Text style={s.hintTxt}>Topilmadi</Text>
                </View>
              ) : (
                <FlatList
                  data={results}
                  keyExtractor={(u) => u.id}
                  style={{ maxHeight: 320 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={s.userRow}
                      onPress={() => {
                        haptics.select();
                        setSelected(item);
                      }}
                    >
                      <View style={s.avatar}>
                        <Text style={s.avatarTxt}>
                          {(item.first_name?.[0] ?? '?').toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.name}>
                          {item.first_name} {item.last_name}
                        </Text>
                        <Text style={s.phone}>
                          +998 {item.auth?.phone ?? '—'}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={Colors.textHint}
                      />
                    </TouchableOpacity>
                  )}
                />
              )}
            </>
          ) : (
            <>
              <View style={s.selectedCard}>
                <View style={s.avatar}>
                  <Text style={s.avatarTxt}>
                    {(selected.first_name?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>
                    {selected.first_name} {selected.last_name}
                  </Text>
                  <Text style={s.phone}>
                    +998 {selected.auth?.phone ?? '—'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Ionicons name="close" size={20} color={Colors.textHint} />
                </TouchableOpacity>
              </View>

              <Text style={s.label}>Rol tanlang</Text>
              <View style={s.roleGrid}>
                {INVITABLE_ROLES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      s.roleCard,
                      role === r && { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
                    ]}
                    onPress={() => {
                      haptics.select();
                      setRole(r);
                    }}
                  >
                    <View
                      style={[
                        s.roleIconBox,
                        { backgroundColor: ROLE_COLOR[r] + '20' },
                      ]}
                    >
                      <Ionicons
                        name={
                          r === 'MANAGER'
                            ? 'briefcase'
                            : r === 'OPERATOR'
                              ? 'headset'
                              : r === 'PACKER'
                                ? 'cube'
                                : 'bicycle'
                        }
                        size={18}
                        color={ROLE_COLOR[r]}
                      />
                    </View>
                    <Text style={s.roleCardLabel}>{ROLE_LABEL[r]}</Text>
                    <Text style={s.roleCardSub}>{ROLE_DESC[r]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  s.submitBtn,
                  inviteMutation.isPending && { opacity: 0.6 },
                ]}
                onPress={() => inviteMutation.mutate()}
                disabled={inviteMutation.isPending}
              >
                {inviteMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color={Colors.white} />
                    <Text style={s.submitBtnTxt}>Taklif yuborish</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const ROLE_DESC: Record<StaffRole, string> = {
  OWNER: 'Do\'kon egasi',
  MANAGER: 'To\'liq boshqaruv',
  OPERATOR: 'Buyurtmalarni qabul qilish',
  PACKER: 'Order yig\'ish',
  COURIER: 'Yetkazib berish',
};

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
  addBtn: {
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
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textHint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  inviteCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  phone: { fontSize: 12, color: Colors.textHint, marginTop: 2 },

  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  roleTxt: { fontSize: 11, fontWeight: '700' },

  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: {
    margin: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 12, color: Colors.textHint, textAlign: 'center' },

  // ── Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.md,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    height: 44,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },

  hintBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
  },
  hintTxt: { fontSize: 12, color: Colors.textHint, flex: 1 },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },

  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  roleCard: {
    width: '47.5%',
    padding: Spacing.sm,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    borderRadius: Radius.md,
    gap: 4,
  },
  roleIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  roleCardLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  roleCardSub: { fontSize: 11, color: Colors.textHint },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  submitBtnTxt: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
