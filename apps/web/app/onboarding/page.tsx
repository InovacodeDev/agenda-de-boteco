'use client';

import {
  resolveCityFromLocation,
  useCitiesQuery,
  usePreferencesStore,
} from '@agenda/core';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { MusicIcon, PinIcon, SparklesIcon } from '@/components/auth/icons';
import logo from '@/public/logo.png';

// ponytail: guard de onboarding (redirect) fica para integração de rotas.

interface FeatureCardProps {
  icon: React.ReactNode;
  label: string;
}

function FeatureCard({ icon, label }: FeatureCardProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-surface/80 px-2 py-4">
      <span className="text-primary">{icon}</span>
      <span className="text-[12px] font-medium text-foreground">{label}</span>
    </div>
  );
}

type LocStatus = 'idle' | 'loading' | 'denied';

export default function OnboardingPage() {
  const router = useRouter();
  const setCity = usePreferencesStore((state) => state.setCity);
  const setCustomCity = usePreferencesStore((state) => state.setCustomCity);
  const completeOnboarding = usePreferencesStore((state) => state.completeOnboarding);
  const { data: cities } = useCitiesQuery();
  const [locStatus, setLocStatus] = useState<LocStatus>('idle');

  const finish = () => {
    completeOnboarding();
    router.push('/');
  };

  const chooseCity = (cityId: string) => {
    setCity(cityId);
    finish();
  };

  // Web: navigator.geolocation dá coords mas não reverse-geocode (RN usava
  // expo-location). Passamos geocode vazio → vira cidade virtual com coords
  // reais, ou cai numa cidade do catálogo se houver uma a <40km.
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
        finish();
      },
      () => setLocStatus('denied'),
    );
  };

  return (
    <main className="flex min-h-dvh flex-col gap-6 bg-[linear-gradient(160deg,#1A122B,#0F0F0F)] p-6">
      <Image src={logo} alt="Agenda de Boteco" priority className="h-auto w-28" />

      <div className="flex flex-col gap-3">
        <h1 className="font-[family-name:var(--font-heading)] text-[32px] text-foreground">
          A noite começa <span className="text-primary">aqui</span>.
        </h1>
        <p className="text-[15px] leading-6 text-muted-foreground">
          Descubra o que está rolando em bares, pubs e botecos da sua cidade. Música ao vivo,
          happy hour e a melhor agenda da noite.
        </p>
      </div>

      <div className="flex gap-3">
        <FeatureCard icon={<MusicIcon size={20} />} label="Música ao vivo" />
        <FeatureCard icon={<SparklesIcon size={20} />} label="Promoções" />
        <FeatureCard icon={<PinIcon size={20} />} label="Perto de você" />
      </div>

      <div className="flex flex-col gap-4 pt-4">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locStatus === 'loading'}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[14px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <PinIcon size={16} />
          {locStatus === 'loading' ? 'Localizando…' : 'Usar minha localização'}
        </button>
        {locStatus === 'denied' ? (
          <p className="text-center text-[12px] text-muted-foreground">
            Permissão negada — escolha sua cidade abaixo.
          </p>
        ) : null}
        <p className="text-center text-[13px] text-muted-foreground">ou escolha sua cidade</p>
        <div className="flex flex-wrap gap-3">
          {(cities ?? []).map((city) => (
            <button
              type="button"
              key={city.id}
              aria-label={`${city.name}, ${city.uf}`}
              onClick={() => chooseCity(city.id)}
              className="w-[47%] grow rounded-2xl bg-surface/80 px-4 py-3.5 text-left transition-opacity hover:opacity-80"
            >
              <span className="block text-[14px] font-semibold text-foreground">{city.name}</span>
              <span className="block text-[12px] text-muted-foreground">{city.uf}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
