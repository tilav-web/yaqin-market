import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadow } from '../../src/theme';
import { Button } from '../../src/components/ui';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with red wave */}
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Yaqin</Text>
          <Text style={styles.logoTextBold}>Market</Text>
        </View>
        <Text style={styles.tagline}>
          Yaqin do'konlardan tez va qulay xarid qiling
        </Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {[
          { icon: '📍', text: 'Yaqin do\'konlarni toping' },
          { icon: '🚀', text: 'Tez yetkazib berish' },
          { icon: '💬', text: 'Do\'konlar bilan to\'g\'ridan taklif' },
          { icon: '🔔', text: 'Real vaqt bildirish nomalar' },
        ].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
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
          <Text style={styles.telegramIcon}>✈️</Text>
          <Text style={styles.telegramText}>Telegram bilan kirish</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  hero: {
    backgroundColor: Colors.primary,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl + 20,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.9)',
  },
  logoTextBold: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.white,
    marginLeft: 6,
  },
  tagline: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  features: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  featureIcon: { fontSize: 24 },
  featureText: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  actions: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    ...Typography.caption,
    color: Colors.textHint,
  },
  telegramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: '#0088CC',
    gap: Spacing.sm,
    backgroundColor: '#E3F2FD',
  },
  telegramIcon: { fontSize: 20 },
  telegramText: {
    ...Typography.button,
    color: '#0088CC',
  },
});
