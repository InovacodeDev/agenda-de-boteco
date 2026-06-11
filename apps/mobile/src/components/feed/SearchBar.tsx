import { useRouter } from 'expo-router';
import { Search, SlidersHorizontal } from 'lucide-react-native';

import { colors } from '../../theme/colors';
import { Pressable, TextInput, View } from '../../tw';

export interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
}

/** Busca do feed + botão que abre o sheet de filtros */
export function SearchBar({ value, onChangeText }: SearchBarProps) {
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-12 flex-1 flex-row items-center gap-2 rounded-2xl bg-surface-elevated px-4">
        <Search color={colors.mutedForeground} size={18} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Buscar evento, banda ou bar"
          placeholderTextColor={colors.mutedForeground}
          className="h-12 flex-1 font-body text-[14px] text-foreground"
          accessibilityLabel="Buscar evento, banda ou bar"
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir filtros"
        onPress={() => router.push('/filters')}
        className="h-12 w-12 items-center justify-center rounded-2xl bg-surface-elevated active:opacity-80"
      >
        <SlidersHorizontal color={colors.foreground} size={18} />
      </Pressable>
    </View>
  );
}
