'use client';

import {
  catalogKeys,
  getFriendlyErrorMessage,
  type PriceRange,
  updateOwnedEstablishment,
} from '@agenda/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import {
  EMPTY_DRAFT,
  type EstablishmentDraft,
  IdentityFields,
  LocationFields,
  OperationFields,
} from '@/components/EstablishmentFields';
import { useOwnedEstablishment } from '@/hooks/use-owned-establishment';

const SECTIONS = [
  { title: 'Identidade', Fields: IdentityFields },
  { title: 'Localização & Contato', Fields: LocationFields },
  { title: 'Operação', Fields: OperationFields },
] as const;

export default function PerfilPage() {
  const queryClient = useQueryClient();
  const { data: establishment } = useOwnedEstablishment();

  const [draft, setDraft] = useState<EstablishmentDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Preenche o formulário assim que o bar carrega. queueMicrotask evita o
  // setState síncrono no efeito (AGENTS.md §5).
  useEffect(() => {
    if (!establishment) return;
    queueMicrotask(() => {
      setDraft({
        logoUrl: establishment.logo_url,
        coverUrl: establishment.cover_url,
        name: establishment.name,
        description: establishment.description,
        cityId: establishment.city_id,
        address: establishment.address,
        neighborhood: establishment.neighborhood,
        whatsapp: establishment.whatsapp,
        instagram: establishment.instagram ?? '',
        openingHours: establishment.opening_hours,
        priceRange: establishment.price_range,
        ambiance: establishment.ambiance,
        menuUrl: establishment.menu_pdf_url ?? '',
        attributes: establishment.attributes,
      });
    });
  }, [establishment]);

  const set = <K extends keyof EstablishmentDraft>(key: K, value: EstablishmentDraft[K]) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  // Mesmos obrigatórios do onboarding: sem nome e cidade o bar fica ilocalizável.
  const canSave =
    Boolean(establishment) && draft.name.trim().length > 0 && Boolean(draft.cityId);

  const handleSubmit = async () => {
    if (!establishment) return;
    setErrorMessage(null);
    setSaved(false);
    setBusy(true);
    try {
      await updateOwnedEstablishment(establishment.id, {
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
        // A tela carrega a faixa atual do bar, então nunca sai vazia daqui.
        priceRange: draft.priceRange as PriceRange,
        ambiance: draft.ambiance,
        menuUrl: draft.menuUrl.trim(),
        attributes: draft.attributes,
      });
      await queryClient.invalidateQueries({
        queryKey: catalogKeys.establishments.detail(establishment.id),
      });
      setSaved(true);
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-bold text-foreground">Perfil do bar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estas informações aparecem para quem procura o seu bar no aplicativo e no site.
        </p>
      </header>

      {/* O layout do painel já garante que existe bar vinculado antes de montar
          esta página; aqui só se espera a linha chegar do servidor. */}
      {establishment ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="flex flex-col gap-6"
        >
          {SECTIONS.map(({ title, Fields }) => (
            <section
              key={title}
              aria-label={title}
              className="shadow-card rounded-2xl border border-border bg-card p-7"
            >
              <h2 className="font-heading mb-5 text-lg font-bold text-foreground">{title}</h2>
              <Fields draft={draft} set={set} onError={setErrorMessage} />
            </section>
          ))}

          <div className="flex items-center justify-end gap-4">
            {errorMessage ? (
              <p className="flex-1 text-[13px] text-destructive">{errorMessage}</p>
            ) : null}
            {saved && !errorMessage ? (
              <p role="status" className="flex-1 text-[13px] text-primary">
                Alterações salvas.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!canSave || busy}
              className="shadow-neon rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 disabled:shadow-none"
            >
              {busy ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      )}
    </div>
  );
}
