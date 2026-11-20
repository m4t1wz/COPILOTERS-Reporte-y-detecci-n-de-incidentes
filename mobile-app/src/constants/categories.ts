import { IncidentCategory, ReportStatus } from '../types';

export interface CategoryInfo {
  key: IncidentCategory;
  label: string;
  color: string;
  colorName: string;
  iconName: string; // Lucide icon name
}

export const INCIDENT_CATEGORIES: Record<IncidentCategory, CategoryInfo> = {
  calle_anegada: {
    key: 'calle_anegada',
    label: 'Calle anegada',
    color: '#2196F3',
    colorName: 'Azul',
    iconName: 'Droplet',
  },
  camino_interrumpido: {
    key: 'camino_interrumpido',
    label: 'Camino interrumpido',
    color: '#F57C00',
    colorName: 'Naranja',
    iconName: 'ShieldAlert',
  },
  desborde_rio_riacho: {
    key: 'desborde_rio_riacho',
    label: 'Desborde de río o riacho',
    color: '#1565C0',
    colorName: 'Azul oscuro',
    iconName: 'Waves',
  },
  vivienda_estructura_daniada: {
    key: 'vivienda_estructura_daniada',
    label: 'Vivienda o estructura dañada',
    color: '#D32F2F',
    colorName: 'Rojo alerta',
    iconName: 'Home',
  },
  arbol_caido: {
    key: 'arbol_caido',
    label: 'Árbol caído',
    color: '#558B2F',
    colorName: 'Verde',
    iconName: 'TreePine',
  },
  obstruccion_desague: {
    key: 'obstruccion_desague',
    label: 'Obstrucción de desagüe',
    color: '#00897B',
    colorName: 'Turquesa',
    iconName: 'Filter',
  },
  poste_cable_caido: {
    key: 'poste_cable_caido',
    label: 'Poste o cable caído',
    color: '#F9A825',
    colorName: 'Amarillo ámbar',
    iconName: 'Zap',
  },
  danos_infraestructura_publica: {
    key: 'danos_infraestructura_publica',
    label: 'Daños en infraestructura pública',
    color: '#7E57C2',
    colorName: 'Violeta',
    iconName: 'Building2',
  },
  corte_servicios_basicos: {
    key: 'corte_servicios_basicos',
    label: 'Corte de servicios básicos',
    color: '#607D8B',
    colorName: 'Gris azulado',
    iconName: 'PowerOff',
  },
  otro: {
    key: 'otro',
    label: 'Otro',
    color: '#757575',
    colorName: 'Gris neutro',
    iconName: 'HelpCircle',
  },
};

export const CATEGORY_LIST: CategoryInfo[] = Object.values(INCIDENT_CATEGORIES);

export interface StatusInfo {
  key: ReportStatus;
  label: string;
  color: string;
  description: string;
}

export const REPORT_STATUSES: Record<ReportStatus, StatusInfo> = {
  pendiente: {
    key: 'pendiente',
    label: 'Pendiente',
    color: '#F9A825',
    description: 'El aviso fue recibido.',
  },
  en_revision: {
    key: 'en_revision',
    label: 'En revisión',
    color: '#F57C00',
    description: 'Se está revisando el reporte.',
  },
  verificado: {
    key: 'verificado',
    label: 'Verificado',
    color: '#558B2F',
    description: 'Se confirmó el incidente.',
  },
  descartado: {
    key: 'descartado',
    label: 'Descartado',
    color: '#757575',
    description: 'El aviso no corresponde a un incidente o no se pudo confirmar.',
  },
  en_seguimiento: {
    key: 'en_seguimiento',
    label: 'En seguimiento',
    color: '#2196F3',
    description: 'Se están realizando gestiones sobre el incidente.',
  },
  resuelto: {
    key: 'resuelto',
    label: 'Resuelto',
    color: '#252525',
    description: 'El incidente fue resuelto.',
  },
};
