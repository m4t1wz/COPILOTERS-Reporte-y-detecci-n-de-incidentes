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
