import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

const MAX_HISTORY = 15;

const secureStorage = {
  getItem: async (key: string) => SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
};

interface SearchHistoryState {
  history: string[];
  addSearch: (query: string) => void;
  removeSearch: (query: string) => void;
  clearAll: () => void;
}

export const useSearchHistory = create<SearchHistoryState>()(
  persist(
    (set) => ({
      history: [],
      addSearch: (query: string) =>
        set((state) => {
          const trimmed = query.trim();
          if (!trimmed) return state;
          const filtered = state.history.filter((h) => h !== trimmed);
          return { history: [trimmed, ...filtered].slice(0, MAX_HISTORY) };
        }),
      removeSearch: (query: string) =>
        set((state) => ({ history: state.history.filter((h) => h !== query) })),
      clearAll: () => set({ history: [] }),
    }),
    {
      name: 'search-history',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);
