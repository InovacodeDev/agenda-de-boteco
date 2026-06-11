import type { City } from '../data/schemas';

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
