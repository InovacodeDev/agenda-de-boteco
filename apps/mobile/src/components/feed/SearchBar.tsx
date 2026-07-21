import { useRouter } from 'expo-router';

import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';
import { TextInput, View } from '@/tw';

export interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  /** Exibe um ponto no botão de filtros quando há filtro ativo. */
  hasFilters?: boolean;
}

/** Busca do feed + botão que abre o sheet de filtros */
export function SearchBar({ value, onChangeText, hasFilters = false }: SearchBarProps) {
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-3">
      <View className="bg-surface-elevated h-12 flex-1 flex-row items-center gap-2 rounded-2xl px-4">
        <Icon name="magnifying-glass" color={colors.mutedForeground} size={18} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Buscar evento, banda ou bar"
          placeholderTextColor={colors.mutedForeground}
          className="font-body text-foreground h-12 flex-1 text-[14px]"
          accessibilityLabel="Buscar evento, banda ou bar"
        />
      </View>
      <GuardedPressable
        accessibilityRole="button"
        accessibilityLabel={hasFilters ? 'Abrir filtros (filtros ativos)' : 'Abrir filtros'}
        onPress={() => router.push('/filters')}
        className="bg-surface-elevated h-12 w-12 items-center justify-center rounded-2xl active:opacity-80"
      >
        <Icon name="sliders" color={colors.foreground} size={18} />
        {hasFilters ? (
          <View
            className="bg-primary border-surface-elevated absolute right-2 top-2 h-3 w-3 rounded-full border-2"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : null}
      </GuardedPressable>
    </View>
  );
}
