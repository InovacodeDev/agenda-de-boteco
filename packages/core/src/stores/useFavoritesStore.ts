import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appJsonStorage, registerRehydrator } from '../platform/storage';
import {
  addServerFavorite,
  type FavoriteTarget,
  fetchServerFavorites,
  removeServerFavorite,
} from '../services/favorites';

export interface PendingOp {
  op: 'add' | 'remove';
  target: FavoriteTarget;
}

export interface FavoritesState {
  eventIds: string[];
  establishmentIds: string[];
  pendingOps: PendingOp[];
  toggleEvent: (id: string) => void;
  toggleEstablishment: (id: string) => void;
  flushQueue: (userId: string | null) => Promise<void>;
  mergeLocalIntoServer: (userId: string) => Promise<void>;
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((current) => current !== id) : [...ids, id];
}

/** União preservando a ordem local; adiciona só os ids ainda ausentes. */
function mergeIds(local: string[], incoming: string[]): string[] {
  const known = new Set(local);
  return [...local, ...incoming.filter((id) => !known.has(id))];
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      eventIds: [],
      establishmentIds: [],
      pendingOps: [],
      toggleEvent: (id) =>
        set((state) => {
          const willAdd = !state.eventIds.includes(id);
          return {
            eventIds: toggleId(state.eventIds, id),
            pendingOps: [
              ...state.pendingOps,
              { op: willAdd ? 'add' : 'remove', target: { type: 'event', id } },
            ],
          };
        }),
      toggleEstablishment: (id) =>
        set((state) => {
          const willAdd = !state.establishmentIds.includes(id);
          return {
            establishmentIds: toggleId(state.establishmentIds, id),
            pendingOps: [
              ...state.pendingOps,
              { op: willAdd ? 'add' : 'remove', target: { type: 'establishment', id } },
            ],
          };
        }),
      flushQueue: async (userId) => {
        if (userId === null) {
          return;
        }
        const queue = get().pendingOps;
        const failed: PendingOp[] = [];
        for (const pending of queue) {
          try {
            if (pending.op === 'add') {
              await addServerFavorite(userId, pending.target);
            } else {
              await removeServerFavorite(userId, pending.target);
            }
          } catch {
            failed.push(pending);
          }
        }
        set((state) => ({
          pendingOps: [...failed, ...state.pendingOps.slice(queue.length)],
        }));
      },
      mergeLocalIntoServer: async (userId) => {
        const server = await fetchServerFavorites();
        const onServer = new Set(server.map((target) => `${target.type}:${target.id}`));
        const local: FavoriteTarget[] = [
          ...get().eventIds.map((id) => ({ type: 'event' as const, id })),
          ...get().establishmentIds.map((id) => ({ type: 'establishment' as const, id })),
        ];
        for (const target of local) {
          if (!onServer.has(`${target.type}:${target.id}`)) {
            await addServerFavorite(userId, target);
          }
        }
        set((state) => ({
          eventIds: mergeIds(
            state.eventIds,
            server.filter((t) => t.type === 'event').map((t) => t.id),
          ),
          establishmentIds: mergeIds(
            state.establishmentIds,
            server.filter((t) => t.type === 'establishment').map((t) => t.id),
          ),
          pendingOps: [],
        }));
      },
    }),
    {
      name: 'favorites',
      storage: appJsonStorage,
    },
  ),
);

registerRehydrator(() => {
  void useFavoritesStore.persist.rehydrate();
});
