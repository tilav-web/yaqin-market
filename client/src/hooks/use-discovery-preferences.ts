import { useCallback, useEffect, useState } from "react";

type DiscoveryState = {
  radiusKm: number;
  address: string;
  location: { lat: number; lng: number } | null;
};

const STORAGE_KEY = "yaqin_market.discovery_preferences";
const DEFAULT_DISCOVERY_STATE: DiscoveryState = {
  radiusKm: 5,
  address: "",
  location: null,
};

function loadInitialState(): DiscoveryState {
  if (typeof window === "undefined") {
    return DEFAULT_DISCOVERY_STATE;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_DISCOVERY_STATE;
    }

    const parsed = JSON.parse(raw) as DiscoveryState;
    return {
      radiusKm: parsed.radiusKm ?? DEFAULT_DISCOVERY_STATE.radiusKm,
      address: parsed.address ?? "",
      location: parsed.location ?? null,
    };
  } catch {
    return DEFAULT_DISCOVERY_STATE;
  }
}

export function persistDiscoveryPreferences(
  patch: Partial<DiscoveryState>,
) {
  if (typeof window === "undefined") {
    return;
  }

  const current = loadInitialState();
  const nextState: DiscoveryState = {
    ...current,
    ...patch,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

export function useDiscoveryPreferences() {
  const [state, setState] = useState<DiscoveryState>(() => loadInitialState());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setRadiusKm = useCallback(
    (radiusKm: number) => setState((current) => ({ ...current, radiusKm })),
    [],
  );

  const setAddress = useCallback(
    (address: string) => setState((current) => ({ ...current, address })),
    [],
  );

  const setLocation = useCallback(
    (location: { lat: number; lng: number } | null) =>
      setState((current) => ({ ...current, location })),
    [],
  );

  const requestCurrentLocation = useCallback(
    () =>
      new Promise<{ lat: number; lng: number }>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolokatsiya qo'llab-quvvatlanmaydi"));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const nextLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            setLocation(nextLocation);
            resolve(nextLocation);
          },
          () => reject(new Error("Joylashuvni olishning imkoni bo'lmadi")),
          { enableHighAccuracy: true },
        );
      }),
    [setLocation],
  );

  return {
    radiusKm: state.radiusKm,
    address: state.address,
    location: state.location,
    setRadiusKm,
    setAddress,
    setLocation,
    requestCurrentLocation,
  };
}
