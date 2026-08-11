import type { ReactNode } from 'react';

import { Text, View } from '@/tw';

import { GuardedPressable } from './GuardedPressable';

export interface EmptyStateProps {
  icon: ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Card de estado vazio com borda tracejada (Favoritos) */
export function EmptyState({ icon, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="border-border items-center gap-3 rounded-2xl border border-dashed px-6 py-10">
      {icon}
      <Text className="font-body text-muted-foreground text-center text-[14px]">{message}</Text>
      {actionLabel ? (
        <GuardedPressable
          accessibilityRole="button"
          onPress={onAction}
          className="active:opacity-80"
        >
          <Text className="font-body-semibold text-primary text-[14px]">{actionLabel}</Text>
        </GuardedPressable>
      ) : null}
    </View>
  );
}
