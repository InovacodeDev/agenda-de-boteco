import { Text, View } from '../../tw';
import { cn } from '../../utils/cn';
import { GuardedPressable } from './GuardedPressable';

export interface SegmentedTabsProps {
  tabs: string[];
  activeIndex: number;
  onChange: (index: number) => void;
  className?: string;
}

/** Tabs em pill (Sobre/Agenda/Cardápio/Reviews; Eventos/Bares) — ativa branca com texto escuro */
export function SegmentedTabs({ tabs, activeIndex, onChange, className }: SegmentedTabsProps) {
  return (
    <View className={cn('flex-row rounded-full bg-surface p-1', className)}>
      {tabs.map((tab, index) => {
        const active = index === activeIndex;
        return (
          <GuardedPressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(index)}
            className={cn(
              'h-9 flex-1 items-center justify-center rounded-full',
              active && 'bg-foreground',
            )}
          >
            <Text
              className={cn(
                'font-body-medium text-[13px]',
                active ? 'text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              {tab}
            </Text>
          </GuardedPressable>
        );
      })}
    </View>
  );
}
