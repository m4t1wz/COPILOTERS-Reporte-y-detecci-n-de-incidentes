// Login, logout y verificación de rol — docs/tecnica/04. admin-web.md §2 (hooks/use-auth.ts), §3
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../core/api-client';
import { authService } from '../services/auth-service';
import { useAuthStore } from '../store/auth-store';
import type { LoginCredentials, LoginResponse } from '../types/auth';

/** Autentica y exige rol `admin`; un ciudadano recibe 403 FORBIDDEN_RESOURCE. */
export async function loginAsAdmin(credentials: LoginCredentials): Promise<LoginResponse> {
  const result = await authService.login(credentials);
  if (result.user.role !== 'admin') {
    throw new ApiError(
      {
        code: 'FORBIDDEN_RESOURCE',
        message: 'Acceso restringido a operadores administrativos.',
        details: null,
        timestamp: new Date().toISOString(),
      },
      403,
    );
  }
  return result;
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation<LoginResponse, ApiError, LoginCredentials>({
    mutationFn: loginAsAdmin,
    onSuccess: (data) => setSession(data),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  return () => {
    logout();
    queryClient.clear();
  };
}

export function useIsAdmin(): boolean {
  return useAuthStore((s) => s.isAuthenticated && s.user?.role === 'admin');
}
