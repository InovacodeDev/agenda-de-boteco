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
    href: '/events',
    title: 'Eventos',
    description: 'Crie e gerencie suas agendas',
    cta: 'Gerenciar eventos',
    icon: CalendarBlankIcon,
  },
  {
    href: '/profile',
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
      {establishment?.cover_url ? (
        // Com capa, o boas-vindas acontece sobre a foto do próprio bar: o dono
        // se reconhece na hora, em vez de ver um banner genérico do painel.
        <section className="border-border relative isolate overflow-hidden rounded-2xl border">
          <img
            src={establishment.cover_url}
            alt=""
            className="absolute inset-0 -z-10 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-black/85 via-black/60 to-black/15" />
          <div className="flex min-h-64 flex-col justify-end gap-5 p-8 sm:flex-row sm:items-end sm:justify-start">
            {establishment.logo_url ? (
              <img
                src={establishment.logo_url}
                alt=""
                className="h-20 w-20 shrink-0 rounded-2xl bg-white object-cover shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] ring-2 ring-white/90"
              />
            ) : null}
            <div className="min-w-0">
              <h2 className="font-heading text-3xl leading-9 font-bold text-balance text-white">
                Bem-vindo, {establishment.name}!
              </h2>
              <p className="mt-2 max-w-xl text-[16px] leading-relaxed text-white/85">
                Seu painel está pronto. Cadastre o primeiro evento e apareça no feed dos amantes da
                noite.
              </p>
              <Link
                href="/events/new"
                className="bg-primary text-primary-foreground focus-visible:ring-primary mt-5 inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-2 text-sm font-semibold transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <PlusIcon size={14} weight="bold" />
                Cadastrar primeiro evento
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="text-primary-foreground shadow-neon rounded-2xl bg-(image:--gradient-primary) p-8">
          <SparkleIcon size={32} weight="regular" aria-hidden />
          <h2 className="font-heading mt-4 text-3xl leading-9 font-bold">
            Bem-vindo{establishment?.name ? `, ${establishment.name}` : ''}!
          </h2>
          <p className="mt-2 max-w-xl text-[16px] leading-relaxed opacity-90">
            Seu painel está pronto. Cadastre o primeiro evento e apareça no feed dos amantes da
            noite.
          </p>
          <Link
            href="/events/new"
            className="bg-background text-foreground mt-5 inline-flex items-center justify-center gap-2 rounded-[14px] px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            <PlusIcon size={14} weight="bold" />
            Cadastrar primeiro evento
          </Link>
        </section>
      )}

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
