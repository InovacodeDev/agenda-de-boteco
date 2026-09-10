import { type SupabaseClient } from '@supabase/supabase-js';

import {
  type AppNotification,
  type City,
  citySchema,
  type Establishment,
  establishmentSchema,
  type EstablishmentWriteInput,
  establishmentWriteSchema,
  type Event,
  type EventAttraction,
  eventAttractionSchema,
  eventSchema,
  type EventStatus,
  type EventWriteInput,
  eventWriteSchema,
  menuItemSchema,
  type MusicStyle,
  musicStyleSchema,
  notificationSchema,
  type NotificationWriteInput,
  notificationWriteSchema,
} from '../schemas/catalog';
import type { Database, Json } from '../types';
import {
  type CatalogPage,
  decodeCursor,
  DEFAULT_PAGE_SIZE,
  encodeCursor,
  quoteCursorValue,
} from '../utils/pagination';
import { slugify } from '../utils/slug';

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
  'id,name,description,logo_url,cover_url,address,neighborhood,city_id,lat,lng,whatsapp,instagram,opening_hours,menu_items,price_range,ambiance,rating_avg,rating_count,attributes,slug,menu_pdf_url,menu_photo_urls';
// photo_urls, instagram_post_url, status, capacity e recurrence_group_id incluídos;
// database.types.ts ainda não tem as colunas — selects de events usam
// (client as SupabaseClient) sem generic para contornar a validação estática do
// supabase-js.
const EVENT_COLUMNS =
  'id,name,attraction,description,banner_url,photo_urls,music_style_ids,establishment_id,starts_at,ends_at,cover_charge,courtesy,promo,slug,instagram_post_url,status,capacity,recurrence_group_id';
const MUSIC_STYLE_COLUMNS = 'id,name,emoji';
const NOTIFICATION_COLUMNS =
  'id,title,body,type,created_at,read,event_id,establishment_id';
const EVENT_ATTRACTION_COLUMNS = 'id,event_id,name,position';

// Helper: acessa a tabela 'events' sem validação de colunas pelo supabase-js, necessário
// enquanto database.types.ts não incluir photo_urls.
function eventsFrom(client: SupabaseClient<Database>) {
  return (client as SupabaseClient).from('events');
}

// Helper: acessa a tabela 'event_attractions', ainda ausente em database.types.ts.
function attractionsFrom(client: SupabaseClient<Database>) {
  return (client as SupabaseClient).from('event_attractions');
}

// Helper: acessa 'establishments' sem validação de colunas pelo supabase-js,
// usado nos writes (a row de insert omite location/rating_*, gerados no banco).
function establishmentsFrom(client: SupabaseClient<Database>) {
  return (client as SupabaseClient).from('establishments');
}

// Helper: acessa 'notifications' sem validação de colunas (insert omite
// created_at/read, com default no banco).
function notificationsFrom(client: SupabaseClient<Database>) {
  return (client as SupabaseClient).from('notifications');
}

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
    logo_url: row.logo_url ?? '',
    cover_url: row.cover_url ?? '',
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
    attributes: row.attributes,
    slug: nullToUndefined(row.slug),
    menu_pdf_url: nullToUndefined(row.menu_pdf_url),
    menu_photo_urls: row.menu_photo_urls ?? [],
  });
}

