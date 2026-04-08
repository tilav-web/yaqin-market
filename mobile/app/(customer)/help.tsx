import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { useTranslation } from '../../src/i18n';

interface FaqItem {
  q_uz: string;
  q_ru: string;
  a_uz: string;
  a_ru: string;
}

const FAQ_LIST: FaqItem[] = [
  {
    q_uz: 'Buyurtmani qanday berishim mumkin?',
    q_ru: 'Как сделать заказ?',
    a_uz: "Mahsulotni tanlang, savatga qo'shing va buyurtma berish tugmasini bosing. Manzilni tanlang va to'lovni amalga oshiring.",
    a_ru: 'Выберите товар, добавьте в корзину и нажмите кнопку оформления заказа. Укажите адрес и произведите оплату.',
  },
  {
    q_uz: "Yetkazib berish qancha vaqt oladi?",
    q_ru: 'Сколько времени занимает доставка?',
    a_uz: "Yetkazib berish odatda 30 daqiqadan 2 soatgacha vaqt oladi. Bu sizning manzilingiz va do'konning joylashuviga bog'liq.",
    a_ru: 'Доставка обычно занимает от 30 минут до 2 часов. Это зависит от вашего адреса и расположения магазина.',
  },
  {
    q_uz: "Buyurtmani bekor qilish mumkinmi?",
    q_ru: 'Можно ли отменить заказ?',
    a_uz: "Ha, buyurtma qabul qilinmagan bo'lsa, uni bekor qilishingiz mumkin. Buyurtmalar bo'limiga o'ting va bekor qilish tugmasini bosing.",
    a_ru: 'Да, если заказ еще не принят, вы можете его отменить. Перейдите в раздел заказов и нажмите кнопку отмены.',
  },
  {
    q_uz: "To'lov qanday usullar bilan amalga oshiriladi?",
    q_ru: 'Какие способы оплаты доступны?',
    a_uz: "Hozircha naqd pul orqali to'lash mumkin. Tez orada onlayn to'lov ham qo'shiladi.",
    a_ru: 'В настоящее время доступна оплата наличными. В ближайшее время будет добавлена онлайн-оплата.',
  },
  {
    q_uz: "Sotuvchi bo'lish uchun nima qilishim kerak?",
    q_ru: 'Что нужно, чтобы стать продавцом?',
    a_uz: "Profil sahifasida \"Sotuvchi bo'lish\" tugmasini bosing va arizani to'ldiring. Ariza 1-3 ish kuni ichida ko'rib chiqiladi.",
    a_ru: 'Нажмите кнопку "Стать продавцом" на странице профиля и заполните заявку. Заявка рассматривается в течение 1-3 рабочих дней.',
  },
  {
    q_uz: "Mahsulot sifati yomon bo'lsa nima qilaman?",
    q_ru: 'Что делать, если качество товара плохое?',
    a_uz: "Bizga Telegram orqali murojaat qiling yoki qo'ng'iroq qiling. Biz muammoni hal qilishga yordam beramiz.",
    a_ru: 'Свяжитесь с нами через Telegram или позвоните. Мы поможем решить проблему.',
  },
];

function FaqCard({ item, lang, expanded, onToggle }: {
  item: FaqItem; lang: string; expanded: boolean; onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={s.faqCard} onPress={onToggle} activeOpacity={0.8}>
      <View style={s.faqHeader}>
        <View style={s.faqIconBox}>
          <Ionicons name="help-circle" size={18} color={Colors.primary} />
        </View>
        <Text style={s.faqQuestion}>{lang === 'ru' ? item.q_ru : item.q_uz}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textHint}
        />
      </View>
      {expanded && (
        <View style={s.faqAnswer}>
          <Text style={s.faqAnswerTxt}>{lang === 'ru' ? item.a_ru : item.a_uz}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function HelpScreen() {
  const router = useRouter();
  const { lang } = useTranslation();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setExpandedIdx(prev => (prev === idx ? null : idx));
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.title}>{lang === 'ru' ? 'Помощь' : 'Yordam'}</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* FAQ Section */}
        <Text style={s.sectionTitle}>
          {lang === 'ru' ? 'Часто задаваемые вопросы' : "Ko'p beriladigan savollar"}
        </Text>

        {FAQ_LIST.map((item, idx) => (
          <FaqCard
            key={idx}
            item={item}
            lang={lang}
            expanded={expandedIdx === idx}
            onToggle={() => toggleFaq(idx)}
          />
        ))}

        {/* Contact Section */}
        <Text style={[s.sectionTitle, { marginTop: Spacing.lg }]}>
          {lang === 'ru' ? 'Связаться с нами' : "Biz bilan bog'lanish"}
        </Text>

        <View style={s.contactCard}>
          <TouchableOpacity
            style={s.contactRow}
            onPress={() => Linking.openURL('tel:+998901234567')}
            activeOpacity={0.7}
          >
            <View style={[s.contactIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="call" size={18} color="#43A047" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.contactLabel}>
                {lang === 'ru' ? 'Телефон' : 'Telefon'}
              </Text>
              <Text style={s.contactValue}>+998 90 123 45 67</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textHint} />
          </TouchableOpacity>

          <View style={s.contactDivider} />

          <TouchableOpacity
            style={s.contactRow}
            onPress={() => Linking.openURL('https://t.me/yaqinmarket')}
            activeOpacity={0.7}
          >
            <View style={[s.contactIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="paper-plane" size={18} color="#1E88E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.contactLabel}>Telegram</Text>
              <Text style={s.contactValue}>@yaqinmarket</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textHint} />
          </TouchableOpacity>
        </View>

        <View style={{ paddingBottom: 100 }} />
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
  scroll: { flex: 1 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.textHint,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: Spacing.xs, paddingLeft: 4, marginTop: Spacing.sm,
  },
  faqCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  faqIconBox: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  faqAnswer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: 0,
  },
  faqAnswerTxt: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingLeft: 44,
  },
  contactCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  contactDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginLeft: 62,
  },
  contactIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  contactLabel: {
    fontSize: 15, fontWeight: '500', color: Colors.textPrimary,
  },
  contactValue: {
    fontSize: 12, color: Colors.textHint, marginTop: 1,
  },
});
