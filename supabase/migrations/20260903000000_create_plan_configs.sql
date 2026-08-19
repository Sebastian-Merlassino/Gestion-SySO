-- supabase/migrations/20260903000000_create_plan_configs.sql

CREATE TABLE IF NOT EXISTS public.plan_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    updated_at TIMESTAMPTZ DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE public.plan_configs ENABLE ROW LEVEL SECURITY;

-- Política de lectura: accesible para todos los usuarios autenticados
CREATE POLICY "Lectura pública de configuraciones de planes"
ON public.plan_configs
FOR SELECT
TO authenticated, anon
USING (true);

-- Política de escritura: restringida a superadministradores
CREATE POLICY "Superadmin gestiona configuraciones de planes"
ON public.plan_configs
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_superadmin = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_superadmin = true
    )
);

-- Seed inicial de precios con los planes estándar
INSERT INTO public.plan_configs (id, name, price)
VALUES 
    ('basic_5', 'Plan 25000', 25000),
    ('standard_25', 'Plan 35000', 35000),
    ('libre', 'Plan Full', 45000)
ON CONFLICT (id) DO NOTHING;
