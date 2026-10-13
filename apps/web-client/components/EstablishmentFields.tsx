'use client';

import {
  catalogKeys,
  createCityFromPanel,
  deleteImage,
  type EstablishmentAttribute,
  getFriendlyErrorMessage,
  listCities,
  lookupCep,
  maskCEP,
  maskPhoneBR,
  MAX_IMAGE_BYTES,
  normalizeText,
  pathFromPublicUrl,
  PRICE_RANGE_LABELS,
  type PriceRange,
  priceRangeSchema,
  uploadImage,
} from '@agenda/core';
import { Select } from '@agenda/shared-ui';
import { FilePdfIcon, UploadSimpleIcon } from '@phosphor-icons/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { OpeningHoursGrid } from '@/components/OpeningHoursGrid';
import { AttributeAutocomplete } from '@/components/ui/AttributeAutocomplete';
import { CityCombobox } from '@/components/ui/CityCombobox';
import { ImageDrop } from '@/components/ui/ImageDrop';

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
  /** '' = "Não definido". */
  priceRange: PriceRange | '';
  /** Ambientes separados por ", " — cabe na coluna TEXT que os apps já exibem. */
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

const AMBIANCE_SEPARATOR = ', ';

/** Radix Select não aceita item com valor vazio; mapeia para priceRange ''. */
const NO_PRICE_RANGE = 'none';

const MENU_PATH_PREFIX = 'establishments/menus';

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

  /**
   * CEP só sugere: preenche rua, bairro e cidade e deixa o cursor no endereço
   * para o dono digitar o número. Não é gravado — a tabela não tem a coluna.
   */
  const [cep, setCep] = useState('');
  const [cepNotice, setCepNotice] = useState<string | null>(null);

  const handleCep = async (value: string) => {
    const masked = maskCEP(value);
    setCep(masked);
    setCepNotice(null);
    if (masked.replace(/\D/g, '').length !== 8) return;

    setCepNotice('Buscando endereço…');
    try {
      const found = await lookupCep(masked);
      if (!found) {
        setCepNotice('CEP não encontrado. Preencha o endereço abaixo.');
        return;
      }
      setCepNotice(null);
      if (found.street) set('address', `${found.street}, `);
      if (found.neighborhood) set('neighborhood', found.neighborhood);
      const city = cities.find(
        (item) =>
          item.uf === found.uf && normalizeText(item.name) === normalizeText(found.city),
      );
      if (city) {
        set('cityId', city.id);
      } else {
        await handleCreateCity(found.city, found.uf);
      }
      document.getElementById('address')?.focus();
    } catch (error: unknown) {
      setCepNotice(getFriendlyErrorMessage(error));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Labelled htmlFor="cep" label="CEP">
        <input
          id="cep"
          value={cep}
          onChange={(e) => void handleCep(e.target.value)}
          placeholder="00000-000"
          inputMode="numeric"
          autoComplete="postal-code"
          className={`${FIELD_CLASS} max-w-48`}
        />
        {cepNotice ? (
          <p role="status" className="text-muted-foreground text-[13px]">
            {cepNotice}
          </p>
        ) : null}
      </Labelled>

      <Labelled htmlFor="address" label="Endereço completo">
        <input
          id="address"
          value={draft.address}
          onChange={(e) => set('address', e.target.value)}
          placeholder="Rua, número"
          autoComplete="street-address"
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
  const selectedAmbiances = draft.ambiance.split(AMBIANCE_SEPARATOR).filter(Boolean);

  const toggleAmbiance = (item: string) => {
    const next = selectedAmbiances.includes(item)
      ? selectedAmbiances.filter((value) => value !== item)
      : [...selectedAmbiances, item];
    set('ambiance', next.join(AMBIANCE_SEPARATOR));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Horário de funcionamento</span>
        <OpeningHoursGrid
          value={draft.openingHours}
          onChange={(value) => set('openingHours', value)}
        />
      </div>

      <Labelled htmlFor="priceRange" label="Faixa de preço">
        <Select
          id="priceRange"
          value={draft.priceRange || NO_PRICE_RANGE}
          onValueChange={(v) => {
            const parsed = priceRangeSchema.safeParse(v);
            set('priceRange', parsed.success ? parsed.data : '');
          }}
          className="max-w-xs"
        >
          <Select.Option value={NO_PRICE_RANGE}>Não definido</Select.Option>
          {Object.entries(PRICE_RANGE_LABELS).map(([value, label]) => (
            <Select.Option key={value} value={value}>
              {label}
            </Select.Option>
          ))}
        </Select>
      </Labelled>

      <fieldset className="flex flex-col gap-1.5">
        <legend className={`${LABEL_CLASS} mb-1.5`}>
          Tipo de ambiente{' '}
          <span className="text-muted-foreground font-normal">(marque quantos quiser)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {AMBIANCES.map((item) => {
            const selected = selectedAmbiances.includes(item);
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleAmbiance(item)}
                className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
                  selected
                    ? 'border-primary bg-primary text-primary-foreground font-medium'
                    : 'border-border bg-surface/40 text-foreground hover:border-primary/60'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </fieldset>

      <MenuField value={draft.menuUrl} onChange={(url) => set('menuUrl', url)} />

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

type MenuMode = 'link' | 'file';

const MENU_MODES: { id: MenuMode; label: string }[] = [
  { id: 'link', label: 'Colar link' },
  { id: 'file', label: 'Enviar PDF ou foto' },
];

/**
 * Cardápio por link externo ou por arquivo no bucket. Os dois caminhos gravam
 * uma URL em `menu_pdf_url`, que os apps abrem como link — PDF ou imagem.
 */
function MenuField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const isUploaded = pathFromPublicUrl(value) !== null;
  const [mode, setMode] = useState<MenuMode>(isUploaded ? 'file' : 'link');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      setError('Envie um PDF ou uma foto do cardápio.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Arquivo acima de 8MB.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const url = await uploadImage(file, { pathPrefix: MENU_PATH_PREFIX });
      if (isUploaded) {
        void deleteImage(value).catch(() => {});
      }
      onChange(url);
    } catch (e: unknown) {
      setError(getFriendlyErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className={LABEL_CLASS}>Cardápio</span>
      <div role="tablist" aria-label="Como enviar o cardápio" className="flex gap-2">
        {MENU_MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            onClick={() => setMode(item.id)}
            className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
              mode === item.id
                ? 'border-primary text-primary font-medium'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {mode === 'link' ? (
        <input
          id="menuUrl"
          aria-label="Link do cardápio"
          value={isUploaded ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          type="url"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          className={FIELD_CLASS}
        />
      ) : (
        <label className="border-border bg-surface/40 hover:border-primary/60 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-4 transition-colors">
          <input
            type="file"
            accept="application/pdf,image/*"
            className="sr-only"
            disabled={busy}
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {isUploaded ? (
            <FilePdfIcon size={22} className="text-primary shrink-0" />
          ) : (
            <UploadSimpleIcon size={22} className="text-muted-foreground shrink-0" />
          )}
          <span className="text-foreground text-sm">
            {busy
              ? 'Enviando…'
              : isUploaded
                ? 'Cardápio enviado. Clique para trocar o arquivo.'
                : 'Clique para escolher o PDF ou a foto do cardápio'}
          </span>
          {isUploaded && !busy ? (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-primary ml-auto text-[13px] font-medium hover:underline"
            >
              Ver
            </a>
          ) : null}
        </label>
      )}

      {error ? <p className="text-destructive text-[13px]">{error}</p> : null}
    </div>
  );
}
