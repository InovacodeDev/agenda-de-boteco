'use client';

import {
  catalogKeys,
  createCityFromPanel,
  createOwnedEstablishment,
  ESTABLISHMENT_ATTRIBUTES,
  type EstablishmentAttribute,
  getFriendlyErrorMessage,
  isCurrentUserEstablishmentOwner,
  listCities,
  maskPhoneBR,
  PRICE_RANGE_LABELS,
  signOut,
  useAuthStore,
} from '@agenda/core';
import { ArrowLeftIcon, ArrowRightIcon } from '@phosphor-icons/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AttributeIcon } from '@/components/ui/AttributeIcon';
import { CityCombobox } from '@/components/ui/CityCombobox';
import { ImageDrop } from '@/components/ui/ImageDrop';
import { SelectField } from '@/components/ui/SelectField';
import { panelKeys } from '@/hooks/use-owned-establishment';
import logo from '@/public/logo.png';

const STEPS = ['Identidade', 'Endereço & contato', 'Operação'] as const;

interface Draft {
  logoUrl: string;
  coverUrl: string;
  name: string;
  description: string;
  cityId: string;
  address: string;
  neighborhood: string;
  whatsapp: string;
  instagram: string;
  openingHours: string;
  priceRange: string;
  ambiance: string;
  menuUrl: string;
  attributes: EstablishmentAttribute[];
}

const EMPTY_DRAFT: Draft = {
  logoUrl: '',
  coverUrl: '',
  name: '',
  description: '',
  cityId: '',
  address: '',
  neighborhood: '',
  whatsapp: '',
  instagram: '',
  openingHours: '',
  priceRange: '',
  ambiance: '',
  menuUrl: '',
  attributes: [],
};

/** Tipos de ambiente da especificação do painel (seção 4). */
const AMBIANCES = [
  'Boteco tradicional',
  'Pub',
  'Bar moderno',
  'Restaurante-bar',
  'Cervejaria',
  'Choperia',
  'Casa de shows',
  'Lounge',
] as const;

