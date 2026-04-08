import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Alert, RefreshControl, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { ordersApi } from '../../src/api/orders';
import { useLocation } from '../../src/hooks/useLocation';

const COURIER_COLOR = '#FF5722';

export default function NearbyOrdersScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [mapVisible, setMapVisible] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const { lat, lng, permissionGranted } = useLocation();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['nearby-orders', lat, lng],
    queryFn: () => ordersApi.getNearbyOrders(lat!, lng!, 10),
    enabled: !!lat && !!lng,
    refetchInterval: 30000,
  });

  const orders = Array.isArray(data) ? data : [];

  const handleAccept = async (orderId: string) => {
    setAccepting(orderId);
    try {
      await ordersApi.assignCourier(orderId);
      qc.invalidateQueries({ queryKey: ['nearby-orders'] });
      qc.invalidateQueries({ queryKey: ['courier-active'] });
      Alert.alert('Qabul qilindi!', 'Buyurtma qabul qilindi.', [
        { text: 'Yetkazishga o\'tish', onPress: () => router.push('/(courier)/active') },
        { text: 'OK' },
      ]);
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.message ?? 'Buyurtma allaqachon qabul qilingan');
    } finally {
      setAccepting(null);
    }
  };

  if (!permissionGranted) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>Yaqin buyurtmalar</Text>
        </View>
        <View style={s.permBox}>
          <View style={s.permIconBox}>
            <Ionicons name="location-outline" size={44} color={COURIER_COLOR} />
          </View>
          <Text style={s.permTitle}>Joylashuv ruxsati kerak</Text>
          <Text style={s.permSub}>Yaqin buyurtmalarni ko'rish uchun joylashuvga ruxsat bering</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.title}>Yaqin buyurtmalar</Text>
            <Text style={s.subtitle}>{orders.length} ta buyurtma · 10km radius</Text>
          </View>
          <TouchableOpacity
            style={s.mapToggle}
            onPress={() => setMapVisible(!mapVisible)}
          >
            <Ionicons name={mapVisible ? 'list' : 'map-outline'} size={16} color={Colors.white} />
            <Text style={s.mapToggleTxt}>{mapVisible ? 'Ro\'yxat' : 'Xarita'}</Text>
          </TouchableOpacity>
        </View>

        {/* Online badge */}
        <View style={s.onlinePill}>
          <View style={s.onlineDot} />
          <Text style={s.onlineTxt}>Online · Buyurtma qabul qilinmoqda</Text>
        </View>
      </View>

      {mapVisible && lat && lng ? (
        <View style={s.mapWrap}>
          <MapView
            style={s.map}
            initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
          >
            <Marker coordinate={{ latitude: lat, longitude: lng }} title="Siz">
              <View style={s.myMarker}>
                <Ionicons name="bicycle" size={18} color={Colors.white} />
              </View>
            </Marker>
            {orders.map((o: any) => (
              <Marker
                key={o.id}
                coordinate={{ latitude: Number(o.delivery_lat), longitude: Number(o.delivery_lng) }}
                title={o.order_number}
                description={`${Number(o.total_price).toLocaleString()} so'm`}
              >
                <View style={s.orderMarker}>
                  <Ionicons name="cube" size={14} color={Colors.white} />
                </View>
              </Marker>
            ))}
          </MapView>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={i => i.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COURIER_COLOR} colors={[COURIER_COLOR]} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={s.empty}>
                <View style={s.emptyIconBox}>
                  <Ionicons name="bicycle-outline" size={44} color="#FFCCBC" />
                </View>
                <Text style={s.emptyTitle}>Yaqinda buyurtma yo'q</Text>
                <Text style={s.emptySub}>10km radius ichida tayyor buyurtmalar yo'q. Avtomatik yangilanadi.</Text>
              </View>
            ) : null
          }
          renderItem={({ item: order }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={s.orderInfo}>
                  <View style={s.orderIconBox}>
                    <Ionicons name="cube-outline" size={18} color={COURIER_COLOR} />
                  </View>
                  <View>
                    <Text style={s.orderNum}>{order.order_number}</Text>
                    <Text style={s.storeName}>{order.store?.name}</Text>
                  </View>
                </View>
                <Text style={s.price}>{Number(order.total_price).toLocaleString()} so'm</Text>
              </View>

              <View style={s.divider} />

              <View style={s.metaRow}>
                <View style={s.metaItem}>
                  <Ionicons name="location-outline" size={13} color={Colors.textHint} />
                  <Text style={s.metaTxt} numberOfLines={1}>{order.delivery_address}</Text>
                </View>
                <View style={s.metaItem}>
                  <Ionicons name="layers-outline" size={13} color={Colors.textHint} />
                  <Text style={s.metaTxt}>{order.items?.length ?? 0} ta</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[s.acceptBtn, accepting === order.id && { opacity: 0.7 }]}
                onPress={() => handleAccept(order.id)}
                disabled={accepting === order.id}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                <Text style={s.acceptBtnTxt}>
                  {accepting === order.id ? 'Qabul qilinmoqda...' : 'Qabul qilish'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: COURIER_COLOR,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.xs : 0,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  mapToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.full,
  },
  mapToggleTxt: { fontSize: 12, fontWeight: '600', color: Colors.white },
  onlinePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: Radius.full,
  },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#A5D6A7' },
  onlineTxt: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },

  mapWrap: { flex: 1 },
  map: { flex: 1 },
  myMarker: { width: 36, height: 36, borderRadius: 18, backgroundColor: COURIER_COLOR, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  orderMarker: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },

  list: { padding: Spacing.md, gap: Spacing.sm },
  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm, gap: Spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  orderIconBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#FBE9E7', alignItems: 'center', justifyContent: 'center' },
  orderNum: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  storeName: { fontSize: 12, color: Colors.textHint, marginTop: 1 },
  price: { fontSize: 16, fontWeight: '800', color: COURIER_COLOR },
  divider: { height: 1, backgroundColor: Colors.divider },
  metaRow: { gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaTxt: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  acceptBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: COURIER_COLOR, borderRadius: Radius.lg, height: 46,
    ...Shadow.sm,
  },
  acceptBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },

  permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  permIconBox: { width: 88, height: 88, borderRadius: 24, backgroundColor: '#FBE9E7', alignItems: 'center', justifyContent: 'center' },
  permTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  permSub: { fontSize: 14, color: Colors.textHint, textAlign: 'center', lineHeight: 20 },

  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyIconBox: { width: 88, height: 88, borderRadius: 24, backgroundColor: '#FBE9E7', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', paddingHorizontal: 40, lineHeight: 19 },
});
