import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { t, tr, type Lang, type TName, type TranslationKey } from '@/lib/i18n';

const STORAGE_KEY = 'app_lang';

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** UI string tarjimasi — tr('login') */
  tr: (key: TranslationKey) => string;
  /** Backend data tarjimasi — t(product.name) */
  t: (name: TName | string | null | undefined) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: 'uz',
  setLang: () => {},
  tr: (key) => key,
  t: () => '',
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'ru' || stored === 'uz') ? stored : 'uz';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const trFn = useCallback((key: TranslationKey) => tr(key, lang), [lang]);
  const tFn = useCallback((name: TName | string | null | undefined) => t(name, lang), [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, tr: trFn, t: tFn }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
