import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { Button } from '../../src/components/ui';
import { useCartStore } from '../../src/store/cart.store';
import { useLocationStore } from '../../src/store/location.store';
import { ordersApi } from '../../src/api/orders';

export default function CartScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'direct' | 'broadcast'>('direct');
  const [loading, setLoading] = useState(false);
  const { lat, lng, address } = useLocationStore();
  const {
    directItems,
    directStoreName,
    broadcastItems,
    removeDirectItem,
    updateDirectQuantity,
    clearDirectCart,
    removeBroadcastItem,
    updateBroadcastQuantity,
  } = useCartStore();

  const directTotal = directItems.reduce(
    (sum, item) => sum + item.price * item.quantity, 0,
  );

  const handleDirectOrder = async () => {
    if (directItems.length === 0) return;
    if (!lat || !lng) {
      Alert.alert('Xato', 'Joylashuvingiz aniqlanmagan');
      return;
    }
    setLoading(true);
    try {
      const order = await ordersApi.create({
        order_type: 'DIRECT',
        store_id: directItems[0].store_id,
        items: directItems.map((item) => ({
          store_product_id: item.store_product_id,
          quantity: item.quantity,
        })),
        delivery_lat: lat,
        delivery_lng: lng,
        delivery_address: address ?? 'Manzil kiritilmadi',
        payment_method: 'CASH',
      });
      clearDirectCart();
      router.push({ pathname: '/(customer)/order/[id]', params: { id: order.id } });
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.message ?? 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Savatcha 🛒</Text>
        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'direct' && styles.tabActive]}
            onPress={() => setActiveTab('direct')}
          >
            <Text style={[styles.tabText, activeTab === 'direct' && styles.tabTextActive]}>
              🏪 Do'kon ({directItems.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'broadcast' && styles.tabActive]}
            onPress={() => setActiveTab('broadcast')}
          >
            <Text style={[styles.tabText, activeTab === 'broadcast' && styles.tabTextActive]}>
              📢 Umumiy ({broadcastItems.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'direct' ? (
        <ScrollView style={styles.scroll}>
          {directItems.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏪</Text>
              <Text style={styles.emptyText}>Do'kon savatchasi bo'sh</Text>
            </View>
          ) : (
            <View style={styles.cartContent}>
              <Text style={styles.storeName}>🏪 {directStoreName}</Text>
              {directItems.map((item) => (
                <View key={item.store_product_id} style={styles.itemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.product_name}</Text>
                    <Text style={styles.itemPrice}>
                      {Number(item.price).toLocaleString()} so'm
                    </Text>
                  </View>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateDirectQuantity(item.store_product_id, item.quantity - 1)}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qty}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateDirectQuantity(item.store_product_id, item.quantity + 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <View style={styles.summary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Jami</Text>
                  <Text style={styles.summaryValue}>
                    {directTotal.toLocaleString()} so'm
                  </Text>
                </View>
                <Button
                  title="Buyurtma berish"
                  onPress={handleDirectOrder}
                  loading={loading}
                  size="lg"
                />
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.broadcastSection}>
          <Text style={styles.broadcastInfo}>
            Umumiy savatcha mahsulotlarini "Umumiy buyurtma" sifatida barcha yaqin do'konlarga yuboring
          </Text>
          <Button
            title={`Umumiy buyurtma berish (${broadcastItems.length} ta)`}
            onPress={() => router.push('/(customer)/broadcast-cart')}
            disabled={broadcastItems.length === 0}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: Spacing.md, gap: Spacing.sm },
  title: { ...Typography.h4, color: Colors.white },
  tabs: { flexDirection: 'row', gap: Spacing.xs },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: Colors.white },
  tabText: { ...Typography.caption, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  tabTextActive: { color: Colors.primary },
  scroll: { flex: 1 },
  cartContent: { padding: Spacing.md, gap: Spacing.sm },
  storeName: { ...Typography.title, color: Colors.textSecondary },
  itemCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Shadow.sm,
  },
  itemInfo: { flex: 1 },
  itemName: { ...Typography.bodySmall, fontWeight: '500' },
  itemPrice: { ...Typography.caption, color: Colors.primary, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: Colors.primary, fontSize: 18, fontWeight: '700', lineHeight: 20 },
  qty: { ...Typography.title, minWidth: 24, textAlign: 'center' },
  summary: {
    gap: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { ...Typography.title },
  summaryValue: { ...Typography.price },
  broadcastSection: { flex: 1, padding: Spacing.lg, gap: Spacing.md },
  broadcastInfo: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
});
