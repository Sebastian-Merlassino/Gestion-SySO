-- Migration: Create matriculas table for multiple professional licenses
-- File: supabase/migrations/20260616000000_create_matriculas_table.sql

CREATE TABLE IF NOT EXISTS public.matriculas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institucion VARCHAR(255) NOT NULL,
    numero VARCHAR(100) NOT NULL,
    vencimiento DATE,
    foto_frente_url TEXT,
    foto_dorso_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;

-- Politicas RLS
CREATE POLICY matriculas_self_select ON public.matriculas FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY matriculas_self_insert ON public.matriculas FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY matriculas_self_update ON public.matriculas FOR UPDATE TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY matriculas_self_delete ON public.matriculas FOR DELETE TO authenticated USING (profile_id = auth.uid());

-- Migracion de datos existentes de public.profiles a public.matriculas
INSERT INTO public.matriculas (profile_id, institucion, numero, vencimiento, foto_frente_url, foto_dorso_url)
SELECT id, COALESCE(matricula_institucion, 'Matrícula'), matricula_numero, matricula_vencimiento, matricula_foto_frente_url, matricula_foto_dorso_url
FROM public.profiles
WHERE matricula_numero IS NOT NULL AND matricula_numero <> ''
AND NOT EXISTS (
    SELECT 1 FROM public.matriculas WHERE public.matriculas.profile_id = public.profiles.id
);
