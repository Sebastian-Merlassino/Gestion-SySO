// src/app/[tenant-slug]/protocolos/ruido/utils/tablasAnexoIV.js
/**
 * Anexo IV - Capítulo 12: Iluminación y Color / Ruido - Decreto 351/79
 * Basadas en Norma IRAM-AADL J 20-06 / Res 85/12
 */

export const TABLA_1_ILUMINACION = [
  {
    clase: 'Visión ocasional solamente',
    luxTexto: '100',
    luxMin: 100,
    ejemplos: 'Para permitir movimientos seguros, por ejemplo: en lugares de poco tránsito; sala de calderas; depósito de materiales voluminosos y otros.'
  },
  {
    clase: 'Tareas intermitentes ordinarias y fáciles, con contrastes fuertes',
    luxTexto: '100 a 300',
    luxMin: 100,
    ejemplos: 'Trabajos simples, intermitentes y mecánicos; inspección general y contado de partes de stock; colocación de maquinaria pesada.'
  },
  {
    clase: 'Tarea moderadamente crítica y prolongada, con detalles medianos',
    luxTexto: '300 a 750',
    luxMin: 300,
    ejemplos: 'Trabajos medianos, mecánicos y manuales; inspección y montaje; trabajos comunes de oficina, tales como: lectura, escritura y archivo.'
  },
  {
    clase: 'Tareas severas y prolongadas y de poco contraste',
    luxTexto: '750 a 1500',
    luxMin: 750,
    ejemplos: 'Trabajos finos, mecánicos y manuales; montajes e inspección; pintura extrafina; sopleteado; costura de ropa oscura.'
  },
  {
    clase: 'Tareas muy severas y prolongadas, con detalles minuciosos o muy poco contraste',
    luxTexto: '1500 a 3000',
    luxMin: 1500,
    ejemplos: 'Montaje e inspección de mecanismos delicados; fabricación de herramientas y matrices; inspección con calibrador; trabajo de molienda fina.'
  },
  {
    clase: 'Tareas muy severas y prolongadas, con detalles minuciosos o muy poco contraste (Relojería)',
    luxTexto: '3000',
    luxMin: 3000,
    ejemplos: 'Trabajo fino de relojería y reparación.'
  },
  {
    clase: 'Tareas excepcionales, difíciles o importantes',
    luxTexto: '5000 a 10000',
    luxMin: 5000,
    ejemplos: 'Casos especiales, como por ejemplo: iluminación del campo operatorio en una sala de cirugía.'
  }
];

export const TABLA_2_ILUMINACION = [
  // Vivienda
  { grupo: 'Vivienda', subtitulo: 'Baño', tarea: 'Iluminación general', lux: 100 },
  { grupo: 'Vivienda', subtitulo: 'Baño', tarea: 'Iluminación localizada sobre espejos', lux: 200 },
  { grupo: 'Vivienda', subtitulo: 'Dormitorio', tarea: 'Iluminación general', lux: 200 },
  { grupo: 'Vivienda', subtitulo: 'Dormitorio', tarea: 'Iluminación localizada: cama, espejo', lux: 200 },
  { grupo: 'Vivienda', subtitulo: 'Cocina', tarea: 'Iluminación sobre la zona de trabajo: cocina, pileta, mesada', lux: 200 },

  // Centros Comerciales
  { grupo: 'Centros Comerciales de Mediana Importancia', subtitulo: '', tarea: 'Iluminación general', lux: 500 },
  { grupo: 'Centros Comerciales de Mediana Importancia', subtitulo: '', tarea: 'Iluminación general en grandes locales', lux: 1000 },
  { grupo: 'Centros Comerciales de Mediana Importancia', subtitulo: '', tarea: 'Depósito de mercaderías', lux: 300 },

  // Hoteles
  { grupo: 'Hoteles', subtitulo: 'Circulaciones', tarea: 'Pasillos, palier y ascensor', lux: 100 },
  { grupo: 'Hoteles', subtitulo: 'Circulaciones', tarea: 'Hall de entrada', lux: 300 },
  { grupo: 'Hoteles', subtitulo: 'Circulaciones', tarea: 'Escalera', lux: 100 },
  { grupo: 'Hoteles', subtitulo: 'Local para ropa blanca', tarea: 'Iluminación general', lux: 200 },
  { grupo: 'Hoteles', subtitulo: 'Local para ropa blanca', tarea: 'Costura', lux: 400 },
  { grupo: 'Hoteles', subtitulo: '', tarea: 'Lavandería', lux: 100 },
  { grupo: 'Hoteles', subtitulo: '', tarea: 'Vestuarios', lux: 100 },
  { grupo: 'Hoteles', subtitulo: '', tarea: 'Sótano, bodegas', lux: 70 },
  { grupo: 'Hoteles', subtitulo: '', tarea: 'Depósitos', lux: 100 },

  // Oficinas
  { grupo: 'Oficinas', subtitulo: '', tarea: 'Halls para el público', lux: 200 },
  { grupo: 'Oficinas', subtitulo: '', tarea: 'Contaduría, tabulaciones, teneduría de libros, operaciones bursátiles, lectura de reproducciones, bosquejos rápidos', lux: 500 },
  { grupo: 'Oficinas', subtitulo: '', tarea: 'Trabajo general de oficinas, lectura de buenas reproducciones, lectura, transcripción de escritura a mano en papel y lápiz ordinario, archivo, índices de referencia, distribución de correspondencia', lux: 500 },
  { grupo: 'Oficinas', subtitulo: '', tarea: 'Trabajos especiales de oficina, por ejemplo sistema de computación de datos', lux: 750 },
  { grupo: 'Oficinas', subtitulo: '', tarea: 'Sala de conferencias', lux: 300 },
  { grupo: 'Oficinas', subtitulo: '', tarea: 'Circulación', lux: 200 }
];
