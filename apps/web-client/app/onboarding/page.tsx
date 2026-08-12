'use client';

import {
  catalogKeys,
  createOwnedEstablishment,
  getFriendlyErrorMessage,
  listCities,
  maskPhoneBR,
  useAuthStore,
} from '@agenda/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS, SELECT_CLASS } from '@/components/ui/styles';
import { panelKeys } from '@/hooks/use-owned-establishment';

const STEPS = ['Identidade', 'Endereço & contato', 'Revisão'] as const;

interface Draft {
  name: string;
  cityId: string;
  address: string;
  neighborhood: string;
  whatsapp: string;
}

const EMPTY_DRAFT: Draft = {
  name: '',
  cityId: '',
  address: '',
  neighborhood: '',
  whatsapp: '',
};

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: cities = [] } = useQuery({
    queryKey: catalogKeys.cities,
    queryFn: () => listCities(),
  });

  useEffect(() => {
    if (status === 'signedOut' || status === 'unavailable') {
      router.replace('/login');
    }
  }, [status, router]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  // Só nome e cidade são obrigatórios — o resto o dono completa em /perfil.
  const stepValid = step === 0 ? draft.name.trim().length > 0 : step === 1 ? Boolean(draft.cityId) : true;

  const handleFinish = async () => {
    setErrorMessage(null);
    setBusy(true);
    try {
      await createOwnedEstablishment({
        name: draft.name.trim(),
        cityId: draft.cityId,
        address: draft.address.trim(),
        neighborhood: draft.neighborhood.trim(),
        whatsapp: draft.whatsapp.trim(),
      });
      await queryClient.invalidateQueries({ queryKey: panelKeys.ownedEstablishmentId });
      router.replace('/');
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const cityName = cities.find((city) => city.id === draft.cityId)?.name ?? '—';

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-lg flex-col gap-6 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
            {STEPS.map((label, index) => (
              <span
                key={label}
                className={`h-1.5 flex-1 rounded-full ${index <= step ? 'bg-primary' : 'bg-surface-elevated'}`}
              />
            ))}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
              Passo {step + 1} de {STEPS.length}
            </span>
            <h1 className="font-[family-name:var(--font-heading)] text-[22px] font-bold text-foreground">
              {STEPS[step]}
            </h1>
          </div>
        </div>

        {errorMessage ? <p className="text-[13px] text-destructive">{errorMessage}</p> : null}

        {step === 0 ? (
          <Field label="Nome do estabelecimento *">
            <input
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Bar do Zé"
              aria-label="Nome do estabelecimento"
              className={INPUT_CLASS}
            />
          </Field>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <Field label="Cidade *">
              <select
                value={draft.cityId}
                onChange={(e) => set('cityId', e.target.value)}
                aria-label="Cidade"
                className={SELECT_CLASS}
              >
                <option value="">Selecione a cidade</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Endereço completo">
              <input
                value={draft.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="Rua, número"
                aria-label="Endereço completo"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Bairro">
              <input
                value={draft.neighborhood}
                onChange={(e) => set('neighborhood', e.target.value)}
                placeholder="Vila Madalena"
                aria-label="Bairro"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="WhatsApp">
              <input
                value={draft.whatsapp}
                onChange={(e) => set('whatsapp', maskPhoneBR(e.target.value))}
                placeholder="(11) 99999-9999"
                inputMode="tel"
                aria-label="WhatsApp"
                className={INPUT_CLASS}
              />
            </Field>
          </div>
        ) : null}

        {step === 2 ? (
          <dl className="flex flex-col gap-3 rounded-2xl bg-surface p-5 text-[14px]">
            {[
              ['Nome', draft.name],
              ['Cidade', cityName],
              ['Endereço', draft.address || '—'],
              ['Bairro', draft.neighborhood || '—'],
              ['WhatsApp', draft.whatsapp || '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="truncate text-right text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="flex gap-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={busy} className="flex-1">
              Voltar
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!stepValid} className="flex-1">
              Continuar
            </Button>
          ) : (
            <Button onClick={() => void handleFinish()} disabled={busy} className="flex-1">
              {busy ? 'Criando…' : 'Criar meu painel'}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
