// Cabecera institucional: logo + "NEXO MAP" a la izquierda (08 §1.1, 04 Identidad visual).
import { LogOut, PanelLeft, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useLogout } from '../../hooks/use-auth';
import { useAuthStore } from '../../store/auth-store';
import { useUIStore } from '../../store/ui-store';
import { ICON_STROKE } from '../common/status-styles';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const logout = useLogout();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-btn p-1.5 text-typography-muted transition-colors duration-150 ease-out hover:bg-brand-soft hover:text-typography-main"
          aria-label="Mostrar u ocultar navegación"
        >
          <PanelLeft size={20} strokeWidth={ICON_STROKE} />
        </button>
        <img src={logo} alt="" className="h-8 w-8 object-contain" />
        <span className="text-[16px] font-semibold tracking-wide text-typography-main">NEXO MAP</span>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="hidden items-center gap-2 text-sm sm:flex">
            <UserRound size={18} strokeWidth={ICON_STROKE} className="text-typography-muted" />
            <span className="font-medium">{user.full_name}</span>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-8 items-center gap-1.5 rounded-btn border border-border bg-surface px-3 text-sm font-medium text-typography-main transition-colors duration-150 ease-out hover:bg-brand-soft"
        >
          <LogOut size={16} strokeWidth={2} />
          Salir
        </button>
      </div>
    </header>
  );
}
