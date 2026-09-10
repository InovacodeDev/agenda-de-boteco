'use client';

import {
  CheckCircleIcon,
  CrownSimpleIcon,
  InfoIcon,
  SparkleIcon,
  XIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';

const CURRENT_BENEFITS = [
  'Publicação ilimitada de eventos na agenda',
  'Exibição no feed público e mapa da cidade por proximidade',
  'Perfil completo com cardápio PDF, horários e redes sociais',
  'Acesso ao banco de leads de músicos e artistas da região',
  'Acompanhamento de métricas de visualizações e favoritos',
];

const UPCOMING_BENEFITS = [
  'Posicionamento de destaque patrocinado na busca da cidade',
  'Campanhas promocionais direcionadas no aplicativo',
  'Relatórios de retenção de público e conversão em tempo real',
];

export function SubscriptionSection() {
  const [plansModalOpen, setPlansModalOpen] = useState(false);

  return (
    <section
      aria-label="Assinatura e Plano"
      className="shadow-card border-border bg-card rounded-2xl border p-6 md:p-7"
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-accent/15 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <CrownSimpleIcon size={24} weight="bold" />
          </div>
          <div>
            <h2 className="font-heading text-foreground text-lg font-bold">Assinatura e Plano</h2>
            <p className="text-muted-foreground text-sm">
              Gerencie a modalidade de assinatura e os recursos disponíveis para o seu bar.
            </p>
          </div>
        </div>

        <span className="bg-primary/15 text-primary border-primary/30 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold">
          <span className="bg-primary h-1.5 w-1.5 rounded-full" />
          Plano Ativo
        </span>
      </div>

      <div className="flex flex-col gap-6">
        <div className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                Modalidade Atual
              </span>
              <h3 className="font-heading text-foreground text-base font-bold">
                Plano Parceiro — Fase de Lançamento
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setPlansModalOpen(true)}
              className="border-border bg-surface-elevated text-foreground hover:bg-surface mt-2 inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium transition-colors sm:mt-0"
            >
              <SparkleIcon size={16} weight="bold" className="text-accent" />
              Ver planos e upgrades
            </button>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            Seu estabelecimento está com acesso integral a todas as funcionalidades do painel
            durante o período de lançamento da plataforma.
          </p>

          <div className="border-border/60 border-t pt-4">
            <span className="text-muted-foreground mb-3 block text-xs font-semibold uppercase tracking-wider">
              Recursos incluídos no seu acesso:
            </span>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {CURRENT_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-xs">
                  <CheckCircleIcon
                    size={16}
                    weight="bold"
                    className="text-primary mt-0.5 shrink-0"
                  />
                  <span className="text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-border/60 bg-surface/50 rounded-xl border p-5">
          <div className="mb-2 flex items-center gap-2">
            <SparkleIcon size={18} weight="bold" className="text-accent shrink-0" />
            <span className="font-heading text-foreground text-sm font-semibold">
              Novidades em preparação
            </span>
          </div>
          <p className="text-muted-foreground mb-3 text-xs">
            Estamos desenvolvendo novas ferramentas de atração e fidelização de público para bares
            parceiros:
          </p>
          <ul className="space-y-2">
            {UPCOMING_BENEFITS.map((item) => (
              <li key={item} className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className="bg-accent/40 h-1.5 w-1.5 shrink-0 rounded-full" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {plansModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="shadow-card border-border bg-card w-full max-w-md rounded-2xl border p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="bg-accent/15 text-accent flex h-8 w-8 items-center justify-center rounded-lg">
                  <CrownSimpleIcon size={18} weight="bold" />
                </div>
                <h3 className="font-heading text-foreground text-base font-bold">
                  Planos e Assinaturas
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPlansModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
              >
                <XIcon size={18} weight="bold" />
              </button>
            </div>

            <div className="border-border/60 bg-surface flex items-start gap-3 rounded-xl border p-4">
              <InfoIcon size={20} weight="bold" className="text-primary mt-0.5 shrink-0" />
              <p className="text-foreground text-xs leading-relaxed">
                As modalidades de contratação e planos premium estão em fase de consolidação pela
                equipe comercial. Durante esta fase de lançamento, todos os recursos permanecem
                liberados para o seu bar sem custos adicionais.
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setPlansModalOpen(false)}
                className="bg-primary text-primary-foreground shadow-neon rounded-xl px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
