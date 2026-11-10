import type { FavoriteTarget } from '../services/favorites';
import { MAX_PENDING_OP_ATTEMPTS, type PendingOp, useFavoritesStore } from './useFavoritesStore';

const mockAdd = jest.fn<Promise<void>, [string, FavoriteTarget]>(() => Promise.resolve());
const mockRemove = jest.fn<Promise<void>, [string, FavoriteTarget]>(() => Promise.resolve());

jest.mock('../services/favorites', () => ({
  addServerFavorite: (userId: string, target: FavoriteTarget) => mockAdd(userId, target),
  addServerFavorites: () => Promise.resolve(),
  removeServerFavorite: (userId: string, target: FavoriteTarget) => mockRemove(userId, target),
  fetchServerFavorites: () => Promise.resolve([]),
}));

const mockReportException = jest.fn();
jest.mock('../services/analytics', () => ({
  reportException: (...args: unknown[]) => mockReportException(...args),
}));

const rls42501 = { message: 'rls', details: '', hint: '', code: '42501' };
const fk23503 = { message: 'fk', details: '', hint: '', code: '23503' };
const networkError = new TypeError('Network request failed');

function setQueue(pendingOps: PendingOp[]) {
  useFavoritesStore.setState({ eventIds: [], establishmentIds: [], pendingOps });
}

const addEvent = (attempts?: number): PendingOp => ({
  op: 'add',
  target: { type: 'event', id: 'ev1' },
  ...(attempts === undefined ? {} : { attempts }),
});

beforeEach(() => {
  mockAdd.mockReset().mockImplementation(() => Promise.resolve());
  mockRemove.mockReset().mockImplementation(() => Promise.resolve());
  mockReportException.mockReset();
  setQueue([]);
});

describe('Regra de negócio: fila de favoritos com teto de tentativas', () => {
  it('erro permanente 42501 (RLS) sai da fila no primeiro flush e é reportado', async () => {
    mockAdd.mockRejectedValueOnce(rls42501);
    setQueue([addEvent()]);

    await useFavoritesStore.getState().flushQueue('userX');

    expect(useFavoritesStore.getState().pendingOps).toEqual([]);
    expect(mockReportException).toHaveBeenCalledTimes(1);
  });

  it('erro permanente 23503 (FK de alvo apagado) em remove sai da fila', async () => {
    mockRemove.mockRejectedValueOnce(fk23503);
    setQueue([{ op: 'remove', target: { type: 'establishment', id: 'es1' } }]);

    await useFavoritesStore.getState().flushQueue('userX');

    expect(useFavoritesStore.getState().pendingOps).toEqual([]);
    expect(mockReportException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'FavoritesQueueDropped' }),
      expect.objectContaining({ fingerprint: ['favorites-queue-dropped', 'remove'] }),
    );
  });

  it('o reporte do drop usa Error novo, method flushQueue e não vaza id nem userId', async () => {
    mockAdd.mockRejectedValueOnce(rls42501);
    setQueue([addEvent()]);

    await useFavoritesStore.getState().flushQueue('user-secret');

    const [reported, metadata] = mockReportException.mock.calls[0] as [Error, unknown];
    expect(reported).toBeInstanceOf(Error);
    expect(reported).not.toBe(rls42501);
    expect(metadata).toEqual({
      method: 'favorites.flushQueue',
      fingerprint: ['favorites-queue-dropped', 'add'],
      code: '42501',
    });
    expect(JSON.stringify(mockReportException.mock.calls)).not.toContain('user-secret');
    expect(JSON.stringify(mockReportException.mock.calls)).not.toContain('ev1');
  });

  it('erro de rede permanece na fila com attempts === 1 e não reporta', async () => {
    mockAdd.mockRejectedValueOnce(networkError);
    setQueue([addEvent()]);

    await useFavoritesStore.getState().flushQueue('userX');

    expect(useFavoritesStore.getState().pendingOps).toEqual([addEvent(1)]);
    expect(mockReportException).not.toHaveBeenCalled();
  });

  it('op com attempts no limite menos um e erro de rede sai da fila e é reportado', async () => {
    mockAdd.mockRejectedValueOnce(networkError);
    setQueue([addEvent(MAX_PENDING_OP_ATTEMPTS - 1)]);

    await useFavoritesStore.getState().flushQueue('userX');

    expect(useFavoritesStore.getState().pendingOps).toEqual([]);
    expect(mockReportException).toHaveBeenCalledTimes(1);
  });

  it('erro de rede repetido descarta a op só na quinta falha', async () => {
    mockAdd.mockRejectedValue(networkError);
    setQueue([addEvent()]);

    for (let attempt = 1; attempt < MAX_PENDING_OP_ATTEMPTS; attempt += 1) {
      await useFavoritesStore.getState().flushQueue('userX');
      expect(useFavoritesStore.getState().pendingOps).toEqual([addEvent(attempt)]);
    }
    await useFavoritesStore.getState().flushQueue('userX');

    expect(useFavoritesStore.getState().pendingOps).toEqual([]);
    expect(mockReportException).toHaveBeenCalledTimes(1);
  });

  it('op que dá certo sai da fila, inclusive com attempts acumulado', async () => {
    setQueue([addEvent(3)]);

    await useFavoritesStore.getState().flushQueue('userX');

    expect(useFavoritesStore.getState().pendingOps).toEqual([]);
    expect(mockReportException).not.toHaveBeenCalled();
  });

  it('estado persistido antigo sem attempts continua válido', async () => {
    mockAdd.mockRejectedValueOnce(networkError);
    setQueue([{ op: 'add', target: { type: 'event', id: 'legacy' } }]);

    await useFavoritesStore.getState().flushQueue('userX');

    expect(useFavoritesStore.getState().pendingOps[0]?.attempts).toBe(1);
  });

  it('ops enfileiradas durante o flush continuam na fila depois de um drop', async () => {
    mockAdd.mockImplementationOnce(async () => {
      useFavoritesStore.getState().toggleEstablishment('es-novo');
      throw rls42501;
    });
    setQueue([addEvent()]);

    await useFavoritesStore.getState().flushQueue('userX');

    expect(useFavoritesStore.getState().pendingOps).toEqual([
      { op: 'add', target: { type: 'establishment', id: 'es-novo' } },
    ]);
  });

  it('uma op descartada não bloqueia as seguintes da mesma fila', async () => {
    mockAdd.mockRejectedValueOnce(rls42501);
    setQueue([addEvent(), { op: 'add', target: { type: 'event', id: 'ev2' } }]);

    await useFavoritesStore.getState().flushQueue('userX');

    expect(mockAdd).toHaveBeenCalledTimes(2);
    expect(useFavoritesStore.getState().pendingOps).toEqual([]);
  });
});

describe('Tratamento de erro: flushQueue sem sessão ou com erro genérico', () => {
  it('deslogado não chama o service, não reporta e mantém a fila intacta', async () => {
    setQueue([addEvent(2)]);

    await useFavoritesStore.getState().flushQueue(null);

    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockReportException).not.toHaveBeenCalled();
    expect(useFavoritesStore.getState().pendingOps).toEqual([addEvent(2)]);
  });

  it('erro não-Postgrest sem code também fica na fila até o teto', async () => {
    mockAdd.mockRejectedValueOnce(new Error('boom'));
    setQueue([addEvent()]);

    await useFavoritesStore.getState().flushQueue('userX');

    expect(useFavoritesStore.getState().pendingOps).toEqual([addEvent(1)]);
  });
});
