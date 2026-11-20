// Autenticación — docs/tecnica/02. system-contracts.md §2.3, §3

/** Roles de usuario (§2.3). */
export type UserRole = 'citizen' | 'admin';

/** Perfil de usuario devuelto por login (§3). */
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: UserRole;
}

/** Tokens de sesión (§3, login). */
export interface Session {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

/** Cuerpo de POST /auth/login. */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Respuesta 200 de POST /auth/login. */
export interface LoginResponse {
  user: User;
  session: Session;
}

/** Cuerpo de POST /auth/refresh. */
export interface RefreshRequest {
  refresh_token: string;
}

/** Respuesta 200 de POST /auth/refresh. */
export type RefreshResponse = Session;
