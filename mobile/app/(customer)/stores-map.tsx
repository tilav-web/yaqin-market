import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
  memo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
  Modal,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as SecureStore from "expo-secure-store";
import { Colors, Spacing, Radius, Shadow } from "../../src/theme";
import { useTranslation } from "../../src/i18n";
import { storesApi } from "../../src/api/stores";
import { useLocationStore } from "../../src/store/location.store";
import { useLocation } from "../../src/hooks/useLocation";

// ─── Helpers ────────────────────────────────────────────────────────────────
const CIRCLE_PALETTE = [
  "#E53935",
  "#1E88E5",
  "#43A047",
  "#FB8C00",
  "#8E24AA",
  "#00ACC1",
  "#F4511E",
  "#3949AB",
  "#7CB342",
  "#D81B60",
  "#00897B",
  "#5E35B1",
  "#C0CA33",
  "#6D4C41",
  "#039BE5",
];

const hashStoreId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
};
const storeColor = (id: string) =>
  CIRCLE_PALETTE[hashStoreId(id) % CIRCLE_PALETTE.length];

// Hex (#RRGGBB) → rgba(r, g, b, a)
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Haversine — meters
function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ONBOARDING_KEY = "map_onboarding_seen_v1";
const MAX_VISIBLE_CIRCLES = 20; // optimizatsiya uchun
const RADIUS_OPTIONS = [1, 3, 5, 10, 20];

