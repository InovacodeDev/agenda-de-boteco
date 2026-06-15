import { type SupabaseClient } from '@supabase/supabase-js';

import {
  type AppNotification,
  type City,
  citySchema,
  type Establishment,
  establishmentSchema,
  type Event,
  eventSchema,
  menuItemSchema,
  type MusicStyle,
  musicStyleSchema,
  notificationSchema,
} from '../schemas/catalog';
import type { Database, Json } from '../types';

type CityRow = Database['public']['Tables']['cities']['Row'];
/** `location` (geography/unknown) nunca é selecionado — fica fora do mapper. */
type EstablishmentRow = Omit<
  Database['public']['Tables']['establishments']['Row'],
  'location'
>;
type EventRow = Database['public']['Tables']['events']['Row'];
type MusicStyleRow = Database['public']['Tables']['music_styles']['Row'];
type NotificationRow = Database['public']['Tables']['notifications']['Row'];

const CITY_COLUMNS = 'id,name,uf,lat,lng,slug';
const ESTABLISHMENT_COLUMNS =
  'id,name,description,logo_url,cover_url,address,neighborhood,city_id,lat,lng,whatsapp,instagram,opening_hours,menu_items,price_range,ambiance,rating_avg,rating_count,highlights,slug';
const EVENT_COLUMNS =
  'id,name,attraction,description,banner_url,music_style_ids,establishment_id,starts_at,ends_at,cover_charge,courtesy,promo,slug';
const MUSIC_STYLE_COLUMNS = 'id,name,emoji';
const NOTIFICATION_COLUMNS =
  'id,title,body,type,created_at,read,event_id,establishment_id';

function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

function parseMenuItems(value: Json) {
  return menuItemSchema.array().parse(value ?? []);
}

function mapCity(row: CityRow): City {
  return citySchema.parse({
    id: row.id,
    name: row.name,
    uf: row.uf,
    lat: row.lat,
    lng: row.lng,
    slug: nullToUndefined(row.slug),
  });
}

function mapEstablishment(row: EstablishmentRow): Establishment {
  return establishmentSchema.parse({
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
    menu_items: parseMenuItems(row.menu_items),
    price_range: row.price_range,
    ambiance: row.ambiance,
    rating_avg: row.rating_avg,
    rating_count: row.rating_count,
    highlights: row.highlights,
    slug: nullToUndefined(row.slug),
  });
}

function mapEvent(row: EventRow): Event {
  return eventSchema.parse({
    id: row.id,
    name: row.name,
    attraction: row.attraction,
    description: row.description,
    banner_url: row.banner_url,
    music_style_ids: row.music_style_ids,
    establishment_id: row.establishment_id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    cover_charge: row.cover_charge,
    courtesy: nullToUndefined(row.courtesy),
    promo: nullToUndefined(row.promo),
    slug: nullToUndefined(row.slug),
  });
}

function mapMusicStyle(row: MusicStyleRow): MusicStyle {
  return musicStyleSchema.parse({
    id: row.id,
    name: row.name,
    emoji: row.emoji,
  });
}

function mapNotification(row: NotificationRow): AppNotification {
  return notificationSchema.parse({
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.type,
    created_at: row.created_at,
    read: row.read,
    event_id: nullToUndefined(row.event_id),
    establishment_id: nullToUndefined(row.establishment_id),
  });
}

export async function listEvents(
  client: SupabaseClient<Database>,
): Promise<Event[]> {
  // Invariante: esta ordenação (starts_at asc) deve casar com o fallback mock
  // em apps/mobile/src/services/catalog.ts (sortByStartsAtAsc).
  const { data, error } = await client
    .from('events')
    .select(EVENT_COLUMNS)
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

export async function getEvent(
  client: SupabaseClient<Database>,
  id: string,
): Promise<Event | null> {
  const { data, error } = await client
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapEvent(data) : null;
}

export async function listEstablishments(
  client: SupabaseClient<Database>,
  cityId?: string,
): Promise<Establishment[]> {
  let query = client.from('establishments').select(ESTABLISHMENT_COLUMNS);
  if (cityId) {
    query = query.eq('city_id', cityId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapEstablishment);
}

export async function getEstablishment(
  client: SupabaseClient<Database>,
  id: string,
): Promise<Establishment | null> {
  const { data, error } = await client
    .from('establishments')
    .select(ESTABLISHMENT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapEstablishment(data) : null;
}

export async function listEventsByEstablishment(
  client: SupabaseClient<Database>,
  establishmentId: string,
): Promise<Event[]> {
  // Invariante: esta ordenação (starts_at asc) deve casar com o fallback mock
  // em apps/mobile/src/services/catalog.ts (sortByStartsAtAsc).
  const { data, error } = await client
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('establishment_id', establishmentId)
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}

export async function listMusicStyles(
  client: SupabaseClient<Database>,
): Promise<MusicStyle[]> {
  const { data, error } = await client
    .from('music_styles')
    .select(MUSIC_STYLE_COLUMNS);
  if (error) throw error;
  return (data ?? []).map(mapMusicStyle);
}

export async function listCities(
  client: SupabaseClient<Database>,
): Promise<City[]> {
  const { data, error } = await client.from('cities').select(CITY_COLUMNS);
  if (error) throw error;
  return (data ?? []).map(mapCity);
}

export async function listNotifications(
  client: SupabaseClient<Database>,
): Promise<AppNotification[]> {
  // Invariante: esta ordenação (created_at desc) deve casar com o fallback mock
  // em apps/mobile/src/services/catalog.ts (mockListNotifications).
  const { data, error } = await client
    .from('notifications')
    .select(NOTIFICATION_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapNotification);
}
