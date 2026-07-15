export * from './config/features';
export * from './data';
export * from './platform/storage';
export * from './queries';
export * from './schemas';
export * from './supabase/client';
export * from './theme/colors';
export * from './theme/gradients';
export * from './theme/shadows';
export * from './theme/typography';
export * from './types';
export * from './utils/auth';
export * from './utils/cn';
export * from './utils/dates';
export * from './utils/env';
export * from './utils/errors';
export * from './utils/events';
export * from './utils/filters';
export * from './utils/format';
export * from './utils/geo';
export * from './utils/images';
export * from './utils/links';
export * from './utils/pressGuard';
export * from './utils/responsiveType';
// `./services/catalog` e `./queries` exportam os mesmos nomes (listEvents, etc.).
// O re-export nomeado abaixo resolve o TS2308: a fachada async do service (com
// fallback de mock) vence na API flat; a query layer crua segue acessível via
// import relativo interno ('../queries').
export * from './hooks/queries';
export * from './hooks/useActiveCity';
export * from './hooks/useConnectivity';
export * from './hooks/useGuardedPress';
export * from './hooks/useNearbyEstablishments';
export * from './lib/queryClient';
export * from './lib/queryPersister';
export * from './services/auth';
export * from './services/cachePolicy';
export {
  getEstablishment,
  getEvent,
  listCities,
  listEstablishments,
  listEventAttractions,
  listEvents,
  listEventsByEstablishment,
  listMusicStyles,
  listNotifications,
} from './services/catalog';
export * from './services/connectivity';
export * from './services/favorites';
export * from './services/proximity';
export * from './services/queryKeys';
export * from './services/realtime';
export * from './stores/useAuthStore';
export * from './stores/useFavoritesStore';
export * from './stores/useFiltersStore';
export * from './stores/useNotificationsStore';
export * from './stores/usePreferencesStore';
