export type Lang = 'uz' | 'ru';
export type TName = { uz: string; ru: string };

export function t(name: TName | string | null | undefined, lang: Lang = 'uz'): string {
  if (!name) return '';
  if (typeof name === 'string') return name;
  return name[lang] || name.uz || '';
}
