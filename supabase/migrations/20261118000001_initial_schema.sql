-- Esquema inicial transcrito de docs/06. database-storage.md (Secciones 3 y 6).
-- TASK-DB-01 (docs/07. implementation-plan.md).

-- 3.1. Habilitación de Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 3.2. Tabla profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    role TEXT NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- DOC-PENDIENTE: el trigger toma 'role' de raw_user_meta_data. Un registro directo contra Supabase Auth
-- con la anon_key podría enviar role='admin'. Se transcribe tal cual la especificación.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, phone_number, role)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Ciudadano'),
        new.raw_user_meta_data->>'phone_number',
        COALESCE(new.raw_user_meta_data->>'role', 'citizen')
    );

    INSERT INTO public.user_settings (user_id)
    VALUES (new.id);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.3. Tabla reports
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_number INT GENERATED ALWAYS AS IDENTITY,
    citizen_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    category TEXT NOT NULL CHECK (category IN (
        'calle_anegada',
        'camino_interrumpido',
        'desborde_rio_riacho',
        'vivienda_estructura_daniada',
        'arbol_caido',
        'obstruccion_desague',
        'poste_cable_caido',
        'danos_infraestructura_publica',
        'corte_servicios_basicos',
        'otro'
    )),
    comment TEXT,
    photo_url TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address_reference TEXT NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    current_status TEXT NOT NULL DEFAULT 'pendiente' CHECK (current_status IN (
        'pendiente',
        'en_revision',
        'verificado',
        'descartado',
        'en_seguimiento',
        'resuelto'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

    CONSTRAINT chk_photo_or_comment CHECK (
        (photo_url IS NOT NULL AND length(photo_url) > 0) OR
        (comment IS NOT NULL AND length(trim(comment)) > 0)
    )
);

CREATE INDEX idx_reports_geom ON public.reports USING GIST (geom);
CREATE INDEX idx_reports_citizen_id ON public.reports (citizen_id);
CREATE INDEX idx_reports_status ON public.reports (current_status);
CREATE INDEX idx_reports_category ON public.reports (category);
CREATE INDEX idx_reports_created_at ON public.reports (created_at DESC);

-- 3.4. Tabla report_history
CREATE TABLE public.report_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    previous_status TEXT CHECK (previous_status IN ('pendiente', 'en_revision', 'verificado', 'descartado', 'en_seguimiento', 'resuelto')),
    new_status TEXT NOT NULL CHECK (new_status IN ('pendiente', 'en_revision', 'verificado', 'descartado', 'en_seguimiento', 'resuelto')),
    changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    admin_comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_report_history_report_id ON public.report_history (report_id, created_at ASC);

-- 3.5. Tabla incident_clusters
CREATE TABLE public.incident_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    incident_count INT NOT NULL DEFAULT 3,
    polygon_geom GEOMETRY(Polygon, 4326) NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_incident_clusters_geom ON public.incident_clusters USING GIST (polygon_geom);
CREATE INDEX idx_incident_clusters_active ON public.incident_clusters (is_active) WHERE is_active = true;

-- 3.6. Tabla user_settings
CREATE TABLE public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    push_notifications_enabled BOOLEAN NOT NULL DEFAULT false,
    theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
    font_size TEXT NOT NULL DEFAULT 'normal' CHECK (font_size IN ('normal', 'large', 'xlarge')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 6. Políticas de Seguridad (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- DOC-PENDIENTE: esta política consulta public.profiles dentro de una política de public.profiles;
-- PostgreSQL la rechaza en tiempo de consulta ("infinite recursion detected in policy") para clientes
-- directos. El backend usa service_role (omite RLS). Se transcribe tal cual la especificación.
CREATE POLICY "Lectura pública de perfil básico"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Modificación de perfil propio"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Cualquier persona puede ver incidentes públicos activos"
    ON public.reports FOR SELECT
    USING (current_status NOT IN ('descartado'));

CREATE POLICY "Ciudadanos autenticados pueden insertar sus propios reportes"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = citizen_id);

CREATE POLICY "Solo administradores pueden modificar estados de reportes"
    ON public.reports FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Lectura de historial de reportes propios o administradores"
    ON public.report_history FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.reports r WHERE r.id = report_id AND (r.citizen_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        ))
    ));

CREATE POLICY "Lectura pública de zonas de concentración activas"
    ON public.incident_clusters FOR SELECT
    USING (is_active = true);
