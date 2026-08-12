'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import logo from '@/public/logo.png';

// Ordem confirmada na spec (seção 10).
const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/eventos', label: 'Eventos' },
  { href: '/perfil', label: 'Perfil' },
  { href: '/metricas', label: 'Métricas' },
  { href: '/avaliacoes', label: 'Avaliações' },
  { href: '/configuracoes', label: 'Configurações' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="px-5 py-6">
        <Image src={logo} alt="Agenda de Boteco" className="h-auto w-28" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
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

      {/* ponytail: aponta para a listagem até a Fase 3 criar /eventos/novo. */}
      <Link
        href="/eventos"
        className="m-3 rounded-full bg-primary px-4 py-3 text-center text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-80"
      >
        + Novo evento
      </Link>
    </aside>
  );
}
