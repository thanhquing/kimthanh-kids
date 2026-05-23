import type { UserRole } from './enums';
import type { UserDTO } from './user';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** seconds until access token expiry */
  expiresIn: number;
}

export interface LoginResponse {
  user: UserDTO;
  tokens: AuthTokens;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  schoolId?: string;
  /** issued at — unix seconds */
  iat?: number;
  /** expires — unix seconds */
  exp?: number;
}
