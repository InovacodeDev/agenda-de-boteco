import { Screen, ScreenHeader } from '@agenda/shared-ui-mobile';
import { useRouter } from 'expo-router';

import { EventForm } from '../../../src/components/EventForm';

export default function NewEventScreen() {
  const router = useRouter();

  return (
    <Screen noTopInset noBottomInset>
      <ScreenHeader
        title="Novo evento"
        subtitle="Rascunhos ficam só para você; eventos publicados aparecem no app dos usuários."
        onBack={() => router.back()}
      />
      <EventForm />
    </Screen>
  );
}
