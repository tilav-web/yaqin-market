import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptik feedback uchun markazlashgan helper.
 * Platform.OS === 'web' bo'lsa yoki xato bo'lsa — sekin tushirib yuboradi.
 */

const safeCall = (fn: () => Promise<void> | void) => {
  if (Platform.OS === 'web') return;
  try {
    const r = fn();
    if (r instanceof Promise) r.catch(() => {});
  } catch {
    // ignore
  }
};

export const haptics = {
  /** Yengil tebranish — tez-tez takrorlanadigan ta'sirlar uchun (qty +/-, chip tanlash) */
  light: () =>
    safeCall(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  /** O'rtacha tebranish — muhim ta'sirlar uchun (sheet ochilishi, arzon topish) */
  medium: () =>
    safeCall(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  /** Og'ir tebranish — jiddiy amallar (tozalash, bekor qilish) */
  heavy: () =>
    safeCall(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),

  /** Selection feedback — ro'yxatdan tanlash, switch */
  select: () => safeCall(() => Haptics.selectionAsync()),

  /** Muvaffaqiyat — 3 tebranishli naqsh (buyurtma yaratildi, to'lov) */
  success: () =>
    safeCall(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    ),

  /** Ogohlantirish — delivery blokirovkasi, balans past */
  warning: () =>
    safeCall(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    ),

  /** Xato — API failed, validation xato */
  error: () =>
    safeCall(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    ),
};
