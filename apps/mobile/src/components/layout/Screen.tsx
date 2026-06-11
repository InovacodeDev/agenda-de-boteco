import type { ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View } from '../../tw';
import { cn } from '../../utils/cn';

export interface ScreenProps {
  children: ReactNode;
  /** Sem padding superior de safe area (telas com hero full-bleed) */
  edgeless?: boolean;
  className?: string;
}

/** Container base de tela: fundo escuro + safe area superior */
export function Screen({ children, edgeless = false, className }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={cn('flex-1 bg-background', className)}
      style={{ paddingTop: edgeless ? undefined : insets.top, paddingBottom: insets.bottom }}
    >
      {children}
    </View>
  );
}
