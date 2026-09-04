import { useEffect, useRef } from 'react';

import { useCitiesQuery } from '@/hooks/queries';
import type { LocationResult } from '@/hooks/useUserLocation';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { resolveCityFromLocation } from '@/utils/geo';

export function useFirstLaunchLocation(
  request: () => Promise<LocationResult | null>,
): void {
  const hasOnboarded = usePreferencesStore((state) => state.hasOnboarded);
  const completeOnboarding = usePreferencesStore((state) => state.completeOnboarding);
  const setCity = usePreferencesStore((state) => state.setCity);
  const setCustomCity = usePreferencesStore((state) => state.setCustomCity);
  const { data: cities } = useCitiesQuery();

  const isExecutingRef = useRef(false);

  useEffect(() => {
    if (hasOnboarded || isExecutingRef.current) {
      return;
    }

    let isMounted = true;
    isExecutingRef.current = true;

    const handleFirstLaunchLocation = async () => {
      try {
        const result = await request();
        if (!isMounted) {
          return;
        }
        if (result) {
          const { city, isCatalog } = resolveCityFromLocation(
            result.coords,
            result.geocode,
            cities ?? [],
          );
          queueMicrotask(() => {
            if (isCatalog) {
              setCity(city.id);
            } else {
              setCustomCity(city);
            }
          });
        }
      } finally {
        if (isMounted) {
          queueMicrotask(() => {
            completeOnboarding();
          });
        }
      }
    };

    handleFirstLaunchLocation();

    return () => {
      isMounted = false;
    };
  }, [hasOnboarded, request, cities, setCity, setCustomCity, completeOnboarding]);
}
