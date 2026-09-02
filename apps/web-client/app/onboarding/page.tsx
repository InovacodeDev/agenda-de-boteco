'use client';

import {
  createOwnedEstablishment,
  getFriendlyErrorMessage,
  isCurrentUserEstablishmentOwner,
  signOut,
  useAuthStore,
} from '@agenda/core';
import { ArrowLeftIcon, ArrowRightIcon } from '@phosphor-icons/react';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  EMPTY_DRAFT,
  type EstablishmentDraft,
  IdentityFields,
  LocationFields,
  OperationFields,
} from '@/components/EstablishmentFields';
import { panelKeys } from '@/hooks/use-owned-establishment';
import logo from '@/public/logo.png';

const STEPS = ['Identidade', 'Endereço & contato', 'Operação'] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<EstablishmentDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mesma regra do painel: sem sessão ou sem a flag de dono, volta ao login.
  useEffect(() => {
    if (status === 'signedOut' || status === 'unavailable') {
      router.replace('/login');
      return;
    }
    if (status !== 'signedIn') return;
    let active = true;
    void isCurrentUserEstablishmentOwner().then((isOwner) => {
      if (active && !isOwner) router.replace('/login');
    });
    return () => {
      active = false;
    };
  }, [status, router]);

  const set = <K extends keyof EstablishmentDraft>(key: K, value: EstablishmentDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  // Só nome e cidade são obrigatórios — o resto o dono completa em /perfil.
  const stepValid =
    step === 0 ? draft.name.trim().length > 0 : step === 1 ? Boolean(draft.cityId) : true;

  const handleFinish = async () => {
    setErrorMessage(null);
    setBusy(true);
    try {
      await createOwnedEstablishment({
        name: draft.name.trim(),
        description: draft.description.trim(),
        logoUrl: draft.logoUrl,
        coverUrl: draft.coverUrl,
        cityId: draft.cityId,
        address: draft.address.trim(),
        neighborhood: draft.neighborhood.trim(),
        whatsapp: draft.whatsapp.trim(),
        instagram: draft.instagram.trim(),
        openingHours: draft.openingHours.trim(),
        priceRange: draft.priceRange,
        ambiance: draft.ambiance,
        menuUrl: draft.menuUrl.trim(),
        attributes: draft.attributes,
      });
      await queryClient.invalidateQueries({ queryKey: panelKeys.ownedEstablishmentId });
      router.replace('/');
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const progress = Math.round(((step + 1) / STEPS.length) * 100);
  const isLastStep = step === STEPS.length - 1;

  return (
    <main className="min-h-dvh bg-(image:--gradient-night) px-6 py-10">
      <div className="mx-auto w-full max-w-[786px]">
        <header className="flex items-center gap-3">
          <Image
            src={logo}
            alt="Agenda de Boteco"
            priority
            className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-1"
          />
          <h1 className="font-heading flex-1 text-xl font-bold text-foreground">
            Cadastrar estabelecimento
          </h1>
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sair
          </button>
        </header>

        <div className="mt-7">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Passo {step + 1} de {STEPS.length}
            </span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Passo ${step + 1} de ${STEPS.length}`}
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated"
          >
            <span
              className="block h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-border bg-card p-7">
          {errorMessage ? (
            <p className="mb-5 text-[13px] text-destructive">{errorMessage}</p>
          ) : null}

          {step === 0 ? <IdentityFields draft={draft} set={set} /> : null}

          {step === 1 ? (
            <LocationFields draft={draft} set={set} onError={setErrorMessage} />
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-5">
              <h2 className="font-heading text-lg font-bold text-foreground">Operação</h2>
              <OperationFields draft={draft} set={set} />
            </div>
          ) : null}

          <div className="mt-7 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0 || busy}
              className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground"
            >
              <ArrowLeftIcon size={16} />
              Voltar
            </button>

            <button
              type="button"
              onClick={() => (isLastStep ? void handleFinish() : setStep((s) => s + 1))}
              disabled={!stepValid || busy}
              className="shadow-neon flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 disabled:shadow-none"
            >
              {isLastStep ? (busy ? 'Criando…' : 'Criar meu painel') : 'Próximo'}
              {isLastStep ? null : <ArrowRightIcon size={16} />}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
