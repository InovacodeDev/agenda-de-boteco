import type { EstablishmentAttribute, EstablishmentAttributeMeta } from '@agenda/core';
import { useMemo, useRef, useState } from 'react';
import { Modal, type TextInput as RNTextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Button } from '@/components/ui/Button';
import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Icon } from '@/components/ui/Icon';
import { isIconName } from '@/components/ui/iconMap';
import { ESTABLISHMENT_ATTRIBUTES } from '@/data/lookup';
import { colors } from '@/theme/colors';
import { ScrollView, Text, TextInput, View } from '@/tw';
import { normalizeText } from '@/utils/filters';

export interface AttributeSearchModalProps {
  visible: boolean;
  initialSelected: EstablishmentAttribute[];
  onClose: () => void;
  onConfirm: (ids: EstablishmentAttribute[]) => void;
}

export function AttributeSearchModal({
  visible,
  initialSelected,
  onClose,
  onConfirm,
}: AttributeSearchModalProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<RNTextInput>(null);

  const [selected, setSelected] = useState<EstablishmentAttribute[]>(initialSelected);
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

  const toggle = (id: EstablishmentAttribute) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((a) => a !== id) : [...current, id],
    );

  const results = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) return ESTABLISHMENT_ATTRIBUTES;
    // Busca na descrição também: quem não conhece o rótulo ("Counter service")
    // acha pelo que o atributo significa.
    return ESTABLISHMENT_ATTRIBUTES.filter((attr) =>
      normalizeText(`${attr.label} ${attr.description}`).includes(q),
    );
  }, [query]);

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
          accessibilityLabel="Fechar busca de atributo"
          onPress={onClose}
          className="flex-1"
        />
        <View className="bg-popover h-[92%] overflow-hidden rounded-t-3xl">
          <View className="items-center pt-2.5 pb-1">
            <View className="bg-muted-foreground/40 h-1 w-9 rounded-full" />
          </View>
          <ScreenHeader
            title="Buscar atributo"
            right={
              <GuardedPressable
                accessibilityRole="button"
                accessibilityLabel="Fechar busca de atributo"
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
              placeholder="Digite o nome do atributo"
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
            {results.map((attr: EstablishmentAttributeMeta) => {
              const isSelected = selected.includes(attr.id);
              return (
                <GuardedPressable
                  key={attr.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${attr.label}. ${attr.description}`}
                  onPress={() => toggle(attr.id)}
                  className="bg-card flex-row items-center gap-3 rounded-2xl px-4 py-3.5 active:opacity-80"
                >
                  {isIconName(attr.icon) ? (
                    <Icon name={attr.icon} color={colors.primary} size={18} />
                  ) : null}
                  <View className="flex-1">
                    <Text className="font-body-semibold text-foreground text-[15px]">
                      {attr.label}
                    </Text>
                    <Text
                      className="font-body text-muted-foreground text-[12px]"
                      numberOfLines={2}
                    >
                      {attr.description}
                    </Text>
                  </View>
                  {isSelected ? <Icon name="check" color={colors.primary} size={18} /> : null}
                </GuardedPressable>
              );
            })}
            {results.length === 0 ? (
              <Text className="font-body text-muted-foreground text-center text-[13px]">
                Nenhum atributo encontrado.
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
