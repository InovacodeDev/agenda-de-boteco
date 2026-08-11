import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';
import { Text, View } from '@/tw';
import { formatRating } from '@/utils/format';

export interface RatingStarsProps {
  avg: number;
  count: number;
}

/** "★ 4.7 (312)" com estrela âmbar como no protótipo */
export function RatingStars({ avg, count }: RatingStarsProps) {
  const [ratingPart, countPart] = formatRating(avg, count).split(' ');
  return (
    <View className="flex-row items-center gap-1">
      <Icon name="star" variant="solid" color={colors.accent} size={14} />
      <Text className="font-body-semibold text-foreground text-[13px]">{ratingPart}</Text>
      <Text className="font-body text-muted-foreground text-[13px]">{countPart}</Text>
    </View>
  );
}
