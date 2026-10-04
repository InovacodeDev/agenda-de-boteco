import { useOwnedEstablishment } from '@agenda/core';
import {
  Button,
  Icon,
  type IconName,
  Screen,
  ScrollView,
  Text,
  View,
} from '@agenda/shared-ui-mobile';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';

import { useResponsive } from '@/hooks/useResponsive';

interface ShortcutItem {
  href: Href;
  title: string;
  description: string;
  cta: string;
  icon: IconName;
  disabled?: boolean;
}

const SHORTCUTS: ShortcutItem[] = [
  {
    href: '/(painel)/events',
    title: 'Eventos',
    description: 'Crie e gerencie suas agendas',
    cta: 'Gerenciar eventos',
    icon: 'calendar-blank',
  },
  {
    href: '/(painel)/profile',
    title: 'Perfil do bar',
    description: 'Edite informações e mídia',
    cta: 'Editar perfil',
    icon: 'store',
  },
  {
    href: '/(painel)/metrics',
    title: 'Métricas',
    description: 'Acompanhe visualizações e cliques',
    cta: 'Em breve',
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
      <ScrollView contentContainerClassName="p-5 gap-6">
        <LinearGradient
          colors={['#1dd75e', '#19e6c4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 16 }}
          className="p-8"
        >
          <Icon name="wand-magic-sparkles" size={32} color="#0f0f0f" />

          <Text className="font-heading text-background mt-4 text-3xl font-bold">
            Bem-vindo{establishment?.name ? `, ${establishment.name}` : ''}!
          </Text>

          <Text className="font-body text-background mt-2 max-w-xl text-base leading-relaxed opacity-90">
            Seu painel está pronto. Cadastre o primeiro evento e apareça no feed dos amantes da noite.
          </Text>

          <Button
            label="Cadastrar primeiro evento"
            variant="ghost"
            className="mt-5 self-start bg-background"
            icon={<Icon name="plus" size={14} color="#fafafa" weight="bold" />}
            onPress={() => router.push('/(painel)/events/new')}
          />
        </LinearGradient>

        <View
          className={`gap-4 ${isTablet ? 'flex-row flex-wrap' : 'flex-col'}`}
        >
          {SHORTCUTS.map((item) => (
            <View
              key={item.title}
              className={`flex-col rounded-lg border border-border bg-card p-5 ${
                isTablet ? 'w-[31%] flex-grow' : 'w-full'
              }`}
            >
              <Icon name={item.icon} size={24} color="#1dd75e" />
              <Text className="font-heading text-foreground mb-1 mt-3 text-base font-semibold">
                {item.title}
              </Text>
              <Text className="font-body text-muted-foreground mb-4 text-sm">
                {item.description}
              </Text>
              <Button
                label={item.cta}
                variant="outline"
                disabled={item.disabled}
                onPress={() => router.push(item.href)}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
