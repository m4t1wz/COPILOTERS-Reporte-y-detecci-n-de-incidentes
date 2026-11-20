-- Bucket de fotografías (docs/06. database-storage.md §5; TASK-DB-02).
-- Público para lectura, 5 MB (5242880 bytes), MIME image/jpeg, image/png, image/webp.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'incident-photos',
    'incident-photos',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lectura pública de los objetos del bucket.
-- No se crean políticas de INSERT/UPDATE/DELETE: con RLS activo en storage.objects, los roles
-- anon/authenticated no pueden escribir; solo el backend con service_role (que omite RLS) sube archivos.
CREATE POLICY "Lectura pública de fotografías de incidentes"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'incident-photos');