// Google Maps POI (sportzal, restoran, boshqa do'konlar va h.k.) va label'larni yashirish
// Bu orqali xarita yaqin-market kontekstida toza ko'rinadi
const MAP_STYLE: any[] = [
  { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.attraction", stylers: [{ visibility: "off" }] },
  { featureType: "poi.government", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", stylers: [{ visibility: "off" }] },
  { featureType: "poi.sports_complex", stylers: [{ visibility: "off" }] },
  { featureType: "poi.place_of_worship", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  // Ko'cha nomlarini saqlaymiz — user orientatsiya uchun kerak
  // Park va tabiat qoldi — yaxshi landmark
];

// ─── Types ──────────────────────────────────────────────────────────────────
interface MapStore {
  id: string;
  name: string | { uz?: string; ru?: string };
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  is_prime?: boolean;
  rating?: number;
  is_open?: boolean;
  deliverySettings?: Array<{
    max_delivery_radius?: number;
    free_delivery_radius?: number;
    delivery_fee?: number;
    delivery_price_per_km?: number;
    is_delivery_enabled?: boolean;
  }>;
  max_delivery_radius?: number;
  free_delivery_radius?: number;
}

interface MapFilters {
  freeDeliveryOnly: boolean;
  primeOnly: boolean;
  openOnly: boolean;
}

const DEFAULT_FILTERS: MapFilters = {
  freeDeliveryOnly: false,
  primeOnly: false,
  openOnly: false,
};

// ─── Store Marker (memoized) ────────────────────────────────────────────────
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://api.yaqin-market.uz";
const pinImgUrl = (p?: string | null) =>
  p ? (p.startsWith("http") ? p : `${API_URL}/${p}`) : null;

const StoreMarker = memo(function StoreMarker({
  store,
  onPress,
  isSelected,
}: {
  store: MapStore & { logo?: string };
  onPress: () => void;
  isSelected: boolean;
}) {
  const lat = Number(store.lat ?? store.latitude);
  const lng = Number(store.lng ?? store.longitude);
  const logo = pinImgUrl(store.logo);

  // Rasm bor bo'lsa — yuklanguncha tracksViewChanges=true, keyin false
  // Rasm yo'q bo'lsa — darhol false (icon render darhol tayyor)
  const [tracks, setTracks] = useState(!!logo);

  // Selected state o'zgarganda marker o'lchamini yangilash uchun bir muddat track
  useEffect(() => {
    if (!logo) return;
    setTracks(true);
    const id = setTimeout(() => setTracks(false), 500);
    return () => clearTimeout(id);
  }, [isSelected, logo]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={mk.pinWrap}>
        <View
          style={[
            mk.pinHead,
            isSelected && mk.pinHeadActive,
            store.is_prime && mk.pinHeadPrime,
          ]}
        >
          {logo ? (
            <Image
              source={{ uri: logo }}
              style={mk.pinLogo}
              onLoad={() => setTracks(false)}
              onError={() => setTracks(false)}
            />
          ) : (
            <Ionicons
              name={store.is_prime ? "star" : "storefront"}
              size={isSelected ? 18 : 14}
              color={Colors.white}
            />
          )}
        </View>
        <View
          style={[
            mk.pinTail,
            isSelected && mk.pinTailActive,
            store.is_prime && mk.pinTailPrime,
          ]}
        />
      </View>
    </Marker>
  );
});

// ─── Filter Sheet ───────────────────────────────────────────────────────────
function FilterSheet({
  visible,
  filters,
  onApply,
  onClose,
  lang,
}: {
  visible: boolean;
  filters: MapFilters;
  onApply: (f: MapFilters) => void;
  onClose: () => void;
  lang: "uz" | "ru";
}) {
  const slideY = useRef(new Animated.Value(600)).current;
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const [draft, setDraft] = useState<MapFilters>(filters);

  useEffect(() => {
    if (visible) {
      setDraft(filters);
      Animated.parallel([
        Animated.timing(bgOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideY, {
          toValue: 0,
          friction: 9,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bgOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: 600,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const Toggle = ({ label, sub, icon, color, bg, value, onChange }: any) => (
    <TouchableOpacity
      style={fs.toggleRow}
      onPress={onChange}
      activeOpacity={0.8}
    >
      <View style={[fs.toggleIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={fs.toggleLabel}>{label}</Text>
        <Text style={fs.toggleSub}>{sub}</Text>
      </View>
      <View style={[fs.switch, value && fs.switchActive]}>
        <View style={[fs.switchDot, value && fs.switchDotActive]} />
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <Animated.View style={[fs.backdrop, { opacity: bgOpacity }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[fs.sheet, { transform: [{ translateY: slideY }] }]}
      >
        <View style={fs.handle} />
        <View style={fs.headerRow}>
          <Text style={fs.title}>
            {lang === "ru" ? "Фильтры карты" : "Xarita filterlari"}
          </Text>
          <TouchableOpacity onPress={() => setDraft(DEFAULT_FILTERS)}>
            <Text style={fs.resetTxt}>
              {lang === "ru" ? "Сбросить" : "Tozalash"}
            </Text>
          </TouchableOpacity>
        </View>

        <Toggle
          label={
            lang === "ru" ? "Бесплатная доставка" : "Tekin yetkazib berish"
          }
          sub={
            lang === "ru"
              ? "Доставляют бесплатно к вам"
              : "Sizga tekin yetkazadilar"
          }
          icon="gift-outline"
          color={Colors.success}
          bg="#E8F5E9"
          value={draft.freeDeliveryOnly}
          onChange={() =>
            setDraft((d) => ({ ...d, freeDeliveryOnly: !d.freeDeliveryOnly }))
          }
        />

        <Toggle
          label={lang === "ru" ? "Только Prime" : "Faqat Prime do'konlar"}
          sub={lang === "ru" ? "Премиум магазины" : "Premium sifatli do'konlar"}
          icon="star-outline"
          color="#F57F17"
          bg="#FFF8E1"
          value={draft.primeOnly}
          onChange={() => setDraft((d) => ({ ...d, primeOnly: !d.primeOnly }))}
        />

        <Toggle
          label={lang === "ru" ? "Только открытые" : "Faqat ochiq do'konlar"}
          sub={lang === "ru" ? "Работают сейчас" : "Hozir ishlayotganlar"}
          icon="time-outline"
          color={Colors.primary}
          bg="#FFEBEE"
          value={draft.openOnly}
          onChange={() => setDraft((d) => ({ ...d, openOnly: !d.openOnly }))}
        />

        <TouchableOpacity
          style={fs.applyBtn}
          onPress={() => {
            onApply(draft);
            onClose();
          }}
          activeOpacity={0.88}
        >
          <Text style={fs.applyTxt}>
            {lang === "ru" ? "Применить" : "Qo'llash"}
          </Text>
        </TouchableOpacity>

        <View style={{ height: Platform.OS === "ios" ? 28 : 16 }} />
      </Animated.View>
    </Modal>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function StoresMapScreen() {
  const router = useRouter();
  const { lang, t } = useTranslation();
  // Lokatsiya ruxsatini so'rash va joylashuvni olish (agar hali olinmagan bo'lsa)
  useLocation();
  const { lat: userLat, lng: userLng } = useLocationStore();
  const mapRef = useRef<MapView>(null);

  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const latitude = userLat ?? 41.2995;
  const longitude = userLng ?? 69.2401;

  // User joylashuvi kelganda xaritani unga markazlashtirish
  useEffect(() => {
    if (userLat == null || userLng == null) return;
    const delta = (radiusKm / 111) * 2.4;
    mapRef.current?.animateToRegion(
      {
        latitude: userLat,
        longitude: userLng,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      600,
    );
  }, [userLat, userLng]);

  // Onboarding — faqat birinchi marta ko'rsatiladi
  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDING_KEY)
      .then((seen) => {
        if (!seen) setShowOnboarding(true);
      })
      .catch(() => {});
  }, []);
  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    SecureStore.setItemAsync(ONBOARDING_KEY, "1").catch(() => {});
  }, []);

  // Keng radius bilan yuklaymiz (20 km), keyin mobile'da filter
  const { data: stores, isLoading } = useQuery({
    queryKey: ["map-stores", latitude, longitude],
    queryFn: () => storesApi.getNearby(latitude, longitude, 20),
  });

  // ── Filter + sort (memoized) ──────────────────────────────────────
  const filteredStores = useMemo(() => {
    if (!stores) return [];
    const arr: MapStore[] = Array.isArray(stores)
      ? stores
      : ((stores as any).data ?? []);

    return arr
      .filter((s) => {
        const lat = Number(s.lat ?? s.latitude);
        const lng = Number(s.lng ?? s.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
        if (lat === 0 && lng === 0) return false;

        const distance = calcDistance(latitude, longitude, lat, lng);
        if (!Number.isFinite(distance)) return false;
        if (distance > radiusKm * 1000) return false;

        const ds = s.deliverySettings?.[0];
        if (filters.freeDeliveryOnly) {
          const freeR = Number(ds?.free_delivery_radius ?? 0);
          if (!ds?.is_delivery_enabled || freeR <= 0 || distance > freeR)
            return false;
        }
        if (filters.primeOnly && !s.is_prime) return false;
        if (filters.openOnly && !s.is_open) return false;

        return true;
      })
      .map((s) => ({
        ...s,
        _distance: calcDistance(
          latitude,
          longitude,
          Number(s.lat ?? s.latitude),
          Number(s.lng ?? s.longitude),
        ),
      }))
      .sort((a: any, b: any) => a._distance - b._distance);
  }, [stores, latitude, longitude, radiusKm, filters]);

  const selectedStore = useMemo(
    () => filteredStores.find((s) => s.id === selectedStoreId),
    [filteredStores, selectedStoreId],
  );

  // ── Filter chiplari ───────────────────────────────────────────────
  const activeFilterCount =
    (filters.freeDeliveryOnly ? 1 : 0) +
    (filters.primeOnly ? 1 : 0) +
    (filters.openOnly ? 1 : 0);

  const handleRadiusChange = useCallback(
    (km: number) => {
      setRadiusKm(km);
      // Xarita zoomini radiusga moslash
      const delta = (km / 111) * 2.4;
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: delta, longitudeDelta: delta },
        500,
      );
    },
    [latitude, longitude],
  );

  const recenter = useCallback(() => {
    const delta = (radiusKm / 111) * 2.4;
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: delta, longitudeDelta: delta },
      500,
    );
  }, [latitude, longitude, radiusKm]);

  const initialRegion = useMemo(
    () => ({
      latitude,
      longitude,
      latitudeDelta: (radiusKm / 111) * 2.4,
      longitudeDelta: (radiusKm / 111) * 2.4,
    }),
    [],
  ); // faqat birinchi render uchun

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        customMapStyle={MAP_STYLE}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsIndoors={false}
        showsTraffic={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        onPress={() => setSelectedStoreId(null)}
      >
        {/* Store markers (all filtered) — radius doiralari ishlatilmaydi, xarita toza bo'lsin */}
        {filteredStores.map((store) => (
          <StoreMarker
            key={store.id}
            store={store}
            isSelected={selectedStoreId === store.id}
            onPress={() => setSelectedStoreId(store.id)}
          />
        ))}
      </MapView>

      {/* ── Top overlay: header + filter chips ───────────────────── */}
      <SafeAreaView
        edges={["top"]}
        style={s.topOverlay}
        pointerEvents="box-none"
      >
        <View style={s.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={s.circleBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={s.headerTitleWrap}>
            <Text style={s.headerTitle} numberOfLines={1}>
              {lang === "ru" ? "Карта магазинов" : "Do'konlar xaritasi"}
            </Text>
            <Text style={s.headerSub}>
              {isLoading
                ? lang === "ru"
                  ? "Загрузка..."
                  : "Yuklanmoqda..."
                : `${radiusKm} km ${lang === "ru" ? "в радиусе" : "radiusda"} ${
                    lang === "ru"
                      ? `${filteredStores.length} магазинов`
                      : `${filteredStores.length} ta do'kon`
                  }`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setFilterOpen(true)}
            style={s.circleBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={20} color={Colors.primary} />
            {activeFilterCount > 0 && (
              <View style={s.filterBadge}>
                <Text style={s.filterBadgeTxt}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Radius chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipsRow}
        >
          {RADIUS_OPTIONS.map((km) => {
            const active = radiusKm === km;
            return (
              <TouchableOpacity
                key={km}
                onPress={() => handleRadiusChange(km)}
                style={[s.chip, active && s.chipActive]}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="location-outline"
                  size={13}
                  color={active ? Colors.white : Colors.primary}
                />
                <Text style={[s.chipTxt, active && { color: Colors.white }]}>
                  {km} km
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* ── Onboarding hint ──────────────────────────────────────── */}
      {showOnboarding && (
        <View style={s.hintCard} pointerEvents="box-none">
          <View style={s.hintInner}>
            <View style={s.hintIconBox}>
              <Ionicons name="information" size={18} color={Colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.hintTitle}>
                {lang === "ru"
                  ? "Как использовать карту"
                  : "Xaritadan qanday foydalanish"}
              </Text>
              <Text style={s.hintText}>
                {lang === "ru"
                  ? "Выберите радиус сверху, применяйте фильтры. Круги — зоны доставки магазинов."
                  : "Tepadan radiusni tanlang, filterlardan foydalaning. Doirachalar — do'konlarning yetkazib berish zonasi."}
              </Text>
            </View>
            <TouchableOpacity onPress={dismissOnboarding} hitSlop={8}>
              <Ionicons name="close" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Loading ──────────────────────────────────────────────── */}
      {isLoading && (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      )}

      {/* ── Action buttons ──────────────────────────────────────── */}
      <TouchableOpacity style={s.fab} activeOpacity={0.8} onPress={recenter}>
        <Ionicons name="locate" size={22} color={Colors.primary} />
      </TouchableOpacity>

      {/* ── Selected store card ─────────────────────────────────── */}
      {selectedStore && (
        <View style={s.infoCard}>
          <View
            style={[
              s.infoIcon,
              { backgroundColor: storeColor(selectedStore.id) + "18" },
            ]}
          >
            <Ionicons
              name={selectedStore.is_prime ? "star" : "storefront"}
              size={22}
              color={storeColor(selectedStore.id)}
            />
          </View>
          <View style={s.infoContent}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={s.infoName} numberOfLines={1}>
                {typeof selectedStore.name === "string"
                  ? selectedStore.name
                  : t(selectedStore.name as any)}
              </Text>
              {selectedStore.is_prime && (
                <View style={s.primeBadge}>
                  <Ionicons name="star" size={9} color="#F57F17" />
                  <Text style={s.primeBadgeTxt}>Prime</Text>
                </View>
              )}
            </View>
            <Text style={s.infoMeta}>
              {((selectedStore as any)._distance / 1000).toFixed(2)} km
              {" · "}
              {Number(
                selectedStore.deliverySettings?.[0]?.max_delivery_radius ?? 0,
              ) / 1000 || "?"}{" "}
              km radius
            </Text>
            {selectedStore.address && (
              <Text style={s.infoAddress} numberOfLines={1}>
                {selectedStore.address}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={s.viewBtn}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/(customer)/store/[id]" as any,
                params: { id: selectedStore.id },
              })
            }
          >
            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Filter sheet ─────────────────────────────────────── */}
      <FilterSheet
        visible={filterOpen}
        filters={filters}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
        lang={lang}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topOverlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === "android" ? Spacing.sm : 0,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.md,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  filterBadgeTxt: { fontSize: 10, fontWeight: "800", color: Colors.white },
  headerTitleWrap: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    ...Shadow.md,
  },
  headerTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  headerSub: { fontSize: 11, color: Colors.textHint, marginTop: 1 },

  chipsRow: { paddingHorizontal: Spacing.md, paddingTop: 4, gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  chipActive: { backgroundColor: Colors.primary },
  chipTxt: { fontSize: 12, fontWeight: "700", color: Colors.primary },

  // Onboarding
  hintCard: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    bottom: 180,
    zIndex: 5,
  },
  hintInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.lg,
  },
  hintIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: 2,
  },
  hintText: { fontSize: 11, color: "rgba(255,255,255,0.9)", lineHeight: 15 },

  loadingWrap: {
    position: "absolute",
    top: 140,
    alignSelf: "center",
    backgroundColor: Colors.white,
    padding: Spacing.sm,
    borderRadius: Radius.full,
    ...Shadow.md,
  },

  fab: {
    position: "absolute",
    right: Spacing.md,
    bottom: 140,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.md,
  },

  infoCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.md,
    paddingBottom: Platform.OS === "ios" ? 28 : Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    ...Shadow.lg,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: { flex: 1, gap: 3 },
  infoName: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  infoMeta: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600" },
  infoAddress: { fontSize: 11, color: Colors.textHint },
  primeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  primeBadgeTxt: { fontSize: 9, fontWeight: "800", color: "#F57F17" },
  viewBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.sm,
  },
});

// ─── Store marker styles (logo pin shape) ─────────────────────────────────
const mk = StyleSheet.create({
  pinWrap: {
    alignItems: "center",
  },
  pinHead: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.white,
    overflow: "hidden",
    ...Shadow.md,
  },
  pinHeadActive: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  pinHeadPrime: {
    borderColor: "#F57F17",
    borderWidth: 3.5,
  },
  pinLogo: {
    width: "100%",
    height: "100%",
  },
  pinTail: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 9,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Colors.white,
    marginTop: -2,
  },
  pinTailActive: {
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderTopWidth: 11,
  },
  pinTailPrime: {
    borderTopColor: "#F57F17",
  },
});

// ─── FilterSheet styles ────────────────────────────────────────────────────
const fs = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: Spacing.md,
    ...Shadow.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.divider,
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingHorizontal: 4,
  },
  title: { fontSize: 17, fontWeight: "800", color: Colors.textPrimary },
  resetTxt: { fontSize: 14, fontWeight: "600", color: Colors.primary },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: 8,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  toggleSub: { fontSize: 11, color: Colors.textHint, marginTop: 2 },
  switch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.divider,
    padding: 3,
    justifyContent: "center",
  },
  switchActive: { backgroundColor: Colors.primary },
  switchDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
    ...Shadow.sm,
  },
  switchDotActive: { alignSelf: "flex-end" },

  applyBtn: {
    backgroundColor: Colors.primary,
    height: 50,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
    ...Shadow.md,
  },
  applyTxt: { fontSize: 16, fontWeight: "700", color: Colors.white },
});
