import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AuthMeResponse,
  AuthSessionSource,
} from "@/interfaces/auth.interface";

type AuthState = {
  me: AuthMeResponse | null;
  sessionSource: AuthSessionSource | null;
  setMe: (me: AuthMeResponse) => void;
  setSessionSource: (source: AuthSessionSource | null) => void;
  clearMe: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      me: null,
      sessionSource: null,
      setMe: (me) => set({ me }),
      setSessionSource: (sessionSource) => set({ sessionSource }),
      clearMe: () => set({ me: null, sessionSource: null }),
    }),
    {
      name: "auth_store",
      version: 1,
      partialize: (state) => ({
        me: state.me,
        sessionSource: state.sessionSource,
      }),
    },
  ),
);
