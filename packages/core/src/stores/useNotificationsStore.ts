import { z } from 'zod';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { PERSISTED_STORE_VERSION } from '../config/stores';
import { appJsonStorage, registerRehydrator } from '../platform/storage';

export interface NotificationsState {
  readIds: string[];
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
}

type NotificationsPersistedState = Pick<NotificationsState, 'readIds'>;

const DEFAULT_NOTIFICATIONS_PERSISTED: NotificationsPersistedState = {
  readIds: [],
};

const notificationsPersistedSchema = z.object({
  readIds: z.array(z.string()),
});

function migrateNotificationsState(
  persisted: unknown,
  fromVersion: number,
): NotificationsPersistedState {
  if (fromVersion === 0) {
    const parsed = notificationsPersistedSchema.safeParse(persisted);
    if (parsed.success) {
      return parsed.data;
    }
  }
  return DEFAULT_NOTIFICATIONS_PERSISTED;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      readIds: [],
      markRead: (id) =>
        set((state) =>
          state.readIds.includes(id) ? state : { readIds: [...state.readIds, id] },
        ),
      markAllRead: (ids) =>
        set((state) => ({
          readIds: Array.from(new Set([...state.readIds, ...ids])),
        })),
    }),
    {
      name: 'notifications',
      version: PERSISTED_STORE_VERSION,
      migrate: migrateNotificationsState,
      storage: appJsonStorage,
    },
  ),
);

registerRehydrator(() => {
  void useNotificationsStore.persist.rehydrate();
});

/** Forma mínima de aviso para o cálculo de não-lido (alinha com AppNotification). */
export interface NotificationReadState {
  id: string;
  read: boolean;
}

/**
 * Selector puro: o aviso está não-lido? Combina a flag `read` do servidor com a
 * lista local `readIds` (marcações otimistas que ainda não voltaram do server).
 */
export function isNotificationUnread(readIds: string[], notification: NotificationReadState): boolean {
  return !notification.read && !readIds.includes(notification.id);
}

/** Selector puro: quantos avisos não-lidos há na lista, dado o estado local. */
export function unreadNotificationCount(
  readIds: string[],
  notifications: readonly NotificationReadState[],
): number {
  return notifications.reduce((count, n) => (isNotificationUnread(readIds, n) ? count + 1 : count), 0);
}
