'use client';

import type { City } from '@agenda/core';
import { resolveCityFromLocation, useCitiesQuery, usePreferencesStore } from '@agenda/core';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-primary"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

export default function CityPage() {
  const router = useRouter();
  const cityId = usePreferencesStore((state) => state.cityId);
  const setCity = usePreferencesStore((state) => state.setCity);
  const setCustomCity = usePreferencesStore((state) => state.setCustomCity);
  const { data: cities } = useCitiesQuery();

  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [locStatus, setLocStatus] = useState<'idle' | 'loading' | 'denied'>('idle');

  useEffect(() => {
    if (!navigator.geolocation || !cities) return;
    queueMicrotask(() => {
      setLocStatus('loading');
    });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const { city } = resolveCityFromLocation(
          coords,
          { city: null, uf: null },
          cities,
        );
        queueMicrotask(() => {
          setCurrentCity(city);
          setLocStatus('idle');
        });
      },
      () => {
        queueMicrotask(() => {
          setLocStatus('denied');
        });
      },
    );
  }, [cities]);

  const handleSelectCity = (cityObj: City, isVirtual: boolean) => {
    if (isVirtual) {
      setCustomCity(cityObj);
    } else {
      setCity(cityObj.id);
    }
    router.back();
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus('denied');
      return;
    }
    setLocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const { city, isCatalog } = resolveCityFromLocation(
          coords,
          { city: null, uf: null },
          cities ?? [],
        );
        if (isCatalog) {
          setCity(city.id);
        } else {
          setCustomCity(city);
        }
        router.back();
      },
      () => setLocStatus('denied'),
    );
  };

  return (
    <section className="flex flex-col gap-4 pt-2">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-[family-name:var(--font-heading)] font-bold leading-tight text-foreground">
          Escolha sua cidade
        </h1>
      </header>

      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locStatus === 'loading'}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Usar minha localização
        </button>

        {currentCity ? (
          <button
            type="button"
            aria-pressed={currentCity.id === cityId}
            onClick={() => handleSelectCity(currentCity, currentCity.id.startsWith('geo:'))}
            className={cn(
              'flex items-center justify-between rounded-2xl bg-card px-4 py-3.5 text-left transition-opacity hover:opacity-80',
              currentCity.id === cityId && 'ring-1 ring-primary',
            )}
          >
            <span className="flex flex-col">
              <span className="text-[15px] font-[family-name:var(--font-body)] font-semibold text-foreground">
                {currentCity.name} (atual)
              </span>
              <span className="text-[12px] font-[family-name:var(--font-body)] text-muted-foreground">
                {currentCity.uf}
              </span>
            </span>
            {currentCity.id === cityId ? <CheckIcon /> : null}
          </button>
        ) : null}

        <div className="flex flex-col gap-3">
          {(cities ?? [])
            .filter((c) => c.id !== currentCity?.id)
            .map((city) => {
              const selected = city.id === cityId;
              return (
                <button
                  key={city.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleSelectCity(city, false)}
                  className={cn(
                    'flex items-center justify-between rounded-2xl bg-card px-4 py-3.5 text-left transition-opacity hover:opacity-80',
                    selected && 'ring-1 ring-primary',
                  )}
                >
                  <span className="flex flex-col">
                    <span className="text-[15px] font-[family-name:var(--font-body)] font-semibold text-foreground">
                      {city.name}
                    </span>
                    <span className="text-[12px] font-[family-name:var(--font-body)] text-muted-foreground">
                      {city.uf}
                    </span>
                  </span>
                  {selected ? <CheckIcon /> : null}
                </button>
              );
            })}
        </div>
      </div>
    </section>
  );
}
