import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthMeResponse } from "@/interfaces/auth.interface";

type AuthState = {
  me: AuthMeResponse | null;
  setMe: (me: AuthMeResponse) => void;
  clearMe: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      me: null,
      setMe: (me) => set({ me }),
      clearMe: () => set({ me: null }),
    }),
    {
      name: "auth_store",
      version: 1,
      partialize: (state) => ({ me: state.me }),
    },
  ),
);
