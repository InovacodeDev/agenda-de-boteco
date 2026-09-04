import { trackEvent } from '@agenda/core';
import { useEffect } from 'react';

import { UnderConstruction } from '@/components/feedback/UnderConstruction';
import { Icon } from '@/components/ui/Icon';
import { FEATURES } from '@/config/features';
import { MapScreen } from '@/screens/map/MapScreen';
import { colors } from '@/theme/colors';

export default function MapTab() {
  useEffect(() => {
    trackEvent('map_opened');
  }, []);

  if (!FEATURES.map) {
    return (
      <UnderConstruction
        isTab
        version="v4"
        icon={<Icon name="location-dot" color={colors.primary} size={36} />}
        title="O mapa da noite está sendo desenhado"
        description="Em breve você vê todos os rolês perto de você num mapa só, com a rota certinha até a mesa. Vem na v4 — até lá, o feed te guia pela cidade."
      />
    );
  }
  return <MapScreen />;
}
