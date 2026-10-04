import {
  catalogKeys,
  createCityFromPanel,
  type EstablishmentAttribute,
  getFriendlyErrorMessage,
  listCities,
  maskPhoneBR,
  PRICE_RANGE_LABELS,
} from '@agenda/core';
import { Field, ImagePickerField, SelectField, TextArea, TextInput, View } from '@agenda/shared-ui-mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { AttributeAutocomplete } from './AttributeAutocomplete';
import { CityCombobox } from './CityCombobox';

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

const AMBIANCE_OPTIONS = AMBIANCES.map((item) => ({ value: item, label: item }));

const PRICE_RANGE_OPTIONS = Object.entries(PRICE_RANGE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

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

  return (
    <View className="flex-col gap-5">
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
  return (
    <View className="flex-col gap-5">
      <Field label="Horário de funcionamento">
        <TextInput
          value={draft.openingHours}
          onChangeText={(value) => set('openingHours', value)}
          placeholder="Seg a Sáb, 18h às 02h"
        />
      </Field>

      <Field label="Faixa de preço">
        <SelectField
          value={draft.priceRange}
          onValueChange={(value) => set('priceRange', value)}
          options={PRICE_RANGE_OPTIONS}
          placeholder="Selecione"
        />
      </Field>

      <Field label="Tipo de ambiente">
        <SelectField
          value={draft.ambiance}
          onValueChange={(value) => set('ambiance', value)}
          options={AMBIANCE_OPTIONS}
          placeholder="Selecione"
        />
      </Field>

      <Field label="Link do cardápio">
        <TextInput
          autoCapitalize="none"
          keyboardType="url"
          value={draft.menuUrl}
          onChangeText={(value) => set('menuUrl', value)}
          placeholder="https://..."
        />
      </Field>

      <Field label="Diferenciais do local">
        <AttributeAutocomplete
          value={draft.attributes}
          onChange={(attributes) => set('attributes', attributes)}
        />
      </Field>
    </View>
  );
}
