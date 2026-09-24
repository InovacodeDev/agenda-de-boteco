import { Screen, ScreenHeader } from '@agenda/shared-ui-mobile';
import { useRouter } from 'expo-router';

import { EventForm } from '../../../src/components/EventForm';

export default function NewEventScreen() {
  const router = useRouter();

  return (
    <Screen className="bg-background">
      <ScreenHeader
        title="Novo Evento"
        subtitle="Cadastre um novo show ou atração"
        onBack={() => router.back()}
      />
      <EventForm />
    </Screen>
  );
}
