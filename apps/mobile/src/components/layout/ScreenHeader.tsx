import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { colors } from '../../theme/colors';
import { headingLetterSpacing } from '../../theme/typography';
import { Text, View } from '../../tw';
import { CircleIconButton } from '../ui/CircleIconButton';

export interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
}

/** Cabeçalho de tela com título Space Grotesk e voltar opcional */
export function ScreenHeader({ title, showBack = false }: ScreenHeaderProps) {
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      {showBack ? (
        <CircleIconButton
          accessibilityLabel="Voltar"
          icon={<ArrowLeft color={colors.foreground} size={20} />}
          onPress={() => router.back()}
          className="bg-surface"
        />
      ) : null}
      <Text
        className="font-heading text-[24px] text-foreground"
        style={{ letterSpacing: headingLetterSpacing(24) }}
      >
        {title}
      </Text>
    </View>
  );
}
