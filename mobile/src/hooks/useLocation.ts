import { useEffect } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '../store/location.store';

export function useLocation() {
  const { setLocation, setPermission } = useLocationStore();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermission(status === 'granted');

      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [geocoded] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = geocoded
        ? [geocoded.street, geocoded.district, geocoded.city]
            .filter(Boolean)
            .join(', ')
        : undefined;

      setLocation(
        location.coords.latitude,
        location.coords.longitude,
        address,
      );
    })();
  }, []);

  return useLocationStore();
}
