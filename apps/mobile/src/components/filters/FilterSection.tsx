import type { ReactNode } from 'react';

import { Text, View } from '@/tw';

export interface FilterSectionProps {
  title: string;
  /** Valor exibido à direita do título (ex: "50 km", "Sem limite") */
  trailing?: string;
  children: ReactNode;
}

/** Seção do sheet de filtros: título semibold + conteúdo */
export function FilterSection({ title, trailing, children }: FilterSectionProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-body-semibold text-foreground text-[14px]">{title}</Text>
        {trailing ? (
          <Text className="font-body text-muted-foreground text-[13px]">{trailing}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
