// /map — visualizador cartográfico a pantalla completa (04 §2, §4).
import { AdminMap } from '../components/map/AdminMap';
import { MapFilters } from '../components/map/MapFilters';
import { useUIStore } from '../store/ui-store';

export function MapViewPage() {
  const mapFilters = useUIStore((s) => s.mapFilters);

  return (
    <div className="h-full">
      <AdminMap filters={mapFilters}>
        <MapFilters className="absolute left-3 top-3 max-w-[calc(100%-5rem)]" />
      </AdminMap>
    </div>
  );
}
