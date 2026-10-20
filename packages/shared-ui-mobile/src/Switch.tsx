import type { ReactNode } from 'react';

import { cn } from './cn';
import { Pressable, Text, View } from './tw';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, disabled = false }: SwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      className={cn(
        'h-7 w-12 justify-center rounded-full p-0.5 transition-colors',
        checked ? 'bg-primary' : 'bg-surface-elevated',
        disabled && 'opacity-40',
      )}
    >
      <View
        className={cn(
          'h-6 w-6 rounded-full bg-white shadow-sm',
          checked && 'self-end',
        )}
      />
    </Pressable>
  );
}

export interface SwitchRowProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function SwitchRow({
  label,
  description,
  icon,
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: SwitchRowProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => onCheckedChange(!checked)}
      className={cn(
        'flex-row items-center justify-between py-3.5',
        disabled && 'opacity-40',
        className,
      )}
    >
      <View className="mr-3 flex-1 flex-row items-center gap-3">
        {icon}
        <View className="flex-1">
          <Text className="font-body-medium text-foreground text-[15px]">{label}</Text>
          {description ? (
            <Text className="font-body text-muted-foreground mt-0.5 text-xs">{description}</Text>
          ) : null}
        </View>
      </View>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </Pressable>
  );
}