const LABEL_CLASS = 'text-[14px] font-medium text-foreground';

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-surface/40 px-3.5 py-3 text-[14px] text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary';

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

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  /**
   * Cria a cidade digitada e já a seleciona. A RPC é idempotente: se o nome
   * casar com uma existente (ignorando acento e caixa), devolve o id dela em
   * vez de duplicar.
   */
  const handleCreateCity = async (name: string, uf: string) => {
    setErrorMessage(null);
    try {
      const cityId = await createCityFromPanel(name, uf);
      await queryClient.invalidateQueries({ queryKey: catalogKeys.cities });
      set('cityId', cityId);
    } catch (error: unknown) {
      setErrorMessage(getFriendlyErrorMessage(error));
    }
  };

  const toggleAttribute = (id: EstablishmentAttribute) =>
    setDraft((current) => ({
      ...current,
      attributes: current.attributes.includes(id)
        ? current.attributes.filter((item) => item !== id)
        : [...current.attributes, id],
    }));

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
    <main className="min-h-dvh bg-[image:var(--gradient-night)] px-6 py-10">
      <div className="mx-auto w-full max-w-[786px]">
        <header className="flex items-center gap-3">
          <Image
            src={logo}
            alt="Agenda de Boteco"
            priority
            className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-1"
          />
          <h1 className="flex-1 font-[family-name:var(--font-heading)] text-xl font-bold text-foreground">
            Cadastrar estabelecimento
          </h1>
          <button
            type="button"
            onClick={() => void signOut()}
            className="text-[14px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Sair
          </button>
        </header>

        <div className="mt-7">
          <div className="flex items-center justify-between text-[14px]">
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

          {step === 0 ? (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-[1fr_1.85fr] gap-6">
                <ImageDrop
                  label="Logo"
                  value={draft.logoUrl}
                  onChange={(url) => set('logoUrl', url)}
                  className="h-[202px]"
                />
                <ImageDrop
                  label="Imagem de capa"
                  value={draft.coverUrl}
                  onChange={(url) => set('coverUrl', url)}
                  className="h-[270px]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="name" className={LABEL_CLASS}>
                  Nome do estabelecimento *
                </label>
                <input
                  id="name"
                  value={draft.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Bar do Zé"
                  className={FIELD_CLASS}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className={LABEL_CLASS}>
                  Descrição
                </label>
                <textarea
                  id="description"
                  value={draft.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Conta a história do seu boteco..."
                  rows={3}
                  className={`${FIELD_CLASS} resize-y`}
                />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="address" className={LABEL_CLASS}>
                  Endereço completo
                </label>
                <input
                  id="address"
                  value={draft.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Rua, número"
                  className={FIELD_CLASS}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="city" className={LABEL_CLASS}>
                    Cidade *
                  </label>
                  <CityCombobox
                    cities={cities}
                    value={draft.cityId}
                    onSelect={(cityId) => set('cityId', cityId)}
                    onCreate={handleCreateCity}
                    inputClassName={FIELD_CLASS}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="neighborhood" className={LABEL_CLASS}>
                    Bairro
                  </label>
                  <input
                    id="neighborhood"
                    value={draft.neighborhood}
                    onChange={(e) => set('neighborhood', e.target.value)}
                    placeholder="Vila Madalena"
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="whatsapp" className={LABEL_CLASS}>
                    WhatsApp
                  </label>
                  <input
                    id="whatsapp"
                    value={draft.whatsapp}
                    onChange={(e) => set('whatsapp', maskPhoneBR(e.target.value))}
                    placeholder="(11) 99999-9999"
                    inputMode="tel"
                    className={FIELD_CLASS}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="instagram" className={LABEL_CLASS}>
                    Instagram
                  </label>
                  <input
                    id="instagram"
                    value={draft.instagram}
                    onChange={(e) => set('instagram', e.target.value)}
                    placeholder="@bardoze"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className={FIELD_CLASS}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-5">
              <h2 className="font-[family-name:var(--font-heading)] text-lg font-bold text-foreground">
                Operação
              </h2>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="openingHours" className={LABEL_CLASS}>
                  Horário de funcionamento
                </label>
                <input
                  id="openingHours"
                  value={draft.openingHours}
                  onChange={(e) => set('openingHours', e.target.value)}
                  placeholder="Seg a Sáb, 18h às 02h"
                  className={FIELD_CLASS}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="priceRange" className={LABEL_CLASS}>
                    Faixa de preço
                  </label>
                  <SelectField
                    id="priceRange"
                    value={draft.priceRange}
                    onChange={(e) => set('priceRange', e.target.value)}
                    className={`${FIELD_CLASS} ${draft.priceRange ? '' : 'text-muted-foreground'}`}
                  >
                    <option value="">Selecione</option>
                    {Object.entries(PRICE_RANGE_LABELS).map(([value, label]) => (
                      <option key={value} value={value} className="text-foreground">
                        {label}
                      </option>
                    ))}
                  </SelectField>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ambiance" className={LABEL_CLASS}>
                    Tipo de ambiente
                  </label>
                  <SelectField
                    id="ambiance"
                    value={draft.ambiance}
                    onChange={(e) => set('ambiance', e.target.value)}
                    className={`${FIELD_CLASS} ${draft.ambiance ? '' : 'text-muted-foreground'}`}
                  >
                    <option value="">Selecione</option>
                    {AMBIANCES.map((item) => (
                      <option key={item} value={item} className="text-foreground">
                        {item}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="menuUrl" className={LABEL_CLASS}>
                  Link do cardápio
                </label>
                <input
                  id="menuUrl"
                  value={draft.menuUrl}
                  onChange={(e) => set('menuUrl', e.target.value)}
                  placeholder="https://..."
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className={FIELD_CLASS}
                />
              </div>

              <div className="flex flex-col gap-2.5">
                <span className={LABEL_CLASS}>Diferenciais do local</span>
                {/* Lista oficial de 36 atributos do core, não os 12 do mockup:
                    é o mesmo enum que alimenta os filtros do app e do site. */}
                <div className="flex flex-wrap gap-2">
                  {ESTABLISHMENT_ATTRIBUTES.map((attribute) => {
                    const selected = draft.attributes.includes(attribute.id);
                    return (
                      <button
                        key={attribute.id}
                        type="button"
                        title={attribute.description}
                        aria-pressed={selected}
                        onClick={() => toggleAttribute(attribute.id)}
                        className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] font-medium transition-colors ${
                          selected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-surface-elevated text-foreground hover:bg-surface'
                        }`}
                      >
                        <AttributeIcon name={attribute.icon} />
                        {attribute.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-7 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0 || busy}
              className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground"
            >
              <ArrowLeftIcon size={16} />
              Voltar
            </button>

            <button
              type="button"
              onClick={() => (isLastStep ? void handleFinish() : setStep((s) => s + 1))}
              disabled={!stepValid || busy}
              className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[14px] font-semibold text-primary-foreground shadow-[0_10px_40px_-10px_rgba(29,215,94,0.45)] transition-opacity hover:opacity-90 disabled:opacity-50 disabled:shadow-none"
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
