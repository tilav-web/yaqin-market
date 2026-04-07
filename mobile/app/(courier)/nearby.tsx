import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MapView, { Marker } from 'react-native-maps';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { Button } from '../../src/components/ui';
import { ordersApi } from '../../src/api/orders';
import { useLocation } from '../../src/hooks/useLocation';

export default function NearbyOrdersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mapVisible, setMapVisible] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const { lat, lng, permissionGranted } = useLocation();

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['nearby-orders', lat, lng],
    queryFn: () => ordersApi.getNearbyOrders(lat!, lng!, 10),
    enabled: !!lat && !!lng,
    refetchInterval: 30000,
  });

  const handleAccept = async (orderId: string) => {
    setAccepting(orderId);
    try {
      await ordersApi.assignCourier(orderId);
      queryClient.invalidateQueries({ queryKey: ['nearby-orders'] });
      queryClient.invalidateQueries({ queryKey: ['courier-active'] });
      Alert.alert('✅', 'Buyurtma qabul qilindi!', [
        { text: 'Yetkazib berishni boshlash', onPress: () => router.push('/(courier)/active') },
      ]);
    } catch (err: any) {
      Alert.alert('Xato', err?.response?.data?.message ?? 'Buyurtma allaqachon qabul qilingan');
    } finally {
      setAccepting(null);
    }
  };

  if (!permissionGranted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>🗺️ Yaqin buyurtmalar</Text>
        </View>
        <View style={styles.permissionBox}>
          <Text style={styles.permIcon}>📍</Text>
          <Text style={styles.permTitle}>Joylashuv ruxsati kerak</Text>
          <Text style={styles.permSubtitle}>
            Yaqin buyurtmalarni ko'rish uchun joylashuvga ruxsat bering
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Yaqin buyurtmalar</Text>
        <TouchableOpacity
          style={styles.mapToggle}
          onPress={() => setMapVisible(!mapVisible)}
        >
          <Text style={styles.mapToggleText}>{mapVisible ? '📋 List' : '🗺️ Xarita'}</Text>
        </TouchableOpacity>
      </View>

      {mapVisible && lat && lng ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker
              coordinate={{ latitude: lat, longitude: lng }}
              title="Siz"
            >
              <Text style={{ fontSize: 28 }}>🏍️</Text>
            </Marker>
            {orders?.map((order: any) => (
              <Marker
                key={order.id}
                coordinate={{
                  latitude: Number(order.delivery_lat),
                  longitude: Number(order.delivery_lng),
                }}
                title={order.order_number}
                description={`${Number(order.total_price).toLocaleString()} so'm`}
              >
                <Text style={{ fontSize: 24 }}>📦</Text>
              </Marker>
            ))}
          </MapView>
        </View>
      ) : null}

      {!mapVisible && (
        isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
        ) : (
          <FlatList
            data={orders ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🏍️</Text>
                <Text style={styles.emptyText}>Yaqinda buyurtma yo'q</Text>
                <Text style={styles.emptySubtext}>10km radius ichida tayyor buyurtmalar</Text>
              </View>
            }
            renderItem={({ item: order }) => (
              <View style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <Text style={styles.orderNum}>{order.order_number}</Text>
                  <Text style={styles.price}>{Number(order.total_price).toLocaleString()} so'm</Text>
                </View>
                <Text style={styles.store}>🏪 {order.store?.name}</Text>
                <Text style={styles.address}>📍 {order.delivery_address}</Text>
                <Text style={styles.itemCount}>{order.items?.length} ta mahsulot</Text>
                <Button
                  title={accepting === order.id ? 'Qabul qilinmoqda...' : 'Qabul qilish'}
                  onPress={() => handleAccept(order.id)}
                  loading={accepting === order.id}
                  size="sm"
                  style={{ marginTop: Spacing.sm }}
                />
              </View>
            )}
          />
        )
      )}
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
  mapToggle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  mapToggleText: { color: Colors.white, ...Typography.buttonSmall },
  mapContainer: { height: 300 },
  map: { flex: 1 },
  list: { padding: Spacing.md, gap: Spacing.sm },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    ...Shadow.sm,
    gap: 4,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNum: { ...Typography.title, fontSize: 15 },
  price: { ...Typography.priceSmall },
  store: { ...Typography.bodySmall, color: Colors.textSecondary },
  address: { ...Typography.bodySmall, color: Colors.textSecondary },
  itemCount: { ...Typography.caption, color: Colors.textHint },
  empty: { alignItems: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyText: { ...Typography.body, color: Colors.textSecondary },
  emptySubtext: { ...Typography.caption, color: Colors.textHint, textAlign: 'center' },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  permIcon: { fontSize: 48, marginBottom: Spacing.md },
  permTitle: { ...Typography.h4, textAlign: 'center' },
  permSubtitle: { ...Typography.bodySmall, textAlign: 'center', color: Colors.textSecondary, marginTop: Spacing.xs },
});
