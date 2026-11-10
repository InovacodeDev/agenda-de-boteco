/**
 * Listagens do catálogo descartam só a linha que quebra o schema (e reportam o
 * drift) em vez de derrubar a lista inteira. Cursor e fim de lista saem das
 * linhas CRUAS: a linha ruim não pode encerrar a paginação cedo nem se repetir.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { ESTABLISHMENTS, EVENTS } from '../data';
import { reportException } from '../services/analytics';
import type { Database } from '../types';
import {
  listCities,
  listEstablishments,
  listEstablishmentsByIds,
  listEvents,
  listEventsByEstablishment,
  listEventsByIds,
  listMusicStyles,
  listNotifications,
} from './catalog';

jest.mock('../services/analytics', () => ({ reportException: jest.fn() }));

const mockReport = reportException as jest.Mock;

type Row = Record<string, unknown>;

function createClient(rows: unknown[]): SupabaseClient<Database> {
  const builder = {
    select: () => builder,
    in: () => builder,
    eq: () => builder,
    ilike: () => builder,
    or: () => builder,
    order: () => builder,
    limit: () => builder,
    then<TResult>(onFulfilled: (value: { data: unknown[]; error: null }) => TResult) {
      return Promise.resolve(onFulfilled({ data: rows, error: null }));
    },
  };
  return { from: () => builder } as unknown as SupabaseClient<Database>;
}

function eventRow(id: string, startsAt: string, overrides: Row = {}): Row {
  return {
    ...EVENTS[0],
    id,
    external_id: `00000000-0000-4000-8000-00000000000${id}`,
    starts_at: startsAt,
    banner_url: null,
    courtesy: null,
    promo: null,
    slug: null,
    photo_urls: [],
    ...overrides,
  };
}

function establishmentRow(id: string, name: string, overrides: Row = {}): Row {
  return {
    ...ESTABLISHMENTS[0],
    id,
    name,
    logo_url: null,
    cover_url: null,
    instagram: null,
    slug: null,
    menu_pdf_url: null,
    menu_photo_urls: [],
    menu_items: [],
    ...overrides,
  };
}

function notificationRow(id: string, createdAt: string, overrides: Row = {}): Row {
  return {
    id,
    title: 'Aviso',
    body: 'Corpo',
    type: 'promo',
    created_at: createdAt,
    read: false,
    event_id: null,
    establishment_id: null,
    event: null,
    establishment: null,
    ...overrides,
  };
}

const T1 = '2026-11-07T20:00:00.000Z';
const T2 = '2026-11-08T20:00:00.000Z';

beforeEach(() => {
  mockReport.mockReset();
});

describe('Regra de negócio: listas descartam a linha inválida e paginam pelas linhas cruas', () => {
  it('listEvents: última linha inválida em página cheia mantém o cursor da última linha crua', async () => {
    const rows = [eventRow('1', T1), eventRow('2', T2, { name: 42 })];

    const page = await listEvents(createClient(rows), null, 2);

    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe(`${T2}|2`);
    expect(mockReport).toHaveBeenCalledTimes(1);
    expect(mockReport).toHaveBeenCalledWith(expect.any(Error), {
      fingerprint: ['zod-schema-drift', 'events', 'name'],
      recordId: '00000000-0000-4000-8000-000000000002',
    });
  });

  it('listEvents: página parcial não gera cursor mesmo com linha inválida', async () => {
    const rows = [eventRow('1', T1, { name: 42 })];

    const page = await listEvents(createClient(rows), null, 2);

    expect(page).toEqual({ items: [], nextCursor: null });
  });

  it('listEvents: todas inválidas devolve lista vazia e reporta no máximo 3', async () => {
    const rows = ['1', '2', '3', '4', '5'].map((id) => eventRow(id, T1, { name: 42 }));

    const page = await listEvents(createClient(rows), null, 20);

    expect(page.items).toEqual([]);
    expect(mockReport).toHaveBeenCalledTimes(3);
  });

  it('listEventsByEstablishment: cursor vem da última linha crua', async () => {
    const rows = [eventRow('1', T1), eventRow('2', T2, { name: 42 })];

    const page = await listEventsByEstablishment(createClient(rows), 'bar-1', 'asc', null, 2);

    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe(`${T2}|2`);
  });

  it('listEventsByIds: descarta a linha inválida e mantém as demais', async () => {
    const rows = [eventRow('1', T1), eventRow('2', T2, { name: 42 })];

    const items = await listEventsByIds(createClient(rows), ['1', '2']);

    expect(items.map((item) => item.id)).toEqual(['1']);
  });

  it('listEstablishments: menu_items inválido gera fingerprint menu_items.*.campo e cursor cru', async () => {
    const rows = [
      establishmentRow('a', 'Bar A'),
      establishmentRow('b', 'Bar B', {
        menu_items: [
          { name: 'x', price: 1 },
          { name: 'y', price: 'caro' },
        ],
      }),
    ];

    const page = await listEstablishments(createClient(rows), undefined, null, 2);

    expect(page.items.map((item) => item.id)).toEqual(['a']);
    expect(page.nextCursor).toBe('Bar B|b');
    expect(mockReport).toHaveBeenCalledWith(expect.any(Error), {
      fingerprint: ['zod-schema-drift', 'establishments', 'menu_items.*.price'],
      recordId: ESTABLISHMENTS[0]?.external_id,
    });
  });

  it('listEstablishmentsByIds: descarta a linha inválida', async () => {
    const rows = [establishmentRow('a', 'Bar A'), establishmentRow('b', 'Bar B', { lat: 'x' })];

    const items = await listEstablishmentsByIds(createClient(rows), ['a', 'b']);

    expect(items.map((item) => item.id)).toEqual(['a']);
  });

  it('listNotifications: cursor vem da última linha crua', async () => {
    const rows = [notificationRow('n1', T2), notificationRow('n2', T1, { title: 1 })];

    const page = await listNotifications(createClient(rows), null, 2);

    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBe(`${T1}|n2`);
    expect(mockReport).toHaveBeenCalledWith(expect.any(Error), {
      fingerprint: ['zod-schema-drift', 'notifications', 'title'],
      recordId: 'n2',
    });
  });

  it('listMusicStyles e listCities: descartam a linha inválida e usam id como recordId', async () => {
    const styles = await listMusicStyles(
      createClient([
        { id: 's1', name: 'Samba', emoji: 'x' },
        { id: 's2', name: null, emoji: 'y' },
      ]),
    );
    const cities = await listCities(
      createClient([
        { id: 'c1', name: 'Floripa', uf: 'SC', lat: 1, lng: 2, slug: null },
        { id: 'c2', name: 'Sem UF', uf: 'SCX', lat: 1, lng: 2, slug: null },
      ]),
    );

    expect(styles.map((item) => item.id)).toEqual(['s1']);
    expect(cities.map((item) => item.id)).toEqual(['c1']);
    expect(mockReport.mock.calls.map((call) => call[1])).toEqual([
      { fingerprint: ['zod-schema-drift', 'music_styles', 'name'], recordId: 's2' },
      { fingerprint: ['zod-schema-drift', 'cities', 'uf'], recordId: 'c2' },
    ]);
  });
});

describe('Tratamento de erro: erro que não é ZodError propaga', () => {
  it('TypeError do mapper rejeita a listagem e não é reportado como drift', async () => {
    await expect(listCities(createClient([null]))).rejects.toThrow(TypeError);
    expect(mockReport).not.toHaveBeenCalled();
  });
});
