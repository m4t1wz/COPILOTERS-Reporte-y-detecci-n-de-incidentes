"""Datos semilla para la demostración (TASK-INT-01, docs/07. implementation-plan.md).

Crea el administrador `admin@formosa.gob.ar`, ciudadanos de prueba y 30 reportes dentro de Formosa con
dos zonas de concentración (calle anegada en Formosa Capital y desborde de río o riacho en Clorinda).

Uso (desde backend/, con .env configurado):
    .venv\\Scripts\\python scripts\\seed_data.py --admin-password <clave> --citizen-password <clave>

DOC-PENDIENTE: la especificación no define las contraseñas de los usuarios semilla; se reciben por argumento.
"""
import argparse
import asyncio
import sys
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID, uuid4

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from core.config import settings  # noqa: E402
from services import cluster_service, geo_service  # noqa: E402
from services.geocoding_service import GeocodingService  # noqa: E402

ADMIN_EMAIL = "admin@formosa.gob.ar"
CITIZENS = [
    ("ciudadano1@example.com", "Ciudadano de Prueba 1", "+543704000001"),
    ("ciudadano2@example.com", "Ciudadano de Prueba 2", "+543704000002"),
    ("ciudadano3@example.com", "Ciudadano de Prueba 3", "+543704000003"),
]

# Caminos válidos en la máquina de estados para llegar a cada estado final.
STATUS_PATHS = {
    "pendiente": [],
    "en_revision": ["en_revision"],
    "verificado": ["en_revision", "verificado"],
    "en_seguimiento": ["en_revision", "verificado", "en_seguimiento"],
    "resuelto": ["en_revision", "verificado", "resuelto"],
    "descartado": ["descartado"],
}
STEP_COMMENTS = {
    "en_revision": "Reporte asignado para evaluación.",
    "verificado": "Incidente confirmado en terreno.",
    "en_seguimiento": "Cuadrilla enviada al lugar.",
    "resuelto": "Situación normalizada.",
    "descartado": "No se pudo confirmar el aviso.",
}


@dataclass
class SeedReport:
    category: str
    latitude: float
    longitude: float
    comment: str
    final_status: str


def build_seed_reports() -> list[SeedReport]:
    reports: list[SeedReport] = []
    # Zona 1: calle anegada, Formosa Capital (4 reportes a ~150 m entre sí).
    for i, (dlat, dlon) in enumerate([(0, 0), (0.0012, 0.0008), (-0.0010, 0.0011), (0.0005, -0.0013)]):
        reports.append(SeedReport("calle_anegada", -26.1852 + dlat, -58.1738 + dlon,
                                  "El agua supera la vereda e ingresa a los domicilios.",
                                  "en_seguimiento" if i == 0 else "verificado"))
    # Zona 2: desborde de río o riacho, Clorinda (4 reportes a ~150 m entre sí).
    for i, (dlat, dlon) in enumerate([(0, 0), (0.0011, 0.0009), (-0.0012, 0.0006), (0.0004, -0.0012)]):
        reports.append(SeedReport("desborde_rio_riacho", -25.2870 + dlat, -57.7230 + dlon,
                                  "El riacho desbordó y cubre la calle.",
                                  "en_seguimiento" if i == 1 else "verificado"))
    # Reportes individuales en distintas localidades.
    singles = [
        ("arbol_caido", -26.1790, -58.1650, "Árbol caído sobre la calzada.", "pendiente"),
        ("poste_cable_caido", -26.1950, -58.1900, "Cable de tendido eléctrico en el suelo.", "en_revision"),
        ("obstruccion_desague", -26.1700, -58.1800, "Boca de tormenta tapada.", "verificado"),
        ("corte_servicios_basicos", -26.2050, -58.1600, "Sin luz en todo el barrio.", "pendiente"),
        ("vivienda_estructura_daniada", -26.1600, -58.2000, "Techo derrumbado por la tormenta.", "en_seguimiento"),
        ("camino_interrumpido", -25.1300, -58.2500, "Ruta cortada por el agua.", "verificado"),
        ("calle_anegada", -25.1350, -58.2450, "Calle inundada frente a la escuela.", "pendiente"),
        ("arbol_caido", -25.7320, -59.1080, "Árbol caído en la plaza.", "resuelto"),
        ("danos_infraestructura_publica", -25.7350, -59.1050, "Puente peatonal dañado.", "en_revision"),
        ("calle_anegada", -26.3080, -59.3720, "Anegamiento en la avenida principal.", "pendiente"),
        ("corte_servicios_basicos", -26.3050, -59.3680, "Corte de agua potable.", "verificado"),
        ("camino_interrumpido", -24.7090, -60.5930, "Camino vecinal intransitable.", "en_seguimiento"),
        ("otro", -24.7120, -60.5900, "Animales sueltos en la ruta por la crecida.", "pendiente"),
        ("vivienda_estructura_daniada", -23.8980, -61.8530, "Pared de vivienda colapsada.", "en_revision"),
        ("poste_cable_caido", -23.9000, -61.8500, "Poste inclinado a punto de caer.", "descartado"),
        ("obstruccion_desague", -25.2900, -57.7300, "Desagüe obstruido con ramas.", "pendiente"),
        ("calle_anegada", -25.3000, -57.7400, "Agua acumulada en la esquina.", "resuelto"),
        ("desborde_rio_riacho", -26.2300, -58.1500, "El río sube rápidamente.", "en_revision"),
        ("arbol_caido", -26.1500, -58.1700, "Rama grande sobre un auto.", "verificado"),
        ("danos_infraestructura_publica", -26.1900, -58.1750, "Semáforo destruido.", "pendiente"),
        ("otro", -26.1880, -58.1820, "Pozo profundo en la calle.", "descartado"),
        ("camino_interrumpido", -24.9500, -59.9000, "Terraplén socavado.", "pendiente"),
    ]
    reports.extend(SeedReport(*s) for s in singles)
    return reports


