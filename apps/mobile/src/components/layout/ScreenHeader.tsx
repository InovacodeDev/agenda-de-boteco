import brandLogo from '@assets/logo.png';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CircleIconButton } from '@/components/ui/CircleIconButton';
import { Icon } from '@/components/ui/Icon';
import { useResponsive } from '@/hooks/useResponsive';
import { colors } from '@/theme/colors';
import { headingLetterSpacing } from '@/theme/typography';
import { Image, Text, View } from '@/tw';
import { cn } from '@/utils/cn';
import { scaleFontSize } from '@/utils/responsiveType';

export interface ScreenHeaderProps {
  title?: string;
  showBack?: boolean;
  /** Logo da marca à esquerda do título (telas raiz com tab bar) */
  showLogo?: boolean;
  /** Header translúcido absoluto sobre o conteúdo (ex.: hero de detalhe) */
  overlay?: boolean;
  /** Ações à direita (compartilhar, favoritar, fechar…) */
  right?: ReactNode;
  /** Conteúdo customizado no lugar do título */
  children?: ReactNode;
}

/** Cabeçalho fixo de tela: voltar + título (ou conteúdo custom) + ações à direita */
export function ScreenHeader({
  title,
  showBack = false,
  showLogo = false,
  overlay = false,
  right,
  children,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { breakpoint } = useResponsive();
  const titleSize = scaleFontSize(24, breakpoint);

  return (
    <View
      className={cn(
        'min-h-14 flex-row items-center gap-3 px-4 py-2',
        overlay && 'bg-background/60 absolute inset-x-0 top-0 z-10',
      )}
      style={{ paddingTop: 8 + (overlay ? insets.top : 0), zIndex: overlay ? 10 : undefined }}
    >
      {showBack ? (
        <CircleIconButton
          accessibilityLabel="Voltar"
          icon={<Icon name="arrow-left" color={colors.foreground} size={20} />}
          onPress={() => router.back()}
          className={overlay ? undefined : 'bg-surface'}
        />
      ) : null}
      {showLogo ? (
        <Image
          source={brandLogo}
          className="h-10 w-10 rounded-lg"
          contentFit="cover"
          accessibilityLabel="Agenda de Boteco"
        />
      ) : null}
      <View className="flex-1">
        {children ??
          (title ? (
            <Text
              className="font-heading text-foreground"
              numberOfLines={1}
              style={{ fontSize: titleSize, letterSpacing: headingLetterSpacing(titleSize) }}
            >
              {title}
            </Text>
          ) : null)}
      </View>
      {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
    </View>
  );
}
