import type { Timestamped, ID } from './common';
import type { UserRole, UserStatus, Locale } from './enums';

export interface UserDTO extends Timestamped {
  id: ID;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  schoolId: ID | null;
  locale: Locale;
}

export interface UpdateUserRequest {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  locale?: Locale;
}
