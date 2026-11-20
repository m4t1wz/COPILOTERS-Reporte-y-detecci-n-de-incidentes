// Iconos y acentos por estado.
// Iconos: 08. visual-design-system.md §5.3 · Acentos: 04. admin-web.md §5.1.
// `en_revision` no figura en ninguno de los dos mapeos: se usa `Search` y el color principal
// (estado activo, 08 §2.1). Ver DOC-PENDIENTE-08.
import { Activity, Check, CheckCircle2, Clock, Search, XCircle, type LucideIcon } from 'lucide-react';
import type { ReportStatus } from '../../types/report';

export interface StatusStyle {
  icon: LucideIcon;
  accent: string;
}

export const STATUS_STYLES: Record<ReportStatus, StatusStyle> = {
  pendiente: { icon: Clock, accent: '#F9A825' },
  en_revision: { icon: Search, accent: '#0475EF' },
  verificado: { icon: CheckCircle2, accent: '#558B2F' },
  en_seguimiento: { icon: Activity, accent: '#2196F3' },
  resuelto: { icon: Check, accent: '#252525' },
  descartado: { icon: XCircle, accent: '#777777' },
};

/** Grosor de trazo estándar de Lucide (08 §5.2). */
export const ICON_STROKE = 1.75;
