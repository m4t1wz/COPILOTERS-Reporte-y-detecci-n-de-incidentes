// /login — inicio de sesión exclusivo de operadores (04 §2, §3; 07 TASK-WEB-01; 08 §7).
import { AlertCircle, Lock, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { Button } from '../components/common/Button';
import { ICON_STROKE } from '../components/common/status-styles';
import { useLogin } from '../hooks/use-auth';
import { useAuthStore } from '../store/auth-store';

const inputClass =
  'h-10 w-full rounded-field border border-border bg-surface pl-10 pr-3 text-sm text-typography-main placeholder:text-typography-muted transition-colors duration-150 ease-out focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';

export function LoginPage() {
  const { isAuthenticated, user } = useAuthStore();
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (isAuthenticated && user?.role === 'admin') return <Navigate to={from} replace />;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => navigate(from, { replace: true }) });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src={logo} alt="NEXO MAP" className="h-16 w-16 object-contain" />
          <h1 className="text-xl font-semibold">Iniciar sesión</h1>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Email</span>
            <span className="relative">
              <Mail
                size={18}
                strokeWidth={ICON_STROKE}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-typography-muted"
              />
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Contraseña</span>
            <span className="relative">
              <Lock
                size={18}
                strokeWidth={ICON_STROKE}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-typography-muted"
              />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </span>
          </label>

          {login.error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-field border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-brand-dark"
            >
              <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
              <span>{login.error.message}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="mt-2 w-full"
            loading={login.isPending}
            disabled={!email.trim() || !password}
          >
            Ingresar
          </Button>
        </form>
      </div>
    </div>
  );
}
