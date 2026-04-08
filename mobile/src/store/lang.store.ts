import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { Lang } from '../i18n';

// expo-secure-store ni zustand persist uchun adapter
const secureStorage = {
  getItem: async (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'uz',
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'lang-pref',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);
