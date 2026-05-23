import { useCallback } from 'react';

import type { ApiSdk } from '@kimthanh/shared-api-client';
import type { TokenStorage } from '@kimthanh/shared-api-client';
import type { LoginRequest, RegisterRequest } from '@kimthanh/shared-types';

import { useAuthStore } from './auth-store';

export interface UseAuthDeps {
  sdk: ApiSdk;
  storage: TokenStorage;
}

export const useAuth = ({ sdk, storage }: UseAuthDeps) => {
  const store = useAuthStore();

  const login = useCallback(
    async (body: LoginRequest) => {
      const res = await sdk.auth.login(body);
      await storage.setTokens(res.tokens);
      store.setSession(res.user, res.tokens);
      return res.user;
    },
    [sdk, storage, store],
  );

  const register = useCallback(
    async (body: RegisterRequest) => {
      const res = await sdk.auth.register(body);
      await storage.setTokens(res.tokens);
      store.setSession(res.user, res.tokens);
      return res.user;
    },
    [sdk, storage, store],
  );

  const logout = useCallback(async () => {
    try {
      await sdk.auth.logout();
    } finally {
      await storage.clearTokens();
      store.clear();
    }
  }, [sdk, storage, store]);

  const hydrate = useCallback(async () => {
    store.setHydrating(true);
    try {
      const access = await storage.getAccessToken();
      if (!access) {
        store.clear();
        return;
      }
      const user = await sdk.auth.me();
      const refreshToken = (await storage.getRefreshToken()) ?? '';
      store.setSession(user, { accessToken: access, refreshToken, expiresIn: 0 });
    } catch {
      await storage.clearTokens();
      store.clear();
    } finally {
      store.setHydrating(false);
    }
  }, [sdk, storage, store]);

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isHydrating: store.isHydrating,
    login,
    register,
    logout,
    hydrate,
  };
};
