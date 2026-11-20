-- Verificación de solo lectura del esquema de NEXO MAP.
-- Ejecutar en Supabase: SQL Editor → pegar → Run. Copiar la única celda del resultado (JSON).
-- No modifica nada.
SELECT jsonb_pretty(jsonb_build_object(
  'extensions', (
    SELECT jsonb_agg(extname || ' ' || extversion ORDER BY extname)
    FROM pg_extension WHERE extname IN ('postgis', 'uuid-ossp', 'pgcrypto')
  ),
  'columns', (
    SELECT jsonb_object_agg(table_name, cols) FROM (
      SELECT table_name,
             jsonb_agg(column_name || ' ' || data_type || CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END
                       || CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END
                       || CASE WHEN is_identity = 'YES' THEN ' IDENTITY' ELSE '' END
                       ORDER BY ordinal_position) AS cols
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('perfiles', 'reportes', 'historial_reportes', 'zonas_concentracion', 'configuracion_usuario')
      GROUP BY table_name
    ) t
  ),
  'geometry_columns', (
    SELECT jsonb_agg(f_table_name || '.' || f_geometry_column || ' ' || type || ' ' || srid)
    FROM geometry_columns WHERE f_table_schema = 'public'
  ),
  'constraints', (
    SELECT jsonb_agg(conrelid::regclass::text || ': ' || conname || ' ' || pg_get_constraintdef(oid) ORDER BY conrelid::regclass::text, conname)
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace AND contype IN ('c', 'f', 'p', 'u')
  ),
  'indexes', (
    SELECT jsonb_agg(indexname ORDER BY indexname) FROM pg_indexes WHERE schemaname = 'public'
  ),
  'rls_enabled', (
    SELECT jsonb_object_agg(relname, relrowsecurity)
    FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
  ),
  'policies', (
    SELECT jsonb_agg(schemaname || '.' || tablename || ' [' || cmd || '] ' || policyname ORDER BY schemaname, tablename, policyname)
    FROM pg_policies WHERE schemaname IN ('public', 'storage')
  ),
  'auth_trigger', (
    SELECT jsonb_agg(tgname || ' -> ' || tgfoid::regproc::text)
    FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal
  ),
  'auth_trigger_functions', (
    SELECT jsonb_agg(pg_get_functiondef(p.oid)) FROM pg_proc p
    JOIN pg_trigger t ON t.tgfoid = p.oid AND t.tgrelid = 'auth.users'::regclass AND NOT t.tgisinternal
  ),
  'buckets', (
    SELECT jsonb_agg(id || ' public=' || public || ' limit=' || coalesce(file_size_limit::text, 'null')
                     || ' mime=' || coalesce(array_to_string(allowed_mime_types, ','), 'null'))
    FROM storage.buckets
  ),
  'row_counts', jsonb_build_object(
    'perfiles', (SELECT count(*) FROM public.perfiles),
    'reportes', (SELECT count(*) FROM public.reportes),
    'historial_reportes', (SELECT count(*) FROM public.historial_reportes),
    'administradores', (SELECT count(*) FROM public.perfiles WHERE rol = 'administrador'),
    'usuarios_auth', (SELECT count(*) FROM auth.users)
  )
)) AS esquema_nexo_map;
