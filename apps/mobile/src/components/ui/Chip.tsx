import type { ReactNode } from 'react';

import { useGuardedPress } from '@/hooks/useGuardedPress';
import { Pressable, Text } from '@/tw';
import { cn } from '@/utils/cn';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
  /** Glifo à esquerda do rótulo — usado pelos chips que abrem uma busca. */
  icon?: ReactNode;
  /** Sobrescreve a cor do rótulo; só para variantes fora do par primary/surface. */
  textClassName?: string;
}

/** Pill base dos filtros rápidos, sheet de filtros e estilos musicais */
export function Chip({
  label,
  selected = false,
  onPress,
  className,
  icon,
  textClassName,
}: ChipProps) {
  const guardedPress = useGuardedPress(onPress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={guardedPress}
      className={cn(
        'h-9 flex-row items-center justify-center gap-1.5 rounded-full px-4 active:opacity-80',
        selected ? 'bg-primary' : 'bg-surface-elevated',
        className,
      )}
    >
      {icon}
      <Text
        className={cn(
          'font-body-medium text-[13px]',
          selected ? 'text-primary-foreground' : 'text-foreground',
          textClassName,
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
