/**
 * Marketplace monetizatsiya konfiguratsiyasi.
 * Bu qiymatlarni kelajakda `.env`'ga ko'chirish mumkin.
 */

/** Har buyurtmadan seller'dan olinadigan komissiya (foizda). */
export const SELLER_COMMISSION_PERCENT = 3;

/** Yangi seller tasdiqlanganda wallet'ga beriladigan kredit (so'm). */
export const SELLER_INITIAL_CREDIT = 200_000;

/** Buyurtma narxi bo'yicha komissiyani hisoblash. */
export function calculateCommission(itemsPrice: number): number {
  const p = Number(itemsPrice);
  if (!Number.isFinite(p) || p <= 0) return 0;
  return Math.round((p * SELLER_COMMISSION_PERCENT) / 100);
}
