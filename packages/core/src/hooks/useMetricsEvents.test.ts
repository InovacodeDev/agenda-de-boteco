/**
 * @jest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

import { EVENTS } from '../data';
import type { Event } from '../schemas/catalog';
import { catalogKeys } from '../services/queryKeys';

const mockListEventsByIds = jest.fn();

jest.mock('../services/catalog', () => ({
  listEventsByIds: (ids: readonly string[]) => mockListEventsByIds(ids),
}));

import { useMetricsEvents } from './useMetricsEvents';

function makeEvent(id: string): Event {
  const template = EVENTS[0];
  if (!template) {
    throw new Error('EVENTS mock vazio');
  }
  return { ...template, id };
}

function makeIds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `ev-${index}`);
}

function renderMetricsEvents(eventIds: readonly string[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  // NOTE: o spread lê todas as props do resultado; o TanStack só re-renderiza por props lidas.
  return renderHook(() => ({ ...useMetricsEvents(eventIds) }), { wrapper });
}

beforeEach(() => {
  mockListEventsByIds.mockReset();
  mockListEventsByIds.mockImplementation(async (ids: readonly string[]) =>
    [...ids].reverse().map(makeEvent),
  );
});

describe('useMetricsEvents', () => {
  it('lista vazia não consulta eventos e não tem próxima página', async () => {
    const { result } = renderMetricsEvents([]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages).toEqual([{ items: [], nextCursor: null }]);
    expect(result.current.hasNextPage).toBe(false);
    expect(mockListEventsByIds).toHaveBeenCalledWith([]);
  });

  it('lista até 20 ids cabe numa página só', async () => {
    const ids = makeIds(20);
    const { result } = renderMetricsEvents(ids);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
    expect(mockListEventsByIds).toHaveBeenCalledTimes(1);
    expect(mockListEventsByIds).toHaveBeenCalledWith(ids);
  });

  it('pagina de 20 em 20 por offset até o fim da lista', async () => {
    const ids = makeIds(45);
    const { result } = renderMetricsEvents(ids);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockListEventsByIds).toHaveBeenLastCalledWith(ids.slice(0, 20));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(mockListEventsByIds).toHaveBeenLastCalledWith(ids.slice(20, 40));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(3));
    expect(mockListEventsByIds).toHaveBeenLastCalledWith(ids.slice(40, 45));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('mantém a ordem dos ids dentro da página, não a do service', async () => {
    const ids = ['c', 'a', 'b'];
    const { result } = renderMetricsEvents(ids);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]?.items.map((event) => event.id)).toEqual(ids);
  });

  it('omite id sem evento correspondente', async () => {
    mockListEventsByIds.mockResolvedValue([makeEvent('b')]);
    const { result } = renderMetricsEvents(['a', 'b', 'c']);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.pages[0]?.items.map((event) => event.id)).toEqual(['b']);
  });

  it('key preserva a ordem dos ids', () => {
    expect(catalogKeys.panel.metricsEvents(['b', 'a'])).toEqual([
      'panel',
      'metrics',
      'events',
      ['b', 'a'],
    ]);
    expect(catalogKeys.panel.metricsEvents(['b', 'a'])).not.toEqual(
      catalogKeys.panel.metricsEvents(['a', 'b']),
    );
  });
});
