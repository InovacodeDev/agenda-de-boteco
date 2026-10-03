import type { ReactNode } from 'react';

import { cn } from './cn';
import { Text, View } from './tw';

export type BadgeVariant = 'primary' | 'published' | 'draft' | 'accent' | 'destructive' | 'muted';

const badgeStyles: Record<BadgeVariant, { container: string; text: string }> = {
  primary: { container: 'bg-primary/20', text: 'text-primary' },
  published: { container: 'bg-primary', text: 'text-primary-foreground' },
  draft: { container: 'bg-surface-elevated', text: 'text-muted-foreground' },
  accent: { container: 'bg-accent/20', text: 'text-accent' },
  destructive: { container: 'bg-destructive/20', text: 'text-destructive' },
  muted: { container: 'bg-surface', text: 'text-muted-foreground' },
};

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: ReactNode;
  className?: string;
}

export function Badge({ label, variant = 'muted', icon, className }: BadgeProps) {
  const styles = badgeStyles[variant];

  return (
    <View
      className={cn(
        'flex-row items-center gap-1 rounded-full px-2.5 py-1',
        styles.container,
        className,
      )}
    >
      {icon}
      <Text className={cn('font-body-medium text-xs', styles.text)}>{label}</Text>
    </View>
  );
}
