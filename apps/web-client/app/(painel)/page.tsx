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
    href: '/metrics',
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
    <div className="mx-auto flex w-full max-w-300 flex-col gap-6">
      <section className="text-primary-foreground shadow-neon rounded-2xl bg-(image:--gradient-primary) p-8">
        <SparkleIcon size={32} weight="regular" aria-hidden />
        <h2 className="font-heading mt-4 text-3xl leading-9 font-bold">
          Bem-vindo{establishment?.name ? `, ${establishment.name}` : ''}!
        </h2>
        <p className="mt-2 max-w-xl text-[16px] leading-relaxed opacity-90">
          Seu painel está pronto. Cadastre o primeiro evento e apareça no feed dos amantes da noite.
        </p>
        {/* ponytail: aponta para a listagem até a Fase 3 criar /eventos/novo. */}
        <Link
          href="/eventos"
          className="bg-background text-foreground mt-5 inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <PlusIcon size={14} weight="bold" />
          Cadastrar primeiro evento
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map((item) => {
          const ItemIcon = item.icon;
          return (
            <div
              key={item.href}
              className="border-border bg-card text-card-foreground hover:border-primary/50 group flex flex-col rounded-lg border p-5 shadow-sm transition"
            >
              <ItemIcon size={24} className="text-primary mb-3" aria-hidden />
              <h3 className="mb-1 font-semibold">{item.title}</h3>
              <p className="text-muted-foreground mb-4 flex-1 text-sm">{item.description}</p>

              {item.disabled ? (
                <button
                  disabled
                  className="ring-offset-background focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 w-full items-center justify-center gap-2 rounded-[14px] border px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
                >
                  {item.cta}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className="ring-offset-background focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 w-full items-center justify-center gap-2 rounded-[14px] border px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
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
