-- Migración para crear la tabla de registros y poblarla
CREATE TABLE IF NOT EXISTS public.registros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública
CREATE POLICY "Permitir lectura publica de registros" ON public.registros
    FOR SELECT TO public USING (true);

-- Insertar catálogo de registros
INSERT INTO public.registros (nombre) VALUES
('Análisis bacteriológico de agua de consumo humano'),
('Análisis fisicoquímico de agua de consumo humano'),
('Anexo - Resolución 84/12 (Protocolo de Iluminación)'),
('Anexo - Resolución 85/12 (Protocolo de ruido)'),
('Anexo - Resolución 861/15 (Protocolo para Medición de Contaminantes Químicos en el Aire de un Ambiente de Trabajo)'),
('Anexo - Resolución 900/15 (Protocolo de medición de la puesta a tierra y continuidad de las masas)'),
('Anexo 1 - Resolución 886/15 (Protocolo de Ergonomía)'),
('Aviso de riesgo'),
('Certificado de aptitud técnica y de seguridad (GLP)'),
('Certificado de instalaciónes de almacenamiento de hidrocarburos'),
('Certificado de limpieza de campanas, conductos y afines'),
('Certificado de limpieza de tanque de agua para consumo humano'),
('Constancia de visita'),
('Control trimestral de Extintores'),
('Declaración jurada para informar la presencia de Sustancias y Agentes Cancerígenos (S.V.C.C.)'),
('Estudio de Carga de Fuego'),
('Estudio de exposición a laser'),
('Estudio de radiaciones ionizantes'),
('Estudio de radiaciones no ionizantes'),
('Estudio de ventilación'),
('Estudio de Vibraciones (cuerpo entero)'),
('Estudio de Vibraciones (mano – brazo)'),
('Estudio Ergonómico'),
('Exámenes médicos periódicos'),
('Ficha de seguridad'),
('Habilitación / Renovación de los Aparatos Sometidos a Presión'),
('Informe Antisiniestral'),
('Informe de investigación accidente de trabajo'),
('Informe de simulacro de derrame de producto químico'),
('Informe de simulacro de evacuación'),
('Informe trimestral del RENPRE'),
('Inspección anual, Habilitación / renovación de A.S.P.'),
('Inspección Visual de Instalaciones Eléctricas (trimestral)'),
('Manual de procedimientos del Servicio de Higiene y Seguridad'),
('Mapa de Riesgos Laborales'),
('Matríz de cumplimiento legal'),
('Matriz de identificación de peligros y evaluación de riesgos'),
('Minuta del Comité Mixto de Higiene y Seguridad en el Trabajo'),
('Plan de Acciones Correctivas'),
('Plan de Evacuación'),
('Planos generales de evacuación'),
('Política del establecimiento en materia de Seguridad y Salud en el Trabajo'),
('Programa Anual de Capacitación en materia de Higiene y Seguridad en el Trabajo'),
('Programa de Higiene y Seguridad en el Trabajo'),
('Programa de mantenimiento preventivo y correctivo de instalaciones eléctricas'),
('Programa de mantenimiento preventivo y correctivo de máquinas y equipos (Aparatos para izar, Ascensores y Montacargas, Calderas y recipientes a presión, etc.)'),
('Programa de mantenimiento preventivo y correctivo de sistema de extracción, ductos cañerías, filtros, campanas, etc.'),
('Programa de Seguridad (Res. 319/99)'),
('Programa de Seguridad (Res. 35/98)'),
('Programa de Seguridad (Res. 51/97)'),
('Protocolo de medición de estrés por calor en el ambiente laboral'),
('Certificado de aplicación de retardante de llamas - tratamiento ignífugo'),
('Registro de Campanas, Conductos y Afines'),
('Registro de capacitación'),
('Registro de Instalaciones Térmicas (RIT)'),
('Relevamiento de Agentes de Riesgos'),
('Relevamiento General de Riesgos Laborales'),
('Renovación anual del RENPRE (Sedronar)'),
('Sistema de Autoprotección')
ON CONFLICT (nombre) DO NOTHING;
