'use client';

import {
  catalogKeys,
  getFriendlyErrorMessage,
  type PriceRange,
  updateOwnedEstablishment,
} from '@agenda/core';
import { FloppyDiskIcon } from '@phosphor-icons/react';
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
  // Cópia do que está gravado, para detectar se há algo a salvar. Guardar o
  // snapshot é mais barato que comparar campo a campo contra o Establishment
  // (nomes e nulabilidade divergem entre a linha do banco e o formulário).
  const [savedDraft, setSavedDraft] = useState<EstablishmentDraft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Preenche o formulário assim que o bar carrega. queueMicrotask evita o
  // setState síncrono no efeito (AGENTS.md §5).
  useEffect(() => {
    if (!establishment) return;
    queueMicrotask(() => {
      const loaded: EstablishmentDraft = {
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
      };
      setDraft(loaded);
      setSavedDraft(loaded);
    });
  }, [establishment]);

  const set = <K extends keyof EstablishmentDraft>(key: K, value: EstablishmentDraft[K]) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  /**
   * Compara o formulário com o que está gravado. Texto entra normalizado por
   * trim() — o submit também faz trim, então espaços na ponta não são alteração.
   * A ordem dos diferenciais não importa: a lista é um conjunto.
   */
  const isDirty = (Object.keys(draft) as (keyof EstablishmentDraft)[]).some((key) => {
    const current = draft[key];
    const saved = savedDraft[key];
    if (Array.isArray(current) && Array.isArray(saved)) {
      return current.length !== saved.length || current.some((item) => !saved.includes(item));
    }
    return String(current).trim() !== String(saved).trim();
  });

  // Mesmos obrigatórios do onboarding: sem nome e cidade o bar fica ilocalizável.
  const canSave =
    Boolean(establishment) && isDirty && draft.name.trim().length > 0 && Boolean(draft.cityId);

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
      // O que está na tela passa a ser o gravado, desabilitando o botão sem
      // esperar o refetch da invalidação abaixo.
      setSavedDraft(draft);
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
        <h1 className="font-heading text-foreground text-2xl font-bold">
          Perfil do estabelecimento
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Essas informações aparecem no app dos usuários.
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
              className="shadow-card border-border bg-card rounded-2xl border p-7"
            >
              <h2 className="font-heading text-foreground mb-5 text-lg font-bold">{title}</h2>
              <Fields draft={draft} set={set} onError={setErrorMessage} />
            </section>
          ))}

          <div className="flex items-center justify-end gap-4">
            {errorMessage ? (
              <p className="text-destructive flex-1 text-[13px]">{errorMessage}</p>
            ) : null}
            {saved && !errorMessage ? (
              <p role="status" className="text-primary flex-1 text-[13px]">
                Alterações salvas.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!canSave || busy}
              className="shadow-neon bg-primary text-primary-foreground inline-flex flex-row items-center gap-4 rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:shadow-none"
            >
              <FloppyDiskIcon size={18} weight="regular" />
              {busy ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-muted-foreground text-sm">Carregando…</p>
      )}
    </div>
  );
}