async def _ensure_user(supabase, pool, email: str, password: str, full_name: str, phone: str | None, role: str) -> UUID:
    try:
        result = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name, "phone_number": phone},
        })
        user_id = UUID(str(result.user.id))
    except Exception as exc:
        user_id = await pool.fetchval("SELECT id FROM public.perfiles WHERE correo = $1", email)
        if user_id is None:
            raise RuntimeError(f"No se pudo crear {email}: {exc}") from exc
    # El trigger de alta fija rol = 'ciudadano' (migración 20261120000003); el administrador se promueve por SQL.
    if role == "admin":
        await pool.execute(
            "UPDATE public.perfiles SET rol = 'administrador', actualizado_en = now() WHERE id = $1", user_id
        )
    return user_id


async def main(admin_password: str, citizen_password: str) -> None:
    from database import close_db_pool, get_db_pool, get_supabase_client
    from services.report_service import ReportRepository

    geo_service.init_territory(settings.territory_path)
    seed = build_seed_reports()
    outside = [r for r in seed if not geo_service.is_within_territory(r.latitude, r.longitude)]
    if outside:
        raise SystemExit(f"Coordenadas fuera de Formosa en la semilla: {outside}")

    pool = await get_db_pool()
    supabase = get_supabase_client()
    repo = ReportRepository(get_db_pool)
    geocoder = GeocodingService()

    admin_id = await _ensure_user(supabase, pool, ADMIN_EMAIL, admin_password, "Administrador Formosa", None, "admin")
    citizen_ids = [
        await _ensure_user(supabase, pool, email, citizen_password, name, phone, "citizen")
        for email, name, phone in CITIZENS
    ]

    for index, item in enumerate(seed):
        address = await geocoder.reverse_geocode(item.latitude, item.longitude)
        await asyncio.sleep(1.1)  # política de uso de Nominatim: 1 solicitud por segundo
        report_id = uuid4()
        await repo.create_report(
            report_id=report_id,
            citizen_id=citizen_ids[index % len(citizen_ids)],
            category=item.category,
            comment=item.comment,
            photo_url=None,
            latitude=item.latitude,
            longitude=item.longitude,
            address_reference=address,
        )
        current = "pendiente"
        for step in STATUS_PATHS[item.final_status]:
            await repo.change_status(report_id=report_id, expected_status=current, new_status=step,
                                     changed_by=admin_id, admin_comment=STEP_COMMENTS[step])
            current = step
        print(f"[{index + 1:02d}/{len(seed)}] {item.category} -> {item.final_status}")

    clusters = await cluster_service.recalculate_clusters(cluster_service.ClusterRepository(get_db_pool))
    print(f"Zonas de concentración activas: {len(clusters)}")
    await close_db_pool()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--admin-password", required=True)
    parser.add_argument("--citizen-password", required=True)
    args = parser.parse_args()
    asyncio.run(main(args.admin_password, args.citizen_password))
