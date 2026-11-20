"""Gestión y optimización de fotografías en Supabase Storage
(docs/03. backend.md §4.3; docs/06. database-storage.md §5; docs/01. architecture.md §8.4)."""
import hashlib
import io
import logging
from datetime import datetime
from typing import Callable
from uuid import UUID

from PIL import Image, ImageOps, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from core.exceptions import InvalidInputException

logger = logging.getLogger(__name__)

BUCKET_NAME = "incident-photos"
MAX_PHOTO_BYTES = 5 * 1024 * 1024
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_DIMENSIONS = (1920, 1080)
OUTPUT_QUALITY = 80
OUTPUT_CONTENT_TYPE = "image/webp"


def detect_image_mime(data: bytes) -> str | None:
    """Inspección de cabeceras binarias (magic bytes).

    DOC-PENDIENTE: 03 §4.3 admite python-magic "o inspección de streams"; se inspeccionan las cabeceras
    directamente para no depender de libmagic nativo.
    """
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(data) >= 12 and data[0:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def validate_photo(data: bytes) -> str:
    # DOC-PENDIENTE: el código de error para fotos inválidas no está definido; se usa 400 INVALID_INPUT.
    if len(data) > MAX_PHOTO_BYTES:
        raise InvalidInputException(
            "La fotografía supera el tamaño máximo de 5 MB.", {"max_bytes": MAX_PHOTO_BYTES}
        )
    mime = detect_image_mime(data)
    if mime not in ALLOWED_MIME_TYPES:
        raise InvalidInputException(
            "Formato de fotografía no permitido. Solo se aceptan JPEG, PNG y WebP.",
            {"allowed_mime_types": sorted(ALLOWED_MIME_TYPES)},
        )
    return mime


def optimize_photo(data: bytes) -> bytes:
    """Reescala a máx. 1920x1080, aplica la orientación EXIF, elimina metadatos y recomprime a WebP q80."""
    try:
        with Image.open(io.BytesIO(data)) as img:
            img.load()
            img = ImageOps.exif_transpose(img)  # preserva la orientación antes de descartar el EXIF
            img.thumbnail(MAX_DIMENSIONS, Image.Resampling.LANCZOS)
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
            out = io.BytesIO()
            img.save(out, format="WEBP", quality=OUTPUT_QUALITY)  # sin exif= → metadatos eliminados
            return out.getvalue()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError) as exc:
        raise InvalidInputException("La fotografía no es una imagen válida.") from exc


def build_object_path(report_id: UUID, when: datetime, content: bytes) -> str:
    """reports/{YYYY}/{MM}/{report_id}_{hash}.webp (06 §5.2)."""
    digest = hashlib.sha256(content).hexdigest()[:8]
    return f"reports/{when:%Y}/{when:%m}/{report_id}_{digest}.webp"


class StorageService:
    def __init__(self, client_getter: Callable):
        self._client_getter = client_getter

    def prepare_photo(self, data: bytes) -> bytes:
        validate_photo(data)
        return optimize_photo(data)

    async def upload_report_photo(self, report_id: UUID, optimized: bytes, when: datetime) -> tuple[str, str]:
        """Sube la imagen optimizada al bucket y devuelve (ruta, URL pública)."""
        path = build_object_path(report_id, when, optimized)
        bucket = self._client_getter().storage.from_(BUCKET_NAME)
        await run_in_threadpool(
            bucket.upload, path, optimized, {"content-type": OUTPUT_CONTENT_TYPE, "upsert": "false"}
        )
        return path, bucket.get_public_url(path)

    async def delete_photo(self, path: str) -> None:
        try:
            bucket = self._client_getter().storage.from_(BUCKET_NAME)
            await run_in_threadpool(bucket.remove, [path])
        except Exception as exc:  # limpieza de mejor esfuerzo
            logger.warning("No se pudo eliminar la foto huérfana %s: %s", path, exc)


def get_storage_service() -> StorageService:
    from database import get_supabase_client

    return StorageService(get_supabase_client)
