import { useOwnedEstablishment } from '@agenda/core';
import {
  Button,
  Icon,
  type IconName,
  Pressable,
  Screen,
  ScreenHeader,
  ScrollView,
  Text,
  View,
} from '@agenda/shared-ui-mobile';
import { type Href, useRouter } from 'expo-router';

import { useResponsive } from '@/hooks/useResponsive';

interface ShortcutItem {
  href: Href;
  title: string;
  description: string;
  icon: IconName;
  disabled?: boolean;
}

const SHORTCUTS: ShortcutItem[] = [
  {
    href: '/(painel)/events',
    title: 'Eventos',
    description: 'Crie e gerencie suas agendas',
    icon: 'calendar-blank',
  },
  {
    href: '/(painel)/profile',
    title: 'Perfil do bar',
    description: 'Edite informações e mídia',
    icon: 'store',
  },
  {
    href: '/(painel)/metrics',
    title: 'Métricas',
    description: 'Acompanhe visualizações e cliques',
    icon: 'chart-bar',
    disabled: true,
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { data: establishment } = useOwnedEstablishment();
  const { isTablet } = useResponsive();

  return (
    <Screen className="bg-background">
      <ScreenHeader
        title={establishment?.name ?? 'Painel do Bar'}
        subtitle="Visão Geral do Estabelecimento"
      />

      <ScrollView contentContainerClassName="p-5 gap-6">
        <View className="overflow-hidden rounded-3xl border border-primary/30 bg-card p-6 shadow-xl">
          <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-primary/20">
            <Icon name="wand-magic-sparkles" size={26} color="#1dd75e" />
          </View>

          <Text className="font-heading text-foreground text-2xl font-bold">
            Bem-vindo{establishment?.name ? `, ${establishment.name}` : ''}!
          </Text>

          <Text className="font-body text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
            Seu painel está pronto para operar. Cadastre seu próximo evento e apareça no feed de milhares de amantes da noite.
          </Text>

          <View className="mt-5 flex-row items-center gap-3">
            <Button
              label="Cadastrar novo evento"
              variant="solid"
              icon={<Icon name="plus" size={16} color="#0f0f0f" weight="bold" />}
              onPress={() => router.push('/(painel)/events/new')}
            />
          </View>
        </View>

        <View>
          <Text className="font-heading text-foreground mb-4 text-lg font-bold">
            Acesso Rápido
          </Text>

          <View
            className={`gap-4 ${
              isTablet ? 'flex-row flex-wrap' : 'flex-col'
            }`}
          >
            {SHORTCUTS.map((item) => (
              <Pressable
                key={item.title}
                disabled={item.disabled}
                onPress={() => router.push(item.href)}
                className={`rounded-2xl border border-border bg-card p-5 active:border-primary/50 active:opacity-90 ${
                  item.disabled ? 'opacity-50' : ''
                } ${isTablet ? 'w-[48%] flex-grow' : 'w-full'}`}
              >
                <View className="mb-3 h-10 w-10 items-center justify-center rounded-xl bg-surface">
                  <Icon name={item.icon} size={20} color="#1dd75e" />
                </View>
                <Text className="font-heading text-foreground text-base font-semibold">
                  {item.title}
                </Text>
                <Text className="font-body text-muted-foreground mt-1 text-xs leading-relaxed">
                  {item.description}
                </Text>
                {item.disabled ? (
                  <Text className="font-body-medium text-muted-foreground mt-2 text-xs">
                    Em breve
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
