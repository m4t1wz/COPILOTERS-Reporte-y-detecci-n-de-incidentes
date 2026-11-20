# NEXO MAP

Repositorio del sistema de reporte y seguimiento de incidentes territoriales (Formosa, Argentina).

---

## Problema
Durante una emergencia pueden recibirse numerosos avisos sobre situaciones que requieren atención: calles anegadas, caminos interrumpidos, viviendas afectadas, árboles caídos u otros incidentes. Cuando la información se encuentra dispersa, resulta difícil localizar cada situación, verificarla y realizar su seguimiento.

---

## ¿Cómo lo solucionamos?
Con **NEXO MAP**, una aplicación móvil ciudadana y panel georreferenciado que centraliza y visualiza los incidentes territoriales en tiempo real en un mapa interactivo. Permite a los ciudadanos reportar situaciones con coordenadas GPS, fotos y descripción, y realizar el seguimiento cronológico del estado de cada aviso hasta su resolución.

---

## Tecnologías Utilizadas
- **Aplicación Móvil:** React Native, Expo SDK 52, TypeScript, MapLibre Native, Expo Notifications.
- **Panel Administrativo:** React 18, Vite, TypeScript, Tailwind, TanStack Query, MapLibre GL.
- **Backend:** Python 3.14, FastAPI, asyncpg, Shapely.
- **Base de Datos y Almacenamiento:** Supabase (PostgreSQL con PostGIS, Auth y Storage).
- **Cartografía:** OpenFreeMap (mosaicos vectoriales) y MapLibre; direcciones con Nominatim (OpenStreetMap).
- **Notificaciones push:** Expo Push + Firebase Cloud Messaging.

---

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `mobile-app/` | App ciudadana (Expo / EAS Build) |
| `admin-web/` | Panel de operadores (React + Vite) |
| `backend/` | API REST (FastAPI + asyncpg + Supabase), con `Dockerfile` y pruebas |
| `supabase/` | Migraciones SQL y verificación del esquema de la base |
| `docs/tecnica/` | Documentación técnica: arquitectura, contratos, especificación de cada componente y sistema de diseño (índice en `docs/tecnica/INDICE_DOCUMENTACION.md`) |

---

## Puesta en marcha (Windows, red local)

Requisitos: Node.js 24, Python 3.14 (lanzador `py`) y el APK de desarrollo de NEXO MAP instalado en el teléfono. La PC y el teléfono deben estar en la misma red Wi-Fi. En los ejemplos, `192.168.1.7` es la IP de la PC: si cambia, hay que actualizarla en los tres `.env` y en `ALLOWED_ORIGINS`.

### 1. Base de datos (una sola vez)
En Supabase → *SQL Editor*, ejecutar `supabase/migrations/20261120000003_esquema_es.sql` y `20261120000004_permisos_service_role.sql`. Las migraciones `…0001` y `…0002` son históricas y **no** se ejecutan (ver `supabase/README.md`). En *Authentication → Sign In / Providers*, desactivar **Confirm email**.

### 2. Backend (puerto 8000)
```powershell
cd backend
py -3.14 -m venv .venv                                   # solo la primera vez
.venv\Scripts\python -m pip install -r requirements.txt  # solo la primera vez
Copy-Item .env.example .env                              # completar credenciales de Supabase
.venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
`backend\.env`: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable), `SUPABASE_SERVICE_ROLE_KEY` (secret), `SUPABASE_JWT_SECRET` (vacío: el proyecto firma con ECC P-256 y el backend usa JWKS), `DATABASE_URL` (*Session pooler*, sin corchetes alrededor de la contraseña) y `ALLOWED_ORIGINS` (incluir `http://localhost:5173` y `http://192.168.1.7:5173`). Salud: http://localhost:8000/health · documentación interactiva: http://localhost:8000/docs

### 3. Panel administrativo (puerto 5173)
```powershell
cd admin-web
npm install                                              # solo la primera vez
"VITE_API_URL=http://192.168.1.7:8000/api/v1" | Set-Content -Encoding ascii .env
npm run dev -- --host
```
Abrir http://localhost:5173 e ingresar con un usuario cuyo `perfiles.rol` sea `administrador`. Los operadores se promueven por SQL (`06. database-storage.md` §3.2).

### 4. App móvil (Metro, puerto 8081)
```powershell
cd mobile-app
npm install                                              # solo la primera vez
"EXPO_PUBLIC_API_URL=http://192.168.1.7:8000/api/v1" | Set-Content -Encoding ascii .env
npx expo start --dev-client --lan -c
```
En el teléfono, abrir NEXO MAP; si no conecta solo, ingresar `http://192.168.1.7:8081`. Cambiar código JS no requiere un APK nuevo; cambiar módulos nativos, el ícono o el splash sí (`eas build --profile development --platform android`).

### Sin backend
No hay modo de demostración: la app y el panel trabajan solo con el backend real. Si no responde, cada pantalla muestra «No se pudo conectar con el servidor» y no se puede iniciar sesión, reportar ni gestionar.

### Pruebas
- Backend: `cd backend; .venv\Scripts\python -m pytest -q`; recorrido HTTP real: `.venv\Scripts\python -m tests.http_flow http://127.0.0.1:8000 <email-admin> <clave-admin>`.
- Panel: `cd admin-web; npm test`; E2E contra la API real: ver `admin-web/scripts/e2e-cdp.mjs` (variables `E2E_*`).
- App: `cd mobile-app; npx jest`.
