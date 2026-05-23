import { create } from 'zustand';

import type { AuthTokens, UserDTO } from '@kimthanh/shared-types';

export interface AuthState {
  user: UserDTO | null;
  tokens: AuthTokens | null;
  isHydrating: boolean;
  isAuthenticated: boolean;
  setSession: (user: UserDTO, tokens: AuthTokens) => void;
  setUser: (user: UserDTO) => void;
  setHydrating: (value: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isHydrating: true,
  isAuthenticated: false,
  setSession: (user, tokens) => set({ user, tokens, isAuthenticated: true }),
  setUser: (user) => set({ user }),
  setHydrating: (value) => set({ isHydrating: value }),
  clear: () => set({ user: null, tokens: null, isAuthenticated: false }),
}));
