'use client';

import { signOut } from '@agenda/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/estabelecimentos', label: 'Estabelecimentos' },
  { href: '/eventos', label: 'Eventos' },
  { href: '/avisos', label: 'Avisos' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="text-[22px]">🍺</span>
        <span className="font-[family-name:var(--font-heading)] text-[15px] font-semibold text-foreground">
          Agenda Admin
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-[14px] transition-colors ${
                active
                  ? 'bg-primary/10 font-semibold text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={() => void signOut()}
        className="m-3 rounded-lg border border-border px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        Sair
      </button>
    </aside>
  );
}
