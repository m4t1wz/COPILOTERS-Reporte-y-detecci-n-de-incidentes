// POST /auth/login — docs/tecnica/02. system-contracts.md §3
import { apiClient } from '../core/api-client';
import type { LoginCredentials, LoginResponse } from '../types/auth';
import { apiRequest } from './request';

export const authService = {
  login(credentials: LoginCredentials): Promise<LoginResponse> {
    const payload = { email: credentials.email.trim(), password: credentials.password };
    return apiRequest(
      async () => (await apiClient.post<LoginResponse>('/auth/login', payload, { skipAuthRefresh: true })).data,
    );
  },
};
