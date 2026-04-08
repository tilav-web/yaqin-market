import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../../src/theme';
import { StatusBadge } from '../../../src/components/ui/Badge';
import { ordersApi } from '../../../src/api/orders';
import { useSocket } from '../../../src/hooks/useSocket';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Kutilmoqda',
  ACCEPTED: 'Qabul qilindi',
  READY: 'Tayyor',
  DELIVERING: 'Yetkazmoqda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [courierLocation, setCourierLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { data: order, isLoading } = useQuery({
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
    return <SafeAreaView style={s.safe}><ActivityIndicator style={{ flex: 1 }} color={Colors.primary} /></SafeAreaView>;
  }
  if (!order) return null;

  const deliveryLat = Number(order.delivery_lat);
  const deliveryLng = Number(order.delivery_lng);
  const showMap = order.status === 'DELIVERING' && !!courierLocation;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{order.order_number}</Text>
          <Text style={s.headerSub}>{STATUS_LABEL[order.status] ?? order.status}</Text>
        </View>
        <StatusBadge status={order.status} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xl }}>

        {/* Courier map (only while delivering) */}
        {showMap && courierLocation && (
          <View style={s.mapWrap}>
            <MapView
              style={s.map}
              region={{
                latitude: (courierLocation.lat + deliveryLat) / 2,
                longitude: (courierLocation.lng + deliveryLng) / 2,
                latitudeDelta: Math.abs(courierLocation.lat - deliveryLat) * 2 + 0.01,
                longitudeDelta: Math.abs(courierLocation.lng - deliveryLng) * 2 + 0.01,
              }}
            >
              <Marker coordinate={{ latitude: courierLocation.lat, longitude: courierLocation.lng }} title="Kuryer">
                <View style={s.courierMarker}>
                  <Ionicons name="bicycle" size={16} color={Colors.white} />
                </View>
              </Marker>
              <Marker coordinate={{ latitude: deliveryLat, longitude: deliveryLng }} title="Manzil">
                <View style={s.destMarker}>
                  <Ionicons name="location" size={16} color={Colors.white} />
                </View>
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
            <View style={s.mapOverlay}>
              <Ionicons name="navigate" size={14} color={Colors.white} />
              <Text style={s.mapOverlayTxt}>Kuryer yo'lda kelmoqda...</Text>
            </View>
          </View>
        )}

        {/* Store */}
        <View style={s.card}>
          <View style={s.infoRow}>
            <View style={[s.infoIcon, { backgroundColor: Colors.primarySurface }]}>
              <Ionicons name="storefront-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>Do'kon</Text>
              <Text style={s.infoVal}>{order.store?.name}</Text>
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <View style={[s.infoIcon, { backgroundColor: Colors.primarySurface }]}>
              <Ionicons name="cube-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={s.cardSectionTitle}>Mahsulotlar ({order.items?.length ?? 0} ta)</Text>
          </View>
          {order.items?.map((item: any) => (
            <View key={item.id} style={s.itemRow}>
              <View style={s.itemLeft}>
                <Text style={s.itemName}>{item.product_name}</Text>
                <Text style={s.itemQty}>{item.quantity} × {Number(item.price).toLocaleString()} so'm</Text>
              </View>
              <Text style={s.itemTotal}>{Number(item.total_price).toLocaleString()} so'm</Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={s.card}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Mahsulotlar</Text>
            <Text style={s.summaryVal}>{Number(order.items_price ?? 0).toLocaleString()} so'm</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Yetkazib berish</Text>
            <Text style={s.summaryVal}>{Number(order.delivery_price ?? 0).toLocaleString()} so'm</Text>
          </View>
          <View style={s.divider} />
          <View style={s.summaryRow}>
            <Text style={s.totalLabel}>Jami</Text>
            <Text style={s.totalVal}>{Number(order.total_price).toLocaleString()} so'm</Text>
          </View>
        </View>

        {/* Address */}
        <View style={s.card}>
          <View style={s.infoRow}>
            <View style={[s.infoIcon, { backgroundColor: Colors.primarySurface }]}>
              <Ionicons name="location-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>Yetkazib berish manzili</Text>
              <Text style={s.infoVal}>{order.delivery_address}</Text>
              {order.delivery_details && <Text style={s.infoSub}>{order.delivery_details}</Text>}
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.sm : Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },

  scroll: { flex: 1 },
  card: { backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginTop: Spacing.sm, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm, gap: Spacing.sm },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cardSectionTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  infoIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: Colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  infoVal: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  infoSub: { fontSize: 12, color: Colors.textHint, marginTop: 2 },

  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
  itemLeft: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
  itemQty: { fontSize: 12, color: Colors.textHint, marginTop: 2 },
  itemTotal: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  summaryLabel: { fontSize: 13, color: Colors.textSecondary },
  summaryVal: { fontSize: 13, color: Colors.textPrimary },
  divider: { height: 1, backgroundColor: Colors.divider, marginVertical: Spacing.xs },
  totalLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  totalVal: { fontSize: 17, fontWeight: '800', color: Colors.primary },

  mapWrap: { height: 220, marginHorizontal: Spacing.md, marginTop: Spacing.sm, borderRadius: Radius.lg, overflow: 'hidden', ...Shadow.md },
  map: { flex: 1 },
  courierMarker: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FF5722', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  destMarker: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  mapOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6, padding: 9,
  },
  mapOverlayTxt: { color: Colors.white, fontSize: 13, fontWeight: '600' },
});
