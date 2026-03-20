/**
 * Tasdiqlash kodi (OTP) generatsiya qilish funksiyasi.
 * Hozircha doimiy '4444' qaytaradi.
 * Kelajakda tasodifiy sonlar generatsiyasiga o'zgartirish mumkin.
 */
export const generateOtp = (length: number = 6): string => {
  // Hozircha faqat '666666' qaytaramiz
  return '6'.repeat(length);
};
