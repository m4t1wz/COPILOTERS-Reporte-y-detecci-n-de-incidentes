"""Agrupamiento espaciotemporal de reportes (docs/03. backend.md §4.5; ADR-007; docs/01. architecture.md §9.3).

Criterio: misma categoría, reportes `verificado`/`en_seguimiento`, ventana de 10 días, DBSCAN con
ε = 800 m y min_samples = 3; polígono = Convex Hull + buffer de 100 m; resultado en `zonas_concentracion`.

DOC-PENDIENTE: 03/ADR admiten hacerlo en PostGIS o con Shapely; se calcula en memoria con Shapely sobre
una proyección local equirectangular en metros (error despreciable a escala de 800 m).
"""
import json
import logging
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Awaitable, Callable

import asyncpg
from shapely.geometry import MultiPoint, Polygon, mapping

from schemas.cluster import ClusterFeature, ClusterFeatureCollection
from schemas.common import CATEGORY_COLORS, CATEGORY_LABELS

logger = logging.getLogger(__name__)

CLUSTER_STATUSES = ["verificado", "en_seguimiento"]
EPS_METERS = 800.0
MIN_SAMPLES = 3
WINDOW_DAYS = 10
BUFFER_METERS = 100.0
EARTH_RADIUS_M = 6_371_008.8


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def dbscan(points: list[tuple[float, float]], eps_m: float = EPS_METERS, min_samples: int = MIN_SAMPLES) -> list[list[int]]:
    """DBSCAN sobre (lat, lon) con distancia geodésica. Devuelve los índices de cada grupo (sin ruido)."""
    n = len(points)
    neighbors = [
        [j for j in range(n) if haversine_m(points[i][0], points[i][1], points[j][0], points[j][1]) <= eps_m]
        for i in range(n)
    ]
    labels: list[int | None] = [None] * n  # None = no visitado, -1 = ruido
    clusters: list[list[int]] = []
    for i in range(n):
        if labels[i] is not None:
            continue
        if len(neighbors[i]) < min_samples:
            labels[i] = -1
            continue
        cluster_id = len(clusters)
        members = [i]
        labels[i] = cluster_id
        queue = list(neighbors[i])
        while queue:
            j = queue.pop()
            if labels[j] == -1:
                labels[j] = cluster_id
                members.append(j)
            if labels[j] is not None:
                continue
            labels[j] = cluster_id
            members.append(j)
            if len(neighbors[j]) >= min_samples:
                queue.extend(neighbors[j])
        clusters.append(sorted(set(members)))
    return clusters


def build_cluster_polygon(points: list[tuple[float, float]], buffer_m: float = BUFFER_METERS) -> Polygon:
    """Convex Hull + buffer de dilatación en metros; devuelve un Polygon en (lon, lat) EPSG:4326."""
    lat0 = sum(p[0] for p in points) / len(points)
    lon0 = sum(p[1] for p in points) / len(points)
    k_lat = math.pi * EARTH_RADIUS_M / 180.0
    k_lon = k_lat * math.cos(math.radians(lat0))
    projected = MultiPoint([((lon - lon0) * k_lon, (lat - lat0) * k_lat) for lat, lon in points])
    buffered = projected.convex_hull.buffer(buffer_m)
    ring = [(lon0 + x / k_lon, lat0 + y / k_lat) for x, y in buffered.exterior.coords]
    return Polygon(ring)


@dataclass
class ComputedCluster:
    category: str
    incident_count: int
    polygon: Polygon
    window_start: datetime
    window_end: datetime


def compute_clusters(reports: list[dict], now: datetime | None = None) -> list[ComputedCluster]:
    """`reports`: dicts con category, latitude, longitude, created_at y current_status."""
    now = now or datetime.now(timezone.utc)
    # DOC-PENDIENTE: "ventana de 10 días" se interpreta como created_at >= ahora - 10 días.
    since = now - timedelta(days=WINDOW_DAYS)
    by_category: dict[str, list[dict]] = {}
    for r in reports:
        if r["current_status"] in CLUSTER_STATUSES and r["created_at"] >= since:
            by_category.setdefault(r["category"], []).append(r)
    result: list[ComputedCluster] = []
    for category in sorted(by_category):
        items = by_category[category]
        coords = [(r["latitude"], r["longitude"]) for r in items]
        for member_idx in dbscan(coords):
            if len(member_idx) < MIN_SAMPLES:
                continue
            members = [items[i] for i in member_idx]
            result.append(
                ComputedCluster(
                    category=category,
                    incident_count=len(members),
                    polygon=build_cluster_polygon([coords[i] for i in member_idx]),
                    window_start=min(m["created_at"] for m in members),
                    window_end=max(m["created_at"] for m in members),
                )
            )
    return result


