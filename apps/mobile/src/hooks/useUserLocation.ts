import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

import type { LatLng } from '@/utils/geo';

export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied';

export interface UserLocation {
  coords: LatLng | null;
  status: LocationStatus;
  /** Pede permissão e busca a posição; resolve null quando negada */
  request: () => Promise<LatLng | null>;
}

/** Localização do usuário com permissão sob demanda */
export function useUserLocation(): UserLocation {
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');

  const request = useCallback(async (): Promise<LatLng | null> => {
    setStatus('loading');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setStatus('denied');
      return null;
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const location: LatLng = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    setCoords(location);
    setStatus('granted');
    return location;
  }, []);

  return { coords, status, request };
}
