import { useRouter } from 'expo-router';

import type { Event, MusicStyle } from '../../data/schemas';
import { Image, Text, View } from '../../tw';
import { formatRelativeDay, formatTime } from '../../utils/dates';
import { formatPrice } from '../../utils/format';
import { GuardedPressable } from '../ui/GuardedPressable';

export interface AgendaItemProps {
  event: Event;
  styles: MusicStyle[];
}

/** Linha da tab Agenda do estabelecimento (thumb + estilos + nome + data·hora·preço) */
export function AgendaItem({ event, styles }: AgendaItemProps) {
  const router = useRouter();
  return (
    <GuardedPressable
      accessibilityRole="button"
      accessibilityLabel={`Evento ${event.name}`}
      onPress={() => router.push(`/event/${event.id}`)}
      className="flex-row gap-3 rounded-2xl bg-card p-3 active:opacity-90"
    >
      <Image
        source={{ uri: event.banner_url }}
        recyclingKey={event.id}
        contentFit="cover"
        className="h-14 w-14 rounded-xl"
        accessibilityLabel={event.name}
      />
      <View className="flex-1 justify-center gap-0.5">
        <Text className="font-body text-[11px] text-muted-foreground">
          {styles.map((style) => style.name).join(' ')}
        </Text>
        <Text className="font-body-semibold text-[15px] text-foreground" numberOfLines={1}>
          {event.name}
        </Text>
        <Text className="font-body text-[12px] text-muted-foreground">
          {formatRelativeDay(event.starts_at)} · {formatTime(event.starts_at)} ·{' '}
          {formatPrice(event.cover_charge)}
        </Text>
      </View>
    </GuardedPressable>
  );
}
