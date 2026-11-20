-- NEXO MAP — Token de notificaciones push por usuario.
-- configuracion_usuario ya tiene notificaciones_push_activas (inicia en false, PROJECT_CONTEXT).
-- token_push guarda el identificador que Expo/Firebase asigna a la app instalada en el teléfono
-- (ExponentPushToken[...]). Un token pertenece a un solo usuario (índice único parcial).
-- Idempotente. Ejecutar en Supabase: SQL Editor → pegar → Run.

ALTER TABLE public.configuracion_usuario
    ADD COLUMN IF NOT EXISTS token_push TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_configuracion_usuario_token_push
    ON public.configuracion_usuario (token_push)
    WHERE token_push IS NOT NULL;
