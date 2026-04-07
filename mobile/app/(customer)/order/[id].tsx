import React, { useEffect, useState } from 'react';
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
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../../src/theme';
import { StatusBadge } from '../../../src/components/ui/Badge';
import { ordersApi } from '../../../src/api/orders';
import { useSocket } from '../../../src/hooks/useSocket';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.getById(id),
    refetchInterval: order?.status === 'DELIVERING' ? 15000 : false,
  });

  const { subscribeToOrder } = useSocket('customer', (event, data) => {
    if (data?.order_id === id) {
      if (event === 'order:status-changed') {
        queryClient.invalidateQueries({ queryKey: ['order', id] });
        queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      }
      if (event === 'courier:location-changed') {
        setCourierLocation({ lat: data.lat, lng: data.lng });
      }
    }
  });

  useEffect(() => {
    if (id) subscribeToOrder(id);
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!order) return null;

  const showMap = order.status === 'DELIVERING' && courierLocation;
  const deliveryLat = Number(order.delivery_lat);
  const deliveryLng = Number(order.delivery_lng);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{order.order_number}</Text>
        <StatusBadge status={order.status} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Courier Map */}
        {showMap && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={{
                latitude: (courierLocation.lat + deliveryLat) / 2,
                longitude: (courierLocation.lng + deliveryLng) / 2,
                latitudeDelta: Math.abs(courierLocation.lat - deliveryLat) * 2 + 0.01,
                longitudeDelta: Math.abs(courierLocation.lng - deliveryLng) * 2 + 0.01,
              }}
            >
              <Marker
                coordinate={{ latitude: courierLocation.lat, longitude: courierLocation.lng }}
                title="Kuryer"
                description="Kuryer hozirgi joylashuvi"
              >
                <Text style={{ fontSize: 28 }}>🏍️</Text>
              </Marker>
              <Marker
                coordinate={{ latitude: deliveryLat, longitude: deliveryLng }}
                title="Yetkazib berish manzili"
              >
                <Text style={{ fontSize: 28 }}>📍</Text>
              </Marker>
              <Polyline
                coordinates={[
                  { latitude: courierLocation.lat, longitude: courierLocation.lng },
                  { latitude: deliveryLat, longitude: deliveryLng },
                ]}
                strokeColor={Colors.primary}
                strokeWidth={3}
                lineDashPattern={[10, 5]}
              />
            </MapView>
            <View style={styles.mapBanner}>
              <Text style={styles.mapBannerText}>🏍️ Kuryer yo'lda kelmoqda...</Text>
            </View>
          </View>
        )}

        {/* Store Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Do'kon</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🏪</Text>
            <Text style={styles.infoText}>{order.store?.name}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Mahsulotlar</Text>
          {order.items?.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.itemQty}>{item.quantity} x {Number(item.price).toLocaleString()} so'm</Text>
              </View>
              <Text style={styles.itemTotal}>{Number(item.total_price).toLocaleString()} so'm</Text>
            </View>
          ))}
        </View>

        {/* Price Summary */}
        <View style={styles.section}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Mahsulotlar</Text>
            <Text style={styles.priceValue}>{Number(order.items_price).toLocaleString()} so'm</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Yetkazib berish</Text>
            <Text style={styles.priceValue}>{Number(order.delivery_price).toLocaleString()} so'm</Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Jami</Text>
            <Text style={styles.totalValue}>{Number(order.total_price).toLocaleString()} so'm</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Yetkazib berish manzili</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <Text style={styles.infoText}>{order.delivery_address}</Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  back: { padding: 4 },
  backText: { color: Colors.white, fontSize: 24, fontWeight: '600' },
  headerTitle: { ...Typography.title, color: Colors.white, flex: 1 },
  scroll: { flex: 1 },
  mapContainer: {
    height: 220,
    margin: Spacing.md,
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.md,
  },
  map: { flex: 1 },
  mapBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: Spacing.sm,
    alignItems: 'center',
  },
  mapBannerText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
  section: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  sectionLabel: { ...Typography.caption, color: Colors.textHint, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  infoIcon: { fontSize: 18 },
  infoText: { ...Typography.body, flex: 1 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  itemLeft: { flex: 1 },
  itemName: { ...Typography.bodySmall, fontWeight: '500' },
  itemQty: { ...Typography.caption, color: Colors.textHint, marginTop: 2 },
  itemTotal: { ...Typography.bodySmall, fontWeight: '600', color: Colors.primary },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  priceLabel: { ...Typography.bodySmall, color: Colors.textSecondary },
  priceValue: { ...Typography.bodySmall },
  totalRow: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: Spacing.xs, paddingTop: Spacing.sm },
  totalLabel: { ...Typography.title },
  totalValue: { ...Typography.price },
});
