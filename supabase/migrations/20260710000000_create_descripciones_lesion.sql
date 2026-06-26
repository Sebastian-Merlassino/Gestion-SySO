-- 20260710000000_create_descripciones_lesion.sql
-- Creación de la tabla de catálogo de Descripciones de Lesión

CREATE TABLE IF NOT EXISTS public.descripciones_lesion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.descripciones_lesion ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública para cualquier usuario autenticado o anónimo
CREATE POLICY "Permitir lectura publica de descripciones_lesion" ON public.descripciones_lesion
    FOR SELECT TO public USING (true);

-- Insertar catálogo de descripciones de lesión
INSERT INTO public.descripciones_lesion (nombre) VALUES
('Amputaciones'),
('Asfixia'),
('Contacto directo con el fuego'),
('Contusiones'),
('Cuerpo extraño en ojos'),
('Desgarro'),
('Disfunciones orgánicas'),
('Distención muscular'),
('Efectos de atricción y aplastamiento'),
('Efectos de Calor e Insolación'),
('Efectos de compresión y aplastamiento'),
('Efectos de cuerpo extraño en oído'),
('Efectos de impacto psíquico'),
('Efectos de la electricidad'),
('Efectos de la presión'),
('Efectos de las radiaciones'),
('Efectos del frío'),
('Efectos por picadura'),
('Efextos de cuerpo extraño en nariz'),
('Enucleación ocular'),
('Escoriaciones'),
('Esguinces'),
('Fracturas'),
('Fracturas cerradas'),
('Fracturas expuestas'),
('Gangrenas'),
('Heridas contuso/anfractuosas'),
('Heridas cortantes'),
('Heridas de arma blanca'),
('Heridas de bala'),
('Heridas punzantes'),
('Infecciones'),
('Intoxicaciones'),
('Lesiones inflamatorias cutaneas'),
('Luxaciones'),
('Perdida auditiva'),
('Pérdida de Tejidos'),
('Quemaduras'),
('Quemaduras Químicas'),
('Quemaduras térmicas'),
('Torceduras'),
('Torceduras y Esguinces'),
('Traumatismos internos'),
('Otras Lesiones'),
('No Aplica')
ON CONFLICT (nombre) DO NOTHING;

-- Notificar recarga de caché a PostgREST
NOTIFY pgrst, 'reload schema';
