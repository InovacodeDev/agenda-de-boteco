import type { ReactNode } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View } from '@/tw';
import { cn } from '@/utils/cn';

/** Largura máxima do conteúdo no web; acima disso ele centraliza e o fundo preenche as laterais. */
export const MAX_CONTENT_WIDTH = 768;

/** No web limita o conteúdo a MAX_CONTENT_WIDTH centralizado; no native ocupa tudo. */
const contentWidthStyle =
  Platform.OS === 'web'
    ? ({ width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' } as const)
    : null;

export interface ScreenProps {
  children: ReactNode;
  /**
   * Cabeçalho da tela (ex.: `ScreenHeader`). Renderizado full-bleed (largura
   * total), fora do limite de largura aplicado ao conteúdo. Opcional.
   */
  header?: ReactNode;
  /** Fundo full-bleed atrás do conteúdo e da status bar (ex.: gradiente) */
  background?: ReactNode;
  /** Sem padding superior — conteúdo sob o header overlay translúcido (ex.: hero) */
  noTopInset?: boolean;
  /** Sem padding inferior — superfícies que devem encostar na tab bar (ex.: mapa) */
  noBottomInset?: boolean;
  /**
   * Não limita a largura do conteúdo no web (full-bleed). Use em telas cujo
   * conteúdo é uma mídia de borda a borda (ex.: hero de detalhe, mapa).
   */
  fullBleedContent?: boolean;
  className?: string;
}

/**
 * Container base de tela. A raiz sem padding pinta a área da status bar
 * (bg escuro + StatusBar style="light" no root layout = contraste garantido);
 * o conteúdo fica dentro da safe area, sempre abaixo do header fixo.
 *
 * No web, o CONTEÚDO (`children`) é limitado a MAX_CONTENT_WIDTH e centralizado
 * — telas mais largas mostram o fundo padrão nas laterais. O `header` e o
 * `background` ficam full-bleed (largura total). `fullBleedContent` desativa o
 * limite para conteúdos de borda a borda.
 */
export function Screen({
  children,
  header,
  background,
  noTopInset = false,
  noBottomInset = false,
  fullBleedContent = false,
  className,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className={cn('bg-background flex-1', className)}>
      {background ? <View style={StyleSheet.absoluteFill}>{background}</View> : null}
      <View
        className="flex-1"
        style={{
          paddingTop: noTopInset ? undefined : insets.top,
          paddingBottom: noBottomInset ? undefined : insets.bottom,
        }}
      >
        {/* Header full-bleed (largura total). */}
        {header}
        {/* Conteúdo limitado e centralizado no web (salvo fullBleedContent). */}
        <View className="flex-1" style={fullBleedContent ? undefined : contentWidthStyle}>
          {children}
        </View>
      </View>
    </View>
  );
}
