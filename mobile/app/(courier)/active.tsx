import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Alert, TouchableOpacity, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { ordersApi } from '../../src/api/orders';
import { useSocket } from '../../src/hooks/useSocket';
import { useTranslation } from '../../src/i18n';

const COURIER_COLOR = '#FF5722';

export default function ActiveDeliveryScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { lang } = useTranslation();
  const locationRef = useRef<Location.LocationSubscription | null>(null);

  const { data: activeOrders, isLoading } = useQuery({
    queryKey: ['courier-active'],
    queryFn: () => ordersApi.getMyCourierOrders('DELIVERING'),
    refetchInterval: 15000,
  });

  const activeOrder = Array.isArray(activeOrders) ? activeOrders[0] : undefined;
  const { sendCourierLocation } = useSocket('courier');

  useEffect(() => {
    if (!activeOrder) { locationRef.current?.remove(); return; }
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      locationRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (loc) => sendCourierLocation(activeOrder.id, loc.coords.latitude, loc.coords.longitude),
      );
    })();
    return () => locationRef.current?.remove();
  }, [activeOrder?.id]);

  const handleDeliver = () => {
    if (!activeOrder) return;
    Alert.alert(
      lang === 'ru' ? 'Доставлено' : 'Yetkazildi',
      lang === 'ru' ? 'Подтверждаете успешную доставку заказа?' : 'Buyurtma muvaffaqiyatli yetkazilganini tasdiqlaysizmi?',
      [
      { text: lang === 'ru' ? 'Отмена' : 'Bekor qilish', style: 'cancel' },
      {
        text: lang === 'ru' ? 'Да, доставлено' : 'Ha, yetkazildi',
        onPress: async () => {
          try {
            await ordersApi.deliverOrder(activeOrder.id);
            qc.invalidateQueries({ queryKey: ['courier-active'] });
            qc.invalidateQueries({ queryKey: ['courier-history'] });
            Alert.alert(lang === 'ru' ? 'Отлично!' : 'Barakalla!', lang === 'ru' ? 'Заказ успешно доставлен!' : 'Buyurtma muvaffaqiyatli yetkazildi!');
          } catch (e: any) {
            Alert.alert(lang === 'ru' ? 'Ошибка' : 'Xato', e?.response?.data?.message ?? (lang === 'ru' ? 'Ошибка' : 'Xato'));
          }
        },
      },
    ]);
  };

  if (!activeOrder && !isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>{lang === 'ru' ? 'Активная доставка' : 'Faol yetkazish'}</Text>
        </View>
        <View style={s.emptyWrap}>
          <View style={s.emptyIconBox}>
            <Ionicons name="bicycle-outline" size={44} color="#FFCCBC" />
          </View>
          <Text style={s.emptyTitle}>{lang === 'ru' ? 'Нет активной доставки' : "Faol yetkazish yo'q"}</Text>
          <Text style={s.emptySub}>{lang === 'ru' ? 'Примите один из ближайших заказов' : 'Yaqin buyurtmalardan birini qabul qiling'}</Text>
          <TouchableOpacity style={s.nearbyBtn} onPress={() => router.push('/(courier)/nearby')}>
            <Ionicons name="map-outline" size={16} color={Colors.white} />
            <Text style={s.nearbyBtnTxt}>{lang === 'ru' ? 'Ближайшие заказы' : 'Yaqin buyurtmalar'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const deliveryLat = Number(activeOrder?.delivery_lat);
  const deliveryLng = Number(activeOrder?.delivery_lng);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.title}>{lang === 'ru' ? 'Доставка' : 'Yetkazib berish'}</Text>
            <Text style={s.orderNum}>{activeOrder?.order_number}</Text>
          </View>
          <View style={s.trackingPill}>
            <View style={s.trackingDot} />
            <Text style={s.trackingTxt}>{lang === 'ru' ? 'Живое отслеживание' : 'Jonli tracking'}</Text>
          </View>
        </View>
      </View>

      {/* Map */}
      <View style={s.mapWrap}>
        <MapView
          style={s.map}
          initialRegion={{ latitude: deliveryLat || 41.2995, longitude: deliveryLng || 69.2401, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        >
          {deliveryLat && deliveryLng && (
            <Marker coordinate={{ latitude: deliveryLat, longitude: deliveryLng }} title={lang === 'ru' ? 'Адрес доставки' : 'Yetkazish manzili'}>
              <View style={s.destMarker}>
                <Ionicons name="location" size={16} color={Colors.white} />
              </View>
            </Marker>
          )}
        </MapView>
        <View style={s.mapOverlay}>
          <Ionicons name="navigate" size={14} color={Colors.white} />
          <Text style={s.mapOverlayTxt}>{lang === 'ru' ? 'Ваше местоположение видно клиенту' : "Joylashuvingiz mijozga ko'rsatilmoqda"}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Customer */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={[s.infoIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="person-outline" size={18} color="#2196F3" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>{lang === 'ru' ? 'Клиент' : 'Mijoz'}</Text>
              <Text style={s.infoVal}>
                {activeOrder?.customer?.first_name} {activeOrder?.customer?.last_name}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery address */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={[s.infoIcon, { backgroundColor: Colors.primarySurface }]}>
              <Ionicons name="location-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoLabel}>{lang === 'ru' ? 'Адрес доставки' : 'Yetkazish manzili'}</Text>
              <Text style={s.infoVal}>{activeOrder?.delivery_address}</Text>
              {activeOrder?.delivery_details && (
                <Text style={s.infoSub}>{activeOrder.delivery_details}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={s.infoCard}>
          <View style={s.itemsHeader}>
            <View style={[s.infoIcon, { backgroundColor: '#FBE9E7' }]}>
              <Ionicons name="cube-outline" size={18} color={COURIER_COLOR} />
            </View>
            <Text style={s.infoLabel}>{lang === 'ru' ? 'Товары' : 'Mahsulotlar'} ({activeOrder?.items?.length ?? 0} {lang === 'ru' ? 'шт' : 'ta'})</Text>
          </View>
          {activeOrder?.items?.map((item: any) => (
            <View key={item.id} style={s.itemRow}>
              <View style={s.itemDot} />
              <Text style={s.itemName} numberOfLines={1}>{item.product_name}</Text>
              <Text style={s.itemQty}>× {item.quantity}</Text>
            </View>
          ))}
        </View>

        {/* Payment */}
        <View style={s.infoCard}>
          <View style={s.payRow}>
            <View>
              <Text style={s.infoLabel}>{lang === 'ru' ? 'Итого к оплате' : "Jami to'lov"}</Text>
              <Text style={s.payPrice}>{Number(activeOrder?.total_price ?? 0).toLocaleString()} {lang === 'ru' ? 'сум' : "so'm"}</Text>
            </View>
            <View style={s.payMethodPill}>
              <Ionicons name={activeOrder?.payment_method === 'CASH' ? 'cash-outline' : 'card-outline'} size={14} color={Colors.success} />
              <Text style={s.payMethodTxt}>
                {activeOrder?.payment_method === 'CASH' ? (lang === 'ru' ? 'Наличные' : 'Naqd pul') : (lang === 'ru' ? 'Карта' : 'Karta')}
              </Text>
            </View>
          </View>
        </View>

        {/* Deliver button */}
        <TouchableOpacity style={s.deliverBtn} onPress={handleDeliver} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
          <Text style={s.deliverBtnTxt}>{lang === 'ru' ? 'Доставлено' : 'Yetkazib berdim'}</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: Colors.white },
  orderNum: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  trackingPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  trackingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#A5D6A7' },
  trackingTxt: { fontSize: 11, fontWeight: '600', color: Colors.white },

  mapWrap: { height: 220, position: 'relative' },
  map: { flex: 1 },
  destMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.white },
  mapOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,87,34,0.85)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 8,
  },
  mapOverlayTxt: { color: Colors.white, fontSize: 12, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: Spacing.sm },

  infoCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm, gap: Spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  infoIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: Colors.textHint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  infoVal: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  infoSub: { fontSize: 12, color: Colors.textHint, marginTop: 3 },

  itemsHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 52, gap: Spacing.sm, paddingVertical: 4 },
  itemDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.border },
  itemName: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  itemQty: { fontSize: 13, fontWeight: '600', color: Colors.textHint },

  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payPrice: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  payMethodPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  payMethodTxt: { fontSize: 13, fontWeight: '600', color: Colors.success },

  deliverBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.success, borderRadius: Radius.lg, height: 56,
    ...Shadow.md, marginTop: Spacing.sm,
  },
  deliverBtnTxt: { fontSize: 17, fontWeight: '800', color: Colors.white },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  emptyIconBox: { width: 96, height: 96, borderRadius: 28, backgroundColor: '#FBE9E7', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textHint, textAlign: 'center' },
  nearbyBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: COURIER_COLOR, paddingHorizontal: Spacing.xl, paddingVertical: 13, borderRadius: Radius.full, marginTop: Spacing.sm, ...Shadow.sm },
  nearbyBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
