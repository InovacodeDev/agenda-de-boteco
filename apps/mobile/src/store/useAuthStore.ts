import { create } from 'zustand';

import {
  type AuthUser,
  getCurrentUser,
  isAuthAvailable,
  onAuthUserChange,
  signOut as authSignOut,
} from '../services/auth';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut' | 'unavailable';

export interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  /** Carrega a sessão atual e passa a observar mudanças de auth */
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

let unsubscribe: (() => void) | null = null;

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: 'loading',
  initialize: async () => {
    if (!isAuthAvailable()) {
      set({ user: null, status: 'unavailable' });
      return;
    }
    const user = await getCurrentUser();
    set({ user, status: user ? 'signedIn' : 'signedOut' });
    unsubscribe?.();
    unsubscribe = onAuthUserChange((nextUser) => {
      set({ user: nextUser, status: nextUser ? 'signedIn' : 'signedOut' });
    });
  },
  signOut: async () => {
    await authSignOut();
    set({ user: null, status: 'signedOut' });
  },
}));
