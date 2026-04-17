import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { useTranslation } from '../../src/i18n';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export default function AboutScreen() {
  const router = useRouter();
  const { lang } = useTranslation();

  const links: { icon: IoniconsName; color: string; bg: string; label: string; value: string; url: string }[] = [
    {
      icon: 'paper-plane', color: '#1E88E5', bg: '#E3F2FD',
      label: 'Telegram',
      value: '@yaqinmarket',
      url: 'https://t.me/yaqinmarket',
    },
    {
      icon: 'logo-instagram', color: '#E91E63', bg: '#FCE4EC',
      label: 'Instagram',
      value: '@yaqinmarket',
      url: 'https://instagram.com/yaqinmarket',
    },
  ];

  const legalItems: { icon: IoniconsName; label: string }[] = [
    {
      icon: 'document-text-outline',
      label: lang === 'ru' ? 'Условия использования' : 'Foydalanish shartlari',
    },
    {
      icon: 'shield-checkmark-outline',
      label: lang === 'ru' ? 'Политика конфиденциальности' : 'Maxfiylik siyosati',
    },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>{lang === 'ru' ? 'О приложении' : 'Ilova haqida'}</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo area */}
        <View style={s.logoSection}>
          <View style={s.logoCircle}>
            <Ionicons name="storefront" size={44} color={Colors.white} />
          </View>
          <Text style={s.appName}>Yaqin Market</Text>
          <View style={s.versionPill}>
            <Text style={s.versionTxt}>v1.0.0</Text>
          </View>
        </View>

        {/* Description */}
        <View style={s.descCard}>
          <Text style={s.descTxt}>
            {lang === 'ru'
              ? 'Yaqin Market - это удобная платформа для покупки и доставки товаров из местных магазинов. Мы связываем покупателей, продавцов и курьеров в одном приложении, обеспечивая быструю и надежную доставку.'
              : "Yaqin Market - bu mahalliy do'konlardan mahsulotlarni xarid qilish va yetkazib berish uchun qulay platforma. Biz xaridorlar, sotuvchilar va kuryerlarni bitta ilovada bog'laymiz, tez va ishonchli yetkazib berishni ta'minlaymiz."}
          </Text>
        </View>

        {/* Social links */}
        <Text style={s.sectionTitle}>
          {lang === 'ru' ? 'Мы в соцсетях' : 'Ijtimoiy tarmoqlar'}
        </Text>
        <View style={s.card}>
          {links.map((link, idx) => (
            <TouchableOpacity
              key={idx}
              style={[s.row, idx < links.length - 1 && s.rowBorder]}
              onPress={() => Linking.openURL(link.url)}
              activeOpacity={0.7}
            >
              <View style={[s.iconBox, { backgroundColor: link.bg }]}>
                <Ionicons name={link.icon} size={18} color={link.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{link.label}</Text>
                <Text style={s.rowSub}>{link.value}</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={Colors.textHint} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Legal */}
        <Text style={[s.sectionTitle, { marginTop: Spacing.lg }]}>
          {lang === 'ru' ? 'Правовая информация' : 'Huquqiy ma\'lumot'}
        </Text>
        <View style={s.card}>
          {legalItems.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[s.row, idx < legalItems.length - 1 && s.rowBorder]}
              activeOpacity={0.7}
            >
              <View style={[s.iconBox, { backgroundColor: Colors.background }]}>
                <Ionicons name={item.icon} size={18} color={Colors.textSecondary} />
              </View>
              <Text style={[s.rowLabel, { flex: 1 }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textHint} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
        <Text style={s.footer}>
          {lang === 'ru'
            ? 'Сделано с любовью в Узбекистане'
            : "O'zbekistonda sevgi bilan yaratilgan"}
        </Text>

        <View style={{ paddingBottom: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
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
  scroll: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  logoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  appName: {
    fontSize: 24, fontWeight: '800', color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  versionPill: {
    backgroundColor: Colors.primarySurface,
    paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  versionTxt: {
    fontSize: 12, fontWeight: '600', color: Colors.primary,
  },
  descCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
    marginBottom: Spacing.lg,
  },
  descTxt: {
    fontSize: 14, color: Colors.textSecondary, lineHeight: 22, textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textHint,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: Spacing.xs, paddingLeft: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 14, gap: Spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  iconBox: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  rowSub: { fontSize: 12, color: Colors.textHint, marginTop: 1 },
  footer: {
    textAlign: 'center', fontSize: 12, color: Colors.textHint,
    marginTop: Spacing.xl, marginBottom: Spacing.md,
  },
});
