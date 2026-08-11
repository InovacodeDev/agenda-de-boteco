import type { City } from '../schemas';
import type { LocationStatus } from '../types';

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

/** Prefixo de id de cidade virtual (resolvida por geolocalização, fora do catálogo). */
export const VIRTUAL_CITY_PREFIX = 'geo:';

/** true se o id representa uma cidade virtual (não pertencente ao catálogo). */
export function isVirtualCityId(id: string): boolean {
  return id.startsWith(VIRTUAL_CITY_PREFIX);
}

export interface ReverseGeocode {
  city: string | null;
  uf: string | null;
}

/**
 * Constrói uma `City` "virtual" a partir das coordenadas do usuário e do
 * reverse geocode, para o caso em que a localização real não está no catálogo.
 * O id é derivado das coords (3 casas ≈ 110 m) para ser estável entre toques.
 * Nome/UF vêm do geocode; havendo lacuna, caem para rótulos genéricos. As
 * coords ficam na própria City, então o feed de proximidade usa a posição real.
 */
export function buildVirtualCity(coords: LatLng, geocode: ReverseGeocode): City {
  const { lat, lng } = coarseLatLng(coords);
  const name = geocode.city?.trim() || 'Sua localização';
  const ufRaw = geocode.uf?.trim().toUpperCase() ?? '';
  // uf precisa de exatamente 2 chars (citySchema). Sem UF válida, usa '--'.
  const uf = ufRaw.length === 2 ? ufRaw : '--';
  return {
    id: `${VIRTUAL_CITY_PREFIX}${lat},${lng}`,
    name,
    uf,
    lat: coords.lat,
    lng: coords.lng,
  };
}

/**
 * Raio (km) dentro do qual uma cidade do catálogo "absorve" a localização do
 * usuário — cobre a região metropolitana (ex.: alguém na Grande Floripa usa
 * Florianópolis). Fora disso, a localização vira uma cidade virtual própria.
 */
export const CATALOG_CITY_RADIUS_KM = 40;

/**
 * Decide qual cidade representar a partir das coordenadas do usuário:
 * - a cidade do catálogo mais próxima, se estiver dentro de CATALOG_CITY_RADIUS_KM;
 * - senão, uma cidade virtual (geocode) com as coords reais.
 * `isCatalog` informa ao chamador qual setter do store usar (setCity x setCustomCity).
 * Com catálogo vazio, sempre devolve a cidade virtual.
 */
export function resolveCityFromLocation(
  coords: LatLng,
  geocode: ReverseGeocode,
  cities: City[],
): { city: City; isCatalog: boolean } {
  if (cities.length > 0) {
    const nearest = nearestCity(coords, cities);
    if (haversineDistanceKm(coords, nearest) <= CATALOG_CITY_RADIUS_KM) {
      return { city: nearest, isCatalog: true };
    }
  }
  return { city: buildVirtualCity(coords, geocode), isCatalog: false };
}
