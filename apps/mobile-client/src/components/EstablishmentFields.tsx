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
  normalizeText,
  pathFromPublicUrl,
  PRICE_RANGE_LABELS,
  type PriceRange,
  priceRangeSchema,
  uploadImage,
} from '@agenda/core';
import {
  cn,
  Field,
  ImagePickerField,
  Pressable,
  SelectField,
  Text,
  TextArea,
  TextInput,
  View,
} from '@agenda/shared-ui-mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { AttributeAutocomplete } from './AttributeAutocomplete';
import { CityCombobox } from './CityCombobox';
import { OpeningHoursGrid } from './OpeningHoursGrid';

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

/** Ambientes separados por ", " — mesmo formato TEXT que o web-client grava. */
const AMBIANCE_SEPARATOR = ', ';

const NO_PRICE_RANGE = 'none';

const PRICE_RANGE_OPTIONS = [
  { value: NO_PRICE_RANGE, label: 'Não definido' },
  ...Object.entries(PRICE_RANGE_LABELS).map(([value, label]) => ({ value, label })),
];

const MENU_PATH_PREFIX = 'establishments/menus';

type CepNotice = { tone: 'muted' | 'success' | 'error'; message: string };

const CEP_HINT: CepNotice = {
  tone: 'muted',
  message: 'Digite o CEP e preenchemos rua, bairro e cidade para você.',
};

const CEP_TONE_CLASS: Record<CepNotice['tone'], string> = {
  muted: 'text-muted-foreground',
  success: 'text-primary',
  error: 'text-destructive',
};

type Setter = <K extends keyof EstablishmentDraft>(key: K, value: EstablishmentDraft[K]) => void;

export interface FieldGroupProps {
  draft: EstablishmentDraft;
  set: Setter;
  onUpload: (blob: Blob) => Promise<string>;
  onError?: (message: string) => void;
}

/** Logo, capa, nome e descrição. */
export function IdentityFields({ draft, set, onUpload }: FieldGroupProps) {
  return (
    <View className="flex-col gap-5">
      <ImagePickerField
        label="Logotipo do Bar"
        value={draft.logoUrl}
        onChange={(url) => set('logoUrl', url)}
        onUpload={onUpload}
        aspect={[1, 1]}
      />

      <ImagePickerField
        label="Foto de Capa do Perfil"
        value={draft.coverUrl}
        onChange={(url) => set('coverUrl', url)}
        onUpload={onUpload}
        aspect={[16, 9]}
      />

      <Field label="Nome do Estabelecimento" required>
        <TextInput
          value={draft.name}
          onChangeText={(value) => set('name', value)}
          placeholder="Bar do Zé"
        />
      </Field>

      <Field label="Descrição da Casa">
        <TextArea
          value={draft.description}
          onChangeText={(value) => set('description', value)}
          placeholder="Conta a história do seu boteco…"
          rows={3}
        />
      </Field>
    </View>
  );
}

