'use client';

import {
  CalendarBlankIcon,
  ChartBarIcon,
  GearIcon,
  type Icon,
  PlusIcon,
  SquaresFourIcon,
  StarIcon,
  StorefrontIcon,
} from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import logo from '@/public/logo.png';

// Ordem confirmada na spec (seção 10).
const NAV: { href: string; label: string; icon: Icon }[] = [
  { href: '/', label: 'Dashboard', icon: SquaresFourIcon },
  { href: '/eventos', label: 'Eventos', icon: CalendarBlankIcon },
  { href: '/perfil', label: 'Perfil', icon: StorefrontIcon },
  { href: '/metricas', label: 'Métricas', icon: ChartBarIcon },
  { href: '/avaliacoes', label: 'Avaliações', icon: StarIcon },
  { href: '/configuracoes', label: 'Configurações', icon: GearIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-r border-border bg-background">
      <div className="flex items-center gap-3 px-6 py-6">
        <Image
          src={logo}
          alt=""
          aria-hidden
          className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-1"
        />
        <span className="flex flex-col leading-tight">
          <span className="font-[family-name:var(--font-heading)] text-[17px] font-bold text-foreground">
            Agenda
          </span>
          <span className="text-[13px] text-muted-foreground">de Boteco</span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 px-6">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const ItemIcon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-[family-name:var(--font-body)] font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground'
              }`}
            >
              <ItemIcon size={20} weight={active ? 'fill' : 'regular'} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ponytail: aponta para a listagem até a Fase 3 criar /eventos/novo. */}
      <Link
        href="/eventos"
        className="mx-6 mb-6 flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-[15px] font-semibold text-primary-foreground shadow-[0_10px_40px_-10px_rgba(29,215,94,0.45)] transition-opacity hover:opacity-90"
      >
        <PlusIcon size={18} weight="bold" />
        Novo evento
      </Link>
    </aside>
  );
}
