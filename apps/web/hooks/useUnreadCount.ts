'use client';

import {
  flattenPages,
  unreadNotificationCount,
  useNotificationsQuery,
  useNotificationsStore,
} from '@agenda/core';

/** Quantidade de avisos não-lidos (server.read=false e não marcados localmente). */
export function useUnreadCount(): number {
  const readIds = useNotificationsStore((state) => state.readIds);
  const { data } = useNotificationsQuery();
  return unreadNotificationCount(readIds, flattenPages(data));
}
