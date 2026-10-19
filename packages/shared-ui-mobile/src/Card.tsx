import type { ReactNode } from 'react';

import { cn } from './cn';
import { Text, View } from './tw';

export interface CardProps {
  children: ReactNode;
  className?: string;
  style?: object;
}

export function Card({ children, className, style }: CardProps) {
  return (
    <View
      style={style}
      className={cn(
        'rounded-2xl border border-border bg-card p-5',
        className,
      )}
    >
      {children}
    </View>
  );
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  sublabel?: string;
  className?: string;
}

export function StatCard({ title, value, icon, sublabel, className }: StatCardProps) {
  return (
    <Card className={cn('flex-1 justify-between p-4', className)}>
      <View className="flex-row items-center justify-between">
        <Text className="font-body-medium text-muted-foreground text-xs uppercase tracking-wider">
          {title}
        </Text>
        {icon}
      </View>
      <Text className="font-heading text-foreground mt-2 text-2xl font-bold">{value}</Text>
      {sublabel ? (
        <Text className="font-body text-muted-foreground mt-1 text-xs">{sublabel}</Text>
      ) : null}
    </Card>
  );
}
