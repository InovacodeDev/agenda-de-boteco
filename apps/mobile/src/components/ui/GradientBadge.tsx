import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';

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
          <Sparkles color={colors.primaryForeground} size={12} />
          <Text className="font-body-semibold text-primary-foreground text-[12px]">{label}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}
