import { useOwnedEstablishment } from '@agenda/core';
import {
  Button,
  Card,
  Icon,
  type IconName,
  Image,
  Screen,
  ScrollView,
  Text,
  View,
} from '@agenda/shared-ui-mobile';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { useResponsive } from '@/hooks/useResponsive';
import { scrollContentClassName } from '@/lib/screenLayout';

const LOGO_SHADOW = { boxShadow: '0 8px 24px -8px rgba(0, 0, 0, 0.6)' } as const;

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
  const coverUrl = establishment?.cover_url;

  return (
    <Screen noTopInset noBottomInset>
      <ScrollView contentContainerClassName={`${scrollContentClassName(isTablet)} gap-6`}>
        <View className="overflow-hidden rounded-[20px]">
          {coverUrl ? (
            <>
              <Image
                source={{ uri: coverUrl }}
                contentFit="cover"
                className="absolute inset-0 h-full w-full"
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </>
          ) : (
            <LinearGradient
              colors={['#1dd75e', '#19e6c4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          <View className={`p-6 ${coverUrl ? 'min-h-64 justify-end' : ''}`}>
            {coverUrl ? (
              establishment?.logo_url ? (
                <View
                  className="h-[84px] w-[84px] rounded-[18px] border-2 border-white/90"
                  style={LOGO_SHADOW}
                >
                  <Image
                    source={{ uri: establishment.logo_url }}
                    contentFit="cover"
                    className="h-20 w-20 rounded-2xl bg-white"
                  />
                </View>
              ) : null
            ) : (
              <Icon name="wand-magic-sparkles" size={32} color="#0f0f0f" />
            )}

            <Text
              className={`font-heading mt-4 font-bold ${coverUrl ? 'text-white' : 'text-background'} ${
                isTablet ? 'text-3xl' : 'text-2xl'
              }`}
            >
              Bem-vindo{establishment?.name ? `, ${establishment.name}` : ''}!
            </Text>

            <Text
              className={`font-body mt-2 max-w-xl text-base leading-[24px] ${
                coverUrl ? 'text-white' : 'text-background'
              }`}
            >
              Seu painel está pronto. Cadastre o primeiro evento e apareça no feed dos amantes da
              noite.
            </Text>

            <Button
              label="Cadastrar primeiro evento"
              variant="ghost"
              fullWidth={!isTablet}
              className={`mt-6 bg-background ${isTablet ? 'self-start' : ''}`}
              icon={<Icon name="plus" size={14} color="#fafafa" weight="bold" />}
              onPress={() => router.push('/(painel)/events/new')}
            />
          </View>
        </View>

        <View className={`gap-4 ${isTablet ? 'flex-row flex-wrap' : 'flex-col'}`}>
          {SHORTCUTS.map((item) => (
            <Card key={item.title} className={isTablet ? 'w-[31%] grow' : 'w-full'}>
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
            </Card>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
