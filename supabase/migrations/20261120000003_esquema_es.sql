-- NEXO MAP — Complementos sobre el esquema real en español.
-- La base del proyecto se creó a mano con nombres en español (perfiles, reportes, historial_reportes,
-- zonas_concentracion, configuracion_usuario). Esta migración NO crea ni modifica tablas ni datos:
--   1. Storage: bucket público 'incident-photos' (06 §5).
--   2. Seguridad (D3): el alta de usuarios fija rol = 'ciudadano'; ya no se lee el rol de los metadatos
--      enviados por el cliente. Los administradores se promueven solo por SQL (ver bloque final).
--   3. RLS sin recursión (D4): la comprobación de administrador pasa a una función SECURITY DEFINER.
-- Es idempotente: puede ejecutarse más de una vez.
-- Ejecutar en Supabase: SQL Editor → pegar todo → Run.

BEGIN;

-- 1. Storage ------------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('incident-photos', 'incident-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lectura pública explícita. Sin políticas de INSERT/UPDATE/DELETE: solo el backend (service_role) escribe.
-- Un bucket público ya sirve sus URLs públicas sin esta política; si el rol del editor no es dueño de
-- storage.objects, se omite sin interrumpir la migración.
DO $$
BEGIN
    DROP POLICY IF EXISTS "Lectura pública de fotografías de incidentes" ON storage.objects;
    CREATE POLICY "Lectura pública de fotografías de incidentes"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'incident-photos');
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Sin permisos sobre storage.objects: se omite la política (el bucket es público).';
END $$;

-- 2. Alta de usuarios con rol fijo (D3) -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.manejar_nuevo_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    INSERT INTO public.perfiles (id, correo, nombre_completo, telefono, rol)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nombre_completo', new.raw_user_meta_data->>'full_name', 'Ciudadano'),
        COALESCE(new.raw_user_meta_data->>'telefono', new.raw_user_meta_data->>'phone_number'),
        'ciudadano'
    );

    INSERT INTO public.configuracion_usuario (id_usuario)
    VALUES (new.id);

    RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS al_crear_usuario_autenticado ON auth.users;
CREATE TRIGGER al_crear_usuario_autenticado
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.manejar_nuevo_usuario();

-- 3. RLS sin recursión (D4) ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_administrador()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'administrador'
    );
$function$;

REVOKE ALL ON FUNCTION public.es_administrador() FROM public;
GRANT EXECUTE ON FUNCTION public.es_administrador() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Lectura de perfil propio o por administrador" ON public.perfiles;
CREATE POLICY "Lectura de perfil propio o por administrador"
    ON public.perfiles FOR SELECT
    USING (auth.uid() = id OR public.es_administrador());

DROP POLICY IF EXISTS "Solo administradores pueden modificar reportes" ON public.reportes;
CREATE POLICY "Solo administradores pueden modificar reportes"
    ON public.reportes FOR UPDATE
    USING (public.es_administrador());

DROP POLICY IF EXISTS "Lectura de historial de reportes propios o por administradores" ON public.historial_reportes;
CREATE POLICY "Lectura de historial de reportes propios o por administradores"
    ON public.historial_reportes FOR SELECT
    USING (
        public.es_administrador()
        OR EXISTS (SELECT 1 FROM public.reportes r WHERE r.id = id_reporte AND r.id_ciudadano = auth.uid())
    );

COMMIT;

-- 4. Alta del primer administrador (manual, una sola vez) ------------------------------------------
-- a) Registrar el usuario desde la app, el panel o Supabase (Authentication → Users → Add user).
-- b) Ejecutar, reemplazando el correo:
--    UPDATE public.perfiles SET rol = 'administrador', actualizado_en = timezone('utc', now())
--    WHERE correo = 'operador@ejemplo.gob.ar';
