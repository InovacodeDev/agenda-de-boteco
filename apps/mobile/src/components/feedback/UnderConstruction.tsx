import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { GradientBadge } from '@/components/ui/GradientBadge';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';
import { gradientNight } from '@/theme/gradients';
import { shadows } from '@/theme/shadows';
import { headingLetterSpacing } from '@/theme/typography';
import { Text, View } from '@/tw';

export interface UnderConstructionProps {
  /** Rótulo da versão de retorno, ex.: 'v2'. Exibido no badge "Chega na vX". */
  version: string;
  /** Ícone temático exibido no selo com glow (ex.: <Icon name="store" .../>). */
  icon: ReactNode;
  /** Título chamativo em font-heading. */
  title: string;
  /** Parágrafo descritivo em font-body. */
  description: string;
  /** true = tela-aba (logo no header, CTA volta ao feed); false = detalhe (botão voltar). */
  isTab?: boolean;
}

/**
 * Página intermediária "Em construção" para entrega gradual. Mantém o padrão
 * visual do app: fundo gradiente noturno, selo de ícone com glow neon, badge de
 * versão e CTA. Conteúdo 100% estático — sem estado nem rede.
 */
export function UnderConstruction({
  version,
  icon,
  title,
  description,
  isTab = false,
}: UnderConstructionProps) {
  const router = useRouter();

  const cta = isTab
    ? { label: 'Explorar o feed', iconName: 'house' as const, onPress: () => router.replace('/') }
    : { label: 'Voltar', iconName: 'arrow-left' as const, onPress: () => router.back() };

  return (
    <Screen background={<LinearGradient {...gradientNight} style={StyleSheet.absoluteFill} />}>
      <ScreenHeader showLogo={isTab} showBack={!isTab} />
      <View className="flex-1 items-center justify-center gap-6 px-8">
        <View
          className="bg-surface h-24 w-24 items-center justify-center rounded-3xl"
          style={{ boxShadow: shadows.neon }}
        >
          {icon}
        </View>

        <GradientBadge label={`Chega na ${version}`} />

        <View className="gap-3">
          <Text
            className="font-heading text-foreground text-center text-[26px]"
            style={{ letterSpacing: headingLetterSpacing(26) }}
          >
            {title}
          </Text>
          <Text className="font-body text-muted-foreground text-center text-[15px] leading-6">
            {description}
          </Text>
        </View>

        <Button
          label={cta.label}
          icon={<Icon name={cta.iconName} color={colors.primaryForeground} size={16} />}
          onPress={cta.onPress}
          style={{ boxShadow: shadows.neon }}
        />
      </View>
    </Screen>
  );
}
