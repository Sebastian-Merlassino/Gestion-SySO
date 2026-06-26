-- 20260709000000_create_formas_accidente.sql
-- Creación de la tabla de catálogo de Formas de Accidente

CREATE TABLE IF NOT EXISTS public.formas_accidente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.formas_accidente ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública para cualquier usuario autenticado o anónimo
CREATE POLICY "Permitir lectura publica de formas_accidente" ON public.formas_accidente
    FOR SELECT TO public USING (true);

-- Insertar catálogo de formas de accidente
INSERT INTO public.formas_accidente (nombre) VALUES
('Agresión con armas'),
('Agresión sin armas'),
('Aplastamiento entre dos objetos móviles (a excepción de los objetos volantes o que caen)'),
('Aplastamiento entre un objeto inmóvil y un objeto móvil'),
('Aplastamiento por un objeto'),
('Atrapamiento entre dos objetos móviles (a excepción de los objetos volantes o que caen)'),
('Atrapamiento entre un objeto inmóvil y un objeto móvil'),
('Atrapamiento por un objeto'),
('Atropellamiento de animales'),
('Atropellamiento por vehículo'),
('Caída de personas al agua'),
('Caídas de objetos en curso de manutención manual'),
('Caídas de objetos mobiliarios (artefactos de luz, ventanas, marcos, bibliotecas, etc)'),
('Caídas de personas con desnivelación por caídas desde alturas (árboles, edificios, andamios, escaleras, máquinas de trabajo, vehículos)'),
('Caídas de personas con desnivelación por caídas en profundidades (pozos, fosos, excavaciones, aberturas en el suelo)'),
('Caídas de personas que ocurren al mismo nivel'),
('Choque contra objetos'),
('Choque contra objetos móviles'),
('Choque de Vehiculos'),
('Choques contra objetos inmóviles (a excepción de choques debidos a una caída anterior)'),
('Contacto con agentes biológicos (absorción, inhalación)'),
('Contacto con fuego'),
('Contacto con sustancias u objetos calientes'),
('Contacto con sustancias u objetos muy fríos'),
('Contacto directo con fuente de generación o transmisión de corriente eléctrica'),
('Contacto por absorción cutánea de sustancias químicas'),
('Contacto por ingestión de sustancias químicas'),
('Contacto por inhalación de sustancias químicas'),
('Derrumbe (caídas de masas de tierra, de rocas, de piedras, de nieve)'),
('Derrumbes o desplome de Instalaciones'),
('Desplome (de edificios, de muros, de andamios, de escaleras, de pilas de mercancías)'),
('Esfuerzos físicos excesivos al empujar objetos'),
('Esfuerzos físicos excesivos al lanzar objetos'),
('Esfuerzos físicos excesivos al levantar objetos'),
('Esfuerzos físicos excesivos al manejar objetos'),
('Esfuerzos físicos excesivos al tirar de objetos'),
('Esfuerzos físicos excesivos por estrés de contacto'),
('Esfuerzos físicos excesivos por movimientos repetitivos'),
('Esfuerzos físicos excesivos por posturas forzadas'),
('Explosión o implosión'),
('Exposición a iluminación insuficiente'),
('Exposición a la corriente eléctrica (tierra húmeda, agua o ambiente con vapor que transmita electricidad)'),
('Exposición a otras radiaciones'),
('Exposición a presión inferior a la presión atmosférica estandar'),
('Exposición a presión superior a la presión atmosférica estandar'),
('Exposición a radiaciones ionizantes (rayos x)'),
('Exposición a radiaciones laser'),
('Exposición a radiaciones no ionizantes (infrarojas, ultravioleta, microondas)'),
('Exposición a ruido'),
('Exposición a vibraciones (brazo-mano / cuerpo entero)'),
('Exposición al calor (de la atmósfera o del ambiente de trabajo)'),
('Exposición al frío (de la atmósfera o del ambiente de trabajo)'),
('Exposición factores de riesgo psicosocial'),
('Fallas en los mecanismos para trabajos hiperbáricos'),
('Golpes por objetos móviles (comprendidos los fragmentos volantes y las partículas), a excepción de los golpes por objetos que caen'),
('Incendio'),
('Injuria punzo-cortante o contusa involuntaria'),
('Inoculación de agentes biológicos (por pinchazo, heridas cortantes)'),
('Mordedura de animales'),
('Otras caídas de objetos'),
('Otros agentes ergonómicos'),
('Otros agentes físicos'),
('Otros agentes termohigrométricos'),
('Picaduras'),
('Pisadas sobre objetos'),
('Sobrecarga del uso de la voz'),
('Otra forma de accidente'),
('No Aplica')
ON CONFLICT (nombre) DO NOTHING;

-- Notificar recarga de caché a PostgREST
NOTIFY pgrst, 'reload schema';
