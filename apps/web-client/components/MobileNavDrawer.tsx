'use client';

import { ListIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

import { PanelBrand, PanelNavLinks } from '@/components/PanelNav';

/** Menu do painel em telas < md, onde a Sidebar fica oculta. */
export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
        aria-expanded={open}
        aria-controls="panel-mobile-nav"
        className="text-foreground hover:bg-surface -ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors md:hidden"
      >
        <ListIcon size={24} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/60"
          />
          <aside
            id="panel-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menu do painel"
            className="border-border bg-sidebar absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r p-4"
          >
            <div className="mb-8 flex items-center justify-between gap-3">
              <PanelBrand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="text-muted-foreground hover:text-foreground flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
              >
                <XIcon size={20} />
              </button>
            </div>
            <PanelNavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
