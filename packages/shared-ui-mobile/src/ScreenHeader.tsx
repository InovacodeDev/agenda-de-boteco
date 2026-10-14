import type { ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';

import { cn } from './cn';
import { Icon } from './Icon';
import { Pressable, Text, View } from './tw';

const TABLET_MIN_WIDTH = 768;

export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  rightAction,
  children,
  className,
}: ScreenHeaderProps) {
  const { width } = useWindowDimensions();

  return (
    <View
      className={cn(
        'min-h-14 flex-row items-center justify-between gap-3 border-b border-border/60 bg-background py-3',
        width >= TABLET_MIN_WIDTH ? 'px-8' : 'px-5',
        className,
      )}
    >
      <View className="min-w-0 flex-1 flex-row items-center gap-3">
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={onBack}
            className="h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface active:opacity-80"
          >
            <Icon name="arrow-left" size={20} color="#fafafa" />
          </Pressable>
        ) : null}

        {children ? (
          children
        ) : (
          <View className="min-w-0 flex-1">
            {title ? (
              <Text className="font-heading text-foreground text-lg font-bold">{title}</Text>
            ) : null}
            {subtitle ? (
              <Text className="font-body text-muted-foreground mt-0.5 text-xs">{subtitle}</Text>
            ) : null}
          </View>
        )}
      </View>

      {rightAction ? (
        <View className="shrink-0 flex-row items-center gap-2">{rightAction}</View>
      ) : null}
    </View>
  );
}
