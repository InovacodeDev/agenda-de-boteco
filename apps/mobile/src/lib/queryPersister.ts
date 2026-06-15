import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/**
 * Persister do cache do TanStack Query em AsyncStorage. Usado pelo
 * PersistQueryClientProvider no _layout para cache-first com refetch em
 * background. `throttleTime` evita gravações excessivas em rajadas de updates.
 */
export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'agenda-query-cache',
  throttleTime: 2000,
});
