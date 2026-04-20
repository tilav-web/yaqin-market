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
  TextInput,
  FlatList,
  Keyboard,
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
import { productsApi, type CheapestStoreItem } from "../../src/api/products";
import { useLocationStore } from "../../src/store/location.store";
import { useLocation } from "../../src/hooks/useLocation";
import { useCartStore } from "../../src/store/cart.store";
import { haptics } from "../../src/utils/haptics";

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
  const [imgLoaded, setImgLoaded] = useState(!logo);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
      tracksViewChanges={!imgLoaded}
      anchor={{ x: 0.5, y: 0.5 }}
      centerOffset={{ x: 0, y: 0 }}
    >
      <View style={mk.outer}>
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
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgLoaded(true)}
            />
          ) : (
            <Ionicons
              name={store.is_prime ? "star" : "storefront"}
              size={isSelected ? 18 : 14}
              color={Colors.white}
            />
          )}
        </View>
      </View>
    </Marker>
  );
});

// ─── Price Marker (product mode) ────────────────────────────────────────────
const PriceMarker = memo(function PriceMarker({
  lat,
  lng,
  isCheapest,
  isSelected,
  onPress,
}: {
  lat: number;
  lng: number;
  price: number;
  isCheapest: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setTracks(false), 100);
    return () => clearTimeout(id);
  }, [isSelected, isCheapest]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const color = isCheapest ? Colors.success : Colors.primary;
  const size = isSelected ? 38 : 30;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={onPress}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={pm.outer}>
        <Ionicons name="location" size={size} color={color} />
        {isCheapest && (
          <View style={pm.flashBadge}>
            <Ionicons name="flash" size={9} color={Colors.white} />
          </View>
        )}
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

  // Product search mode
  const [productQuery, setProductQuery] = useState("");
  const [productQuerySubmitted, setProductQuerySubmitted] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<
    { id: number; name: any } | null
  >(null);
  const [selectedPriceItemId, setSelectedPriceItemId] = useState<string | null>(
    null,
  );
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);

  const { addStoreItem, storeCarts, updateStoreQuantity, removeStoreItem } = useCartStore();

  const latitude = userLat ?? 41.2995;
  const longitude = userLng ?? 69.2401;

  // ── Product autocomplete query ────────────────────────────────────
  const { data: productResults, isFetching: isSearchingProducts } = useQuery({
    queryKey: ["map-product-search", productQuerySubmitted],
    queryFn: () =>
      productsApi.getCatalog({
        q: productQuerySubmitted,
        limit: 12,
      }),
    enabled: productQuerySubmitted.trim().length >= 2,
  });

  // ── Cheapest stores for selected product ──────────────────────────
  const { data: cheapestStores, isLoading: isLoadingCheapest } = useQuery({
    queryKey: ["map-cheapest-stores", selectedProduct?.id, userLat, userLng],
    queryFn: () =>
      productsApi.getCheapestStores(selectedProduct!.id, {
        lat: userLat ?? undefined,
        lng: userLng ?? undefined,
        limit: 20,
      }),
    enabled: selectedProduct !== null,
  });

  const handleProductSubmit = () => {
    const trimmed = productQuery.trim();
    setProductQuerySubmitted(trimmed);
    setAutocompleteOpen(trimmed.length >= 2);
    Keyboard.dismiss();
  };

  const selectProductFromList = (p: any) => {
    haptics.medium();
    setSelectedProduct({ id: p.id, name: p.name });
    setSelectedStoreId(null);
    setAutocompleteOpen(false);
    Keyboard.dismiss();
    setProductQuery(typeof p.name === "string" ? p.name : (t(p.name) ?? ""));
  };

  const clearProductMode = () => {
    haptics.select();
    setSelectedProduct(null);
    setSelectedPriceItemId(null);
    setProductQuery("");
    setProductQuerySubmitted("");
    setAutocompleteOpen(false);
  };

  // Fit all cheapest-stores on map when product selected
  const cheapestList: CheapestStoreItem[] = useMemo(
    () => cheapestStores ?? [],
    [cheapestStores],
  );
  useEffect(() => {
    if (!selectedProduct || cheapestList.length === 0) return;
    const coords = cheapestList
      .filter(
        (i) =>
          Number.isFinite(i.store.lat ?? NaN) &&
          Number.isFinite(i.store.lng ?? NaN),
      )
      .map((i) => ({
        latitude: Number(i.store.lat),
        longitude: Number(i.store.lng),
      }));
    if (userLat && userLng) {
      coords.push({ latitude: userLat, longitude: userLng });
    }
    if (coords.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coords, {
          edgePadding: { top: 180, bottom: 260, left: 60, right: 60 },
          animated: true,
        });
      }, 300);
    }
  }, [selectedProduct?.id, cheapestList.length]);

  const selectedPriceItem = useMemo(
    () => cheapestList.find((i) => i.store_product_id === selectedPriceItemId),
    [cheapestList, selectedPriceItemId],
  );

  const getItemQty = (storeId: string, spId: string): number => {
    const cart = storeCarts[storeId];
    if (!cart) return 0;
    return cart.items.find((i) => i.store_product_id === spId)?.quantity ?? 0;
  };

  const incFromMap = (item: CheapestStoreItem) => {
    haptics.light();
    const img = item.variant.images?.[0]?.url;
    addStoreItem(
      {
        store_product_id: item.store_product_id,
        product_id: item.variant.id,
        store_id: item.store.id,
        store_name: item.store.name,
        product_name: t(item.variant.name),
        product_image: img,
        price: item.price,
        quantity: 1,
      },
      item.store.logo ?? undefined,
    );
  };

  const decFromMap = (item: CheapestStoreItem) => {
    haptics.light();
    const qty = getItemQty(item.store.id, item.store_product_id);
    if (qty <= 1) removeStoreItem(item.store.id, item.store_product_id);
    else updateStoreQuantity(item.store.id, item.store_product_id, qty - 1);
  };

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
        onPress={() => {
          setSelectedStoreId(null);
          setSelectedPriceItemId(null);
          setAutocompleteOpen(false);
        }}
      >
        {selectedProduct ? (
          // Product mode — narx pill markerlari
          cheapestList.map((item) => {
            const lat = Number(item.store.lat);
            const lng = Number(item.store.lng);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            const idx = cheapestList.findIndex(
              (x) => x.store_product_id === item.store_product_id,
            );
            return (
              <PriceMarker
                key={item.store_product_id}
                lat={lat}
                lng={lng}
                price={item.price}
                isCheapest={idx === 0}
                isSelected={selectedPriceItemId === item.store_product_id}
                onPress={() => {
                  haptics.light();
                  setSelectedPriceItemId(item.store_product_id);
                }}
              />
            );
          })
        ) : (
          // Oddiy mode — do'kon markerlari (aylana)
          filteredStores.map((store) => (
            <StoreMarker
              key={store.id}
              store={store}
              isSelected={selectedStoreId === store.id}
              onPress={() => setSelectedStoreId(store.id)}
            />
          ))
        )}
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

          {/* Search input */}
          <View style={s.searchBox}>
            <Ionicons name="search" size={16} color={Colors.textHint} />
            <TextInput
              style={s.searchInput}
              value={productQuery}
              onChangeText={(v) => {
                setProductQuery(v);
                if (v.trim().length >= 2) setAutocompleteOpen(true);
                else setAutocompleteOpen(false);
              }}
              onFocus={() => {
                if (productQuery.trim().length >= 2)
                  setAutocompleteOpen(true);
              }}
              placeholder={
                lang === "ru"
                  ? "Найти товар на карте..."
                  : "Mahsulot qidirish..."
              }
              placeholderTextColor={Colors.textHint}
              returnKeyType="search"
              onSubmitEditing={handleProductSubmit}
            />
            {(productQuery.length > 0 || selectedProduct) && (
              <TouchableOpacity onPress={clearProductMode}>
                <Ionicons name="close-circle" size={18} color={Colors.textHint} />
              </TouchableOpacity>
            )}
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

        {/* Active product bar (product mode) */}
        {selectedProduct && (
          <View style={s.activeProductBar}>
            <View style={s.activeDot} />
            <Text style={s.activeProductTxt} numberOfLines={1}>
              {t(selectedProduct.name)}
              {cheapestList.length > 0 && (
                <Text style={s.activeProductCount}>
                  {"  ·  "}
                  {lang === "ru"
                    ? `${cheapestList.length} магазинов`
                    : `${cheapestList.length} ta do'kon`}
                </Text>
              )}
              {isLoadingCheapest && (
                <Text style={s.activeProductCount}>
                  {"  ·  "}
                  {lang === "ru" ? "загрузка..." : "yuklanmoqda..."}
                </Text>
              )}
            </Text>
            <TouchableOpacity
              onPress={clearProductMode}
              hitSlop={8}
              style={s.activeClose}
            >
              <Ionicons name="close" size={14} color={Colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Autocomplete dropdown */}
        {autocompleteOpen && productQuery.trim().length >= 2 && (
          <View style={s.autocomplete}>
            {isSearchingProducts && (
              <View style={s.autocompleteEmpty}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            )}
            {!isSearchingProducts &&
              (productResults?.items?.length ?? 0) === 0 && (
                <View style={s.autocompleteEmpty}>
                  <Ionicons
                    name="search-outline"
                    size={16}
                    color={Colors.textHint}
                  />
                  <Text style={s.autocompleteEmptyTxt}>
                    {lang === "ru" ? "Не найдено" : "Topilmadi"}
                  </Text>
                </View>
              )}
            <FlatList
              data={productResults?.items ?? []}
              keyExtractor={(i: any) => String(i.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }: { item: any }) => {
                const img = item.images?.[0]?.url;
                const imgUri = pinImgUrl(img);
                const unit = item.unit?.short_name
                  ? t(item.unit.short_name)
                  : null;
                return (
                  <TouchableOpacity
                    style={s.acRow}
                    onPress={() => selectProductFromList(item)}
                    activeOpacity={0.8}
                  >
                    {imgUri ? (
                      <Image source={{ uri: imgUri }} style={s.acImg} />
                    ) : (
                      <View style={[s.acImg, s.acImgPlaceholder]}>
                        <Ionicons
                          name="cube-outline"
                          size={16}
                          color={Colors.primaryLight}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.acName} numberOfLines={1}>
                        {t(item.name)}
                      </Text>
                      {unit && <Text style={s.acUnit}>{unit}</Text>}
                    </View>
                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={Colors.textHint}
                    />
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 260 }}
            />
          </View>
        )}

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

      {/* ── Selected price item card (product mode) ────────────── */}
      {selectedProduct && selectedPriceItem && (
        <View style={s.priceCard}>
          {selectedPriceItem.store.logo ? (
            <Image
              source={{ uri: pinImgUrl(selectedPriceItem.store.logo)! }}
              style={s.priceCardLogo}
            />
          ) : (
            <View style={[s.priceCardLogo, s.priceCardLogoPlaceholder]}>
              <Ionicons
                name="storefront"
                size={18}
                color={Colors.primary}
              />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={s.priceCardNameRow}>
              <Text style={s.priceCardStore} numberOfLines={1}>
                {selectedPriceItem.store.name}
              </Text>
              {selectedPriceItem.store.is_prime && (
                <View style={s.primeBadge}>
                  <Ionicons name="star" size={9} color="#F57F17" />
                  <Text style={s.primeBadgeTxt}>Prime</Text>
                </View>
              )}
            </View>
            <Text style={s.priceCardVariant} numberOfLines={1}>
              {t(selectedPriceItem.variant.name)}
              {selectedPriceItem.variant.unit?.short_name
                ? ` · ${t(selectedPriceItem.variant.unit.short_name)}`
                : ""}
            </Text>
            <View style={s.priceCardMeta}>
              {selectedPriceItem.distance_meters != null && (
                <View style={s.priceMetaChip}>
                  <Ionicons
                    name="location-outline"
                    size={10}
                    color={Colors.textHint}
                  />
                  <Text style={s.priceMetaTxt}>
                    {(selectedPriceItem.distance_meters / 1000).toFixed(1)} km
                  </Text>
                </View>
              )}
              {selectedPriceItem.is_free_delivery ? (
                <View style={[s.priceMetaChip, { backgroundColor: "#F0FDF4" }]}>
                  <Ionicons name="gift-outline" size={10} color={Colors.success} />
                  <Text style={[s.priceMetaTxt, { color: Colors.success }]}>
                    {lang === "ru" ? "Бесплатно" : "Tekin"}
                  </Text>
                </View>
              ) : selectedPriceItem.is_deliverable ? (
                <View style={s.priceMetaChip}>
                  <Ionicons name="bicycle-outline" size={10} color={Colors.primary} />
                  <Text style={[s.priceMetaTxt, { color: Colors.primary }]}>
                    {lang === "ru" ? "Доставка" : "Yetkazadi"}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={s.priceCardRight}>
            <Text style={s.priceCardPrice}>
              {Number(selectedPriceItem.price).toLocaleString()}
            </Text>
            <Text style={s.priceCardCurrency}>so'm</Text>
            {(() => {
              const qty = getItemQty(
                selectedPriceItem.store.id,
                selectedPriceItem.store_product_id,
              );
              if (qty === 0) {
                return (
                  <TouchableOpacity
                    style={s.priceAddBtn}
                    onPress={() => incFromMap(selectedPriceItem)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add" size={16} color={Colors.white} />
                  </TouchableOpacity>
                );
              }
              return (
                <View style={s.qtyRow}>
                  <TouchableOpacity
                    style={s.qtyBtn}
                    onPress={() => decFromMap(selectedPriceItem)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={qty === 1 ? "trash-outline" : "remove"}
                      size={13}
                      color={qty === 1 ? Colors.error : Colors.primary}
                    />
                  </TouchableOpacity>
                  <Text style={s.qtyTxt}>{qty}</Text>
                  <TouchableOpacity
                    style={[s.qtyBtn, s.qtyBtnAdd]}
                    onPress={() => incFromMap(selectedPriceItem)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={13} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              );
            })()}
          </View>
        </View>
      )}

      {/* ── Selected store card (oddiy mode) ────────────────────── */}
      {!selectedProduct && selectedStore && (
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

  // Search box (product search)
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.white,
    height: 40,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    ...Shadow.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    padding: 0,
  },

  // Active product bar
  activeProductBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: Spacing.md,
    marginTop: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    ...Shadow.md,
  },
  activeDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: "#FFD54F",
  },
  activeProductTxt: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: Colors.white,
  },
  activeProductCount: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
  },
  activeClose: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },

  // Autocomplete
  autocomplete: {
    marginHorizontal: Spacing.md,
    marginTop: 6,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 4,
    ...Shadow.lg,
  },
  autocompleteEmpty: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: Spacing.md,
  },
  autocompleteEmptyTxt: { fontSize: 12, color: Colors.textHint },
  acRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  acImg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  acImgPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySurface,
  },
  acName: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  acUnit: { fontSize: 11, color: Colors.textHint, marginTop: 1 },

  // Price card (product mode bottom sheet)
  priceCard: {
    position: "absolute",
    left: Spacing.md,
    right: Spacing.md,
    bottom: Platform.OS === "ios" ? 32 : Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    ...Shadow.lg,
  },
  priceCardLogo: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.background,
  },
  priceCardLogoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySurface,
  },
  priceCardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priceCardStore: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  priceCardVariant: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  priceCardMeta: {
    flexDirection: "row",
    gap: 4,
    marginTop: 5,
    flexWrap: "wrap",
  },
  priceMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  priceMetaTxt: { fontSize: 10, fontWeight: "600", color: Colors.textHint },

  priceCardRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  priceCardPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.primary,
  },
  priceCardCurrency: {
    fontSize: 10,
    color: Colors.textHint,
    marginTop: -3,
  },
  priceAddBtn: {
    marginTop: 4,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: Colors.primarySurface,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnAdd: { backgroundColor: Colors.primary },
  qtyTxt: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    minWidth: 18,
    textAlign: "center",
  },

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

// ─── Store marker styles ──────────────────────────────────────────────────
// Outer — transparent padding bilan Android Marker snapshot clipping ni oldini oladi
const mk = StyleSheet.create({
  outer: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  pinHead: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: Colors.white,
    overflow: "hidden",
  },
  pinHeadActive: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
  },
  pinHeadPrime: {
    borderColor: "#F57F17",
    borderWidth: 3,
  },
  pinLogo: {
    width: "100%",
    height: "100%",
  },
});

// ─── Price marker styles (location pin) ───────────────────────────────────
const pm = StyleSheet.create({
  outer: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  flashBadge: {
    position: "absolute",
    top: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#FFC107",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.white,
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
