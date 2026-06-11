import type { ComponentProps } from 'react';

import { useGuardedPress } from '../../hooks/useGuardedPress';
import { Pressable } from '../../tw';

export interface GuardedPressableProps extends ComponentProps<typeof Pressable> {
  /** Janela mínima entre toques. Default: 600ms. */
  cooldownMs?: number;
}

/**
 * Drop-in do Pressable com onPress protegido contra double-tap.
 * Use no lugar de Pressable cru em qualquer ação da plataforma.
 */
export function GuardedPressable({ onPress, cooldownMs, ...rest }: GuardedPressableProps) {
  const guardedPress = useGuardedPress(onPress ?? undefined, { cooldownMs });

  return <Pressable {...rest} onPress={guardedPress} />;
}
