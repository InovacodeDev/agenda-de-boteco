import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getFriendlyErrorMessage,
  getNotificationPreferences,
  type NotificationPreferences,
  saveNotificationPreferences,
  useAuthStore,
} from '@agenda/core';
import { Card, cn, Icon, type IconName, SwitchRow, Text, View } from '@agenda/shared-ui-mobile';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { disablePush, enablePush } from '@/lib/push';

import { FOREGROUND, FOREGROUND_DIM, PRIMARY, SectionHeader } from './SectionHeader';

/** Fora do PERSIST_ALLOWLIST de propósito: preferência de conta não vai para o cache em disco. */
const notificationPreferencesKey = (userId: string) =>
  ['panel', 'notification-preferences', userId] as const;

const PUSH_UNAVAILABLE_MESSAGE: Record<'denied' | 'unsupported', string> = {
  denied: 'Permita as notificações do app nos ajustes do aparelho para receber alertas push.',
  unsupported: 'Notificações push não estão disponíveis neste aparelho.',
};

interface ToggleRow {
  key: keyof NotificationPreferences;
  icon: IconName;
  label: string;
  description: string;
}

const CHANNEL_ROWS: ToggleRow[] = [
  {
    key: 'channelEmail',
    icon: 'envelope-simple',
    label: 'E-mail',
    description: 'Alertas e relatórios na sua caixa de entrada',
  },
  {
    key: 'channelPush',
    icon: 'bell',
    label: 'Notificações Push',
    description: 'Alertas instantâneos na web e aplicativo',
  },
];

const ALERT_ROWS: ToggleRow[] = [
  {
    key: 'alertReviews',
    icon: 'star',
    label: 'Novas avaliações',
    description: 'Receba um alerta imediato sempre que um cliente avaliar seu estabelecimento',
  },
  {
    key: 'alertMusicians',
    icon: 'microphone',
    label: 'Músicos e atrações interessadas',
    description: 'Avisos de artistas que demonstraram interesse em tocar no seu bar',
  },
  {
    key: 'alertEventStatus',
    icon: 'calendar-check',
    label: 'Status e moderação de eventos',
    description: 'Atualizações sobre aprovação ou avisos de pendências nos seus eventos',
  },
  {
    key: 'alertEmptySchedule',
    icon: 'calendar-blank',
    label: 'Lembrete de agenda (quintas-feiras)',
    description: 'Aviso semanal caso a programação do fim de semana ainda esteja vazia',
  },
  {
    key: 'alertWeeklyDigest',
    icon: 'chart-bar',
    label: 'Resumo semanal de métricas (segundas-feiras)',
    description: 'Consolidado com visualizações da página, acessos ao cardápio e favoritos',
  },
];

export function NotificationsSection() {
  const userId = useAuthStore((state) => state.user?.id) ?? '';
  const queryClient = useQueryClient();
  const queryKey = notificationPreferencesKey(userId);
  const [savedNotice, setSavedNotice] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  const { data: settings = DEFAULT_NOTIFICATION_PREFERENCES } = useQuery({
    queryKey,
    queryFn: getNotificationPreferences,
    enabled: Boolean(userId),
  });

  const mutation = useMutation({
    mutationFn: saveNotificationPreferences,
    onMutate: async (next: NotificationPreferences) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationPreferences>(queryKey);
      queryClient.setQueryData(queryKey, next);
      return { previous };
    },
    onError: (error, _next, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      setErrorMessage(getFriendlyErrorMessage(error));
    },
    onSuccess: () => {
      setSavedNotice(true);
    },
  });

  useEffect(() => {
    if (!savedNotice) return;
    const timer = setTimeout(() => setSavedNotice(false), 2500);
    return () => clearTimeout(timer);
  }, [savedNotice]);

  const syncPush = async (enabled: boolean): Promise<boolean> => {
    setPushBusy(true);
    try {
      if (!enabled) {
        await disablePush();
        return true;
      }
      const result = await enablePush();
      if (result === 'registered') return true;
      setErrorMessage(PUSH_UNAVAILABLE_MESSAGE[result]);
      return false;
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
      return false;
    } finally {
      setPushBusy(false);
    }
  };

  const updateSetting = async (key: keyof NotificationPreferences, value: boolean) => {
    setErrorMessage(null);
    if (key === 'channelPush' && !(await syncPush(value))) {
      return;
    }
    mutation.mutate({ ...settings, [key]: value });
  };

  const renderRow = (row: ToggleRow, className?: string) => (
    <SwitchRow
      key={row.key}
      label={row.label}
      description={row.description}
      icon={
        <Icon
          name={row.icon}
          size={20}
          weight="bold"
          color={settings[row.key] ? FOREGROUND : FOREGROUND_DIM}
        />
      }
      checked={settings[row.key]}
      disabled={!userId || (row.key === 'channelPush' && pushBusy)}
      onCheckedChange={(value) => void updateSetting(row.key, value)}
      className={className}
    />
  );

  return (
    <Card className="p-6">
      <SectionHeader
        icon="bell-simple"
        iconColor={PRIMARY}
        iconBoxClassName="bg-primary/10"
        title="Notificações e Alertas"
        description="Escolha os canais e quais acontecimentos geram alertas para o seu bar."
        aside={
          savedNotice ? (
            <View accessibilityRole="alert" className="flex-row items-center gap-1">
              <Icon name="check" size={16} color={PRIMARY} weight="bold" />
              <Text className="font-body-medium text-primary text-xs">Preferências salvas</Text>
            </View>
          ) : null
        }
      />

      <View className="flex-col gap-6">
        <View>
          <Text className="font-heading text-foreground mb-3 text-sm uppercase tracking-wider">
            Canais de Entrega
          </Text>
          <View className="flex-col gap-3">
            {CHANNEL_ROWS.map((row) =>
              renderRow(row, 'rounded-xl border border-border bg-surface px-4'),
            )}
          </View>
        </View>

        <View>
          <Text className="font-heading text-foreground mb-3 text-sm uppercase tracking-wider">
            Alertas e Atividades
          </Text>
          <View className="rounded-xl border border-border bg-surface">
            {ALERT_ROWS.map((row, index) =>
              renderRow(row, cn('px-4', index > 0 && 'border-t border-border/60')),
            )}
          </View>
        </View>

        {errorMessage ? (
          <Text className="font-body text-destructive text-xs">{errorMessage}</Text>
        ) : null}
      </View>
    </Card>
  );
}
