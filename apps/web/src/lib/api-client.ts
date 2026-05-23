import { ApiClient, createApiSdk, type TokenStorage } from '@kimthanh/shared-api-client';
import {
  ACCESS_TOKEN_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
} from '@kimthanh/shared-utils';

const browserStorage: TokenStorage = {
  getAccessToken: () =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY),
  getRefreshToken: () =>
    typeof window === 'undefined' ? null : window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY),
  setTokens: ({ accessToken, refreshToken }) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  },
  clearTokens: () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  },
};

const client = new ApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  storage: browserStorage,
  onUnauthenticated: () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
  getLocale: () =>
    typeof window === 'undefined'
      ? undefined
      : window.localStorage.getItem(LOCALE_STORAGE_KEY) ?? undefined,
});

export const apiClient = client;
export const apiSdk = createApiSdk(client);
export { browserStorage };
