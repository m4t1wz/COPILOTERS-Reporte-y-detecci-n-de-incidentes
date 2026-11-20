"""Genera formosa-mask.json: anillo exterior mundial con Formosa como hueco (TASK-GEO-01; ADR-006).

Uso (desde backend/):
    .venv\\Scripts\\python scripts\\generate_mask.py [ruta_salida]

DOC-PENDIENTE: 07 indica `scripts/generate_mask.py` y `public/geo/formosa-mask.json` pero los clientes aún no
existen; la salida por defecto es backend/scripts/output/formosa-mask.json (copiar a admin-web/public/geo/ y
mobile-app/assets/geo/).
"""
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from core.config import settings  # noqa: E402
from services import geo_service  # noqa: E402

DEFAULT_OUTPUT = BACKEND_DIR / "scripts" / "output" / "formosa-mask.json"


def main(output: Path) -> None:
    geo_service.init_territory(settings.territory_path)
    mask = geo_service.build_inverted_mask()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(mask, separators=(",", ":")), encoding="utf-8")
    print(f"Máscara generada: {output} ({output.stat().st_size} bytes)")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_OUTPUT)
