import { translations } from './translations';
import type { TranslationKey } from './translations';

export type Lang = 'uz' | 'ru';
export type TName = { uz: string; ru: string };
export type { TranslationKey };

/** Backend dan kelgan translatable ob'ektni joriy tilda qaytaradi */
export function t(name: TName | string | null | undefined, lang: Lang): string {
  if (!name) return '';
  if (typeof name === 'string') return name;
  return name[lang] || name.uz || '';
}

/** UI string tarjimasi — kalit bo'yicha */
export function tr(key: TranslationKey, lang: Lang): string {
  return translations[lang]?.[key] ?? translations.uz[key] ?? key;
}
