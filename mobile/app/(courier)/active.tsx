import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { Button } from '../../src/components/ui';
import { ordersApi } from '../../src/api/orders';
import { useSocket } from '../../src/hooks/useSocket';

export default function ActiveDeliveryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  const { data: activeOrders, isLoading } = useQuery({
    queryKey: ['courier-active'],
    queryFn: () => ordersApi.getMyCourierOrders('DELIVERING'),
    refetchInterval: 15000,
  });

  const activeOrder = activeOrders?.[0];

  const { sendCourierLocation } = useSocket('courier');

  // Start sending location when delivering
  useEffect(() => {
    if (!activeOrder) {
      locationWatchRef.current?.remove();
      return;
    }

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          sendCourierLocation(
            activeOrder.id,
            location.coords.latitude,
            location.coords.longitude,
          );
        },
      );
    })();

    return () => {
      locationWatchRef.current?.remove();
    };
  }, [activeOrder?.id]);

  const handleDeliver = async () => {
    if (!activeOrder) return;
    Alert.alert(
      'Yetkazildi',
      'Buyurtma muvaffaqiyatli yetkazilganini tasdiqlaysizmi?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'Ha, yetkazildi ✅',
          onPress: async () => {
            try {
              await ordersApi.deliverOrder(activeOrder.id);
              queryClient.invalidateQueries({ queryKey: ['courier-active'] });
              queryClient.invalidateQueries({ queryKey: ['courier-history'] });
              Alert.alert('🎉', 'Buyurtma yetkazildi!');
            } catch (err: any) {
              Alert.alert('Xato', err?.response?.data?.message ?? 'Xato');
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!activeOrder) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>🏍️ Faol yetkazib berish</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏍️</Text>
          <Text style={styles.emptyText}>Faol buyurtma yo'q</Text>
          <Text style={styles.emptySubtext}>Yaqin buyurtmalardan birini qabul qiling</Text>
          <Button
            title="Buyurtmalarni ko'rish"
            onPress={() => router.push('/(courier)/nearby')}
            variant="outline"
            fullWidth={false}
            style={{ marginTop: Spacing.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const deliveryLat = Number(activeOrder.delivery_lat);
  const deliveryLng = Number(activeOrder.delivery_lng);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🏍️ Yetkazib berish</Text>
        <Text style={styles.orderNum}>{activeOrder.order_number}</Text>
      </View>

      {/* Map showing delivery destination */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: deliveryLat,
            longitude: deliveryLng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
        >
          <Marker
            coordinate={{ latitude: deliveryLat, longitude: deliveryLng }}
            title="Yetkazib berish manzili"
          >
            <Text style={{ fontSize: 28 }}>📍</Text>
          </Marker>
        </MapView>
        <View style={styles.trackingBanner}>
          <Text style={styles.trackingText}>📡 Joylashuvingiz mijozga ko'rsatilmoqda</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Customer info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Mijoz</Text>
          <Text style={styles.info}>
            👤 {activeOrder.customer?.first_name} {activeOrder.customer?.last_name}
          </Text>
        </View>

        {/* Delivery address */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Yetkazib berish manzili</Text>
          <Text style={styles.address}>📍 {activeOrder.delivery_address}</Text>
          {activeOrder.delivery_details && (
            <Text style={styles.addressDetails}>
              ℹ️ {activeOrder.delivery_details}
            </Text>
          )}
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Mahsulotlar ({activeOrder.items?.length})</Text>
          {activeOrder.items?.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{item.product_name}</Text>
              <Text style={styles.itemQty}>× {item.quantity}</Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Jami to'lov</Text>
            <Text style={styles.totalValue}>{Number(activeOrder.total_price).toLocaleString()} so'm</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.payMethod}>To'lov usuli</Text>
            <Text style={[styles.payMethod, { fontWeight: '700' }]}>
              {activeOrder.payment_method === 'CASH' ? '💵 Naqd' : activeOrder.payment_method}
            </Text>
          </View>
        </View>

        {/* Confirm delivery */}
        <View style={styles.actions}>
          <Button
            title="✅ Yetkazib berdim"
            onPress={handleDeliver}
            size="lg"
          />
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { ...Typography.h4, color: Colors.white },
  orderNum: { ...Typography.caption, color: 'rgba(255,255,255,0.8)' },
  mapContainer: { height: 250, position: 'relative' },
  map: { flex: 1 },
  trackingBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(229,57,53,0.9)',
    padding: Spacing.sm,
    alignItems: 'center',
  },
  trackingText: { color: Colors.white, fontWeight: '600', fontSize: 12 },
  scroll: { flex: 1 },
  section: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
    gap: 4,
  },
  sectionLabel: { ...Typography.caption, color: Colors.textHint, textTransform: 'uppercase' },
  info: { ...Typography.body },
  address: { ...Typography.body },
  addressDetails: { ...Typography.bodySmall, color: Colors.textSecondary },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  itemName: { ...Typography.bodySmall, flex: 1 },
  itemQty: { ...Typography.bodySmall, color: Colors.textHint },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { ...Typography.title },
  totalValue: { ...Typography.price },
  payMethod: { ...Typography.bodySmall, color: Colors.textSecondary },
  actions: { padding: Spacing.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { ...Typography.h4, textAlign: 'center' },
  emptySubtext: { ...Typography.bodySmall, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.xs },
});
