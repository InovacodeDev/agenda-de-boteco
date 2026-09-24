import { cn } from './cn';
import { Pressable, Text, View } from './tw';

export interface TabOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

export interface SegmentedTabsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <View
      className={cn(
        'flex-row rounded-xl border border-border bg-surface p-1',
        className,
      )}
    >
      {options.map((tab) => {
        const active = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            className={cn(
              'flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2 transition-colors',
              active ? 'bg-primary' : 'active:bg-surface-elevated',
            )}
          >
            <Text
              className={cn(
                'font-body-medium text-xs',
                active ? 'text-primary-foreground font-body-bold' : 'text-muted-foreground',
              )}
            >
              {tab.label}
            </Text>
            {tab.count !== undefined ? (
              <View
                className={cn(
                  'rounded-full px-1.5 py-0.2',
                  active ? 'bg-primary-foreground/20' : 'bg-surface-elevated',
                )}
              >
                <Text
                  className={cn(
                    'font-body text-[10px]',
                    active ? 'text-primary-foreground' : 'text-muted-foreground',
                  )}
                >
                  {tab.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
