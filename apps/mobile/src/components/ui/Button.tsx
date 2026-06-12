import type { ReactNode } from 'react';

import { useGuardedPress } from '../../hooks/useGuardedPress';
import { Pressable, Text } from '../../tw';
import { cn } from '../../utils/cn';

type ButtonVariant = 'solid' | 'outline' | 'white' | 'ghost';

const containerByVariant: Record<ButtonVariant, string> = {
  solid: 'bg-primary',
  outline: 'border border-border bg-transparent',
  white: 'bg-foreground',
  ghost: 'bg-transparent',
};

const labelByVariant: Record<ButtonVariant, string> = {
  solid: 'text-primary-foreground',
  outline: 'text-foreground',
  white: 'text-primary-foreground',
  ghost: 'text-foreground',
};

export interface ButtonProps {
  label?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  disabled?: boolean;
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
  icon,
  className,
  style,
}: ButtonProps) {
  const guardedPress = useGuardedPress(onPress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={guardedPress}
      style={style}
      className={cn(
        'h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 active:opacity-80',
        containerByVariant[variant],
        fullWidth && 'w-full',
        disabled && 'opacity-40',
        className,
      )}
    >
      {icon}
      {!label ? null : (
        <Text
          numberOfLines={1}
          className={cn('shrink font-body-semibold text-[15px]', labelByVariant[variant])}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
