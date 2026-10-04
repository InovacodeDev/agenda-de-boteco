import type { City } from '@agenda/core';
import {
  Button,
  cn,
  Icon,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  SelectField,
  Text,
  TextInput,
  View,
} from '@agenda/shared-ui-mobile';
import { FlashList } from '@shopify/flash-list';
import { useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHEET_PADDING = 20;

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

const UF_OPTIONS = UFS.map((uf) => ({ value: uf, label: uf }));

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export interface CityComboboxProps {
  cities: City[];
  value: string;
  onSelect: (cityId: string) => void;
  onCreate: (name: string, uf: string) => Promise<void>;
  placeholder?: string;
  className?: string;
}

export function CityCombobox({
  cities,
  value,
  onSelect,
  onCreate,
  placeholder = 'Selecione a cidade…',
  className,
}: CityComboboxProps) {
  const selected = cities.find((city) => city.id === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [uf, setUf] = useState('');
  const [creating, setCreating] = useState(false);
  const insets = useSafeAreaInsets();

  const matches = useMemo(() => {
    const q = normalize(query);
    if (!q) return cities;
    return cities.filter((city) => normalize(city.name).includes(q));
  }, [cities, query]);

  const exact = matches.some((city) => normalize(city.name) === normalize(query));
  const canOfferCreate = query.trim().length >= 2 && !exact;

  const close = () => {
    setOpen(false);
    setQuery('');
    setUf('');
  };

  const handleCreate = async () => {
    if (!uf || creating) return;
    setCreating(true);
    try {
      await onCreate(query.trim(), uf);
      close();
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={cn(
          'h-12 w-full flex-row items-center justify-between rounded-xl border border-border bg-surface px-3.5 active:opacity-80',
          className,
        )}
      >
        <Text
          numberOfLines={1}
          className={cn(
            'font-body mr-2 flex-1 text-[15px]',
            selected ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {selected ? `${selected.name} - ${selected.uf}` : placeholder}
        </Text>
        <Icon name="caret-down" size={16} color="#a6a6a6" />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/60"
        >
          <View
            className="max-h-[80%] rounded-t-3xl border-t border-border bg-card px-5 pt-5"
            style={{ paddingBottom: insets.bottom + SHEET_PADDING }}
          >
            <View className="mb-4 flex-row items-center justify-between gap-3">
              <Text className="font-heading text-foreground min-w-0 flex-1 text-lg font-bold">
                Cidade
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                onPress={close}
                className="h-11 w-11 items-center justify-center rounded-full bg-surface"
              >
                <Icon name="xmark" size={16} color="#a6a6a6" />
              </Pressable>
            </View>

            <View className="mb-3 h-11 flex-row items-center rounded-xl border border-border bg-surface px-3">
              <Icon name="magnifying-glass" size={16} color="#737373" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="São Paulo"
                containerClassName="flex-1 border-0 bg-transparent h-auto px-0"
                className="ml-2"
              />
            </View>

            <View style={{ maxHeight: 280 }}>
              <FlashList
                data={matches}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      onSelect(item.id);
                      close();
                    }}
                    className="flex-row items-center justify-between rounded-lg px-3.5 py-3 active:bg-surface"
                  >
                    <Text className="font-body text-foreground mr-3 min-w-0 flex-1 text-[15px]">
                      {item.name}
                    </Text>
                    <Text className="font-body text-muted-foreground shrink-0 text-xs">{item.uf}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  canOfferCreate ? null : (
                    <Text className="font-body text-muted-foreground px-3 py-2 text-[13px]">
                      Nenhuma cidade encontrada.
                    </Text>
                  )
                }
              />
            </View>

            {canOfferCreate ? (
              <View className="mt-2 flex-col gap-2 border-t border-border pt-3">
                <Text className="font-body text-muted-foreground text-[13px]">
                  Cadastrar <Text className="text-foreground">{query.trim()}</Text> — escolha o
                  estado:
                </Text>
                <View className="flex-row gap-2">
                  <SelectField
                    value={uf}
                    onValueChange={setUf}
                    options={UF_OPTIONS}
                    placeholder="UF"
                    className="w-24"
                  />
                  <Button
                    label={creating ? 'Cadastrando…' : 'Cadastrar cidade'}
                    variant="solid"
                    disabled={!uf}
                    busy={creating}
                    onPress={() => void handleCreate()}
                    className="flex-1"
                  />
                </View>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
