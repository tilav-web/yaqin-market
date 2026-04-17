import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { storesApi } from '../../src/api/stores';

// Convert meters <-> km helpers (inputlar km da ishlaydi, backend metrda saqlaydi)
const metersToKm = (m?: number | string) => {
  const n = Number(m ?? 0);
  return n ? String(n / 1000) : '';
};
const kmToMeters = (km: string) => {
  const n = parseFloat(km.replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 1000) : 0;
};

export default function DeliverySettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: myStores } = useQuery({
    queryKey: ['my-stores'],
    queryFn: storesApi.getMyStores,
  });
  const store = myStores?.[0];
  const storeId = store?.id;

  const [enabled, setEnabled] = useState(true);
  const [maxRadiusKm, setMaxRadiusKm] = useState('');
  const [freeRadiusKm, setFreeRadiusKm] = useState('');
  const [pricePerKm, setPricePerKm] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const d = store?.deliverySettings?.[0];
    if (!d) return;
    setEnabled(d.is_delivery_enabled ?? true);
    setMaxRadiusKm(metersToKm(d.max_delivery_radius));
    setFreeRadiusKm(metersToKm(d.free_delivery_radius));
    setPricePerKm(d.delivery_price_per_km != null ? String(Math.round(Number(d.delivery_price_per_km))) : '');
    setMinOrder(d.min_order_amount != null ? String(Math.round(Number(d.min_order_amount))) : '');
    setDeliveryFee(d.delivery_fee != null ? String(Math.round(Number(d.delivery_fee))) : '');
    setPrepTime(d.preparation_time != null ? String(d.preparation_time) : '');
    setNote(d.delivery_note ?? '');
  }, [store?.id]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        is_delivery_enabled: enabled,
        max_delivery_radius: kmToMeters(maxRadiusKm),
        free_delivery_radius: kmToMeters(freeRadiusKm),
        delivery_price_per_km: parseFloat(pricePerKm) || 0,
        min_order_amount: parseFloat(minOrder) || 0,
        delivery_fee: parseFloat(deliveryFee) || 0,
        preparation_time: parseInt(prepTime) || 15,
        delivery_note: note || null,
      };
      return storesApi.updateDeliverySettings(storeId!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-stores'] });
      Alert.alert('Saqlandi', 'Yetkazib berish sozlamalari yangilandi');
    },
    onError: (e: any) => {
      Alert.alert('Xato', e?.response?.data?.message ?? 'Xato yuz berdi');
    },
  });

  const handleSave = () => {
    const max = parseFloat(maxRadiusKm);
    const free = parseFloat(freeRadiusKm);
    if (!max || max <= 0) {
      Alert.alert('Xato', 'Maksimal yetkazib berish radiusi 0 dan katta bo\'lsin');
      return;
    }
    if (free > max) {
      Alert.alert('Xato', 'Tekin yetkazib berish radiusi maksimal radiusdan katta bo\'lishi mumkin emas');
      return;
    }
    saveMutation.mutate();
  };

  // Preview — 1 km uchun narx
  const previewFee = () => {
    const pricePerKmN = parseFloat(pricePerKm) || 0;
    const fee100m = (pricePerKmN / 10).toFixed(0);
    return `${Number(fee100m).toLocaleString()} so'm/100m`;
  };

  if (!storeId) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </TouchableOpacity>
          <Text style={s.title}>Yetkazib berish</Text>
        </View>
        <View style={s.center}>
          <Text>Do'kon topilmadi</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>Yetkazib berish</Text>
        <Text style={s.subtitle}>Radiuslar va narxlar</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Enable toggle */}
        <TouchableOpacity
          style={s.toggleRow}
          onPress={() => setEnabled((v) => !v)}
          activeOpacity={0.85}
        >
          <View style={[s.toggleIcon, { backgroundColor: enabled ? '#E8F5E9' : Colors.background }]}>
            <Ionicons name="bicycle" size={20} color={enabled ? Colors.success : Colors.textHint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleLabel}>Yetkazib berish</Text>
            <Text style={s.toggleSub}>
              {enabled ? 'Yoqilgan' : "O'chirilgan"}
            </Text>
          </View>
          <View style={[s.switch, enabled && s.switchActive]}>
            <View style={[s.switchDot, enabled && s.switchDotActive]} />
          </View>
        </TouchableOpacity>

        {/* Max radius */}
        <Text style={s.sectionLabel}>Maksimal yetkazib berish radiusi</Text>
        <Text style={s.helper}>
          Do'koningiz shu masofadagi xaridorlarga yetkazib beradi
        </Text>
        <View style={s.inputWrap}>
          <Ionicons name="locate-outline" size={18} color={Colors.primary} />
          <TextInput
            style={s.input}
            value={maxRadiusKm}
            onChangeText={setMaxRadiusKm}
            placeholder="Masalan: 1 (km)"
            placeholderTextColor={Colors.textHint}
            keyboardType="decimal-pad"
          />
          <Text style={s.unit}>km</Text>
        </View>

        {/* Free radius */}
        <Text style={s.sectionLabel}>Tekin yetkazib berish radiusi</Text>
        <Text style={s.helper}>
          Shu masofagacha yetkazib berish <Text style={{ fontWeight: '700' }}>tekin</Text>. 0 = tekin yetkazib berish yo'q
        </Text>
        <View style={s.inputWrap}>
          <Ionicons name="gift-outline" size={18} color={Colors.success} />
          <TextInput
            style={s.input}
            value={freeRadiusKm}
            onChangeText={setFreeRadiusKm}
            placeholder="Masalan: 0.5 (km)"
            placeholderTextColor={Colors.textHint}
            keyboardType="decimal-pad"
          />
          <Text style={s.unit}>km</Text>
        </View>

        {/* Price per km */}
        <Text style={s.sectionLabel}>Tekin radius tashqarisi uchun narx (1 km)</Text>
        <Text style={s.helper}>
          Mas: 10 000 so'm/km = har 100m uchun 1 000 so'm
        </Text>
        <View style={s.inputWrap}>
          <Ionicons name="cash-outline" size={18} color={Colors.primary} />
          <TextInput
            style={s.input}
            value={pricePerKm}
            onChangeText={setPricePerKm}
            placeholder="Masalan: 10000"
            placeholderTextColor={Colors.textHint}
            keyboardType="numeric"
          />
          <Text style={s.unit}>so'm/km</Text>
        </View>
        {!!pricePerKm && (
          <Text style={s.previewTxt}>≈ {previewFee()}</Text>
        )}

        {/* Base fee */}
        <Text style={s.sectionLabel}>Doimiy yetkazib berish xizmati</Text>
        <Text style={s.helper}>Radius tashqarisi uchun qo'shimcha fixed haq (ixtiyoriy)</Text>
        <View style={s.inputWrap}>
          <Ionicons name="card-outline" size={18} color={Colors.primary} />
          <TextInput
            style={s.input}
            value={deliveryFee}
            onChangeText={setDeliveryFee}
            placeholder="0"
            placeholderTextColor={Colors.textHint}
            keyboardType="numeric"
          />
          <Text style={s.unit}>so'm</Text>
        </View>

        {/* Min order */}
        <Text style={s.sectionLabel}>Minimal buyurtma summasi</Text>
        <View style={s.inputWrap}>
          <Ionicons name="wallet-outline" size={18} color={Colors.primary} />
          <TextInput
            style={s.input}
            value={minOrder}
            onChangeText={setMinOrder}
            placeholder="0"
            placeholderTextColor={Colors.textHint}
            keyboardType="numeric"
          />
          <Text style={s.unit}>so'm</Text>
        </View>

        {/* Prep time */}
        <Text style={s.sectionLabel}>Tayyorlash vaqti</Text>
        <View style={s.inputWrap}>
          <Ionicons name="time-outline" size={18} color={Colors.primary} />
          <TextInput
            style={s.input}
            value={prepTime}
            onChangeText={setPrepTime}
            placeholder="15"
            placeholderTextColor={Colors.textHint}
            keyboardType="numeric"
          />
          <Text style={s.unit}>min</Text>
        </View>

        {/* Note */}
        <Text style={s.sectionLabel}>Qo'shimcha eslatma</Text>
        <View style={[s.inputWrap, { height: 90, alignItems: 'flex-start' }]}>
          <Ionicons name="create-outline" size={18} color={Colors.primary} style={{ marginTop: 3 }} />
          <TextInput
            style={[s.input, { textAlignVertical: 'top', paddingTop: 6 }]}
            value={note}
            onChangeText={setNote}
            placeholder="Mas. Yetkazib berish vaqti 15-30 daqiqa"
            placeholderTextColor={Colors.textHint}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[s.saveBtn, saveMutation.isPending && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saveMutation.isPending}
          activeOpacity={0.85}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={s.saveBtnTxt}>Saqlash</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
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
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    gap: 4,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xs },
  title: { fontSize: 22, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadow.sm,
    marginBottom: Spacing.sm,
  },
  toggleIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  toggleSub: { fontSize: 12, color: Colors.textHint, marginTop: 2 },
  switch: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: Colors.divider,
    padding: 3, justifyContent: 'center',
  },
  switchActive: { backgroundColor: Colors.success },
  switchDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.white, ...Shadow.sm },
  switchDotActive: { alignSelf: 'flex-end' },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textHint, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.md, paddingLeft: 4 },
  helper: { fontSize: 11, color: Colors.textHint, paddingLeft: 4, marginBottom: 6, marginTop: 2, lineHeight: 16 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    height: 50, paddingHorizontal: Spacing.md, ...Shadow.sm,
  },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  unit: { fontSize: 12, color: Colors.textHint, fontWeight: '600' },
  previewTxt: { fontSize: 12, color: Colors.primary, fontWeight: '600', paddingLeft: 4, marginTop: 4 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, height: 52, borderRadius: Radius.lg,
    backgroundColor: Colors.primary, ...Shadow.md,
    marginTop: Spacing.lg,
  },
  saveBtnTxt: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
