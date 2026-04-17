import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { apiClient } from '../../src/api/client';
import { useAuthStore } from '../../src/store/auth.store';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TRANSPORT_TYPES = [
  { value: 'bicycle',    label: 'Velosiped',  icon: 'bicycle-outline' as IoniconsName },
  { value: 'motorcycle', label: 'Mototsikl',  icon: 'bicycle-outline' as IoniconsName },
  { value: 'car',        label: 'Avtomobil',  icon: 'car-outline' as IoniconsName },
  { value: 'on_foot',    label: 'Piyoda',     icon: 'walk-outline' as IoniconsName },
];

export default function ApplyCourierScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [transport, setTransport] = useState('');
  const [form, setForm] = useState({ phone: '', vehicle_number: '', notes: '' });
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    router.replace('/(auth)/login');
    return null;
  }

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.phone) { Alert.alert('Telefon raqam kiriting'); return; }
    if (!transport)  { Alert.alert('Transport turini tanlang'); return; }
    setLoading(true);
    try {
      await apiClient.post('/applications/courier', {
        phone:          form.phone,
        transport_type: transport,
        vehicle_number: form.vehicle_number,
        notes:          form.notes,
      });
      Alert.alert('Ariza qabul qilindi!', "Tez orada siz bilan bog'lanamiz.", [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Xato', e?.response?.data?.message ?? 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Kuryer bo'lish</Text>
          <Text style={s.subtitle}>Bo'sh vaqtingizda ishlang</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Info */}
        <View style={s.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#FF5722" />
          <Text style={s.infoBannerTxt}>
            Ariza yuborilgandan so'ng 1-3 ish kuni ichida ko'rib chiqiladi.
          </Text>
        </View>

        {/* Benefits */}
        <View style={s.featuresCard}>
          {[
            { icon: 'time-outline' as IoniconsName,        txt: 'O\'z jadvalingizda ishlang' },
            { icon: 'cash-outline' as IoniconsName,         txt: 'Har kuni to\'lov' },
            { icon: 'map-outline' as IoniconsName,          txt: 'Yaqin atrofdagi buyurtmalar' },
          ].map((f, i) => (
            <View key={i} style={[s.featureRow, i < 2 && { borderBottomWidth: 1, borderBottomColor: Colors.divider }]}>
              <View style={[s.featureIcon, { backgroundColor: '#FBE9E7' }]}>
                <Ionicons name={f.icon} size={16} color="#FF5722" />
              </View>
              <Text style={s.featureTxt}>{f.txt}</Text>
            </View>
          ))}
        </View>

        {/* Transport type */}
        <Text style={s.formTitle}>Transport turi</Text>
        <View style={s.transportGrid}>
          {TRANSPORT_TYPES.map(t => {
            const active = transport === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[s.transportCard, active && s.transportCardActive]}
                onPress={() => setTransport(t.value)}
                activeOpacity={0.8}
              >
                <View style={[s.transportIcon, active && s.transportIconActive]}>
                  <Ionicons name={t.icon} size={22} color={active ? Colors.white : Colors.textSecondary} />
                </View>
                <Text style={[s.transportLabel, active && s.transportLabelActive]}>{t.label}</Text>
                {active && (
                  <View style={s.transportCheck}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Form fields */}
        <Text style={s.formTitle}>Ma'lumotlaringiz</Text>

        {[
          { key: 'phone',          label: 'Telefon raqami',   placeholder: '90 123 45 67', icon: 'call-outline' as IoniconsName,       keyboard: 'phone-pad' as const },
          { key: 'vehicle_number', label: 'Davlat raqami',    placeholder: '01 A 001 AA',  icon: 'card-outline' as IoniconsName,       keyboard: 'default' as const },
          { key: 'notes',          label: 'Qo\'shimcha',      placeholder: 'Ixtiyoriy...',  icon: 'chatbox-outline' as IoniconsName,    keyboard: 'default' as const },
        ].map(f => (
          <View key={f.key} style={s.fieldWrap}>
            <Text style={s.label}>{f.label}</Text>
            <View style={s.inputRow}>
              <Ionicons name={f.icon} size={17} color={Colors.textHint} />
              <TextInput
                style={s.input}
                value={(form as any)[f.key] ?? ''}
                onChangeText={v => set(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor={Colors.textHint}
                keyboardType={f.keyboard}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[s.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Ionicons name="send" size={18} color={Colors.white} />
          <Text style={s.submitTxt}>{loading ? 'Yuborilmoqda...' : 'Ariza yuborish'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    backgroundColor: '#FF5722',
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.xs : 0,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md },

  infoBanner: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start',
    backgroundColor: '#FBE9E7', borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: '#FFCCBC',
  },
  infoBannerTxt: { flex: 1, fontSize: 13, color: '#BF360C', lineHeight: 19 },

  featuresCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, ...Shadow.sm, overflow: 'hidden' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  featureIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  featureTxt: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },

  formTitle: { fontSize: 11, fontWeight: '700', color: Colors.textHint, textTransform: 'uppercase', letterSpacing: 0.6, paddingLeft: 2 },

  transportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  transportCard: {
    width: '47%',
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center', gap: Spacing.sm,
    ...Shadow.sm, borderWidth: 1.5, borderColor: Colors.border,
    position: 'relative',
  },
  transportCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primarySurface },
  transportIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center',
  },
  transportIconActive: { backgroundColor: Colors.primary },
  transportLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  transportLabelActive: { color: Colors.primary },
  transportCheck: { position: 'absolute', top: 8, right: 8 },

  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, paddingLeft: 2 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, height: 52,
    ...Shadow.sm, borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, fontSize: 14, color: Colors.textPrimary },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: '#FF5722', borderRadius: Radius.lg, height: 54,
    ...Shadow.md, marginTop: Spacing.sm,
  },
  submitTxt: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
