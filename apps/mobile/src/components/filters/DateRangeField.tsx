import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';

import { GuardedPressable } from '@/components/ui/GuardedPressable';
import { Text, View } from '@/tw';

interface DateRangeFieldProps {
  value: { start: string; end: string } | null;
  onChange: (range: { start: string; end: string } | null) => void;
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DateRangeField({ value, onChange }: DateRangeFieldProps) {
  const [picking, setPicking] = useState<'start' | 'end' | null>(null);
  const start = value?.start ?? '';
  const end = value?.end ?? '';

  const handlePicked = (which: 'start' | 'end', date?: Date) => {
    setPicking(null);
    if (!date) return;
    const iso = toISODate(date);
    const next = {
      start: which === 'start' ? iso : start || iso,
      end: which === 'end' ? iso : end || iso,
    };
    if (next.start > next.end) {
      onChange({ start: next.end, end: next.start });
    } else {
      onChange(next);
    }
  };

  return (
    <View className="flex-row gap-3">
      <GuardedPressable
        accessibilityRole="button"
        accessibilityLabel="Data inicial"
        onPress={() => setPicking('start')}
        className="bg-card flex-1 rounded-xl px-3 py-3"
      >
        <Text className="font-body text-foreground text-[14px]">{start || 'De'}</Text>
      </GuardedPressable>
      <GuardedPressable
        accessibilityRole="button"
        accessibilityLabel="Data final"
        onPress={() => setPicking('end')}
        className="bg-card flex-1 rounded-xl px-3 py-3"
      >
        <Text className="font-body text-foreground text-[14px]">{end || 'Até'}</Text>
      </GuardedPressable>

      {picking ? (
        <DateTimePicker
          mode="date"
          // 'default' abre modal compacto no iOS (confirma com toque fora) e o
          // seletor padrão no Android — ambos disparam onChange apenas na
          // confirmação final, evitando o fechamento prematuro do 'inline' no iOS.
          display="default"
          value={
            picking === 'start' && start
              ? new Date(`${start}T00:00:00`)
              : picking === 'end' && end
                ? new Date(`${end}T00:00:00`)
                : new Date()
          }
          onChange={(_event, date) => handlePicked(picking, date)}
        />
      ) : null}
    </View>
  );
}
