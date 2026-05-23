/**
 * Cross-platform token storage contract.
 *
 * Why: web uses localStorage/cookies, mobile uses SecureStore/AsyncStorage.
 * The api client must not know about either — callers inject an implementation.
 */
export interface TokenStorage {
  getAccessToken(): Promise<string | null> | string | null;
  getRefreshToken(): Promise<string | null> | string | null;
  setTokens(tokens: { accessToken: string; refreshToken: string }): Promise<void> | void;
  clearTokens(): Promise<void> | void;
}

/** Lightweight in-memory storage used in tests or SSR. */
export class MemoryTokenStorage implements TokenStorage {
  private access: string | null = null;
  private refresh: string | null = null;
  getAccessToken() {
    return this.access;
  }
  getRefreshToken() {
    return this.refresh;
  }
  setTokens(tokens: { accessToken: string; refreshToken: string }) {
    this.access = tokens.accessToken;
    this.refresh = tokens.refreshToken;
  }
  clearTokens() {
    this.access = null;
    this.refresh = null;
  }
}
