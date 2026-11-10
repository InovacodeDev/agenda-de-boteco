import { z } from 'zod';

import { reportException } from '../services/analytics';
import { mapRowsLenient, MAX_DRIFT_REPORTS_PER_CALL } from './schema-drift';

jest.mock('../services/analytics', () => ({ reportException: jest.fn() }));

const mockReport = reportException as jest.Mock;

const rowSchema = z.object({
  id: z.string(),
  starts_at: z.string().datetime(),
  menu_items: z.array(z.object({ price: z.number() })).default([]),
});

interface TestRow {
  id: string;
  external_id?: string;
  starts_at: unknown;
  menu_items?: unknown;
}

const VALID_DATE = '2026-11-07T20:00:00.000Z';

function row(id: string, overrides: Partial<TestRow> = {}): TestRow {
  return { id, external_id: `ext-${id}`, starts_at: VALID_DATE, ...overrides };
}

function lenient(
  rows: readonly TestRow[],
  map: (r: TestRow) => unknown = (r) => rowSchema.parse(r),
) {
  return mapRowsLenient(rows, map, {
    table: 'events',
    idOf: (r) => r.external_id ?? r.id,
  });
}

beforeEach(() => {
  mockReport.mockReset();
});

describe('Regra de negócio: descarta só a linha inválida e reporta o drift', () => {
  it('3 linhas com a do meio inválida devolvem 2 itens e 1 reporte com fingerprint e recordId', () => {
    const items = lenient([row('1'), row('2', { starts_at: 'ontem' }), row('3')]);

    expect(items).toHaveLength(2);
    expect(mockReport).toHaveBeenCalledTimes(1);
    expect(mockReport).toHaveBeenCalledWith(expect.any(z.ZodError), {
      fingerprint: ['zod-schema-drift', 'events', 'starts_at'],
      recordId: 'ext-2',
    });
  });

  it('troca índice numérico por * e une os segmentos com ponto', () => {
    lenient([row('1', { menu_items: [{ price: 1 }, { price: 2 }, { price: 'x' }] })]);

    expect(mockReport.mock.calls[0]?.[1].fingerprint).toEqual([
      'zod-schema-drift',
      'events',
      'menu_items.*.price',
    ]);
  });

  it('usa root quando o issue não tem path', () => {
    const items = mapRowsLenient<unknown, string>(['x'], (value) => z.number().parse(value) + '', {
      table: 'cities',
      idOf: () => undefined,
    });

    expect(items).toEqual([]);
    expect(mockReport.mock.calls[0]?.[1]).toEqual({
      fingerprint: ['zod-schema-drift', 'cities', 'root'],
      recordId: undefined,
    });
  });

  it('usa o id quando a linha não tem external_id', () => {
    lenient([{ id: 'uuid-9', starts_at: 'ontem' }]);

    expect(mockReport.mock.calls[0]?.[1].recordId).toBe('uuid-9');
  });

  it('não coloca valor de campo no metadata reportado', () => {
    lenient([row('1', { starts_at: 'valor-sensivel-xyz' })]);

    expect(JSON.stringify(mockReport.mock.calls[0]?.[1])).not.toContain('valor-sensivel-xyz');
  });

  it('todas inválidas devolvem [] e reportam no máximo MAX_DRIFT_REPORTS_PER_CALL', () => {
    const rows = [1, 2, 3, 4, 5].map((n) => row(String(n), { starts_at: 'ontem' }));

    expect(lenient(rows)).toEqual([]);
    expect(MAX_DRIFT_REPORTS_PER_CALL).toBe(3);
    expect(mockReport).toHaveBeenCalledTimes(3);
  });
});

describe('Tratamento de erro: só ZodError é drift', () => {
  it('relança TypeError do mapper sem reportar como drift', () => {
    const map = (r: TestRow): unknown => (r.menu_items as unknown[]).length;

    expect(() => lenient([row('1')], map)).toThrow(TypeError);
    expect(mockReport).not.toHaveBeenCalled();
  });

  it('relança erro comum do mapper com a mesma instância', () => {
    const boom = new Error('boom');

    expect(() =>
      lenient([row('1')], () => {
        throw boom;
      }),
    ).toThrow(boom);
  });
});
