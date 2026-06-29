/**
 * realtime é um service com lógica → exige teste. Contrato travado:
 * `invalidationKeysForChange` mapeia tabela → query keys exatas (por valor), e
 * `subscribeToCatalogChanges` registra um handler por tabela no canal
 * `catalog-changes`, resolve as keys via `payload.table` e devolve um cleanup
 * que remove o canal. Usamos um client fake (não toca o Supabase real).
 */
import type { Database } from '../types';
import type {
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from '@supabase/supabase-js';
import type { QueryKey } from '@tanstack/react-query';

import { catalogKeys } from './queryKeys';
import { invalidationKeysForChange, subscribeToCatalogChanges } from './realtime';

type PostgresChangesHandler = (
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
) => void;

interface OnFilter {
  event: string;
  schema: string;
  table: string;
}

interface OnCall {
  type: string;
  filter: OnFilter;
  handler: PostgresChangesHandler;
}

interface FakeChannel {
  on: jest.Mock<FakeChannel, [string, OnFilter, PostgresChangesHandler]>;
  subscribe: jest.Mock<FakeChannel, []>;
  onCalls: OnCall[];
}

/** Canal fake encadeável que registra as chamadas de `.on`/`.subscribe`. */
function makeFakeChannel(): FakeChannel {
  const onCalls: OnCall[] = [];
  const channel: FakeChannel = {
    on: jest.fn((type, filter, handler) => {
      onCalls.push({ type, filter, handler });
      return channel;
    }),
    subscribe: jest.fn(() => channel),
    onCalls,
  };
  return channel;
}

function makeFakeClient() {
  const channel = makeFakeChannel();
  const channelFactory = jest.fn(() => channel);
  const removeChannel = jest.fn();
  const client = {
    channel: channelFactory,
    removeChannel,
  };
  return {
    client: client as unknown as SupabaseClient<Database>,
    channelFactory,
    removeChannel,
    getChannel: (): FakeChannel => channel,
  };
}

function changePayload(
  table: string,
): RealtimePostgresChangesPayload<Record<string, unknown>> {
  return { table } as unknown as RealtimePostgresChangesPayload<
    Record<string, unknown>
  >;
}

describe('invalidationKeysForChange', () => {
  it('mapeia events → [events.root]', () => {
    expect(invalidationKeysForChange('events')).toEqual([catalogKeys.events.root]);
    expect(invalidationKeysForChange('events')).toEqual([['events']]);
  });

  it('mapeia establishments → [establishments.root, events.root]', () => {
    expect(invalidationKeysForChange('establishments')).toEqual([
      catalogKeys.establishments.root,
      catalogKeys.events.root,
    ]);
    expect(invalidationKeysForChange('establishments')).toEqual([
      ['establishments'],
      ['events'],
    ]);
  });

  it('mapeia notifications → [notifications]', () => {
    expect(invalidationKeysForChange('notifications')).toEqual([
      catalogKeys.notifications,
    ]);
    expect(invalidationKeysForChange('notifications')).toEqual([['notifications']]);
  });

  it('tabela desconhecida → []', () => {
    expect(invalidationKeysForChange('foo')).toEqual([]);
  });
});

describe('subscribeToCatalogChanges', () => {
  it('cria o canal catalog-changes e assina as 3 tabelas', () => {
    const { client, channelFactory, getChannel } = makeFakeClient();

    subscribeToCatalogChanges(client, () => undefined);
    const channel = getChannel();

    expect(channelFactory).toHaveBeenCalledWith('catalog-changes');
    expect(channel.on).toHaveBeenCalledTimes(3);
    expect(channel.subscribe).toHaveBeenCalledTimes(1);

    const tables = channel.onCalls.map((call) => call.filter.table);
    expect(tables).toEqual(['events', 'establishments', 'notifications']);
    for (const call of channel.onCalls) {
      expect(call.type).toBe('postgres_changes');
      expect(call.filter.event).toBe('*');
      expect(call.filter.schema).toBe('public');
    }
  });

  it('resolve as keys a partir de payload.table (establishments)', () => {
    const { client, getChannel } = makeFakeClient();
    const onInvalidate = jest.fn<void, [QueryKey[]]>();

    subscribeToCatalogChanges(client, onInvalidate);
    // Dispara o handler da tabela 'establishments' com payload de OUTRA tabela
    // para provar que a resolução vem de payload.table, não do handler.
    const eventsHandler = getChannel().onCalls[0].handler;
    eventsHandler(changePayload('establishments'));

    expect(onInvalidate).toHaveBeenCalledWith([['establishments'], ['events']]);
  });

  it('resolve [events] quando payload.table é events', () => {
    const { client, getChannel } = makeFakeClient();
    const onInvalidate = jest.fn<void, [QueryKey[]]>();

    subscribeToCatalogChanges(client, onInvalidate);
    getChannel().onCalls[0].handler(changePayload('events'));

    expect(onInvalidate).toHaveBeenCalledWith([['events']]);
  });

  it('cleanup remove o canal criado exatamente uma vez', () => {
    const { client, removeChannel, getChannel } = makeFakeClient();

    const cleanup = subscribeToCatalogChanges(client, () => undefined);
    cleanup();

    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(removeChannel).toHaveBeenCalledWith(getChannel());
  });
});
