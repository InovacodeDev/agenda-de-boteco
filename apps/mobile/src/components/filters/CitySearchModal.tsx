import type { City } from '@agenda/core';
import { useMemo, useRef, useState } from 'react';
import { Modal, type TextInput as RNTextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Icon } from '@/components/ui/Icon';
import { useCitiesQuery } from '@/hooks/queries';
import { colors } from '@/theme/colors';
import { ScrollView, Text, TextInput, View } from '@/tw';
import { normalizeText } from '@/utils/filters';

export interface CitySearchModalProps {
  visible: boolean;
  initialSelected: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}

export function CitySearchModal({
  visible,
  initialSelected,
  onClose,
  onConfirm,
}: CitySearchModalProps) {
  const insets = useSafeAreaInsets();
  const { data: cities } = useCitiesQuery();
  const inputRef = useRef<RNTextInput>(null);

  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [query, setQuery] = useState('');
  // Re-semeia o rascunho na transição fechado → aberto (adjusting state during
  // render, conforme a doc do React — evita efeito em cascata).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setSelected(initialSelected);
      setQuery('');
    }
  }

  const toggle = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );

  const results = useMemo(() => {
    const q = normalizeText(query.trim());
    const list = cities ?? [];
    if (!q) return list;
    return list.filter((c) => normalizeText(`${c.name} ${c.uf}`).includes(q));
  }, [cities, query]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      // autoFocus não sobrevive à animação de slide no Android (o Dialog nativo
      // só aceita foco depois de apresentado). onShow é o gancho do próprio RN.
      onShow={() => inputRef.current?.focus()}
    >
      <View className="flex-1 justify-end bg-black/50">
        <GuardedPressable
          accessibilityRole="button"
          accessibilityLabel="Fechar busca de cidade"
          onPress={onClose}
          className="flex-1"
        />
        <View className="bg-popover h-[92%] overflow-hidden rounded-t-3xl">
          <View className="items-center pt-2.5 pb-1">
            <View className="bg-muted-foreground/40 h-1 w-9 rounded-full" />
          </View>
          <ScreenHeader
            title="Buscar cidade"
            right={
              <GuardedPressable
                accessibilityRole="button"
                accessibilityLabel="Fechar busca de cidade"
                onPress={onClose}
                hitSlop={8}
                className="active:opacity-80"
              >
                <Icon name="xmark" color={colors.mutedForeground} size={20} />
              </GuardedPressable>
            }
          />
          <View className="px-5 pt-2">
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Digite o nome da cidade"
              placeholderTextColor={colors.mutedForeground}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              className="bg-card text-foreground font-body h-12 rounded-2xl px-4 text-[14px]"
            />
          </View>
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-3 px-5 pb-5 pt-4"
            keyboardShouldPersistTaps="handled"
          >
            {results.map((city: City) => {
              const isSelected = selected.includes(city.id);
              return (
                <GuardedPressable
                  key={city.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => toggle(city.id)}
                  className="bg-card flex-row items-center justify-between rounded-2xl px-4 py-3.5 active:opacity-80"
                >
                  <View>
                    <Text className="font-body-semibold text-foreground text-[15px]">
                      {city.name}
                    </Text>
                    <Text className="font-body text-muted-foreground text-[12px]">{city.uf}</Text>
                  </View>
                  {isSelected ? <Icon name="check" color={colors.primary} size={18} /> : null}
                </GuardedPressable>
              );
            })}
            {results.length === 0 ? (
              <Text className="font-body text-muted-foreground text-center text-[13px]">
                Nenhuma cidade encontrada.
              </Text>
            ) : null}
          </ScrollView>
          <View
            className="bg-popover px-5 pt-4 pb-4"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <Button
              label="Confirmar"
              onPress={() => onConfirm(selected)}
              fullWidth
              style={{ backgroundColor: colors.primary }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
