import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { Button } from '../../src/components/ui';
import { useCartStore } from '../../src/store/cart.store';
import { useLocationStore } from '../../src/store/location.store';
import { ordersApi } from '../../src/api/orders';

export default function BroadcastCartScreen() {
  const router = useRouter();
  const { broadcastItems, removeBroadcastItem, updateBroadcastQuantity, clearBroadcastCart } = useCartStore();
  const { lat, lng, address } = useLocationStore();
  const [loading, setLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState(address ?? '');

  const handleSubmit = async () => {
    if (broadcastItems.length === 0) {
      Alert.alert('Xato', 'Savatcha bo\'sh');
      return;
    }
    if (!lat || !lng) {
      Alert.alert('Xato', 'Joylashuvingiz aniqlanmagan');
      return;
    }
    if (!deliveryAddress.trim()) {
      Alert.alert('Xato', 'Yetkazib berish manzilini kiriting');
      return;
    }

    setLoading(true);
    try {
      const request = await ordersApi.createBroadcastRequest({
        title: 'Yangi buyurtma',
        delivery_lat: lat,
        delivery_lng: lng,
        delivery_address: deliveryAddress,
        items: broadcastItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        radius_km: 10,
        expires_in_minutes: 120,
      });

      clearBroadcastCart();
      router.replace({
        pathname: '/(customer)/broadcast-request/[id]',
        params: { id: request.id },
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Xato yuz berdi';
      Alert.alert('Xato', Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  if (broadcastItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← Orqaga</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📢 Umumiy buyurtma</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Savatcha bo'sh</Text>
          <Text style={styles.emptySubtitle}>
            Mahsulotlar qo'shing va barcha yaqin do'konlarga yuboring
          </Text>
          <Button
            title="Mahsulotlar qidirish"
            onPress={() => router.push('/(customer)/search')}
            variant="outline"
            style={{ marginTop: Spacing.md }}
            fullWidth={false}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Orqaga</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📢 Umumiy buyurtma</Text>
      </View>

      <FlatList
        data={broadcastItems}
        keyExtractor={(item) => String(item.product_id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>ℹ️ Qanday ishlaydi?</Text>
            <Text style={styles.infoText}>
              Bu buyurtma yaqin atrofdagi barcha do'konlarga yuboriladi. Do'konlar
              narx taklif qiladi. Siz eng yaxshi taklifni tanlaysiz.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.addressLabel}>Yetkazib berish manzili</Text>
            <TextInput
              style={styles.addressInput}
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="Manzilni kiriting..."
              placeholderTextColor={Colors.textHint}
              multiline
            />
            <Button
              title={`Yuborish (${broadcastItems.length} ta mahsulot)`}
              onPress={handleSubmit}
              loading={loading}
              size="lg"
            />
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.product_name}</Text>
            </View>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => updateBroadcastQuantity(item.product_id, item.quantity - 1)}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qty}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => updateBroadcastQuantity(item.product_id, item.quantity + 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeBroadcastItem(item.product_id)}
              >
                <Text style={styles.removeBtnText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  infoBox: {
    backgroundColor: Colors.infoSurface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  infoTitle: { ...Typography.bodySmall, fontWeight: '700', color: Colors.info, marginBottom: 4 },
  infoText: { ...Typography.caption, color: Colors.info, lineHeight: 18 },
  itemCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { ...Typography.bodySmall, fontWeight: '500' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: Colors.primary, fontSize: 18, fontWeight: '700' },
  qty: { ...Typography.title, minWidth: 24, textAlign: 'center' },
  removeBtn: { marginLeft: Spacing.xs },
  removeBtnText: { fontSize: 18 },
  footer: {
    gap: Spacing.md,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addressLabel: { ...Typography.bodySmall, fontWeight: '600' },
  addressInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Typography.body,
    minHeight: 60,
    textAlignVertical: 'top',
    color: Colors.textPrimary,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.h4, marginBottom: Spacing.xs },
  emptySubtitle: { ...Typography.bodySmall, textAlign: 'center', color: Colors.textSecondary },
});
