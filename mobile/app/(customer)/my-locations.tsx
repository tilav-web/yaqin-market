import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { useTranslation } from '../../src/i18n';
import { useAuthStore } from '../../src/store/auth.store';
import { useLocationStore } from '../../src/store/location.store';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface SavedLocation {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  type: 'home' | 'work' | 'other';
}

const LABEL_OPTIONS_UZ = [
  { type: 'home' as const, label: 'Uyim', icon: 'home-outline' as IoniconsName },
  { type: 'work' as const, label: 'Ishxonam', icon: 'briefcase-outline' as IoniconsName },
  { type: 'other' as const, label: 'Boshqa', icon: 'location-outline' as IoniconsName },
];

const LABEL_OPTIONS_RU = [
  { type: 'home' as const, label: 'Дом', icon: 'home-outline' as IoniconsName },
  { type: 'work' as const, label: 'Работа', icon: 'briefcase-outline' as IoniconsName },
  { type: 'other' as const, label: 'Другое', icon: 'location-outline' as IoniconsName },
];

const TYPE_ICONS: Record<string, IoniconsName> = {
  home: 'home',
  work: 'briefcase',
  other: 'location',
};

const TYPE_COLORS: Record<string, string> = {
  home: Colors.primary,
  work: Colors.info,
  other: Colors.warning,
};

let nextId = 1;

