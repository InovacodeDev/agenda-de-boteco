import { Switch } from 'react-native';

import { colors } from '@/theme/colors';
import { Text, View } from '@/tw';

export interface SwitchRowProps {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

/** Linha com toggle ("Aberto agora — Apenas estabelecimentos abertos") */
export function SwitchRow({ title, subtitle, value, onValueChange }: SwitchRowProps) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="flex-1 gap-0.5 pr-4">
        <Text className="font-body-semibold text-foreground text-[14px]">{title}</Text>
        {subtitle ? (
          <Text className="font-body text-muted-foreground text-[12px]">{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surfaceElevated, true: colors.primary }}
        thumbColor={colors.foreground}
        accessibilityLabel={title}
      />
    </View>
  );
}
