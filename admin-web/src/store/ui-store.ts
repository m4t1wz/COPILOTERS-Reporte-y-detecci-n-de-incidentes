// Estado de interfaz — docs/tecnica/04. admin-web.md §2 (store/ui-store.ts):
// barra lateral y filtros globales del mapa.
import { create } from 'zustand';
import type { IncidentFilters } from '../types/incident';

export type MapFilters = Pick<IncidentFilters, 'category' | 'status'>;

export interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mapFilters: MapFilters;
  setMapFilters: (filters: Partial<MapFilters>) => void;
  resetMapFilters: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  mapFilters: {},
  setMapFilters: (filters) => set((s) => ({ mapFilters: { ...s.mapFilters, ...filters } })),
  resetMapFilters: () => set({ mapFilters: {} }),
}));
