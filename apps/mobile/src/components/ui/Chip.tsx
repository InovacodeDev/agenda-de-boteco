import { useGuardedPress } from '../../hooks/useGuardedPress';
import { Pressable, Text } from '../../tw';
import { cn } from '../../utils/cn';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

/** Pill base dos filtros rápidos, sheet de filtros e estilos musicais */
export function Chip({ label, selected = false, onPress, className }: ChipProps) {
  const guardedPress = useGuardedPress(onPress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={guardedPress}
      className={cn(
        'h-9 items-center justify-center rounded-full px-4 active:opacity-80',
        selected ? 'bg-primary' : 'bg-surface-elevated',
        className,
      )}
    >
      <Text
        className={cn(
          'font-body-medium text-[13px]',
          selected ? 'text-primary-foreground' : 'text-foreground',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
