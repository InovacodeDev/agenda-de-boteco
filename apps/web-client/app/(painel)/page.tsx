'use client';

import Link from 'next/link';

import { useOwnedEstablishment } from '@/hooks/use-owned-establishment';

const SHORTCUTS = [
  {
    href: '/eventos',
    title: 'Eventos',
    description: 'Crie e gerencie suas agendas',
    cta: 'Gerenciar eventos',
    tone: 'primary' as const,
  },
  {
    href: '/perfil',
    title: 'Perfil do bar',
    description: 'Edite informações e mídia',
    cta: 'Editar perfil',
    tone: 'accent' as const,
  },
  {
    href: '/metricas',
    title: 'Métricas',
    description: 'Acompanhe visualizações e cliques',
    cta: 'Em breve',
    tone: 'disabled' as const,
  },
];

const CTA_CLASS = {
  primary: 'bg-primary text-primary-foreground hover:opacity-80',
  accent: 'bg-accent text-accent-foreground hover:opacity-80',
  disabled: 'pointer-events-none bg-surface-elevated text-muted-foreground',
} as const;

export default function DashboardPage() {
  const { data: establishment } = useOwnedEstablishment();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl bg-[image:var(--gradient-primary)] p-8 text-primary-foreground">
        <h1 className="font-[family-name:var(--font-heading)] text-[26px] font-bold">
          Bem-vindo{establishment?.name ? `, ${establishment.name}` : ''}!
        </h1>
        <p className="mt-1 text-[14px] opacity-80">
          Mantenha seu perfil e sua agenda sempre atualizados para aparecer melhor no app.
        </p>
        {/* ponytail: aponta para a listagem até a Fase 3 criar /eventos/novo. */}
        <Link
          href="/eventos"
          className="mt-5 inline-flex rounded-full bg-primary-foreground px-5 py-2.5 text-[14px] font-semibold text-primary transition-opacity hover:opacity-80"
        >
          Cadastrar primeiro evento
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {SHORTCUTS.map((item) => (
          <div
            key={item.href}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
          >
            <h2 className="font-[family-name:var(--font-heading)] text-[17px] font-bold text-foreground">
              {item.title}
            </h2>
            <p className="flex-1 text-[13px] text-muted-foreground">{item.description}</p>
            <Link
              href={item.href}
              aria-disabled={item.tone === 'disabled'}
              className={`mt-2 rounded-full px-4 py-2.5 text-center text-[13px] font-semibold transition-opacity ${CTA_CLASS[item.tone]}`}
            >
              {item.cta}
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
