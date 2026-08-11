'use client';

import { useRef, useState } from 'react';

export interface EventDetailCarouselProps {
  /** Já vem com o banner_url na primeira posição. */
  photos: string[];
  accessibilityLabel: string;
}

/**
 * Carrossel de fotos do evento via CSS scroll-snap (sem libs). Espelha o
 * EventPhotoCarousel do mobile: paginação horizontal + dots de posição.
 */
export function EventDetailCarousel({ photos, accessibilityLabel }: EventDetailCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (photos.length === 0) return null;

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(next);
  };

  if (photos.length === 1) {
    return (
      // ponytail: <img> evita config de remotePatterns do next/image p/ banners externos
      <img
        src={photos[0]}
        alt={accessibilityLabel}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((uri, i) => (
          <div key={String(i)} className="h-full w-full shrink-0 snap-center">
            <img
              src={uri}
              alt={`${accessibilityLabel} — foto ${i + 1}`}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-3 flex w-full justify-center gap-1.5">
        {photos.map((_, i) => (
          <span
            key={`dot-${i}`}
            className={`h-1.5 w-1.5 rounded-full ${
              i === index ? 'bg-primary' : 'bg-background/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
