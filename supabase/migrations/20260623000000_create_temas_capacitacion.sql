-- Migración para crear la tabla de temas de capacitación
CREATE TABLE IF NOT EXISTS public.temas_capacitacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tema TEXT NOT NULL UNIQUE,
    contenido TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.temas_capacitacion ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública
CREATE POLICY "Permitir lectura publica de temas_capacitacion" ON public.temas_capacitacion
    FOR SELECT TO public USING (true);

-- Insertar catálogo de temas de capacitación
INSERT INTO public.temas_capacitacion (tema, contenido) VALUES
('Aspectos e Impactos Ambientales', 'N/A'),
('Bloqueo de energías peligrosas (LOTO)', 'Procedimiento de identificación y bloqueo de energias peligrosas'),
('Control de derrames', 'Técnicas de control de derrames de productos químicos'),
('Drogas de abuso', 'N/A'),
('Efectos del ruido sobre el oído humano', 'N/A'),
('Efectos del tabaco sobre la salud', 'N/A'),
('Ergonomía - Manipulación de cargas', 'Principios básicos de ergonomía; Técnicas de levantamiento seguro; Diseño ergonómico del puesto de trabajo; Importancia y práctica de pausas activas; Normativa aplicable: Resolución MTESS 295/2003, Anexo I'),
('Ergonomía - Manipulación de cargas / Posturas forzadas / Pausas activas', 'Principios básicos de ergonomía; Técnicas de levantamiento seguro; Diseño ergonómico del puesto de trabajo; Importancia y práctica de pausas activas; Normativa aplicable: Resolución MTESS 295/2003, Anexo I'),
('Ergonomía - Pausas activas', 'Principios básicos de ergonomía; Técnicas de levantamiento seguro; Diseño ergonómico del puesto de trabajo; Importancia y práctica de pausas activas; Normativa aplicable: Resolución MTESS 295/2003, Anexo I'),
('Ergonomía - Técnicas de movilización de pacientes', 'Principios básicos de ergonomía; Técnicas de levantamiento seguro; Diseño ergonómico del puesto de trabajo; Importancia y práctica de pausas activas; Normativa aplicable: Resolución MTESS 295/2003, Anexo I'),
('HIV/SIDA y otras enfermedades de transmisión sexual', 'N/A'),
('Inducción de Higiene, Seguridad y Medio Ambiente', 'Prevención de accidentes y enfermedades profesionales; Uso adecuado de elementos de protección personal; Manipulación segura de productos químicos; Riesgo eléctrico; Bloqueo de energías peligrosas (LOTO); Ergonomía; Riesgo de incendio y uso de extintores; Plan de evacuación ante emergencias; Aspectos e Impactos Ambientales; Segregación de Residuos'),
('Manejo seguro y responsable', 'Normas de tránsito vigentes; Técnicas de manejo defensivo; Prevención de accidentes in itinere; Responsabilidades del conductor; Normativa aplicable: Ley Nacional de Tránsito 24.449'),
('Manipulación segura de productos químicos', 'Sistema Globalmente Armonizado (SGA); Lectura e interpretación de hojas de seguridad (MSDS); Almacenamiento y manipulación segura; Procedimientos de emergencia en caso de derrame o exposición; Normativa aplicable: Resolución SRT 801/2015 sobre SGA'),
('Operación segura de autoelevadores', 'Conocimientos técnicos del autoelevador; Instrucciones teóricas y prácticas de manejo y operación; Información sobre la capacidad de carga y sobre la curva o tabla de cargas; Reglas de seguridad y prevención de riesgos; Conocimientos teóricos sobre altura máxima de estiba; Programa y control diario a cargo del operador (listado de verificación o chequeo); Manual para la conducción segura de autoelevadores; Velocidad de circulación; Distancias mínimas respecto del peatón; Carga de combustible; Recambio de baterías; Interpretación y conocimiento del manual del operador; Correcto uso del extintor; Riesgo en el inflado de neumáticos; Prevención de vuelcos; Legislación vigente: Resolución SRT 960/2015'),
('Plan de acción ante emergencias y evacuación', 'Tipos de emergencia; Procedimientos de acción específicos para cada emergencia; Procedimiento de Evacuación; Roles y responsabilidades en emergencias; Teléfonos de emergencia; Rutas de evacuación y puntos de encuentro; Riesgo de incendio y uso de extintores; Normativa aplicable: Ley 19.587 y Decreto 351/79, Capítulo 18'),
('Práctica de Brigadistas o Equipo de Primera Intervención', 'Riesgo de incendio (clases de fuego y métodos de extinción) y uso de extintores e hidrantes'),
('Prevención cardiovascular', 'N/A'),
('Prevención de accidentes en las oficinas', 'N/A'),
('Prevención de accidentes y enfermedades profesionales', 'Concepto de accidente de trabajo y enfermedad profesional; Factores de riesgo y su identificación; Medidas preventivas y correctivas; Importancia del reporte de incidentes; Normativa aplicable: Ley 24.557 de Riesgos del Trabajo y sus modificatorias'),
('Primeros auxilios y Reanimación Cardio Pulmonar', 'Evaluación de la escena y del paciente; RCP y uso de DEA; Tratamiento de heridas, quemaduras y fracturas; Protocolo de actuación en emergencias médicas; Normativa aplicable: Ley 27.159 Sistema de Prevención Integral de Eventos por Muerte Súbita'),
('Riesgo de incendio y uso de extintores', 'Teoría del fuego y clases de incendios; Prevención de incendios; Tipos de extintores y su uso adecuado; Práctica de extinción de fuegos; Normativa aplicable: Ley 19.587, Capítulo 18 del Decreto 351/79'),
('Riesgo eléctrico', 'Identificación de riesgos eléctricos; Procedimientos de bloqueo y etiquetado; Cinco reglas de oro para trabajos eléctricos; Prácticas seguras de trabajo con electricidad; Normativa aplicable: Decreto 351/79, Capítulo 14, y Resolución SRT 3068/2014'),
('Riesgo eléctrico - Bloqueo de energías peligrosas (LOTO)', 'Identificación de riesgos eléctricos; Procedimientos de bloqueo y etiquetado; Cinco reglas de oro para trabajos eléctricos; Prácticas seguras de trabajo con electricidad; Normativa aplicable: Decreto 351/79, Capítulo 14, y Resolución SRT 3068/2014'),
('Segregación de Residuos', 'N/A'),
('Sistema de autoprotección', 'N/A'),
('Trabajo en altura', 'Definición de trabajo en altura según normativa; Sistemas de protección contra caídas; Uso correcto de arnés y líneas de vida; Inspección de equipos y anclajes; Normativa aplicable: Decreto 911/96 y Resolución 61/23 para la industria de la construcción'),
('Trabajo en caliente', 'Teoría del fuego y clases de incendios; Prevención de incendios; Tipos de extintores y su uso adecuado; Práctica de extinción de fuegos; Normativa aplicable: Ley 19.587, Capítulo 18 del Decreto 351/79'),
('Trabajo en espacios confinados', 'Definición y clasificación de espacios confinados; Identificación de riesgos específicos; Procedimientos de entrada y salida; Monitoreo atmosférico y ventilación; Normativa aplicable: Decreto N° 351/79; / Decreto N° 911/96; Res. SRT N° 953/2010; Norma I.R.A.M. Nº 3625/03'),
('Uso adecuado de elementos de protección personal', 'Tipos de EPP y su función; Selección, uso y mantenimiento correcto de EPP; Limitaciones y vida útil de los EPP; Responsabilidades del empleador y del trabajador; Normativa aplicable: Resolución SRT 299/2011 sobre EPP'),
('Vida saludable', 'N/A')
ON CONFLICT (tema) DO NOTHING;

-- Notificar recarga de caché
NOTIFY pgrst, 'reload schema';
