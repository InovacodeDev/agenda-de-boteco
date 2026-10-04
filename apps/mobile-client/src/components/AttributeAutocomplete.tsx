import {
  ESTABLISHMENT_ATTRIBUTES,
  type EstablishmentAttribute,
  getAttributeMeta,
} from '@agenda/core';
import { cn, Icon, Modal, Pressable, Text, TextInput, View } from '@agenda/shared-ui-mobile';
import { FlashList } from '@shopify/flash-list';
import { useMemo, useState } from 'react';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export interface AttributeAutocompleteProps {
  value: EstablishmentAttribute[];
  onChange: (next: EstablishmentAttribute[]) => void;
  className?: string;
}

export function AttributeAutocomplete({ value, onChange, className }: AttributeAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const available = useMemo(() => {
    const q = normalize(query);
    return ESTABLISHMENT_ATTRIBUTES.filter(
      (attr) => !value.includes(attr.id) && (!q || normalize(attr.label).includes(q)),
    );
  }, [query, value]);

  const add = (id: EstablishmentAttribute) => {
    onChange([...value, id]);
    setQuery('');
  };

  const remove = (id: EstablishmentAttribute) => onChange(value.filter((item) => item !== id));

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className={cn(
          'min-h-12 w-full flex-row flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 active:opacity-80',
          className,
        )}
      >
        {value.length === 0 ? (
          <Text className="font-body text-muted-foreground text-[15px]">
            Busque e selecione os diferenciais
          </Text>
        ) : (
          value.map((id) => {
            const meta = getAttributeMeta(id);
            return (
              <View
                key={id}
                className="flex-row items-center gap-1.5 rounded-full bg-primary py-1 pl-2.5 pr-1.5"
              >
                <Icon name={meta.icon} size={14} color="#0f0f0f" />
                <Text className="font-body-medium text-primary-foreground text-xs">
                  {meta.label}
                </Text>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    remove(id);
                  }}
                  className="rounded-full p-0.5"
                >
                  <Icon name="xmark" size={12} color="#0f0f0f" weight="bold" />
                </Pressable>
              </View>
            );
          })
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="max-h-[80%] rounded-t-3xl border-t border-border bg-card p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="font-heading text-foreground text-lg font-bold">Diferenciais</Text>
              <Pressable
                onPress={() => setOpen(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-surface"
              >
                <Icon name="xmark" size={16} color="#a6a6a6" />
              </Pressable>
            </View>

            <View className="mb-3 h-10 flex-row items-center rounded-xl border border-border bg-surface px-3">
              <Icon name="magnifying-glass" size={16} color="#737373" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar diferencial…"
                containerClassName="flex-1 border-0 bg-transparent h-auto px-0"
                className="ml-2"
              />
            </View>

            <View style={{ maxHeight: 280 }}>
              <FlashList
                data={available}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => add(item.id)}
                    className="flex-row items-center gap-2 rounded-lg px-3.5 py-3 active:bg-surface"
                  >
                    <Icon name={item.icon} size={18} color="#a6a6a6" />
                    <Text className="font-body text-foreground text-[15px]">{item.label}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text className="font-body text-muted-foreground px-3 py-2 text-[13px]">
                    {value.length === ESTABLISHMENT_ATTRIBUTES.length
                      ? 'Todos os diferenciais já foram selecionados.'
                      : 'Nenhum diferencial encontrado.'}
                  </Text>
                }
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
