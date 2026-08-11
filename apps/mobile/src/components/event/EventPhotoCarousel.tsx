import { useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import { colors } from '@/theme/colors';
import { Image, ScrollView, View } from '@/tw';

interface EventPhotoCarouselProps {
  /** já vem com o banner_url na primeira posição */
  photos: string[];
  accessibilityLabel: string;
}

export function EventPhotoCarousel({ photos, accessibilityLabel }: EventPhotoCarouselProps) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(
      e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width,
    );
    if (next !== index) setIndex(next);
  };

  if (photos.length === 0) return null;

  if (photos.length === 1) {
    return (
      <View className="h-65">
        <Image
          source={{ uri: photos[0] }}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    );
  }

  return (
    <View className="h-65">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {photos.map((uri, i) => (
          <View key={String(i)} style={{ width }} className="h-65">
            <Image
              source={{ uri }}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
              accessibilityLabel={`${accessibilityLabel} — foto ${i + 1}`}
            />
          </View>
        ))}
      </ScrollView>
      <View className="absolute bottom-3 w-full flex-row justify-center gap-1.5">
        {photos.map((uri, i) => (
          <View
            key={`dot-${i}`}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === index ? colors.primary : colors.background,
              opacity: i === index ? 1 : 0.5,
            }}
          />
        ))}
      </View>
    </View>
  );
}
