import { useState } from 'react';
import { FlatList, Modal, Platform, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from './cn';
import { Icon } from './Icon';
import { KeyboardAvoidingView, Pressable, Text, TextInput, View } from './tw';

const SHEET_PADDING = 20;

export interface SelectOption {
  value: string;
  label: string;
  emoji?: string;
}

export interface SelectFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SelectField({
  value,
  onValueChange,
  options,
  placeholder = 'Selecione…',
  searchable = false,
  searchPlaceholder = 'Buscar opção…',
  disabled = false,
  className,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();

  const selected = options.find((opt) => opt.value === value);

  const filteredOptions = searchable && search.trim()
    ? options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <>
      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={cn(
          'h-12 w-full flex-row items-center justify-between rounded-xl border border-border bg-surface px-3.5 active:opacity-80',
          disabled && 'opacity-50',
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
          {selected ? `${selected.emoji ? `${selected.emoji} ` : ''}${selected.label}` : placeholder}
        </Text>
        <Icon name="caret-down" size={16} color="#a6a6a6" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            className="flex-1 justify-end bg-black/60"
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                className="max-h-[75%] rounded-t-3xl border-t border-border bg-card px-5 pt-5"
                style={{ paddingBottom: insets.bottom + SHEET_PADDING }}
              >
                <View className="mb-4 flex-row items-center justify-between gap-3">
                  <Text className="font-heading text-foreground min-w-0 flex-1 text-lg font-bold">
                    {placeholder}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fechar"
                    onPress={() => setOpen(false)}
                    className="h-11 w-11 items-center justify-center rounded-full bg-surface"
                  >
                    <Icon name="xmark" size={16} color="#a6a6a6" />
                  </Pressable>
                </View>

                {searchable ? (
                  <View className="mb-3 h-11 flex-row items-center rounded-xl border border-border bg-surface px-3">
                    <Icon name="magnifying-glass" size={16} color="#737373" />
                    <TextInput
                      value={search}
                      onChangeText={setSearch}
                      placeholder={searchPlaceholder}
                      placeholderTextColor="#737373"
                      className="font-body text-foreground ml-2 flex-1 text-sm"
                    />
                  </View>
                ) : null}

                <FlatList
                  data={filteredOptions}
                  keyExtractor={(item) => item.value}
                  renderItem={({ item }) => {
                    const isSelected = item.value === value;
                    return (
                      <Pressable
                        onPress={() => {
                          onValueChange(item.value);
                          setOpen(false);
                          setSearch('');
                        }}
                        className={cn(
                          'flex-row items-center justify-between rounded-xl px-3.5 py-3',
                          isSelected ? 'bg-primary/10' : 'active:bg-surface',
                        )}
                      >
                        <Text
                          className={cn(
                            'font-body mr-2 flex-1 text-[15px]',
                            isSelected ? 'text-primary font-body-semibold' : 'text-foreground',
                          )}
                        >
                          {item.emoji ? `${item.emoji} ` : ''}
                          {item.label}
                        </Text>
                        {isSelected ? (
                          <Icon name="check" size={16} color="#1dd75e" weight="bold" />
                        ) : null}
                      </Pressable>
                    );
                  }}
                  ItemSeparatorComponent={() => <View className="h-px bg-border/40" />}
                />
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
