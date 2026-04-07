import { create } from 'zustand';

interface LocationState {
  lat: number | null;
  lng: number | null;
  address: string | null;
  permissionGranted: boolean;
  setLocation: (lat: number, lng: number, address?: string) => void;
  setPermission: (granted: boolean) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  lat: null,
  lng: null,
  address: null,
  permissionGranted: false,

  setLocation: (lat, lng, address) => set({ lat, lng, address }),
  setPermission: (granted) => set({ permissionGranted: granted }),
}));
