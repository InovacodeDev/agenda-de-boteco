import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { useConnectivity } from '@/hooks/useConnectivity';
import { colors } from '@/theme/colors';
import { Text, View } from '@/tw';

/** Barra discreta no topo, visível apenas quando o app está offline. */
export function OfflineBanner() {
  const { isOnline } = useConnectivity();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(isOnline ? 0 : 1, { duration: 220 });
  }, [isOnline, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -8 }],
  }));

  if (isOnline) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: insets.top,
          left: 0,
          right: 0,
          zIndex: 50,
          alignItems: 'center',
        },
        animatedStyle,
      ]}
    >
      <View className="bg-card border-border flex-row items-center gap-2 rounded-full border px-3 py-1.5">
        <Icon name="circle-info" variant="solid" color={colors.mutedForeground} size={12} />
        <Text className="font-body-medium text-muted-foreground text-[12px]">
          Você está offline. Exibindo dados salvos.
        </Text>
      </View>
    </Animated.View>
  );
}
