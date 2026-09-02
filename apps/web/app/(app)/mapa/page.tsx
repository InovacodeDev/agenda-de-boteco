'use client';

import {
  FEATURES,
  type LatLng,
  resolveMapOrigin,
  useActiveCity,
  useEstablishmentsQuery,
} from '@agenda/core';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';

import { EstablishmentCard } from '@/components/establishment/EstablishmentCard';
import { UnderConstruction } from '@/components/feedback/UnderConstruction';

// react-leaflet usa `window` e quebra no SSR — carrega só no cliente.
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => <div className="h-[60vh] min-h-[400px] w-full animate-pulse rounded-2xl bg-card" />,
});

// ponytail: fallback de Florianópolis quando a cidade ativa ainda não resolveu.
const FALLBACK_CENTER: [number, number] = [-27.5954, -48.548];

function MapContent() {
  const city = useActiveCity();
  const [userCoords, setUserCoords] = useState<LatLng | null>(null);
  const { data: establishments } = useEstablishmentsQuery(city?.id);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        queueMicrotask(() => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        });
      },
      () => {},
      { enableHighAccuracy: true },
    );
  }, []);

  const cityEstablishments = useMemo(
    () => (city ? (establishments ?? []).filter((e) => e.city_id === city.id) : (establishments ?? [])),
    [establishments, city],
  );

  const origin = resolveMapOrigin(userCoords, userCoords ? 'granted' : 'idle', city);
  const center: [number, number] = origin ? [origin.lat, origin.lng] : FALLBACK_CENTER;

  return (
    <section className="flex flex-col gap-4 pt-2">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-[family-name:var(--font-heading)] font-bold leading-tight text-foreground">
          Mapa dos botecos
        </h1>
        <p className="text-[14px] font-[family-name:var(--font-body)] text-muted-foreground">
          {city ? `Bares em ${city.name}.` : 'Carregando…'}
        </p>
      </header>

      <MapView establishments={cityEstablishments} center={center} />

      <div className="flex flex-col gap-3">
        {cityEstablishments.map((establishment) => (
          <EstablishmentCard key={establishment.id} establishment={establishment} />
        ))}
      </div>
    </section>
  );
}

export default function MapPage() {
  if (!FEATURES.map) {
    return (
      <UnderConstruction
        version="v4"
        title="O mapa tá sendo desenhado"
        description="Logo logo você acha o boteco mais perto de você num toque. Chega na v4."
      />
    );
  }
  return <MapContent />;
}
