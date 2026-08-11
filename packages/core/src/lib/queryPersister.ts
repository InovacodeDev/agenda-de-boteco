import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

// AsyncStorage não é re-exportado por este pacote nesta versão; deriva o tipo
// do storage diretamente da própria opção de createAsyncStoragePersister.
type RQAsyncStorage = NonNullable<
  Parameters<typeof createAsyncStoragePersister>[0]['storage']
>;

/** Persister do cache do TanStack Query sobre um storage injetado. */
export function createQueryPersister(storage: RQAsyncStorage) {
  return createAsyncStoragePersister({ storage, key: 'agenda-query-cache', throttleTime: 2000 });
}
