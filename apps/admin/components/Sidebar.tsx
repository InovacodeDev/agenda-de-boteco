'use client';

import { signOut } from '@agenda/core';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import logo from '@/public/logo.png';

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
      <div className="flex items-center gap-2 px-5 py-6">
        <Image src={logo} alt="Agenda de Boteco" className="h-auto w-28" />
        <span className="font-[family-name:var(--font-heading)] text-[14px] font-bold text-muted-foreground">
          Admin
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
              className={`rounded-full px-4 py-2.5 text-[14px] font-[family-name:var(--font-body)] font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
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
        className="m-3 rounded-full bg-surface-elevated px-4 py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Sair
      </button>
    </aside>
  );
}
