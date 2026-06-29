/**
 * Fachada async do catálogo. Com Supabase configurado, delega para a query
 * layer pura de @agenda/core; sem client, cai no fallback dos mocks locais.
 * Todo retorno é validado pelos schemas Zod antes de sair da camada.
 */
import { z } from 'zod';

import {
  CITIES,
  ESTABLISHMENTS,
  EVENT_ATTRACTIONS,
  EVENTS,
  MUSIC_STYLES,
  NOTIFICATIONS,
} from '../data';
import * as coreQueries from '../queries';
import {
  type AppNotification,
  type City,
  citySchema,
  type Establishment,
  establishmentSchema,
  type Event,
  type EventAttraction,
  eventAttractionSchema,
  eventSchema,
  type MusicStyle,
  musicStyleSchema,
  notificationSchema,
} from '../schemas';
import { getConfiguredSupabase } from '../supabase/client';
import { handleServiceError } from '../utils/errors';

const eventAttractionListSchema = z.array(eventAttractionSchema);
const eventListSchema = z.array(eventSchema);
const establishmentListSchema = z.array(establishmentSchema);
const musicStyleListSchema = z.array(musicStyleSchema);
const cityListSchema = z.array(citySchema);
const notificationListSchema = z.array(notificationSchema);

// Invariante: esta ordenação (starts_at asc) deve casar com o .order() do core
// em packages/core/src/queries/catalog.ts (listEvents, listEventsByEstablishment).
function sortByStartsAtAsc(events: Event[]): Event[] {
  return [...events].sort(
    (a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at),
  );
}

function mockListEvents(): Event[] {
  return sortByStartsAtAsc(eventListSchema.parse(EVENTS));
}

function mockGetEvent(id: string): Event | null {
  const event = EVENTS.find((item) => item.id === id);
  return event ? eventSchema.parse(event) : null;
}

function mockListEstablishments(cityId?: string): Establishment[] {
  const items = cityId
    ? ESTABLISHMENTS.filter((item) => item.city_id === cityId)
    : ESTABLISHMENTS;
  return establishmentListSchema.parse(items);
}

function mockGetEstablishment(id: string): Establishment | null {
  const establishment = ESTABLISHMENTS.find((item) => item.id === id);
  return establishment ? establishmentSchema.parse(establishment) : null;
}

function mockListEventsByEstablishment(establishmentId: string): Event[] {
  const items = EVENTS.filter(
    (item) => item.establishment_id === establishmentId,
  );
  return sortByStartsAtAsc(eventListSchema.parse(items));
}

function mockListMusicStyles(): MusicStyle[] {
  return musicStyleListSchema.parse(MUSIC_STYLES);
}

function mockListCities(): City[] {
  return cityListSchema.parse(CITIES);
}

function mockListNotifications(): AppNotification[] {
  // Invariante: esta ordenação (created_at desc) deve casar com o .order() do
  // core em packages/core/src/queries/catalog.ts (listNotifications).
  return notificationListSchema
    .parse(NOTIFICATIONS)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export async function listEvents(): Promise<Event[]> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return mockListEvents();
  }
  try {
    return await coreQueries.listEvents(client);
  } catch (error) {
    return handleServiceError(error, { method: 'catalog.listEvents' });
  }
}

export async function getEvent(id: string): Promise<Event | null> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return mockGetEvent(id);
  }
  try {
    return await coreQueries.getEvent(client, id);
  } catch (error) {
    return handleServiceError(error, { method: 'catalog.getEvent', args: { id } });
  }
}

export async function listEstablishments(
  cityId?: string,
): Promise<Establishment[]> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return mockListEstablishments(cityId);
  }
  try {
    return await coreQueries.listEstablishments(client, cityId);
  } catch (error) {
    return handleServiceError(error, { method: 'catalog.listEstablishments', args: { cityId } });
  }
}

export async function getEstablishment(
  id: string,
): Promise<Establishment | null> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return mockGetEstablishment(id);
  }
  try {
    return await coreQueries.getEstablishment(client, id);
  } catch (error) {
    return handleServiceError(error, { method: 'catalog.getEstablishment', args: { id } });
  }
}

export async function listEventsByEstablishment(
  establishmentId: string,
): Promise<Event[]> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return mockListEventsByEstablishment(establishmentId);
  }
  try {
    return await coreQueries.listEventsByEstablishment(client, establishmentId);
  } catch (error) {
    return handleServiceError(error, { method: 'catalog.listEventsByEstablishment', args: { establishmentId } });
  }
}

export async function listMusicStyles(): Promise<MusicStyle[]> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return mockListMusicStyles();
  }
  try {
    return await coreQueries.listMusicStyles(client);
  } catch (error) {
    return handleServiceError(error, { method: 'catalog.listMusicStyles' });
  }
}

export async function listCities(): Promise<City[]> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return mockListCities();
  }
  try {
    return await coreQueries.listCities(client);
  } catch (error) {
    return handleServiceError(error, { method: 'catalog.listCities' });
  }
}

export async function listNotifications(): Promise<AppNotification[]> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return mockListNotifications();
  }
  try {
    return await coreQueries.listNotifications(client);
  } catch (error) {
    return handleServiceError(error, { method: 'catalog.listNotifications' });
  }
}

function mockListEventAttractions(eventId: string): EventAttraction[] {
  const items = EVENT_ATTRACTIONS.filter((a) => a.event_id === eventId).sort(
    (a, b) => a.position - b.position,
  );
  return eventAttractionListSchema.parse(items);
}

export async function listEventAttractions(
  eventId: string,
): Promise<EventAttraction[]> {
  const client = getConfiguredSupabase();
  if (client === null) {
    return mockListEventAttractions(eventId);
  }
  try {
    return await coreQueries.listEventAttractions(client, eventId);
  } catch (error) {
    return handleServiceError(error, {
      method: 'catalog.listEventAttractions',
      args: { eventId },
    });
  }
}
