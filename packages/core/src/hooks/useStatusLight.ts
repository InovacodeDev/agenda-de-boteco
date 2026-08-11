import { useEffect, useState } from 'react';

import {
  establishmentStatusLight,
  eventStatusLight,
  type StatusLight,
} from '../utils/status-light';

/** O selo é granular em minutos; um tick por minuto basta e é barato. */
const TICK_MS = 60_000;

/**
 * Relógio compartilhado: um único intervalo para todos os cards da lista,
 * em vez de um timer por card. Sem assinantes, o intervalo nem existe.
 */
let sharedNow = new Date();
const subscribers = new Set<(now: Date) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: (now: Date) => void): () => void {
  subscribers.add(listener);
  if (timer === null) {
    timer = setInterval(() => {
      sharedNow = new Date();
      for (const notify of subscribers) notify(sharedNow);
    }, TICK_MS);
  }
  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function useSharedNow(): Date {
  const [now, setNow] = useState(sharedNow);
  useEffect(() => subscribe(setNow), []);
  return now;
}

/** Semáforo do evento, recalculado a cada minuto. */
export function useEventStatusLight(startsAt: string, endsAt: string): StatusLight | null {
  const now = useSharedNow();
  return eventStatusLight(startsAt, endsAt, now);
}

/** Semáforo do estabelecimento, recalculado a cada minuto. */
export function useEstablishmentStatusLight(openingHours: string): StatusLight | null {
  const now = useSharedNow();
  return establishmentStatusLight(openingHours, now);
}
