/**
 * Service de lookup por ids e busca por nome: caminho sem client (mock),
 * lista vazia sem consulta e propagação de erro via handleServiceError.
 */
import { ESTABLISHMENTS, EVENTS } from '../data';

const mockGetSupabase = jest.fn();
const mockListEstablishmentsByIds = jest.fn();
const mockListEventsByIds = jest.fn();
const mockListEstablishments = jest.fn();

jest.mock('../supabase/client', () => ({
  getConfiguredSupabase: () => mockGetSupabase(),
}));

jest.mock('../queries', () => ({
  listEstablishmentsByIds: (...args: unknown[]) => mockListEstablishmentsByIds(...args),
  listEventsByIds: (...args: unknown[]) => mockListEventsByIds(...args),
  listEstablishments: (...args: unknown[]) => mockListEstablishments(...args),
}));

const mockHandleServiceError = jest.fn((error: unknown, _context: unknown): never => {
  throw error;
});

jest.mock('../utils/errors', () => ({
  handleServiceError: (error: unknown, context: unknown) => mockHandleServiceError(error, context),
}));

import { listEstablishments, listEstablishmentsByIds, listEventsByIds } from './catalog';

const FAKE_CLIENT = { fake: true };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listEstablishmentsByIds (service)', () => {
  it('lista vazia devolve [] sem tocar no client nem na query', async () => {
    mockGetSupabase.mockReturnValue(FAKE_CLIENT);

    await expect(listEstablishmentsByIds([])).resolves.toEqual([]);
    expect(mockGetSupabase).not.toHaveBeenCalled();
    expect(mockListEstablishmentsByIds).not.toHaveBeenCalled();
  });

  it('sem client cai no mock e devolve só os ids pedidos, ordenados por nome', async () => {
    mockGetSupabase.mockReturnValue(null);
    const wanted = ESTABLISHMENTS.slice(0, 3).map((item) => item.id);

    const result = await listEstablishmentsByIds([...wanted, 'nao-existe']);

    expect(result.map((item) => item.id).sort()).toEqual([...wanted].sort());
    const names = result.map((item) => item.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  });

  it('com client delega com ids deduplicados e ordenados', async () => {
    mockGetSupabase.mockReturnValue(FAKE_CLIENT);
    mockListEstablishmentsByIds.mockResolvedValue([]);

    await listEstablishmentsByIds(['b', 'a', 'b']);

    expect(mockListEstablishmentsByIds).toHaveBeenCalledWith(FAKE_CLIENT, ['a', 'b']);
  });

  it('erro da query passa por handleServiceError sem ids no contexto', async () => {
    const failure = new Error('falha');
    mockGetSupabase.mockReturnValue(FAKE_CLIENT);
    mockListEstablishmentsByIds.mockRejectedValue(failure);

    await expect(listEstablishmentsByIds(['a', 'b'])).rejects.toBe(failure);
    expect(mockHandleServiceError).toHaveBeenCalledWith(failure, {
      method: 'catalog.listEstablishmentsByIds',
      args: { count: 2 },
    });
  });
});

describe('listEventsByIds (service)', () => {
  it('lista vazia devolve [] sem tocar no client nem na query', async () => {
    mockGetSupabase.mockReturnValue(FAKE_CLIENT);

    await expect(listEventsByIds([])).resolves.toEqual([]);
    expect(mockGetSupabase).not.toHaveBeenCalled();
    expect(mockListEventsByIds).not.toHaveBeenCalled();
  });

  it('sem client cai no mock, ordenado por starts_at asc', async () => {
    mockGetSupabase.mockReturnValue(null);
    const wanted = EVENTS.slice(0, 4).map((item) => item.id);

    const result = await listEventsByIds(wanted);

    expect(result.map((item) => item.id).sort()).toEqual([...wanted].sort());
    const times = result.map((item) => Date.parse(item.starts_at));
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('erro da query passa por handleServiceError', async () => {
    const failure = new Error('falha');
    mockGetSupabase.mockReturnValue(FAKE_CLIENT);
    mockListEventsByIds.mockRejectedValue(failure);

    await expect(listEventsByIds(['ev1'])).rejects.toBe(failure);
    expect(mockHandleServiceError).toHaveBeenCalledWith(failure, {
      method: 'catalog.listEventsByIds',
      args: { count: 1 },
    });
  });
});

describe('listEstablishments (service) com busca', () => {
  it('repassa o termo à query layer', async () => {
    mockGetSupabase.mockReturnValue(FAKE_CLIENT);
    mockListEstablishments.mockResolvedValue({ items: [], nextCursor: null });

    await listEstablishments('fln', 'cursor', 10, 'zé');

    expect(mockListEstablishments).toHaveBeenCalledWith(FAKE_CLIENT, 'fln', 'cursor', 10, 'zé');
  });

  it('no mock filtra por nome ignorando acento e caixa', async () => {
    mockGetSupabase.mockReturnValue(null);
    const target = ESTABLISHMENTS[0];
    const accented = target.name.toUpperCase();

    const page = await listEstablishments(undefined, null, 50, accented);

    expect(page.items.some((item) => item.id === target.id)).toBe(true);
  });

  it('no mock, termo sem acento acha nome acentuado', async () => {
    mockGetSupabase.mockReturnValue(null);
    const page = await listEstablishments(undefined, null, 50, 'do ze');

    expect(page.items.map((item) => item.name)).toEqual(['Boteco do Zé']);
  });

  it('no mock, busca sem resultado devolve página vazia', async () => {
    mockGetSupabase.mockReturnValue(null);

    const page = await listEstablishments(undefined, null, 20, 'zzzz-inexistente');

    expect(page.items).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it('no mock, busca em branco não filtra', async () => {
    mockGetSupabase.mockReturnValue(null);

    const page = await listEstablishments(undefined, null, 50, '   ');

    expect(page.items).toHaveLength(ESTABLISHMENTS.length);
  });
});
