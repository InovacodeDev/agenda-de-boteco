'use client';

import {
  CalendarBlankIcon,
  ChartBarIcon,
  type Icon,
  PlusIcon,
  SparkleIcon,
  StorefrontIcon,
} from '@phosphor-icons/react';
import Link from 'next/link';

import { useOwnedEstablishment } from '@/hooks/use-owned-establishment';

const SHORTCUTS: {
  href: string;
  title: string;
  description: string;
  cta: string;
  icon: Icon;
  disabled?: boolean;
}[] = [
  {
    href: '/eventos',
    title: 'Eventos',
    description: 'Crie e gerencie suas agendas',
    cta: 'Gerenciar eventos',
    icon: CalendarBlankIcon,
  },
  {
    href: '/perfil',
    title: 'Perfil do bar',
    description: 'Edite informações e mídia',
    cta: 'Editar perfil',
    icon: StorefrontIcon,
  },
  {
    href: '/metricas',
    title: 'Métricas',
    description: 'Acompanhe visualizações e cliques',
    cta: 'Em breve',
    icon: ChartBarIcon,
    disabled: true,
  },
];

export default function DashboardPage() {
  const { data: establishment } = useOwnedEstablishment();

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      <section className="rounded-2xl bg-[image:var(--gradient-primary)] p-10 text-primary-foreground shadow-[0_20px_60px_-20px_rgba(29,215,94,0.45)]">
        <SparkleIcon size={28} weight="fill" aria-hidden />
        <h1 className="mt-4 font-[family-name:var(--font-heading)] text-[28px] font-bold leading-tight">
          Bem-vindo{establishment?.name ? `, ${establishment.name}` : ''}!
        </h1>
        <p className="mt-2 max-w-[52ch] text-[16px] leading-relaxed opacity-85">
          Seu painel está pronto. Cadastre o primeiro evento e apareça no feed dos amantes da
          noite.
        </p>
        {/* ponytail: aponta para a listagem até a Fase 3 criar /eventos/novo. */}
        <Link
          href="/eventos"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-background px-6 py-3.5 text-[15px] font-semibold text-foreground transition-opacity hover:opacity-90"
        >
          <PlusIcon size={18} weight="bold" />
          Cadastrar primeiro evento
        </Link>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {SHORTCUTS.map((item) => {
          const ItemIcon = item.icon;
          return (
            <div
              key={item.href}
              className="flex flex-col rounded-2xl border border-border bg-card p-6"
            >
              <ItemIcon size={24} className="text-primary" aria-hidden />
              <h2 className="mt-4 font-[family-name:var(--font-heading)] text-[19px] font-bold text-foreground">
                {item.title}
              </h2>
              <p className="mt-1.5 flex-1 text-[15px] text-muted-foreground">
                {item.description}
              </p>

              {item.disabled ? (
                <span
                  aria-disabled
                  className="mt-6 rounded-full bg-surface px-4 py-3 text-center text-[15px] font-medium text-muted-foreground"
                >
                  {item.cta}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="mt-6 rounded-full bg-surface-elevated px-4 py-3 text-center text-[15px] font-medium text-foreground transition-colors hover:bg-surface"
                >
                  {item.cta}
                </Link>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
