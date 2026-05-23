import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

import type { ApiResponse, AuthTokens } from '@kimthanh/shared-types';

import { ApiClientError } from './errors';
import { type TokenStorage } from './token-storage';

export interface ApiClientOptions {
  baseURL: string;
  storage: TokenStorage;
  /** Called after refresh fails — UI should redirect to login. */
  onUnauthenticated?: () => void;
  /** Default request timeout in ms. */
  timeout?: number;
  /** Optional locale header injection (e.g. 'vi', 'en'). */
  getLocale?: () => string | undefined;
}

type RetryableRequest = InternalAxiosRequestConfig & { _retried?: boolean };

export class ApiClient {
  private readonly axios: AxiosInstance;
  private refreshing: Promise<AuthTokens | null> | null = null;

  constructor(private readonly opts: ApiClientOptions) {
    this.axios = axios.create({
      baseURL: opts.baseURL,
      timeout: opts.timeout ?? 15_000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.axios.interceptors.request.use(async (config) => {
      const token = await this.opts.storage.getAccessToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
      const locale = this.opts.getLocale?.();
      if (locale) {
        config.headers.set('Accept-Language', locale);
      }
      return config;
    });

    this.axios.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config as RetryableRequest | undefined;
        const status = error.response?.status;

        if (status === 401 && original && !original._retried) {
          original._retried = true;
          const tokens = await this.refreshTokens();
          if (tokens) {
            original.headers?.set?.('Authorization', `Bearer ${tokens.accessToken}`);
            return this.axios.request(original);
          }
          this.opts.onUnauthenticated?.();
        }

        throw this.normalizeError(error);
      },
    );
  }

  private async refreshTokens(): Promise<AuthTokens | null> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      try {
        const refreshToken = await this.opts.storage.getRefreshToken();
        if (!refreshToken) return null;
        const res = await axios.post<ApiResponse<AuthTokens>>(
          `${this.opts.baseURL}/auth/refresh`,
          { refreshToken },
          { timeout: this.opts.timeout ?? 15_000 },
        );
        if (!res.data.success) return null;
        await this.opts.storage.setTokens({
          accessToken: res.data.data.accessToken,
          refreshToken: res.data.data.refreshToken,
        });
        return res.data.data;
      } catch {
        await this.opts.storage.clearTokens();
        return null;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }

  private normalizeError(error: unknown): ApiClientError {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as { error?: ApiClientError } | undefined;
      const err = data?.error;
      return new ApiClientError({
        code: err?.code ?? 'NETWORK_ERROR',
        message: err?.message ?? error.message,
        messageKey: err?.messageKey,
        details: err?.details,
        status: error.response?.status ?? 0,
      });
    }
    return new ApiClientError({
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      status: 0,
    });
  }

  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const res = await this.axios.request<ApiResponse<T>>(config);
    if (!res.data.success) {
      throw new ApiClientError({
        code: res.data.error.code,
        message: res.data.error.message,
        messageKey: res.data.error.messageKey,
        details: res.data.error.details,
        status: res.status,
      });
    }
    return res.data.data;
  }

  get<T>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, url, method: 'GET' });
  }
  post<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, url, method: 'POST', data: body });
  }
  patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, url, method: 'PATCH', data: body });
  }
  put<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, url, method: 'PUT', data: body });
  }
  delete<T>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }
}
