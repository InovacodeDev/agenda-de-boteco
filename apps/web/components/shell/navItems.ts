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
  { label: 'Mapa', href: '/mapa', icon: 'map', enabled: FEATURES.map },
  { label: 'Favoritos', href: '/favoritos', icon: 'heart', enabled: true },
  { label: 'Avisos', href: '/avisos', icon: 'bell', enabled: FEATURES.notifications },
  { label: 'Perfil', href: '/perfil', icon: 'user', enabled: true },
];

/** '/' casa exato; demais rotas casam por prefixo. */
export function isActive(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
