'use client';

import {
  catalogKeys,
  createCityFromPanel,
  type EstablishmentAttribute,
  getFriendlyErrorMessage,
  listCities,
  maskPhoneBR,
  PRICE_RANGE_LABELS,
} from '@agenda/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { AttributeAutocomplete } from '@/components/ui/AttributeAutocomplete';
import { CityCombobox } from '@/components/ui/CityCombobox';
import { ImageDrop } from '@/components/ui/ImageDrop';
import { SelectField } from '@/components/ui/SelectField';

/**
 * Campos do estabelecimento, compartilhados pelo wizard de onboarding (Fase 1,
 * um grupo por passo) e pela tela de Perfil (Fase 2, os três em scroll único).
 * São o mesmo formulário: o onboarding coleta, o Perfil edita.
 */
export interface EstablishmentDraft {
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

export const EMPTY_DRAFT: EstablishmentDraft = {
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

const LABEL_CLASS = 'text-sm font-medium text-foreground';

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-surface/40 px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary';

type Setter = <K extends keyof EstablishmentDraft>(
  key: K,
  value: EstablishmentDraft[K],
) => void;

/**
 * Assinatura única para os três grupos, para o Perfil renderizá-los por um map
 * sem `any`. `onError` só é usado pelo grupo de localização (criação de cidade).
 */
export interface FieldGroupProps {
  draft: EstablishmentDraft;
  set: Setter;
  onError?: (message: string) => void;
}

function Labelled({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={LABEL_CLASS}>
        {label}
      </label>
      {children}
    </div>
  );
}

/** Logo, capa, nome e descrição. */
export function IdentityFields({ draft, set }: FieldGroupProps) {
  return (
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

      <Labelled htmlFor="name" label="Nome do estabelecimento *">
        <input
          id="name"
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Bar do Zé"
          className={FIELD_CLASS}
        />
      </Labelled>

      <Labelled htmlFor="description" label="Descrição">
        <textarea
          id="description"
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Conta a história do seu boteco..."
          rows={3}
          className={`${FIELD_CLASS} resize-y`}
        />
      </Labelled>
    </div>
  );
}

/** Endereço, cidade, bairro e canais de contato. */
export function LocationFields({ draft, set, onError }: FieldGroupProps) {
  const queryClient = useQueryClient();

  const { data: cities = [] } = useQuery({
    queryKey: catalogKeys.cities,
    queryFn: () => listCities(),
  });

  /**
   * Cria a cidade digitada e já a seleciona. A RPC é idempotente: se o nome
   * casar com uma existente (ignorando acento e caixa), devolve o id dela em
   * vez de duplicar.
   */
  const handleCreateCity = async (name: string, uf: string) => {
    try {
      const cityId = await createCityFromPanel(name, uf);
      await queryClient.invalidateQueries({ queryKey: catalogKeys.cities });
      set('cityId', cityId);
    } catch (error: unknown) {
      onError?.(getFriendlyErrorMessage(error));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Labelled htmlFor="address" label="Endereço completo">
        <input
          id="address"
          value={draft.address}
          onChange={(e) => set('address', e.target.value)}
          placeholder="Rua, número"
          className={FIELD_CLASS}
        />
      </Labelled>

      <div className="grid grid-cols-2 gap-6">
        <Labelled htmlFor="city" label="Cidade *">
          <CityCombobox
            cities={cities}
            value={draft.cityId}
            onSelect={(cityId) => set('cityId', cityId)}
            onCreate={handleCreateCity}
            inputClassName={FIELD_CLASS}
          />
        </Labelled>

        <Labelled htmlFor="neighborhood" label="Bairro">
          <input
            id="neighborhood"
            value={draft.neighborhood}
            onChange={(e) => set('neighborhood', e.target.value)}
            placeholder="Vila Madalena"
            className={FIELD_CLASS}
          />
        </Labelled>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Labelled htmlFor="whatsapp" label="WhatsApp">
          <input
            id="whatsapp"
            value={draft.whatsapp}
            onChange={(e) => set('whatsapp', maskPhoneBR(e.target.value))}
            placeholder="(11) 99999-9999"
            inputMode="tel"
            className={FIELD_CLASS}
          />
        </Labelled>

        <Labelled htmlFor="instagram" label="Instagram">
          <input
            id="instagram"
            value={draft.instagram}
            onChange={(e) => set('instagram', e.target.value)}
            placeholder="@bardoze"
            autoCapitalize="none"
            autoCorrect="off"
            className={FIELD_CLASS}
          />
        </Labelled>
      </div>
    </div>
  );
}

/** Horário, faixa de preço, ambiente, cardápio e diferenciais. */
export function OperationFields({ draft, set }: FieldGroupProps) {
  return (
    <div className="flex flex-col gap-5">
      <Labelled htmlFor="openingHours" label="Horário de funcionamento">
        <input
          id="openingHours"
          value={draft.openingHours}
          onChange={(e) => set('openingHours', e.target.value)}
          placeholder="Seg a Sáb, 18h às 02h"
          className={FIELD_CLASS}
        />
      </Labelled>

      <div className="grid grid-cols-2 gap-6">
        <Labelled htmlFor="priceRange" label="Faixa de preço">
          <SelectField
            id="priceRange"
            value={draft.priceRange}
            onValueChange={(v) => set('priceRange', v)}
            placeholder="Selecione"
            className={`${FIELD_CLASS} data-[placeholder]:text-muted-foreground`}
          >
            {Object.entries(PRICE_RANGE_LABELS).map(([value, label]) => (
              <SelectField.Option key={value} value={value}>
                {label}
              </SelectField.Option>
            ))}
          </SelectField>
        </Labelled>

        <Labelled htmlFor="ambiance" label="Tipo de ambiente">
          <SelectField
            id="ambiance"
            value={draft.ambiance}
            onValueChange={(v) => set('ambiance', v)}
            placeholder="Selecione"
            className={`${FIELD_CLASS} data-[placeholder]:text-muted-foreground`}
          >
            {AMBIANCES.map((item) => (
              <SelectField.Option key={item} value={item}>
                {item}
              </SelectField.Option>
            ))}
          </SelectField>
        </Labelled>
      </div>

      <Labelled htmlFor="menuUrl" label="Link do cardápio">
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
      </Labelled>

      <Labelled htmlFor="attributes" label="Diferenciais do local">
        {/* Lista oficial de 36 atributos do core, não os 12 do mockup:
            é o mesmo enum que alimenta os filtros do app e do site. */}
        <AttributeAutocomplete
          value={draft.attributes}
          onChange={(attributes) => set('attributes', attributes)}
          inputClassName={FIELD_CLASS}
        />
      </Labelled>
    </div>
  );
}
