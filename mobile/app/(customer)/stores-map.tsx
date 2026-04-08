import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { storesApi } from '../../src/api/stores';
import { useLocationStore } from '../../src/store/location.store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Color palette for store circles
const CIRCLE_PALETTE = [
  '#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA',
  '#00ACC1', '#F4511E', '#3949AB', '#7CB342', '#D81B60',
  '#00897B', '#5E35B1', '#C0CA33', '#6D4C41', '#039BE5',
];

function hashStoreId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getStoreColor(id: string): string {
  return CIRCLE_PALETTE[hashStoreId(id) % CIRCLE_PALETTE.length];
}

interface StoreInfo {
  id: string;
  name: string | { uz: string; ru?: string };
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  max_delivery_radius?: number;
  address?: string;
  logo_url?: string;
}

export default function StoresMapScreen() {
  const router = useRouter();
  const { lang, t } = useTranslation();
  const { lat: userLat, lng: userLng } = useLocationStore();
  const mapRef = useRef<MapView>(null);

  const [selectedStore, setSelectedStore] = useState<StoreInfo | null>(null);

  const latitude = userLat ?? 41.2995;
  const longitude = userLng ?? 69.2401;

  const { data: stores, isLoading } = useQuery({
    queryKey: ['nearby-stores-map', latitude, longitude],
    queryFn: () => storesApi.getNearby(latitude, longitude, 10),
  });

  const storeList: StoreInfo[] = useMemo(() => {
    if (!stores) return [];
    const arr = Array.isArray(stores) ? stores : stores.data ?? [];
    return arr.filter(
      (s: StoreInfo) => (s.lat ?? s.latitude) != null && (s.lng ?? s.longitude) != null,
    );
  }, [stores]);

  const pageTitle = lang === 'ru' ? 'Карта магазинов' : "Do'konlar xaritasi";

  const getStoreLat = (s: StoreInfo) => s.lat ?? s.latitude ?? 0;
  const getStoreLng = (s: StoreInfo) => s.lng ?? s.longitude ?? 0;

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setSelectedStore(null)}
      >
        {storeList.map((store) => {
          const color = getStoreColor(store.id);
          const radius = store.max_delivery_radius ?? 3000;
          const sLat = getStoreLat(store);
          const sLng = getStoreLng(store);

          return (
            <React.Fragment key={store.id}>
              <Circle
                center={{ latitude: sLat, longitude: sLng }}
                radius={radius}
                fillColor={color + '14'}
                strokeColor={color + '66'}
                strokeWidth={1.5}
              />
              <Marker
                coordinate={{ latitude: sLat, longitude: sLng }}
                title={typeof store.name === 'string' ? store.name : t(store.name)}
                onPress={() => setSelectedStore(store)}
              >
                <View style={[s.markerWrap, { backgroundColor: color }]}>
                  <Ionicons name="storefront" size={14} color={Colors.white} />
                </View>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapView>

      {/* Header overlay */}
      <SafeAreaView edges={['top']} style={s.headerOverlay}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={s.headerTitleWrap}>
            <Text style={s.headerTitle}>{pageTitle}</Text>
            {!isLoading && (
              <Text style={s.headerSub}>
                {storeList.length} {lang === 'ru' ? 'магазинов' : "ta do'kon"}
              </Text>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Loading indicator */}
      {isLoading && (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={s.loadingTxt}>
            {lang === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...'}
          </Text>
        </View>
      )}

      {/* My location button */}
      <TouchableOpacity
        style={s.myLocationBtn}
        activeOpacity={0.8}
        onPress={() => {
          mapRef.current?.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          }, 500);
        }}
      >
        <Ionicons name="locate" size={22} color={Colors.primary} />
      </TouchableOpacity>

      {/* Selected store info card */}
      {selectedStore && (
        <View style={s.infoCard}>
          <View style={[s.infoIcon, { backgroundColor: getStoreColor(selectedStore.id) + '18' }]}>
            <Ionicons
              name="storefront"
              size={24}
              color={getStoreColor(selectedStore.id)}
            />
          </View>
          <View style={s.infoContent}>
            <Text style={s.infoName} numberOfLines={1}>
              {typeof selectedStore.name === 'string' ? selectedStore.name : t(selectedStore.name)}
            </Text>
            {selectedStore.address && (
              <Text style={s.infoAddress} numberOfLines={1}>{selectedStore.address}</Text>
            )}
            <Text style={s.infoRadius}>
              {lang === 'ru' ? 'Радиус доставки:' : 'Yetkazib berish radiusi:'}{' '}
              {((selectedStore.max_delivery_radius ?? 3000) / 1000).toFixed(1)} km
            </Text>
          </View>
          <TouchableOpacity
            style={s.viewBtn}
            activeOpacity={0.85}
            onPress={() =>
              router.push({ pathname: '/(customer)/store/[id]' as any, params: { id: selectedStore.id } })
            }
          >
            <Text style={s.viewBtnTxt}>{lang === 'ru' ? 'Открыть' : "Ko'rish"}</Text>
            <Ionicons name="arrow-forward" size={14} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header overlay
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.sm : 0,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  headerTitleWrap: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    ...Shadow.md,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  headerSub: { fontSize: 11, color: Colors.textHint, marginTop: 1 },

  // Custom marker
  markerWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
    ...Shadow.sm,
  },

  // Loading
  loadingWrap: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    ...Shadow.md,
  },
  loadingTxt: { fontSize: 13, color: Colors.textSecondary },

  // My location button
  myLocationBtn: {
    position: 'absolute',
    right: Spacing.md,
    bottom: 120,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },

  // Info card
  infoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.lg,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: { flex: 1, gap: 2 },
  infoName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  infoAddress: { fontSize: 12, color: Colors.textSecondary },
  infoRadius: { fontSize: 11, color: Colors.textHint },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    ...Shadow.sm,
  },
  viewBtnTxt: { fontSize: 13, fontWeight: '700', color: Colors.white },
});
