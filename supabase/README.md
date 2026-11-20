# supabase/ — Esquema de la base de NEXO MAP

Carpeta estándar de la CLI de Supabase. Guarda el SQL versionado de la base; la aplicación no la usa en tiempo de ejecución. Proyecto: `irmoexjtcssoopxdfpcd`. Especificación: `docs/tecnica/06. database-storage.md`.

## Migraciones

La base real se creó con el *Table Editor* y con nombres **en español** (`perfiles`, `reportes`, `historial_reportes`, `zonas_concentracion`, `configuracion_usuario`).

| Archivo | ¿Ejecutar? | Motivo |
|---|---|---|
| `migrations/20261118000001_initial_schema.sql` | **No** | Esquema original en inglés (histórico). Fallaría o crearía tablas duplicadas. |
| `migrations/20261118000002_storage_setup.sql` | **No** | Su contenido está incluido en `…0003`. |
| `migrations/20261120000003_esquema_es.sql` | Sí (aplicada el 2026-11-20) | Bucket `incident-photos`, trigger de alta con `rol` fijo `ciudadano`, `es_administrador()` y RLS sin recursión. |
| `migrations/20261120000004_permisos_service_role.sql` | Sí (aplicada el 2026-11-20) | `GRANT` a `service_role` sobre las 5 tablas. |
| `migrations/20261120000005_notificaciones_push.sql` | Sí (aplicada el 2026-11-20) | Columna `configuracion_usuario.token_push` e índice único (notificaciones push). |

Las migraciones aplicables son idempotentes: se pueden volver a ejecutar sin efectos adversos. Cómo ejecutarlas: Supabase → *SQL Editor* → pegar el archivo completo → *Run*.

Configuración manual requerida: *Authentication → Sign In / Providers → User Signups → Confirm email* **desactivado**. Si está activado, el registro desde la app no devuelve sesión y falla.

## Verificación y mantenimiento (`checks/`)

| Archivo | Uso |
|---|---|
| `checks/verify_schema.sql` | Solo lectura. Devuelve en un JSON las extensiones, columnas, restricciones, índices, RLS, trigger, buckets y cantidad de filas. |
| `checks/limpiar_datos_prueba.sql` | **Borra datos.** Elimina los reportes, el historial, las zonas y los usuarios creados durante la integración, salvo los administradores. Revisar antes de ejecutar. |

## Administradores

El registro público siempre crea `ciudadano`. Para crear un operador: registrarlo (app, panel o *Authentication → Users → Add user*) y luego:

```sql
UPDATE public.perfiles SET rol = 'administrador', actualizado_en = timezone('utc', now())
WHERE correo = 'operador@ejemplo.gob.ar';
```
