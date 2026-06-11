import type { ReactNode } from 'react';

import { Text, View } from '../../tw';

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
        <Text className="font-body-semibold text-[14px] text-foreground">{title}</Text>
        {trailing ? (
          <Text className="font-body text-[13px] text-muted-foreground">{trailing}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
