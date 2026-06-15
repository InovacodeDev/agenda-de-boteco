import type { City } from '../data/schemas';
import type { LocationStatus } from '../hooks/useUserLocation';

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Distância em km entre dois pontos pela fórmula de Haversine. */
export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Cidade mais próxima das coordenadas. Lança erro se a lista estiver vazia. */
export function nearestCity(coords: LatLng, cities: City[]): City {
  if (cities.length === 0) {
    throw new Error('nearestCity: lista de cidades vazia');
  }
  let best = cities[0];
  let bestDistance = haversineDistanceKm(coords, best);
  for (const city of cities.slice(1)) {
    const distance = haversineDistanceKm(coords, city);
    if (distance < bestDistance) {
      best = city;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Arredonda lat/lng para `decimals` casas (3 casas ≈ 110 m). Estabiliza a
 * queryKey de proximidade: micro-movimentos do GPS não disparam refetch.
 * Idempotente: coarseLatLng(coarseLatLng(x)) === coarseLatLng(x).
 */
export function coarseLatLng(coords: LatLng, decimals = 3): LatLng {
  const factor = 10 ** decimals;
  return {
    lat: Math.round(coords.lat * factor) / factor,
    lng: Math.round(coords.lng * factor) / factor,
  };
}

/**
 * Origem para a consulta de proximidade: usa a localização do usuário quando
 * concedida e disponível; senão cai para o centro da cidade. Garante que o RPC
 * sempre tenha uma origem e a tela nunca fique vazia por permissão negada.
 */
export function resolveNearbyOrigin(
  coords: LatLng | null,
  status: LocationStatus,
  city: City,
): LatLng {
  if (status === 'granted' && coords !== null) {
    return coords;
  }
  return { lat: city.lat, lng: city.lng };
}
