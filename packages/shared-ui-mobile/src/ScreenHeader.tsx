import type { ReactNode } from 'react';

import { cn } from './cn';
import { Icon } from './Icon';
import { Pressable, Text, View } from './tw';

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
  return (
    <View
      className={cn(
        'min-h-14 flex-row items-center justify-between border-b border-border/60 bg-background px-4 py-2.5',
        className,
      )}
    >
      <View className="flex-1 flex-row items-center gap-3">
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={onBack}
            className="h-10 w-10 items-center justify-center rounded-xl bg-surface active:opacity-80"
          >
            <Icon name="arrow-left" size={20} color="#fafafa" />
          </Pressable>
        ) : null}

        {children ? (
          children
        ) : (
          <View className="flex-1">
            {title ? (
              <Text
                numberOfLines={1}
                className="font-heading text-foreground text-lg font-bold"
              >
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text
                numberOfLines={1}
                className="font-body text-muted-foreground text-xs"
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {rightAction ? (
        <View className="flex-row items-center gap-2 pl-2">{rightAction}</View>
      ) : null}
    </View>
  );
}
