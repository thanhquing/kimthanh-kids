import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { ApiClient, createApiSdk, type TokenStorage } from '@kimthanh/shared-api-client';
import {
  ACCESS_TOKEN_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
} from '@kimthanh/shared-utils';

const secureStorage: TokenStorage = {
  getAccessToken: () => SecureStore.getItemAsync(ACCESS_TOKEN_STORAGE_KEY),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY),
  setTokens: async ({ accessToken, refreshToken }) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_STORAGE_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  },
  clearTokens: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_STORAGE_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY);
  },
};

const baseURL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const client = new ApiClient({
  baseURL,
  storage: secureStorage,
  getLocale: () => {
    let cached: string | undefined;
    AsyncStorage.getItem(LOCALE_STORAGE_KEY).then((v) => {
      cached = v ?? undefined;
    });
    return cached;
  },
});

export const apiClient = client;
export const apiSdk = createApiSdk(client);
export const tokenStorage = secureStorage;
