'use client';

import { PanelBrand, PanelNavLinks } from '@/components/PanelNav';

export function Sidebar() {
  return (
    /* h-full + overflow-hidden: a sidebar ocupa a altura da tela e não acompanha
       o scroll do conteúdo. O scroll da página vive só no <main> do layout —
       a sidebar é estática, o menu de 6 itens nunca precisa rolar por conta própria.
       Abaixo de md ela some e o mesmo menu abre pelo drawer da Topbar. */
    <aside className="border-border bg-sidebar hidden h-full w-64 shrink-0 flex-col overflow-hidden border-r p-4 md:flex">
      <div className="mb-8">
        <PanelBrand />
      </div>
      <PanelNavLinks />
    </aside>
  );
}
