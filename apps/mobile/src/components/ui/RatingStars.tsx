import { Star } from 'lucide-react-native';

import { colors } from '../../theme/colors';
import { Text, View } from '../../tw';
import { formatRating } from '../../utils/format';

export interface RatingStarsProps {
  avg: number;
  count: number;
}

/** "★ 4.7 (312)" com estrela âmbar como no protótipo */
export function RatingStars({ avg, count }: RatingStarsProps) {
  const [ratingPart, countPart] = formatRating(avg, count).split(' ');
  return (
    <View className="flex-row items-center gap-1">
      <Star color={colors.accent} fill={colors.accent} size={14} />
      <Text className="font-body-semibold text-[13px] text-foreground">{ratingPart}</Text>
      <Text className="font-body text-[13px] text-muted-foreground">{countPart}</Text>
    </View>
  );
}
