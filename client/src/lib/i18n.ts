export type Lang = 'uz' | 'ru';

export type TName = { uz: string; ru: string };

/** Translatable matnni joriy tilda qaytaradi */
export function t(name: TName | string | null | undefined, lang: Lang): string {
  if (!name) return '';
  if (typeof name === 'string') return name;
  return name[lang] || name.uz || '';
}
