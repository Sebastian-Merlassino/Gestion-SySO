# ADR 0003: Incorporación del Módulo "Aviso de Riesgo" al Sistema SaaS

- **Estado**: Propuesto
- **Fecha**: 2026-06-22
- **Autores**: Antigravity Technical Setup Agent

---

## Contexto y Problema

El sistema de **Gestión SySO** requiere una nueva sección llamada **"Aviso de Riesgo"** para emitir notificaciones formales de condiciones o actos inseguros detectados a partir de los hallazgos registrados en la sección de **Acciones Correctivas**. Este módulo debe permitir generar reportes PDF estructurados en formato A4 vertical con una grilla de datos y niveles de riesgo semaforizados, admitir firmas digitales (escaneada del perfil o dibujada en pantalla) y posibilitar la previsualización, descarga y envío por correo de dichos avisos.

## Decisión

Se decide implementar el nuevo módulo de la siguiente manera:

1. **Persistencia y Multi-tenancy**: Se creará la tabla `public.avisos_riesgo` en la base de datos de Supabase, enlazada a la organización actual (`tenant_id`), cliente (`empresa_id`) y establecimiento (`establecimiento_id`). Se habilitará **Row Level Security (RLS)** utilizando la política de aislamiento basada en `tenant_id = public.get_current_tenant_id()`.
2. **Control de Accesos (Permisos)**: Se expandirá la estructura JSONB de permisos (`permisos`) de la tabla de perfiles y miembros de equipo para incorporar la clave `"avisos"` con control granular (`cargar`, `editar`, `eliminar`).
3. **Integración de Datos**: Al momento de crear o editar un aviso de riesgo en la interfaz, se realizará una consulta dinámica a `public.acciones_correctivas` filtrada por `empresa_id`, `establecimiento_id` y `fecha` para recuperar los hallazgos correspondientes y utilizarlos como el contenido principal del PDF de forma automatizada.
4. **Firma Digital Dual**: Se proveerá en el formulario la opción de seleccionar la firma cargada en el perfil del profesional interviniente (`signature_url`) o dibujar una firma a mano alzada usando un canvas interactivo HTML5. Las firmas dibujadas se almacenarán en el bucket de storage `documents` bajo la carpeta privada del usuario logueado.
5. **Reporte jsPDF A4 Estático**: Siguiendo el diseño visual detallado de 4 páginas provisto, se creará un maquetado estático exacto en puntos (pt) usando la librería `jsPDF` en el cliente. Si la cantidad de hallazgos recuperados es menor a 18, las filas y páginas restantes se dibujarán vacías y numeradas para mantener la consistencia estética del reporte corporativo.
6. **API de Email Unificada**: Se adaptará la API existente `/api/send-email/route.js` para recibir opcionalmente un campo `documentType === 'aviso_riesgo'`, permitiendo enviar un correo electrónico con textos y asuntos específicos al aviso de riesgo, reutilizando los servicios de transporte SMTP ya configurados.

## Consecuencias

### Positivas
- **Alineación con Estándares**: El módulo mantiene la homogeneidad estructural de la barra lateral, cabeceras de página y estilos de formulario de las otras secciones operativas.
- **Trazabilidad y Seguridad**: Las políticas de RLS garantizan aislamiento absoluto entre organizaciones y previenen accesos cruzados no autorizados.
- **Reusabilidad de Código**: Se reutilizan componentes de firma digital, subida de archivos a Storage y envío de correos, minimizando la deuda técnica.

### Desventajas/Mitigaciones
- **Complejidad del Layout PDF**: El posicionamiento absoluto con jsPDF requiere coordenadas precisas. Se mitiga implementando funciones de dibujo de cabecera, tabla de hallazgos y firmas separadas y parametrizadas.
- **Dependencia de Datos Previos**: Los avisos de riesgo dependen de hallazgos cargados en Acciones Correctivas. Se agregará una previsualización interactiva de estos datos en el formulario para alertar al usuario antes de guardarlo.
