'use client';

import { useAuthStore } from '@agenda/core';
import {
  BellRingingIcon,
  BellSimpleIcon,
  CalendarBlankIcon,
  CalendarCheckIcon,
  ChartBarIcon,
  CheckCircleIcon,
  EnvelopeSimpleIcon,
  MicrophoneStageIcon,
  StarIcon,
} from '@phosphor-icons/react';
import { useEffect, useState } from 'react';

export interface NotificationSettings {
  channelEmail: boolean;
  channelPush: boolean;
  alertReviews: boolean;
  alertMusicians: boolean;
  alertEventStatus: boolean;
  alertEmptySchedule: boolean;
  alertWeeklyDigest: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  channelEmail: true,
  channelPush: true,
  alertReviews: true,
  alertMusicians: true,
  alertEventStatus: true,
  alertEmptySchedule: true,
  alertWeeklyDigest: false,
};

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-primary' : 'bg-surface-elevated'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function NotificationsSection() {
  const userId = useAuthStore((state) => state.user?.id);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!userId) return;
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(`web-client:notifications:${userId}`);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch {
        // ignore
      }
    });
  }, [userId]);

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    setSavedNotice(true);

    if (userId) {
      try {
        localStorage.setItem(`web-client:notifications:${userId}`, JSON.stringify(next));
      } catch {
        // ignore
      }
    }

    setTimeout(() => {
      setSavedNotice(false);
    }, 2500);
  };

  return (
    <section
      aria-label="Notificações e Alertas"
      className="shadow-card border-border bg-card rounded-2xl border p-6 md:p-7"
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <BellSimpleIcon size={24} weight="bold" />
          </div>
          <div>
            <h2 className="font-heading text-foreground text-lg font-bold">
              Notificações e Alertas
            </h2>
            <p className="text-muted-foreground text-sm">
              Escolha os canais e quais acontecimentos geram alertas para o seu bar.
            </p>
          </div>
        </div>

        {savedNotice ? (
          <span className="text-primary inline-flex items-center gap-1 text-xs font-medium">
            <CheckCircleIcon size={16} weight="bold" />
            Preferências salvas
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h3 className="font-heading text-foreground mb-3 text-sm font-semibold uppercase tracking-wider">
            Canais de Entrega
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="border-border bg-surface flex items-center justify-between rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-surface-elevated text-foreground flex h-9 w-9 items-center justify-center rounded-lg">
                  <EnvelopeSimpleIcon size={20} weight="bold" />
                </div>
                <div className="flex flex-col">
                  <span className="text-foreground text-sm font-medium">E-mail</span>
                  <span className="text-muted-foreground text-xs">
                    Alertas e relatórios na sua caixa de entrada
                  </span>
                </div>
              </div>
              <Switch
                label="Ativar notificações por e-mail"
                checked={settings.channelEmail}
                onChange={(checked) => updateSetting('channelEmail', checked)}
              />
            </div>

            <div className="border-border bg-surface flex items-center justify-between rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-surface-elevated text-foreground flex h-9 w-9 items-center justify-center rounded-lg">
                  <BellRingingIcon size={20} weight="bold" />
                </div>
                <div className="flex flex-col">
                  <span className="text-foreground text-sm font-medium">Notificações Push</span>
                  <span className="text-muted-foreground text-xs">
                    Alertas instantâneos na web e aplicativo
                  </span>
                </div>
              </div>
              <Switch
                label="Ativar notificações push"
                checked={settings.channelPush}
                onChange={(checked) => updateSetting('channelPush', checked)}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-heading text-foreground mb-3 text-sm font-semibold uppercase tracking-wider">
            Alertas e Atividades
          </h3>
          <div className="divide-border/60 border-border bg-surface divide-y rounded-xl border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-start gap-3">
                <StarIcon size={20} weight="bold" className="text-accent mt-0.5 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-foreground text-sm font-medium">Novas avaliações</span>
                  <span className="text-muted-foreground text-xs">
                    Receba um alerta imediato sempre que um cliente avaliar seu estabelecimento
                  </span>
                </div>
              </div>
              <Switch
                label="Alertas de novas avaliações"
                checked={settings.alertReviews}
                onChange={(checked) => updateSetting('alertReviews', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-start gap-3">
                <MicrophoneStageIcon
                  size={20}
                  weight="bold"
                  className="text-primary mt-0.5 shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-foreground text-sm font-medium">
                    Músicos e atrações interessadas
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Avisos de artistas que demonstraram interesse em tocar no seu bar
                  </span>
                </div>
              </div>
              <Switch
                label="Alertas de músicos interessados"
                checked={settings.alertMusicians}
                onChange={(checked) => updateSetting('alertMusicians', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-start gap-3">
                <CalendarCheckIcon
                  size={20}
                  weight="bold"
                  className="text-foreground mt-0.5 shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-foreground text-sm font-medium">
                    Status e moderação de eventos
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Atualizações sobre aprovação ou avisos de pendências nos seus eventos
                  </span>
                </div>
              </div>
              <Switch
                label="Alertas de status de eventos"
                checked={settings.alertEventStatus}
                onChange={(checked) => updateSetting('alertEventStatus', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-start gap-3">
                <CalendarBlankIcon
                  size={20}
                  weight="bold"
                  className="text-muted-foreground mt-0.5 shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-foreground text-sm font-medium">
                    Lembrete de agenda (quintas-feiras)
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Aviso semanal caso a programação do fim de semana ainda esteja vazia
                  </span>
                </div>
              </div>
              <Switch
                label="Lembrete de agenda de fim de semana"
                checked={settings.alertEmptySchedule}
                onChange={(checked) => updateSetting('alertEmptySchedule', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4">
              <div className="flex items-start gap-3">
                <ChartBarIcon
                  size={20}
                  weight="bold"
                  className="text-muted-foreground mt-0.5 shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-foreground text-sm font-medium">
                    Resumo semanal de métricas (segundas-feiras)
                  </span>
                  <span className="text-muted-foreground text-xs">
                    Consolidado com visualizações da página, acessos ao cardápio e favoritos
                  </span>
                </div>
              </div>
              <Switch
                label="Resumo semanal de métricas"
                checked={settings.alertWeeklyDigest}
                onChange={(checked) => updateSetting('alertWeeklyDigest', checked)}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
