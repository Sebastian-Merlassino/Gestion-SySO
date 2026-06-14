-- 20260613000000_create_geography_table.sql
-- Creación de la tabla de geografía de Argentina (Provincias, Departamentos/Partidos y Localidades/Barrios)

CREATE TABLE IF NOT EXISTS public.geografia (
    id SERIAL PRIMARY KEY,
    provincia VARCHAR(255) NOT NULL,
    departamento_partido VARCHAR(255) NOT NULL,
    localidad_barrio VARCHAR(255) NOT NULL,
    UNIQUE (provincia, departamento_partido, localidad_barrio)
);

-- Índices para optimizar las consultas dinámicas jerárquicas
CREATE INDEX IF NOT EXISTS idx_geografia_provincia ON public.geografia(provincia);
CREATE INDEX IF NOT EXISTS idx_geografia_prov_localidad ON public.geografia(provincia, localidad_barrio);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.geografia ENABLE ROW LEVEL SECURITY;

-- Eliminar política si existe
DROP POLICY IF EXISTS geografia_public_select ON public.geografia;

-- Política de lectura pública para cualquier usuario autenticado o anónimo
CREATE POLICY geografia_public_select ON public.geografia
    FOR SELECT TO public USING (true);
