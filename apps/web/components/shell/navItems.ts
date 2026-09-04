import { FEATURES } from '@agenda/core';

export interface NavItem {
  label: string;
  href: string;
  icon: 'home' | 'map' | 'heart' | 'bell' | 'user';
  /** Se a feature estiver desligada, a rota renderiza "Em construção" (gating por página). */
  enabled: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Feed', href: '/', icon: 'home', enabled: true },
  { label: 'Mapa', href: '/map', icon: 'map', enabled: FEATURES.map },
  { label: 'Favoritos', href: '/favorites', icon: 'heart', enabled: true },
  { label: 'Avisos', href: '/notices', icon: 'bell', enabled: FEATURES.notifications },
  { label: 'Perfil', href: '/profile', icon: 'user', enabled: true },
];

/** Rotas de detalhe não têm item próprio: herdam o destaque da aba de onde foram abertas. */
const DETAIL_ROUTE_PREFIXES = ['/event/', '/establishment/'];

export function isDetailRoute(pathname: string): boolean {
  return DETAIL_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** '/' casa exato; demais rotas casam por prefixo. */
export function isActive(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