def cluster_description(category: str, count: int) -> str:
    # DOC-PENDIENTE: el contrato muestra "Zona de concentración de anegamiento (4 reportes activos)" sin
    # definir el sustantivo por categoría; se usa la etiqueta de la categoría.
    return f"Zona de concentración de {CATEGORY_LABELS[category].lower()} ({count} reportes activos)"


def build_cluster_collection(rows: list[dict]) -> ClusterFeatureCollection:
    features = []
    for row in rows:
        geometry = row["geometry"]
        features.append(
            ClusterFeature(
                id=str(row["id"]),
                geometry={"type": "Polygon", "coordinates": geometry["coordinates"]},
                properties={
                    "cluster_id": row["id"],
                    "category": row["category"],
                    "category_label": CATEGORY_LABELS[row["category"]],
                    "color": CATEGORY_COLORS[row["category"]],
                    "incident_count": row["incident_count"],
                    "window_start": row["window_start"],
                    "window_end": row["window_end"],
                    "description": cluster_description(row["category"], row["incident_count"]),
                },
            )
        )
    return ClusterFeatureCollection(features=features)


# --- Persistencia en zonas_concentracion ---
class ClusterRepository:
    def __init__(self, pool_provider: Callable[[], Awaitable[asyncpg.Pool]]):
        self._pool_provider = pool_provider  # pool perezoso, igual que ReportRepository

    async def _get_pool(self) -> asyncpg.Pool:
        return await self._pool_provider()

    async def fetch_candidate_reports(self, since: datetime) -> list[dict]:
        rows = await (await self._get_pool()).fetch(
            """
            SELECT id, categoria AS category, latitud AS latitude, longitud AS longitude,
                   creado_en AS created_at, estado_actual AS current_status
            FROM public.reportes
            WHERE estado_actual = ANY($1::text[]) AND creado_en >= $2
            """,
            CLUSTER_STATUSES, since,
        )
        return [dict(r) for r in rows]

    async def replace_active_clusters(self, clusters: list[ComputedCluster]) -> None:
        # DOC-PENDIENTE: la forma de "actualizar" la tabla no está definida; se desactivan los clusters
        # vigentes y se insertan los nuevos en una sola transacción.
        async with (await self._get_pool()).acquire() as conn:
            async with conn.transaction():
                await conn.execute("SELECT pg_advisory_xact_lock(hashtext('incident_clusters'))")
                await conn.execute(
                    "UPDATE public.zonas_concentracion SET activa = false, actualizado_en = now() WHERE activa = true"
                )
                for c in clusters:
                    await conn.execute(
                        """
                        INSERT INTO public.zonas_concentracion
                            (categoria, cantidad_incidentes, geometria_poligono, inicio_ventana, fin_ventana, activa)
                        VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, true)
                        """,
                        c.category, c.incident_count, json.dumps(mapping(c.polygon)), c.window_start, c.window_end,
                    )

    async def list_active_clusters(self) -> list[dict]:
        rows = await (await self._get_pool()).fetch(
            """
            SELECT id, categoria AS category, cantidad_incidentes AS incident_count,
                   ST_AsGeoJSON(geometria_poligono) AS geojson, inicio_ventana AS window_start, fin_ventana AS window_end
            FROM public.zonas_concentracion WHERE activa = true ORDER BY creado_en ASC
            """
        )
        result = []
        for r in rows:
            item: dict[str, Any] = dict(r)
            item["geometry"] = json.loads(item.pop("geojson"))
            result.append(item)
        return result

    async def count_active_clusters(self) -> int:
        return await (await self._get_pool()).fetchval("SELECT count(*) FROM public.zonas_concentracion WHERE activa = true")


def get_cluster_repository() -> ClusterRepository:
    from database import get_db_pool

    return ClusterRepository(get_db_pool)


async def recalculate_clusters(repo: ClusterRepository, now: datetime | None = None) -> list[ComputedCluster]:
    now = now or datetime.now(timezone.utc)
    reports = await repo.fetch_candidate_reports(now - timedelta(days=WINDOW_DAYS))
    clusters = compute_clusters(reports, now)
    await repo.replace_active_clusters(clusters)
    return clusters


async def recalculate_clusters_in_background(repo: ClusterRepository) -> None:
    """Tarea en segundo plano (01 §9.3): los errores se registran sin afectar la respuesta HTTP."""
    try:
        await recalculate_clusters(repo)
    except Exception as exc:
        logger.exception("Fallo al recalcular zonas de concentración: %s", exc)
