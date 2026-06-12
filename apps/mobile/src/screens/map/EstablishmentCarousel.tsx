import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { forwardRef } from 'react';
import { useWindowDimensions } from 'react-native';

import { EstablishmentCard } from '../../components/establishment/EstablishmentCard';
import type { Establishment } from '../../data/schemas';
import { View } from '../../tw';

const GAP = 12;

export interface EstablishmentCarouselProps {
  establishments: Establishment[];
  onIndexChange: (index: number) => void;
}

/** Carrossel inferior do mapa, com snap por card e sync com os marcadores */
export const EstablishmentCarousel = forwardRef<
  FlashListRef<Establishment>,
  EstablishmentCarouselProps
>(function EstablishmentCarousel({ establishments, onIndexChange }, ref) {
  const { width } = useWindowDimensions();
  const itemWidth = width - 64;

  return (
    <FlashList
      ref={ref}
      data={establishments}
      horizontal
      keyExtractor={(establishment) => establishment.id}
      showsHorizontalScrollIndicator={false}
      snapToInterval={itemWidth + GAP}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: 16 }}
      onMomentumScrollEnd={(event) => {
        const index = Math.round(
          event.nativeEvent.contentOffset.x / (itemWidth + GAP),
        );
        const clamped = Math.min(Math.max(index, 0), establishments.length - 1);
        onIndexChange(clamped);
      }}
      renderItem={({ item }) => (
        <View style={{ width: itemWidth, marginRight: GAP }}>
          <EstablishmentCard establishment={item} />
        </View>
      )}
    />
  );
});
