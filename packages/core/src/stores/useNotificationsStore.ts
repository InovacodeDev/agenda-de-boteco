import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appJsonStorage, registerRehydrator } from '../platform/storage';

export interface NotificationsState {
  readIds: string[];
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
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
