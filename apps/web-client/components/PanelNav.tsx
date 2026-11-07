'use client';

import { useFeatureFlag } from '@agenda/core';
import {
  CalendarBlankIcon,
  ChartBarIcon,
  GearIcon,
  type Icon,
  MicrophoneStageIcon,
  PlusIcon,
  SquaresFourIcon,
  StarIcon,
  StorefrontIcon,
} from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import logo from '@/public/logo.png';

type PanelFlag = 'panel-metrics' | 'panel-reviews' | 'panel-settings';

// Ordem confirmada na spec (seção 10).
const NAV: { href: string; label: string; icon: Icon; flag?: PanelFlag }[] = [
  { href: '/', label: 'Dashboard', icon: SquaresFourIcon },
  { href: '/events', label: 'Eventos', icon: CalendarBlankIcon },
  { href: '/artists', label: 'Artistas', icon: MicrophoneStageIcon },
  { href: '/profile', label: 'Perfil', icon: StorefrontIcon },
  { href: '/metrics', label: 'Métricas', icon: ChartBarIcon, flag: 'panel-metrics' },
  { href: '/reviews', label: 'Avaliações', icon: StarIcon, flag: 'panel-reviews' },
  { href: '/settings', label: 'Configurações', icon: GearIcon, flag: 'panel-settings' },
];

export function PanelBrand() {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <Image
        src={logo}
        alt=""
        aria-hidden
        className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-1"
      />
      <span className="flex flex-col leading-tight">
        <span className="text-foreground text-[16px] font-bold">Agenda</span>
        <span className="text-muted-foreground text-xs">de Boteco</span>
      </span>
    </div>
  );
}

/**
 * Itens do menu + atalho "Novo evento", compartilhados pela Sidebar (desktop)
 * e pelo drawer da Topbar (< md) para os dois nunca divergirem.
 */
export function PanelNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const flags: Record<PanelFlag, boolean> = {
    'panel-metrics': useFeatureFlag('panel-metrics'),
    'panel-reviews': useFeatureFlag('panel-reviews'),
    'panel-settings': useFeatureFlag('panel-settings'),
  };
  const nav = NAV.filter((item) => !item.flag || flags[item.flag]);

  return (
    <>
      <nav className="flex flex-1 flex-col gap-1">
        {nav.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const ItemIcon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`font-body flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground shadow-neon'
                  : 'text-muted-foreground hover:bg-surface hover:text-foreground'
              }`}
            >
              <ItemIcon size={20} weight="regular" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Link
        href="/events/new"
        onClick={onNavigate}
        className="bg-primary text-primary-foreground shadow-neon mt-4 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
      >
        <PlusIcon size={16} weight="bold" />
        Novo evento
      </Link>
    </>
  );
}
