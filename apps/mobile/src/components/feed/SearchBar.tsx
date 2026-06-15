import { useRouter } from 'expo-router';

import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';
import { TextInput, View } from '@/tw';

export interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
}

/** Busca do feed + botão que abre o sheet de filtros */
export function SearchBar({ value, onChangeText }: SearchBarProps) {
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
        accessibilityLabel="Abrir filtros"
        onPress={() => router.push('/filters')}
        className="bg-surface-elevated h-12 w-12 items-center justify-center rounded-2xl active:opacity-80"
      >
        <Icon name="sliders" color={colors.foreground} size={18} />
      </GuardedPressable>
    </View>
  );
}
