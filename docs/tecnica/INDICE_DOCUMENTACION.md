# NEXO MAP — Índice de la Documentación Técnica

Documentación técnica del sistema de reporte y seguimiento de incidentes territoriales de Formosa (Argentina). Describe la arquitectura, los contratos entre componentes y la especificación de cada pieza: app móvil, panel administrativo, backend y base de datos.

## Documentos

| Documento | Contenido |
| :--- | :--- |
| `PROJECT_CONTEXT.md` | Problema, requisitos funcionales y alcance del sistema. |
| `01. architecture.md` | Arquitectura general, flujos principales, seguridad y riesgos. |
| `02. system-contracts.md` | Contratos HTTP REST: endpoints, esquemas JSON, errores RFC 7807 y paginación. |
| `03. backend.md` | API en Python FastAPI: servicios, seguridad, geocodificación, fotos, máquina de estados, zonas de concentración, límite de pedidos y notificaciones push. |
| `04. admin-web.md` | Panel administrativo web (React + Vite): pantallas, mapa operativo y gestión de estados. |
| `05. mobile-app.md` | App móvil ciudadana (React Native + Expo): reporte asistido, mapa, «Mis reportes», accesibilidad, tema y notificaciones. |
| `06. database-storage.md` | Esquema real de Supabase (PostgreSQL + PostGIS, nombres en español), RLS, Storage y correspondencia con la API. |
| `07. implementation-plan.md` | Plan de implementación por fases. |
| `08. visual-design-system.md` | Sistema de diseño compartido: paleta del logo, tipografía Inter, iconos Lucide, componentes y micro-interacciones. |
| `architecture-decisions.md` | Decisiones de arquitectura (ADR). |

## Código relacionado en el repositorio

| Carpeta | Contenido |
| :--- | :--- |
| `mobile-app/` | App ciudadana (Expo Dev Client / EAS Build). |
| `admin-web/` | Panel de operadores (React + Vite). |
| `backend/` | API REST (FastAPI + asyncpg + Supabase), con su `Dockerfile` y pruebas. |
| `supabase/` | Migraciones SQL aplicables, verificación de solo lectura del esquema y script de limpieza de datos de prueba (ver `supabase/README.md`). |

La puesta en marcha del sistema completo está en el `README.md` de la raíz del repositorio.
