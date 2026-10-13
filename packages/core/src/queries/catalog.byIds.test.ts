/**
 * Lookup por ids e busca por nome da query layer. Fake de client mínimo e
 * gravador de chamadas: o que importa aqui é QUAIS filtros chegam ao PostgREST
 * (chunking, ilike escapado, nenhuma query para lista vazia), não o parsing das
 * linhas — esse já é coberto em services/catalog.test.ts.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { ESTABLISHMENTS, EVENTS } from '../data';
import type { Database } from '../types';
import {
  IN_FILTER_CHUNK_SIZE,
  listEstablishments,
  listEstablishmentsByIds,
  listEventsByIds,
} from './catalog';

type Row = Record<string, unknown>;
type FakeError = { message: string; details: string; hint: string; code: string };

const POSTGREST_ERROR: FakeError = {
  message: 'boom',
  details: 'detalhe',
  hint: '',
  code: '500',
};

function establishmentRow(id: string, name: string): Row {
  const base = ESTABLISHMENTS[0];
  return {
    ...base,
    id,
    name,
    external_id: base.external_id,
    logo_url: null,
    cover_url: null,
    instagram: null,
    slug: null,
    menu_pdf_url: null,
    menu_photo_urls: [],
    menu_items: [],
  };
}

function eventRow(id: string, startsAt: string): Row {
  const base = EVENTS[0];
  return {
    ...base,
    id,
    starts_at: startsAt,
    banner_url: null,
    courtesy: null,
    promo: null,
    slug: null,
    photo_urls: [],
  };
}

interface Recorder {
  tables: string[];
  filters: unknown[][];
}

function createClient(
  rowsFor: (chunk: string[]) => Row[],
  options: { error?: FakeError; recorder: Recorder },
): SupabaseClient<Database> {
  const { error, recorder } = options;
  const client = {
    from(table: string) {
      recorder.tables.push(table);
      let chunk: string[] = [];
      const builder = {
        select() {
          return builder;
        },
        in(column: string, values: string[]) {
          recorder.filters.push(['in', column, values]);
          chunk = values;
          return builder;
        },
        eq(column: string, value: unknown) {
          recorder.filters.push(['eq', column, value]);
          return builder;
        },
        ilike(column: string, pattern: string) {
          recorder.filters.push(['ilike', column, pattern]);
          return builder;
        },
        or(expression: string) {
          recorder.filters.push(['or', expression]);
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        then<TResult>(
          onFulfilled: (value: { data: Row[] | null; error: FakeError | null }) => TResult,
        ): Promise<TResult> {
          if (error) {
            return Promise.resolve(onFulfilled({ data: null, error }));
          }
          return Promise.resolve(onFulfilled({ data: rowsFor(chunk), error: null }));
        },
      };
      return builder;
    },
  };
  return client as unknown as SupabaseClient<Database>;
}

function newRecorder(): Recorder {
  return { tables: [], filters: [] };
}

describe('listEstablishmentsByIds', () => {
  it('não consulta o banco para lista vazia', async () => {
    const recorder = newRecorder();
    const client = createClient(() => [], { recorder });

    await expect(listEstablishmentsByIds(client, [])).resolves.toEqual([]);
    expect(recorder.tables).toEqual([]);
  });

  it('consulta com .in("id") deduplicado e ordenado', async () => {
    const recorder = newRecorder();
    const client = createClient(() => [], { recorder });

    await listEstablishmentsByIds(client, ['b', 'a', 'b']);

    expect(recorder.tables).toEqual(['establishments']);
    expect(recorder.filters).toEqual([['in', 'id', ['a', 'b']]]);
  });

  it('fatia a lista em chunks de IN_FILTER_CHUNK_SIZE', async () => {
    const recorder = newRecorder();
    const client = createClient(() => [], { recorder });
    const ids = Array.from({ length: IN_FILTER_CHUNK_SIZE * 2 + 50 }, (_, i) =>
      `e${String(i).padStart(4, '0')}`,
    );

    await listEstablishmentsByIds(client, ids);

    const sizes = recorder.filters.map((call) => (call[2] as string[]).length);
    expect(sizes).toEqual([IN_FILTER_CHUNK_SIZE, IN_FILTER_CHUNK_SIZE, 50]);
  });

  it('usa um único chunk quando a lista cabe no limite', async () => {
    const recorder = newRecorder();
    const client = createClient(() => [], { recorder });
    const ids = Array.from({ length: IN_FILTER_CHUNK_SIZE }, (_, i) => `e${i}`);

    await listEstablishmentsByIds(client, ids);

    expect(recorder.filters).toHaveLength(1);
  });

  it('reúne os chunks e ordena por nome', async () => {
    const recorder = newRecorder();
    const names: Record<string, string> = { a: 'Zeta', b: 'Alfa', c: 'Mestre' };
    const client = createClient(
      (chunk) => chunk.map((id) => establishmentRow(id, names[id] ?? id)),
      { recorder },
    );
    const ids = [
      'a',
      'b',
      'c',
      ...Array.from({ length: IN_FILTER_CHUNK_SIZE }, (_, i) => `z${String(i).padStart(3, '0')}`),
    ];

    const result = await listEstablishmentsByIds(client, ids);

    expect(recorder.filters.length).toBeGreaterThan(1);
    const named = result.filter((item) => names[item.id] !== undefined).map((item) => item.name);
    expect(named).toEqual(['Alfa', 'Mestre', 'Zeta']);
  });

  it('relança o erro do Postgrest', async () => {
    const recorder = newRecorder();
    const client = createClient(() => [], { error: POSTGREST_ERROR, recorder });

    await expect(listEstablishmentsByIds(client, ['a'])).rejects.toEqual(POSTGREST_ERROR);
  });
});

describe('listEventsByIds', () => {
  it('não consulta o banco para lista vazia', async () => {
    const recorder = newRecorder();
    const client = createClient(() => [], { recorder });

    await expect(listEventsByIds(client, [])).resolves.toEqual([]);
    expect(recorder.tables).toEqual([]);
  });

  it('consulta events com .in("id") e fatia em chunks', async () => {
    const recorder = newRecorder();
    const client = createClient(() => [], { recorder });
    const ids = Array.from({ length: IN_FILTER_CHUNK_SIZE + 1 }, (_, i) =>
      `ev${String(i).padStart(4, '0')}`,
    );

    await listEventsByIds(client, ids);

    expect(new Set(recorder.tables)).toEqual(new Set(['events']));
    expect(recorder.filters.map((call) => (call[2] as string[]).length)).toEqual([
      IN_FILTER_CHUNK_SIZE,
      1,
    ]);
  });

  it('ordena por starts_at asc entre chunks', async () => {
    const recorder = newRecorder();
    const startsAtById: Record<string, string> = {
      late: '2030-01-02T20:00:00.000Z',
      early: '2030-01-01T20:00:00.000Z',
    };
    const client = createClient(
      (chunk) =>
        chunk
          .filter((id) => startsAtById[id] !== undefined)
          .map((id) => eventRow(id, startsAtById[id] ?? '')),
      { recorder },
    );
    const filler = Array.from({ length: IN_FILTER_CHUNK_SIZE }, (_, i) => `f${String(i).padStart(3, '0')}`);

    const result = await listEventsByIds(client, ['late', ...filler, 'early']);

    expect(result.map((event) => event.id)).toEqual(['early', 'late']);
  });

  it('relança o erro do Postgrest', async () => {
    const recorder = newRecorder();
    const client = createClient(() => [], { error: POSTGREST_ERROR, recorder });

    await expect(listEventsByIds(client, ['ev1'])).rejects.toEqual(POSTGREST_ERROR);
  });
});

describe('listEstablishments com busca', () => {
  it('aplica .ilike("name") com o padrão escapado', async () => {
    const recorder = newRecorder();
    const client = createClient(() => [], { recorder });

    await listEstablishments(client, undefined, null, 20, '50%_off');

    expect(recorder.filters).toEqual([['ilike', 'name', '%50\\%\\__ff%']]);
  });

  it('não aplica ilike para busca vazia, só espaços ou só `*`', async () => {
    const recorder = newRecorder();
    const client = createClient(() => [], { recorder });

    await listEstablishments(client, undefined, null, 20, '');
    await listEstablishments(client, undefined, null, 20, '   ');
    await listEstablishments(client, undefined, null, 20, '*');
    await listEstablishments(client, undefined, null, 20);

    expect(recorder.filters).toEqual([]);
  });

  it('combina cidade, busca e cursor em E (filtros separados)', async () => {
    const recorder = newRecorder();
    const client = createClient(() => [], { recorder });

    await listEstablishments(client, 'fln', 'Alfa|e1', 20, 'bar');

    expect(recorder.filters.map((call) => call[0])).toEqual(['eq', 'ilike', 'or']);
    expect(recorder.filters[0]).toEqual(['eq', 'city_id', 'fln']);
    expect(recorder.filters[1]).toEqual(['ilike', 'name', '%b_r%']);
  });

  it('mantém vírgula e parênteses do termo fora do .or() do cursor', async () => {
    const recorder = newRecorder();
    const client = createClient(() => [], { recorder });

    await listEstablishments(client, undefined, 'Alfa|e1', 20, 'x, (w)');

    const orCall = recorder.filters.find((call) => call[0] === 'or');
    expect(String(orCall?.[1])).not.toContain('x, (w)');
    expect(recorder.filters.find((call) => call[0] === 'ilike')?.[2]).toBe('%x, (w)%');
  });

  it('relança o erro do Postgrest', async () => {
    const recorder = newRecorder();
    const client = createClient(() => [], { error: POSTGREST_ERROR, recorder });

    await expect(listEstablishments(client, undefined, null, 20, 'bar')).rejects.toEqual(
      POSTGREST_ERROR,
    );
  });
});
