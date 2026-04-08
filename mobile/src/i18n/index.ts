export type Lang = 'uz' | 'ru';
export type TName = { uz: string; ru?: string };

// Backend data translator (e.g. product.name = { uz: '...', ru: '...' })
export function t(name: TName | string | null | undefined, lang: Lang = 'uz'): string {
  if (!name) return '';
  if (typeof name === 'string') return name;
  return (lang === 'ru' ? name.ru : undefined) || name.uz || '';
}

// UI string translator
import { translations } from './translations';
import type { TranslationKey } from './translations';
export { type TranslationKey };

export function tr(key: TranslationKey, lang: Lang): string {
  return translations[lang]?.[key] ?? translations.uz[key] ?? key;
}

// React hook — auto-reads lang from store
import { useLangStore } from '../store/lang.store';

export function useTranslation() {
  const lang = useLangStore(s => s.lang);
  const setLang = useLangStore(s => s.setLang);

  return {
    lang,
    setLang,
    tr: (key: TranslationKey) => tr(key, lang),
    // backend data translator bound to current lang
    t: (name: TName | string | null | undefined) => t(name, lang),
  };
}
