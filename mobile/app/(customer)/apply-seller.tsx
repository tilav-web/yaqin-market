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

interface Field {
  key: string;
  label: string;
  placeholder: string;
  icon: IoniconsName;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
}

const FIELDS: Field[] = [
  { key: 'store_name',         label: "Do'kon nomi",          placeholder: "Masalan: Fresh Market",     icon: 'storefront-outline' },
  { key: 'owner_name',         label: 'Mas\'ul shaxs',        placeholder: 'To\'liq ism',               icon: 'person-outline' },
  { key: 'phone',              label: 'Aloqa raqami',          placeholder: '90 123 45 67',              icon: 'call-outline', keyboardType: 'phone-pad' },
  { key: 'store_address',      label: "Do'kon manzili",        placeholder: 'Shahar, ko\'cha, uy',       icon: 'location-outline' },
  { key: 'notes',              label: 'Qo\'shimcha ma\'lumot', placeholder: "Do'kon haqida qisqacha...", icon: 'document-text-outline', multiline: true },
];

export default function ApplySellerScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    router.replace('/(auth)/login');
    return null;
  }

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    const missing = FIELDS.filter(f => !f.multiline && !form[f.key]);
    if (missing.length > 0) {
      Alert.alert('Maydon to\'ldiring', `${missing[0].label} kiritilmagan`);
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/applications/seller', {
        store_name:    form.store_name,
        owner_name:    form.owner_name,
        phone:         form.phone,
        store_address: form.store_address,
        notes:         form.notes ?? '',
      });
      Alert.alert('Ariza qabul qilindi!', "Arizangiz ko'rib chiqilmoqda. Tez orada javob beramiz.", [
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
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Sotuvchi bo'lish</Text>
          <Text style={s.subtitle}>Do'koningizni oching</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Info banner */}
        <View style={s.infoBanner}>
          <View style={s.infoBannerIcon}>
            <Ionicons name="information-circle" size={20} color="#2196F3" />
          </View>
          <Text style={s.infoBannerTxt}>
            Ariza yuborilgandan so'ng 1-3 ish kuni ichida ko'rib chiqiladi va sizga xabar beriladi.
          </Text>
        </View>

        {/* Features */}
        <View style={s.featuresCard}>
          {[
            { icon: 'trending-up-outline' as IoniconsName,  txt: "Ko'proq mijozlarga yeting" },
            { icon: 'notifications-outline' as IoniconsName, txt: 'Real vaqt buyurtmalar' },
            { icon: 'analytics-outline' as IoniconsName,     txt: "Sotuv statistikasini ko'ring" },
          ].map((f, i) => (
            <View key={i} style={[s.featureRow, i < 2 && { borderBottomWidth: 1, borderBottomColor: Colors.divider }]}>
              <View style={s.featureIcon}>
                <Ionicons name={f.icon} size={16} color={Colors.primary} />
              </View>
              <Text style={s.featureTxt}>{f.txt}</Text>
            </View>
          ))}
        </View>

        {/* Form */}
        <Text style={s.formTitle}>Ma'lumotlaringizni kiriting</Text>
        {FIELDS.map(field => (
          <View key={field.key} style={s.fieldWrap}>
            <Text style={s.label}>{field.label}</Text>
            <View style={[s.inputRow, field.multiline && { height: 90, alignItems: 'flex-start', paddingTop: 12 }]}>
              <Ionicons name={field.icon} size={17} color={Colors.textHint} style={{ marginTop: field.multiline ? 0 : 0 }} />
              <TextInput
                style={[s.input, field.multiline && { height: 70, textAlignVertical: 'top' }]}
                value={form[field.key] ?? ''}
                onChangeText={v => set(field.key, v)}
                placeholder={field.placeholder}
                placeholderTextColor={Colors.textHint}
                multiline={field.multiline}
                keyboardType={field.keyboardType ?? 'default'}
              />
            </View>
          </View>
        ))}

        {/* Submit */}
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
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Platform.OS === 'android' ? Spacing.xs : 0,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.md },

  infoBanner: {
    flexDirection: 'row', gap: Spacing.sm,
    backgroundColor: '#E3F2FD',
    borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: '#BBDEFB',
  },
  infoBannerIcon: { marginTop: 1 },
  infoBannerTxt: { flex: 1, fontSize: 13, color: '#1565C0', lineHeight: 19 },

  featuresCard: { backgroundColor: Colors.white, borderRadius: Radius.lg, ...Shadow.sm, overflow: 'hidden' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  featureIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  featureTxt: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },

  formTitle: { fontSize: 13, fontWeight: '700', color: Colors.textHint, textTransform: 'uppercase', letterSpacing: 0.6, paddingLeft: 2 },

  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, paddingLeft: 2 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, height: 52,
    ...Shadow.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, fontSize: 14, color: Colors.textPrimary },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg, height: 54,
    ...Shadow.md, marginTop: Spacing.sm,
  },
  submitTxt: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
