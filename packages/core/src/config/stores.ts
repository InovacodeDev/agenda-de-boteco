/**
 * URLs das lojas. Placeholders até a publicação — trocar aqui (fonte única).
 * Um valor '#' sinaliza "ainda sem link" e a UI deve desabilitar o botão.
 */
export const STORE_URLS = {
  android: '#',
  ios: '#',
} as const;

export type StoreKey = keyof typeof STORE_URLS;
