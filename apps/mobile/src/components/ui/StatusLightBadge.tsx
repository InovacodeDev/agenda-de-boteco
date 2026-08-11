import type { StatusLight, StatusLightTone } from '@agenda/core';

import { colors } from '@/theme/colors';
import { Text, View } from '@/tw';

const TONE_COLOR: Record<StatusLightTone, string> = {
  green: colors.statusGreen,
  yellow: colors.statusYellow,
  orange: colors.statusOrange,
  red: colors.statusRed,
};

export interface StatusLightBadgeProps {
  light: StatusLight | null;
}

/**
 * Selo de status (semáforo) dos cards: bolinha colorida + texto curto.
 * O texto acompanha a cor de propósito — cor sozinha não é legível para
 * daltônicos, e verde/vermelho é justamente o par mais confundido.
 */
export function StatusLightBadge({ light }: StatusLightBadgeProps) {
  if (!light) return null;

  const color = TONE_COLOR[light.tone];

  return (
    <View
      accessible
      accessibilityLabel={light.label}
      className="bg-background/60 flex-row items-center gap-1 rounded-full px-2 py-0.5"
    >
      <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="font-body-medium text-[10px]" style={{ color }} numberOfLines={1}>
        {light.label}
      </Text>
    </View>
  );
}
