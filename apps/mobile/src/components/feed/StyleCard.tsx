import type { MusicStyle } from '../../data/schemas';
import { Text } from '../../tw';
import { cn } from '../../utils/cn';
import { GuardedPressable } from '../ui/GuardedPressable';

export interface StyleCardProps {
  style: MusicStyle;
  selected?: boolean;
  onPress?: () => void;
}

/** Card do carrossel "Estilos em alta" (emoji grande + nome) */
export function StyleCard({ style, selected = false, onPress }: StyleCardProps) {
  return (
    <GuardedPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Estilo ${style.name}`}
      onPress={onPress}
      className={cn(
        'w-[76px] items-center gap-1 rounded-2xl bg-card px-2 py-3 active:opacity-80',
        selected ? 'border border-primary' : 'border border-transparent',
      )}
    >
      <Text className="text-[22px]">{style.emoji}</Text>
      <Text
        className={cn(
          'font-body-medium text-[12px]',
          selected ? 'text-primary' : 'text-foreground',
        )}
        numberOfLines={1}
      >
        {style.name}
      </Text>
    </GuardedPressable>
  );
}