export default function MyLocationsScreen() {
  const router = useRouter();
  const { lang, tr } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const { lat: userLat, lng: userLng } = useLocationStore();

  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Modal form state
  const [selectedType, setSelectedType] = useState<'home' | 'work' | 'other'>('home');
  const [address, setAddress] = useState('');
  const [markerLat, setMarkerLat] = useState(userLat ?? 41.2995);
  const [markerLng, setMarkerLng] = useState(userLng ?? 69.2401);
  const mapRef = useRef<MapView>(null);

  const labelOptions = lang === 'ru' ? LABEL_OPTIONS_RU : LABEL_OPTIONS_UZ;
  const pageTitle = lang === 'ru' ? 'Мои адреса' : 'Manzillarim';

  // Not logged in
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={s.title}>{pageTitle}</Text>
        </View>
        <View style={s.loginWrap}>
          <View style={s.loginIconBox}>
            <Ionicons name="location-outline" size={44} color={Colors.primaryLight} />
          </View>
          <Text style={s.loginTitle}>
            {lang === 'ru' ? 'Войдите, чтобы сохранять адреса' : "Manzillarni saqlash uchun kiring"}
          </Text>
          <Text style={s.loginSub}>
            {lang === 'ru' ? 'Ваши сохранённые адреса будут здесь' : "Saqlangan manzillaringiz shu yerda ko'rinadi"}
          </Text>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/(auth)/login')} activeOpacity={0.85}>
            <Ionicons name="log-in-outline" size={18} color={Colors.white} />
            <Text style={s.loginBtnTxt}>{tr('login')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const openAddModal = () => {
    setEditingId(null);
    setSelectedType('home');
    setAddress('');
    setMarkerLat(userLat ?? 41.2995);
    setMarkerLng(userLng ?? 69.2401);
    setModalVisible(true);
  };

  const openEditModal = (loc: SavedLocation) => {
    setEditingId(loc.id);
    setSelectedType(loc.type);
    setAddress(loc.address);
    setMarkerLat(loc.lat);
    setMarkerLng(loc.lng);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!address.trim()) {
      Alert.alert(
        lang === 'ru' ? 'Ошибка' : 'Xato',
        lang === 'ru' ? 'Введите адрес' : 'Manzilni kiriting',
      );
      return;
    }

    const labelObj = labelOptions.find((o) => o.type === selectedType)!;

    if (editingId) {
      setLocations((prev) =>
        prev.map((l) =>
          l.id === editingId
            ? { ...l, type: selectedType, label: labelObj.label, address: address.trim(), lat: markerLat, lng: markerLng }
            : l,
        ),
      );
    } else {
      const newLoc: SavedLocation = {
        id: String(nextId++),
        type: selectedType,
        label: labelObj.label,
        address: address.trim(),
        lat: markerLat,
        lng: markerLng,
      };
      setLocations((prev) => [...prev, newLoc]);
    }

    setModalVisible(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      lang === 'ru' ? 'Удалить адрес?' : "Manzilni o'chirish?",
      lang === 'ru' ? 'Это действие нельзя отменить' : "Bu amalni ortga qaytarib bo'lmaydi",
      [
        { text: lang === 'ru' ? 'Отмена' : 'Bekor qilish', style: 'cancel' },
        {
          text: lang === 'ru' ? 'Удалить' : "O'chirish",
          style: 'destructive',
          onPress: () => setLocations((prev) => prev.filter((l) => l.id !== id)),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>{pageTitle}</Text>
        <Text style={s.subtitle}>
          {locations.length} {lang === 'ru' ? 'адресов' : 'ta manzil'}
        </Text>
      </View>

      {/* Location list */}
      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconBox}>
              <Ionicons name="location-outline" size={44} color={Colors.primaryLight} />
            </View>
            <Text style={s.emptyTitle}>
              {lang === 'ru' ? 'Нет сохранённых адресов' : "Saqlangan manzillar yo'q"}
            </Text>
            <Text style={s.emptySub}>
              {lang === 'ru'
                ? 'Добавьте адрес, чтобы быстро оформлять заказы'
                : "Buyurtmani tez rasmiylashtirish uchun manzil qo'shing"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={[s.cardIcon, { backgroundColor: TYPE_COLORS[item.type] + '18' }]}>
              <Ionicons name={TYPE_ICONS[item.type]} size={22} color={TYPE_COLORS[item.type]} />
            </View>
            <View style={s.cardContent}>
              <Text style={s.cardLabel}>{item.label}</Text>
              <Text style={s.cardAddress} numberOfLines={2}>{item.address}</Text>
            </View>
            <View style={s.cardActions}>
              <TouchableOpacity onPress={() => openEditModal(item)} style={s.actionBtn} activeOpacity={0.7}>
                <Ionicons name="create-outline" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={s.actionBtn} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add button */}
      <View style={s.addBtnWrap}>
        <TouchableOpacity style={s.addBtn} onPress={openAddModal} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
          <Text style={s.addBtnTxt}>
            {lang === 'ru' ? 'Добавить адрес' : "Manzil qo'shish"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.modalOverlay}
        >
          <View style={s.modalContent}>
            {/* Modal header */}
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>
                {editingId
                  ? (lang === 'ru' ? 'Редактировать адрес' : "Manzilni tahrirlash")
                  : (lang === 'ru' ? 'Новый адрес' : "Yangi manzil")}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Map */}
              <View style={s.mapWrap}>
                <MapView
                  ref={mapRef}
                  style={s.map}
                  initialRegion={{
                    latitude: markerLat,
                    longitude: markerLng,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  onPress={(e) => {
                    setMarkerLat(e.nativeEvent.coordinate.latitude);
                    setMarkerLng(e.nativeEvent.coordinate.longitude);
                  }}
                >
                  <Marker
                    coordinate={{ latitude: markerLat, longitude: markerLng }}
                    draggable
                    onDragEnd={(e) => {
                      setMarkerLat(e.nativeEvent.coordinate.latitude);
                      setMarkerLng(e.nativeEvent.coordinate.longitude);
                    }}
                  />
                </MapView>
                <Text style={s.mapHint}>
                  {lang === 'ru' ? 'Нажмите на карту или перетащите маркер' : "Xaritaga bosing yoki markerni suring"}
                </Text>
              </View>

              {/* Type chips */}
              <Text style={s.fieldLabel}>{lang === 'ru' ? 'Тип' : 'Turi'}</Text>
              <View style={s.chipRow}>
                {labelOptions.map((opt) => {
                  const active = selectedType === opt.type;
                  return (
                    <TouchableOpacity
                      key={opt.type}
                      style={[s.chip, active && s.chipActive]}
                      onPress={() => setSelectedType(opt.type)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={16}
                        color={active ? Colors.white : Colors.textSecondary}
                      />
                      <Text style={[s.chipTxt, active && s.chipTxtActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Address input */}
              <Text style={s.fieldLabel}>{lang === 'ru' ? 'Адрес' : 'Manzil'}</Text>
              <TextInput
                style={s.input}
                placeholder={lang === 'ru' ? 'Введите адрес...' : 'Manzilni kiriting...'}
                placeholderTextColor={Colors.textHint}
                value={address}
                onChangeText={setAddress}
                multiline
              />

              {/* Save button */}
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                <Text style={s.saveBtnTxt}>{lang === 'ru' ? 'Сохранить' : 'Saqlash'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },

  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.xs : 0,
    paddingBottom: Spacing.md,
    gap: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },

  list: { flexGrow: 1, backgroundColor: Colors.background, padding: Spacing.md, gap: Spacing.sm, paddingBottom: 100 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1, gap: 2 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardAddress: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  cardActions: { flexDirection: 'row', gap: 4 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addBtnWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    backgroundColor: Colors.background,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.full,
    ...Shadow.md,
  },
  addBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: Spacing.sm },
  emptyIconBox: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', paddingHorizontal: 40 },

  loginWrap: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  loginIconBox: { width: 96, height: 96, borderRadius: 28, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  loginTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  loginSub: { fontSize: 13, color: Colors.textHint, textAlign: 'center', lineHeight: 19 },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 13,
    borderRadius: Radius.full, marginTop: Spacing.sm, ...Shadow.sm,
  },
  loginBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.md,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },

  mapWrap: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  map: { height: 250, width: '100%' },
  mapHint: {
    fontSize: 11,
    color: Colors.textHint,
    textAlign: 'center',
    paddingVertical: 6,
    backgroundColor: Colors.background,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTxtActive: { color: Colors.white },

  input: {
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    minHeight: 48,
    textAlignVertical: 'top',
  },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: Radius.full,
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  saveBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
});
