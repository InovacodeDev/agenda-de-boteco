import { catalogKeys, getEvent } from '@agenda/core';
import { Screen, ScreenHeader, Text, View } from '@agenda/shared-ui-mobile';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { EventForm } from '@/components/EventForm';

export default function EditEventScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: event, isPending } = useQuery({
    queryKey: catalogKeys.events.detail(id ?? ''),
    queryFn: () => getEvent(id ?? ''),
    enabled: Boolean(id),
  });

  return (
    <Screen className="bg-background">
      <ScreenHeader
        title="Editar Evento"
        subtitle={event?.name ?? 'Carregando…'}
        onBack={() => router.back()}
      />
      {isPending ? (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color="#1dd75e" />
          <Text className="font-body text-muted-foreground mt-3 text-sm">
            Carregando dados do evento…
          </Text>
        </View>
      ) : event ? (
        <EventForm event={event} />
      ) : (
        <View className="flex-1 items-center justify-center p-8">
          <Text className="font-body text-muted-foreground text-sm">
            Evento não encontrado.
          </Text>
        </View>
      )}
    </Screen>
  );
}
