import type { ReactNode } from 'react';

import { cn } from './cn';
import { Text, View } from './tw';

export interface FieldProps {
  label?: string;
  required?: boolean;
  helperText?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}

export function Field({
  label,
  required = false,
  helperText,
  error,
  children,
  className,
}: FieldProps) {
  return (
    <View className={cn('flex-col gap-1.5', className)}>
      {!label ? null : (
        <View className="flex-row items-center gap-1">
          <Text className="font-body-medium text-foreground text-sm">
            {label}
            {required ? <Text className="text-destructive font-body-bold"> *</Text> : null}
          </Text>
        </View>
      )}
      {children}
      {error ? (
        <Text className="font-body text-destructive text-xs">{error}</Text>
      ) : helperText ? (
        <Text className="font-body text-muted-foreground text-xs">{helperText}</Text>
      ) : null}
    </View>
  );
}
