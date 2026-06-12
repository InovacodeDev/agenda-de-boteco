/**
 * Fachada async sobre os mocks do catálogo. Quando o Supabase entrar,
 * apenas a implementação interna muda — as assinaturas permanecem.
 * Todo retorno é validado pelos schemas Zod antes de sair da camada.
 */
import { z } from 'zod';

import {
  CITIES,
  ESTABLISHMENTS,
  EVENTS,
  MUSIC_STYLES,
  NOTIFICATIONS,
} from '../data/mock';
import {
  type AppNotification,
  type City,
  citySchema,
  type Establishment,
  establishmentSchema,
  type Event,
  eventSchema,
  type MusicStyle,
  musicStyleSchema,
  notificationSchema,
} from '../data/schemas';

const eventListSchema = z.array(eventSchema);
const establishmentListSchema = z.array(establishmentSchema);
const musicStyleListSchema = z.array(musicStyleSchema);
const cityListSchema = z.array(citySchema);
const notificationListSchema = z.array(notificationSchema);

function sortByStartsAtAsc(events: Event[]): Event[] {
  return [...events].sort(
    (a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at),
  );
}

export async function listEvents(): Promise<Event[]> {
  return sortByStartsAtAsc(eventListSchema.parse(EVENTS));
}

export async function getEvent(id: string): Promise<Event | null> {
  const event = EVENTS.find((item) => item.id === id);
  return event ? eventSchema.parse(event) : null;
}

export async function listEstablishments(
  cityId?: string,
): Promise<Establishment[]> {
  const items = cityId
    ? ESTABLISHMENTS.filter((item) => item.city_id === cityId)
    : ESTABLISHMENTS;
  return establishmentListSchema.parse(items);
}

export async function getEstablishment(
  id: string,
): Promise<Establishment | null> {
  const establishment = ESTABLISHMENTS.find((item) => item.id === id);
  return establishment ? establishmentSchema.parse(establishment) : null;
}

export async function listEventsByEstablishment(
  establishmentId: string,
): Promise<Event[]> {
  const items = EVENTS.filter(
    (item) => item.establishment_id === establishmentId,
  );
  return sortByStartsAtAsc(eventListSchema.parse(items));
}

export async function listMusicStyles(): Promise<MusicStyle[]> {
  return musicStyleListSchema.parse(MUSIC_STYLES);
}

export async function listCities(): Promise<City[]> {
  return cityListSchema.parse(CITIES);
}

export async function listNotifications(): Promise<AppNotification[]> {
  return notificationListSchema
    .parse(NOTIFICATIONS)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}
