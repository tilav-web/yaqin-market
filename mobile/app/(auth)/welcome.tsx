import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow } from '../../src/theme';
import { Button } from '../../src/components/ui';

const { height: SCREEN_H } = Dimensions.get('window');

const FEATURES = [
  { icon: 'location' as const,     color: '#E53935', bg: '#FFEBEE', text: "Yaqin do'konlarni toping" },
  { icon: 'rocket' as const,       color: '#FF5722', bg: '#FBE9E7', text: 'Tez yetkazib berish' },
  { icon: 'chatbubbles' as const,  color: '#2196F3', bg: '#E3F2FD', text: "Do'konlar bilan to'g'ridan taklif" },
  { icon: 'notifications' as const,color: '#9C27B0', bg: '#F3E5F5', text: 'Real vaqt bildirishnomalar' },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* ─── Hero ─────────────────────────── */}
      <View style={styles.hero}>
        {/* decorative circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <View style={styles.logoWrap}>
          <View style={styles.logoIcon}>
            <Text style={{ fontSize: 36 }}>🛒</Text>
          </View>
        </View>

        <Text style={styles.logoTitle}>
          <Text style={styles.logoLight}>Yaqin </Text>
          <Text style={styles.logoBold}>Market</Text>
        </Text>
        <Text style={styles.tagline}>
          Yaqin do'konlardan tez va{'\n'}qulay xarid qiling
        </Text>
      </View>

      {/* ─── Features ─────────────────────── */}
      <View style={styles.featuresWrap}>
        {FEATURES.map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
              <Ionicons name={f.icon} size={20} color={f.color} />
            </View>
            <Text style={styles.featureText}>{f.text}</Text>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
          </View>
        ))}
      </View>

      {/* ─── Actions ──────────────────────── */}
      <View style={styles.actions}>
        <Button
          title="Telefon raqam bilan kirish"
          onPress={() => router.push('/(auth)/login')}
          variant="primary"
          size="lg"
        />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>yoki</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.telegramBtn}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.8}
        >
          <View style={styles.telegramIcon}>
            <Text style={{ fontSize: 20 }}>✈️</Text>
          </View>
          <Text style={styles.telegramText}>Telegram bilan kirish</Text>
          <Ionicons name="chevron-forward" size={16} color="#0088CC" />
        </TouchableOpacity>

        <Text style={styles.terms}>
          Kirish orqali siz{' '}
          <Text style={styles.termsLink}>Foydalanish shartlari</Text>
          {' '}ga rozilik bildirasiz
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },

  // Hero
  hero: {
    backgroundColor: Colors.primary,
    paddingTop: Spacing.xl,
    paddingBottom: 36,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    minHeight: SCREEN_H * 0.32,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -60,
    right: -50,
  },
  circle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -30,
    left: -30,
  },
  logoWrap: {
    marginBottom: Spacing.md,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoTitle: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  logoLight: {
    fontSize: 36,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.9)',
  },
  logoBold: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.white,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Features
  featuresWrap: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },

  // Actions
  actions: {
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'android' ? Spacing.lg : Spacing.md,
    gap: Spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 12, color: Colors.textHint },
  telegramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: '#B3E5FC',
    paddingHorizontal: Spacing.md,
    backgroundColor: '#F0F9FF',
    gap: Spacing.sm,
  },
  telegramIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  telegramText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0277BD',
  },
  terms: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textHint,
    lineHeight: 16,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
