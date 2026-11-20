-- NEXO MAP — Permisos del rol service_role sobre las tablas creadas con el Table Editor (INT-05).
-- Síntoma: la API REST de Supabase con la clave secreta respondía 42501 "permission denied for table perfiles".
-- service_role omite RLS, pero igual necesita GRANT sobre las tablas. Los clientes (anon/authenticated)
-- no reciben permisos nuevos: la app y el panel acceden solo a través del backend.
-- Idempotente. Ejecutar en Supabase: SQL Editor → pegar → Run.

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON TABLE
    public.perfiles,
    public.reportes,
    public.historial_reportes,
    public.zonas_concentracion,
    public.configuracion_usuario
TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
