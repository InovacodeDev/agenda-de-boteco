'use client';

import { detectPlatform, STORE_URLS, type Platform } from '@agenda/core';
import { useEffect, useState } from 'react';

import { AppleIcon, PlayIcon } from '@/components/icons';

const BTN =
  'flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[14px] font-[family-name:var(--font-body)] font-semibold transition-opacity hover:opacity-90 aria-disabled:pointer-events-none aria-disabled:opacity-40';

function StoreButton({ store, children }: { store: 'android' | 'ios'; children: React.ReactNode }) {
  const href = STORE_URLS[store];
  const disabled = href === '#';
  return (
    <a
      href={href}
      aria-disabled={disabled}
      aria-label={store === 'android' ? 'Baixar na Google Play' : 'Baixar na App Store'}
      className={`${BTN} bg-foreground text-background`}
    >
      {children}
    </a>
  );
}

export function DownloadButtons() {
  // Pré-hidratação/SSR: mostra ambos (fallback sem flash, funciona sem JS).
  const [platform, setPlatform] = useState<Platform>('other');

  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent));
  }, []);

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