/** Endereço, cidade, bairro e canais de contato. */
export function LocationFields({ draft, set, onError }: FieldGroupProps) {
  const queryClient = useQueryClient();
  const [cep, setCep] = useState('');
  const [cepNotice, setCepNotice] = useState<CepNotice>(CEP_HINT);

  const { data: cities = [] } = useQuery({
    queryKey: catalogKeys.cities,
    queryFn: () => listCities(),
  });

  const handleCreateCity = async (name: string, uf: string) => {
    try {
      const cityId = await createCityFromPanel(name, uf);
      await queryClient.invalidateQueries({ queryKey: catalogKeys.cities });
      set('cityId', cityId);
    } catch (error: unknown) {
      onError?.(getFriendlyErrorMessage(error));
    }
  };

  /** CEP só sugere rua, bairro e cidade; não é gravado (a tabela não tem a coluna). */
  const handleCep = async (value: string) => {
    const masked = maskCEP(value);
    setCep(masked);
    setCepNotice(CEP_HINT);
    if (masked.replace(/\D/g, '').length !== 8) return;

    setCepNotice({ tone: 'muted', message: 'Buscando endereço…' });
    try {
      const found = await lookupCep(masked);
      if (!found) {
        setCepNotice({
          tone: 'error',
          message: 'CEP não encontrado. Confira os números ou preencha o endereço abaixo.',
        });
        return;
      }
      setCepNotice({
        tone: 'success',
        message: 'Endereço encontrado. Complete com o número do local.',
      });
      if (found.street) set('address', `${found.street}, `);
      if (found.neighborhood) set('neighborhood', found.neighborhood);
      const city = cities.find(
        (item) => item.uf === found.uf && normalizeText(item.name) === normalizeText(found.city),
      );
      if (city) {
        set('cityId', city.id);
      } else {
        await handleCreateCity(found.city, found.uf);
      }
    } catch (error: unknown) {
      setCepNotice({ tone: 'error', message: getFriendlyErrorMessage(error) });
    }
  };

  return (
    <View className="flex-col gap-5">
      <Field label="CEP">
        <TextInput
          keyboardType="number-pad"
          value={cep}
          onChangeText={(value) => void handleCep(value)}
          placeholder="00000-000"
        />
        <Text className={`font-body mt-1.5 text-xs ${CEP_TONE_CLASS[cepNotice.tone]}`}>
          {cepNotice.message}
        </Text>
      </Field>

      <Field label="Cidade" required>
        <CityCombobox
          cities={cities}
          value={draft.cityId}
          onSelect={(cityId) => set('cityId', cityId)}
          onCreate={handleCreateCity}
        />
      </Field>

      <Field label="Bairro">
        <TextInput
          value={draft.neighborhood}
          onChangeText={(value) => set('neighborhood', value)}
          placeholder="Vila Madalena"
        />
      </Field>

      <Field label="Endereço completo">
        <TextInput
          value={draft.address}
          onChangeText={(value) => set('address', value)}
          placeholder="Rua, número"
        />
      </Field>

      <Field label="WhatsApp">
        <TextInput
          keyboardType="phone-pad"
          value={draft.whatsapp}
          onChangeText={(value) => set('whatsapp', maskPhoneBR(value))}
          placeholder="(11) 99999-9999"
        />
      </Field>

      <Field label="Instagram">
        <TextInput
          autoCapitalize="none"
          value={draft.instagram}
          onChangeText={(value) => set('instagram', value)}
          placeholder="@bardoze"
        />
      </Field>
    </View>
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
    <View className="flex-col gap-5">
      <Field label="Horário de funcionamento">
        <OpeningHoursGrid
          value={draft.openingHours}
          onChange={(value) => set('openingHours', value)}
        />
      </Field>

      <Field label="Faixa de preço">
        <SelectField
          value={draft.priceRange || NO_PRICE_RANGE}
          onValueChange={(value) => {
            const parsed = priceRangeSchema.safeParse(value);
            set('priceRange', parsed.success ? parsed.data : '');
          }}
          options={PRICE_RANGE_OPTIONS}
          placeholder="Selecione"
        />
      </Field>

      <Field label="Tipo de ambiente (marque quantos quiser)">
        <View className="flex-row flex-wrap gap-2">
          {AMBIANCES.map((item) => {
            const selected = selectedAmbiances.includes(item);
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => toggleAmbiance(item)}
                className={cn(
                  'min-h-10 justify-center rounded-full border px-4 py-2',
                  selected ? 'border-primary bg-primary' : 'border-border bg-surface',
                )}
              >
                <Text
                  className={cn(
                    'font-body text-sm',
                    selected ? 'font-body-medium text-primary-foreground' : 'text-foreground',
                  )}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <MenuField value={draft.menuUrl} onChange={(url) => set('menuUrl', url)} />

      <Field label="Diferenciais do local">
        <AttributeAutocomplete
          value={draft.attributes}
          onChange={(attributes) => set('attributes', attributes)}
        />
      </Field>
    </View>
  );
}

const uploadMenuImage = (blob: Blob) => uploadImage(blob, { pathPrefix: MENU_PATH_PREFIX });

/**
 * Cardápio por link externo ou por foto no bucket; ambos gravam uma URL em
 * `menu_pdf_url`. Foto enviada substitui (e apaga) a anterior; PDF só no web.
 */
function MenuField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const isUploaded = pathFromPublicUrl(value) !== null;

  const handlePhoto = (url: string) => {
    if (isUploaded) {
      void deleteImage(value).catch(() => undefined);
    }
    onChange(url);
  };

  return (
    <View className="flex-col gap-3">
      <Field label="Link do cardápio">
        <TextInput
          autoCapitalize="none"
          keyboardType="url"
          value={isUploaded ? '' : value}
          onChangeText={onChange}
          placeholder="https://..."
        />
      </Field>

      <ImagePickerField
        label="Ou envie uma foto do cardápio"
        value={isUploaded ? value : ''}
        onChange={handlePhoto}
        onUpload={uploadMenuImage}
        aspect={[3, 4]}
      />
    </View>
  );
}
