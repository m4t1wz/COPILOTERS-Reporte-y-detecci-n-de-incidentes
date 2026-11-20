"""Recorrido completo de la API por HTTP real: registro → reporte → consulta → cambio de estado → historial.

Funciona contra el servidor simulado (tests/simulated_server.py) o contra el backend real con Supabase.

Uso (desde backend/):
    .venv\\Scripts\\python -m tests.http_flow [base_url] [admin_email] [admin_password]
Por defecto: http://127.0.0.1:8001  admin@formosa.gob.ar  AdminDePrueba123!
Termina con código 0 si todas las comprobaciones pasan.
"""
import io
import sys
import uuid

import httpx
from PIL import Image

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8001"
ADMIN_EMAIL = sys.argv[2] if len(sys.argv) > 2 else "admin@formosa.gob.ar"
ADMIN_PASSWORD = sys.argv[3] if len(sys.argv) > 3 else "AdminDePrueba123!"
LAT, LON = -26.1852, -58.1738  # Formosa Capital


def check(label: str, condition: bool, detail: object = "") -> None:
    print(f"[{'OK' if condition else 'FALLA'}] {label}" + (f" -> {detail}" if detail != "" else ""))
    if not condition:
        sys.exit(1)


def jpeg() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (2400, 1600), (40, 110, 190)).save(buf, format="JPEG")
    return buf.getvalue()


def main() -> None:
    with httpx.Client(base_url=BASE, timeout=30) as c:
        r = c.get("/health")
        check("GET /health", r.status_code == 200 and r.json()["service"] == "nexo-map-api", r.json())

        email = f"ciudadano-{uuid.uuid4().hex[:8]}@example.com"
        r = c.post("/api/v1/auth/register", json={"email": email, "password": "ClaveDePrueba123!",
                                                  "full_name": "Ciudadano HTTP", "phone_number": "+543704111111"})
        check("POST /auth/register 201", r.status_code == 201, r.status_code)
        r = c.post("/api/v1/auth/login", json={"email": email, "password": "ClaveDePrueba123!"})
        check("POST /auth/login 200 role=citizen", r.status_code == 200 and r.json()["user"]["role"] == "citizen")
        citizen = {"Authorization": f"Bearer {r.json()['session']['access_token']}"}

        r = c.post("/api/v1/reports", data={"category": "calle_anegada", "latitude": "-25.2637",
                                            "longitude": "-57.5759", "comment": "Prueba fuera de Formosa"},
                   headers=citizen)
        check("POST /reports fuera de Formosa -> 422 OUTSIDE_TERRITORY",
              r.status_code == 422 and r.json()["error"]["code"] == "OUTSIDE_TERRITORY", r.status_code)
        r = c.post("/api/v1/reports", data={"category": "otro", "latitude": str(LAT), "longitude": str(LON)},
                   headers=citizen)
        check("POST /reports sin foto ni comentario -> 422 COMMENT_OR_PHOTO_REQUIRED",
              r.status_code == 422 and r.json()["error"]["code"] == "COMMENT_OR_PHOTO_REQUIRED", r.status_code)

        r = c.post("/api/v1/reports", data={"category": "calle_anegada", "latitude": str(LAT), "longitude": str(LON),
                                            "comment": "El agua supera la vereda."},
                   files={"photo": ("calle.jpg", jpeg(), "image/jpeg")}, headers=citizen)
        check("POST /reports con foto -> 201", r.status_code == 201, r.status_code)
        card = r.json()["confirmation"]
        report_id = card["report_id"]
        check("Tarjeta de confirmación", card["status"] == "pendiente" and card["photo_url"].endswith(".webp"),
              f"{card['report_number']} {card['status_label']}")

        r = c.get(f"/api/v1/incidents/{report_id}")
        check("GET /incidents/{id} público", r.status_code == 200 and r.json()["status"] == "pendiente")
        r = c.get(f"/api/v1/reports/me/{report_id}", headers=citizen)
        check("GET /reports/me/{id} timeline inicial", r.status_code == 200 and len(r.json()["timeline"]) == 1)

        r = c.post("/api/v1/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        check("Login admin", r.status_code == 200 and r.json()["user"]["role"] == "admin")
        admin = {"Authorization": f"Bearer {r.json()['session']['access_token']}"}

        r = c.get("/api/v1/admin/reports", headers=citizen)
        check("Ciudadano en /admin -> 403 FORBIDDEN_RESOURCE", r.status_code == 403)
        r = c.patch(f"/api/v1/admin/reports/{report_id}/status", json={"new_status": "resuelto"}, headers=admin)
        check("pendiente -> resuelto -> 409", r.status_code == 409, r.json()["error"]["code"])
        r = c.patch(f"/api/v1/admin/reports/{report_id}/status",
                    json={"new_status": "en_revision", "admin_comment": "Cuadrilla enviada", "notify_citizen": True},
                    headers=admin)
        check("PATCH pendiente -> en_revision", r.status_code == 200 and r.json()["current_status"] == "en_revision")

        r = c.get(f"/api/v1/admin/reports/{report_id}/history", headers=admin)
        history = r.json()["history"]
        check("Historial registra el cambio y el operador",
              [h["new_status"] for h in history] == ["pendiente", "en_revision"]
              and history[1]["admin_comment"] == "Cuadrilla enviada" and history[1]["changed_by"]["role"] == "admin",
              [(h["previous_status"], h["new_status"], h["changed_by"]["name"]) for h in history])

        r = c.get(f"/api/v1/reports/me/{report_id}", headers=citizen)
        timeline = r.json()["timeline"]
        check("Timeline del ciudadano muestra el comentario",
              timeline[-1]["title"] == "En revisión" and timeline[-1]["admin_comment"] == "Cuadrilla enviada")

        r = c.get("/api/v1/admin/dashboard/stats", headers=admin)
        check("Dashboard stats", r.status_code == 200 and r.json()["in_review_reports"] >= 1, r.json())
    print("Recorrido completo: OK")


if __name__ == "__main__":
    main()
