'use client';

import { detectPlatform, type Platform, STORE_URLS } from '@agenda/core';
import { useSyncExternalStore } from 'react';

import { AppleIcon, PlayIcon } from '@/components/icons';

// O user-agent não muda durante a vida da página, então o subscribe é no-op.
// useSyncExternalStore evita o cascading-render de setState-em-effect: o
// servidor usa o snapshot 'other' (mostra ambos os botões), o client lê o UA.
const noopSubscribe = () => () => {};
const getClientPlatform = (): Platform => detectPlatform(navigator.userAgent);
const getServerPlatform = (): Platform => 'other';

function usePlatform(): Platform {
  return useSyncExternalStore(noopSubscribe, getClientPlatform, getServerPlatform);
}

const BTN =
  'flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-[family-name:var(--font-body)] font-semibold transition-opacity hover:opacity-90 aria-disabled:pointer-events-none aria-disabled:opacity-40';

function StoreButton({ store, children }: { store: 'android' | 'ios'; children: React.ReactNode }) {
  const href = STORE_URLS[store];
  const disabled = href === '#';
  const label = store === 'android' ? 'Baixar na Google Play' : 'Baixar na App Store';
  // Sem link real ainda: omite href (um <a> sem href não é focável nem
  // navegável por teclado) em vez de só aria-disabled, que não bloqueia o Enter.
  return (
    <a
      href={disabled ? undefined : href}
      aria-disabled={disabled}
      aria-label={disabled ? `${label} (em breve)` : label}
      className={`${BTN} bg-foreground text-background`}
    >
      {children}
    </a>
  );
}

export function DownloadButtons() {
  // Pré-hidratação/SSR: 'other' → mostra ambos (fallback sem flash, funciona sem JS).
  const platform = usePlatform();

  const showAndroid = platform === 'android' || platform === 'other';
  const showIos = platform === 'ios' || platform === 'other';

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {showAndroid ? (
        <StoreButton store="android">
          <PlayIcon />
          Google Play
        </StoreButton>
      ) : null}
      {showIos ? (
        <StoreButton store="ios">
          <AppleIcon />
          App Store
        </StoreButton>
      ) : null}
    </div>
  );
}
