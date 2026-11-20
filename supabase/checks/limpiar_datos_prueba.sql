-- NEXO MAP — Limpieza de datos de prueba de la integración.
-- ATENCIÓN: BORRA DATOS. Revisar los SELECT de vista previa antes de ejecutar el bloque final.
-- Conserva los perfiles con rol 'administrador'. Las fotos del bucket se borran aparte desde
-- Storage → incident-photos → reports/ (el SQL no elimina los objetos del bucket).

-- Vista previa
SELECT '#' || lpad(numero_reporte::text, 5, '0') AS numero, categoria, estado_actual, referencia_direccion
FROM public.reportes ORDER BY numero_reporte;
SELECT correo, nombre_completo, rol FROM public.perfiles ORDER BY creado_en;

-- Borrado (descomentar para ejecutar)
-- BEGIN;
-- DELETE FROM public.historial_reportes;
-- DELETE FROM public.reportes;
-- DELETE FROM public.zonas_concentracion;
-- DELETE FROM auth.users WHERE id IN (SELECT id FROM public.perfiles WHERE rol <> 'administrador');
-- COMMIT;
-- Para que la numeración vuelva a empezar en #00001:
-- ALTER TABLE public.reportes ALTER COLUMN numero_reporte RESTART WITH 1;
