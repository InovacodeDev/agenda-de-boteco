import { useEffect } from 'react';

import { recordMetricEvent } from '../services/metrics';

/**
 * Janela de debounce local: evita reenviar a mesma view ao navegar de ida e
 * volta rápido para a mesma tela. Estado de módulo (não React state) porque
 * precisa sobreviver a montagem/desmontagem do componente, não só a re-renders.
 */
const VIEW_DEBOUNCE_MS = 30 * 60 * 1000;
const lastViewedAt = new Map<string, number>();

export interface UseRecordViewInput {
  establishmentId: string | undefined;
  eventId?: string;
}

/** Registra uma `view` de evento ou estabelecimento uma vez por janela de debounce. */
export function useRecordView({ establishmentId, eventId }: UseRecordViewInput): void {
  const key = establishmentId ? `${establishmentId}:${eventId ?? ''}` : null;

  useEffect(() => {
    if (!key || !establishmentId) {
      return;
    }
    const now = Date.now();
    const last = lastViewedAt.get(key);
    if (last !== undefined && now - last < VIEW_DEBOUNCE_MS) {
      return;
    }
    lastViewedAt.set(key, now);
    void recordMetricEvent({ establishmentId, eventId, kind: 'view' });
  }, [key, establishmentId, eventId]);
}
