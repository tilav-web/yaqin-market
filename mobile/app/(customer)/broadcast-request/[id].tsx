import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../../src/theme';
import { Button } from '../../../src/components/ui';
import { Badge } from '../../../src/components/ui/Badge';
import { ordersApi } from '../../../src/api/orders';
import { useSocket } from '../../../src/hooks/useSocket';

export default function BroadcastRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: request, isLoading } = useQuery({
    queryKey: ['broadcast-request', id],
    queryFn: () => ordersApi.getBroadcastRequestById(id),
  });

  const { data: offers, isLoading: loadingOffers } = useQuery({
    queryKey: ['broadcast-offers', id],
    queryFn: () => ordersApi.getBroadcastOffers(id),
    enabled: request?.status === 'OPEN',
    refetchInterval: request?.status === 'OPEN' ? 10000 : false,
  });

  useSocket('customer', (event, data) => {
    if (event === 'broadcast:offer_updated' && data?.requestId === id) {
      queryClient.invalidateQueries({ queryKey: ['broadcast-offers', id] });
      queryClient.invalidateQueries({ queryKey: ['broadcast-request', id] });
    }
  });

  const handleSelectOffer = async (offerId: string, isFullOffer: boolean) => {
    if (!isFullOffer) {
      Alert.alert(
        'Qisman yetkazib berish',
        'Bu do\'kon barcha mahsulotni emas, bir qismini yetkazib beradi. Qolgan mahsulotlar uchun yangi buyurtma yaratiladimi?',
        [
          { text: 'Bekor qilish', style: 'cancel' },
          {
            text: 'Ha, yangi buyurtma yarating',
            onPress: () => confirmSelect(offerId),
          },
        ],
      );
    } else {
      confirmSelect(offerId);
    }
  };

  const confirmSelect = async (offerId: string) => {
    try {
      const result = await ordersApi.selectBroadcastOffer(id, offerId);
      queryClient.invalidateQueries({ queryKey: ['broadcast-request', id] });
      Alert.alert('Muvaffaqiyat!', 'Buyurtma qabul qilindi', [
        {
          text: 'Buyurtmani ko\'rish',
          onPress: () =>
            router.replace({
              pathname: '/(customer)/order/[id]',
              params: { id: result.id },
            }),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.message ?? 'Xato yuz berdi');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Orqaga</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📢 Buyurtma holati</Text>
      </View>

      <FlatList
        data={offers ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            {/* Request Status */}
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={styles.statusTitle}>Holat</Text>
                <Badge
                  label={request?.status === 'OPEN' ? '🟢 Ochiq' : '🔴 Yopiq'}
                  color={request?.status === 'OPEN' ? Colors.success : Colors.textSecondary}
                  bg={request?.status === 'OPEN' ? Colors.successSurface : Colors.background}
                />
              </View>
              <Text style={styles.itemsLabel}>Buyurtma qilingan mahsulotlar:</Text>
              {request?.items?.map((item: any) => (
                <Text key={item.id} style={styles.requestItem}>
                  • {item.product_name} — {item.quantity} ta
                </Text>
              ))}
            </View>

            {(offers?.length ?? 0) === 0 && request?.status === 'OPEN' && (
              <View style={styles.waitingBox}>
                <Text style={styles.waitingIcon}>⏳</Text>
                <Text style={styles.waitingText}>Do'konlar taklif kutilmoqda...</Text>
                <Text style={styles.waitingSubtext}>Yaqin do'konlar sizning buyurtmangizni ko'rib chiqmoqda</Text>
              </View>
            )}

            {(offers?.length ?? 0) > 0 && (
              <Text style={styles.offersTitle}>
                Takliflar ({offers?.length})
              </Text>
            )}
          </View>
        }
        renderItem={({ item: offer }) => {
          const requestItemCount = request?.items?.length ?? 0;
          const offerItemCount = offer.items?.length ?? 0;
          const isFullOffer = offerItemCount >= requestItemCount;

          return (
            <View style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <Text style={styles.storeName}>{offer.store?.name}</Text>
                {offer.store?.is_prime && (
                  <Badge label="⭐ Premium" color="#F57F17" bg="#FFF8E1" />
                )}
              </View>

              {!isFullOffer && (
                <View style={styles.partialWarn}>
                  <Text style={styles.partialWarnText}>
                    ⚠️ Bu do'kon {offerItemCount}/{requestItemCount} ta mahsulotni yetkazib bera oladi
                  </Text>
                </View>
              )}

              <View style={styles.offerItems}>
                {offer.items?.map((item: any) => (
                  <View key={item.id} style={styles.offerItem}>
                    <Text style={styles.offerItemName}>{item.product_name}</Text>
                    <Text style={styles.offerItemPrice}>
                      {Number(item.unit_price).toLocaleString()} so'm
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.offerFooter}>
                <View>
                  <Text style={styles.deliveryLabel}>
                    🚗 {offer.delivery_price > 0
                      ? `${Number(offer.delivery_price).toLocaleString()} so'm`
                      : 'Yetkazib berish bepul'}
                  </Text>
                  <Text style={styles.deliveryTime}>
                    ⏱️ ~{offer.estimated_minutes} daqiqa
                  </Text>
                </View>
                <View style={styles.totalBlock}>
                  <Text style={styles.totalLabel}>Jami</Text>
                  <Text style={styles.totalPrice}>
                    {Number(offer.total_price).toLocaleString()} so'm
                  </Text>
                </View>
              </View>

              {offer.message && (
                <Text style={styles.message}>💬 "{offer.message}"</Text>
              )}

              <Button
                title="Bu taklifni qabul qilish"
                onPress={() => handleSelectOffer(offer.id, isFullOffer)}
                variant="primary"
                size="sm"
                style={styles.selectBtn}
              />
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backText: { color: Colors.white, ...Typography.body },
  headerTitle: { ...Typography.title, color: Colors.white, flex: 1 },
  list: { padding: Spacing.md, gap: Spacing.sm },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusTitle: { ...Typography.title },
  itemsLabel: { ...Typography.caption, color: Colors.textHint, marginTop: Spacing.xs },
  requestItem: { ...Typography.bodySmall, color: Colors.textSecondary },
  waitingBox: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  waitingIcon: { fontSize: 40 },
  waitingText: { ...Typography.title, textAlign: 'center' },
  waitingSubtext: { ...Typography.bodySmall, color: Colors.textSecondary, textAlign: 'center' },
  offersTitle: { ...Typography.h4, marginBottom: Spacing.xs },
  offerCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
    gap: Spacing.sm,
  },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storeName: { ...Typography.title },
  partialWarn: {
    backgroundColor: Colors.warningSurface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  partialWarnText: { ...Typography.caption, color: Colors.warning, fontWeight: '600' },
  offerItems: { gap: 4 },
  offerItem: { flexDirection: 'row', justifyContent: 'space-between' },
  offerItemName: { ...Typography.bodySmall, color: Colors.textSecondary, flex: 1 },
  offerItemPrice: { ...Typography.bodySmall, fontWeight: '600' },
  offerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  deliveryLabel: { ...Typography.caption, color: Colors.textSecondary },
  deliveryTime: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  totalBlock: { alignItems: 'flex-end' },
  totalLabel: { ...Typography.caption, color: Colors.textHint },
  totalPrice: { ...Typography.price },
  message: { ...Typography.caption, color: Colors.textSecondary, fontStyle: 'italic' },
  selectBtn: { marginTop: Spacing.xs },
});
