'use client';

import { useConnectivity } from '@agenda/core';
import { WifiSlashIcon } from '@phosphor-icons/react';

/** Aviso discreto no topo, visível apenas enquanto o navegador está offline. */
export function OfflineBanner() {
  const { isOnline } = useConnectivity();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-2 z-50 flex justify-center px-4"
    >
      <div className="bg-card border-border text-muted-foreground flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium shadow-card">
        <WifiSlashIcon size={14} weight="regular" aria-hidden />
        Você está offline. Exibindo dados salvos.
      </div>
    </div>
  );
}
