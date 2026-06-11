import type { ReactNode } from 'react';

import { useGuardedPress } from '../../hooks/useGuardedPress';
import { Pressable } from '../../tw';
import { cn } from '../../utils/cn';

export interface CircleIconButtonProps {
  icon: ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  className?: string;
}

/** Botão circular translúcido sobre imagens (voltar/share/favoritar) */
export function CircleIconButton({
  icon,
  onPress,
  accessibilityLabel,
  className,
}: CircleIconButtonProps) {
  const guardedPress = useGuardedPress(onPress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={guardedPress}
      className={cn(
        'h-10 w-10 items-center justify-center rounded-full bg-background/60 active:opacity-80',
        className,
      )}
    >
      {icon}
    </Pressable>
  );
}
