// Constantes de negocio y cartografía.
// Categorías y estados: docs/tecnica/02. system-contracts.md §2.1, §2.2
// Transiciones: §6 (PATCH /admin/reports/{id}/status)
// Mapa: docs/tecnica/04. admin-web.md §4
import type { IncidentCategory, ReportStatus } from '../types/report';

export interface CategoryInfo {
  label: string;
  color: string;
}

export const CATEGORIES: Record<IncidentCategory, CategoryInfo> = {
  calle_anegada: { label: 'Calle anegada', color: '#2196F3' },
  camino_interrumpido: { label: 'Camino interrumpido', color: '#F57C00' },
  desborde_rio_riacho: { label: 'Desborde de río o riacho', color: '#1565C0' },
  vivienda_estructura_daniada: { label: 'Vivienda o estructura dañada', color: '#D32F2F' },
  arbol_caido: { label: 'Árbol caído', color: '#558B2F' },
  obstruccion_desague: { label: 'Obstrucción de desagüe', color: '#00897B' },
  poste_cable_caido: { label: 'Poste o cable caído', color: '#F9A825' },
  danos_infraestructura_publica: { label: 'Daños en infraestructura pública', color: '#7E57C2' },
  corte_servicios_basicos: { label: 'Corte de servicios básicos', color: '#607D8B' },
  otro: { label: 'Otro', color: '#757575' },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as IncidentCategory[];

export const STATUS_LABELS: Record<ReportStatus, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  verificado: 'Verificado',
  descartado: 'Descartado',
  en_seguimiento: 'En seguimiento',
  resuelto: 'Resuelto',
};

export const STATUS_KEYS = Object.keys(STATUS_LABELS) as ReportStatus[];

/** Estados activos devueltos por defecto en GET /incidents (§4). */
export const ACTIVE_STATUSES: ReportStatus[] = ['pendiente', 'en_revision', 'verificado', 'en_seguimiento'];

/** Máquina de estados (§6, reglas de validación de transición). */
export const STATUS_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  pendiente: ['en_revision', 'descartado'],
  en_revision: ['verificado', 'descartado'],
  verificado: ['en_seguimiento', 'resuelto', 'descartado'],
  en_seguimiento: ['resuelto', 'descartado'],
  resuelto: [],
  descartado: [],
};

export function getAllowedTransitions(status: ReportStatus): ReportStatus[] {
  return STATUS_TRANSITIONS[status];
}

export function isTransitionAllowed(from: ReportStatus, to: ReportStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export function isFinalStatus(status: ReportStatus): boolean {
  return STATUS_TRANSITIONS[status].length === 0;
}

/** Comentario administrativo (04. admin-web.md §6.2). */
export const ADMIN_COMMENT_MIN = 5;
export const ADMIN_COMMENT_MAX = 1000;

/** Paginación (02. system-contracts.md §1.5). */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Cartografía (04. admin-web.md §4.1). */
export const MAP_CENTER: [number, number] = [-59.94836, -24.67426];
export const MAP_INITIAL_ZOOM = 7.5;
export const MAP_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-62.6, -27.1],
  [-57.3, -22.2],
];
/** Mosaicos vectoriales sin API key (05. mobile-app.md §5.1, 01. architecture.md). */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
export const FORMOSA_MASK_URL = '/geo/formosa-mask.json';

/** Máscara invertida (04. admin-web.md §4.2). */
export const MASK_FILL_COLOR = '#0f172a';
export const MASK_FILL_OPACITY = 0.65;
export const MASK_LINE_COLOR = '#38bdf8';
export const MASK_LINE_WIDTH = 2;

/** Zona horaria oficial de visualización (02. system-contracts.md §1.3). */
export const DISPLAY_TIME_ZONE = 'America/Argentina/Buenos_Aires';
