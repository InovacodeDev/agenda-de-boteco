import type { MusicStyle } from '../../data/schemas';
import { Pressable, Text } from '../../tw';
import { cn } from '../../utils/cn';

export interface StyleCardProps {
  style: MusicStyle;
  selected?: boolean;
  onPress?: () => void;
}

/** Card do carrossel "Estilos em alta" (emoji grande + nome) */
export function StyleCard({ style, selected = false, onPress }: StyleCardProps) {
  return (
    <Pressable
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
    </Pressable>
  );
}
