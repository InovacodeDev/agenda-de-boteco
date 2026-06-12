import type { ReactNode } from 'react';

import { Text, View } from '@/tw';
import { cn } from '@/utils/cn';

export interface InfoCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  /** Variante destacada (card "Entrada" com borda e valor verdes) */
  highlight?: boolean;
  className?: string;
}

/** Card de info do detalhe do evento (Data / Horário / Local / Entrada) */
export function InfoCard({ label, value, icon, highlight = false, className }: InfoCardProps) {
  return (
    <View
      className={cn(
        'bg-surface flex-1 rounded-2xl p-4',
        highlight && 'border-primary/40 bg-primary/10 border',
        className,
      )}
    >
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="font-body text-muted-foreground text-[12px]">{label}</Text>
      </View>
      <Text
        className={cn(
          'font-body-semibold mt-1 text-[15px]',
          highlight ? 'text-primary' : 'text-foreground',
        )}
      >
        {value}
      </Text>
    </View>
  );
}
