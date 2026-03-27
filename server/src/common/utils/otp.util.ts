/**
 * Tasdiqlash kodi (OTP) generatsiya qilish funksiyasi.
 * Development uchun FIXED_OTP_CODE berilsa shu qaytadi,
 * aks holda tasodifiy raqamlar generatsiya qilinadi.
 */
export const generateOtp = (length: number = 6): string => {
  const fixedCode = process.env.FIXED_OTP_CODE?.trim();

  if (fixedCode && new RegExp(`^\\d{${length}}$`).test(fixedCode)) {
    return fixedCode;
  }

  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
};
