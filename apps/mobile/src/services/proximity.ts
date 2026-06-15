/**
 * Proximidade server-side via RPC PostGIS `nearby_establishments`. Com Supabase
 * configurado, delega a ordenação/filtragem por distância ao banco (geography);
 * sem client, cai no fallback Haversine sobre os mocks locais. Os dois caminhos
 * têm a MESMA FORMA e as MESMAS REGRAS (filtra por raio, ordena por distance_km
 * asc, limita) e ambos validam pelo mesmo schema — as telas não percebem qual
 * serviu a resposta. As distâncias podem divergir na 2ª/3ª casa decimal (e o
 * desempate entre itens equidistantes) porque o banco usa o esferóide WGS84 e o
 * fallback usa Haversine esférico; por isso são intercambiáveis, mas nunca
 * coexistem em produção.
 */
import { z } from 'zod';

import { ESTABLISHMENTS } from '@/data/mock';
import { establishmentSchema, menuItemSchema } from '@/data/schemas';
import { getSupabase } from '@/lib/supabase';
import { handleServiceError } from '@/utils/errors';
import { haversineDistanceKm } from '@/utils/geo';

export const nearbyEstablishmentSchema = establishmentSchema.extend({
  distance_km: z.number().nonnegative(),
});

export type NearbyEstablishment = z.infer<typeof nearbyEstablishmentSchema>;

const nearbyListSchema = z.array(nearbyEstablishmentSchema);

const DEFAULT_RADIUS_KM = 50;
const DEFAULT_LIMIT = 50;

export interface NearbyParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
}

function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Linha do RPC mapeada para o schema. `location` (geography) é omitido; o
 * gerador tipa `instagram`/`slug` como não-nuláveis (limitação do RETURNS
 * TABLE), mas em runtime podem vir null — tratamos null → undefined, igual ao
 * mapper de catalog.
 */
interface NearbyRow {
  id: string;
  name: string;
  description: string;
  logo_url: string;
  cover_url: string;
  address: string;
  neighborhood: string;
  city_id: string;
  lat: number;
  lng: number;
  whatsapp: string;
  instagram: string | null;
  opening_hours: string;
  menu_items: unknown;
  price_range: string;
  ambiance: string;
  rating_avg: number;
  rating_count: number;
  highlights: string[];
  slug: string | null;
  distance_km: number;
}

function mapRow(row: NearbyRow): unknown {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    logo_url: row.logo_url,
    cover_url: row.cover_url,
    address: row.address,
    neighborhood: row.neighborhood,
    city_id: row.city_id,
    lat: row.lat,
    lng: row.lng,
    whatsapp: row.whatsapp,
    instagram: nullToUndefined(row.instagram),
    opening_hours: row.opening_hours,
    menu_items: menuItemSchema.array().parse(row.menu_items ?? []),
    price_range: row.price_range,
    ambiance: row.ambiance,
    rating_avg: row.rating_avg,
    rating_count: row.rating_count,
    highlights: row.highlights,
    slug: nullToUndefined(row.slug),
    distance_km: row.distance_km,
  };
}

function listFromMock(params: NearbyParams): NearbyEstablishment[] {
  const { lat, lng } = params;
  const radiusKm = params.radiusKm ?? DEFAULT_RADIUS_KM;
  const limit = params.limit ?? DEFAULT_LIMIT;
  const origin = { lat, lng };

  const withDistance = ESTABLISHMENTS.map((establishment) => ({
    ...establishment,
    distance_km: haversineDistanceKm(origin, {
      lat: establishment.lat,
      lng: establishment.lng,
    }),
  }))
    .filter((item) => item.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit);

  return nearbyListSchema.parse(withDistance);
}

export async function listNearbyEstablishments(
  params: NearbyParams,
): Promise<NearbyEstablishment[]> {
  const client = getSupabase();
  if (client === null) {
    return listFromMock(params);
  }

  try {
    const { data, error } = await client.rpc('nearby_establishments', {
      origin_lat: params.lat,
      origin_lng: params.lng,
      radius_km: params.radiusKm ?? DEFAULT_RADIUS_KM,
      max_results: params.limit ?? DEFAULT_LIMIT,
    });
    if (error) throw error;

    const rows = (data ?? []) as NearbyRow[];
    return nearbyListSchema.parse(rows.map(mapRow));
  } catch (error) {
    return handleServiceError(error, {
      method: 'proximity.listNearbyEstablishments',
      args: params as unknown as Record<string, unknown>,
    });
  }
}
