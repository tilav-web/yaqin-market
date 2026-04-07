import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type AuthRole = 'CUSTOMER' | 'SELLER' | 'COURIER' | 'SUPER_ADMIN';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  role: AuthRole | null;
  userId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setTokens: (access: string, refresh: string) => Promise<void>;
  setRole: (role: AuthRole, userId: string) => void;
  loadFromStorage: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  role: null,
  userId: null,
  isAuthenticated: false,
  isLoading: true,

  setTokens: async (access, refresh) => {
    await SecureStore.setItemAsync('access_token', access);
    await SecureStore.setItemAsync('refresh_token', refresh);
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
  },

  setRole: (role, userId) => set({ role, userId }),

  loadFromStorage: async () => {
    try {
      const access = await SecureStore.getItemAsync('access_token');
      const refresh = await SecureStore.getItemAsync('refresh_token');
      const role = (await SecureStore.getItemAsync('role')) as AuthRole | null;
      const userId = await SecureStore.getItemAsync('user_id');

      set({
        accessToken: access,
        refreshToken: refresh,
        role,
        userId,
        isAuthenticated: !!access,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('role');
    await SecureStore.deleteItemAsync('user_id');
    set({
      accessToken: null,
      refreshToken: null,
      role: null,
      userId: null,
      isAuthenticated: false,
    });
  },
}));
