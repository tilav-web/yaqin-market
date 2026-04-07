import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../../src/theme';
import { Button } from '../../../src/components/ui';
import { StatusBadge } from '../../../src/components/ui/Badge';
import { ordersApi } from '../../../src/api/orders';

export default function SellerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id),
  });

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (!order?.items) return;
    setSelectedItems(new Set(order.items.map((i: any) => i.id)));
  };

  const handleAcceptAll = async () => {
    setLoading(true);
    try {
      await ordersApi.acceptOrder(id);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });
      Alert.alert('✅', 'Buyurtma qabul qilindi');
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.message ?? 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSelected = async () => {
    if (selectedItems.size === 0) {
      Alert.alert('Xato', 'Kamida bitta mahsulot tanlang');
      return;
    }
    setLoading(true);
    try {
      const result = await ordersApi.acceptOrderItems(id, Array.from(selectedItems));
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['store-orders'] });

      if (result.has_rejected_items) {
        Alert.alert(
          '⚠️ Qisman qabul',
          `${result.rejected_items?.length} ta mahsulot qabul qilinmadi. Mijozga xabar yuborildi.`,
        );
      } else {
        Alert.alert('✅', 'Barcha tanlangan mahsulotlar qabul qilindi');
      }
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.message ?? 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleReady = async () => {
    setLoading(true);
    try {
      await ordersApi.readyOrder(id);
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      Alert.alert('🎉', 'Buyurtma tayyor deb belgilandi');
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.message ?? 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />
      </SafeAreaView>
    );
  }
  if (!order) return null;

  const isPending = order.status === 'PENDING';
  const isAccepted = order.status === 'ACCEPTED';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{order.order_number}</Text>
        <StatusBadge status={order.status} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Customer */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Mijoz</Text>
          <Text style={styles.customerName}>
            👤 {order.customer?.first_name} {order.customer?.last_name}
          </Text>
          <Text style={styles.orderType}>
            {order.order_type === 'BROADCAST' ? '📢 Umumiy buyurtma' : '🏪 To\'g\'ridan buyurtma'}
          </Text>
        </View>

        {/* Items — with selection for partial accept */}
        <View style={styles.section}>
          <View style={styles.itemsHeader}>
            <Text style={styles.sectionLabel}>Mahsulotlar</Text>
            {isPending && (
              <TouchableOpacity onPress={selectAll}>
                <Text style={styles.selectAllText}>Barchasini tanlash</Text>
              </TouchableOpacity>
            )}
          </View>

          {order.items?.map((item: any) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.itemRow,
                isPending && selectedItems.has(item.id) && styles.itemSelected,
              ]}
              onPress={() => isPending && toggleItem(item.id)}
              activeOpacity={isPending ? 0.7 : 1}
            >
              {isPending && (
                <View style={[styles.checkbox, selectedItems.has(item.id) && styles.checkboxChecked]}>
                  {selectedItems.has(item.id) && <Text style={styles.checkmark}>✓</Text>}
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.itemQty}>{item.quantity} ta × {Number(item.price).toLocaleString()} so'm</Text>
              </View>
              <Text style={styles.itemTotal}>{Number(item.total_price).toLocaleString()} so'm</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Jami</Text>
            <Text style={styles.priceValue}>{Number(order.total_price).toLocaleString()} so'm</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>To'lov usuli</Text>
            <Text style={styles.priceValue}>{order.payment_method}</Text>
          </View>
        </View>

        {/* Address */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Yetkazib berish manzili</Text>
          <Text style={styles.address}>📍 {order.delivery_address}</Text>
        </View>

        {/* Actions */}
        {isPending && (
          <View style={styles.actions}>
            <Button
              title="Hammasini qabul qilish ✅"
              onPress={handleAcceptAll}
              loading={loading}
              size="md"
            />
            {selectedItems.size > 0 && selectedItems.size < (order.items?.length ?? 0) && (
              <Button
                title={`Faqat tanlanganlarni qabul (${selectedItems.size})`}
                onPress={handleAcceptSelected}
                loading={loading}
                variant="outline"
                size="md"
              />
            )}
            <Button
              title="Rad etish"
              onPress={() =>
                Alert.alert('Rad etish', 'Sababini kiriting', [
                  { text: 'Bekor qilish', style: 'cancel' },
                  {
                    text: 'Rad et',
                    style: 'destructive',
                    onPress: async () => {
                      await ordersApi.cancelOrder(id, 'Sotuvchi tomonidan rad etildi');
                      queryClient.invalidateQueries({ queryKey: ['order', id] });
                      router.back();
                    },
                  },
                ])
              }
              variant="danger"
              size="md"
            />
          </View>
        )}

        {isAccepted && (
          <View style={styles.actions}>
            <Button
              title="Tayyor deb belgilash 🎉"
              onPress={handleReady}
              loading={loading}
              size="md"
            />
          </View>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  back: { color: Colors.white, fontSize: 24, fontWeight: '600' },
  headerTitle: { ...Typography.title, color: Colors.white, flex: 1 },
  scroll: { flex: 1 },
  section: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  sectionLabel: {
    ...Typography.caption,
    color: Colors.textHint,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  customerName: { ...Typography.body, fontWeight: '500' },
  orderType: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
  itemsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  selectAllText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
    borderRadius: Radius.sm,
  },
  itemSelected: { backgroundColor: Colors.primarySurface },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  checkmark: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  itemInfo: { flex: 1 },
  itemName: { ...Typography.bodySmall, fontWeight: '500' },
  itemQty: { ...Typography.caption, color: Colors.textHint, marginTop: 2 },
  itemTotal: { ...Typography.bodySmall, fontWeight: '600', color: Colors.primary },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  priceLabel: { ...Typography.bodySmall, color: Colors.textSecondary },
  priceValue: { ...Typography.bodySmall, fontWeight: '600' },
  address: { ...Typography.bodySmall },
  actions: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
});
