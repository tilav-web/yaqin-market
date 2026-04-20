import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { apiClient } from '../../src/api/client';
import { useAuthStore } from '../../src/store/auth.store';
import { useLocationStore } from '../../src/store/location.store';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type LegalType = 'SOLE_PROPRIETOR' | 'LEGAL_ENTITY' | 'SELF_EMPLOYED';

const LEGAL_TYPES: { value: LegalType; label: string; sub: string }[] = [
  { value: 'SOLE_PROPRIETOR', label: 'Yakka tartibdagi tadbirkor', sub: 'YTT' },
  { value: 'LEGAL_ENTITY', label: 'Yuridik shaxs', sub: 'MCHJ, OAJ va h.k.' },
  { value: 'SELF_EMPLOYED', label: "O'z-o'zini band qilgan", sub: 'Self-employed' },
];

// ─── Field Component ─────────────────────────────────────────────────────────
function FormField({
  label, icon, value, onChange, placeholder, keyboardType, multiline, hint, required,
}: {
  label: string;
  icon: IoniconsName;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric' | 'email-address';
  multiline?: boolean;
  hint?: string;
  required?: boolean;
}) {
  return (
    <View style={s.fieldWrap}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        {required && <Text style={s.required}>*</Text>}
      </View>
      <View style={[s.inputRow, multiline && s.inputRowMulti]}>
        <Ionicons name={icon} size={17} color={Colors.textHint} />
        <TextInput
          style={[s.input, multiline && s.inputMulti]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textHint}
          multiline={multiline}
          keyboardType={keyboardType ?? 'default'}
        />
      </View>
      {hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ApplySellerScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { lat: userLat, lng: userLng, address: userAddress } = useLocationStore();
  const [loading, setLoading] = useState(false);

  // Store fields
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeLat, setStoreLat] = useState<number | null>(null);
  const [storeLng, setStoreLng] = useState<number | null>(null);
  const [note, setNote] = useState('');

  // Legal fields
  const [legalType, setLegalType] = useState<LegalType>('SOLE_PROPRIETOR');
  const [officialName, setOfficialName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [tin, setTin] = useState('');
  const [regNo, setRegNo] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [licenseUntil, setLicenseUntil] = useState(''); // YYYY-MM-DD

  if (!isAuthenticated) {
    router.replace('/(auth)/login');
    return null;
  }

  const useCurrentLocation = () => {
    if (userLat == null || userLng == null) {
      Alert.alert('Joylashuv mavjud emas', 'Avval location ruxsatini yoqing va kuting.');
      return;
    }
    setStoreLat(userLat);
    setStoreLng(userLng);
    if (userAddress && !storeAddress) setStoreAddress(userAddress);
  };

  const handleSubmit = async () => {
    // Required minimal validation
    if (!storeName.trim()) return Alert.alert('Xato', "Do'kon nomini kiriting");
    if (!phone.trim()) return Alert.alert('Xato', 'Aloqa raqamini kiriting');
    if (!storePhone.trim()) return Alert.alert('Xato', "Do'kon telefonini kiriting");
    if (!officialName.trim())
      return Alert.alert('Xato', "Rasmiy nomni (huquqiy bo'limda) kiriting");

    setLoading(true);
    try {
      const payload: any = {
        store_name: storeName.trim(),
        phone: phone.trim(),
        store_phone: storePhone.trim(),
        legal: {
          type: legalType,
          official_name: officialName.trim(),
        },
      };
      if (ownerName.trim()) payload.owner_name = ownerName.trim();
      if (legalName.trim()) payload.legal_name = legalName.trim();
      if (storeAddress.trim()) payload.store_address = storeAddress.trim();
      if (storeLat != null) payload.store_lat = storeLat;
      if (storeLng != null) payload.store_lng = storeLng;
      if (note.trim()) payload.note = note.trim();

      if (tin.trim()) payload.legal.tin = tin.trim();
      if (regNo.trim()) payload.legal.reg_no = regNo.trim();
      if (regAddress.trim()) payload.legal.reg_address = regAddress.trim();
      if (bankName.trim()) payload.legal.bank_name = bankName.trim();
      if (bankAccount.trim()) payload.legal.bank_account = bankAccount.trim();
      if (licenseNo.trim()) payload.legal.license_no = licenseNo.trim();
      if (licenseUntil.trim()) payload.legal.license_until = licenseUntil.trim();

      await apiClient.post('/applications/seller', payload);
      Alert.alert(
        'Ariza qabul qilindi!',
        "Arizangiz ko'rib chiqilmoqda. Tez orada javob beramiz.",
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      Alert.alert('Xato', Array.isArray(msg) ? msg.join('\n') : (msg ?? 'Xato yuz berdi'));
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
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Sotuvchi bo'lish</Text>
          <Text style={s.subtitle}>Do'koningizni oching</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <View style={s.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#2196F3" />
          <Text style={s.infoBannerTxt}>
            Ariza 1-3 ish kuni ichida ko'rib chiqiladi. Majburiy maydonlar{' '}
            <Text style={{ color: Colors.primary, fontWeight: '700' }}>*</Text> bilan belgilangan.
          </Text>
        </View>

        {/* SECTION 1: Store info */}
        <View style={s.sectionHeader}>
          <View style={s.sectionIconBox}>
            <Ionicons name="storefront" size={16} color={Colors.primary} />
          </View>
          <Text style={s.sectionTitle}>Do'kon ma'lumotlari</Text>
        </View>

        <FormField
          label="Do'kon nomi" required
          icon="storefront-outline"
          value={storeName} onChange={setStoreName}
          placeholder="Masalan: Fresh Market"
        />
        <FormField
          label="Mas'ul shaxs"
          icon="person-outline"
          value={ownerName} onChange={setOwnerName}
          placeholder="To'liq ism familiya"
        />
        <FormField
          label="Aloqa raqami" required
          icon="call-outline"
          value={phone} onChange={setPhone}
          placeholder="90 123 45 67"
          keyboardType="phone-pad"
          hint="Sizning shaxsiy raqamingiz"
        />
        <FormField
          label="Do'kon telefoni" required
          icon="business-outline"
          value={storePhone} onChange={setStorePhone}
          placeholder="71 200 00 00"
          keyboardType="phone-pad"
          hint="Mijozlar aloqa uchun"
        />
        <FormField
          label="Do'kon manzili"
          icon="location-outline"
          value={storeAddress} onChange={setStoreAddress}
          placeholder="Shahar, ko'cha, uy raqami"
        />

        {/* Location */}
        <TouchableOpacity style={s.locBtn} onPress={useCurrentLocation} activeOpacity={0.8}>
          <Ionicons
            name={storeLat != null ? 'checkmark-circle' : 'navigate'}
            size={18}
            color={storeLat != null ? Colors.success : Colors.primary}
          />
          <Text style={s.locBtnTxt}>
            {storeLat != null
              ? `Joylashuv saqlandi (${storeLat.toFixed(5)}, ${storeLng?.toFixed(5)})`
              : 'Hozirgi joylashuvni qo\'shish'}
          </Text>
        </TouchableOpacity>

        {/* SECTION 2: Legal info */}
        <View style={s.sectionHeader}>
          <View style={s.sectionIconBox}>
            <Ionicons name="document-text" size={16} color={Colors.primary} />
          </View>
          <Text style={s.sectionTitle}>Huquqiy ma'lumotlar</Text>
        </View>

        <Text style={s.label}>Tadbirkorlik turi <Text style={s.required}>*</Text></Text>
        <View style={s.typeGrid}>
          {LEGAL_TYPES.map((t) => {
            const active = legalType === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[s.typeBtn, active && s.typeBtnActive]}
                onPress={() => setLegalType(t.value)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={active ? Colors.primary : Colors.textHint}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[s.typeLabel, active && { color: Colors.primary }]}>{t.label}</Text>
                  <Text style={s.typeSub}>{t.sub}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <FormField
          label="Rasmiy nomi" required
          icon="id-card-outline"
          value={officialName} onChange={setOfficialName}
          placeholder="Ro'yxatdan o'tgan rasmiy nom"
          hint="Hujjatlardagidek"
        />
        <FormField
          label="Yuridik nomi"
          icon="business-outline"
          value={legalName} onChange={setLegalName}
          placeholder='MCHJ "Fresh Market"'
        />
        <FormField
          label="STIR / INN"
          icon="key-outline"
          value={tin} onChange={setTin}
          placeholder="9 raqamli soliq raqami"
          keyboardType="numeric"
        />
        <FormField
          label="Ro'yxatdan o'tish raqami"
          icon="pricetag-outline"
          value={regNo} onChange={setRegNo}
          placeholder="Reg. raqam"
        />
        <FormField
          label="Ro'yxatdan o'tish manzili"
          icon="map-outline"
          value={regAddress} onChange={setRegAddress}
          placeholder="Yuridik manzil"
        />

        {/* Bank group */}
        <Text style={s.groupLabel}>Bank ma'lumotlari</Text>
        <FormField
          label="Bank nomi"
          icon="card-outline"
          value={bankName} onChange={setBankName}
          placeholder='Masalan: "Kapitalbank"'
        />
        <FormField
          label="Hisob raqami"
          icon="wallet-outline"
          value={bankAccount} onChange={setBankAccount}
          placeholder="20208..."
          keyboardType="numeric"
        />

        {/* License group */}
        <Text style={s.groupLabel}>Litsenziya (agar mavjud bo'lsa)</Text>
        <FormField
          label="Litsenziya raqami"
          icon="ribbon-outline"
          value={licenseNo} onChange={setLicenseNo}
          placeholder="Litsenziya №"
        />
        <FormField
          label="Litsenziya amal qilish muddati"
          icon="calendar-outline"
          value={licenseUntil} onChange={setLicenseUntil}
          placeholder="YYYY-MM-DD (masalan: 2027-12-31)"
        />

        {/* Note */}
        <View style={s.sectionHeader}>
          <View style={s.sectionIconBox}>
            <Ionicons name="chatbubble-ellipses" size={16} color={Colors.primary} />
          </View>
          <Text style={s.sectionTitle}>Qo'shimcha</Text>
        </View>
        <FormField
          label="Eslatma"
          icon="document-text-outline"
          value={note} onChange={setNote}
          placeholder="Do'kon haqida qisqacha, ishchi kunlari, maxsus shartlar..."
          multiline
        />

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Ionicons name="send" size={18} color={Colors.white} />
              <Text style={s.submitTxt}>Ariza yuborish</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  header: {
    backgroundColor: Colors.primary,
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.md,
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
  content: { padding: Spacing.md, gap: Spacing.sm },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#E3F2FD',
    borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: '#BBDEFB',
  },
  infoBannerTxt: { flex: 1, fontSize: 12, color: '#1565C0', lineHeight: 18 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginTop: Spacing.md, marginBottom: Spacing.xs,
  },
  sectionIconBox: {
    width: 28, height: 28, borderRadius: 10,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  groupLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.textHint,
    textTransform: 'uppercase', letterSpacing: 0.6,
    marginTop: Spacing.sm, marginBottom: -2, paddingLeft: 2,
  },

  fieldWrap: { gap: 5 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 2 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  required: { fontSize: 13, color: Colors.primary, fontWeight: '800' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, height: 50,
    ...Shadow.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputRowMulti: { height: 90, alignItems: 'flex-start', paddingTop: 13 },
  input: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  inputMulti: { height: 70, textAlignVertical: 'top' },
  hint: { fontSize: 11, color: Colors.textHint, paddingLeft: 2 },

  locBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, height: 48,
    borderWidth: 1.5, borderColor: Colors.primaryLight,
    borderStyle: 'dashed',
  },
  locBtnTxt: { fontSize: 13, fontWeight: '600', color: Colors.primary, flex: 1 },

  typeGrid: { gap: 8 },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg, padding: Spacing.md,
    borderWidth: 1.5, borderColor: Colors.border,
    ...Shadow.sm,
  },
  typeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySurface,
  },
  typeLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  typeSub: { fontSize: 11, color: Colors.textHint, marginTop: 1 },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg, height: 54,
    ...Shadow.md, marginTop: Spacing.md,
  },
  submitTxt: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
