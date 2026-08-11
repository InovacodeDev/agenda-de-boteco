import { FlashList, type FlashListRef } from '@shopify/flash-list';
import type { Ref } from 'react';
import { useWindowDimensions } from 'react-native';

import { EstablishmentCard } from '@/components/establishment/EstablishmentCard';
import type { Establishment } from '@/data/schemas';
import { View } from '@/tw';

const GAP = 12;

export interface EstablishmentCarouselProps {
  /** React 19: ref direto como prop, sem forwardRef */
  ref?: Ref<FlashListRef<Establishment>>;
  establishments: Establishment[];
  onIndexChange: (index: number) => void;
}

/** Carrossel inferior do mapa, com snap por card e sync com os marcadores */
export function EstablishmentCarousel({
  ref,
  establishments,
  onIndexChange,
}: EstablishmentCarouselProps) {
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
        const index = Math.round(event.nativeEvent.contentOffset.x / (itemWidth + GAP));
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
}
