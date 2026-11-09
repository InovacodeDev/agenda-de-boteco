import { reportException } from './analytics';
import { listMusicianLeads, MUSICIAN_LEADS_PAGE_SIZE } from './musician-leads';

const mockGetSupabase = jest.fn();
jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
  isSupabaseConfigured: () => mockGetSupabase() !== null,
}));
jest.mock('./analytics', () => ({ reportException: jest.fn() }));

const mockReport = reportException as jest.Mock;

function makeRow(index: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `lead-${index}`,
    name: `Banda ${index}`,
    phone: '48999991234',
    region: `Região ${index}`,
    music_style_ids: ['samba'],
    instagram: 'triodocais',
    price_range: null,
    created_at: '2026-09-01T12:00:00.000Z',
    ...overrides,
  };
}

function fullPage(invalidFrom: number) {
  return Array.from({ length: MUSICIAN_LEADS_PAGE_SIZE }, (_, i) =>
    i >= invalidFrom ? makeRow(i, { phone: 123 }) : makeRow(i),
  );
}

function clientWith(data: unknown) {
  return { rpc: jest.fn().mockResolvedValue({ data, error: null }) };
}

beforeEach(() => {
  mockReport.mockReset();
  mockGetSupabase.mockReset();
});

describe('Regra de negócio: leads inválidos saem da página sem quebrar a paginação', () => {
  it('página cheia com a última linha inválida monta o cursor a partir da última válida', async () => {
    const rows = fullPage(MUSICIAN_LEADS_PAGE_SIZE - 1);
    mockGetSupabase.mockReturnValue(clientWith(rows));

    const page = await listMusicianLeads({}, 'recent', null);

    const lastValid = MUSICIAN_LEADS_PAGE_SIZE - 2;
    expect(page.items).toHaveLength(MUSICIAN_LEADS_PAGE_SIZE - 1);
    expect(page.nextCursor).toEqual({
      createdAt: '2026-09-01T12:00:00.000Z',
      name: `Banda ${lastValid}`,
      region: `Região ${lastValid}`,
      id: `lead-${lastValid}`,
    });
    expect(mockReport).toHaveBeenCalledWith(expect.any(Error), {
      fingerprint: ['zod-schema-drift', 'musician_leads', 'phone'],
      recordId: `lead-${MUSICIAN_LEADS_PAGE_SIZE - 1}`,
    });
  });

  it('página parcial com linha inválida não gera cursor', async () => {
    mockGetSupabase.mockReturnValue(clientWith([makeRow(0), makeRow(1, { phone: 123 })]));

    const page = await listMusicianLeads({}, 'recent', null);

    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeNull();
  });

  it('página cheia sem nenhuma linha válida devolve cursor nulo e reporta page-unrecoverable', async () => {
    mockGetSupabase.mockReturnValue(clientWith(fullPage(0)));

    const page = await listMusicianLeads({}, 'recent', null);

    expect(page).toEqual({ items: [], nextCursor: null });
    const fingerprints = mockReport.mock.calls.map((call) => call[1].fingerprint);
    expect(fingerprints.filter((f) => f[2] === 'phone')).toHaveLength(3);
    expect(fingerprints).toContainEqual([
      'zod-schema-drift',
      'musician_leads',
      'page-unrecoverable',
    ]);
  });

  it('nada reportado contém nome, telefone ou instagram do lead', async () => {
    mockGetSupabase.mockReturnValue(clientWith(fullPage(0)));

    await listMusicianLeads({}, 'recent', null);

    const serialized = JSON.stringify(mockReport.mock.calls.map((call) => call[1]));
    expect(serialized).not.toContain('Banda');
    expect(serialized).not.toContain('48999991234');
    expect(serialized).not.toContain('triodocais');
  });

  it('o reporte page-unrecoverable usa um Error próprio, não o ZodError de uma linha', async () => {
    mockGetSupabase.mockReturnValue(clientWith(fullPage(0)));

    await listMusicianLeads({}, 'recent', null);

    const unrecoverable = mockReport.mock.calls.find(
      (call) => call[1].fingerprint[2] === 'page-unrecoverable',
    );
    expect(unrecoverable?.[0]).toBeInstanceOf(Error);
    expect(unrecoverable?.[0]?.name).toBe('Error');
  });
});

describe('Tratamento de erro: erro que não é ZodError propaga', () => {
  it('resposta fora do formato de lista rejeita com TypeError sem reportar drift', async () => {
    mockGetSupabase.mockReturnValue(clientWith({}));

    await expect(listMusicianLeads({}, 'recent', null)).rejects.toThrow(TypeError);

    const driftCalls = mockReport.mock.calls.filter((call) => call[1]?.fingerprint !== undefined);
    expect(driftCalls).toEqual([]);
  });
});
