import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';

import { colors } from '../../theme/colors';
import { headingLetterSpacing } from '../../theme/typography';
import { Text, View } from '../../tw';
import { CircleIconButton } from '../ui/CircleIconButton';

export interface ScreenHeaderProps {
  title?: string;
  showBack?: boolean;
  /** Ações à direita (compartilhar, favoritar, fechar…) */
  right?: ReactNode;
  /** Conteúdo customizado no lugar do título */
  children?: ReactNode;
}

/** Cabeçalho fixo de tela: voltar + título (ou conteúdo custom) + ações à direita */
export function ScreenHeader({ title, showBack = false, right, children }: ScreenHeaderProps) {
  const router = useRouter();
  return (
    <View className="min-h-14 flex-row items-center gap-3 px-4 py-2">
      {showBack ? (
        <CircleIconButton
          accessibilityLabel="Voltar"
          icon={<ArrowLeft color={colors.foreground} size={20} />}
          onPress={() => router.back()}
          className="bg-surface"
        />
      ) : null}
      <View className="flex-1">
        {children ??
          (title ? (
            <Text
              className="font-heading text-[24px] text-foreground"
              numberOfLines={1}
              style={{ letterSpacing: headingLetterSpacing(24) }}
            >
              {title}
            </Text>
          ) : null)}
      </View>
      {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
    </View>
  );
}
