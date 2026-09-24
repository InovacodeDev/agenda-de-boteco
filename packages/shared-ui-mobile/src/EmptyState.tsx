import type { ReactNode } from 'react';

import { Button } from './Button';
import { cn } from './cn';
import { Text, View } from './tw';

export interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <View className={cn('items-center justify-center p-8 text-center', className)}>
      {icon ? <View className="mb-4">{icon}</View> : null}
      {title ? (
        <Text className="font-heading text-foreground mb-1 text-center text-lg font-bold">
          {title}
        </Text>
      ) : null}
      <Text className="font-body text-muted-foreground text-center text-sm leading-relaxed">
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="solid"
          className="mt-5"
        />
      ) : null}
    </View>
  );
}
