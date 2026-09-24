import type { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';

import { cn } from './cn';
import { Pressable, Text } from './tw';

export type ButtonVariant = 'solid' | 'outline' | 'white' | 'ghost' | 'destructive';

const containerByVariant: Record<ButtonVariant, string> = {
  solid: 'bg-primary',
  outline: 'border border-border bg-transparent',
  white: 'bg-foreground',
  ghost: 'bg-transparent',
  destructive: 'bg-destructive',
};

const labelByVariant: Record<ButtonVariant, string> = {
  solid: 'text-primary-foreground',
  outline: 'text-foreground',
  white: 'text-background',
  ghost: 'text-foreground',
  destructive: 'text-destructive-foreground',
};

export interface ButtonProps {
  label?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  disabled?: boolean;
  busy?: boolean;
  icon?: ReactNode;
  className?: string;
  style?: React.ComponentProps<typeof Pressable>['style'];
}

export function Button({
  label,
  onPress,
  variant = 'solid',
  fullWidth = false,
  disabled = false,
  busy = false,
  icon,
  className,
  style,
}: ButtonProps) {
  const isInactive = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isInactive }}
      disabled={isInactive}
      onPress={onPress}
      style={style}
      className={cn(
        'h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 active:opacity-80',
        containerByVariant[variant],
        fullWidth && 'w-full',
        isInactive && 'opacity-50',
        className,
      )}
    >
      {busy ? (
        <ActivityIndicator
          size="small"
          color={variant === 'solid' ? '#0f0f0f' : '#fafafa'}
        />
      ) : (
        icon
      )}
      {!label ? null : (
        <Text
          numberOfLines={1}
          className={cn('font-body-semibold shrink text-[15px]', labelByVariant[variant])}
        >
          {busy ? 'Aguarde…' : label}
        </Text>
      )}
    </Pressable>
  );
}
