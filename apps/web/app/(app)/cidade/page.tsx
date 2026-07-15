'use client';

import { useCitiesQuery, usePreferencesStore } from '@agenda/core';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/cn';

// ponytail: cidade por geolocalização web fica para depois (mobile usa customCity/GPS).
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
  const { data: cities } = useCitiesQuery();

  const selectCity = (id: string) => {
    setCity(id);
    router.back();
  };

  return (
    <section className="flex flex-col gap-4 pt-2">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-[family-name:var(--font-heading)] font-bold leading-tight text-foreground">
          Escolha sua cidade
        </h1>
      </header>

      <div className="flex flex-col gap-3">
        {(cities ?? []).map((city) => {
          const selected = city.id === cityId;
          return (
            <button
              key={city.id}
              type="button"
              aria-pressed={selected}
              onClick={() => selectCity(city.id)}
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
    </section>
  );
}
