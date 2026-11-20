// Navegación lateral — 08. visual-design-system.md §9:
// fondo blanco, borde derecho, activo con fondo brand-soft (#E2F9FE), texto brand (#0475EF) e indicador izquierdo.
import { ClipboardList, LayoutDashboard, MapPin, type LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useUIStore } from '../../store/ui-store';
import { cn } from '../../utils/cn';
import { ICON_STROKE } from '../common/status-styles';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Resumen', icon: LayoutDashboard },
  { to: '/reports', label: 'Reportes', icon: ClipboardList },
  { to: '/map', label: 'Mapa', icon: MapPin },
];

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'flex shrink-0 flex-col gap-1 border-r border-border bg-surface py-3 transition-[width] duration-150 ease-out',
        collapsed ? 'w-14' : 'w-56',
      )}
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              'relative mx-2 flex h-10 items-center gap-3 rounded-btn px-3 text-sm font-medium transition-colors duration-150 ease-out',
              isActive
                ? 'bg-brand-soft text-brand before:absolute before:-left-2 before:top-2 before:h-6 before:w-[3px] before:rounded-r before:bg-brand'
                : 'text-typography-main hover:bg-base',
            )
          }
        >
          <Icon size={20} strokeWidth={ICON_STROKE} className="shrink-0" />
          {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
