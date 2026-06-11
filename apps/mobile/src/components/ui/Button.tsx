import type { ReactNode } from 'react';

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
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  icon?: ReactNode;
  className?: string;
  style?: React.ComponentProps<typeof Pressable>['style'];
}

export function Button({
  label,
  onPress,
  variant = 'solid',
  fullWidth = false,
  icon,
  className,
  style,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={style}
      className={cn(
        'h-12 flex-row items-center justify-center gap-2 rounded-full px-6 active:opacity-80',
        containerByVariant[variant],
        fullWidth && 'w-full',
        className,
      )}
    >
      {icon}
      <Text className={cn('font-body-semibold text-[15px]', labelByVariant[variant])}>
        {label}
      </Text>
    </Pressable>
  );
}
