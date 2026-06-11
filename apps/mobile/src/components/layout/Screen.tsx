import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View } from '../../tw';
import { cn } from '../../utils/cn';

export interface ScreenProps {
  children: ReactNode;
  /** Fundo full-bleed atrás do conteúdo e da status bar (ex.: gradiente) */
  background?: ReactNode;
  /** Sem padding inferior — superfícies que devem encostar na tab bar (ex.: mapa) */
  noBottomInset?: boolean;
  className?: string;
}

/**
 * Container base de tela. A raiz sem padding pinta a área da status bar
 * (bg escuro + StatusBar style="light" no root layout = contraste garantido);
 * o conteúdo fica dentro da safe area, sempre abaixo do header fixo.
 */
export function Screen({ children, background, noBottomInset = false, className }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className={cn('flex-1 bg-background', className)}>
      {background ? <View style={StyleSheet.absoluteFill}>{background}</View> : null}
      <View
        className="flex-1"
        style={{
          paddingTop: insets.top,
          paddingBottom: noBottomInset ? undefined : insets.bottom,
        }}
      >
        {children}
      </View>
    </View>
  );
}
