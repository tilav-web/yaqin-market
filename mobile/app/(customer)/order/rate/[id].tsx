import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../../../src/theme';
import { ordersApi } from '../../../../src/api/orders';
import { reviewsApi, type ProductRating } from '../../../../src/api/reviews';
import { haptics } from '../../../../src/utils/haptics';

type ProductItem = {
  id: string;
  product_id: number;
  product_name: string;
  product_image?: string;
  quantity: number;
};

type ExistingReview = {
  id: string;
  target: 'PRODUCT' | 'COURIER' | 'STORE';
  rating: number;
  comment: string | null;
  product_id: number | null;
  courier_id: string | null;
};

export default function RateOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id),
  });

  const { data: existing = [] } = useQuery<ExistingReview[]>({
    queryKey: ['order-reviews', id],
    queryFn: () => reviewsApi.getByOrder(id),
    enabled: !!id,
  });

  // Mavjud sharhlar: product_id -> rating map
  const existingProducts = useMemo(() => {
    const map: Record<number, ExistingReview> = {};
    existing.forEach((e) => {
      if (e.target === 'PRODUCT' && e.product_id != null) {
        map[Number(e.product_id)] = e;
      }
    });
    return map;
  }, [existing]);

  const existingCourier = useMemo(
    () => existing.find((e) => e.target === 'COURIER'),
    [existing],
  );

  const [productRatings, setProductRatings] = useState<
    Record<number, { rating: number; comment: string }>
  >({});
  const [courierRating, setCourierRating] = useState(0);
  const [courierComment, setCourierComment] = useState('');

  const uniqueItems = useMemo(() => {
    if (!order?.items) return [] as ProductItem[];
    const seen = new Set<number>();
    const out: ProductItem[] = [];
    for (const item of order.items as ProductItem[]) {
      const pid = Number(item.product_id);
      if (seen.has(pid) || existingProducts[pid]) continue;
      seen.add(pid);
      out.push(item);
    }
    return out;
  }, [order?.items, existingProducts]);

  const hasCourier = !!order?.courier_id && !existingCourier;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const products: ProductRating[] = Object.entries(productRatings)
        .filter(([, v]) => v.rating > 0)
        .map(([pid, v]) => ({
          product_id: Number(pid),
          rating: v.rating,
          comment: v.comment.trim() || undefined,
        }));

      const courier =
        hasCourier && courierRating > 0
          ? {
              rating: courierRating,
              comment: courierComment.trim() || undefined,
            }
          : undefined;

      if (products.length === 0 && !courier) {
        throw new Error('Hech bo\'lmaganda bitta bahoni tanlang');
      }

      return reviewsApi.createForOrder({
        order_id: id,
        products: products.length > 0 ? products : undefined,
        courier,
      });
    },
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ['order-reviews', id] });
      queryClient.invalidateQueries({ queryKey: ['my-reviews'] });
      Alert.alert('Rahmat!', 'Sizning sharhingiz saqlandi.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      haptics.error();
      Alert.alert('Xato', err?.response?.data?.message ?? err.message ?? 'Xato');
    },
  });

  const setProductStar = (pid: number, star: number) => {
    haptics.select();
    setProductRatings((prev) => ({
      ...prev,
      [pid]: {
        rating: prev[pid]?.rating === star ? 0 : star,
        comment: prev[pid]?.comment ?? '',
      },
    }));
  };

  const setProductComment = (pid: number, text: string) => {
    setProductRatings((prev) => ({
      ...prev,
      [pid]: {
        rating: prev[pid]?.rating ?? 0,
        comment: text,
      },
    }));
  };

  const setCourierStar = (star: number) => {
    haptics.select();
    setCourierRating((r) => (r === star ? 0 : star));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />
      </SafeAreaView>
    );
  }
  if (!order) return null;

  const nothingToReview = uniqueItems.length === 0 && !hasCourier;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Baholash</Text>
          <Text style={s.headerSub}>{order.order_number}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={{ paddingBottom: Spacing.xl * 2 }}
          showsVerticalScrollIndicator={false}
        >
          {nothingToReview ? (
            <View style={s.emptyCard}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              <Text style={s.emptyTitle}>Bu buyurtma allaqachon baholangan</Text>
              <Text style={s.emptySub}>Sizning sharhingiz uchun rahmat</Text>
            </View>
          ) : (
            <>
              {uniqueItems.length > 0 && (
                <>
                  <Text style={s.sectionTitle}>Mahsulotlar</Text>
                  {uniqueItems.map((item) => {
                    const state = productRatings[Number(item.product_id)];
                    const star = state?.rating ?? 0;
                    return (
                      <View key={item.id} style={s.card}>
                        <View style={s.prodRow}>
                          <View style={s.prodImgWrap}>
                            {item.product_image ? (
                              // eslint-disable-next-line @typescript-eslint/no-require-imports
                              <View style={s.prodImgStub}>
                                <Ionicons
                                  name="cube-outline"
                                  size={22}
                                  color={Colors.primary}
                                />
                              </View>
                            ) : (
                              <View style={s.prodImgStub}>
                                <Ionicons
                                  name="cube-outline"
                                  size={22}
                                  color={Colors.primary}
                                />
                              </View>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.prodName} numberOfLines={2}>
                              {item.product_name}
                            </Text>
                            <Text style={s.prodQty}>{item.quantity} ta</Text>
                          </View>
                        </View>

                        <StarRow
                          value={star}
                          onChange={(v) => setProductStar(Number(item.product_id), v)}
                        />

                        {star > 0 && (
                          <TextInput
                            style={s.commentInput}
                            placeholder="Sharhingiz (ixtiyoriy)"
                            placeholderTextColor={Colors.textHint}
                            value={state?.comment ?? ''}
                            onChangeText={(t) =>
                              setProductComment(Number(item.product_id), t)
                            }
                            multiline
                            maxLength={300}
                          />
                        )}
                      </View>
                    );
                  })}
                </>
              )}

              {hasCourier && (
                <>
                  <Text style={[s.sectionTitle, { marginTop: Spacing.md }]}>
                    Kuryer
                  </Text>
                  <View style={s.card}>
                    <View style={s.prodRow}>
                      <View
                        style={[
                          s.prodImgStub,
                          { backgroundColor: '#FFF3E0' },
                        ]}
                      >
                        <Ionicons
                          name="bicycle"
                          size={22}
                          color="#FF5722"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.prodName}>
                          {order.courier?.first_name ?? ''}{' '}
                          {order.courier?.last_name ?? ''}
                        </Text>
                        <Text style={s.prodQty}>
                          Yetkazib beruvchi
                        </Text>
                      </View>
                    </View>

                    <StarRow value={courierRating} onChange={setCourierStar} />

                    {courierRating > 0 && (
                      <TextInput
                        style={s.commentInput}
                        placeholder="Kuryer haqida izoh (ixtiyoriy)"
                        placeholderTextColor={Colors.textHint}
                        value={courierComment}
                        onChangeText={setCourierComment}
                        multiline
                        maxLength={300}
                      />
                    )}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>

        {!nothingToReview && (
          <View style={s.footer}>
            <TouchableOpacity
              style={[
                s.submitBtn,
                submitMutation.isPending && { opacity: 0.6 },
              ]}
              onPress={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              activeOpacity={0.85}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="star" size={17} color={Colors.white} />
                  <Text style={s.submitBtnTxt}>Yuborish</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StarRow({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => onChange(n)}
          activeOpacity={0.7}
          style={s.starBtn}
        >
          <Ionicons
            name={n <= value ? 'star' : 'star-outline'}
            size={34}
            color={n <= value ? '#F59E0B' : Colors.textHint}
          />
        </TouchableOpacity>
      ))}
    </View>
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
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
    gap: Spacing.sm,
  },
  prodRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  prodImgWrap: { width: 48, height: 48 },
  prodImgStub: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  prodQty: { fontSize: 12, color: Colors.textHint, marginTop: 2 },

  starRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.xs,
  },
  starBtn: { padding: 4 },

  commentInput: {
    minHeight: 60,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 13,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },

  emptyCard: {
    margin: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySub: { fontSize: 12, color: Colors.textHint },

  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
  },
  submitBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
