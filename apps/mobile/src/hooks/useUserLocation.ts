import type { LocationStatus } from '@agenda/core';
import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

import type { LatLng, ReverseGeocode } from '@/utils/geo';

export type { LocationStatus };

export interface LocationResult {
  coords: LatLng;
  /** Cidade/UF resolvidos por reverse geocode; campos podem vir nulos. */
  geocode: ReverseGeocode;
}

export interface UserLocation {
  coords: LatLng | null;
  status: LocationStatus;
  /** Pede permissão, busca a posição e o reverse geocode; resolve null quando negada */
  request: () => Promise<LocationResult | null>;
}

/**
 * Faz o reverse geocode das coordenadas. Nunca lança: em erro (sem rede, sem
 * suporte na plataforma) devolve cidade/UF nulos para o chamador decidir o
 * fallback. Na web o expo-location usa a Geocoding API quando disponível.
 */
async function reverseGeocode(coords: LatLng): Promise<ReverseGeocode> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: coords.lat,
      longitude: coords.lng,
    });
    const first = results[0];
    if (!first) {
      return { city: null, uf: null };
    }
    return {
      city: first.city ?? first.subregion ?? null,
      uf: first.region ?? null,
    };
  } catch {
    return { city: null, uf: null };
  }
}

/** Localização do usuário com permissão sob demanda + reverse geocode. */
export function useUserLocation(): UserLocation {
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');

  const request = useCallback(async (): Promise<LocationResult | null> => {
    setStatus('loading');
    try {
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
      const geocode = await reverseGeocode(location);
      return { coords: location, geocode };
    } catch {
      // Falha de permissão/sensor (ex.: usuário bloqueia o prompt no browser).
      setStatus('denied');
      return null;
    }
  }, []);

  return { coords, status, request };
}