function mapEvent(row: EventRow): Event {
  return eventSchema.parse({
    id: row.id,
    name: row.name,
    attraction: row.attraction,
    description: row.description,
    banner_url: row.banner_url ?? '',
    photo_urls: (row as { photo_urls?: string[] }).photo_urls ?? [],
    music_style_ids: row.music_style_ids,
    establishment_id: row.establishment_id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    cover_charge: row.cover_charge,
    courtesy: nullToUndefined(row.courtesy),
    promo: nullToUndefined(row.promo),
    slug: nullToUndefined(row.slug),
    instagram_post_url: nullToUndefined(
      (row as { instagram_post_url?: string | null }).instagram_post_url ?? null,
    ),
    // Coluna NOT NULL no banco; o ?? cobre a leitura de uma linha selecionada
    // antes da migration rodar, e o schema aplica o mesmo default 'published'.
    status: (row as { status?: EventStatus }).status ?? 'published',
    capacity: (row as { capacity?: number | null }).capacity ?? null,
    recurrence_group_id:
      (row as { recurrence_group_id?: string | null }).recurrence_group_id ?? null,
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

/**
 * Pagina de eventos ordenada por starts_at asc, com id como desempate para o
 * cursor ser deterministico quando dois eventos comecam no mesmo horario.
 *
 * NAO adicione .eq('status','published') aqui: o filtro e da RLS (a policy
 * select_events de 20260813120000 ja esconde rascunho de quem nao e dono nem
 * admin). Filtrar de novo na query esconderia o rascunho do proprio dono no
 * painel, que e justamente quem precisa ve-lo.
 *
 * Invariante: esta ordenacao (starts_at asc) deve casar com o fallback mock
 * em packages/core/src/services/catalog.ts (sortByStartsAtAsc).
 */
export async function listEvents(
  client: SupabaseClient<Database>,
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<Event>> {
  const base = eventsFrom(client).select(EVENT_COLUMNS);
  const decoded = decodeCursor(cursor);
  const filtered = decoded
    ? base.or(
        `starts_at.gt.${quoteCursorValue(decoded.value)},and(starts_at.eq.${quoteCursorValue(decoded.value)},id.gt.${quoteCursorValue(decoded.id)})`,
      )
    : base;

  const { data, error } = await filtered
    .order('starts_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit);
  if (error) throw error;
  const items = ((data ?? []) as EventRow[]).map(mapEvent);
  const last = items.at(-1);
  const nextCursor =
    items.length < limit || !last ? null : encodeCursor({ value: last.starts_at, id: last.id });
  return { items, nextCursor };
}

export async function getEvent(
  client: SupabaseClient<Database>,
  id: string,
): Promise<Event | null> {
  const { data, error } = await eventsFrom(client)
    .select(EVENT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapEvent(data as EventRow) : null;
}

/**
 * Pagina de estabelecimentos ordenada por nome. A ordenacao e nova: antes a
 * query nao tinha .order() e a ordem vinha indefinida do Postgres. Cursor
 * exige ordem deterministica, e nome e a ordem que faz sentido para o usuario.
 */
export async function listEstablishments(
  client: SupabaseClient<Database>,
  cityId?: string,
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<Establishment>> {
  const decoded = decodeCursor(cursor);
  const base = client.from('establishments').select(ESTABLISHMENT_COLUMNS);
  const withCityFilter = cityId ? base.eq('city_id', cityId) : base;
  const filtered = decoded
    ? withCityFilter.or(
        `name.gt.${quoteCursorValue(decoded.value)},and(name.eq.${quoteCursorValue(decoded.value)},id.gt.${quoteCursorValue(decoded.id)})`,
      )
    : withCityFilter;

  const { data, error } = await filtered
    .order('name', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit);
  if (error) throw error;
  const items = (data ?? []).map(mapEstablishment);
  const last = items.at(-1);
  const nextCursor =
    items.length < limit || !last ? null : encodeCursor({ value: last.name, id: last.id });
  return { items, nextCursor };
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

/**
 * Eventos de um bar. `order` 'asc' e a agenda publica (proximos primeiro);
 * 'desc' e o painel do dono (mais recentes primeiro). O cursor inverte a
 * comparacao junto com a ordenacao.
 *
 * Invariante: a ordenacao default (starts_at asc) deve casar com o fallback
 * mock em packages/core/src/services/catalog.ts (sortByStartsAtAsc).
 */
export async function listEventsByEstablishment(
  client: SupabaseClient<Database>,
  establishmentId: string,
  /** 'asc' (público, próximos primeiro) | 'desc' (painel do dono). */
  order: 'asc' | 'desc' = 'asc',
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<Event>> {
  const ascending = order === 'asc';
  const comparison = ascending ? 'gt' : 'lt';
  const decoded = decodeCursor(cursor);
  const base = eventsFrom(client).select(EVENT_COLUMNS).eq('establishment_id', establishmentId);
  const filtered = decoded
    ? base.or(
        `starts_at.${comparison}.${quoteCursorValue(decoded.value)},and(starts_at.eq.${quoteCursorValue(decoded.value)},id.${comparison}.${quoteCursorValue(decoded.id)})`,
      )
    : base;

  const { data, error } = await filtered
    .order('starts_at', { ascending })
    .order('id', { ascending })
    .limit(limit);
  if (error) throw error;
  const items = ((data ?? []) as EventRow[]).map(mapEvent);
  const last = items.at(-1);
  const nextCursor =
    items.length < limit || !last ? null : encodeCursor({ value: last.starts_at, id: last.id });
  return { items, nextCursor };
}

// Agenda do dono: mesma query da pública, só a ordem muda — daí o parâmetro em
// listEventsByEstablishment em vez de uma segunda função com o select duplicado.
// Rascunho vem junto porque a RLS mostra os próprios ao dono.
export async function listOwnedEvents(
  client: SupabaseClient<Database>,
  establishmentId: string,
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<Event>> {
  return listEventsByEstablishment(client, establishmentId, 'desc', cursor, limit);
}

export async function listEventAttractions(
  client: SupabaseClient<Database>,
  eventId: string,
): Promise<EventAttraction[]> {
  const { data, error } = await attractionsFrom(client)
    .select(EVENT_ATTRACTION_COLUMNS)
    .eq('event_id', eventId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as { id: string; event_id: string; name: string; position: number };
    return eventAttractionSchema.parse({
      id: r.id,
      event_id: r.event_id,
      name: r.name,
      position: r.position,
    });
  });
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

/**
 * Avisos mais recentes primeiro. Cursor desce junto com a ordenacao.
 *
 * Invariante: esta ordenacao (created_at desc) deve casar com o fallback mock
 * em packages/core/src/services/catalog.ts (mockListNotifications).
 */
export async function listNotifications(
  client: SupabaseClient<Database>,
  cursor: string | null = null,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<CatalogPage<AppNotification>> {
  const decoded = decodeCursor(cursor);
  const base = client.from('notifications').select(NOTIFICATION_COLUMNS);
  const filtered = decoded
    ? base.or(
        `created_at.lt.${quoteCursorValue(decoded.value)},and(created_at.eq.${quoteCursorValue(decoded.value)},id.lt.${quoteCursorValue(decoded.id)})`,
      )
    : base;

  const { data, error } = await filtered
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (error) throw error;
  const items = (data ?? []).map(mapNotification);
  const last = items.at(-1);
  const nextCursor =
    items.length < limit || !last ? null : encodeCursor({ value: last.created_at, id: last.id });
  return { items, nextCursor };
}

export interface CatalogCounts {
  establishments: number;
  events: number;
  notifications: number;
}

/**
 * Totais do catálogo para o dashboard do admin — não confundir com paginação:
 * é um agregado único, não uma CatalogPage. Delega para get_catalog_counts()
 * (supabase/migrations/20260904130000_catalog_counts_rpc.sql), que roda como
 * o usuário autenticado: a RLS de is_admin() já libera o admin a contar as 3
 * tabelas inteiras, sem precisar de SECURITY DEFINER.
 *
 * (client as SupabaseClient) sem generic: a função é nova e ainda não está em
 * database.types.ts (arquivo gerado), mesmo escape hatch de eventsFrom/etc. acima.
 */
export async function getCatalogCounts(
  client: SupabaseClient<Database>,
): Promise<CatalogCounts> {
  const { data, error } = await (client as SupabaseClient)
    .rpc('get_catalog_counts')
    .single();
  if (error) throw error;
  const row = data as {
    establishments_count: number;
    events_count: number;
    notifications_count: number;
  };
  return {
    establishments: Number(row.establishments_count),
    events: Number(row.events_count),
    notifications: Number(row.notifications_count),
  };
}

// --- Escrita (admin) -------------------------------------------------------
// location e rating_* não são enviados: o banco gera via trigger/default.
// id e slug são derivados de name/title quando ausentes (catálogo nasce do admin).

export async function upsertEstablishment(
  client: SupabaseClient<Database>,
  input: EstablishmentWriteInput,
): Promise<Establishment> {
  const parsed = establishmentWriteSchema.parse(input);
  const id = parsed.id ?? slugify(parsed.name);
  const slug = parsed.slug ?? slugify(parsed.name);
  const row = { ...parsed, id, slug };
  const { data, error } = await establishmentsFrom(client)
    .upsert(row)
    .select(ESTABLISHMENT_COLUMNS)
    .single();
  if (error) throw error;
  return mapEstablishment(data as EstablishmentRow);
}

export async function deleteEstablishment(
  client: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await client.from('establishments').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertEvent(
  client: SupabaseClient<Database>,
  input: EventWriteInput,
): Promise<Event> {
  const parsed = eventWriteSchema.parse(input);
  const id = parsed.id ?? slugify(parsed.name);
  const slug = parsed.slug ?? slugify(parsed.name);
  const row = { ...parsed, id, slug };
  const { data, error } = await eventsFrom(client)
    .upsert(row)
    .select(EVENT_COLUMNS)
    .single();
  if (error) throw error;
  return mapEvent(data as EventRow);
}

export async function deleteEvent(
  client: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await eventsFrom(client).delete().eq('id', id);
  if (error) throw error;
}

export async function upsertNotification(
  client: SupabaseClient<Database>,
  input: NotificationWriteInput,
): Promise<AppNotification> {
  const parsed = notificationWriteSchema.parse(input);
  const id = parsed.id ?? slugify(parsed.title);
  const row = { ...parsed, id };
  const { data, error } = await notificationsFrom(client)
    .upsert(row)
    .select(NOTIFICATION_COLUMNS)
    .single();
  if (error) throw error;
  return mapNotification(data as NotificationRow);
}

export async function deleteNotification(
  client: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await notificationsFrom(client).delete().eq('id', id);
  if (error) throw error;
}
