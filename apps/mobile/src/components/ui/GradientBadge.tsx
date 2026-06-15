import { LinearGradient } from 'expo-linear-gradient';

import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';
import { gradientPromo } from '@/theme/gradients';
import { Text, View } from '@/tw';

export interface GradientBadgeProps {
  label: string;
}

/** Badge "✨ Cortesia" / "Promoção" com gradiente laranja→rosa do protótipo */
export function GradientBadge({ label }: GradientBadgeProps) {
  return (
    <View className="self-start overflow-hidden rounded-full">
      <LinearGradient {...gradientPromo}>
        <View className="flex-row items-center gap-1 px-3 py-1">
          <Icon name="wand-magic-sparkles" color={colors.primaryForeground} size={12} />
          <Text className="font-body-semibold text-primary-foreground text-[12px]">{label}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}
