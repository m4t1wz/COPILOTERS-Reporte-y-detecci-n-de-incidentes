export type UserRole = 'citizen' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string | null;
  role: UserRole;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: User;
  session: AuthSession;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
}
