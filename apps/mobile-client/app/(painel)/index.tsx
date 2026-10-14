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
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useResponsive } from '@/hooks/useResponsive';
import { resolveDevAssetUrl } from '@/lib/devUrl';
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
  const coverUrl = establishment?.cover_url ? resolveDevAssetUrl(establishment.cover_url) : null;
  const logoUrl = establishment?.logo_url ? resolveDevAssetUrl(establishment.logo_url) : null;
  const [loadedCoverUrl, setLoadedCoverUrl] = useState<string | null>(null);
  const [loadedLogoUrl, setLoadedLogoUrl] = useState<string | null>(null);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const hasCover = coverUrl !== null && loadedCoverUrl === coverUrl;
  const showLogo = logoUrl !== null && failedLogoUrl !== logoUrl;
  const textTone = hasCover ? 'text-white' : 'text-background';

  return (
    <Screen noTopInset noBottomInset>
      <ScrollView contentContainerClassName={`${scrollContentClassName(isTablet)} gap-6`}>
        <View className="overflow-hidden rounded-[20px]">
          <LinearGradient
            colors={['#1dd75e', '#19e6c4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {coverUrl ? (
            <Image
              key={coverUrl}
              source={{ uri: coverUrl }}
              contentFit="cover"
              transition={200}
              onLoad={() => setLoadedCoverUrl(coverUrl)}
              className={`absolute inset-0 h-full w-full ${hasCover ? '' : 'opacity-0'}`}
            />
          ) : null}
          {hasCover ? (
            <LinearGradient
              colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.8)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}

          <View className={`p-6 ${hasCover ? 'min-h-64 justify-end' : ''}`}>
            {showLogo ? (
              <View
                className={`h-[84px] w-[84px] rounded-[18px] border-2 ${
                  hasCover ? 'border-white/90' : 'border-background/15'
                } ${loadedLogoUrl === logoUrl ? 'bg-white' : 'bg-white/40'}`}
                style={LOGO_SHADOW}
              >
                <Image
                  key={logoUrl}
                  source={{ uri: logoUrl }}
                  contentFit="cover"
                  transition={200}
                  accessibilityIgnoresInvertColors
                  onLoad={() => setLoadedLogoUrl(logoUrl)}
                  onError={() => setFailedLogoUrl(logoUrl)}
                  className="h-20 w-20 rounded-2xl"
                />
              </View>
            ) : (
              <Icon
                name="wand-magic-sparkles"
                size={32}
                color={hasCover ? '#ffffff' : '#0f0f0f'}
              />
            )}

            <Text
              className={`font-heading mt-4 font-bold ${textTone} ${
                isTablet ? 'text-3xl' : 'text-2xl'
              }`}
            >
              Bem-vindo{establishment?.name ? `, ${establishment.name}` : ''}!
            </Text>

            <Text className={`font-body mt-2 max-w-xl text-base leading-[24px] ${textTone}`}>
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
