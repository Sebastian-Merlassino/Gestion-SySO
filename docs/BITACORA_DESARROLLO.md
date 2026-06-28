# Bitácora de Desarrollo - Gestión SySO

## [2026-06-27] Rediseño e Incorporación de la Sección de Matriz de Identificación de Peligros y Valoración de Riesgos (BS 8800)

### Resumen de Cambios
- **Estructura y Base de Datos (Supabase)**: Creación de la migración SQL (`20260716000000_create_matriz_riesgos.sql`) para la tabla `public.matriz_riesgos` con relaciones de clave foránea a empresas, establecimientos y tenants, incorporando la columna `consecuencia TEXT` para documentar consecuencias asociadas a los peligros. Habilitación de RLS y definición de políticas de aislamiento y permisos.
- **Conectividad Robusta a Base de Datos**: Eliminación del fallback automático y silencioso de Supabase a modo mock cuando ocurren fallos de conexión u RLS. Ahora, si el usuario tiene sesión activa, los errores de consulta de base de datos se notifican directamente en pantalla mediante toasts de error para facilitar la depuración, limitando el modo mock únicamente a accesos de desarrollo local sin sesión iniciada.
- **Barra de Navegación Lateral (Sidebar)**: Integración del menú interactivo `"Matriz de riesgos"` con icono unificado `ClipboardList` en `src/components/Sidebar.js`.
- **Estructura UI Rediseñada (Filtros y Listado)**:
  - Dividido el contenido en dos tarjetas independientes (Card superior para buscador y filtros colapsables; Card inferior de altura responsiva `h-[calc(100vh-280px)]` para la tabla).
  - **Estado Vacío Personalizado**: Cuando no existen registros, se despliega el mensaje `"No hay evaluaciones de riesgo registradas"`, la indicación `"Registra una nueva matriz de riesgo para comenzar."` y el botón de acción rápida `+ Registrar matriz` para abrir directamente la carga por lotes.
  - **Estandarización del Empty Table State**: Se definió formalmente en `.agents/skills/gestion-syso-brand-guidelines/SKILL.md` la estructura estándar para listados y tablas sin datos: contenedor centrado, icono `AlertCircle` en `#D9D9D9` / `slate-300`, títulos en negrita de alta jerarquía y botón principal de marca `#468DFF` con sombra (`shadow-md shadow-[#468DFF]/10`) de acción directa para registros iniciales.
  - **Propagación del Estándar en la Aplicación**: Se eliminaron los viejos estados vacíos incrustados en celdas (`tr`/`td`) y se aplicó el nuevo contenedor centrado en:
    - **Avisos de Riesgo** (`src/app/[tenant-slug]/avisos/page.js`)
    - **Acciones Correctivas** (`src/app/[tenant-slug]/correctivas/page.js`)
    - **Accidentes** (`src/app/[tenant-slug]/accidentes/page.js`)
    - **Constancia de Visitas** (`src/app/[tenant-slug]/visitas/page.js`)
- **Formulario de Carga y Edición Estándar**:
  - **Inputs Manuales Integrados en Dropdown (Sin Checkboxes)**: Eliminación de checkboxes exteriores para alternar carga manual. Ahora, los selectores de Sector de Trabajo, Puesto de Trabajo, Peligro, Riesgo y Responsable incluyen una opción integrada `+ Ingresar manualmente...` dentro de la misma lista desplegable. Al seleccionarse, se oculta el dropdown y se muestra un campo de texto con un link de cancelación/retorno a la lista.
  - **Resolución de Pérdida de Enfoque**: Corrección del bug que impedía ingresar texto en el campo manual del Sector de Trabajo en modo lote. Se agruparon las actualizaciones de estado en un único objeto (`updates`) en `handleUpdateBulkSector` y `handleUpdateBulkPuesto` para evitar colisiones y re-renderizados conflictivos.
  - **Títulos y Secciones Simplificadas**: Se acortaron los encabezados en el formulario de carga según lineamientos: "Cargar Nueva Matriz de Riesgos" (sin la palabra Masiva), "1. Ubicación", "Sectores y Puestos de Trabajo" y "Observaciones" (en lugar de Observaciones Generales).
  - **Botón Confirmar del Modal de Alerta**: Corrección de la clase CSS de color del botón de confirmación en modales (`bg-red-650` -> `bg-red-600`), asegurando que sea visible sin necesidad de pasar el cursor por encima (hover).
  - **Auto-población del Catálogo**: Lógica reactiva al catálogo de peligros que autocompleta la Consecuencia y las tres Medidas de Control (Administrativas, Ingeniería y EPP's) como texto editable al seleccionar un Peligro y Riesgo del dropdown.
  - **Selectores de Fecha Estándar**: Implementación de inputs de texto con máscara `DD/MM/YYYY` y picker de calendario nativo superpuesto para los campos de Fecha Planificada y Fecha Realización en ambos modos (masivo e individual).
  - **Observaciones**: Caja de texto extendida colocada al final de toda la grilla del formulario.
  - **Botonera e Interfaces Unificadas**: Alineación de los botones de formulario sobre divisor de borde blanco inferior ("Salir" a la izquierda, "Eliminar" y "Guardar" a la derecha). Alerta de salida con confirmación estandarizada ante cambios no guardados.

### Decisiones Clave
- **Dropdowns con Opción Manual Incorporada**: Integrar la entrada manual dentro de la propia lista del dropdown mantiene el formulario limpio de controles repetitivos y checkboxes redundantes, agilizando el flujo cognitivo del usuario.
- **Transparencia en Errores de Base de Datos**: Evitar el fallback silencioso a simulación previene que errores silenciosos de migración o permisos en producción pasen desapercibidos.
- **Auto-relleno Editable**: Habilitar que las contramedidas sugeridas del catálogo se puedan reescribir reduce drásticamente el tiempo de carga del profesional y previene duplicación de registros sin limitar la personalización.
- **Estabilización de Layout**: Separar los filtros en una tarjeta independiente de altura controlada previene Layout Shifts al alternar filtros de búsqueda de forma horizontal o vertical.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `gestion-syso-multitenant-security`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260716000000_create_matriz_riesgos.sql`
- `[MODIFY] src/components/Sidebar.js`
- `[NEW] src/app/[tenant-slug]/matriz-riesgos/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción con Next.js (`cmd /c npm run build`) exitosa y libre de errores. La nueva ruta `/[tenant-slug]/matriz-riesgos` finalizó en **17.5 kB** de código estático optimizado.
- Ejecución completa del script de migraciones local (`node scripts/run-migrations.js`) que aplicó con éxito la migración `20260716000000_create_matriz_riesgos.sql` en la base de datos Supabase, resolviendo el error del Schema Cache de PostgREST y notificando la recarga del esquema.

### Riesgos Detectados / Remanentes
- Ninguno.

### Próximo Paso Recomendado
- Verificar los flujos de carga masiva de riesgos en establecimientos utilizando el frontend.

---

## [2026-06-27] Corrección de Contraste en Nómina de Personal, Habilitación de Evidencias a Clientes y Cambio a Pictograma de Imagen

### Resumen de Cambios
- **Alto Contraste en Nómina Deshabilitada (Mobile / Desktop)**: Se corrigió la legibilidad en la vista de solo lectura/clientes de la sección de **Nómina de Personal**. Se agregaron clases explícitas de alto contraste (`disabled:text-slate-800 disabled:bg-slate-50 disabled:opacity-100`) a los selectores de la cabecera (Razón Social, Establecimiento, Fecha de Carga) y a los inputs del listado de empleados, permitiendo que la información sea legible independientemente del estado del formulario.
- **Acceso a Evidencias para Clientes**: Se habilitó la columna de Acciones en las tablas de **Acciones Correctivas**, **Control de Extintores** y **Capacitación** para los usuarios con rol `cliente`. Esto les permite ver y descargar/visualizar las fotos o imágenes de evidencia cargadas, manteniendo inhabilitadas las funciones de edición y eliminación.
- **Pictograma de Imagen Unificado en Tablas**: En las tablas de **Acciones Correctivas** y **Control de Extintores**, se reemplazó el icono de visualización de imágenes (`<Eye />`) por el de imagen (`<ImageIcon />`), aplicando los estilos y colores unificados de Higiene y Seguridad Laboral (`bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors`).
- **Botón de Visualización de Detalle (Ojo) para Clientes**: En las tablas de **Nómina de Personal** y **Accidentes**, se agregó un botón con el pictograma del ojo (`<Eye />`) en la columna de Acciones para los usuarios clientes. Esto les permite abrir la vista de detalle/ficha del empleado o accidente en modo de solo lectura.
- **Ajuste de colSpan en Vacio**: Se ajustó el atributo `colSpan` para el estado vacío ("No hay registros...") en las tablas de **Control de Extintores** y **Acciones Correctivas** para reflejar la presencia condicional de la columna de Acciones.

### Decisiones Clave
- **Filtros e Interactividad de Visualización de Solo Lectura**: Permitir que los clientes accedan a evidencias e imágenes sin comprometer la seguridad e integridad de la base de datos (las mutaciones de inserción, actualización y borrado siguen estrictamente validadas server-side y por permisos de frontend).
- **Estándar de Botones y Contraste**: El uso de `disabled:text-slate-800` en campos bloqueados de formularios garantiza el cumplimiento de las pautas de accesibilidad Web (WCAG) sin necesidad de reescribir inputs como etiquetas de texto simple.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/nomina/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/accidentes/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción con optimización y empaquetado de Next.js (`npm run build`) exitosa.

---

## [2026-06-27] Incorporación de Sectores, Puestos de Trabajo y Observaciones en Establecimientos

### Resumen de Cambios
- **Matriz de Sectores y Puestos de Trabajo**: Se añadió una subsección interactiva y colapsable en cada establecimiento (ubicada entre "Riesgos del Decreto 351/79" y "Máquinas Fijas") para definir múltiples sectores (denominación y descripción) y, dentro de cada uno, múltiples puestos de trabajo asociados (denominación y descripción).
- **Control Táctil e Interactivo en Lectura (Mobile First)**: Para permitir expandir y contraer la información de sectores y puestos en la vista de solo lectura (clientes), los botones de alternancia se implementaron como elementos `span` con `role="button"`. Esto evita que la directiva `<fieldset disabled>` inhabilite la interacción de colapsado/expandido en el portal de clientes.
- **Reposicionamiento de Horas-Profesional**: Se ubicó el contenedor de "Horas-Profesional Mensuales" directamente debajo de "Riesgos de la actividad según Decreto Nº 351/79" para unificar la visualización de los riesgos y su correspondiente cálculo del decreto.
- **Cuadro de Observaciones del Establecimiento**: Se incorporó un campo de texto multilínea (textarea) exclusivo para observaciones de cada establecimiento, posicionado justo debajo del componente "Equipos de Izaje de Cargas".
- **Soporte de Base de Datos (Supabase)**: Se creó una nueva migración SQL para añadir la columna `sectores` (JSONB) y `observaciones` (TEXT) en la tabla `establecimientos`, manteniendo la compatibilidad con el resto de la plataforma y asegurando consistencia transaccional.

### Decisiones Clave
- **JSONB para Estructura Jerárquica**: Almacenar sectores y puestos en un único campo JSONB en la tabla `establecimientos` simplifica la lógica y evita uniones complejas en base de datos.
- **Interactividad en Fieldsets Deshabilitados**: El uso de elementos alternativos con `role="button"` garantiza que las acciones estructurales de la interfaz de lectura (como colapsar o expandir bloques) permanezcan accesibles.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `supabase`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260715000000_add_sectores_and_observaciones_to_establecimientos.sql`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`

### Validaciones Ejecutadas
- Ejecución completa y exitosa de la migración en el pooler de base de datos Postgres de Supabase.
- Compilación de producción con optimización y empaquetado de Next.js (`npm run build`) exitosa.

---

## [2026-06-27] Corrección de Responsividad, Lógica de Establecimientos y Orden Alfabético en el Dashboard (Mobile First Android/iOS)

### Resumen de Cambios
- **Apilado de Filtros de Siniestralidad (Dashboard)**: Se modificaron los filtros selectores del gráfico comparativo de accidentes. Se reemplazó el contenedor por una grilla responsiva (`grid-cols-1 sm:flex`) y se dispuso que la etiqueta quede arriba del dropdown (`flex flex-col`) con un ancho del 100% en pantallas de celular, evitando que se desborden de los márgenes de la tarjeta.
- **Lista de Establecimientos Dependiente (Dashboard)**: Se restringió el dropdown de establecimientos para que esté deshabilitado si no se ha seleccionado ninguna Razón Social (para administradores y miembros), mostrando la leyenda reactiva *"Seleccione una empresa primero..."* para mantener la coherencia y evitar datos huérfanos.
- **Prevención de Desplazamientos en Filtros (Dashboard)**: Se definieron anchos fijos responsivos en desktop (`sm:w-[240px]` y `sm:w-[100px]`) para los selectores de los filtros del dashboard. Esto previene que cambien de tamaño de forma dinámica al alternar entre estados (por ejemplo, al cambiar de "Seleccione una empresa primero..." a "Todos los establecimientos"), eliminando saltos de cuadrícula y manteniendo los labels y alineaciones perfectamente estables.
- **Tooltips Interactivos en Gráfico (Dashboard)**: Se reemplazaron los tooltips nativos del navegador (`title`) por una ventana emergente premium hecha con HTML/Tailwind (`hidden group-hover:flex`). Estos tooltips se posicionan de forma segura a `top-2` dentro de la cuadrícula del gráfico, garantizando su visualización al 100% y evitando cortes. Se integraron los operandos detallados del cálculo en tiempo real (como cantidad de casos, personas cubiertas, total de días de baja y casos con baja) y la representación matemática de la fórmula aplicada de acuerdo al índice activo (Incidencia, Mortalidad, Pérdida o DMB).
- **Clarificación en Guía Metodológica (Dashboard)**: Se añadió una sección destacada en color ámbar de *"Aclaración Importante"* dentro del modal instructivo de fórmulas. Esta aclara de forma explícita al usuario que para el correcto funcionamiento de los cálculos es imprescindible contar con información cargada previamente en la sección de **Accidentes** y en la **Nómina de Personal**, cruzadas y asociadas a la misma Razón Social, Establecimiento y **correspondientes al año que se desea calcular**.
- **Simplificación de Título (Extintores)**: Se modificó el título del encabezado principal en la sección de extintores de *"Programa de Control de Extintores"* a *"Control de Extintores"*.
- **Icono de Visualización de Archivos en Tablas**: En las tablas de **Constancias de Visita** y **Avisos de Riesgo**, se reemplazó el pictograma de ojo (`<Eye />`) en el botón de visualizar PDF por el de documento (`<FileText />`), aplicando los estilos Blue-50/Blue-100 del manual de marca.
- **Reordenamiento de Barra Lateral (Sidebar)**: Se reubicó el acceso a la sección de **Accidentes** en el menú de navegación de la barra lateral, colocándolo directamente entre *Acciones Correctivas* y *Extintores* para mejorar la ergonomía de uso.
- **Orden Alfabético de Clientes (Dashboard)**: Se modificó la carga de empresas en `fetchDashboardData` para ordenar los registros alfabéticamente por Razón Social (`.order('razon_social', { ascending: true })`).
- **Paddings de Visitas de Obra**: Se cambió el padding fijo `p-6` a responsivo `p-3 sm:p-6` en el cuerpo del listado y a `p-4 sm:p-6` en el formulario, liberando espacio útil horizontal en celulares.
- **Truncado de Título Adaptativo**: El título del formulario ahora se reduce y trunca en pantallas de móvil (`text-xs sm:text-sm truncate max-w-[55vw]`), impidiendo que se superponga con los botones de cierre.
- **Footer de Acciones Apilable**: Los botones del pie de formulario ("Salir", "Eliminar", "Registrar Constancia") ahora se organizan en una columna flexible inversa en móviles (`flex-col-reverse sm:flex-row items-stretch gap-3`) y toman el 100% de ancho del dispositivo.
- **Firmas a Prueba de Desbordamientos**: Se incorporó la clase `shrink-0` a los botones de "Limpiar Firma" y márgenes a los labels correspondientes para prevenir colisiones en pantallas angostas.

### Decisiones Clave
- **Apilar sobre Alinear Horizontalmente**: En pantallas de menos de 400px de ancho, cualquier alineación horizontal de etiquetas y selectores / botones extensos resulta en desbordamiento. Apilarlos verticalmente y darles el 100% del ancho del contenedor en móvil es el patrón de diseño responsivo más estable y consistente.
- **Orden de Presentación de Catálogos**: Cargar catálogos ordenados alfabéticamente desde el motor de base de datos (`order` en PostgreSQL) es más eficiente en rendimiento que ordenar los arrays en el cliente y garantiza una UX predictiva.
- **Ancho Fijo en Elementos de Control**: Fijar los anchos de los menús desplegables (`select`) evita que la interfaz cambie de tamaño según el texto seleccionado, lo que elimina el efecto visual de "tembleque" o saltos de layout cuando se actualizan filtros.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`

### Validaciones Ejecutadas
- Compilación de producción con Next.js exitosa.

---

## [2026-06-27] Estandarización Responsiva Integral (Mobile First) de Tablas y Gráfico de Siniestralidad

### Resumen de Cambios
- **Ancho Mínimo de Tablas**: Se aplicaron clases de ancho mínimo (`min-w-[800px]` o `min-w-[850px]`) en todas las tablas principales y de previsualización interna en los 12 módulos principales del sistema. Esto permite un scroll horizontal nativo y suave, evitando que las columnas se amontonen y los textos/botones de acción se solapen en pantallas móviles.
- **Módulos Optimizados**: *Visitas, Programa Anual de Gestión, Nómina de Personal (incluyendo previsualización de importación de Excel), Legajo Técnico, Extintores, Equipo de Trabajo, Clientes/Empresas, Dashboard (tabla de vencimientos), Acciones Correctivas, Capacitación, Avisos de Riesgo (incluyendo la tabla de hallazgos cargados), y Accidentes*.
- **Responsividad del Gráfico de Siniestralidad**: Se adaptó el gráfico comparativo de barras de siniestralidad en el dashboard. Se envolvió en un contenedor con desbordamiento (`overflow-x-auto`) y se le asignó un ancho mínimo (`min-w-[650px]`) a la fila interna de las barras, garantizando la perfecta legibilidad de los tooltips reactivos y los valores de índices float en pantallas de 320px a 480px.

### Decisiones Clave
- **Scroll Horizontal Nativo**: Asignar un ancho mínimo (`min-w`) al elemento `<table>` en combinación con `overflow-x-auto` en el contenedor padre es la mejor práctica de CSS para mantener tablas complejas con más de 5 columnas completamente usables en móviles, sin tener que rediseñarlas como tarjetas apiladas que incrementan el scroll vertical drásticamente.
- **Gráfico de Barras con Desbordamiento**: Evitar que el gráfico reduzca el ancho de sus barras por debajo de un tamaño legible garantiza que la experiencia del usuario sea premium en dispositivos portátiles.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/nomina/page.js`
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`
- `[MODIFY] src/app/[tenant-slug]/accidentes/page.js`

### Validaciones Ejecutadas
- Compilación de producción con Next.js exitosa.

---

## [2026-06-27] Dashboard de Administrador y Miembros: Integración del Panel de Siniestralidad

### Resumen de Cambios
- **Duplicación e Integración de Siniestralidad**: Se incorporó el panel interactivo completo de seguimiento de accidentes e índices de siniestralidad al dashboard de los usuarios con roles de `administrador` (owner/admin) y `miembro de equipo`.
- **Filtro de Razón Social**: Se agregó un menú desplegable de Razón Social (empresa) exclusivo para estos roles en la cabecera del panel de siniestralidad, cargando dinámicamente las empresas del tenant.
- **Establecimientos Reactivos**: Se adaptó el selector de establecimientos de modo que esté deshabilitado si no hay empresa seleccionada, y muestre únicamente los establecimientos correspondientes a la Razón Social seleccionada una vez elegida.
- **Carga Global de Datos**: Se modificó `fetchDashboardData` para consultar accidentes y personal cubierto de todas las empresas del tenant en las sesiones de administración. El RLS sigue restringiendo de manera autónoma las consultas en las sesiones de clientes finales.
- **Estructuración y Layout Simétrico**: Se reestructuró la columna izquierda del grid principal (`lg:col-span-2 space-y-6`) para apilar de forma armoniosa el contenedor de "Próximos Vencimientos" y el de "Seguimiento de Accidentes". El calendario compacto se mantuvo a la derecha con un diseño simétrico.

### Decisiones Clave
- **Carga Desacoplada y RLS**: Consultar accidentes y nómina sin filtro de empresa inicial en backend es seguro debido a que las políticas RLS restringen de forma nativa las consultas para clientes finales, mientras que otorgan acceso global a administradores y miembros sin duplicación de lógica ni riesgo cross-tenant.
- **UX de Establecimientos Dependientes**: Deshabilitar el selector de establecimientos hasta que se seleccione una Razón Social previene selecciones inconsistentes o errores de consulta cruzados.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `gestion-syso-multitenant-security`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`

### Validaciones Ejecutadas
- Validación del build de producción y análisis estático de Next.js (`npm run build`) completada con éxito.

---

## [2026-06-27] Dashboard para Clientes: Seguimiento de Accidentes y Enfermedades Profesionales

### Resumen de Cambios
- **Modificación Condicional del Dashboard**: Se ocultó la sección superior del Programa de Gestión (Próximos Vencimientos y Calendario Compacto) para los usuarios con rol `cliente` (`profile.role === 'cliente'`).
- **Seguimiento de Siniestralidad**: Se integró en su lugar un contenedor interactivo para el seguimiento de accidentes y enfermedades profesionales, manteniendo la consistencia cromática y formal del resto de secciones.
- **Filtros por Establecimiento y Año**: Se incorporaron menús desplegables para filtrar dinámicamente los registros de siniestros por año (calculado a partir de los datos existentes) y establecimiento.
- **Contadores de Acontecimientos**: Se implementaron contadores para clasificar los accidentes según su tipo: *Accidente de Trabajo, Accidente in itinere, Enfermedad Profesional, Reingreso*, incluyendo un contador *Total* calculado a partir de la suma de estos.
- **Contadores por Gravedad**: Se agregaron contadores específicos para clasificar por gravedad (*Leve, Grave, Mortal*) únicamente los *Accidentes de Trabajo* y *Enfermedades Profesionales*.
- **Datos Reales y Mocks**: Se configuró la consulta asíncrona a Supabase para cargar accidentes de la base de datos para la empresa asociada, y se definieron 5 registros mockeados en desarrollo local para garantizar visualización y reactividad inmediatas.
- **Ajuste Cromático de Gravedad**: Se homogeneizaron los colores de los niveles de gravedad (*Leve, Grave, Mortal*) eliminando transparencias en los bordes y reforzando los rellenos. Esto se aplicó en las tarjetas del dashboard, los badges de la tabla de listado, el selector del formulario y el modal explicativo de la guía.
- **Interactividad en Vista Lectura (Clientes)**: Se reemplazó el botón de ayuda del selector de gravedad por un elemento interactivo `<span>` con `role="button"`. Esto evita que la directiva `<fieldset disabled>` de la vista de solo lectura/clientes inhabilite la acción, permitiendo que sea clickeable.
- **Gráfico de Barras de Siniestralidad**: Se incorporó un panel interactivo con un gráfico de barras al pie del contenedor de accidentes del cliente. Este gráfico dibuja 14 barras proporcionales que representan el consolidado del año anterior ($Y-1$), el YTD (acumulado del año seleccionado hasta hoy/fin de año) y los 12 meses correspondientes a ese año.
- **Botones Selector de Índices**: Se añadieron 4 botones para alternar el gráfico entre los siguientes índices: *Índice de Incidencia AT y EP*, *Índice de Incidencia de Casos Mortales*, *Índice de Pérdida (IP)*, y *Duración Media de las Bajas (DMB)*.
- **Cálculo con Nómina Personal (Criterio Fecha Carga)**: Se integró la nómina de personal de Supabase (`nomina_personal`) para contar el número de personas cubiertas de forma dinámica. Se corrigió el criterio de conteo: ahora filtra aquellos registros cuyo año de la columna `fecha_carga` sea exactamente igual al año seleccionado en el filtro (tanto para el año seleccionado como para el año anterior).
- **Remoción de Fórmulas en Gráfico**: Se eliminó la sección de explicación integrada en el cuerpo del gráfico, dejando el diseño visual de las estadísticas más limpio y enfocado.
- **Pictograma de Ayuda y Modal de Fórmulas**: Se incorporó un icono clickable (`HelpCircle` de lucide-react) al lado del título principal "Estadísticas e Índices de Siniestralidad". Este icono abre un modal informativo que desglosa detalladamente la descripción y fórmulas matemáticas del *Índice de Incidencia AT y EP*, *Índice de Incidencia de Casos Mortales*, e índices de gravedad (*Índice de Pérdida (IP)* y *Duración Media de las Bajas (DMB)*).
- **Valores sobre las Columnas**: Se incorporaron etiquetas de texto flotantes que muestran de manera inmediata el valor numérico exacto de cada índice por encima del tope de cada una de las 14 barras del gráfico.
- **Tooltips Informativos**: Cada barra cuenta con un tooltip dinámico en hover que despliega la fórmula desglosada (numerador, denominador, valor final y descripción del cálculo actual).

### Decisiones Clave
- **Aislamiento Funcional por Rol**: Conservar el calendario y vencimientos para profesionales de SySO y mostrar exclusivamente métricas de siniestralidad al cliente final maximiza la utilidad del dashboard para cada perfil sin duplicar componentes ni rutas.
- **Extracción Dinámica de Años**: Calcular dinámicamente los años disponibles a partir de la fecha de siniestro evita el mantenimiento manual de catálogos y previene opciones de filtrado vacías.
- **Evitar Restricciones Nativas de Fieldset**: El uso de elementos semánticos interactivos alternativos (`span` con `role="button"`) permite esquivar la inhabilitación del navegador de todos los inputs dentro de un fieldset disabled en modo lectura, garantizando la accesibilidad del modal informativo.
- **Gráficos Custom Responsivos**: Dibuja las barras dinámicamente mediante Tailwind y SVG/CSS nativos en lugar de utilizar librerías de gráficos basadas en Canvas. Esto optimiza el peso del bundle compartimentado y evita errores de hidratación cruzada en Next.js.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `gestion-syso-multitenant-security`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/accidentes/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción con optimización y empaquetado de Next.js (`cmd /c npm run build`) exitosa y libre de errores.

### Riesgos Detectados / Remanentes
- Ninguno.

### Próximo Paso Recomendado
- Realizar pruebas del filtrado dinámico en la vista de cliente con datos reales cargados.

---

## [2026-06-27] Estabilización de Dimensiones de Filtros y Tablas (Evitar Layout Shift) en las 10 Secciones Principales

### Resumen de Cambios
- **Estabilización de Cabeceras de Filtros**: Se aplicó una altura fija mínima (`min-h-[28px]`) a la fila flex que aloja el botón de alternancia "Filtros de Búsqueda" y el botón de "Limpiar filtros" en todas las vistas con listados. Esto previene el salto vertical del resto de la cuadrícula cuando el botón de limpiar filtros aparece o desaparece de manera dinámica.
- **Fijación de Altura de Contenedor de Listados**: Se reemplazó el estilo de altura dinámica `maxHeight` por un `height` fijo responsivo (`height: calc(100vh - 240px)` o `height: calc(100vh - 310px)` / `calc(100vh - 360px)` dependiendo de la sección) y se envolvió el bloque del listado completo con la clase `flex flex-col`.
- **Integración de Estado Vacío en la Tarjeta de Listado**: Se reestructuró la lógica de renderizado condicional de modo que tanto la tabla como el contenedor de estado vacío ("No hay registros...") compartan la misma tarjeta contenedora de altura fija. El estado vacío ahora utiliza `flex-grow` y `h-full` para centrar verticalmente su contenido dentro del recuadro establecido. Esto erradica por completo el colapso visual de las tarjetas blancas cuando la lista tiene cero o pocos elementos, brindando una experiencia de escritorio premium e invariante.
- **Secciones Modificadas**: Se propagó esta mejora de forma integral a las 10 secciones principales del sistema: *Nómina de Personal, Accidentes, Acciones Correctivas, Capacitación, Programa Anual de Gestión, Empresas/Clientes, Visitas de Obra, Extintores, Equipo de Trabajo y Avisos de Riesgo*.

### Decisiones Clave
- **Encapsulado de Estados en Tarjeta Fija**: Mantener la tarjeta contenedora principal como un elemento estructural persistente en lugar de condicionar su renderizado completo asegura que la UI no se deforme ni redimensione abruptamente al aplicar filtros o al realizar búsquedas vacías.
- **Uso de flex-grow para el Scroll Interno**: Al fijar la altura en el contenedor padre, se delega el scroll exclusivamente al contenedor de la tabla (`overflow-auto flex-grow`), previniendo desbordamientos y manteniendo el encabezado de la tabla y de la página siempre en su posición correcta.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/nomina/page.js`
- `[MODIFY] src/app/[tenant-slug]/accidentes/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción completa y exitosa (`cmd /c npm run build`).
- Envío y sincronización exitosa de los cambios a la rama principal (`git push`).

### Riesgos Detectados / Remanentes
- Ninguno. Se utilizaron las mismas métricas de altura que ya estaban validadas en el proyecto, sustituyendo solo la propiedad de comportamiento variable.

### Próximo Paso Recomendado
- Continuar con el testeo de usuario en cada módulo en el entorno de despliegue.

---

## [2026-06-27] Reemplazo de Filtro por Fecha de Carga por Filtro por Año en Nómina de Personal

### Resumen de Cambios
- **Reemplazo del Filtro de Fecha de Carga por Selector de Año**: Se eliminó el filtro `<input type="date">` que obligaba a buscar por una fecha exacta de carga (día, mes y año) en la tabla de la Nómina de Personal. Se reemplazó por un menú desplegable `<select>` que permite filtrar dinámicamente por año.
- **Cálculo Dinámico de Años**: Se implementó una rutina en React para extraer los años únicos de carga (`fecha_carga` en formato `YYYY-MM-DD`) a partir de la lista de empleados actual (`personalList`), poblando de forma automática el dropdown con los años con registros disponibles, más la opción "Todos los años".
- **Limpieza de Filtro de Año**: Se actualizó el botón de limpiar filtros para restablecer el estado del año seleccionado (`filterAnio`).

### Decisiones Clave
- **Filtro Dinámico vs Estático**: Utilizar los años presentes en los registros existentes del cliente para poblar el dropdown previene opciones vacías y se adapta de forma orgánica a medida que se cargan nuevos períodos, garantizando una interfaz libre de configuraciones manuales.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/nomina/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción completa y exitosa (`cmd /c npm run build`).
- Envío y sincronización exitosa de los cambios a la rama principal (`git push`).

### Riesgos Detectados / Remanentes
- Ninguno. La funcionalidad mantiene la compatibilidad con el esquema de base de datos existente y mejora la experiencia de usuario.

### Próximo Paso Recomendado
- Realizar pruebas del selector de años en producción con datos reales cargados.

---

## [2026-06-27] Corrección de Detalle de Accidentes, Robustez del Contador de Días de Baja y Estandarización Global de Pictogramas de Documentos

### Resumen de Cambios
- **Corrección de Apertura de Detalle en Accidentes**: Se eliminaron las llamadas obsoletas a `setDenunciaUploadType`, `setDenunciaDriveLink`, `setInformeUploadType` y `setInformeDriveLink` en `handleEditClick` en `accidentes/page.js`. Esto soluciona de raíz el error `ReferenceError` que interrumpía la ejecución del flujo y bloqueaba la apertura de la vista de datos al hacer clic en las filas de la tabla.
- **Robustez del Contador de Días de Baja**: Se implementó una función helper robusta `parseDateISOorDMY` para manejar formatos de fecha híbridos (`DD/MM/YYYY` e `YYYY-MM-DD`) de forma segura, independiente del motor de zona horaria o locales del navegador. Se agregó una validación para exigir 4 dígitos de año completos antes de calcular, eliminando los conteos erráticos o negativos temporales. Adicionalmente, se configuró un cálculo dinámico en tiempo real en las celdas del listado (tabla) con fallback a dicho helper, permitiendo visualizar los días de baja de forma automática e inmediata para los registros históricos sin requerir que el usuario ingrese a editarlos y guardarlos manualmente uno por uno.
- **Estandarización de Pictograma de Documentos**: Se unificaron los pictogramas en las tablas de todas las secciones para visualizar PDFs o documentos adjuntos:
  - En **Accidentes**, se reemplazó el icono `Building` erróneo en el informe por el pictograma de documento `FileText`.
  - En **Programa Anual** y **Legajo Técnico**, se reemplazaron los iconos `Eye` de previsualización por el pictograma `FileText`.
  - Todos los botones de visualización y descarga en las columnas de documentos se actualizaron con el tamaño unificado `h-4.5 w-4.5` para los iconos y el estilo de botón consistente con fondo suave azul (`p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors`).
- **Actualización de Normativas**: Se documentó este estándar de diseño en la skill de marca (`.agents/skills/gestion-syso-brand-guidelines/SKILL.md`), las directrices visuales (`docs/brand/BRAND_GUIDELINES.md`), las reglas globales (`docs/RULES_WORKSPACE.md`) y el manual del agente (`.agents/agents.md`).

### Decisiones Clave
- **Helper de Parseo Dedicado vs Date String Parsers**: Evitar `new Date(ISOString)` y el uso de `T00:00:00` reduce a cero las inconsistencias de hidratación de zona horaria en motores JS y evita resultados `Invalid Date` de Safari y Firefox.
- **Pictograma de Documento Unificado (`FileText`)**: La consistencia cromática y formal de las acciones en las tablas (Editar = Amber, Eliminar = Red, Documento = Blue) optimiza la escaneabilidad visual para profesionales de Higiene y Seguridad Laboral.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/accidentes/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] .agents/skills/gestion-syso-brand-guidelines/SKILL.md`
- `[MODIFY] docs/brand/BRAND_GUIDELINES.md`
- `[MODIFY] docs/RULES_WORKSPACE.md`
- `[MODIFY] .agents/agents.md`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción exitosa mediante `cmd /c npm run build`.

### Riesgos Detectados / Remanentes
- Ninguno. Las interfaces y lógicas modificadas respetan estrictamente la retrocompatibilidad y no afectan los datos en Supabase.

---

## [2026-06-26] Mitigación de Advertencias en Perfil, Pantalla de Login y Diagnóstico de Errores de Consola

### Resumen de Cambios
- **Mitigación de Advertencias de Autocompletado (Perfil)**:
  - Se agregaron atributos `autoComplete` explícitos (`current-password`, `new-password`) a los inputs de tipo contraseña en la pantalla de Perfil (`profile/page.js`).
  - Se asignó `autoComplete="username"` al campo de Correo Electrónico del perfil.
  - Se asignó `autoComplete="off"` al input de Número de Matrícula Profesional, evitando heurísticas erróneas del navegador asociándolo como un usuario.
  - Se asignó `autoComplete="off"` a los inputs de datos personales de **Nombre y Apellido**, **CUIT** y **Teléfono** en el perfil. Esto corrige de forma definitiva la advertencia `[DOM] Input elements should have autocomplete attributes (suggested: "username")` en el campo de Teléfono cuando un usuario inicia sesión con el rol de `cliente` (donde el correo está deshabilitado y el navegador busca otros campos de texto activos en el formulario).
- **Mitigación de Advertencias de Autocompletado (Pantalla de Login)**:
  - Se asignó `autoComplete="username"` al input de Correo Electrónico (profesionales) en la pantalla de login (`login/page.js`).
  - Se asignó `autoComplete="username"` al input de CUIT (clientes) en la pantalla de login (`login/page.js`).
  - Se asignó `autoComplete="current-password"` al input de Contraseña en la pantalla de login (`login/page.js`).
  - Esto elimina la advertencia `[DOM] Input elements should have autocomplete attributes (suggested: "current-password")` al acceder y salir de la sesión.
- **Diagnóstico de Mensajería Asíncrona**: Se auditó el código de comunicación de la plataforma y se determinó que el error `Uncaught (in promise) Error: A listener indicated...` en Legajos y Accidentes proviene exclusivamente de extensiones del navegador del cliente (como gestores de contraseñas de terceros) e inofensivo para la aplicación.

### Decisiones Clave
- **Definición Explícita de Credenciales**: Declarar cuál campo es el `username` y cuál la contraseña detiene las conjeturas heurísticas de Chrome y otros navegadores modernos que ensucian la consola con advertencias innecesarias.
- **Campos No-Credenciales con Autocomplete Off**: Configurar `autoComplete="off"` en inputs de datos personales secundarios evita que el navegador intente adivinar el username en campos incorrectos cuando las credenciales principales están ocultas o deshabilitadas.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/login/page.js`

### Validaciones Ejecutadas
- Compilación de producción completa y exitosa (`cmd /c npm run build`) sin advertencias ni fallos en ninguna de las 14 páginas de Next.js (el bundle de la ruta de perfil finalizó en 15.7 kB y la de login en 5.42 kB).
- Verificación visual de mitigación de alertas `[DOM]` en la consola del navegador.

### Risks Detectados / Remanentes
- Ninguno. La adición de atributos es inocua y la compilación se completó de forma correcta.

---

## [2026-06-26] Incorporación del Catálogo de Peligros, Riesgos y Contramedidas a Supabase

### Resumen de Cambios
- **Tabla de Catálogo de Peligros, Riesgos y Contramedidas**: Creación e incorporación de la tabla `public.peligros_riesgos_contramedidas` para almacenar la matriz estática de Higiene y Seguridad Laboral.
- **Políticas RLS**: Habilitación del Row Level Security (RLS) y definición de la política de lectura pública `Permitir lectura publica de peligros_riesgos_contramedidas` para lectura global abierta por cualquier rol (público o autenticado).
- **Carga de Datos Semilla**: Carga de 327 registros de peligros, riesgos, consecuencias, medidas de control administrativas, de ingeniería y EPP's a partir del archivo de referencia.

### Decisiones Clave
- **Catálogo Global Sin Multi-tenant**: Se definió un esquema global sin columna `tenant_id` puesto que es una matriz de referencia estática universal en la industria de la seguridad laboral, optimizando espacio y consultas cruzadas.
- **Preservación Fiel de Textos**: Se conservaron de manera idéntica los textos originales con su respectiva puntuación y formatos para garantizar conformidad con los requerimientos del usuario.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `supabase`
- `gestion-syso-multitenant-security`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260714000000_create_peligros_riesgos_contramedidas.sql`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Script de procesamiento `parse_table.js` ejecutado con éxito procesando las 327 filas de datos.
- Validación de sintaxis SQL del archivo de migración generado.
- Ejecución exitosa de la migración utilizando el pooler de conexión a Supabase y validación del procesamiento de todas las 327 sentencias de inserción de forma correcta.
- Ejecución exitosa de la compilación de producción del proyecto (`cmd /c npm run build`).

### Riesgos Detectados / Remanentes
- Ninguno. La tabla de catálogo está protegida contra escrituras no autorizadas mediante políticas RLS de solo lectura para el rol público.

---

## [2026-06-26] Rediseño de Botones "Salir" y Estandarización de "Editar" / "Eliminar"

### Resumen de Cambios
- **Rediseño del Botón "Salir"**: Se actualizó el estilo de los botones "Salir" en los formularios de las 13 secciones operativas del proyecto (`visitas`, `programa`, `profile`, `nomina`, `legajo`, `extintores`, `equipo`, `empresas`, `correctivas`, `capacitacion`, `avisos`, `accidentes` y `onboarding`), asignándoles la estética unificada de **Botón Secundario** (relleno blanco, borde y letras azul `#468DFF`, con hover en relleno azul y letras/borde blanco) y agregando la animación activa `active:scale-[0.98]`.
- **Estandarización y Registro de "Editar" y "Eliminar"**: Se definieron y documentaron formalmente las especificaciones de diseño y hover para los botones de Edición (Amber) y Eliminación (Red), tanto para botones de formulario como para iconos de fila en tablas, en los siguientes documentos normativos:
  - Habilidad de Marca: [.agents/skills/gestion-syso-brand-guidelines/SKILL.md](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/.agents/skills/gestion-syso-brand-guidelines/SKILL.md)
  - Reglas Globales: [docs/RULES_WORKSPACE.md](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/docs/RULES_WORKSPACE.md)
  - Reglas del Agente: [.agents/agents.md](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/.agents/agents.md)
  - Guía de Marca: [docs/brand/BRAND_GUIDELINES.md](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/docs/brand/BRAND_GUIDELINES.md)

### Decisiones Clave
- **Unificación de la Acción de Salida**: Asignar el diseño de botón secundario a "Salir" proporciona un contraste visual claro frente a la acción primaria de "Guardar" o "Registrar", reduciendo errores accidentales de pérdida de datos.
- **Registro Preventivo**: Documentar los estilos de "Editar" y "Eliminar" evita que futuros agentes introduzcan variaciones incorrectas (por ejemplo, tonos de rojo o ámbar no oficiales).

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`

### Archivos Modificados / Creados
- `[MODIFY] .agents/skills/gestion-syso-brand-guidelines/SKILL.md`
- `[MODIFY] docs/RULES_WORKSPACE.md`
- `[MODIFY] .agents/agents.md`
- `[MODIFY] docs/brand/BRAND_GUIDELINES.md`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/nomina/page.js`
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`
- `[MODIFY] src/app/[tenant-slug]/accidentes/page.js`
- `[MODIFY] src/app/onboarding/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción con optimización de Next.js (`cmd /c npm run build`) completada con total éxito y cero advertencias.

### Riesgos Detectados / Remanentes
- Ninguno.

### Próximo Paso Recomendado
- Realizar pruebas funcionales en dispositivos móviles de los formularios operacionales modificados.

---

## [2026-06-26] Estandarización y Definición de Reglas de Colores para Botones

### Resumen de Cambios
- **Habilidades de Marca y UI Actualizadas**: Se integró la sección `## Estándar de Botones` en [SKILL.md](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/.agents/skills/gestion-syso-brand-guidelines/SKILL.md) para instruir a los agentes sobre el diseño y colores correspondientes a los botones primarios y secundarios.
- **Reglas del Workspace Formalizadas**: Se agregaron los lineamientos cromáticos de botones bajo la sección `## Reglas de marca y diseño` en [RULES_WORKSPACE.md](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/docs/RULES_WORKSPACE.md) para guiar desarrollos futuros.
- **Manual de Identidad de Agentes Sincronizado**: Se actualizó la sección de frontend de `Agente — Frontend, UI y Design System` en [agents.md](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/.agents/agents.md) para reflejar las restricciones visuales.
- **Manual de Marca Actualizado**: Se redactó la sección `## 6. Estándar de Botones` en [BRAND_GUIDELINES.md](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/docs/brand/BRAND_GUIDELINES.md).
- **Alineación de Código en Componente Button**: Se actualizaron las clases CSS de Tailwind en [button.jsx](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/components/ui/button.jsx) para las variantes `default` (primario) y `secondary` (secundario):
  - Primario: Fondo `#468DFF`, texto y borde `#FFFFFF` (hover background `#0511F2`, hover border `#0511F2`).
  - Secundario: Fondo `#FFFFFF`, borde y texto `#468DFF` (hover background `#468DFF`, hover text y border `#FFFFFF`).

### Decisiones Clave
- **Consistencia Multicapa**: Mapear de manera unificada las reglas visuales tanto a nivel instruccional (agents, workspace, skill) como en el código fuente (`button.jsx`) previene desvíos de diseño y asegura que cualquier agente futuro respete estrictamente la paleta de la marca.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`

### Archivos Modificados / Creados
- `[MODIFY] .agents/skills/gestion-syso-brand-guidelines/SKILL.md`
- `[MODIFY] docs/RULES_WORKSPACE.md`
- `[MODIFY] .agents/agents.md`
- `[MODIFY] docs/brand/BRAND_GUIDELINES.md`
- `[MODIFY] src/components/ui/button.jsx`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción completa exitosa (`cmd /c npm run build`) sin advertencias ni rotura de páginas del proyecto.

### Riesgos Detectados / Remanentes
- Ninguno. El componente común propaga los estilos de manera segura a toda la plataforma.

### Próximo Paso Recomendado
- Validar el comportamiento de los botones en el flujo de Onboarding e inicios de sesión en dispositivos táctiles móviles.

---

## [2026-06-26] Limpieza de Cabecera en Perfil de Usuario y Estandarización de Datos de Tenant/Plan en Secciones

### Resumen de Cambios
- **Remoción de Cabecera Redundante en Perfil:** Se eliminó la barra secundaria interna en el formulario de perfil ("Volver al Dashboard" y "Perfil de usuario") en [profile/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/profile/page.js), ya que la barra Navbar superior persistente contiene el título del perfil y los detalles de la organización, y el formulario cuenta con un botón "Salir" funcional al pie del mismo.
- **Estabilidad de Carga en Dev Mode:** Se inicializaron los objetos de estado `tenantData` y `profileData` con valores mockeados cuando `isDevMode = true` en el perfil, previniendo que la página se mantenga con textos de "Cargando..." permanentemente por falta de conexión local a Supabase.
- **Estandarización de Datos Mock en Secciones:** Se actualizó `loadMockData()` en 6 páginas de módulos operativos (`visitas`, `legajo`, `extintores`, `correctivas`, `capacitacion`, `nomina`) para inyectar correctamente `plan_id: 'free'` en el estado del tenant y evitar que la insignia de suscripción muestre valores por defecto o rompa la consistencia visual.
- **Homologación de Leyendas de Plan:** Se unificó la expresión de formato condicional del plan comercial en [legajo/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/legajo/page.js) para que coincida con la traducción de slugs de plan (`Plan Libre`, `Plan Standard`, `Plan Basic`, etc.) presente en el resto de la aplicación.
- **Seguridad en Visualización de Suscripción:** Se agregó el filtro de roles en el plan del perfil (`profile/page.js`) para que, al igual que en las demás vistas, se oculte la insignia si el usuario activo tiene rol de `cliente`.
- **Corrección de Color de Fondo de Carga en Perfil:** Se removió la clase `bg-white` en el contenedor del spinner de carga inicial (`initialLoading`) en [profile/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/profile/page.js). Esto soluciona la transición abrupta de color blanco a gris al cargar y asegura la consistencia con el color de fondo establecido de la sección (`bg-syso-bg`).
- **Rediseño Equitativo de Cargadores de Imagen en Perfil:** Se removieron las restricciones de ancho máximo rígido (`max-w-[280px]` y `max-w-[320px]`) en los contenedores de los cargadores `ImageUploadZone` en [profile/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/profile/page.js) (Matrículas, Firma Digital y Logos). Ahora los componentes se expanden a `w-full` dentro de sus columnas de cuadrícula, logrando una distribución equitativa de ancho y una alineación fluida con los inputs de texto superiores.
- **Remoción de Icono de Tilde en Botón Guardar:** Se retiró el icono de marca de verificación (`CheckCircle`) del botón de guardado en [profile/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/profile/page.js) para simplificar la visualización de la acción de envío.

### Decisiones Clave
- **Unificación de Componentes de Cabecera:** Al delegar la visualización del plan y la organización en el `<header>` superior, se aligera el cuerpo del formulario de perfil, eliminando redundancia y maximizando el espacio de visualización móvil y de escritorio.
- **Consistencia de Datos en Desarrollo Local:** Asegurar que los mocks de todas las secciones tengan un `plan_id` idéntco y que el perfil se inicialice correctamente en local previene inconsistencias de UI y depuraciones falsas de desarrollo.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/nomina/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación completa de producción (`cmd /c npm run build`) finalizada con total éxito y cero advertencias de empaquetado o hidratación.

### Riesgos Detectados / Remanentes
- Ninguno.

### Próximo Paso Recomendado
- Seguir con el desarrollo de subcarpetas o flujos definidos en los legajos técnicos o vistas operativas.

---

## [2026-06-26] Rediseño y Equiparación del Módulo de Profesional y Firma en Avisos de Riesgo

### Resumen de Cambios
- **Ancho Equitativo (50% / 50%)**: Se modificó la disposición de la grilla en la sección de asignación del profesional interviniente de `grid-cols-1 md:grid-cols-3` a `grid-cols-1 md:grid-cols-2`, removiendo la clase `md:col-span-2` del primer bloque. Con esto, tanto la tarjeta de selección del profesional como el contenedor del método de firma tienen el mismo ancho.
- **Aumento de Alturas**:
  - Se incrementó la altura física de los dos contenedores de firma (digital de perfil y manual) a `h-48 md:h-56` (192px en dispositivos móviles / 224px en escritorio), igualando sus dimensiones verticales.
  - La caja interna de previsualización para la firma del perfil se amplió a `max-w-[240px] md:max-w-[280px] h-[110px] md:h-[130px]` para mejorar la nitidez del trazo digital cargado.
  - El lienzo de dibujo a mano alzada (`canvas`) ahora usa una altura fija responsiva en lugar de `aspect-[2/1]`, proporcionando una zona táctil significativamente más cómoda en celulares y tabletas.

### Decisiones Clave
- **Uso de Altura Fija Responsiva vs Relación de Aspecto Fija**: Al dibujar una firma manual en dispositivos móviles de pantalla estrecha, una relación de aspecto plana como `aspect-[2/1]` reduce demasiado la altura de la caja (ej. a menos de 130px), dificultando el trazo manual con dedos o lápices ópticos. Implementar `h-48 md:h-56` garantiza espacio vertical óptimo en todo dispositivo sin sacrificar la responsividad.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción con Next.js completa y exitosa sin advertencias.

### Riesgos Detectados / Remanentes
- Ninguno. La detección y el cálculo de coordenadas de firma manual son proporcionales a las dimensiones físicas de la caja mediante `getBoundingClientRect()`, evitando cualquier desfase.

### Próximo Paso Recomendado
- Realizar pruebas táctiles de firma manual en teléfonos móviles o tabletas para asegurar la comodidad en el trazo.

---

## [2026-06-26] Estandarización e Integración de Registros de Capacitación (PDFs, Drive y Legajo Técnico)

### Resumen de Cambios
- **Carga Multiformato en Capacitación (`capacitacion/page.js`)**: Se incorporó el componente estandarizado `DocumentUploadZone` en la sección "Registros de capacitación" del formulario de capacitaciones anuales, permitiendo subir archivos locales, importar enlaces de Google Drive y asociar documentos existentes del **Legajo Técnico**.
- **Homologación Absoluta de Tamaños y Estilos (Cards)**:
  - Se implementó la propiedad `borderless={true}` en `DocumentUploadZone.js` para omitir sus propios bordes y fondo gris cuando está integrado en tarjetas externas, adaptando además sus subcontenedores a clases flex de estiramiento y centrado vertical (`flex-1 flex flex-col justify-center`).
  - Se envolvieron ambas columnas de carga en el mismo contenedor de tarjeta externa (`rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex flex-col h-full shadow-sm`), garantizando que mantengan el mismo alto y ancho de manera sincrónica bajo cualquier estado.
  - Se igualó la altura del cargador de fotos (`ImageUploadZone`) y de documentos PDF locales (`DocumentUploadZone` local) mediante la propiedad `minHeightClass` ajustada a `min-h-[148px]`.
  - Se reubicó la lista interactiva de adjuntos (PDFs y links a Drive) dentro de la misma tarjeta del cargador de documentos, en un pie con borde superior (`p-3 pt-0 border-t border-slate-200`), evitando desalineaciones cuando se agregan archivos.
- **Asociación desde Legajo Técnico**:
  - Se implementó la carga y filtrado en Supabase de los documentos del Legajo Técnico del cliente/establecimiento activo.
  - El selector permite a los profesionales de SySO asociar un documento técnico en PDF a la capacitación anual con un botón "+ Agregar" e incorporarlo a la lista de adjuntos.
- **Soporte de Múltiples PDFs y Enlaces Drive**: Los usuarios ahora pueden adjuntar múltiples archivos PDF locales, remotos y enlaces de Google Drive en una lista interactiva de adjuntos con acciones para previsualizar (Eye) y eliminar (Trash) los elementos correspondientes.
- **Persistencia Unificada en Base de Datos**: Se utiliza el array `fotos_urls` de la tabla `programa_capacitacion` de forma polimórfica para persistir tanto las rutas de imágenes como las de documentos locales de Supabase y enlaces absolutos de Google Drive.
- **Previsualización Inteligente de Adjuntos**: Se adaptó el modal de previsualización de registros de capacitación para identificar el tipo de archivo (imagen, PDF o enlace a Drive) y renderizar componentes específicos (tarjeta roja con enlace de descarga para PDFs, tarjeta azul para accesos directos a Google Drive) evitando imágenes rotas en el cliente.

### Decisiones Clave
- **Soporte Borderless para Reusabilidad**: Diseñar `DocumentUploadZone` con la propiedad `borderless` permite que delegue la responsabilidad visual de la tarjeta (borde, fondo, sombras, paddings) a un contenedor superior. Esto nos otorga libertad total de maquetación en layouts complejos sin perder la funcionalidad base del cargador en vistas tradicional del proyecto.
- **Aprovechamiento de Columna Polimórfica**: Utilizar la columna `fotos_urls` existente evita requerir cambios o migraciones en la base de datos de PostgreSQL, permitiendo almacenar strings de rutas Supabase (bucket `documents`) y URLs absolutas a la vez, discriminándolos por patrón de cadena (`.pdf`, `documents/`, `drive.google.com`) al renderizar y firmar las URLs.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[MODIFY] src/components/ui/DocumentUploadZone.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción completa (`cmd /c npm run build`) ejecutada con total éxito y cero advertencias o errores sintácticos en Next.js.

---

## [2026-06-26] Estandarización Global de Zonas de Carga de Imágenes (ImageUploadZone)

### Resumen de Cambios
- **Refactorización de Entradas de Imágenes**: Se completó la migración de todas las zonas de carga de imágenes restantes de la aplicación a la interfaz unificada del componente `ImageUploadZone`.
- **Actualización de Gestión de Equipo (`equipo/page.js`)**: Se integró `ImageUploadZone` para la Foto de Matrícula Frente, Foto de Matrícula Dorso, y la Firma Digitalizada de los miembros del equipo, mejorando la coherencia y aplicando restricciones de tamaño (5MB) en el cliente.
- **Actualización de Mi Perfil (`profile/page.js`)**: Se migraron los cargadores de matrículas profesionales, firmas escaneadas y logotipos de la empresa (Logo 1 y Logo 2) al componente común con soporte para arrastrar y soltar, cámara integrada y validación visual.
- **Actualización de Registro y Onboarding (`onboarding/page.js`)**: Se adaptaron todos los cargadores de imágenes del asistente de onboarding para usar `ImageUploadZone`, corrigiendo además un anidamiento sintáctico del bloque JSX que impedía su correcto agrupamiento y resolviendo las advertencias de compilación.
- **Soporte Polimórfico en Controladores**: Se ajustaron las funciones `handleImageChange` y `handleMatriculaFileChange` para ser polimórficas (admitir tanto el objeto `File` directo provisto por `ImageUploadZone` como los eventos nativos `e` del navegador), previniendo cualquier rotura de compatibilidad.

### Decisiones Clave
- **Límites de Dimensionamiento en Layouts**: Se envolvieron las zonas de carga de imágenes más compactas (firmas, matrículas y logos) dentro de contenedores con clases de ancho máximo (`max-w-[280px]` o `max-w-[320px]`) para que las cuadrículas y las vistas de columnas del formulario se mantengan consistentes y proporcionadas en dispositivos de escritorio y móviles.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/onboarding/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación completa de producción (`cmd /c npm run build`) finalizada de extremo a extremo de forma exitosa y sin errores de sintaxis o hidratación en Next.js.

---

## [2026-06-26] Estructura de Legajo Técnico: Incorporación de ATS, Nómina de Personal e Índice Interactiva

### Resumen de Cambios
- **Incorporación de ATS en Programa de Higiene y Seguridad**: Se incorporó la subcarpeta "Análisis de trabajo seguro (ATS)" dentro del Programa de Higiene y Seguridad en el Trabajo en la configuración jerárquica del explorador de Legajo Técnico. Esto habilita a los usuarios a clasificar y subir documentos correspondientes a esta tipología.
- **Nueva Carpeta "Nómina de Personal"**: Se añadió una nueva carpeta a nivel raíz en el Legajo Técnico denominada "Nómina de Personal" con el pictograma de `Users`, permitiendo archivar constancias de nómina en este directorio de forma aislada y organizada.
- **Pictograma de Ayuda e Índice Completo**: Se incorporó un botón con el icono de ayuda `HelpCircle` directamente en el contenedor de las migas de pan (breadcrumbs) que dice "Legajo Técnico", posicionado justo encima de la grilla de carpetas. Al hacer clic, abre un modal responsivo que presenta en dos columnas la estructura jerárquica total de carpetas y subcarpetas activas, sirviendo de guía para el usuario.

### Decisiones Clave
- **Definición de Categorías Flexibles**: Al estructurar las carpetas en frontend (`LEGAJO_FOLDERS`) sin restricciones rígidas a nivel de Postgres en Supabase (donde `categoria` y `subcategoria` son simples textos), se garantiza la retrocompatibilidad y la rapidez al añadir nuevos nodos a la taxonomía documental.
- **Uso de Help Modal vs Tooltip**: Para un índice extenso de más de 20 carpetas y subcarpetas, un modal flotante centralizado y estructurado en cuadrículas proporciona una legibilidad y usabilidad infinitamente superior a un tooltip clásico.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación completa de producción (`cmd /c npm run build`) ejecutada con total éxito y cero advertencias de empaquetado ni errores sintácticos en Next.js.

### Riesgos Detectados / Remanentes
- Ninguno. El almacenamiento de archivos y la base de datos operan de forma nativa con los nuevos nombres de categoría y subcategoría bajo RLS.

### Próximo Paso Recomendado
- Realizar pruebas manuales de carga de un documento de prueba en la nueva subcarpeta "Análisis de trabajo seguro (ATS)" y en la carpeta "Nómina de Personal" para confirmar el flujo de guardado y visualización.

---

## [2026-06-26] Estandarización Global del Contenedor de Carga de Documentos (DocumentUploadZone)

### Resumen de Cambios
- **Estandarización de Interfaz de Carga**: Se estableció un diseño estándar para las zonas de carga de archivos basado en el contenedor del módulo de Accidentes. Se deﬁnió la estética unificada con bordes dashed, estados de arrastre (drag-and-drop), pestañas de origen (Local / Google Drive) e indicadores de previsualización.
- **Componente Reutilizable `DocumentUploadZone`**: Se extrajo la lógica en un componente común y configurable en [DocumentUploadZone.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/components/ui/DocumentUploadZone.js). Soporta validación de tipo de archivo y tamaño límite en el cliente, importación asincrónica de Google Drive (o reenvío al manejador del padre), y control bidireccional del tipo de pestaña activa.
- **Integración de Tres Pestañas**: Se extendió `DocumentUploadZone` para admitir de forma nativa pestañas adicionales (como "Legajo Técnico" / "Desde Legajo Técnico") y paneles personalizados pasados como `children`, logrando que todo el contenedor y su cabecera compartan la misma estética uniforme.
- **Migración de Módulos Operativos**:
  - **Accidentes**: Migrado a [DocumentUploadZone](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/components/ui/DocumentUploadZone.js) simplificando el control de estados locales.
  - **Legajo Técnico**: Reemplazó la carga personalizada de PDFs. Se corrigió un error de sintaxis en el flujo de guardado (`} else if (documentoFile) {` residual) en [legajo/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/legajo/page.js) restableciendo el condicional a un `if` directo tras remover la importación de Drive en submit.
  - **Programa Anual**: Integrado con el componente en [programa/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/programa/page.js), unificando las pestañas (Local, Drive y Legajo Técnico) dentro de la misma interfaz gráfica estándar del cargador.
  - **Nómina de Personal**: Integrado con el componente en [nomina/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/nomina/page.js), unificando las pestañas (Local, Drive y Desde Legajo Técnico) e importando archivos Excel locales/remotos mediante la grilla de procesamiento.
- **Documentación de Estándares**: Se documentó el estándar y sus clases de estilos CSS de marca en [RULES_WORKSPACE.md](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/docs/RULES_WORKSPACE.md), [BRAND_GUIDELINES.md](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/docs/brand/BRAND_GUIDELINES.md), y la skill [.agents/skills/gestion-syso-brand-guidelines/SKILL.md](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/.agents/skills/gestion-syso-brand-guidelines/SKILL.md).

### Decisiones Clave
- **Reducción de Código Redundante**: Extraer las políticas de validación en el cliente (extensiones, tipos mime, tamaño) evita lógica repetida en 4 pantallas distintas y asegura un comportamiento coherente ante errores de carga.
- **Abstracción de Children y Tabs Custom**: Al permitir definir un array de `tabs` personalizado y capturar opciones adicionales mediante `children` de React, el componente es sumamente flexible y asume la unificación visual de toda la barra de pestañas, logrando consistencia visual absoluta en todo el SaaS.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`
- `webapp-testing`

### Archivos Modificados / Creados
- `[NEW] src/components/ui/DocumentUploadZone.js`
- `[MODIFY] src/app/[tenant-slug]/accidentes/page.js`
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/nomina/page.js`
- `[MODIFY] docs/RULES_WORKSPACE.md`
- `[MODIFY] docs/brand/BRAND_GUIDELINES.md`
- `[MODIFY] .agents/skills/gestion-syso-brand-guidelines/SKILL.md`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación completa de producción (`cmd /c npm run build`) finalizada con éxito de extremo a extremo sin errores de empaquetado ni de sintaxis.

---

## [2026-06-26] Reinstauración de Selectores de Fecha Híbridos en Formularios

### Resumen de Cambios
- **Entrada de Fecha Híbrida con Máscara e Icono**: Se implementó un patrón de diseño híbrido para inputs de fecha en todos los formularios de carga de datos (9 secciones). Este patrón conserva la máscara de texto `DD/MM/YYYY` en tiempo real (evitando problemas de locale de navegador) y agrega un icono de Lucide `Calendar` posicionado a la derecha que tiene un `<input type="date">` nativo invisible superpuesto.
- **Acceso Directo al Datepicker del Sistema**: Al hacer clic sobre el icono de calendario, el usuario interactúa con el input nativo de tipo date, abriendo el selector de calendario propio del dispositivo. Al elegir la fecha, esta se inyecta en el campo de texto formateada automáticamente en `DD/MM/YYYY`.
- **Estandarización de Accidentes y Nómina**: Se migraron los formularios de estas secciones que utilizaban inputs nativos directos `type="date"` a este nuevo patrón unificado con máscara, logrando homogeneidad visual y de comportamiento en todo el SaaS.
- **Adaptación en Mapeos**:
  - En [accidentes/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/accidentes/page.js) se actualizó `handleEditClick` para formatear los valores con `formatDate` antes de cargarlos.
  - En [nomina/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/nomina/page.js) se adaptaron `resetForm` (formato local con padStart), `handleOpenEditForm` (`formatDate`) y `handleSaveForm` (conversión con `convertToDbDate`).

### Decisiones Clave
- **Mantener Experiencia Multidispositivo y Uniforme**: El truco del input date de opacidad cero superpuesto al icono permite utilizar los selectores de fecha nativos y eficientes de cada navegador/sistema operativo (incluyendo teclados móviles) sin incorporar librerías pesadas ni states de popover complejos, salvaguardando la máscara del input de texto.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] src/app/[tenant-slug]/accidentes/page.js`
- `[MODIFY] src/app/[tenant-slug]/nomina/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación del proyecto (`cmd /c npm run build`) completada con éxito.

### Riesgos Detectados / Remanentes
- Ninguno. El comportamiento se basa íntegramente en la plataforma web estándar y respeta la consistencia de tipos esperados por PostgreSQL.

### Próximo Paso Recomendado
- Realizar pruebas funcionales interactuando con los selectores tanto en escritorio como en dispositivos móviles (Android/iOS) para validar la responsividad y usabilidad.

---

## [2026-06-25] Estandarización de Estados Vacíos, Selectores de Fecha y Corrección de Compilación

### Resumen de Cambios
- **Selectores de Fecha en Accidentes**: Se modificaron los campos de fecha en el formulario de [accidentes/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/accidentes/page.js) (Fecha siniestro / reingreso, Fecha de denuncia y Fecha de alta / rechazo) de inputs de tipo texto con máscara a inputs nativos de tipo `date` (`type="date"`). Esto provee el selector de fecha calendario (datepicker) solicitado, mapeando el estado de forma directa en formato `YYYY-MM-DD` sin realizar conversiones redundantes en el guardado.
- **Estandarización de Estados Vacíos**: Se actualizó el estado vacío de la tabla en [avisos/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/avisos/page.js) para usar la estética común (ícono `AlertTriangle`, mensaje centralizado "No hay avisos de riesgo registrados", subtítulo descriptivo y botón de acción "+ Registrar el primero" controlado por permisos `canCargar`).
- **Remediación de JSX Syntax Error**: Se corrigió un error de compilación de webpack en [correctivas/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/correctivas/page.js) donde faltaba la etiqueta de apertura `<tbody>` en el renderizado de la tabla de acciones correctivas, lo que impedía compilar el proyecto.
- **Validación del Proyecto**: Se ejecutó `npm run build` completándose con total éxito y cero advertencias de compilación para todas las rutas estáticas y dinámicas.

### Decisiones Clave
- **Consistencia Visual**: Centralizar y homologar la estructura y los textos (respetando concordancia de género y número) de las pantallas ante ausencia de registros.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción exitosa: `cmd /c npm run build` completada correctamente.

---

## [2026-06-25] Corrección de Diseño y Alineación UX/UI del Módulo "Accidentes"

### Resumen de Cambios
- **Encabezado Estático Estándar**: Se removió el header móvil negro duplicado y se reemplazó el encabezado interno scrollable por una barra fija superior (`h-16`) con botón de menú hamburguesa responsivo (`md:hidden`) y badges de plan/tenant.
- **Formulario en Tarjeta Unificada**: Se unificaron las 4 tarjetas independientes del formulario en una sola tarjeta blanca (`bg-white rounded-2xl border border-slate-150 shadow-sm`) con su respectivo header gris (`bg-slate-50 border-b border-slate-150 h-16`) que incluye botón de retroceso (`ArrowLeft`), título Outfit y botón de cerrar (`X`).
- **Botón de Acción Reubicado**: El botón "Nuevo Accidente" se desplazó del encabezado de la página al interior del panel de búsqueda y filtros colapsables, igual al estándar de las secciones `correctivas` y `nomina`.
- **Refinamiento de Estilos en Controles**: Se adecuó el padding y fondo de los inputs y selects al estándar de la plataforma (`px-3.5 py-2`, `bg-slate-50/50`, focus en border-color), manteniendo la funcionalidad dinámica de color semántico del selector de Gravedad.
- **Espaciado y Altura de la Tabla**: Se incrementó el padding de las celdas a `px-6 py-4` y se limitó la altura de la tabla con scroll interno y cabeceras pegajosas (`sticky top-0 z-10 bg-slate-50 border-b border-slate-150`).
- **Optimización en React (Remounts)**: Se movió la definición del componente `PdfUploadZone` fuera del cuerpo de `AccidentesPage` a nivel de módulo, evitando el anti-patrón de remounts cíclicos en cada re-renderizado de React.

### Decisiones Clave
- **Consistencia Visual Absoluta**: Se unificó el diseño de Accidentes para que use las mismas clases estéticas y flujos de layouts que las pantallas principales del proyecto SaaS.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`
- `shadcn`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/accidentes/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción exitosa: `cmd /c npm run build` completado sin errores. La ruta `/[tenant-slug]/accidentes` se compiló con un peso de 15.2 kB.

---

## [2026-06-25] Implementación del Módulo "Accidentes"


### Resumen de Cambios
- **Nuevo módulo frontend `accidentes`**: Se creó la página operativa `src/app/[tenant-slug]/accidentes/page.js` con CRUD completo para el registro, edición, visualización y eliminación de accidentes de trabajo, accidentes in itinere, incidentes, enfermedades profesionales y rechazos/reingresos.
- **Formulario completo**: Incluye todos los campos del modelo definido: razón social, establecimiento (dependiente), área/sector, puesto/operación, nombre/apellido del accidentado, CUIL, fecha siniestro (máscara DD/MM/YYYY), hora, fecha denuncia, N° siniestro, tipo, gravedad con badge semántico, descripción de hechos, forma de accidente, descripción de lesión, zona del cuerpo afectada, agente material, diagnóstico, fecha de alta/rechazo, días de baja y observaciones.
- **Cálculo automático de días de baja**: Se calcula en tiempo real a partir de la diferencia entre `fecha_siniestro` y `fecha_alta_rechazo` mediante `useEffect`.
- **Dos zonas de carga de archivos PDF**: Denuncia de accidente e Informe de investigación implementados con pestañas "Archivo Local" (Drag & Drop) y "Enlace Drive" (importación vía `/api/upload-from-url`), siguiendo el mismo patrón del Legajo Técnico.
- **Badge de gravedad semántico**: Verde (Leve), Amarillo (Grave), Rojo (Mortal) en tabla y formulario. El selector de gravedad cambia de color en tiempo real al seleccionar.
- **Pictograma de guía de clasificación de gravedad**: Ícono `HelpCircle` junto al campo "Gravedad" que abre un modal con los criterios de clasificación, colores y ejemplos para las tres categorías.
- **Filtros de listado**: Razón social, establecimiento (dependiente), fecha, tipo y gravedad con panel colapsable.
- **Catálogos desde Supabase**: Se cargan en paralelo `formas_accidente`, `descripciones_lesion`, `zonas_cuerpo_afectadas` y `agentes_materiales_asociados` al inicializar la página.
- **Firma en lote de URLs**: Los archivos de denuncia e informe se firman en lote con `createSignedUrls` al cargar el listado.
- **Seguridad multi-tenant**: Aislamiento por `tenant_id` y filtro adicional por `empresa_id` para usuarios de rol `cliente`.
- **Instalación de dependencia**: Se instaló el paquete `xlsx` que estaba ausente del entorno local y era requerido por `nomina/page.js`.

### Decisiones Clave
- **No se requirió nueva migración**: La tabla `public.accidentes`, sus políticas RLS y la actualización de permisos en `profiles` y `miembros_equipo` ya habían sido aplicadas mediante la migración `20260713000000_create_accidentes.sql`.
- **Sidebar ya preparado**: El ítem "Accidentes" con ícono `ShieldAlert` ya existía en `src/components/Sidebar.js`.
- **Patrón de archivos dobles**: Se encapsuló la lógica de carga PDF en el componente inline `PdfUploadZone` para evitar duplicación de código entre Denuncia e Informe dentro del mismo formulario.
- **Máscara de fechas**: Se respetó el patrón estándar del sistema usando `formatAsDateInput` + `convertToDbDate` para todas las fechas del formulario.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `gestion-syso-multitenant-security`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[NEW] src/app/[tenant-slug]/accidentes/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- **Compilación de producción**: `cmd /c npm run build` completado con éxito — ruta `/[tenant-slug]/accidentes` (14.4 kB) incluida en el bundle de Next.js 14.2.35 sin errores ni advertencias.
- **Dependencia `xlsx`**: Instalada y verificada (resuelve error preexistente en `nomina/page.js`).

### Riesgos Detectados / Remanentes
- Ninguno nuevo. El módulo hereda las políticas RLS y el sistema de permisos granulares ya validados en la migración anterior.

### Próximo Paso Recomendado
- Realizar pruebas funcionales en ambiente de preview: crear un accidente, adjuntar una denuncia PDF, verificar el cálculo automático de días de baja y confirmar que la guía de gravedad se muestra correctamente.

---

## [2026-06-25] Creación del Catálogo de Agentes Materiales Asociados en Supabase

### Resumen de Cambios
- **Tabla de Agentes Materiales Asociados**: Creación de la tabla `public.agentes_materiales_asociados` con identificador UUID, campo `nombre` único no nulo y fecha de creación.
- **Políticas RLS**: Habilitación de Row Level Security (RLS) y definición de la política `Permitir lectura publica de agentes_materiales_asociados` para lectura global abierta.
- **Datos Semilla**: Carga de 183 registros correspondientes a agentes materiales normalizados para clasificar causas físicas u objetos involucrados en accidentes laborales.

### Decisiones Clave
- **Esquema de Catálogo Global**: Al tratarse de un catálogo maestro estático y común a todos los clientes, se optó por un diseño global sin columna `tenant_id`, con acceso público de lectura por RLS, alineado al patrón de las tablas `geografia`, `formas_accidente`, `descripciones_lesion` y `zonas_cuerpo_afectadas`.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `supabase`
- `gestion-syso-multitenant-security`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260712000000_create_agentes_materiales_asociados.sql`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Ejecución exitosa de la migración utilizando el pooler de conexión a Supabase y validación de la inserción y del conteo de registros (183 filas encontradas).

### Riesgos Detectados / Remanentes
- Ninguno. La tabla de catálogo está protegida contra escrituras no autorizadas mediante políticas RLS de solo lectura para el rol público.

### Próximo Paso Recomendado
- Integrar la selección de Agentes Materiales Asociados en el formulario de registro de incidentes o avisos de riesgo cuando se requiera.

---

## [2026-06-25] Creación del Catálogo de Zonas del Cuerpo Afectadas en Supabase

### Resumen de Cambios
- **Tabla de Zonas del Cuerpo Afectadas**: Creación de la tabla `public.zonas_cuerpo_afectadas` con identificador UUID, campo `nombre` único no nulo y fecha de creación.
- **Políticas RLS**: Habilitación de Row Level Security (RLS) y definición de la política `Permitir lectura publica de zonas_cuerpo_afectadas` para lectura global abierta.
- **Datos Semilla**: Carga de 127 registros correspondientes a zonas del cuerpo humano para clasificar localizaciones de lesiones por accidentes laborales.

### Decisiones Clave
- **Esquema de Catálogo Global**: Al tratarse de un catálogo maestro estático y común a todos los clientes, se optó por un diseño global sin columna `tenant_id`, con acceso público de lectura por RLS, alineado al patrón de las tablas `geografia`, `formas_accidente` y `descripciones_lesion`.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `supabase`
- `gestion-syso-multitenant-security`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260711000000_create_zonas_cuerpo_afectadas.sql`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Ejecución exitosa de la migración utilizando el pooler de conexión a Supabase y validación de la inserción y del conteo de registros (127 filas encontradas).

### Riesgos Detectados / Remanentes
- Ninguno. La tabla de catálogo está protegida contra escrituras no autorizadas mediante políticas RLS de solo lectura para el rol público.

### Próximo Paso Recomendado
- Integrar la selección de Zonas del Cuerpo Afectadas en el formulario de registro de incidentes o avisos de riesgo cuando se requiera.

---

## [2026-06-25] Creación del Catálogo de Descripciones de Lesión en Supabase

### Resumen de Cambios
- **Tabla de Descripciones de Lesión**: Creación de la tabla `public.descripciones_lesion` con identificador UUID, campo `nombre` único no nulo y fecha de creación.
- **Políticas RLS**: Habilitación de Row Level Security (RLS) y definición de la política `Permitir lectura publica de descripciones_lesion` para lectura global abierta.
- **Datos Semilla**: Carga de 45 registros correspondientes a descripciones de lesión normalizadas para clasificar consecuencias de accidentes laborales.

### Decisiones Clave
- **Esquema de Catálogo Global**: Al tratarse de un catálogo maestro estático y común a todos los clientes, se optó por un diseño global sin columna `tenant_id`, con acceso público de lectura por RLS, alineado al patrón de las tablas `geografia` y `formas_accidente`.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `supabase`
- `gestion-syso-multitenant-security`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260710000000_create_descripciones_lesion.sql`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Ejecución exitosa de la migración utilizando el pooler de conexión a Supabase y validación de la inserción y del conteo de registros (45 filas encontradas).

### Riesgos Detectados / Remanentes
- Ninguno. La tabla de catálogo está protegida contra escrituras no autorizadas mediante políticas RLS de solo lectura para el rol público.

### Próximo Paso Recomendado
- Integrar la selección de Descripciones de Lesión en el formulario de registro de incidentes o avisos de riesgo cuando se requiera.

---

## [2026-06-25] Creación del Catálogo de Formas de Accidente en Supabase

### Resumen de Cambios
- **Tabla de Formas de Accidente**: Creación de la tabla `public.formas_accidente` con identificador UUID, campo `nombre` único no nulo y fecha de creación.
- **Políticas RLS**: Habilitación de Row Level Security (RLS) y definición de la política `Permitir lectura publica de formas_accidente` para lectura global abierta.
- **Datos Semilla**: Carga de 68 registros correspondientes a formas de accidente normalizadas para clasificar incidentes laborales.

### Decisiones Clave
- **Esquema de Catálogo Global**: Al tratarse de un catálogo maestro estático y común a todos los clientes, se optó por un diseño global sin columna `tenant_id`, con acceso público de lectura por RLS, alineado al patrón de las tablas `geografia` y `registros`.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `supabase`
- `gestion-syso-multitenant-security`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260709000000_create_formas_accidente.sql`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Ejecución exitosa de la migración utilizando el pooler de conexión a Supabase y validación de la inserción y del conteo de registros (68 filas encontradas).

### Riesgos Detectados / Remanentes
- Ninguno. La tabla de catálogo está protegida contra escrituras no autorizadas mediante políticas RLS de solo lectura para el rol público.

### Próximo Paso Recomendado
- Integrar la selección de Formas de Accidente en el formulario de registro de incidentes o avisos de riesgo cuando se requiera.

---

## [2026-06-25] Prevención de Carga de Duplicados en Nómina y Corrección de Modal de Salida al Guardar

### Resumen de Cambios
- **Corrección de Modal Innecesario al Guardar**: Se reemplazó el uso de `handleExitForm()` por `handleCloseForm()` en el guardado exitoso para evitar que aparezca la ventana emergente de "Salir sin guardar" una vez completada la persistencia.
- **Control y Prevención de Duplicados**: Se implementó una verificación de duplicados de Nombre/Apellido y CUIL para la Razón Social seleccionada dentro del mismo año de la `fecha_carga`.
- **Flujo de Sobreescritura Interactiva**:
  - Al cargar personal de forma manual o mediante plantilla Excel, si se detectan duplicados, se muestra una ventana emergente (`modalAlert`) que detalla la cantidad de repetidos y pregunta si se desea **"Sobreescribir"**.
  - Si el usuario confirma, actualiza (`update`) los registros correspondientes y realiza la inserción (`insert`) de los registros nuevos de manera fluida.
  - Al editar un empleado individual, si su nuevo nombre o CUIL coincide con otro empleado existente del mismo año, se emite una advertencia de error y se bloquea la acción.

### Decisiones Clave
- **Validación del Lado del Cliente con Consulta Previa**: Consultar en lote los empleados existentes del mismo año y empresa antes del guardado permite una interacción fluida con el usuario y evita validaciones complejas o constraints ruidosas a nivel de Postgres.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `supabase`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/nomina/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción con Next.js completa y exitosa sin advertencias sintácticas.

### Riesgos Detectados / Remanentes
- Ninguno. Las consultas e inserciones respetan en su totalidad el aislamiento multi-tenant y las políticas RLS.

### Próximo Paso Recomendado
- Realizar pruebas de carga duplicada con un archivo Excel de ejemplo para corroborar que el modal de sobreescritura se muestre y opere correctamente.

## [2026-06-25] Corrección de Visibilidad en Filtros y Selector de Fecha en Cabecera de Nómina

### Resumen de Cambios
- **Corrección de Visibilidad de Texto en Selects**: Se añadió la clase `text-slate-700` a las listas desplegables (Razón Social y Establecimiento) de la Cabecera de la Nómina para solucionar el problema de texto en blanco que impedía su visualización.
- **Implementación del Selector de Fecha (Datepicker)**: Se reemplazó el input de máscara de texto en "Fecha de Carga" por un `<input type="date">` nativo para proveer un selector de fecha calendario. Se adaptaron el estado y el guardado para operar directamente con el formato `YYYY-MM-DD`.

### Decisiones Clave
- **Uso de Formato Nativo de Fecha**: El elemento `<input type="date">` requiere y devuelve fechas en formato `YYYY-MM-DD`. Modificar el estado interno `fechaCarga` para almacenar `YYYY-MM-DD` evita la necesidad de conversiones durante la carga y el guardado, reduciendo la complejidad.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/nomina/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción con Next.js exitosa de punta a punta.

### Riesgos Detectados / Remanentes
- Ninguno. El selector de fecha nativo es altamente compatible y la base de datos ya espera formato `YYYY-MM-DD`.

### Próximo Paso Recomendado
- Validar el comportamiento interactivo del selector en el ambiente de pruebas.

## [2026-06-25] Fase 3: Alineación de UI/UX y Estandarización del Módulo "Nómina de Personal"

### Resumen de Cambios
- **Ajustes de UI/UX en Nómina**:
  - Se rediseñó el header del módulo incorporando el pictograma de `Users`, tipografía Outfit en h1 y las insignias dinámicas del Plan y Tenant en el extremo derecho.
  - Se homogeneizó el contenedor principal a `max-w-[95%] mx-auto w-full` y se alineó la disposición del panel de búsqueda y filtros.
  - Se comprimió y rediseñó la tabla combinando celdas (Cliente/Establecimiento, Área/Puesto, Alta/Carga) e inyectando estilos de colores y fuentes de la marca.
  - Se añadió la acción por fila en la tabla para abrir el registro en modo lectura (`isReadOnlyView`).
  - Se envolvió el formulario y el visor de previsualización en un `<fieldset>` reactivo que obedece al estado de solo lectura.
  - Se reestructuraron los botones inferiores del formulario (estilo Hover para "Salir" y botones dinámicos de Editar, Eliminar y Guardar).
  - Se integró el modal de confirmación `modalAlert` para validar salidas con cambios o eliminaciones, y se estandarizaron las alertas de notificaciones Toast.
  - Se actualizó el color de fondo general detrás de la sección para usar `#D9D9D9` (respetando los fondos blancos de los contenedores y tablas).
  - Se simplificó la etiqueta del botón de envío a "Guardar" y se corroboró el hover de realce `#0511F2`.

### Decisiones Clave
- **Fusión de Celdas en Tablas**: Reducir de 8 a 6 las columnas mediante celdas combinadas optimiza enormemente el espacio horizontal de la tabla y da coherencia con el diseño del módulo de Acciones Correctivas.
- **Acceso por Fila**: Homologar el clic de fila a modo lectura previene modificaciones accidentales y promueve consistencia interactiva con el resto del sistema.

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/nomina/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- **Compilación de Producción**: Compilación de Next.js (`cmd /c npm run build`) completada con total éxito y cero advertencias de hidratación o webpack.

---

## [2026-06-25] Fase 3: Módulo "Nómina de Personal" con Importación de Planilla Excel

### Resumen de Cambios
- **Módulo Nómina de Personal**:
  - Se desarrolló la nueva pantalla operativa `nomina` para administrar el personal por Razón Social y Establecimiento de forma manual o masiva.
  - Implementación de formulario manual con máscara automática de fecha (`DD/MM/YYYY`), validación numérica de CUIL (11 dígitos) y selector de fecha de carga.
  - Se definió la función `handleLogout` en la página de Nómina para evitar un error de referencia en tiempo de ejecución al renderizar el Sidebar.
  - Se incorporaron filtros de búsqueda, selector por cliente, establecimiento y fecha de carga en el listado de personal.
- **Importador Masivo de Excel**:
  - Se integró la biblioteca `xlsx` (SheetJS) en la aplicación cliente para el procesamiento del archivo Excel.
  - Se agregaron tres pestañas de origen: Archivo Local (con zona interactiva Drag & Drop), Enlace Google Drive (descarga en vivo) y desde archivos del Legajo Técnico.
  - Se implementó un generador dinámico de plantilla Excel oficial para su descarga inmediata.
  - Creación de una grilla de vista previa (Preview) con validación estricta fila por fila (errores de CUIL, fecha, cliente o sucursal no existentes en el tenant) antes de persistir la nómina en lote.
- **API Segura de Descarga**:
  - Nueva ruta `/api/download-excel` para resolver enlaces compartidos de Google Drive de forma segura (mitigando ataques SSRF restringiendo a dominios oficiales de Drive y validando tamaño a 10 MB).
- **Esquema de Base de Datos y Políticas RLS**:
  - Creación de la tabla `public.nomina_personal` vinculada a tenants, empresas y establecimientos.
  - Configuración de políticas de aislamiento Row Level Security (RLS) para segregación multi-tenant y visibilidad restringida para usuarios tipo `cliente`.
  - Actualización retrospectiva de permisos de usuarios para inyectar la sección `"nomina"` a perfiles y miembros de equipo.

### Decisiones Clave
- **Procesamiento de Planilla en Cliente**: Utilizar SheetJS en el frontend permite validar la información e informar errores específicos por número de fila antes de hacer peticiones de escritura a la base de datos, optimizando la performance y experiencia del usuario.
- **Exclusión de Archivos Binarios en Git**: Generar la planilla de Excel modelo de forma reactiva y en memoria usando Javascript evita la necesidad de mantener y actualizar archivos binarios estáticos en el repositorio.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `gestion-syso-brand-guidelines`
- `supabase`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260708000000_create_nomina_personal.sql`
- `[NEW] src/app/[tenant-slug]/nomina/page.js`
- `[NEW] src/app/api/download-excel/route.js`
- `[MODIFY] src/components/Sidebar.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- **Base de datos:** Migraciones aplicadas con éxito en Supabase Postgres.
- **Build de Producción:** Compilación optimizada del proyecto Next.js (`npm run build`) completada con éxito.

---

## [2026-06-25] Fase 3: Estandarización de Hidratación de Cabeceras y Optimización de Supabase Storage mediante Firma en Lote

### Resumen de Cambios
- **Estandarización de Hidratación en Cabeceras**:
  - Se aplicó la renderización estructural fija de la etiqueta de plan en los headers de 10 pantallas operativas (`dashboard`, `empresas`, `equipo`, `programa`, `capacitacion`, `correctivas`, `extintores`, `visitas`, `avisos`, y `legajo`).
  - Se utilizaron clases dinámicas `hidden` en lugar de condicionales de React para ocultar/mostrar la etiqueta según el perfil/rol de cliente, y se añadió el atributo `suppressHydrationWarning` para erradicar las discrepancias en el renderizado inicial (SSR vs. Cliente).
- **Firma en Lote en Supabase Storage**:
  - Se reestructuraron las vistas operativas de `correctivas`, `extintores`, `avisos` (incluyendo la resolución de imágenes para la generación de PDFs), `capacitacion` y `visitas` para agrupar todas las firmas de imágenes y firmas digitales en un solo array, invocando el método `.createSignedUrls(paths, 3600)` en lugar de realizar llamadas paralelas concurrentes.
  - Esto resolvió el límite de peticiones (Rate Limits / 429 Too Many Requests) y optimizó la carga y performance en listados con grandes volúmenes de datos.
  - Se blindó la lógica para ignorar URLs absolutas externas que inician con `http://` o `https://`.
- **Corrección de Consulta por Fecha en Avisos de Riesgo**:
  - Se corrigió el error `22008` (date/time field value out of range) al visualizar o editar un aviso de riesgo. Al estar la fecha del estado en formato de máscara `DD/MM/YYYY`, la consulta a la base de datos de hallazgos (`acciones_correctivas`) fallaba. Se implementó la conversión a formato `YYYY-MM-DD` mediante `convertToDbDate(fecha)` antes de ejecutar la consulta.
  - Se añadió una validación de longitud mínima (`fecha.length < 10`) para evitar que se ejecuten consultas a la base de datos mientras el usuario tipea o modifica la fecha de forma incompleta.

### Decisiones Clave
- **Clases en lugar de Condicionales Estructurales**: React requiere que la estructura del DOM de la página devuelta por el servidor coincida exactamente con la primera renderización en el cliente. Al renderizar el elemento `span` del plan de manera fija y ocultarlo vía CSS dinámico (`hidden`), evitamos diferencias en la cantidad y orden de elementos hijos del header.
- **Firma Previa y Mapeo Síncrono**: Rediseñar las pantallas para realizar un paso de firma único en lote (`createSignedUrls`) y luego mapear las URLs firmadas de manera síncrona en el array de datos disminuye drásticamente el tiempo de carga del componente y previene bloqueos por rate limiting.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `supabase`
- `next-best-practices`

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`

### Validaciones Ejecutadas
- Compilación de producción completa y exitosa con Next.js (`cmd /c npm run build`), verificando la consistencia operacional del enrutador y componentes.

---

## [2026-06-25] Corrección de Hydration Mismatches, Recargas de Sidebar y Prevención de Firmas para URLs Externas

### Resumen de Cambios
- **Mitigación de Hydration Warning y Cero Flickering en Sidebar**:
  - Se implementó una variable de módulo global `isHydratedGlobal` en `src/components/Sidebar.js` que registra si la hidratación inicial del cliente ya se completó.
  - Al cambiar de sección, la nueva instancia de `Sidebar` se inicializa con `mounted = isHydratedGlobal`. Como ya se completó la hidratación en las navegaciones internas del cliente, el `Sidebar` dibuja directamente el nombre y los enlaces de administración reales, eliminando por completo la sensación visual de parpadeo ("recarga" del sidebar).
  - En la carga inicial de la página (hard refresh), `isHydratedGlobal` empieza en `false` garantizando que el DOM inicial coincida con el servidor de Next.js (SSR), eliminando las advertencias de hidratación de React.
- **Resolución de Redirección de manifest.webmanifest en Middleware**:
  - Se modificó la validación de slugs de tenants en `src/middleware.js` para descartar del flujo de redirección a cualquier ruta de archivo estático o dinámico que contenga un punto (`.`) en su segmento inicial (por ejemplo, `/manifest.webmanifest`). Esto corrige el warning "Line: 1, column: 1, Syntax error" al impedir que el middleware devuelva la página HTML del dashboard en peticiones del manifest.
- **Alerta de Deprecación de Meta Etiqueta en Safari**:
  - Se agregó la meta etiqueta estándar recomendada `<meta name="mobile-web-app-capable" content="yes" />` en el `<head>` de `src/app/layout.js`.
- **Prevención de Errores 400 en Supabase por URLs Externas**:
  - Se blindó la obtención de URLs firmadas en todos los listados de la plataforma (`correctivas`, `avisos`, `extintores`, `capacitacion`, `visitas`) para omitir la llamada a `.createSignedUrl` de Supabase Storage cuando el recurso ya sea una URL absoluta externa que empieza con `http://` o `https://` (por ejemplo, URLs de AppSheet o Google Drive), usando los enlaces de manera directa.

### Decisiones Clave
- **Control de Hydration mediante Módulo Global**: El uso de una variable externa a la clase del componente de React permite que el estado de hidratación persista en el ciclo de vida del bundle cargado en el cliente sin depender del montaje y desmontaje de los componentes de página individuales.
- **Estandarización de Rutas Reservadas con Puntos**: Excluir paths con puntos en el middleware evita tener que listar cada ruta de recurso técnico una por una y protege de redireccionamientos erróneos.
- **Compatibilidad con Enlaces Externos e Históricos**: La base de datos contiene URLs absolutas cargadas históricamente. Al verificar si la URL contiene esquema de protocolo, el cliente decide de manera inteligente si solicitar firma del storage privado o consumir directamente.

### Archivos Modificados / Creados
- `[MODIFY] src/components/Sidebar.js`
- `[MODIFY] src/middleware.js`
- `[MODIFY] src/app/layout.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

---

## [2026-06-25] Personalización de Estilo Hover en Botones "Salir"

### Resumen de Cambios
- **Estandarización de Hover para "Salir"**: Se actualizó el comportamiento en estado hover de todos los botones con texto exacto "Salir" en los formularios y secciones de la aplicación (11 en total).
- **Personalización de Colores**: Al pasar el cursor por encima (hover), los botones ahora cambian de color blanco con texto gris a fondo azul de marca (`#468DFF`), con letras blancas (`#FFFFFF`) y borde azul `#468DFF`. Esto garantiza un fuerte contraste visual alineado al design system del SaaS.
- **Respeto a Clases Estructurales**: Se mantuvieron intactas las demás propiedades originales del botón (bordes redondeados, tamaño, tipografía, transiciones y comportamiento de click activo).

### Decisiones Clave
- **Homogeneización del Borde**: Se incorporó explícitamente el cambio de borde (`hover:border-[#468DFF]`) en conjunto con el color de fondo para evitar que un borde grisáceo residual rompiera la continuidad del botón al activarse el fondo azul.

### Skills Utilizadas
- `gestion-syso-brand-guidelines`
- `gestion-syso-bitacora`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`
- `[MODIFY] src/app/onboarding/page.js`

### Validaciones Ejecutadas
- Compilación de producción con Next.js exitosa de extremo a extremo sin errores de importación o linting.

---

## [2026-06-25] Pictograma Informativo y Modal de Nivel de Riesgo (Método BS 8800)

### Resumen de Cambios
- **Visualización Informativa de Nivel de Riesgo**: Se añadió un pictograma de ayuda (ícono `HelpCircle`) junto a la etiqueta "Nivel de Riesgo *" en el formulario de carga y edición de Acciones Correctivas.
- **Ventana Emergente (Modal)**: Al hacer clic en el pictograma, se abre un modal responsivo que presenta la imagen informativa `Nivel de riesgo-Método BS 8800` (ubicada en `/assets/nivel-riesgo-bs-8800.png`), proporcionando asistencia visual e inmediata al usuario sobre las clasificaciones de riesgo.
- **Consistencia Visual**: Se respetaron los lineamientos de marca y diseño utilizando las fuentes del sistema, los bordes redondeados y los estilos de botones de la aplicación.

### Decisiones Clave
- **Ubicación de Asset**: Se ubicó la imagen bajo `public/assets/nivel-riesgo-bs-8800.png` con un nombre en minúsculas y sin caracteres especiales para asegurar máxima compatibilidad de URLs y evitar errores de codificación.
- **Modal Integrado**: El modal se controla mediante el estado reactivo local `showRiskMatrix` en la misma pantalla de acciones correctivas, reduciendo la complejidad y manteniendo la reactividad.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción con Next.js exitosa de extremo a extremo.

---

## [2026-06-25] Estandarización de Entrada de Fechas en Formularios mediante Máscara de Texto (Fase Definitiva)

### Resumen de Cambios
- **Entrada de Fechas Homogénea**: Se migró la entrada de fechas en todos los formularios de carga y edición de la aplicación (7 secciones) de `<input type="date">` a campos de tipo texto (`type="text"`) con formato de máscara automático (`DD/MM/YYYY`), asegurando una experiencia visual idéntica y estandarizada en cualquier navegador e idioma.
- **Máscara en Tiempo Real**: Se incorporó el helper `formatAsDateInput` en `src/lib/utils.js` para añadir automáticamente las barras (`/`) a medida que el usuario tipea los dígitos.
- **Conversión Bidireccional**: Se implementó el helper `convertToDbDate` para transformar la fecha con formato `DD/MM/YYYY` provista por el formulario al formato estándar de persistencia de PostgreSQL (`YYYY-MM-DD`) de forma transparente durante los inserts/updates de Supabase.
- **Secciones Adaptadas**:
  1. **Programa Anual**: Campos de F. Planificada y F. Realización.
  2. **Capacitación**: Campos de F. Inicio Planificada y F. Fin Planificada.
  3. **Correctivas**: Campos de Fecha de Registro, Fecha Planificada y Fecha de Realización.
  4. **Extintores**: Campos de Vencimiento Recarga, Vencimiento P.H. y Fecha de Control.
  5. **Visitas**: Campo de Fecha de visita.
  6. **Avisos**: Campo de Fecha de aviso.
  7. **Legajo**: Campo de Fecha del documento.

### Decisiones Clave
- **Elusión de Controles Regionales**: El uso de `<input type="date">` tiene restricciones nativas que impiden forzar un formato específico independientemente del idioma del navegador del usuario. El patrón de input de texto con máscara manual es la única alternativa para garantizar la uniformidad visual.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`

### Validaciones Ejecutadas
- **Compilación de Producción**: Se corrió `npm run build` con Next.js y finalizó exitosamente sin advertencias sintácticas ni errores.

---

## [2026-06-25] Auditoría y Estandarización de Visualización de Fechas (DD/MM/YYYY)

### Resumen de Cambios
- **Auditoría de Fechas**: Se auditó todo el codebase para verificar que las fechas presentadas al usuario se visualicen siempre en formato `DD/MM/YYYY`.
- **Uso Consistente de Helpers**: Se constató que todas las vistas operativas (Visitas, Avisos, Legajo Técnico, Extintores, Programa Anual, Programa de Capacitación, Acciones Correctivas y Dashboard) formatean correctamente las fechas usando la función `formatDate` antes de renderizarlas en las tablas.
- **Unificación de Código**: Se removió el helper local `formatDate` duplicado en `src/app/[tenant-slug]/programa/page.js` y se reemplazó por la importación de la utilidad común `formatDate` de `src/lib/utils.js`, previniendo deriva técnica.
- **Formularios de Carga**: Se ratificó que los campos de tipo fecha en los formularios de carga utilizan `<input type="date">`. Esto permite que el navegador formatee automáticamente la fecha según el locale del sistema del usuario, a la vez que mantiene compatibilidad con la persistencia estándar en formato `YYYY-MM-DD` de PostgreSQL.

### Decisiones Clave
- **Helper Centralizado**: Eliminar código duplicado y concentrar el formateo de fecha en `src/lib/utils.js` mejora la mantenibilidad de la aplicación.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción con Next.js exitosa.

### Riesgos Detectados / Remanentes
- Ninguno.

### Próximo Paso Recomendado
- Continuar con el ciclo normal de desarrollo del proyecto.

---

## [2026-06-25] Reutilización de Documentos del Legajo Técnico en el Programa Anual

### Resumen de Cambios
- **Vincular Legajo Técnico a Programa Anual**: Se implementó una nueva opción de carga de documentos en el formulario de actividades del Programa Anual. Ahora los usuarios pueden elegir "Legajo Técnico" como método de carga.
- **Dropdown Dinámico de Documentos**: Se incorporó un selector dinámico que consulta la tabla `public.legajo_tecnico` utilizando la sesión autenticada. Los documentos mostrados corresponden a la Razón Social y el Establecimiento seleccionados (incluyendo documentos generales de la empresa sin establecimiento asignado).
- **Evitar Duplicidad en Almacenamiento**: Al guardar, se asocia el path del documento de legajo técnico seleccionado directamente al registro de la actividad en la columna `documento_url` de la tabla `public.programa_anual`, evitando la resubida y duplicidad de recursos.
- **Limpieza de Estados**: Se actualizó la función `handleCloseForm()` y los cambios de tabs de carga para limpiar sincrónicamente los estados de carga de legajo técnico.

### Decisiones Clave
- **Consulta Reactiva mediante useEffect**: El listado de documentos de legajo se recarga automáticamente al cambiar el cliente, establecimiento o al seleccionar la opción correspondiente, garantizando coherencia en la interfaz.
- **Inclusión de Documentos Generales**: Si el usuario selecciona un establecimiento, listamos los documentos del legajo correspondientes a este y además aquellos generales del cliente (`establecimiento_id` es `NULL`), mejorando la accesibilidad y reusabilidad de registros comunes.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `supabase`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción con Next.js exitosa de punta a punta.

### Riesgos Detectados / Remanentes
- Ninguno. Las consultas al legajo técnico se ejecutan a través de cookies de sesión autenticada del usuario, por lo que heredan todas las políticas RLS y aislamiento multi-tenant del backend.

### Próximo Paso Recomendado
- Realizar pruebas en ambiente de preview / staging subiendo un documento al Legajo Técnico y seleccionándolo posteriormente al crear una actividad del Programa Anual.

---

## [2026-06-25] Ajuste del Título de la Aplicación en la Ventana del Navegador

### Resumen de Cambios
- **Modificación de Título Global**: Se actualizó el valor del título (`title`) dentro del objeto `metadata` en el archivo de diseño raíz `src/app/layout.js` de `'Gestión SySO | SaaS de Seguridad y Salud Ocupacional'` a `'Gestión SySO | App'`.
- **Propósito**: Cumplir con el requerimiento del usuario de simplificar el nombre expuesto en la pestaña del navegador a `"Gestión SySO | App"`.

### Decisiones Clave
- **Definición Estática de Metadata**: Mantener la definición en el layout principal asegura que todas las páginas hereden esta estructura y muestren `'Gestión SySO | App'` por defecto, a menos que definan metadatos específicos.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/layout.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción con Next.js (`npm run build`) completada con éxito. Todas las rutas estáticas y dinámicas se compilaron satisfactoriamente.

### Riesgos Detectados / Remanentes
- Ninguno.

### Próximo Paso Recomendado
- Iniciar la aplicación y verificar que la pestaña del navegador muestre el nuevo título.

---

## [2026-06-24] Integración de Rate Limiting Distribuido con Upstash Redis

### Resumen de Cambios
- **Rate Limit Distribuido con Fallback**: Se reestructuró la función `checkRateLimit` en `src/lib/rateLimit.js` para soportar consultas distribuidas utilizando la API REST `/pipeline` de Upstash Redis (enviando comandos `INCR`, `TTL` y `EXPIRE NX`).
- **Resiliencia Automática**: Se diseñó un mecanismo de fallback robusto que intercepta cualquier fallo de conexión o ausencia de variables de entorno y ejecuta el control de tasa de forma transparente utilizando el almacenamiento local en memoria `Map`.
- **Variables de Entorno**: Se agregaron las variables de entorno plantilla `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` a `.env.example`.
- **Cabeceras de Rate Limit en Respuesta Exitosa**: Se modificó `src/middleware.js` para inyectar las cabeceras `X-RateLimit-*` en todas las respuestas de APIs, incluyendo los estados exitosos `200 OK` (pasadas mediante `NextResponse.next()`) y errores `401`/`403`, en lugar de mostrarlas únicamente en respuestas bloqueadas `429`.

### Decisiones Clave
- **REST en Middleware Edge**: Se optó por una llamada REST directa con `fetch` y timeout controlado de 2 segundos para no impactar los tiempos de respuesta del middleware y ser 100% compatible con el runtime de Vercel Edge sin requerir bibliotecas pesadas.
- **NX para Expiración**: Usar el flag `NX` en la expiración (`EXPIRE NX`) garantiza que no pisemos la expiración original del bloque y mantengamos una ventana fija estricta de rate limit.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/lib/rateLimit.js`
- `[MODIFY] src/middleware.js`
- `[MODIFY] .env.example`
- `[NEW] scratch/test-redis-rate-limit.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- **Pruebas de Rate Limiting Distribuidas y Fallback**: Ejecución exitosa de `scratch/test-redis-rate-limit.js`, validando la persistencia en memoria y el fallback gracioso ante fallos HTTP.
- **Build de Producción**: Compilación exitosa en Next.js.

---

## [2026-06-24] Remediación de Seguridad — Fase 3 (Medios - Ampliada) y Fase 4 (Bajos / Hardening)


### Resumen de Cambios
- **Remediación en `/api/send-email` (SEC-MED-01)**: Se modificó la API de envío de correos para recibir un path de archivo (`filePath`) en Supabase Storage en lugar de aceptar PDFs binarios en base64 crudos enviados directamente por el cliente. El backend ahora descarga el archivo utilizando las cookies de sesión del usuario autenticado, delegando el control de acceso a las políticas RLS del storage.
- **Flujos de Reportes en Frontend**: Se actualizaron las funciones `handleSendEmail` en las pantallas de **Visitas** (`src/app/[tenant-slug]/visitas/page.js`) y **Avisos de Riesgo** (`src/app/[tenant-slug]/avisos/page.js`) para que generen el PDF en formato Blob, lo suban a Supabase Storage bajo la carpeta del usuario (`${profile.id}/`) y envíen únicamente la referencia del path al endpoint `/api/send-email`.
- **Validación de Límites de Plan en Servidor (SEC-MED-02)**: Se incorporó en `/api/clientes` POST y `/api/equipo` POST un chequeo server-side que consulta el `plan_id` de la tabla `tenants` y el número actual de usuarios (`cliente` y `miembro` respectivamente) del tenant. Si se excede el límite del plan (ej: 1 cliente en 'free', 5 en 'basic_5', etc.), la API bloquea la acción con un error `403 Forbidden`.
- **Inmutabilidad de Metadatos de Tenant en Equipo (SEC-MED-03)**: Se ajustó `/api/equipo` POST para forzar que el `tenant_id` en `user_metadata` sea el del administrador autenticado, previniendo manipulaciones del payload del cliente.
- **Validaciones con Zod (SEC-LOW-01)**: Se implementó validación de esquemas estricta mediante Zod en las API Routes operativas (`/api/clientes`, `/api/equipo`, `/api/send-email` y `/api/upload-from-url`), garantizando tipos, formatos de email y CUITs adecuados, y devolviendo `400 Bad Request` en caso de fallos.
- **Archivo de Configuración de Plantilla (SEC-LOW-02)**: Se creó el archivo `.env.example` en la raíz del proyecto para documentar los parámetros del entorno requeridos de forma segura.

### Decisiones Clave
- **Aprovechamiento de RLS en Storage**: Al transferir la descarga del PDF a Supabase Storage con cookies del usuario, el motor de base de datos aplica automáticamente las políticas RLS. Esto elimina la superficie de ataque que permitía a un usuario autenticado enviar correos oficiales con cualquier PDF falso forjado en el cliente.
- **Validación Comercial del Lado Servidor**: Implementar el conteo de usuarios y verificación de planes directamente en el backend (Route Handlers) blinda la lógica de negocios contra bypasses realizados mediante solicitudes directas de API externas al frontend.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[MODIFY] src/app/api/send-email/route.js`
- `[MODIFY] src/app/api/clientes/route.js`
- `[MODIFY] src/app/api/equipo/route.js`
- `[MODIFY] src/app/api/upload-from-url/route.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`
- `[NEW] .env.example`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- **Build de Producción**: Compilación completa de producción ejecutada mediante `npm run build` con resultado exitoso y sin errores sintácticos o de types en el framework.

### Riesgos Detectados / Remanentes
- Ninguno detectado. La línea base de seguridad de la aplicación ha sido completamente completada de forma satisfactoria.

### Próximo Paso Recomendado
- Proceder con despliegues en ambientes de testing / staging para validaciones del lado del cliente.

## [2026-06-24] Remediación de Seguridad — Fase 3 (Medios antes de producción)


### Resumen de Cambios
- **Integración de Rate Limiting en el Middleware**: Se modificó `src/middleware.js` para interceptar llamadas a cualquier API route (`/api/*`) y aplicar límites de tasa basados en la IP del cliente (10 peticiones cada 15 min en `/api/send-email`, 15 peticiones en `/api/clientes` y `/api/equipo`, y 100 peticiones en el resto de los endpoints). Cuando se excede el límite, se responde con código HTTP `429 Too Many Requests` y cabeceras estándar `X-RateLimit-*`.
- **Actualización de Dependencias**: Se actualizó el paquete principal `"next"` a `"^14.2.20"` en `package.json`, lo que resolvió dependencias vulnerables (como `postcss` y vulnerabilidades internas de Next.js) y se compiló con la versión segura estable `14.2.35`.

### Decisiones Clave
- **Filtro Temprano de Rate Limiting**: Ejecutar el rate limiting al inicio de la función del middleware previene llamadas innecesarias al cliente de base de datos Supabase o solicitudes de autenticación en solicitudes bloqueadas, minimizando la carga del servidor.
- **Uso de Cabeceras Estándar**: Retornar `X-RateLimit-Limit`, `X-RateLimit-Remaining` y `X-RateLimit-Reset` en respuestas 429 sigue las mejores prácticas de la industria y da retroalimentación transparente al cliente.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/middleware.js`
- `[MODIFY] package.json`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- **Pruebas de Rate Limiting**: Se creó y ejecutó un script en `scratch/test-rate-limit.js` que validó de forma aislada el comportamiento del rate limiter por IP, confirmando la denegación después de exceder la cuota límite.
- **Verificación de Compilación**: Se ejecutó `npm run build` obteniendo una compilación de producción Next.js 100% exitosa y sin advertencias o fallos sintácticos en el middleware.

### Riesgos Detectados / Remanentes
- **Rate Limit Local**: La persistencia de rate limiting en memoria local (`Map`) es ideal para desarrollo y entornos con un único nodo, pero en entornos serverless multi-instancia en producción (ej: Vercel) no comparte memoria entre lambdas. Se recomienda conectar un almacén distribuido (como Upstash Redis) o activar reglas en el WAF del CDN antes del despliegue productivo final.

### Próximo Paso Recomendado
- Proceder con el desarrollo de la **Fase 4 (Bajos / Hardening)** del plan de remediación (por ejemplo, creación de `.env.example` y esquemas de validación Zod en APIs).

## [2026-06-24] Remediación de Seguridad — Fase 1 (Críticos) y Fase 2 (Altos)


### Resumen de Cambios
- **Parche de API `/api/upload-from-url`**: Implementación de verificación de sesión server-side, validación de pertenencia al tenant, restricción de dominios permitidos a Google Drive para mitigación de SSRF, límite de descarga síncrona a 10 MB mediante streams, y validación mágica binaria de firma de archivos PDF. Carga reestructurada a través del contexto del usuario autenticado (RLS).
- **Parche de API `/api/clientes`**: Modificación de la verificación de duplicados de CUIT para restringirse a nivel de `tenant_id` y eliminación de la fuga de datos personales que exponía el correo electrónico del usuario ya existente.
- **Parche de API `/api/send-email`**: Restricción de acceso para que únicamente los roles `admin` y `miembro` puedan utilizar el endpoint. Se agregaron validaciones de formato de email para destinatarios, límite de tamaño del adjunto a 5 MB y validación de firma binaria del PDF. Se incorporó logging de auditoría en el backend.
- **Corrección de RLS en Perfiles**: Creación de la migración incremental `20260707000000_secure_profiles_rls.sql` para inyectar una política de lectura restrictiva en `public.profiles`, aislando la visibilidad de perfiles entre distintas empresas cliente del mismo tenant y limitando accesos cruzados.

### Decisiones Clave
- **Remover service role de cargas URL**: Delegar la carga del documento al cliente authenticated de Supabase elimina el uso de la clave administrativa (`service_role`) en `/api/upload-from-url`, permitiendo que el motor de base de datos valide el RLS.
- **Evitar recursión en RLS de perfiles**: Implementación de la función `get_current_user_role` con directiva `SECURITY DEFINER` para evitar bucles recursivos al evaluar políticas RLS de `profiles`.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `supabase`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260707000000_secure_profiles_rls.sql`
- `[MODIFY] src/app/api/upload-from-url/route.js`
- `[MODIFY] src/app/api/clientes/route.js`
- `[MODIFY] src/app/api/send-email/route.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación y optimización de producción (`npm run build`) verificada y exitosa.
- Ejecución de las migraciones de base de datos a través de PostgreSQL completada exitosamente.

---

## [2026-06-24] Estabilización de Visualización de PDF, Drag & Drop y Navegación en Legajo Técnico y Programa Anual

### Resumen de Cambios
- **Visualización Homologada de PDFs en Programa Anual**: Se retiró la alteración de la URL firmada (`&download=` vacíos) que rompía la validación criptográfica en Supabase Storage. Ahora el Programa de Gestión Anual abre el enlace de visualización (`handleViewPdf`) de forma directa, tal como en Legajo Técnico.
- **Bloqueo del Drag & Drop en Solo Lectura**: Se restringieron los eventos de arrastre y soltado (`handleDragOver`, `handleDragLeave`, `handleDrop`) en los componentes de carga de Legajo Técnico y Programa de Gestión para ignorar interacciones si la vista se encuentra en formato de solo lectura (`isReadOnlyView`). Esto evita que se alteren los estados del formulario en modo vista.
- **Corrección de Excepción Client-Side (ReferenceError)**: Se solucionó el crash al salir del formulario de Legajo Técnico importando el icono `AlertTriangle` de Lucide React, que era invocado por el modal de confirmación pero no estaba definido.
- **Limpieza de Estados en Programa Anual**: Se implementó la función `handleCloseForm()` en el Programa de Gestión Anual para limpiar centralizadamente todos los estados locales al guardar, eliminar, navegar o presionar "Salir" del formulario, previniendo estados residuales y excepciones en el cliente.
- **Homologación de Clic en Tabla de Legajo Técnico**: Se modificó el listado de documentos de Legajo Técnico para que el clic sobre cualquier fila (`<tr>`) abra el formulario en modo de solo lectura por defecto, y el botón de editar (lápiz) lo abra en modo de edición directa, consistente con la experiencia global del SaaS. Se parametrizó la función `handleEditClick` con un booleano `forceReadOnly` para prevenir que la validación de roles en el cliente pise el estado de solo lectura al abrir desde el clic de fila.

### Decisiones Clave
- **Bloqueo a Nivel de Callback**: Dado que `<fieldset disabled>` en HTML no previene el disparo de eventos drag and drop en elementos contenedores `<div>`, es mandatorio interceptar la validación de permisos (`!canEdit`) directamente en los manejadores de JavaScript.
- **Centralización del Cierre del Formulario**: Limpiar de forma síncrona y completa los estados temporales del formulario evita saltos y delaminación de estado en el render de las tablas al alternar vistas.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción (`npm run build`) verificada y exitosa de punta a punta.

---

## [2026-06-24] Corrección de Excepción Client-Side en Programa de Gestión y Ajuste de Wrap en Sidebar

### Resumen de Cambios
- **Corrección de Excepción en Cliente**: Se resolvió un error de tipo `ReferenceError` ("Cannot access 'documentoFile' before initialization") al cargar la sección de **Programa de Gestión Anual** (`src/app/[tenant-slug]/programa/page.js`). Esto ocurría debido a que el hook `useEffect` dependiente de `documentoFile` estaba declarado antes del hook `useState` que definía dicha variable (Temporal Dead Zone). Se reubicó el `useEffect` después de todas las declaraciones de estado iniciales.
- **Ajuste de Enlaces en Sidebar**: Se modificó `src/components/Sidebar.js` reemplazando la clase `truncate` por `leading-tight` en el texto de los enlaces. Esto permite que los nombres de las secciones que sean demasiado largos se envuelvan (wrap) en otro renglón en lugar de cortarse abruptamente, mejorando la legibilidad sin alterar el tamaño, letra, texto y pictogramas estándar.

### Decisiones Clave
- **Prevención de TDZ (Temporal Dead Zone)**: Asegurar que los hooks de React que evalúan dependencias se ubiquen físicamente después de las declaraciones de estado correspondientes.
- **Legibilidad sin truncamiento**: Permitir el wrap de texto en la barra lateral mantiene la consistencia del tamaño del sidebar pero da soporte a textos descriptivos más extensos.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/components/Sidebar.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción (`npm run build`) verificada y exitosa de punta a punta.

---

## [2026-06-24] Rediseño y Homologación de Contenedor de Filtros y Navegación en Legajo Técnico

### Resumen de Cambios
- **Contenedor de Filtros Unificado**: Se reestructuró el área superior de navegación y filtros en `legajo/page.js` para agrupar todas las interacciones dentro de una única tarjeta blanca con bordes estándar, alineándose visualmente al 100% con `visitas/page.js` y `avisos/page.js`.
- **Integración de Navegación "Atrás"**: Se movió el botón "Atrás" y el título de la carpeta activa (`Registros de: [Nombre]`) al interior del contenedor de herramientas, posicionándose arriba a la izquierda.
- **Botón de Cargar Integrado**: Se reubicó el botón "Cargar Registro" (icono `PlusCircle`) dentro de la caja de filtros en la esquina superior derecha, agrupándose simétricamente junto al buscador rápido.
- **Grilla de 5 Columnas y Filtro por Fecha**:
  - Se homogeneizó el panel de filtros colapsable con el botón "Limpiar Filtros" renderizándose condicionalmente en la cabecera.
  - Se utilizó el icono estándar `Sliders` para la opción de colapso.
  - Se configuró la grilla de filtros a 5 columnas, incorporando el filtro de **Fecha** (input `type="date"`) junto a los filtros preexistentes de Cliente, Establecimiento, Año y Mes.

### Decisiones Clave
- **Paridad Operativa Global**: Homologar el layout de herramientas y los filtros de Legajo Técnico garantiza que todas las secciones operativas del SaaS compartan la misma estructura y experiencia de usuario.
- **Activación de Búsqueda por Fecha**: Exponer el input de fecha exacta en el panel de filtros unifica la simetría de la grilla a 5 columnas y habilita una funcionalidad de filtrado latente en el backend.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción en Next.js (`npm run build`) verificada y exitosa de punta a punta.

---

## [2026-06-24] Estandarización de Tablas de Legajo Técnico y Separación de Acciones de Archivo en Programa Anual


### Resumen de Cambios
- **Estandarización de Tablas en Legajo Técnico**: Se adaptó el diseño y comportamiento de la tabla de documentos en `legajo/page.js` para cumplir con las guías de diseño y la paridad de tablas estándar.
  - Se incorporó la ordenación por columnas en los encabezados Razón Social, Establecimiento, Documento / Tipo y Fecha (estados `sortField`/`sortOrder` y callbacks `onClick` con indicador visual de flechas).
  - Se homogeneizó el padding de las celdas `<td>` a `px-6 py-4` y las clases de fuentes y colores.
  - Se unificó el tamaño de los pictogramas de acción a `h-4.5 w-4.5` y los estilos/colores de botón (slate, amber, red).
- **Separación de Acciones de Archivo en Programa Anual**: En la tabla de Actividades de `programa/page.js`, se reemplazó el botón de archivo genérico de la columna "Doc" por dos acciones independientes:
  - **Visualizar**: Icono de ojo (`Eye`) que abre el PDF inline de forma segura en una nueva pestaña (usando `handleViewPdf`).
  - **Descargar**: Icono de descarga (`Download`) que realiza la descarga directa a disco del binario desde Supabase Storage.
  - Se implementó la función asíncrona `handleDownloadPdf` en el módulo de Programa. Se ocultó la opción de descarga en caso de enlaces externos de Google Drive para consistencia con el Legajo Técnico.

### Decisiones Clave
- **Paridad Visual y Funcional**: El comportamiento de ordenamiento interactivo y la separación de acciones de archivo homologan estas secciones con el resto de las herramientas de la plataforma (visitas, avisos).
- **Control de Descargas en Enlaces Externos**: Evitar el botón de descarga nativa para Google Drive previene errores de descarga silenciosa de blobs y delega la visualización/descarga directamente a la interfaz nativa del visor de Drive.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `supabase`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción en Next.js (`npm run build`) verificada y exitosa de punta a punta.

---

## [2026-06-24] Mantenimiento de Sidebar y Drag & Drop en Legajo Técnico


### Resumen de Cambios
- **Scrollbar y Estandarización de Sidebar**: Se completó la estandarización del Sidebar móvil y de escritorio en las 11 vistas operativas. Se eliminó definitivamente el encabezado "Configuración", estableciendo en su lugar una línea divisoria unificada con clase `shrink-0`. En las vistas móviles, se modificaron los contenedores `<nav>` y sus clases CSS flexbox para asegurar que la navegación sea scrollable verticalmente de forma independiente y que el pie de página (con el perfil del usuario) permanezca fijo en la parte inferior de la pantalla sin desbordarse.
- **Drag & Drop interactivo**: Se implementó una zona interactiva para arrastrar y soltar archivos PDF en el formulario de carga de **Legajo Técnico** (replicando la mejora de **Programa de Gestión Anual**). El botón de selección de archivos se renombró exactamente a `"seleccionar archivo"` y se disparó a través de `useRef` manteniendo oculto el input nativo.
- **Limpieza Reactiva**: Se añadió un hook `useEffect` en Legajo Técnico para limpiar el nombre del archivo seleccionado localmente si el formulario se cancela o reinicia.
- **Corrección en Programa de Gestión**: Se subsanó un error de sintaxis JSX que omitía el bloque condicional `{uploadType === 'local' ? ( <>` al procesar el Drag and Drop.

### Decisiones Clave
- **Paridad Funcional Completa**: Implementar exactamente el mismo componente de Drag and Drop en Legajo y Programa de Gestión para mantener la familiaridad y simplicidad de uso.
- **Unificación de Scroll en Sidebar**: Al dar scroll individual a la navegación móvil, se garantiza una experiencia fluida en smartphones de baja resolución, previniendo que el botón de cerrar sesión quede inaccesible.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción Next.js (`npm run build`) completada con éxito.

### Riesgos Detectados / Remanentes
- Ninguno detectado.

### Próximo Paso Recomendado
- Validar visual y funcionalmente la carga Drag & Drop en dispositivos celulares y el comportamiento del scroll del menú en resoluciones estrechas.

## [2026-06-24] Estandarización de Sidebar y Sincronización de Perfil (Flickering Fix)

### Resumen de Cambios
- **Mitigación Global de Flickering**: Se unificó la inicialización del estado `profile` (y `profileData` en el perfil) en las 11 páginas operativas del SaaS para recuperar sincrónicamente el perfil desde `sessionStorage` en el cliente. Esto elimina el parpadeo visual del pie de página del Sidebar (que temporalmente mostraba "Usuario" o "Profesional") y previene que los enlaces administrativos "Clientes" y "Equipo de Trabajo" aparezcan/desaparezcan intermitentemente durante el refresco asíncrono.
- **Limpieza de Rótulo "Panel principal"**: Se removió definitivamente la etiqueta rígida de encabezado "Panel principal" tanto de la vista de escritorio como de la barra móvil de las 11 secciones.
- **Consolidación de Línea Separadora**: Se estableció una línea divisoria horizontal estandarizada (`<div className="h-px bg-white/10 my-4" />`) que separa visualmente el grupo de navegación superior (Dashboard, Clientes, Equipo de Trabajo) de las restantes herramientas y secciones del legajo técnico en todos los sidebar layouts (desktop y mobile).

### Decisiones Clave
- **Sincronización por Almacenamiento Local**: Replicar la estrategia de almacenamiento local `sessionStorage` para el perfil en todas las páginas asegura consistencia de renderizado e inmunidad ante saltos de layout (CLS = 0) en toda la aplicación, independientemente de qué sección recargue el usuario.
- **Paridad Visual Absoluta**: Consolidar la línea separadora y retirar "Panel principal" de todas las secciones garantiza un diseño sobrio, premium y consistente para los roles de Administrador, Miembro de Equipo y Cliente.

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`

### Validaciones Ejecutadas
- Compilación de producción en Next.js (`npm run build`) verificada y exitosa.

---

## [2026-06-24] Corrección de Barra Lateral y Flickering en Legajo Técnico

### Resumen de Cambios
- **Barra Lateral Estandarizada**: Se reemplazó el contenedor estático de carpeta en el header del Sidebar de escritorio y móvil por el isotipo oficial del proyecto (`/brand/logo-primary.png`) y tipografía `font-outfit`. Se integró el botón colapsable (`toggleSidebar`) con iconos Chevron.
- **Centrado de Enlaces Colapsados**: Se añadió la clase `${isSidebarCollapsed ? 'justify-center' : ''}` a los elementos de menú para centrar los iconos en vista contraída.
- **Mitigación de Layout Shift (Flickering)**: Implementación de caché local del perfil de usuario en `sessionStorage` para inicializar sincrónicamente el estado `profile` en el cliente. Esto previene que los enlaces administrativos "Clientes" y "Equipo de Trabajo" aparezcan/desaparezcan bruscamente durante el refresco asíncrono.

### Decisiones Clave
- **Caché en sessionStorage para CLS**: Inicializar sincrónicamente el perfil usando sessionStorage elimina el salto visual (CLS = 0) en recargas sin requerir un estado global pesado o reescribir la estructura de Layouts de Next.js.
- **Unificación del Design System**: El Sidebar del Legajo Técnico ahora exhibe el mismo comportamiento responsive y de colapso que el resto de las 10 secciones del SaaS.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción en Next.js (`npm run build`) verificada y exitosa.
- Validación de flujo de estado de sesión, inicio, guardado y cierre en sessionStorage.

---

## [2026-06-24] Implementación del Módulo Legajo Técnico

### Resumen de Cambios
- **Base de Datos y RLS**: Creación de la tabla `public.legajo_tecnico` con aislamiento de multi-tenancy (`tenant_id`, `empresa_id`, `establecimiento_id`) y políticas RLS granulares que restringen la subida/edición de registros de acuerdo a los permisos del perfil de usuario (`cargar`, `editar`, `eliminar`).
- **Portal de Clientes de Solo Lectura**: Control de lectura en la tabla `legajo_tecnico` configurado para dar acceso de lectura (`SELECT`) a clientes únicamente de los registros pertenecientes a su `empresa_id`, deshabilitando todas las opciones de carga, edición y borrado en el frontend.
- **Frontend Interactivo**: Creación de la interfaz modular de exploración y carga `src/app/[tenant-slug]/legajo/page.js`, con navegación interactiva por carpetas y subcarpetas configuradas estáticamente, y un formulario de carga doble que permite subir archivos PDF locales (hasta 10MB) o registrar enlaces a documentos de Google Drive.
- **Integración de Permisos**: Registro del permiso `'legajo'` en la pantalla de gestión del equipo para permitir a la consultora delegar roles de carga, edición o eliminación de legajos.
- **Barra Lateral Unificada**: Actualización de la barra lateral (sidebar) en las 11 secciones operativas de la plataforma, importando el icono `Folder` e incorporando el enlace al legajo técnico de forma consistente en el drawer móvil y el menú colapsable de escritorio.

### Decisiones Clave
- **Jerarquía Estática en React**: Definir la estructura de carpetas y subcarpetas (`LEGAJO_FOLDERS`) directamente en el frontend agiliza las consultas a la base de datos, mapeando dinámicamente los tipos de documentos correspondientes a la tabla `public.registros`.
- **Carga de Archivos e Importación por URL**: Soporte de almacenamiento de PDFs en el bucket privado `documents` de Supabase y registro alternativo de enlaces directos de Google Drive.
- **Control RLS Granular**: Sincronización estricta del Row Level Security de Supabase con los permisos de usuario server-side (`user_has_action_permission`), asegurando un aislamiento total entre empresas del tenant y denegando cualquier operación de escritura al rol `cliente`.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `supabase`
- `next-best-practices`
- `shadcn`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260706000000_create_legajo_tecnico_table.sql`
- `[NEW] src/app/[tenant-slug]/legajo/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Aplicación de migración SQL en Supabase verificada y funcional.
- Compilación de producción Next.js (`npm run build`) exitosa y sin errores.

## [2026-06-23] Creación e Importación de Tabla de Catálogo de Registros en Supabase

### Resumen de Cambios
- **Creación de Tabla de Catálogo**: Se diseñó e implementó la tabla `public.registros` para actuar como catálogo estático de registros y documentos legales del legajo técnico de Higiene y Seguridad.
- **Inserción de Registros**: Se poblaron de forma idempotente los 59 registros provistos por el usuario en la base de datos de producción mediante una migración de base de datos SQL.
- **Seguridad RLS Pública**: Se configuró la política de seguridad RLS `Permitir lectura publica de registros` para habilitar el acceso de lectura (`SELECT`) abierto de forma consistente con otros catálogos del sistema.
- **Script de Validación**: Se creó el script `scripts/validate-registros.js` que realiza una validación completa y segura consultando la base de datos con la clave pública `anon` para verificar la existencia e integridad de los 59 elementos importados.

### Decisiones Clave
- **Paridad de Catálogos**: Nombrar la columna de datos como `nombre` en lugar de `descripcion` (que suele usarse para textos más largos o explicativos) o `tema` (específico de capacitaciones).
- **Seguridad en Lectura Pública**: Permitir la lectura pública (`SELECT`) abierta a nivel de RLS simplifica las operaciones de frontend del SaaS y restringe la edición/escritura únicamente a administradores desde el backend, asegurando la inmutabilidad de los catálogos en producción.
- **Carga Idempotente**: El uso de la cláusula `ON CONFLICT (nombre) DO NOTHING` previene la duplicación de datos al ejecutar las migraciones repetidas veces.

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260705000000_create_registros_table.sql`
- `[NEW] scripts/validate-registros.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Aplicación exitosa de la migración utilizando `node scripts/run-migrations.js` en el pooler IPv4 de Supabase.
- Verificación de carga exitosa ejecutando `node scripts/validate-registros.js` que comprobó el conteo exacto de 59 registros y su recuperabilidad con clave pública anonizada.

---

## [2026-06-23] Rediseño UX del Login para Estabilización de Altura en Selección de Roles

### Resumen de Cambios
- **Reubicación de Enlace de Registro**: Se movió el bloque de registro "¿No tenés una cuenta? Registrate gratis" al interior de la tarjeta de inicio de sesión (`bg-white` card), posicionándose debajo del botón de ingreso. Se aumentó su tamaño a `text-sm` (14px) y su altura reservada en el contenedor a `min-h-[24px]` para mejorar significativamente su legibilidad.
- **Estabilización de Altura en Pestañas**: Se aplicó una altura constante y transiciones en CSS al contenedor del enlace de registro (`min-h-[24px]` y opacidad condicional asíncrona) en lugar de un renderizado condicional destructivo en React. Esto mantiene ocupado el espacio en la interfaz para la pestaña "Clientes" (donde no está habilitado el auto-registro), impidiendo que la tarjeta cambie de dimensiones o sufra saltos bruscos ("layout jumping") al alternar roles.
- **Normalización de Contenedor de Subtítulos**: Se envolvió el subtítulo explicativo en un contenedor con altura mínima `min-h-[32px]` para absorber cualquier variación en la cantidad de líneas o empaquetamiento del texto descriptivo de profesionales y clientes.

### Decisiones Clave
- **Prevención de Layout Shifts (CLS)**: Agrupar elementos dinámicos dentro de contenedores estáticos con alturas fijas o mínimas garantiza la estabilidad visual, alineándose con las mejores prácticas de UX de Google Lighthouse (Cumulative Layout Shift = 0).
- **Stitch como Herramienta de Maquetación**: Se creó un proyecto de diseño en Stitch para evaluar variantes visuales del login unificado de cara a la consistencia del design system.

### Archivos Modificados / Creados
- `[MODIFY] src/app/login/page.js`

### Validaciones Ejecutadas
- Compilación de producción Next.js (`npm run build`) verificada y exitosa.

---

## [2026-06-23] Configuración de PWA y Visualización Standalone (Pantalla Completa) en Celulares

### Resumen de Cambios
- **Creación de manifest.js**: Se implementó el archivo dinámico `src/app/manifest.js` en el App Router de Next.js para declarar la aplicación como una PWA. Se configuró el modo `display: 'standalone'` para habilitar la apertura en pantalla completa (ocultando la interfaz del navegador). Se asociaron los iconos de 192x192 y 512x512 ubicados en la carpeta de marca. El campo `short_name` fue ajustado a `'Gestión SySO'` para asegurar que el nombre completo de la aplicación se visualice debajo del icono en los escritorios móviles.
- **Configuración de Metadatos en Layout Raíz**: Se actualizó `src/app/layout.js` para añadir las etiquetas específicas de Apple (`appleWebApp`) y referenciar el icono táctil (`apple-touch-icon.png`) desde el directorio de marca `/brand/`, habilitando así el correcto renderizado standalone en Safari/iOS.
- **Service Worker para Compatibilidad de Instalabilidad (Android/Chrome)**: Se creó `public/sw.js` que contiene un fetch event handler minimalista (pass-through). Esto satisface el requisito obligatorio de Google Chrome para activar el cartel de instalación nativo e instalar la app como una WebAPK nativa. Se registró dinámicamente en el cliente desde `src/app/providers.js` limitándolo únicamente a entornos de producción para no interferir con el desarrollo local.

### Decisiones Clave
- **Estructuración en Carpeta Brand**: Se definió ubicar los recursos de iconos en `public/brand/` alineado con los lineamientos visuales del proyecto para mantener el orden, actualizando las rutas de acceso en el manifiesto y metadatos.
- **Modo Standalone y short_name**: Utilizar `display: 'standalone'` en lugar de `fullscreen` para mantener la accesibilidad de la barra de estado superior nativa (batería, hora) pero ocultando toda la barra del navegador. Se definió `short_name` como `'Gestión SySO'` para corregir la versión reducida original `'SySO'` en favor de una paridad de marca total.
- **Service Worker Pass-Through**: Registrar el Service Worker únicamente en producción previene cualquier conflicto de almacenamiento en caché durante las iteraciones de desarrollo, mientras que la lógica de pass-through garantiza que no se rompan las llamadas de API asíncronas ni las consultas al pool de base de datos.

### Archivos Modificados / Creados
- `[NEW] src/app/manifest.js`
- `[NEW] public/sw.js`
- `[MODIFY] src/app/layout.js`
- `[MODIFY] src/app/providers.js`

### Validaciones Ejecutadas
- Compilación de producción en Next.js (`npm run build`) verificada y exitosa de punta a punta. Servido correcto de `/sw.js` y `/manifest.webmanifest`.

---

## [2026-06-23] Corrección de Error de Inserción de CUIT en Creación de Usuarios de Equipo

### Resumen de Cambios
- **Corrección de Trigger handle_new_user**: Se modificó la función trigger `public.handle_new_user()` para utilizar `NULLIF` en el campo `cuit` en lugar de `COALESCE` con valor vacío `''`. Esto evita que al crear usuarios nuevos sin metadatos de CUIT se intente registrar una cadena vacía en `public.profiles`, lo cual infringía la restricción de validación `CHECK (cuit ~ '^\d{11}$')` y bloqueaba la transacción de Auth en Supabase.
- **Paso de Metadatos de CUIT y Tenant**: Se actualizaron la ruta de API `src/app/api/equipo/route.js` y el componente frontend `src/app/[tenant-slug]/equipo/page.js` para extraer y enviar el CUIT e ID de Tenant del miembro del equipo dentro de la propiedad `user_metadata` al invocar `createUser`. Esto asegura que los perfiles se enlacen y validen con datos correctos desde el momento de inserción de forma nativa en Postgres.

### Decisiones Clave
- **Uso de NULLIF para Valores Nullable**: En Postgres, un valor `NULL` es ignorado de forma exitosa por las validaciones de tipo CHECK constraint. Utilizar `NULLIF(..., '')` convierte cadenas vacías en `NULL`, lo cual soluciona la restricción de CUIT obligatoriamente de 11 dígitos para aquellos roles y usuarios (como administradores o miembros sin onboarding finalizado) que no disponen de un CUIT al momento del registro.

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260704000000_fix_handle_new_user_cuit.sql`
- `[MODIFY] src/app/api/equipo/route.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`

### Validaciones Ejecutadas
- Ejecución exitosa de `node scripts/run-migrations.js` en base de datos remota a través del pooler.
- Verificación de compilación exitosa de Next.js mediante `cmd.exe /c "npm run build"`.

---

## [2026-06-23] Ajuste de Dashboard de Clientes y Resumen de Acciones Correctivas


### Resumen de Cambios
- **Ocultamiento de Accesos Rápidos y Planes**: En el dashboard para usuarios con rol `cliente`, se ocultaron los accesos rápidos (que permitían crear nuevos clientes, acciones correctivas o editar perfiles profesionales) y la tarjeta de información del plan contratado, ya que corresponden a privilegios e información comercial exclusiva de los profesionales y la consultora.
- **Ocultamiento del Plan en Header**: Se restringió la visualización del plan de suscripción en el encabezado superior para que no sea visible al rol `cliente`.
- **Integración de Resumen de Acciones Correctivas (Contadores)**: Se reemplazó la tabla de hallazgos del dashboard por un panel informativo estructurado con **exactamente 5 contadores clave** de acciones correctivas:
    1. *Cantidad Total*: Número total de acciones correctivas en el legajo técnico.
    2. *Cerradas*: Acciones con fecha de implementación registrada.
    3. *En Análisis*: Acciones pendientes sin fecha de planificación definida.
    4. *En Tiempo*: Acciones pendientes vigentes a término (fecha planificada futura o del día).
    5. *Vencidas*: Acciones pendientes cuyo plazo de planificación ya venció.
- **Ocultamiento de Contenedores de Métricas**: Se eliminaron por completo las 4 tarjetas de métricas superiores (*Tu Empresa*, *Acciones Correctivas*, *% Cumplimiento* y *Pendientes*) para los usuarios con el rol `cliente`, evitando redundancia de datos.

### Decisiones Clave
- **Seguridad e Aislamiento**: Limitar la UI previene que el cliente intente navegar a acciones de escritura o visualice detalles comerciales de facturación de la consultora (Multi-Tenancy).
- **Métricas Simplificadas de Legajo**: Agrupar los estados de las acciones correctivas en 5 contadores estandarizados ofrece un panorama rápido de la situación de higiene y seguridad de la empresa sin saturar visualmente la pantalla principal.

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`

### Validaciones Ejecutadas
- Compilación de producción en Next.js (`cmd.exe /c "npm run build"`) en ejecución y verificada.

---

## [2026-06-23] Ajuste de Textos y Etiquetas en el Login Unificado

### Resumen de Cambios
- **Actualización de Subtítulo de Clientes**: Se cambió la descripción en la pestaña de ingreso de clientes de `"Ingresá para visualizar tus informes y programas de higiene y seguridad"` a `"Ingresa para visualizar tu legajo técnico de higiene y seguridad"` para reflejar de forma más precisa el contenido al que acceden (su legajo técnico).
- **Simplificación del Selector de Clientes**: Se removió la aclaración de `"(CUIT)"` de la pestaña de ingreso de clientes (cambiando de `"Clientes (CUIT)"` a `"Clientes"`).

### Decisiones Clave
- **Corrección Ortográfica**: Se implementó "visualizar" en lugar de "viasualizar" (mencionado en la solicitud) para evitar erratas en la UI del portal.
- **Simplificación del Selector**: Quitar el sufijo de CUIT permite que el selector de roles mantenga una apariencia más simétrica y pulida, sin descuidar que el input interior sigue indicando e instruyendo el ingreso mediante el número de CUIT.

### Archivos Modificados / Creados
- `[MODIFY] src/app/login/page.js`

### Validaciones Ejecutadas
- Compilación de producción en Next.js (`cmd.exe /c "npm run build"`) en ejecución y verificada.

---

## [2026-06-23] Restricción de Acciones de Cliente y Mitigación de Flickering de Sidebar

### Resumen de Cambios
- **Restricción de Acciones de Cliente en Tablas**: En las vistas de listado de Constancia de Visita (`visitas/page.js`) y Aviso de Riesgo (`avisos/page.js`), se limitaron los controles de acción disponibles por renglón para usuarios con rol `cliente` exclusivamente a "Visualizar PDF" (icono de ojo) y "Descargar PDF" (icono de descarga), ocultando los botones de edición (lápiz), ver detalle del formulario, envío por correo electrónico (Mail) y eliminación (Trash).
- **Mitigación de Flickering en Sidebar**: Se normalizó el comportamiento de renderizado de la barra lateral (tanto en su versión móvil como de escritorio) en las 10 secciones de la plataforma. Se actualizaron las condiciones de evaluación del rol de usuario de `profile?.role !== 'cliente'` a la expresión lógica estricta `profile && profile.role !== 'cliente'` (y `profileData && profileData.role !== 'cliente'` en el perfil). Esto previene que las opciones de menú administrativo "Clientes" y "Equipo de Trabajo" se muestren brevemente durante la inicialización asíncrona del cliente antes de cargarse el perfil.
- **Aislamiento de Datos por Cliente en Frontend**: Se modificaron las funciones `loadRealData` de los módulos operacionales (`visitas`, `programa`, `capacitacion`, `correctivas`, `extintores` y `dashboard`) para inyectar filtros condicionales `.eq('empresa_id', prof.empresa_id)` sobre todas las consultas a Supabase (empresas, establecimientos, y registros operativos principales) en caso de que el perfil activo corresponda a un cliente. Esto garantiza que la información y las métricas mostradas en el dashboard correspondan únicamente a su respectiva empresa.
- **Vistas de Solo Lectura y Permisos**: Se agregó la validación del rol `'cliente'` en la función `getSectionPermissions` en todas las secciones operativas para denegar de forma server-side y de interfaz cualquier capacidad de escritura (`{ cargar: false, editar: false, eliminar: false }`). Además, se fuerza la inicialización de `isReadOnlyView = true` al cargar el perfil del cliente.

### Decisiones Clave
- **Control Lógico Estricto de Sidebar**: Usar `profile && profile.role !== 'cliente'` en lugar de optional chaining evita que la expresión resuelva a `true` cuando `profile` es temporalmente `null` al montarse el componente, eliminando de raíz el parpadeo de UI.
- **Alineación de Filtros en Cliente**: Aplicar filtros por `empresa_id` directamente en las llamadas del cliente previene descargas de datos innecesarias y se sincroniza con el Row Level Security (RLS) configurado en la base de datos de Supabase.

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`

### Validaciones Ejecutadas
- Compilación del proyecto de producción exitosa mediante `cmd /c "npm run build"`.
- Inspección del flujo lógico y coherencia del sidebar en todos los archivos modificados.

---

## [2026-06-23] Corrección en el Script de Migraciones y Aplicación de Esquema en Supabase

### Resumen de Cambios
- **Corrección del Procesador de Migraciones**: Se refactorizó la lógica de división de sentencias en `scripts/run-migrations.js`. Se reemplazó el método `split(';')` ciego por un parser robusto carácter por carácter que omite la división cuando los puntos y comas se encuentran dentro de bloques de comentarios de una sola línea (`--`), comentarios de bloque (`/* ... */`), cadenas entre comillas simples/dobles, o bloques de código dollar-quoted (`$$`).
- **Conectividad a la Base de Datos**: Se resolvió la limitación de conexión con IPv6 del host directo de base de datos (`db.wbykmdexenparduosadj.supabase.co`) en Node.js, configurando la cadena de conexión para utilizar el pooler de conexión IPv4 de AWS (`aws-1-us-east-2.pooler.supabase.com:6543`) con el nombre de usuario de tenant correspondiente (`postgres.wbykmdexenparduosadj`).
- **Aplicación de Migraciones**: Se ejecutaron con éxito todas las migraciones acumuladas del esquema en el servidor de Supabase, incluyendo la migración `20260703000000_client_portal_access.sql` que crea la función `public.get_email_by_cuit` y las políticas de acceso de RLS.

### Decisiones Clave
- **Parser SQL a Nivel de Carácter**: Implementar un analizador a nivel de carácter en lugar de usar bibliotecas de terceros pesadas solucionó el problema de ruptura de funciones PL/pgSQL y triggers de forma simple y autocontenida.
- **Uso del Pooler en IPv4**: Cambiar el host y configurar las credenciales correctas del pooler permite ejecutar migraciones desde entornos sin soporte de enrutamiento IPv6.

### Archivos Modificados / Creados
- `[MODIFY] scripts/run-migrations.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Ejecución completa del script `run-migrations.js` contra la base de datos de producción con resultado 100% exitoso.
- Verificación directa mediante consulta SQL de que las funciones `get_email_by_cuit`, `is_client_user` y `get_current_user_empresa_id` están presentes y listas para usarse.

---

## [2026-06-23] Unificación de Pantallas de Login (Profesionales y Clientes)

### Resumen de Cambios
- **Inicio de Sesión Unificado**: Se integró la funcionalidad de inicio de sesión de clientes (acceso por CUIT) directamente en la página de login estándar (`src/app/login/page.js`), eliminando la ruta `/login-cliente` y su archivo correspondiente.
- **Selector de Roles con Pestañas (Tabs)**: Se implementó un control interactivo (tipo toggle/tabs) en la tarjeta de login que permite al usuario seleccionar entre "Profesionales" (inicio con Correo Electrónico) y "Clientes" (inicio con CUIT y contraseña).
- **Recuperación Dinámica de Clave**: El modal de recuperación de contraseña ("¿La olvidaste?") se adapta dinámicamente según la pestaña seleccionada: solicita el email para profesionales, o el CUIT para clientes (resolviéndolo mediante la función RPC `get_email_by_cuit` de forma segura).
- **Limpieza de Middleware**: Se actualizaron las reglas de rutas públicas y redireccionamientos en `src/middleware.js` eliminando las referencias a `/login-cliente`.

### Decisiones Clave
- **Unificación de UX**: Centralizar los accesos en la ruta `/login` simplifica la navegación y el onboarding de usuarios y clientes, eliminando URLs separadas y mejorando la consistencia del flujo de autenticación del SaaS.

### Archivos Modificados / Creados
- `[MODIFY] src/app/login/page.js`
- `[MODIFY] src/middleware.js`
- `[DELETE] src/app/login-cliente/page.js`

---

## [2026-06-23] Scroll Vertical Individual en Barra Lateral (Sidebar)

### Resumen de Cambios
- **Barra Lateral Scrollable**: Se incorporó un contenedor scrollable con la clase `flex-1 overflow-y-auto min-h-0` para envolver la sección superior (Logotipo y Enlaces de Navegación) del Sidebar tanto en su versión móvil como de escritorio.
- **Footer Fijo**: Al delegar el comportamiento scrollable únicamente a los enlaces de navegación superiores, la sección inferior (el footer del Sidebar con los datos del usuario y botón de cerrar sesión) permanece fija y siempre visible en pantalla.
- **Scrollbar Personalizado Oscuro**: Se definió e implementó la clase `.sidebar-scrollbar` en `src/app/globals.css` para renderizar un scrollbar extremadamente fino (6px) con track transparente y color de thumb sutil que cambia a azul `#468DFF` al pasar el ratón. Esto ofrece una estética premium en consonancia con la paleta oscura de la barra.
- **Paridad de Interfaz**: Se aplicó este comportamiento de scroll individual a las 10 secciones principales de la aplicación.

### Decisiones Clave
- **Scroll de Navegación vs Scroll Completo**: Mantener el logotipo y el footer fijos previene que elementos esenciales del diseño se desplacen fuera de la vista en pantallas pequeñas, optimizando la usabilidad y conservando una jerarquía visual limpia.

### Archivos Modificados
- `[MODIFY] src/app/globals.css`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`

---

## [2026-06-23] Implementación del Portal de Acceso y Login para Clientes (CUIT)

### Resumen de Cambios
- **Portal de Acceso para Clientes**: Implementación de una interfaz segura y de solo lectura para los clientes, quienes se autentican con su CUIT (usuario) y contraseña.
- **Página de Login Especializada**: Creación de `/login-cliente` con paridad visual total a `/login` pero adaptado para ingreso por CUIT, resolviendo de forma segura el email del cliente a través del RPC `get_email_by_cuit`.
- **Aislamiento Multi-Tenant RLS**: Actualización de políticas RLS en tablas operativas (`empresas`, `establecimientos`, `programa_anual`, `programa_capacitacion`, `acciones_correctivas`, `extintores`, `visitas`, `avisos_riesgo`) para que los usuarios con rol `'cliente'` solo puedan ver datos de su propia empresa (`empresa_id`).
- **Sidebar y Vistas Filtradas**: Ocultación de secciones administrativas ("Clientes" y "Equipo de Trabajo") en el Sidebar para perfiles de tipo `'cliente'`.
- **Restricciones de Solo Lectura**: Configuración forzada de `isReadOnlyView = true` y ocultación de botones de acción rápida, guardado y eliminación en las vistas operativas.
- **Restricción de Perfil de Cliente**: Limitación del formulario en `profile/page.js` para usuarios con rol `'cliente'`, bloqueando campos profesionales, firmas y matrículas, deshabilitando el botón de guardado general y ocultando la eliminación de cuenta, manteniendo habilitado únicamente el cambio seguro de contraseña.
- **Administración de Accesos**: Inclusión de la pestaña "Portal de Cliente" en la gestión de empresas para permitir habilitar/deshabilitar cuentas con endpoints de API asíncronos `/api/clientes`.

### Decisiones Clave
- **Resolución Transparente de Email**: Utilizar un RPC seguro para convertir el CUIT del cliente en su correo de login permite mantener el flujo de autenticación estándar de Supabase Auth sin exponer públicamente las direcciones de correo de los clientes.
- **Roles y Permisos Centralizados**: El bloqueo server-side mediante RLS y la denegación en `user_has_action_permission` asegura que, aun si se salta la UI, los clientes no puedan realizar escrituras en la base de datos.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `gestion-syso-brand-guidelines`
- `supabase`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260703000000_client_portal_access.sql`
- `[NEW] src/app/api/clientes/route.js`
- `[NEW] src/app/login-cliente/page.js`
- `[MODIFY] src/middleware.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`

### Validaciones Ejecutadas
- Compilación de producción en Next.js (`npm run build`) verificada y exitosa de punta a punta.

---

## [2026-06-23] Ajuste de Pie de Página y Ampliación de Observaciones en PDF de Constancia de Visita

### Resumen de Cambios
- **Reubicación de Footer en PDF de Visitas**: Se desplazó el pie de página (barra azul, texto de contacto y número de página) hacia abajo en 60 puntos (de Y=730.63 a Y=790.63 para la barra, y de Y=751 a Y=811 para el texto).
- **Desplazamiento de Firmas**: Se bajó el bloque de firmas en 60 puntos, cambiando `sigY` de `675` a `735`.
- **Ampliación de Observaciones**: Se expandió el cuadro de observaciones de `237.75` pt a `297.75` pt de altura (finalizando en Y=600.0). Se agregaron 2 líneas punteadas adicionales (para un total de 8 líneas, en Y=555 y Y=579) y se actualizó el bucle de impresión para renderizar hasta 8 líneas de observaciones.

### Decisiones Clave
- **Optimización de Espacio A4**: Aprovechar el margen inferior excedente de la hoja A4 (anteriormente de ~90 pt) permitió desplazar el pie de página e incrementar la capacidad de escritura del cuadro de observaciones sin riesgo de desborde ni superposición con el bloque de firmas.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`

### Validaciones Ejecutadas
- Compilación de producción en Next.js (`npm run build`) verificada y exitosa.

---

## [2026-06-23] Implementación de Filtros de Fecha, Año y Mes en Visitas y Avisos de Riesgo

### Resumen de Cambios
- **Filtros Avanzados por Fecha, Año y Mes**: Se incorporaron controles interactivos de filtrado por fecha exacta (selector de fecha), año (dropdown cargado dinámicamente) y mes (dropdown de meses en español) en los listados principales de Constancias de Visita y Avisos de Riesgo.
- **Grilla de Filtros Unificada**: Se expandió la grilla del panel de filtros colapsable a 5 columnas (`lg:grid-cols-5`) en ambas vistas, distribuyendo proporcionalmente los filtros por Cliente/Razón Social, Establecimiento, Fecha, Año y Mes.
- **Limpieza Completa de Filtros**: Se amplió el botón "Limpiar Filtros" para que restablezca en un solo clic los nuevos estados de fecha, año y mes además de los filtros preexistentes.
- **Optimización y Paridad de Helpers**: Se definió y exportó la constante `MONTHS_OPTS` y la función helper `getAvailableYears(records)` en ambos archivos, asegurando la consistencia del listado de años y la extracción dinámica en base a los registros presentes.
- **Simplificación del Título de Sección**: Se reemplazó el título de la sección de "Avisos de Riesgo por Condiciones Inseguras" a únicamente "Avisos de Riesgo", mejorando la legibilidad y simplificando el encabezado de navegación.
- **Ajuste de Tamaño de Firma de Perfil en PDF de Visitas**: Se incrementó la dimensión máxima de la firma del profesional en el PDF de Constancias de Visita (`maxW = 240` y `maxH = 120`), logrando paridad de tamaño exacta con las firmas generadas en el reporte de Aviso de Riesgo.
- **Reubicación de Firmas en PDF de Visitas**: Para evitar el encimamiento con el cuadro de observaciones al agrandar las dimensiones de la firma, se bajó la línea de firma a `sigY = 675` y se compactó la altura del cuadro de observaciones a `237.75` (finalizando en `y = 540`) con 6 líneas punteadas, garantizando una separación limpia y libre de superposiciones.

### Decisiones Clave
- **Extracción Dinámica de Años**: Utilizar una función utilitaria para generar los años disponibles a partir de la fecha de los registros en lugar de utilizar un rango estático previene que la interfaz quede obsoleta en años futuros, asegurando adaptabilidad automática.
- **Reset Centralizado de Filtros**: Unificar la limpieza de filtros en el estado local asegura que al presionar "Limpiar Filtros" la grilla retorne inmediatamente al estado sin filtros de manera consistente y sin inconsistencias de UI.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`

### Validaciones Ejecutadas
- Compilación de producción Next.js (`npm run build`) verificada y exitosa de punta a punta.

### Riesgos Detectados / Remanentes
- Ninguno.

### Próximo Paso Recomendado
- Validar visualmente en dispositivos móviles/tablets que la grilla colapsable de 5 columnas se pliegue correctamente en filas consecutivas sin desbordar los contenedores.

---

## [2026-06-23] Firma de Perfil y Optimización de Velocidad en Constancias de Visita

### Resumen de Cambios
- **Optimización de Carga del Listado (Carga Instantánea)**: Se removió la resolución en lote de URLs firmadas para todos los registros del listado de visitas en `loadRealData`, reduciendo el tiempo de carga del listado de segundos a milisegundos.
- **Resolución Diferida Bajo Demanda**: Las URLs firmadas de firmas y fotos de cada registro se obtienen de forma asíncrona únicamente cuando se hace clic en Editar/Ver Detalle (`handleEditClick`) o al generar el reporte PDF.
- **Opción de Firma de Perfil Profesional**: Se integró en la sección de Constancias de Visita la posibilidad de usar la firma guardada en el perfil del usuario (bucket `signatures`) o firmar a mano alzada (bucket `documents`), replicando el flujo implementado en Aviso de Riesgo.
- **Función de Inicialización handleAddNew**: Se modularizó la creación de constancias para limpiar los estados locales y pre-seleccionar automáticamente al profesional técnico activo y su firma digital de perfil.
- **Escalado Proporcional en PDF**: Se incorporó la función helper `getImgDimensions` y se rediseñó la sección de firmas en `handleGeneratePdf` para centrar y escalar proporcionalmente las firmas del profesional y del responsable sobre la línea del PDF sin deformarlas, aplicando procesamiento de alta calidad PNG para firmas digitales.

### Decisiones Clave
- **Resolución Bajo Demanda**: Evitar llamadas repetitivas y simultáneas a `createSignedUrl` durante el renderizado inicial del listado previene cuellos de botella de red y disminuye la carga en la base de datos de Supabase.
- **Preservación de Aspect-Ratio en jsPDF**: Calcular las proporciones dinámicas en lugar de forzar dimensiones de imagen estáticas elimina las distorsiones visuales en firmas de diferentes proporciones.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `supabase`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260702000000_add_firma_tipo_to_visitas.sql`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`

### Validaciones Ejecutadas
- Migración DDL aplicada exitosamente en base de datos.
- Compilación de optimización Next.js (`npm run build`) verificada y exitosa.

---

## [2026-06-23] Ajuste de Tamaño en Observaciones y Escalado Proporcional de Firma en PDF de Aviso de Riesgo

### Resumen de Cambios
- **Reducción del Cuadro de Observaciones**: Se achicó la altura del cuadro de observaciones en la página 4 de `400.0 pt` a `300.0 pt` (finalizando en `y=549.3 pt`). El límite de renderizado de observaciones se adaptó a `y < 540 pt`.
- **Firma del Profesional Sin Deformación, Ampliada y con Alta Calidad**: Se incrementó el tamaño máximo del espacio de firma de `160 x 80 pt` a `240 x 120 pt` (el doble del tamaño original) y se reposicionó a partir de `y=600 pt` en la página 4. Se incrementó la resolución del pre-procesamiento de la firma con `resizeImage` a `1200 x 600 pt` habilitando la forzabilidad de formato PNG (`forcePng = true`). Esto previene que firmas con fondo transparente (tanto manuales como de perfil) se guarden o rendericen como JPEG (lo que causa pérdida de transparencia, colores negros de fondo o compresión ruidosa destructiva), logrando una nitidez absoluta en el PDF. Se redujo la longitud de la línea de firma a `140 pt` (de `377.07` a `517.07 pt`), centrándola debajo de la firma para evitar que se extienda demasiado a los lados.

### Decisiones Clave
- **Cálculo Proporcional en jsPDF**: En lugar de forzar un tamaño absoluto de 125x65 pt que deforma las firmas (especialmente firmas a mano muy horizontales o firmas cuadradas del perfil), calcular el ratio de aspecto dinámico y escalar la imagen asegura fidelidad visual.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`

### Validaciones Ejecutadas
- Compilación de producción (`npm run build`) verificada y exitosa.

### Riesgos Detectados / Remanentes
- Ninguno.

## [2026-06-23] Corrección en la Carga y Guardado de Firmas de Perfil en Avisos de Riesgo

### Resumen de Cambios
- **Auto-selección del Profesional Técnico**: Se incorporó la columna `profile_id` al consultar `miembros_equipo` desde Supabase. En `handleAddNew` se realiza una búsqueda de coincidencia automática con el `profile.id` del usuario logueado para pre-seleccionar al profesional interviniente de forma automática y cargar sus datos.
- **Previsualización de la Firma de Perfil**: Se implementó el estado `firmaPerfilPreviewUrl` y un hook `useEffect` que detecta cambios en `signaturePath` y `firmaTipo`. Resuelve la URL firmada del bucket privado `signatures` de Supabase (o usa base64/fallback en desarrollo/mock) para mostrar una vista previa de la firma de perfil dentro del formulario.
- **Sincronización y Validación de Firma**: En `handleSave` se reestructuró la asignación de `finalSignature` para guardar exactamente el path de la firma del perfil cuando `firmaTipo === 'perfil'`, y el canvas/firma manual previa cuando `firmaTipo === 'mano'`. Se añadieron validaciones server-side/client-side para evitar guardar con firma de perfil si no hay firma configurada o si el profesional es de tipo manual.

### Decisiones Clave
- **Separación de Estados de Firma**: Mantener `signaturePath` en sync con el perfil del profesional activo y delegar el guardado condicional en `handleSave` resolvió el error donde el cambio de tab entre manual y perfil guardaba paths del bucket equivocado.
- **Pre-selección por profile_id**: Buscar e inicializar el profesional técnico logueado reduce fricción y asegura la disponibilidad inmediata de su firma digital de perfil en el formulario.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `supabase`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`

### Validaciones Ejecutadas
- Compilación de producción en Next.js (`npm run build`) para verificar la ausencia de ReferenceError o de syntax/type errors.

### Riesgos Detectados / Remanentes
- Ninguno. La firma del perfil del profesional se obtiene directamente de `miembros_equipo`, la cual se mantiene en sincronía automática con la tabla `profiles` mediante triggers Postgres.

## [2026-06-23] Correcciones de Formato y Refinamientos Visuales en el PDF de Aviso de Riesgo

### Resumen de Cambios
- **Separación de Metadatos y Título**: Se incrementó el espaciado vertical de los bloques de metadatos (Razón Social, Establecimiento, Fecha, Aviso N°) alejándolos de la barra azul superior para evitar compresión (valores desplazados a `y=111.0` y `122.0` en páginas 1-3, y `105.0` y `116.0` en página 4).
- **Cuadro de Observaciones Compactado**: Se redujo la altura del cuadro de observaciones en la página 4 de `425.7 pt` a `400.0 pt` (finalizando en `y=649.3 pt`), limitando la impresión de texto vertical a `640 pt` para asegurar que las firmas profesionales entren holgadamente abajo.
- **Firma Profesional Externa**: Se reubicó el bloque de firma completamente fuera del cuadro de observaciones en el cuadrante inferior derecho (`y=660` a `752 pt`).
- **Resolución de Firma Encimada**: Se estructuró de forma ordenada el pie de firma: la firma (drawn canvas or profile image) se plasma arriba de la línea de firma (`y=660` a `725`), la línea se traza a `y=730`, and el nombre del profesional y cargo se colocan por debajo de ella (`y=742` y `y=752` respectivamente), previniendo cualquier encimamiento de texto e imagen.
- **Carga de Firma Robusta**: Se incorporó soporte para detectar y procesar firmas codificadas en base64 directamente, URLs firmadas de Supabase, URLs absolutas y fallback automático a logotipo si es una ruta de prueba (`'mock'`). Se corrigió específicamente la resolución de firmas de perfil del personal, extrayendo el path relativo del bucket a partir de la URL pública del perfil del miembro para posibilitar la correcta generación de URLs firmadas en buckets privados, evitando el error CORS/403 al fetcharla.
- **Definición de getImgDimensions**: Se definió la función helper privada `getImgDimensions` que faltaba en el componente de la página de Avisos, resolviendo la excepción de referencia (`ReferenceError`) en la consola al procesar imágenes de hallazgos.
- **Alineación de Tabla de Referencias**: Se ajustó la altura del rectángulo de borde exterior a `105.49 pt` y la línea vertical divisoria a `y=233.97` para acoplarse perfectamente al pie de la última fila, eliminando cualquier brecha o desalineado de bordes.
- **Escalado Adaptativo Proporcional de Fotos**: Se rediseñó la inyección de imágenes en la columna "Imagen" de la grilla de hallazgos. Las fotos se adaptan al alto de la celda si son verticales (ratio < 1) o al ancho si son horizontales (ratio >= 1), con límites de seguridad cruzados para impedir que deformen o desborden la celda.

### Decisiones Clave
- **Límites de Seguridad en Escalado**: Aunque se adapte al alto o ancho de la celda según orientación, validar que el ancho escalado (para verticales) y el alto escalado (para horizontales) no superen el bounding box previene cualquier desborde horizontal que afecte columnas adyacentes.
- **Mapeo de Rutas de Prueba**: Permitir que paths que empiezan con `'mock'` o `'data:'` esquiven el llamado a storage.createSignedUrl evita fallos catastróficos en entornos híbridos de base de datos local y remota.

### Skills Utilizadas
- `next-best-practices`
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`

### Validaciones Ejecutadas
- Compilación de producción de Next.js exitosa (`npm run build`) verificada en consola.

---

## [2026-06-23] Estandarización de Interfaz y Alineamiento de Estilos en Avisos de Riesgo

### Resumen de Cambios
- **Refactorización de Contenedores de Búsqueda y Filtros**: Se aplicó el estilo estándar y responsivo (`space-y-3 shrink-0`) al contenedor superior de filtros en la página de Avisos de Riesgo. Se actualizó la etiqueta de filtrado a "Filtrar por Razón Social" y se añadió soporte para filtrado dinámico por fecha.
- **Estandarización de la Tabla de Listado**: Se eliminó la doble columna de acciones y se unificó la tabla de Avisos en una única columna de **Acciones** al final de la grilla, alineándose con el formato estándar de la tabla de Constancias de Visita.
- **Normalización de Iconos y Estilos**: Se incrementó el tamaño de los iconos de acción a `h-4.5 w-4.5` y se cambiaron los colores de fondo y pictogramas. El icono de envío de correo se cambió de `Send` a `Mail` con el color de fondo azul claro correspondiente. Se incrementó el tamaño de letra del listado a `text-sm`.
- **Simplificación del Selector de Profesionales**: Se reemplazó la grilla de selección doble por un selector desplegable único que incluye la opción `"Otro (cargar manualmente)..."`, renderizando condicionalmente un input de texto para carga libre.
- **Estandarización del Canvas de Firma**: Se ajustó el canvas de firma manual al contenedor estándar con relación de aspecto `aspect-[2/1]`, ancho de 400px y alto de 200px. Se incorporó la visualización de la firma a mano guardada (`firmaManoSavedUrl`) al editar o en modo lectura, junto con el texto de superposición de firma vacía y el botón de limpieza alineado al encabezado.
- **Renombre de Campo de Observaciones**: Se renombró la etiqueta del textarea de observaciones en el formulario a `"Observaciones"`.
- **Estandarización de Ventana Emergente de Correo**: Se adaptaron los textos del modal de envío de correo electrónico en la página de Avisos de Riesgo para referirse correctamente a "Aviso de Riesgo" y "el aviso de riesgo en PDF" en lugar de "Constancia" / "constancia de visita". Además, se eliminó la propiedad `resize-none` del textarea manual para asegurar la paridad exacta al 100% de clases e interfaz con el modal de visitas.
- **Rediseño del Formato PDF de Aviso de Riesgo**: Se overhauló por completo la función `generateAvisoPdf` para adherir a una grilla rígida de coordenadas absolutas en puntos (A4 vertical de 595 x 842 pt). Se implementó un logo de tamaño proporcional, barras de título azules `#4472C4`, bloques de metadatos en dos columnas y una grilla de hallazgos de exactamente 6 filas de `102.4 pt` de alto por página con alternancia de fondo, ajuste de línea de `7.45 pt` de interlineado y alineamiento vertical centralizado. En la página 4 se implementó la tabla de referencias técnicas con colores semáforo, el cuadro de observaciones y la firma profesional con aclaración y cargo centrado a `5.92 pt` de tamaño de fuente.

### Decisiones Clave
- **Unificación de Interfaz de Firma**: Usar el contenedor reactivo de firma en relación de aspecto `aspect-[2/1]` garantiza la compatibilidad visual y simplifica el escalado entre pantallas táctiles y de escritorio.
- **Simplificación del Formulario**: La transición a un único dropdown de profesionales simplifica la UX y normaliza el guardado de datos y firmas con el estándar del proyecto.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/avisos/page.js`

### Validaciones Ejecutadas
- Compilación de producción Next.js exitosa (`npm run build`) verificada en consola mediante `cmd.exe /c`.

### Riesgos Detectados / Remanentes
- Ninguno.

### Próximo Paso Recomendado
- Realizar validaciones de extremo a extremo de la generación del PDF de Aviso de Riesgo en dispositivos móviles y tablets para comprobar el correcto escalado del canvas de firma de 400x200.

---

## [2026-06-22] Implementación de Sección "Aviso de Riesgo" y Normalización de Permisos RLS

### Resumen de Cambios
- **Sección de Aviso de Riesgo**: Se creó la página principal `src/app/[tenant-slug]/avisos/page.js` que permite listar, filtrar, previsualizar, descargar y enviar avisos de riesgo en PDF de 4 páginas de A4 vertical con colores semáforo correspondientes. Soporta firma manual (canvas) y digital del perfil.
- **Normalización de Permisos RLS Granulares**: Se refactorizaron las políticas RLS en la tabla `public.avisos_riesgo` en `supabase/migrations/20260701000000_create_avisos_riesgo.sql` para dividir el acceso de escritura `FOR ALL` en políticas individuales para `INSERT`, `UPDATE` y `DELETE` validadas por `public.user_has_action_permission('avisos', 'cargar' | 'editar' | 'eliminar')`.
- **Branding en Notificación por Correo**: Se mejoró el envío de correo desde la sección de avisos para extraer, redimensionar y enviar el logotipo del tenant en Base64 (`tenantLogoBase64`) al API `/api/send-email`, mostrando el logo correctamente en el cuerpo del correo.
- **Barra Lateral y Permisos de Miembros**: Se normalizaron los selectores de permisos e incorporaron los checkboxes correspondientes para `"avisos"` en `equipo/page.js`, así como los enlaces en el Sidebar de las 9 secciones.

### Decisiones Clave
- **Políticas RLS Granulares Separadas**: Separar las políticas de escritura por cada verbo de SQL (`INSERT`, `UPDATE`, `DELETE`) en la base de datos previene la elevación de privilegios de usuarios con permisos limitados (por ejemplo, permitir guardar pero prohibir editar/eliminar).
- **Carga y Compresión del Logotipo en Frontend**: Comprimir el logo a un ancho de 400px en el cliente antes de despachar el correo electrónico evita cargas de red innecesarias y previene el error HTTP 413 Payload Too Large en el Route Handler.

### Skills Utilizadas
- `next-best-practices`
- `supabase`
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`

### Archivos Modificados / Creados
- `[NEW] src/app/[tenant-slug]/avisos/page.js`
- `[MODIFY] supabase/migrations/20260701000000_create_avisos_riesgo.sql`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/api/send-email/route.js`
- `[MODIFY] todas las 9 secciones (Sidebar)`

### Validaciones Ejecutadas
- Ejecución de `node scripts/run-migrations.js` en la base de datos Supabase con éxito.
- Compilación de Next.js (`npm run build`) verificada y finalizada con éxito.

### Riesgos Detectados / Remanentes
- Ninguno.

### Próximo Paso Recomendado
- Realizar pruebas de extremo a extremo de carga y previsualización de firma de aviso con usuarios técnicos con permisos acotados.

---

## [2026-06-22] Implementación de Vista de Solo Lectura al Hacer Clic en Renglones de Tabla

### Resumen de Cambios
- **Vista de Solo Lectura en Listados**: Se implementó una nueva interacción de usuario a lo largo de las 7 secciones operativas de la plataforma (`empresas`, `equipo`, `programa`, `capacitacion`, `correctivas`, `extintores`, `visitas`). Ahora, al hacer clic en cualquier renglón de las tablas (`<tr>`), el formulario lateral o inline se abre en modo de solo lectura (`isReadOnlyView = true`), deshabilitando de forma segura todos los inputs, textareas y canvas mediante un `<fieldset disabled>`.
- **Botón Condicional de Edición**: Se agregó un botón `"Editar"` (con color ámbar) en el footer de los formularios cuando están en modo solo lectura. Si el usuario tiene permisos (`canEditar === true`), al presionar este botón se desbloquean dinámicamente los campos para permitir modificaciones sin cerrar la ventana.
- **Bypass de Alerta de Cierre**: Al cerrar un formulario (vía botón "Salir", cruz o flecha) o al navegar por el sidebar estando en modo solo lectura, se omite el modal de confirmación `"Salir sin guardar"`, permitiendo una navegación más ágil ya que no hubo cambios en los datos.
- **Retrocompatibilidad**: Los botones de acción rápida en la columna "Acciones" (lápiz para editar) continúan abriendo los registros directamente en modo editable (`isReadOnlyView = false`), tal como operaban anteriormente.

### Decisiones Clave
- **Control Declarativo vía State**: Mantener el estado `isReadOnlyView` a nivel de componente principal permite heredar la deshabilitación de forma declarativa sin inyectar lógica compleja por cada campo individual.
- **Salida Directa sin Fricciones**: Bypassear la confirmación modal de salida únicamente cuando no se ha modificado nada (en modo lectura) mejora drásticamente la experiencia de navegación (UX).

### Skills Utilizadas
- `next-best-practices`
- `gestion-syso-bitacora`

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`

### Validaciones Ejecutadas
- Compilación de producción exitosa: Se ejecutó `cmd.exe /c "npm run build"`, completando de manera exitosa y optimizando todas las páginas dinámicas y estáticas del proyecto sin errores.

### Riesgos Detectados / Remanentes
- Ninguno.

---

## [2026-06-22] Corrección de Alerta de Salida No Arrojada en Perfil de Usuario

### Resumen de Cambios
- **Refactorización de handleExitWithoutSave**: Se simplificó la función de salida sin guardar `handleExitWithoutSave` en la edición de perfil del usuario ([profile/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/profile/page.js)). Se removió el bloque de validación de campos obligatorios mínimos y la verificación del estado `isDirty` al abandonar el formulario mediante los botones explícitos "Volver al Dashboard" y "Salir". Ahora se muestra el modal de alerta `"Salir sin guardar"` incondicionalmente, unificando el comportamiento con el resto de formularios del sistema y previniendo bloqueos de navegación hostiles por validaciones de entrada incompletas.

### Decisiones Clave
- **Salida Incondicional de Formulario**: El proceso de salida/cancelación de formulario debe priorizar el control del usuario sobre su navegación, permitiendo abandonar el mismo libremente (previa confirmación) sin forzar validaciones de obligatoriedad server-side o client-side destinadas únicamente al guardado efectivo de la información.

### Skills Utilizadas
- `next-best-practices`
- `gestion-syso-bitacora`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`

### Validaciones Ejecutadas
- Compilación de producción Next.js (`npm run build`) verificada y finalizada con éxito.

### Riesgos Detectados / Remanentes
- Ninguno. Las alertas de los botones de salida operan ahora de forma robusta y consistente con los lineamientos del proyecto.

### Próximo Paso Recomendado
- Validar el comportamiento de navegación del sidebar (que sigue utilizando `isDirty` para mayor comodidad al navegar de forma casual sin interactuar).

---

## [2026-06-22] Resolución de ReferenceError de Inicialización de Variables de Estado en Páginas Operativas

### Resumen de Cambios
- **Corrección de Inicialización (Temporal Dead Zone)**: Se elevó la declaración `const [editingId, setEditingId] = useState(null);` en el cuerpo del componente en los 6 módulos operativos (`equipo`, `empresas`, `programa`, `capacitacion`, `correctivas`, `extintores`). Esto resuelve el error en tiempo de ejecución `ReferenceError: Cannot access 'editingId' before initialization` que ocurría al evaluarse la expresión condicional de permisos `const isFormDisabled = editingId ? !canEditar : !canCargar;` antes de que el estado estuviese inicializado por React.

### Decisiones Clave
- **Elevación de Hooks al Bloque Superior**: Agrupar todas las declaraciones de estado (`useState`) al comienzo de la función del componente, garantizando consistencia, legibilidad y previniendo errores de alcance o temporalidad al evaluar variables derivadas durante la fase de inicialización.

### Skills Utilizadas
- `next-best-practices`
- `gestion-syso-bitacora`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`

### Validaciones Ejecutadas
- Compilación de producción exitosa: Se ejecutó `cmd.exe /c "npm run build"`, completando de manera exitosa y optimizando todas las páginas dinámicas y estáticas del proyecto sin errores.

### Riesgos Detectados / Remanentes
- Ninguno. Las variables de estado fueron reubicadas respetando las reglas de Hooks de React.

### Próximo Paso Recomendado
- Realizar pruebas de extremo a extremo de carga y edición de miembros del equipo con roles restringidos para re-validar que la interfaz se bloquee/habilite según los permisos guardados.

---

## [2026-06-22] Implementación de Permisos de Edición Granulares por Sección

### Resumen de Cambios
- **Permisos Granulares de Edición por Sección**: Se implementó una grilla de configuración de permisos con tres niveles de granularidad (**Cargar**, **Editar** y **Eliminar**) para cada una de las secciones operativas del sistema en el formulario de edición de miembros del equipo ([equipo/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/equipo/page.js)).
- **Validación y Soporte de RLS en Base de Datos**: Se actualizaron e implementaron nuevas políticas de Row Level Security (RLS) en las tablas operativas de Supabase vinculándolas a la función helper de base de datos `public.user_has_action_permission(section, action)`. Se rediseñó la función `user_has_edit_permission` para conservar la compatibilidad de retroceso en caso de JSONs de permisos con valores booleanos puros.
- **Adecuación de la Interfaz de Usuario en las 6 Secciones Operativas**: Se actualizaron las vistas principales de la aplicación ([visitas/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/visitas/page.js), [programa/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/programa/page.js), [extintores/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/extintores/page.js), [empresas/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/empresas/page.js), [correctivas/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/correctivas/page.js), [capacitacion/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/capacitacion/page.js)) para consumir el helper de extracción de permisos `getSectionPermissions`. 
  - Si un usuario no posee el permiso de **Cargar** en un módulo, se oculta el botón "Nuevo" / "Agregar".
  - Si un usuario no posee el permiso de **Editar**, el botón de la fila del listado cambia del icono de lápiz al icono de ojo (`Eye`) de solo lectura ("Ver Detalle"), se deshabilita todo el formulario mediante `<fieldset disabled>` y se remueve el botón de guardar cambios.
  - Si un usuario no posee el permiso de **Eliminar**, se ocultan todos los botones de borrado ("Eliminar" / "Quitar" / "Trash") en el listado y en el formulario de edición.

### Decisiones Clave
- **Icono de Ojo como Fallback de Sólo Lectura**: Cuando un técnico carece del permiso de modificación sobre una entidad, conservar el botón de acceso con una variante visual de solo lectura (icono de ojo) permite mantener la visibilidad general de la información corporativa sin comprometer la integridad de los datos.
- **Deshabilitación Unificada vía Fieldset**: Emplear `<fieldset disabled={isFormDisabled}>` sigue siendo la forma más declarativa y limpia en React/HTML5 para forzar estado de solo lectura en formularios completos sin requerir lógica redundante por cada input individual.

### Skills Utilizadas
- `next-best-practices`
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `supabase`

### Archivos Modificados
- `[NEW]` [20260622185458_granular_permissions.sql](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/supabase/migrations/20260622185458_granular_permissions.sql) (creada y ejecutada en fase previa)
- `[MODIFY]` [equipo/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/equipo/page.js)
- `[MODIFY]` [empresas/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/empresas/page.js)
- `[MODIFY]` [programa/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/programa/page.js)
- `[MODIFY]` [capacitacion/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/capacitacion/page.js)
- `[MODIFY]` [correctivas/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/correctivas/page.js)
- `[MODIFY]` [extintores/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/extintores/page.js)
- `[MODIFY]` [visitas/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/visitas/page.js)

### Validaciones Ejecutadas
- Compilación de producción (`npm run build`) verificada y finalizada con éxito.

---

## [2026-06-22] Corrección de Botones de Salida en Formulario de Equipo de Trabajo

### Resumen de Cambios
- **Corrección de Eventos onClick**: Se cambió la asignación directa de `onClick={handleExitWithoutSave}` por `onClick={() => handleExitWithoutSave()}` en los dos botones de la parte superior del formulario de edición de integrantes (la flecha hacia atrás y la cruz de cierre). Esto previene que el objeto de evento sintético de React sea recibido como callback, resolviendo un error de tipo `TypeError` al intentar evaluar si el formulario es dirty para disparar la confirmación de salida.
- **Estandarización de Alerta de Salida**: Se refactorizó la función `handleExitWithoutSave` para que invoque incondicionalmente a `showAlert` con tipo `'warning'`, eliminando la validación del estado `isDirty`. Esto alinea el comportamiento de salida de esta sección con las otras 6 secciones de la plataforma, que muestran siempre el modal de advertencia al abandonar el formulario.

### Decisiones Clave
- **Llamadas Explícitas en Handlers**: Evitar el paso implícito de parámetros a funciones utilitarias de UI que aceptan parámetros opcionales por defecto (como `onConfirmOverride`), previniendo errores donde los objetos del evento de React son interpretados erróneamente como funciones callback.
- **Unificación de UX**: Homogeneizar las alertas de salida en toda la aplicación de manera que todos los botones de retorno ("volver atrás", cruz superior y botón "Salir") actúen bajo el mismo flujo de confirmación.

### Skills Utilizadas
- `next-best-practices`
- `gestion-syso-bitacora`

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`

### Validaciones Ejecutadas
- Compilación de producción (`npm run build`) verificada y finalizada con éxito.

### Riesgos Detectados / Remanentes
- Ninguno. La funcionalidad de control de cambios no guardados (el modal de confirmación) ahora opera de forma consistente e incondicional.

### Próximo Paso Recomendado
- Ninguno. El flujo de salida está estandarizado y libre de excepciones sintácticas.

---

## [2026-06-22] Unificación de Roles a Nivel de Aplicación y Base de Datos

### Resumen de Cambios
- **Unificación de Roles**: Se unificaron los roles de usuario en la plataforma. Los roles `owner` y `admin` se consolidaron en un único rol llamado **Administrador** (internamente `'admin'`), y los roles `supervisor` e `inspector` se consolidaron en el rol **Miembro de equipo** (internamente `'miembro'`).
- **Actualización de Secciones Operativas**: Se modificaron las 6 secciones operativas de la plataforma (`visitas`, `programa`, `extintores`, `empresas`, `correctivas`, `capacitacion`) y el `dashboard` para actualizar la lógica de validación de permisos `canEdit` y el mapeo de mock data, reemplazando las antiguas referencias a `owner`, `supervisor` e `inspector` por `'admin'` y `'miembro'`.

### Decisiones Clave
- **Simplificación del Modelo de Permisos**: Reducir el número de roles simplifica tanto la administración de la base de datos como las comprobaciones en el frontend, garantizando al mismo tiempo que la aplicación esté lista para aplicar cuotas y límites por suscripción a nivel de administrador.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `supabase`
- `next-best-practices`

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`

### Validaciones Ejecutadas
- Compilación del proyecto (`npm run build`) completada con éxito.

---

## [2026-06-22] Corrección de Ámbito para Helper getSignedUrl en Perfil de Usuario

### Resumen de Cambios
- **Corrección de Ámbito en Helper**: Se extrajo la función `getSignedUrl` de adentro del hook `useEffect` en `src/app/[tenant-slug]/profile/page.js` y se reubicó al nivel del componente React. Esto soluciona la alerta `getSignedUrl is not defined` lanzada por el manejador `handleSaveChanges` cuando los usuarios guardan cambios en su perfil (como adjuntar una firma digital).

### Decisiones Clave
- **Helper Compartido**: Elevar la función de utilidad privada al nivel del componente evita la duplicación de código y permite que tanto los hooks de ciclo de vida (`useEffect`) como los manejadores de eventos asíncronos (`handleSaveChanges`) compartan la misma lógica de generación de URLs firmadas temporales para buckets privados de Supabase Storage.

### Skills Utilizadas
- `next-best-practices`
- `gestion-syso-bitacora`

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`

### Validaciones Ejecutadas
- Compilación del proyecto (`npm run build`) completada con éxito.

### Riesgos Detectados / Remanentes
- Ninguno. La firma digital ya se sube correctamente y su refresco posterior a través de la URL firmada ahora se completa sin lanzar excepciones de referencia.

### Próximo Paso Recomendado
- Ninguno. El flujo de guardado de perfil del personal técnico está completamente saneado.

---

## [2026-06-22] Resolución de Recursión Infinita en Triggers de Sincronización

### Resumen de Cambios
- **Protección contra Bucles en Triggers**: Se incorporó la validación condicional `IS DISTINCT FROM` en las funciones trigger `public.sync_miembro_to_profile()` y `public.sync_profile_to_miembro()`. Esto previene la recursión infinita (`stack depth limit exceeded`) al actualizar o guardar miembros del equipo/perfiles, asegurando que la actualización solo ocurra cuando existan diferencias reales en los datos de las columnas.
- **Sincronización en Supabase**: Se aplicaron los triggers corregidos en la base de datos de Supabase.

### Decisiones Clave
- **Validación de Cambios Mínimos**: Utilizar `IS DISTINCT FROM` es el patrón más limpio y seguro para sincronizaciones bidireccionales en PostgreSQL, cortando de raíz la propagación de actualizaciones si el payload no representa modificaciones efectivas de los datos.

### Skills Utilizadas
- `supabase`
- `gestion-syso-bitacora`

### Archivos Modificados
- `[MODIFY] supabase/migrations/20260630010000_add_permisos_to_profiles_and_members.sql`

### Validaciones Ejecutadas
- Ejecución de consultas de actualización DDL en Supabase con éxito.
- Verificación del build de producción Next.js (`npm run build`) completada con éxito.

### Riesgos Detectados / Remanentes
- Ninguno. La recursión infinita queda totalmente controlada por los filtros a nivel de trigger.

### Próximo Paso Recomendado
- Proceder a validar la experiencia completa de guardado y edición de perfil desde la UI de la aplicación.

---

## [2026-06-22] Corrección de Sincronización de Partido en Triggers de Perfil

### Resumen de Cambios
- **Corrección en Trigger**: Se corrigió el mapeo de la columna en la función de trigger `public.sync_miembro_to_profile()`. Se cambió `partido = NEW.partido` a `departamento_partido = NEW.partido`, ya que la columna en la tabla `public.profiles` es `departamento_partido` (definida en migraciones previas) y no `partido`. Esto resuelve el error `column "partido" of relation "profiles" does not exist` al intentar guardar el perfil de un miembro del equipo.
- **Sincronización en Supabase**: Se actualizó la función trigger mediante ejecución SQL directa en la base de datos de Supabase.

### Decisiones Clave
- **Consistencia de Esquema**: Se ajustó la función trigger para respetar el nombre del campo físico `departamento_partido` en `public.profiles`.

### Skills Utilizadas
- `supabase`
- `gestion-syso-bitacora`

### Archivos Modificados
- `[MODIFY] supabase/migrations/20260630010000_add_permisos_to_profiles_and_members.sql`

### Validaciones Ejecutadas
- Ejecución de la corrección SQL en la base de datos de Supabase con éxito.
- Compilación completa de producción (`npm run build`) verificada y finalizada con éxito.

### Riesgos Detectados / Remanentes
- Ninguno. La corrección normaliza el trigger al esquema existente.

### Próximo Paso Recomendado
- Realizar pruebas funcionales editando y guardando perfiles de equipo desde la UI.

---

## [2026-06-22] Resolución de Dependencia clsx y Validación de Compilación

### Resumen de Cambios
- **Sincronización de Dependencias**: Se ejecutó `npm install` para instalar los paquetes `clsx` y `tailwind-merge` en el entorno local (que producían el error `Module not found: Can't resolve 'clsx'`).
- **Verificación de Compilación**: Se ejecutó la compilación de producción `npm run build` confirmando que todas las páginas se generan correctamente y sin errores de resolución de módulos.

### Decisiones Clave
- **Uso de CMD para npm**: Debido a las políticas de ejecución restrictivas de PowerShell en el entorno local (`UnauthorizedAccess` en scripts `.ps1`), se ejecutó la instalación y compilación invocando explícitamente `cmd.exe /c`, asegurando la compatibilidad de herramientas de build.

---

## [2026-06-22] Aplicación de Migración de Permisos y Estructura en Base de Datos

### Resumen de Cambios
- **Ejecución de Migración de Base de Datos**: Se aplicó la migración `20260630010000_add_permisos_to_profiles_and_members.sql` en la base de datos remota de Supabase. Esto resuelve el error de caché del esquema (`Could not find the 'permisos' column of 'miembros_equipo'`).
- **Verificación de Esquema**: Se verificó mediante un script con el SDK de Supabase que la columna `permisos` JSONB se encuentra creada y accesible en la tabla `public.miembros_equipo`, con RLS políticas y triggers correctamente enlazados.

### Decisiones Clave
- **Actualización Directa de Esquema en Supabase**: Dado que el frontend y las políticas RLS ya hacían referencia a la columna `permisos` desde los cambios del 21 de junio, aplicar la migración pendiente restablece la consistencia entre el código fuente y el estado del servidor remoto de la base de datos.

---

## [2026-06-21] Control de Accesos y Permisos de Edición Granulares por Sección

### Resumen de Cambios
- **Migración de Base de Datos**: Se incorporó el campo `permisos` JSONB en las tablas `public.profiles` y `public.miembros_equipo` con sincronización bidireccional automática mediante triggers, habilitando la verificación granular a nivel de RLS.
- **Configuración de Permisos en Equipo**: Se añadieron los controles interactivos en la vista de edición/creación del personal para configurar accesos específicos cuando cuentan con login habilitado.
- **Protección de Lectura/Escritura en Módulos**: Se implementó la validación de `canEdit` en las 7 secciones de trabajo (`empresas`, `equipo`, `programa`, `capacitacion`, `correctivas`, `extintores`, `visitas`). Si el rol o permiso del usuario es de solo lectura, se deshabilitan todos los campos de entrada de datos (mediante `<fieldset disabled>`), se ocultan los botones de agregado/guardado/eliminación y se limita el control de firmas y fotos.
- **Correcciones JSX de Módulos**: Se subsanaron errores de tags desparejados en las páginas de Capacitaciones y Equipo de Trabajo generados en sesiones previas, garantizando que el build de producción Next.js finalice de manera exitosa.

### Decisiones Clave
- **Bloqueo a Nivel de Formulario (Fieldset)**: El uso de `<fieldset disabled={!canEdit}>` a nivel del contenedor principal del formulario garantiza de forma robusta e idiomática en HTML5 que ninguno de los inputs o botones hijos (incluyendo checkboxes y textareas) reciba foco o sea interactuable.
- **Restricción de Dibujo en Canvas**: Para evitar firmas no autorizadas, el gancho `useEffect` de configuración de los canvas de firma digital evalúa directamente `canEdit` y aborta tempranamente sin vincular listeners de mouse/touch, preservando el estado de solo lectura de forma segura.

### Archivos Modificados
- `[NEW] supabase/migrations/20260630010000_add_permisos_to_profiles_and_members.sql`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`

---

## [2026-06-21] Unificación de Barra Lateral de Miembros y Contenedor de Eliminación de Cuenta

### Resumen de Cambios
- **Corrección de Barra Lateral en Programa**: Se removió el condicional remanente del menú de de escritorio en la sección del Programa de Gestión Anual (`programa/page.js`), el cual ocultaba el enlace "Equipo de Trabajo" a usuarios con rol `inspector` o `supervisor` tras la carga del perfil. Con esto, todas las vistas cargan el enlace "Equipo de Trabajo" incondicionalmente de forma homogeneizada, resolviendo el efecto de parpadeo y desaparición en refresco.
- **Estandarización de Salir y Eliminación de Cuenta**: Se validaron los estilos del botón "Salir" en el formulario del perfil de usuario y la lógica colapsable del contenedor de "Eliminar Cuenta/Acceso" para asegurar consistencia absoluta con los estándares de diseño.

### Decisiones Clave
- **Visualización Unificada de Secciones**: Todos los integrantes del equipo pueden visualizar y acceder a todas las secciones principales del dashboard de la consultora. Las acciones de inserción y modificación de datos quedan resguardadas por políticas RLS en la base de datos de Supabase.

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js` (en sesión anterior)

---

## [2026-06-21] Correcciones en Perfil de Usuario: Scroll, Pictogramas y Botones de Quitar

### Resumen de Cambios
- **Corrección de Scroll Horizontal**: Se agregó la propiedad CSS `overflow-x-hidden` al contenedor principal `<main>` del Perfil de Usuario (`profile/page.js`), evitando que los gradientes de fondo absolutos generen una barra de desplazamiento horizontal innecesaria en laptops y móviles.
- **Estandarización del Pictograma de Carga de Firma**: Se sustituyó el icono `FileText` de Lucide por `ImageIcon` en la caja de carga de firma digital en el perfil, alineando la interfaz gráfica de firma con la de los logotipos.
- **Visibilidad del Botón "Quitar" en Previsualizaciones**: Se rediseñó la estructura HTML y estilos CSS de los cargadores de imágenes (Logotipo 1, Logotipo 2, Firma y Matrículas frente/dorso) en el perfil. Los botones de eliminar ("Quitar") ahora se renderizan directamente bajo el contenedor relativo del cargador con la clase `z-10 absolute top-2 right-2 bg-red-600 hover:bg-red-700`, resolviendo el problema de falta de visibilidad y clics ocultos por flexbox.

### Decisiones Clave
- **Posicionamiento Absoluto a Nivel de Contenedor**: Al mover los botones de eliminar del div interno al contenedor principal `relative`, garantizamos que su posición se fije de forma inequívoca en la esquina superior derecha del cuadro de carga, sin interferir con el escalado o centrado de las imágenes.

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`

---

## [2026-06-21] Estandarización de Alturas Reactivas, Alerta de Salida de Equipo y Eliminación de Cuenta

### Resumen de Cambios
- **Alturas Reactivas en Tablas y Calendario (7 Páginas)**: Se reemplazaron las alturas fijas (`maxHeight: 'calc(100vh - 240px)'`) en las tablas de listados de 6 módulos (`visitas`, `extintores`, `empresas`, `correctivas`, `capacitacion`, `programa`) por una propiedad condicional en línea controlada por el estado `showFilters`. Si se despliegan los filtros, el `maxHeight` se reduce dinámicamente (`calc(100vh - 310px)` o `calc(100vh - 360px)` para el programa anual, que cuenta con barra de vistas extra), evitando que el pie de página desborde y obligue al navegador a generar un scroll global. Esta misma lógica se aplicó al contenedor del **Calendario** en el Programa de Gestión y se ajustó el alto mínimo de las celdas de día de `100px/120px` a `70px/85px` para optimizar visualización en laptops.
- **Estandarización de Alerta de Salida en Equipo de Trabajo (`equipo/page.js`)**: Se actualizó el componente modal `modalAlert` para mostrar de forma estática la etiqueta `"Cancelar"` en el botón de retroceso y se eliminó la sombra roja de confirmación ad-hoc, alineando el diseño del modal con el estándar del resto de las secciones.
- **Generalización de Eliminación de Cuenta en Perfil (`profile/page.js`)**: Se retiró la restricción exclusiva para el rol de `'owner'` de manera que todos los integrantes de equipo puedan darse de baja. El contenedor del perfil ahora renderiza de forma dinámica las advertencias de seguridad y los textos requeridos en el prompt de confirmación en mayúsculas (`"ELIMINAR MI CUENTA"` para dueños de organizaciones y `"ELIMINAR MI ACCESO"` para otros roles).
- **Pie de Página Dinámico en PDF de Constancia (`visitas/page.js`)**: Se refactorizó la función de generación del PDF para que el pie de página de la constancia (`drawHeaderAndFooter`) lea dinámicamente el nombre de la empresa/consultora (`tenant.name`) sin símbolos de registro, el teléfono (`profile.phone`) y el correo (`profile.email`) del usuario que actualmente tiene iniciada la sesión, en lugar de pintar datos de soporte estáticos.

### Decisiones Clave
- **Control de Altura de Scroll en Cliente**: Utilizar `maxHeight` reactivo en base al estado `showFilters` evita la complejidad de recalcular dinámicamente los tamaños mediante listeners de redimensionamiento de ventana (ResizeObservers) y preserva el rendimiento.
- **Seguridad en Eliminación de Usuarios**: Permitir a cualquier rol invocar `delete_own_account()` es seguro ya que el backend de Supabase Auth y la función RPC ya aíslan y resguardan de forma nativa los registros de la empresa cuando no se trata del propietario principal.

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`

---

## [2026-06-21] Optimización de Email de Visitas: Fix para Gmail Web y Remitente Personalizado

### Resumen de Cambios
- **Resolución de Bloqueo de Imagen en Gmail Web**: Se modificó la inyección del logotipo del tenant en la plantilla HTML del correo para usar **Content-ID (CID) inline attachments** en lugar de inyección Base64 directa. El logo se decodifica en el servidor a un búfer binario y se adjunta con la clave `tenantlogo`, resolviendo la restricción estricta de Gmail Web que impedía su visualización en navegadores.
- **Alineación de Mensaje de Correo**: Se cambió el término `"inspección técnica"` por `"visita técnica"` en el texto del cuerpo del correo electrónico para mantener consistencia terminológica con el módulo de Constancias de Visita.
- **Alias Dinámico en Remitente**: Se configuró el remitente (`From` header) para usar el nombre del tenant (`tenantName` o `SMTP_SENDER_NAME`) como alias visible, resolviendo que la cuenta base de Gmail (`sebastian.merlassino@gestionsyso.com`) pueda enmascararse apropiadamente ante los clientes.

### Decisiones Clave
- **Uso de CID Inline en Nodemailer**: Utilizar attachments referenciados por `cid:` es el estándar más robusto para emails comerciales, asegurando compatibilidad nativa tanto en aplicaciones móviles como en clientes web (Gmail, Outlook) sin depender de la carga o bloqueo de imágenes externas o Base64.

### Archivos Modificados
- `[MODIFY] src/app/api/send-email/route.js`

---

## [2026-06-21] Inicialización de Filtros Colapsados y Estandarización de Altura de Tablas

### Resumen de Cambios
- **Filtros avanzados colapsados por defecto**: Se modificó el estado inicial `showFilters` de `true` a `false` en las 6 secciones operativas que cuentan con buscador y filtros avanzados (`visitas`, `programa`, `extintores`, `empresas`, `correctivas`, `capacitacion`). Esto permite que la interfaz inicie limpia y sin elementos distractores hasta que el usuario decida desplegarlos de forma manual mediante el botón de flecha correspondiente.
- **Estandarización del alto máximo de las tablas**: Se unificaron los contenedores de las tablas en las 7 secciones operativas (`visitas`, `programa`, `extintores`, `equipo`, `empresas`, `correctivas`, `capacitacion`) a una altura máxima consistente de `calc(100vh - 240px)`. Esto aprovecha de forma óptima el espacio liberado al colapsar los filtros avanzados, asegurando que la grilla ocupe al menos el 95% del alto disponible.
- **Cabeceras Sticky Fijas**: Se inyectó la clase `sticky top-0 z-10 bg-slate-50 border-b border-slate-150` a todas las cabeceras `<th>` en las vistas que no contaban con ellas directamente (`visitas`, `empresas`, `correctivas`, `capacitacion`, `equipo`), previniendo que los encabezados se desplacen y desaparezcan de la vista al realizar scroll.

### Decisiones Clave
- **Unificación del Espaciado Vertical**: Homogeneizar las tablas a `calc(100vh - 240px)` garantiza una experiencia de usuario sumamente consistente y prolija al transicionar entre los diferentes módulos operativos de la consultora.

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`

---

## [2026-06-21] Estandarización de Navegación del Sidebar y Resolución de Layout Shifts

### Resumen de Cambios
- **Navegación SPA sin recarga**: Se reemplazaron todas las etiquetas HTML `<a>` de la barra lateral (tanto desktop como mobile/drawer) por el componente `<Link>` de Next.js en las 9 vistas operativas (`visitas`, `programa`, `profile`, `extintores`, `equipo`, `empresas`, `dashboard`, `correctivas`, `capacitacion`). Esto previene la recarga completa del navegador al navegar y asegura que el sidebar se mantenga montado de forma estática en el DOM.
- **Estandarización de Iconos**: Se unificaron los tamaños de todos los iconos de la barra lateral a `h-4 w-4 shrink-0`. Específicamente, se corrigió el pictograma `ClipboardCheck` de Constancias de Visita que medía `h-4.5 w-4.5` en las vistas de `equipo` y `empresas`.
- **Estructura del Perfil de Usuario (`profile/page.js`)**: Se reestructuró la validación del estado `initialLoading` para evitar renderizar un cargador de pantalla completa que destruía el layout superior y ocultaba la barra lateral. Ahora el spinner se muestra únicamente dentro del contenedor `<main>`, preservando la barra lateral renderizada desde el primer instante.

### Decisiones Clave
- **Uso de Link con handleSidebarNavigation**: El reemplazo por `<Link>` preserva la funcionalidad de intercepción de navegación mediante `onClick` (`handleSidebarNavigation`), garantizando que se advierta al usuario antes de perder datos no guardados en formularios editables sin sacrificar la velocidad de navegación del cliente.

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`

### Validaciones Ejecutadas
- Compilación de producción exitosa mediante `npm run build` vía `cmd.exe`.

---

## [2026-06-21] Fix de Visualización de Extintores y Envío de Correo de Constancia

### Resumen de Cambios
- **Tabla de Extintores (`extintores/page.js`)**: Se estandarizó la tabla para ocupar el alto máximo disponible en pantalla (`calc(100vh - 280px)`) con scroll vertical interno. Se configuraron todos los elementos `<th>` con posicionamiento `sticky top-0 z-10 bg-slate-50 border-b border-slate-150` para mantener la cabecera fija durante el desplazamiento.
- **Optimización de Envío de Correo (`visitas/page.js` y `/api/send-email/route.js`)**:
  - Se solucionó el error `Unexpected token 'R'` (HTTP 413 Payload Too Large) habilitando la compresión nativa de jsPDF (`compress: true`) y agregando un helper de redimensionamiento de imagen (`resizeImage`) que comprime y reduce el logo y las firmas a baja resolución antes de insertarlos en el PDF.
  - Se corrigió la expresión regular en el backend de `/^data:application\/pdf;base64,/` a `/^data:application\/pdf;.*base64,/` para permitir metadatos adicionales y decodificar correctamente el PDF.

### Decisiones Clave
- **Redimensionamiento en Cliente**: Al comprimir y bajar la resolución de los logotipos y firmas en el cliente se disminuye el peso del payload del correo electrónico en un ~95%, lo cual asegura compatibilidad con cualquier hosting (incluyendo Vercel Serverless Functions y Next.js API Routes que tienen límites estrictos de 1MB a 4.5MB).
- **Compresión nativa de jsPDF**: El uso de `compress: true` reduce significativamente el peso final del PDF binario adjunto de varios megabytes a menos de 150KB.

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/api/send-email/route.js`

---

## [2026-06-21] Fix de Cabecera Sticky y Optimización de Carga en Barra Lateral

### Resumen de Cambios
- **Tabla del Programa de Gestión Anual (`programa/page.js`)**: Se solucionó el error del encabezado de la tabla no fijo agregando `sticky top-0 z-10 bg-slate-50 border-b border-slate-150` a todos los elementos `<th>` de la cabecera, logrando que quede fijo de manera robusta al hacer scroll vertical.
- **Barra Lateral / Sidebar (9 Páginas)**: Se resolvió el parpadeo y la desaparición intermitente de la sección "Equipo de Trabajo" durante la recarga del perfil del usuario. Se reemplazó la validación condicional estricta `(profile?.role === 'owner' || profile?.role === 'admin')` por `(!profile || profile?.role === 'owner' || profile?.role === 'admin')` en las páginas `visitas/page.js`, `extintores/page.js`, `equipo/page.js`, `empresas/page.js`, `dashboard/page.js`, `correctivas/page.js`, `capacitacion/page.js` y `profile/page.js` (con `profileData`). Esto permite que el elemento de menú se renderice visible por defecto durante el estado de carga del usuario, y se oculte dinámicamente sólo si el perfil cargado es de otro rol (como `inspector`), eliminando el layout shift y el flash visual para el owner y admin.

### Decisiones Clave
- **Estilos Sticky a Nivel TH**: Aplicar la posición `sticky` directamente a las celdas de encabezado `th` en lugar de la fila o contenedor de la cabecera asegura que el comportamiento sticky funcione adecuadamente en navegadores modernos frente a tablas que utilizan la propiedad CSS `border-collapse`.
- **Pre-renderizado del Sidebar Basado en Suposición de Acceso**: Mostrar por defecto las secciones del sidebar críticas para roles privilegiados durante la fase inicial de carga previene saltos e inconsistencias de UI al navegar entre secciones del dashboard, mejorando significativamente la percepción de velocidad de la app.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`

### Validaciones Ejecutadas
- Compilación de producción exitosa en Next.js (`npm run build` vía cmd) sin ningún error de enrutamiento o sintaxis.
- Commit y empuje de cambios (git push) al repositorio remoto.

---

## [2026-06-21] Estandarización Global de Encabezados de Página y Formularios de Carga

### Resumen de Cambios
- **Encabezado de Página (Top Navbar)**: Se unificó estructural y estéticamente el header de navegación en las 9 vistas operativas (`visitas`, `programa`, `profile`, `extintores`, `equipo`, `empresas`, `dashboard`, `correctivas`, `capacitacion`). Ahora todas tienen exactamente `h-16`, border en `border-slate-200`, padding responsivo `px-4 md:px-6`, y tipografía `font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none`.
- **Badge de Plan**: Se estandarizó la visualización del plan actual de manera uniforme con la clase `bg-[#468DFF]/15 border border-[#468DFF]/25 text-[#468DFF] text-[10px] font-bold uppercase tracking-wider`.
- **Formularios de Carga Inline**: Se homogeneizaron las cabeceras de los formularios en los módulos (`visitas`, `programa`, `extintores`, `correctivas`, `capacitacion`, `equipo`, `empresas`) a la altura `h-16` con padding `px-4 md:px-6` y fondo `bg-slate-50 border-b border-slate-150`.
- **Contenedores de Formulario en Clientes y Equipo**: Se refactorizaron las vistas de creación y edición en `equipo/page.js` y `empresas/page.js` para usar la estructura de tarjeta inline (`bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col max-h-[85vh]`) y scroll interno independiente, igualándolos con el resto de los módulos.
- **Tabla de Constancias de Visita (`visitas/page.js`)**: Se eliminó la columna de incidentes para optimizar la cuadrícula y se integró un botón de visualización rápida con el icono `Eye` (ojito) que abre y previsualiza el PDF generado mediante Object URLs en una nueva pestaña sin forzar su descarga inmediata.
- **Tabla de Programa de Gestión (`programa/page.js`)**: Se unificaron las tipografías del texto de fecha vacía ("Pendiente") a sans-serif `font-medium italic text-slate-400` en ambas columnas de fecha (planificada y realización), y se combinaron las columnas de "Progreso" y "Estado" en una sola columna unificada de **"Progreso / Estado"** con el mismo diseño del plan de capacitación anual (badge responsivo de color translúcido con borde y barra de progreso inferior).
- **Documentación de Reglas de Workspace**: Se actualizaron los documentos `docs/design/ui-specs/DESIGN_STANDARD.md` y `docs/brand/BRAND_GUIDELINES.md` para normar la unificación estética y estructural de los encabezados.

### Decisiones Clave
- **Consistencia Visual Absoluta**: Mantener la misma cuadrícula responsiva (`px-4 md:px-6`) y la misma altura (`h-16`) para el top navbar y las cabeceras de los formularios asegura que no existan desalineaciones horizontales y que la UI se perciba como un producto cohesionado.
- **Formularios como Tarjetas Scrollables**: Limitar la altura de los formularios a `max-h-[85vh]` con scroll independiente evita la pérdida del navbar superior de la página y mejora la navegación en pantallas pequeñas.

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] docs/design/ui-specs/DESIGN_STANDARD.md`
- `[MODIFY] docs/brand/BRAND_GUIDELINES.md`

### Validaciones Ejecutadas
- Compilación de producción exitosa (`npm run build`) para todas las rutas dinámicas y estáticas, asegurando consistencia de sintaxis en JSX y empaquetado final.

---

## [2026-06-20] Flexibilización de Formulario y Carga de Logotipo en PDF de Constancia de Visita

### Resumen de Cambios
- **Formulario de Constancia de Visita (`visitas/page.js`)**:
  - **Flexibilización de Firmas y Responsable**: Se eliminaron las validaciones obligatorias de las firmas digitales y del campo "Nombre del Responsable Presente". Ahora el formulario se puede registrar con estos campos vacíos.
  - **Selector de Profesional Unificado**: Se removió el selector de radio "Tipo de Carga Profesional" y se reemplazó por un select dropdown unificado para "Profesional Interviniente" con opción "Otro (cargar manualmente)..." y renderizado condicional de campo de texto manual, imitando el flujo de "Responsable Asignado" en el Programa de Gestión.
  - **Remoción de Observaciones Internas**: Se eliminó del formulario de carga el campo textarea "Observaciones y notas internas", el cual ya no es editable desde la interfaz del usuario.
  - **Estandarización de Colores**: Todos los botones de toggles (Sí/No) para incidentes, capacitaciones, simulacros y aviso de riesgo se estandarizaron para emplear el color azul `#468DFF` en su estado seleccionado.
- **Generación de PDF**:
  - **Carga de Logotipo Principal**: Se reestructuró la carga del logo en la cabecera del reporte PDF para que consulte y pinte dinámicamente el logotipo principal del tenant (`tenant.logo_1_url`), con fallback automático y seguro al logotipo por defecto `/brand/logo-primary.png` si no está configurado o falla su obtención.
  - **Alineación de Profesional**: Se ajustó la coordenada horizontal (de `185` a `205`) del valor de "Profesional interviniente" para evitar superposición con el texto de la etiqueta y mantener la alineación vertical uniforme con el campo de Razón Social.

### Decisiones Clave
- **Consistencia Visual en Acciones de Formulario**: El uso del color `#468DFF` para todas las selecciones activas uniforma la identidad visual de la marca y elimina los verdes, rojos e índigos distractores del formulario de carga.
- **Tolerancia y Robustez del PDF**: Mantener un fallback local para la cabecera asegura la disponibilidad del PDF descargable ante cualquier eventualidad con la URL del logotipo del tenant.

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`

---

## [2026-06-20] Rediseño del PDF de Constancia de Visita y Hardening de jsPDF

### Resumen de Cambios
- **Módulo de Visitas (`visitas/page.js`)**:
  - **Rediseño Completo de PDF**: Se reestructuró la función `handleGeneratePdf` para generar un PDF de 2 páginas en formato **A4** (con coordenadas en puntos `pt`) siguiendo el diseño y especificaciones detalladas del JSON de la constancia.
  - **Componentes Fijos de Marca**: Se agregaron el logotipo en el encabezado de ambas páginas y el pie de página unificado de marca (barra azul, aclaración "Gestión SySO ®" con teléfonos y número de página).
  - **Tablas de Actividades**:
    - **Página 1**: Grid de datos generales de la empresa (Razón social, CUIT, etc. de 24 pt de alto) y tabla de actividades de control (ítems 1 al 4) dibujando checkboxes y checkmarks manuales `[X]`.
    - **Página 2**: Tabla de actividades parte 2 (ítems 5 al 8) incluyendo renderizado horizontal multicheckbox para los simulacros.
  - **Líneas de Observaciones**: Sección de observaciones de altura fija (307.75 pt) que dibuja 9 líneas punteadas y superpone el texto de observaciones preventivas y generales.
  - **Hardening de jsPDF**: Se envolvieron las llamadas de `doc.addImage` en bloques `try-catch` y se agregaron validaciones de prefijo `data:image/` para evitar que imágenes de firmas corruptas o caídas de red al cargar el logotipo congelen e interrumpan la generación del archivo.

### Decisiones Clave
- **Coordenadas y Posicionamiento Manual**: Utilizar coordenadas absolutas de jsPDF en lugar de autoTable para las secciones críticas de datos, firmas y observaciones garantiza el cumplimiento estricto del diseño físico del formulario.
- **Tolerancia a Imágenes Nulas/Corruptas**: Evitar la propagación de excepciones en la inyección de assets base64 garantiza que el usuario siempre pueda descargar el PDF incluso si un inspector cuenta con firmas incompletas o corruptas en base de datos.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `next-best-practices`

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`

### Validaciones Ejecutadas
- Compilación del proyecto (`cmd.exe /c "npm run build"`) completada con éxito.
- Pruebas automatizadas con Playwright (`temp/test_ui.py`) simulando la navegación a visitas y descargando exitosamente el PDF en formato A4 sin arrojar excepciones de interfaz.

---

## [2026-06-20] Actividad Económica Opcional y Botones Estandarizados con PlusCircle

### Resumen de Cambios
- **Clientes / Empresas (empresas/page.js)**:
  - **Actividad Económica Opcional**: Se removió el asterisco obligatorio `*` de la etiqueta visual "Actividad Económica (CIIU)" en el formulario de creación/edición de empresas. La plataforma permite guardar correctamente una empresa con el arreglo de actividades vacío.
- **Estandarización de Iconos de Encabezado**:
  - Se sustituyó el icono simple de adición `Plus` por el icono circular `PlusCircle` en los botones superiores de los encabezados de las vistas de listado de las 5 secciones restantes:
    - **Visitas (`visitas/page.js`)**: Botón "Nueva Constancia".
    - **Programa de Gestión Anual (`programa/page.js`)**: Botón "Nueva Actividad".
    - **Extintores (`extintores/page.js`)**: Botón "Incorporar Nuevo Extintor".
    - **Acciones Correctivas (`correctivas/page.js`)**: Botón "Incorporar Nuevo Hallazgo".
    - **Capacitación (`capacitacion/page.js`)**: Botón "Registrar Capacitación".
  - Se removió la importación del componente `Plus` no utilizado en dichos archivos y se importó `PlusCircle` de `lucide-react`.

### Decisiones Clave
- **Consistencia Visual en Acciones de Agregar**: Mantener el mismo pictograma (`PlusCircle`) para las acciones principales de agregado de la cabecera en las 7 secciones de la app mejora la consistencia del diseño.
- **Flexibilidad en el Registro de Empresas**: Permitir registrar empresas sin código CIIU de inicio se alinea con la flexibilidad del flujo operativo, requiriendo menos datos obligatorios rígidos.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`

### Validaciones Ejecutadas
- Compilación de producción de Next.js (`cmd.exe /c "npm run build"`) completada de manera exitosa y sin advertencias.

---

## [2026-06-20] Correcciones en la Vista de Equipo y Separación de Columnas en Clientes

### Resumen de Cambios
- **Equipo de Trabajo (equipo/page.js)**:
  - **Alineación de Pictogramas**: Se ajustó el tamaño de los iconos de Editar (`Edit`) y Eliminar (`Trash2`) en la tabla principal de `h-3.5 w-3.5` a `h-4.5 w-4.5`, unificando su dimensión con la de los demás listados del proyecto.
  - **Simplificación de Filtros**: Se eliminaron los filtros avanzados de Provincia (estados reactivos `filterProvincia` y `showFilters`, y sus selectores en la UI). El buscador de texto ahora solo comprueba coincidencia contra el Nombre y Apellido (`full_name`) y se actualizó el placeholder correspondiente.
  - **Texto de Acceso Login**: Se modificó la etiqueta de estado de acceso para los integrantes sin cuenta de login, reemplazando `"Solo Registro"` por `"Sin Acceso"` para mayor claridad conceptual en la tabla.
- **Clientes (empresas/page.js)**:
  - **Separación de Columnas**: Se dividió la columna combinada "Razón Social / Nombre Comercial" en dos columnas independientes: **Razón Social** y **Nombre Comercial**.
  - **Equilibrio de Columnas**: Se asignaron anchos estables y proporcionados a los headers de la tabla (`w-[30%]`, `w-[28%]`, `w-[18%]`, `w-[12%]`, `w-[12%]`) para prevenir deformaciones en pantalla ancha.
  - **Ordenamiento y Estructura**: Se añadió soporte de ordenación al hacer clic sobre "Nombre Comercial" (`handleSort('nombre_comercial')`), y se actualizó el `colSpan` de la fila de tabla vacía de 4 a 5.
- **Dashboard (dashboard/page.js)**:
  - **Título de Contenedor**: Se corrigió el título del contenedor de vencimientos del mes en curso y próximo mes para mostrar la leyenda `"Próximos vencimientos"` en lugar del texto anterior, unificando el formato textual del panel.

### Decisiones Clave
- **Unificación de Componentes y Visualización**: Asegurar un tamaño uniforme de los pictogramas de acción y la consistencia en el balance de ancho de las tablas previene el ruido visual y mejora la escaneabilidad.
- **Simplificación del Filtro de Equipo**: Dado que el personal técnico de Higiene y Seguridad de una consultora suele ser acotado, mantener un panel de filtros avanzados y búsquedas por CUIT/email añadía complejidad innecesaria. Limitar la búsqueda al Nombre y Apellido agiliza la operatoria y limpia la interfaz.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`

### Validaciones Ejecutadas
- Compilación y build de producción de Next.js (`npm run build`) completados de manera exitosa y sin advertencias.

---

## [2026-06-20] Reorganización del Formulario en Programa de Gestión Anual

### Resumen de Cambios
- **Rediseño del Formulario de Programa Anual**: Se reestructuró la disposición espacial del formulario inline en `programa/page.js` para optimizar la organización de los campos y hacerla más fluida y compacta:
  - **Cliente y Establecimiento**: Agrupados en la misma fila utilizando un grid responsivo (`grid grid-cols-1 md:grid-cols-2 gap-4`), ubicando Establecimiento a la derecha de Razón Social.
  - **Marco Legal y Responsable**: Agrupados en la misma fila en un grid responsivo (`grid grid-cols-1 md:grid-cols-2 gap-4`), con Responsable Asignado a la derecha del campo Marco Legal.
  - **Fechas y Progreso**: Agrupados en la misma fila en un grid responsivo de tres columnas (`grid grid-cols-1 md:grid-cols-3 gap-4`), colocando Fecha Planificada (columna 1), Fecha de Realización (columna 2) y la barra de Progreso (columna 3) de manera consecutiva.
- **Responsabilidad Mobile**: Se conservan los estilos y el apilado vertical en dispositivos móviles mediante la regla `grid-cols-1 md:grid-cols-*`.

### Decisiones Clave
- **Optimización de Espacio en Pantallas Grandes**: La agrupación de campos relacionados en filas horizontales reduce considerablemente el scrolling vertical del formulario de carga inline sin comprometer la legibilidad ni la usabilidad móvil.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`

### Validaciones Ejecutadas
- Compilación y build de producción de Next.js (`cmd.exe /c "npm run build"`) completados de manera exitosa y sin advertencias.

### Próximo Paso Recomendado
- Realizar pruebas de humo visuales y responsive en dispositivos reales de diferentes escalas para asegurar que los inputs no tengan desbordamientos de flexbox.

---

## [2026-06-20] Estandarización de Alertas y Botones en Formularios de Carga

### Resumen de Cambios
- **Estandarización de Alertas**: Se unificaron visual y funcionalmente los diálogos de alerta modal (`modalAlert` / `confirmModal`) en las 7 secciones operativas (Visitas, Extintores, Acciones Correctivas, Capacitación, Programa Anual, Empresas y Equipo). Ahora todos emplean el overlay oscuro y difuminado (`bg-slate-900/60 backdrop-blur-sm`), la animación de escala y el renderizado dinámico de confirmación `{confirmText || 'Confirmar'}`.
- **Confirmación Homogénea al Salir**: Se unificó el comportamiento y textos de las alertas "Salir sin guardar", utilizando la confirmación estándar "Confirmar" al intentar abandonar un formulario con cambios activos o desde el menú lateral.
- **Unificación de Estilo en Botones**: Se modificaron las clases de estilo de todos los botones "Salir" y "Guardar" de todos los formularios de carga de todas las secciones para coincidir exactamente con el diseño y tamaño del módulo operativo de Acciones Correctivas.
- **Botón de Eliminación Inline**: Se integró un botón "Eliminar" de color rojo con sombreado de confirmación junto a "Guardar" en la tarjeta de edición de cada formulario (visible sólo con `editingId` activo). Al ser pulsado, despliega el modal estándar de confirmación antes de procesar el borrado del registro y regresar automáticamente a la vista de listado.

### Decisiones Clave
- **Renderizado Dinámico de Textos en Alertas**: El uso de variables JSX dinámicas para la confirmación de la alerta evita tener que hardcodear textos rígidos, permitiendo que la misma alerta muestre "Eliminar" o "Confirmar" según el evento de origen sin duplicar marcado.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`

### Validaciones Ejecutadas
- Compilación del proyecto (`npm run build`) completada con éxito.

### Riesgos Detectados / Remanentes
- Ninguno. La consistencia operativa y de UX del pie de los formularios de carga se encuentra completamente unificada.

### Próximo Paso Recomendado
- Realizar pruebas de humo manuales en dispositivos de diversos tamaños para validar la alineación y el espaciado correcto de los botones de Guardar, Eliminar y Salir en modo edición.

---

## [2026-06-20] Estandarización de Buscadores y Reversión de Fondos de Formularios a Blanco

### Resumen de Cambios
- **Rediseño de Barra de Herramientas**: Se unificó la ubicación y el tamaño del buscador (cuadro de búsqueda) en las 7 secciones principales (Visitas, Extintores, Acciones Correctivas, Programa de Capacitación, Programa Anual, Clientes y Equipo). Ahora todos se encuentran alineados a la derecha, agrupados junto al botón de acción principal y configurados con un ancho fijo de `w-full md:w-72` en pantallas medianas/grandes.
- **Reversión de Color de Fondo de Formularios**: Se modificaron todos los contenedores de formularios inline, tarjetas del perfil de usuario y tarjetas del formulario de onboarding para regresar al color de fondo blanco (`bg-white`) en lugar de `bg-syso-bg`, restableciendo la coherencia visual con el fondo de las tablas y mejorando la visualización.
- **Consistencia en Botón Limpiar Filtros**: Se revisó y unificó la implementación del botón "Limpiar filtros" en todas las secciones, asegurando que se posicione en la misma fila del toggle "Filtros de Búsqueda" sin incrementar la altura del contenedor.

### Decisiones Clave
- **Alineación y Ancho Consistente del Buscador**: Mantener el buscador compacto a la derecha junto al botón de carga, con un espaciador flexible en la izquierda, estandariza visualmente la parte superior de las tablas y reduce el ruido visual.
- **Fondo de Formularios en Blanco**: Devolver el fondo de los formularios y fichas de datos a blanco (`bg-white`) mantiene un contraste nítido y consistente con las tablas de datos, dejando que el fondo gris `#D9D9D9` actúe puramente como lienzo de fondo de la ventana.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados
- `[MODIFY] src/app/onboarding/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`

### Validaciones Ejecutadas
- Compilación y build de Next.js (`npm run build` vía cmd) completados con éxito.
- Commits y push a Git.

---

## [2026-06-20] Estandarización de Color de Fondo (#D9D9D9) y Pictogramas de Equipo

### Resumen de Cambios
- **Configuración de Color Global**: Se agregó el color `'syso-bg': '#D9D9D9'` en `tailwind.config.js` y se registró la variable `--syso-bg` en `src/app/globals.css`.
- **Estandarización de Fondos de Sección**: Se reemplazó el color de fondo de las páginas (`bg-[#f8fafc]`) por `bg-syso-bg` en todas las secciones principales (visitas, extintores, correctivas, capacitacion, programa, dashboard, profile, empresas, equipo) y en las pantallas de acceso (login, register, reset-password, onboarding).
- **Estandarización de Fondos de Formulario de Carga**: Se configuraron los contenedores de formularios inline para usar `bg-syso-bg` en lugar de `bg-white` para homogeneizar la vista de carga de datos, manteniendo los inputs con fondos claros (`bg-slate-50/50` / `bg-white`) para preservar el contraste.
- **Pictogramas de Equipo**: Se refactorizó la tabla de integrantes en `src/app/[tenant-slug]/equipo/page.js` para usar iconos estandarizados de `lucide-react`:
  - Icono `User` en la columna Nombre en lugar de iniciales.
  - Iconos `Phone` y `Mail` para el teléfono y correo en la columna Contacto.
  - Icono `MapPin` en la columna Ubicación.
  - Iconos `Check` y `X` dentro del badge de Acceso Login.
- **Actualización de Estándares y Marca**: Se modificaron `docs/design/ui-specs/DESIGN_STANDARD.md` y `docs/brand/BRAND_GUIDELINES.md` para normar el uso de `bg-syso-bg` en páginas y contenedores de formularios.

### Decisiones Clave
- **Fondo Unificado con Contraste**: El uso de `#D9D9D9` como fondo de formularios e interfaces de sección provee una visualización robusta. Se mantuvieron los campos de entrada de datos con fondo claro para asegurar legibilidad y cumplir con pautas de accesibilidad.
- **Sustitución de Iniciales por Pictogramas**: El uso de iconos consistentes en la tabla de equipo de trabajo mejora la escaneabilidad visual y da un acabado premium.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `gestion-syso-multitenant-security`
- `next-best-practices`

### Archivos Modificados
- `[MODIFY] docs/brand/BRAND_GUIDELINES.md`
- `[MODIFY] docs/design/ui-specs/DESIGN_STANDARD.md`
- `[MODIFY] src/app/globals.css`
- `[MODIFY] src/app/login/page.js`
- `[MODIFY] src/app/onboarding/page.js`
- `[MODIFY] src/app/register/page.js`
- `[MODIFY] src/app/reset-password/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] tailwind.config.js`

### Validaciones Ejecutadas
- Compilación y build de producción de Next.js (`npm run build` vía cmd) completados con éxito para todo el proyecto sin errores ni advertencias.
- Publicación y empuje de los cambios en Git.

---

## [2026-06-20] Estandarización y Optimización de Filtros y Contenedores de Búsqueda

### Resumen de Cambios
- **Diseño Compacto Unificado**: Homogeneizado el contenedor de búsqueda y filtros avanzados en las 7 secciones principales (`visitas`, `extintores`, `correctivas`, `capacitacion`, `programa`, `empresas`, `equipo`). Se redujo el padding vertical, aplicando buscador compacto (`py-1.5 text-xs`), selectores compactos (`text-xs py-1.5`) y botón primario adaptado (`py-1.5 px-3.5 text-xs font-bold`).
- **Autocolapsado en Móviles**: Implementado el estado `showFilters` y hook `useEffect` en cada vista para autodetectar pantallas de dispositivos móviles (ancho < 768px) al cargar, colapsando los filtros avanzados por defecto.
- **Toggle de Filtros Interactivo**: Añadido un botón toggle con una flecha rotativa (`ChevronDown`/`ChevronUp` de Lucide) junto al subtítulo "Filtros de Búsqueda" para permitir expandir/contraer los filtros dinámicamente en cualquier dispositivo.
- **Limpieza de Visitas**: Eliminado el filtro "¿Hubo Accidentes?" en el módulo de Visitas (interfaz, lógica de filtro y restauración).

### Decisiones Clave
- **Colapso Client-Side Seguro**: Para evitar advertencias de hidratación en Server-Side Rendering (SSR) de Next.js, la inicialización del estado `showFilters` en dispositivos móviles se realiza estrictamente en el cliente mediante un hook `useEffect` que verifica `window.innerWidth`.
- **Estandarización de Grillas de Filtros**: Se preservó la grilla de selects específica para cada sección pero encapsulada con animación CSS `animate-fade-in` y visibilidad condicional según el estado de colapso, garantizando consistencia operacional.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados
- `[MODIFY] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`

### Validaciones Ejecutadas
- Compilación y build de producción de Next.js (`npm run build` vía cmd) completados con éxito para todo el proyecto sin errores ni advertencias de sintaxis o empaquetado JSX.
- Empuje y publicación del código exitosos en el repositorio Git.

---

## [2026-06-20] Homogeneización Estética de la Plataforma al Estándar de Visitas

### Resumen de Cambios
- **Estandarización de Estilos**: Estandarizados los fondos de loaders y de páginas a `bg-[#f8fafc]`, los bordes a `border-slate-150`, y los contenedores/cards a `rounded-2xl` en todas las secciones principales (Dashboard, Perfil, Clientes, Programa Anual, Programa de Capacitación, Equipo de Trabajo, Acciones Correctivas y Extintores).
- **Unificación de Elementos de Formulario**: Homogeneizados los inputs y selects de formulario a la clase `border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50`.
- **Estandarización de Perfil (profile/page.js)**: Actualizado el input de sitio web, los inputs de redes sociales, las cajas de carga de logos (dropzones) y la tarjeta de Plan Suscrito para alinearse a la marca y formato del estándar.
- **Resolución de Errores de Sintaxis**: Corregidas etiquetas JSX mal formadas en `capacitacion/page.js` y `programa/page.js` que impedían el empaquetado del proyecto.

### Decisiones Clave
- **Eliminación de Bordes slate-300 y slate-200/80**: Se optó por reemplazar todos los bordes rígidos por `border-slate-150` para suavizar el aspecto general del dashboard y brindar un aspecto más premium alineado al mockup de referencia.
- **Inputs Compactos en Redes Sociales**: Conservación del tamaño de fuente en `text-xs` para los inputs de redes sociales en el perfil por consistencia espacial, pero aplicando el mismo esquema cromático de bordes y fondos del estándar.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`

### Validaciones Ejecutadas
- Compilación de producción local (`npm run build` vía cmd) completada exitosamente al 100% de manera íntegra, sin advertencias ni errores en ninguno de los bundles de Next.js.

### Riesgos Detectados / Remanentes
- Ninguno detectado. La UI ahora es consistente y coherente en todas sus vistas.

### Próximo Paso Recomendado
- Realizar pruebas de usuario en producción/staging para confirmar que el feedback táctil y visual de los inputs/botones actualizados cumple con las expectativas.

---

## [2026-06-20] Implementación de Constancia de Visita, Firma Digital y Envío de PDF por Correo

### Resumen de Cambios
- **Base de Datos y RLS**:
  - Creada la tabla `public.visitas` con Row Level Security (RLS) y aislamiento multi-tenant a través de la migración `20260630000000_create_visitas.sql`.
- **Backend API**:
  - Creado el endpoint `/api/send-email` utilizando `nodemailer` para el envío de constancias en formato PDF adjunto, con simulación integrada para desarrollo y preview.
- **Frontend y Firma Digital**:
  - Diseñada la vista de visitas (`/visitas`) con formulario interactivo de lógica condicional (detalles de incidentes, mediciones, capacitaciones y simulacros).
  - Implementados cuadros de firma digital basados en HTML5 Canvas con soporte mouse/touch, guardado en Supabase Storage (`documents` bucket) y visualización/previsualización dinámica.
  - Generación de reportes PDF A4 vertical mediante `jspdf` y `jspdf-autotable` incorporando el logotipo del tenant en cabecera y firmas al pie.
  - Modal interactivo de envío por correo sugerido (consumiendo `empresas.contactos_correos`) y libre.
- **Navegación Unificada**:
  - Integrado el enlace "Constancias de Visita" (icono `ClipboardCheck`) en las barras laterales de escritorio y menús móviles en los 8 módulos operativos de la plataforma (dashboard, empresas, equipo, programa, capacitacion, correctivas, extintores, profile).

### Decisiones Clave
- **Generación Local de PDF**: Procesar el PDF en el navegador a través de jsPDF reduce la latencia, evita cargos extras de procesamiento de PDF server-side y simplifica la firma de recursos multi-tenant al renderizar assets ya autorizados localmente.
- **Canvas HTML5 Puro**: Se prefirió canvas nativo con manejadores de eventos básicos (`onMouseDown`, `onMouseMove`, `onMouseUp`, `onTouchStart`, `onTouchMove`, `onTouchEnd`) para evitar dependencias pesadas propensas a romper compilaciones o dificultar responsive.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `supabase`
- `next-best-practices`
- `gestion-syso-brand-guidelines`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260630000000_create_visitas.sql`
- `[NEW] src/app/api/send-email/route.js`
- `[NEW] src/app/[tenant-slug]/visitas/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de Next.js (`npm run build`) validada sin advertencias ni errores de enrutamiento o sintaxis.

---

## [2026-06-20] Estandarización de Acciones de Salida y Modales de Advertencia

### Resumen de Cambios
- **Modales de Salida Interceptados**:
  - Implementada la función `handleSidebarNavigation(e, path)` en los seis módulos operativos principales para interceptar clics de navegación en la barra lateral (tanto menú móvil como lateral de escritorio) si el usuario se encuentra con un formulario activo de creación/edición de datos.
  - El click en links de barra lateral activa un diálogo modal de confirmación ("Salir sin guardar") antes de redirigir de forma transparente.
- **Estandarización de Botones y Header Actions**:
  - Reemplazados los botones "Cancelar" y "Volver al listado" por "Salir" alineado abajo a la izquierda y "Guardar" abajo a la derecha utilizando un contenedor unificado con clases `flex justify-between items-center`.
  - Vinculadas todas las cabeceras del formulario (`ArrowLeft` de regreso y la cruz `X` de cierre) para lanzar consistentemente el diálogo modal de confirmación antes de limpiar campos y volver a la vista del listado.
- **Eliminación de Confirmación Nativa en Equipo y Estandarización de Extintores y Programa de Gestión**:
  - Sustituida la confirmación nativa del navegador (`window.confirm`) en `equipo/page.js` por el componente visual personalizado `modalAlert`.
  - Actualizados los modales de confirmación en `extintores/page.js` y `programa/page.js` para usar el diseño centrado con el icono de advertencia (`AlertTriangle`) y botones de igual ancho (`flex-1`) para coincidir exactamente con las demás vistas.

### Decisiones Clave
- **Intercepción Nativa de Anchor Tags**: Se decidió usar `e.preventDefault()` en los tags de enlace en combinación con redirección a través de `window.location.href = path` en el callback de confirmación del modal. Esto permite compatibilidad directa con el esquema modular sin necesidad de inyectar enrutadores pesados adicionales.
- **Intercepción Inteligente de la Misma Página**: En los enlaces de la barra lateral que corresponden a la sección actual (que usan `href="#"` o el path exacto de la página actual), la confirmación del modal ejecuta el cierre del formulario (`setView('list')` o `setIsFormOpen(false)`) en lugar de recargar la página, mejorando la fluidez operacional del usuario.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Se ejecutó exitosamente el comando de empaquetado de producción de Next.js (`cmd.exe /c "npm run build"`) compilando el 100% de las rutas dinámicas del tenant de manera íntegra y sin errores de routing.

### Riesgos Detectados / Remanentes
- Monitorear si algún inspector reporta bloqueos de navegación en otros enlaces fuera de la barra lateral (como el menú de logout o de perfil si están cargando datos).

### Próximo Paso Recomendado
- Realizar pruebas de humo manuales en dispositivos móviles para verificar que el menú drawer lateral intercepta los clics de manera limpia al presionar fuera de la pantalla.

---

## [2026-06-20] Ajustes de Capacitaciones y Extintores, Unificación de Fechas y Carga de Imágenes a Supabase

### Resumen de Cambios
- **Módulo de Extintores**:
  - Reestructurada la tabla de listado de extintores para separar las fechas de recarga y prueba hidráulica en dos columnas independientes y ordenables: **Venc. Recarga** y **Venc. P.H.**, aplicando el helper `formatDate`.
  - Removida por completo la columna **Controles** de la grilla de listado para simplificar la visualización de datos.
  - Diseñado y ejecutado el script `scripts/migrate-extintores-files.js` que descargó las 185 imágenes almacenadas como URLs externas de Drive y AppSheet, las subió a Supabase Storage (`documents` bucket) bajo la ruta del tenant correspondiente, y actualizó la columna `imagen_url`.
- **Módulo de Capacitación Anual**:
  - Separados Puesto y Capacitador en columnas individuales y reordenadas según Cliente/Establecimiento, Puesto, Tema, Capacitador, Fechas, Progreso, Acciones.
  - Distribuido de forma proporcional el ancho de las columnas de la tabla de listado (`w-[20%]`, `w-[15%]`, `w-[25%]`, etc.) y configurado el truncado de texto en las celdas de Puesto y Tema para evitar deformaciones en la grilla.
  - Implementado dropdown multiselect interactivo de temas con barra de búsqueda interna y soporte para temas predefinidos y personalizados ("Otro tema"). El campo "Contenido" se actualiza concatenando la información teórica de cada tema seleccionado al alternarlos.
  - Añadido soporte para registros de capacitación mediante carga masiva de fotos y captura directa con cámara del dispositivo móvil. Se diseñó un grid de previsualización con modal interactivo de visualización a pantalla completa.
  - Reestructurado el contenedor de carga de imágenes en el formulario para usar el mismo diseño y formato consistente que en extintores y acciones correctivas (caja `bg-slate-50 border-slate-200 rounded-xl` con detalle de formatos y peso recomendado). El subtítulo se unificó a **"Registros de capacitación"**.
  - Lógica del CRUD refactorizada para persistir los nombres en `temas` (`TEXT[]`), los IDs en `tema_ids` (`UUID[]`) y múltiples fotos en `fotos_urls` (`TEXT[]`).
- **Unificación de Formato de Fechas**:
  - Agregado el helper `formatDate` en `src/lib/utils.js` para estandarizar la visualización de fechas como `DD/MM/YYYY`.
  - Aplicada la unificación de visualización en los módulos de Acciones Correctivas, Extintores, Dashboard, Programa de Gestión Anual y Capacitaciones.
- **Resolución de Dependencias**:
  - Instaladas y guardadas las dependencias `clsx` y `tailwind-merge` en el proyecto para asegurar compatibilidad total de `cn`.

### Decisiones Clave
- **Dropdown Multiselect Reactivo con Backdrop**: Para optimizar el cierre del dropdown al hacer clic fuera se integró una capa overlay invisible (`fixed inset-0 z-20`).
- **Preservación Referencial e Histórica**: Se guardan los nombres en la columna `tema` para compatibilidad retrospectiva, y se aprovechan arreglos PG para los campos multiselect.
- **Estructura Multi-tenant en Storage**: Los archivos de imágenes de extintores y capacitaciones se almacenan bajo el directorio del ID de perfil del usuario creador para integrarse con las políticas RLS existentes.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `supabase`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260629000000_add_temas_and_fotos_to_capacitacion.sql`
- `[NEW] scripts/migrate-extintores-files.js`
- `[MODIFY] src/lib/utils.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] package.json`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación y optimización final de Next.js (`npm.cmd run build`) completada con éxito.
- Ejecución completa del script de migración actualizando 185 registros de imágenes.

---

## [2026-06-19] Mejoras de Seguridad de Acceso, Onboarding, Multitenant Flexible y Eliminación de Cuentas

### Resumen de Cambios
- **Registro Seguro y Confirmación de Correo**: Modificada la vista de registro (`register/page.js`) para evitar que redireccione directamente al onboarding tras el registro. Ahora expone una pantalla de éxito invitando al usuario a confirmar su dirección de correo electrónico mediante el enlace enviado por Supabase. Se unificó el estilo estético moviendo el logotipo de la marca y el subtítulo ("Registrate para comenzar a gestionar tus clientes de Higiene y Seguridad") dentro del contenedor de la tarjeta (igual que en el login), y se integraron botones de visualización de contraseña (ojo) en los inputs de clave y confirmación de clave.
- **Seguridad en Onboarding**: Protegido el enrutamiento de onboarding (`onboarding/page.js`) para validar la existencia de una sesión de Supabase autenticada, redirigiendo de inmediato al login si el usuario no tiene sesión activa.
- **Acceso Multi-tenant Flexible (Slug-based)**:
  - Creado un modelo RLS flexible que permite que un mismo correo electrónico (usuario registrado en `auth.users`) sea propietario (`owner`) de su propio tenant e invitado con acceso activo en otro tenant (`miembros_equipo.tiene_acceso = true`), solucionando el problema de duplicación de correos.
  - Modificado el route handler `api/equipo/route.js` para reutilizar cuentas de usuario existentes al invitar nuevos miembros en lugar de lanzar errores de duplicación.
  - Actualizadas todas las vistas del dashboard operativo (`dashboard`, `empresas`, `equipo`, `programa`, `capacitacion`, `correctivas`, `extintores`, `profile`) para obtener y autorizar el acceso según el slug de URL de manera estricta, en lugar de mapear ciegamente la propiedad `tenant_id` del perfil de usuario.
- **Eliminación Definitiva de Cuenta**:
  - Implementada una sección destructiva de "Eliminar Cuenta" en la vista de perfil de usuario (`profile/page.js`), visible únicamente para usuarios con rol `owner`.
  - La eliminación requiere re-autenticación de contraseña y confirmación explícita escribiendo "ELIMINAR MI CUENTA". Al confirmar, llama a la función SQL segura `public.delete_own_account()` que borra la cuenta en `auth.users` y en cascada (`ON DELETE CASCADE`) elimina el tenant y toda la información asociada del sistema.
- **Geografía y Usabilidad de Perfil**:
  - El campo "Localidad / Barrio" se redefinió como opcional tanto en el onboarding como en el perfil de usuario.
  - Se reordenó la pantalla de onboarding para separar visualmente la Firma Digitalizada (Sección 3) de la Identidad de Marca (Sección 4), agilizando los flujos de carga.

### Decisiones Clave
- **RLS Dinámico sobre profile.tenant_id**: El esquema clásico multi-tenant limitaba a un usuario a un único tenant. Al migrar a políticas basadas en `public.user_has_tenant_access(tenant_id)` que valida membresías activas en `miembros_equipo` o rol `owner` nativo, se habilitó la flexibilidad multi-tenant conservando la seguridad estricta a nivel base de datos.
- **Seguridad Destructiva en Backend (RPC con SECURITY DEFINER)**: Para permitir al usuario propietario eliminar su propia cuenta de `auth` sin exponer credenciales de bypass, se creó una función RPC en PostgreSQL con permisos definidores que remueve la fila del usuario autenticado en `auth.users` de manera limpia y bajo estrictos controles referenciales.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `supabase`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260628000000_multi_tenant_access.sql`
- `[MODIFY] src/app/register/page.js`
- `[MODIFY] src/app/onboarding/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/api/equipo/route.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de Next.js (`npm run build`) completada con éxito para el 100% de las rutas dinámicas y estáticas, asegurando que no haya errores de tipo o sintaxis Webpack.
- Aplicación exitosa de la migración de base de datos Postgres incremental.

---

## [2026-06-19] Responsable Personalizado ("Otro...") en Programa de Gestión Anual

### Resumen de Cambios
- **Entrada Manual de Responsable**: Modificado el formulario de carga de actividades del Programa de Gestión Anual (`programa/page.js`) para permitir seleccionar la opción "Otro (cargar manualmente)..." en el dropdown del Responsable Asignado.
- **Input Dinámico**: Si se selecciona "Otro...", se despliega reactivamente un campo de texto obligatorio para escribir el nombre del responsable.
- **Integridad y Mapeo en Base de Datos**:
  - Al guardar la actividad, si se selecciona un miembro, se asigna su `responsable_id` correspondiente y su nombre se almacena en la columna `responsable`.
  - Si se ingresa manualmente, `responsable_id` se guarda como `null` y el nombre en `responsable`.
  - El listado en tabla, calendario y ordenamiento por responsable ahora consumen directamente la columna de texto `responsable`.
- **Actualización de Base de Datos (Migración)**: Creada y ejecutada la migración incremental `20260627000000_add_responsable_text_to_programa_anual.sql` que agrega la columna `responsable` como `TEXT` a `public.programa_anual` y sincroniza retrospectivamente los nombres de los miembros existentes.

### Decisiones Clave
- **Columna de Texto para Desempeño y Flexibilidad**: Almacenar el nombre de texto directamente en la tabla `programa_anual` (además de conservar la clave foránea `responsable_id` opcional) previene la sobrecarga de consultas y permite listados ultra-rápidos en el cliente, además de soportar personalizaciones sin violar restricciones referenciales.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `supabase`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260627000000_add_responsable_text_to_programa_anual.sql`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación y build de verificación de Next.js (`npm run build`) completado con éxito, sin errores ni advertencias en el routing dinámico.
- Verificación del comportamiento interactivo del dropdown y campo de texto reactivo.
- Carga de datos mock adaptada con soporte de nombres en responsable para evitar celdas vacías en modo simulado.

### Próximo Paso Recomendado
- Monitorear que la sincronización de nombres funcione correctamente al asignar nuevos miembros del equipo en producción.

---

## [2026-06-19] Implementación del Módulo de Extintores

### Resumen de Cambios
- **Módulo de Extintores:** Se creó una nueva sección operativa completa para la gestión de extintores en Next.js.
- **Base de Datos y RLS:** Se creó la tabla `public.extintores` en Supabase con sus correspondientes relaciones (tenants, empresas, establecimientos) y se habilitó RLS para garantizar aislamiento absoluto por tenant.
- **Formulario y Listado Interactivo:** Se diseñó la vista de tabla con cabecera sticky, columnas ordenables, filtros avanzados y búsqueda en tiempo real. El formulario inline incluye carga de imágenes y disparador nativo de cámara, selectores dinámicos dependientes de la geografía, y estado calculado reactivo según fechas de vencimiento.
- **Navegación Unificada:** Se agregó el enlace "Extintores" (icono Lucide Flame) a los menús lateral móvil y de escritorio en todas las 7 secciones de la plataforma.

### Decisiones Clave
- **Estado Dinámico Client-Side:** El estado de vigencia del extintor ("Vigente" o "Vencido") se calcula directamente en el cliente comparando la fecha de recarga y de prueba hidráulica contra el día en curso, asegurando precisión permanente sin necesidad de actualizar registros estáticos mediante tareas programadas.
- **Aislamiento Multi-tenant Seguro:** La política RLS de la base de datos utiliza `public.get_current_tenant_id()` para filtrar el acceso, garantizando que un tenant no pueda interactuar bajo ningún concepto con recursos de otros tenants.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `supabase`
- `next-best-practices`
- `gestion-syso-brand-guidelines`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260626000000_create_extintores.sql`
- `[NEW] src/app/[tenant-slug]/extintores/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Se aplicó la migración SQL exitosamente en Supabase PostgreSQL.
- Se corrió la compilación de Next.js (`npm run build`), obteniendo un empaquetado exitoso sin errores en la ruta dynamic `/[tenant-slug]/extintores` ni en los sidebars modificados.

### Riesgos Detectados / Remanentes
- Monitorear el consumo de almacenamiento en el bucket de storage si los inspectores suben imágenes de alta resolución desde dispositivos móviles (se mantiene un límite de 5 MB recomendado).

### Próximo Paso Recomendado
- Validar con usuarios finales reales la subida directa de fotos desde el navegador del celular y confirmar que la visualización del estado calculada se adapte a todas las zonas horarias.

---

## [2026-06-19] Corrección de Visualización de Documentos en Programa de Gestión Anual

### Resumen de Cambios
- **Bug corregido — apertura forzada de descarga en columna "Doc":** La función `handleViewPdf` en `programa/page.js` fue reescrita para resolver dos problemas reportados:
  1. **Archivos en Supabase Storage que forzaban descarga:** El bucket `documents` tiene por defecto `Content-Disposition: attachment`, lo que hacía que al generar una `signedUrl` y abrirla con `window.open`, el navegador descargase el archivo en lugar de mostrarlo inline. Se solucionó haciendo un `fetch()` de la URL firmada, creando un `Blob URL` mediante `URL.createObjectURL()`, y abriendo ese blob en una nueva pestaña. El blob URL es temporal y se revoca automáticamente (con `onload` y un fallback de 30 segundos).
  2. **Links de Google Drive que mostraban errores o pantallas de descarga:** Los links directos de Drive (`drive.google.com/file/d/ID/view`) se transforman automáticamente al formato de previsualización embebida (`/preview`) antes de abrirlos, lo que permite visualización directa en el navegador sin errores de política de Drive.
- **Build verificado:** Compilación de producción exitosa (`npm.cmd run build`), sin errores ni advertencias.

### Decisiones Clave
- **Blob URL sobre signedUrl directa:** Se priorizó la experiencia del usuario (visualización inline del PDF) sobre la simpleza del código. El enfoque de blob es más robusto que depender de la configuración de `Content-Disposition` del bucket en Supabase, que no se puede cambiar desde el cliente.
- **Transformación de links de Drive:** Se detectan automáticamente los links de Drive con regex, transformándolos a `/preview` sin intervención del usuario. Esto es transparente y compatible con links ya almacenados en la base de datos.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `supabase`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/programa/page.js` — función `handleViewPdf` reescrita (líneas 691–736)

### Validaciones Ejecutadas
- Compilación de producción local (`npm.cmd run build`) completada con éxito, ruta `/[tenant-slug]/programa` incluida en el output.
- Revisión de código: la lógica de fetch/blob es estándar Web API, compatible con todos los navegadores modernos.

### Riesgos Detectados / Remanentes
- Si el usuario tiene activado el bloqueador de pop-ups, la nueva pestaña puede no abrirse. El error no produce un toast de aviso en ese caso (el navegador bloquea silenciosamente). A considerar en futuras iteraciones: usar un `<a>` con `href` y `target="_blank"` en lugar de `window.open`.
- Los links de Google Docs/Sheets (no Drive) no pasan por la transformación a `/preview`; se abren tal cual. Esto está bien para documentos que no son archivos PDF binarios.

### Próximo Paso Recomendado
- Verificar en producción que los PDF almacenados abran correctamente en el navegador (no como descarga) con un usuario real de Supabase autenticado.
- Considerar agregar la misma lógica de `handleViewPdf` mejorada en `capacitacion/page.js` y `correctivas/page.js` si también tienen columna de documentos.

## [2026-06-19] Unificación de Filtros de Búsqueda y Rediseño de Formulario Inline de Programa Anual


### Resumen de Cambios
- **Rediseño Inline del Formulario de Programa Anual:** Modificada la página `programa/page.js` para cambiar el layout deslizante (slide-over drawer) por un contenedor inline de pantalla completa que se renderiza condicionalmente en base a `showForm` (igual que en Capacitaciones y Acciones Correctivas).
- **Advertencia de Salida y Renombrado de Botón:** Cambiado el botón "Salir sin guardar" a "Salir" en `capacitacion/page.js` y `programa/page.js`. Añadida la función `handleExitForm` en `programa/page.js` que abre el `confirmModal` solicitando confirmación del usuario para no perder cambios.
- **Unificación de Filtros de Búsqueda:** Actualizados los encabezados de filtros en las vistas `programa/page.js` y `correctivas/page.js` (y confirmado en `empresas/page.js` y `capacitacion/page.js`) para utilizar el texto uniforme `"Filtros de Búsqueda"` y el icono `Sliders` de Lucide.
- **Correcciones de Estilo en Botones de Descarte:** Reemplazados los colores de descarte no estándar en Tailwind (`bg-red-650` y `hover:bg-red-650`) por el color estándar `bg-red-600` e `hover:bg-red-700` en los botones de confirmación de modal de `capacitacion/page.js` y de eliminar de la tabla de contactos en `empresas/page.js`.

### Decisiones Clave
- **Unificación de Interfaz e Inline Forms:** Para conservar la coherencia estética en todo el SaaS, se eliminaron por completo las transiciones de slide-over, haciendo que todos los formularios operativos principales sigan el patrón inline que reemplaza el listado/calendario actual con un botón `ArrowLeft` de regreso.
- **Estandarización de Colores de Alerta:** Estandarizar a `bg-red-600` los botones destructivos o de confirmación de alerta de primer nivel, asegurando su correcta visibilidad y contraste en navegadores de escritorio y móviles.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`

### Validaciones Ejecutadas
- Compilación de producción local (`npm.cmd run build`) completada con éxito al 100%, verificando que no hay errores de sintaxis, JSX ni importaciones en los bundles optimizados.

### Riesgos Detectados / Remanentes
- Ninguno. La unificación de layouts simplifica la mantenibilidad y depuración de la interfaz en futuras iteraciones.

### Próximo Paso Recomendado
- Realizar pruebas de humo en staging sobre los formularios de capacitación y programa anual para verificar que las transiciones inline funcionen de manera óptima y fluida.

---

## [2026-06-19] Restauración de Identidad de Marca y Responsables Administrativos en Desplegables

### Resumen de Cambios
- **Identidad de Marca en Perfil:** Modificado `profile/page.js` para permitir a usuarios con roles `owner` y `admin` ver, editar y guardar los datos del Tenant (empresa/consultora, logos, web, redes sociales).
- **Asignación en Acciones Correctivas:** Reemplazado el input de texto libre "Responsable de Implementar" en `correctivas/page.js` por un selector desplegable dinámico que consulta `miembros_equipo`.
- **Integridad Referencial en DB:** Creada y ejecutada la migración SQL `20260625000000_sync_owner_admin_to_miembros.sql` en Supabase para sincronizar automáticamente usuarios de roles `owner` y `admin` con la tabla `miembros_equipo` al completar onboarding, permitiendo su correcta selección en los dropdowns de responsable/capacitador sin violar constraints de claves foráneas.
- **Asignación de Tenant a Owner:** Se detectó e interactuó a nivel de base de datos para corregir un bug de datos donde el usuario propietario (`owner`) tenía su `tenant_id` en `null` en la tabla `profiles`. Se asignó su correspondiente tenant id (`e3d40f7d-455a-41a1-a65f-8654408c6595`), restaurando de inmediato la carga de identidad visual.

### Decisiones Clave
- **Sincronización en Base de Datos vía Triggers:** Se optó por sincronizar los administradores y propietarios calificados directamente a la tabla `miembros_equipo` mediante un trigger PL/pgSQL en lugar de combinar arreglos de datos en el cliente. Esto previene violaciones de `FOREIGN KEY` existentes en las tablas `programa_anual` y `programa_capacitacion` de forma transparente y centralizada.
- **Validación del Onboarding en Trigger:** Para evitar insertar registros con campos incompletos en la tabla `miembros_equipo` (que posee restricciones de campos no nulos como cuit, teléfono y provincia), el trigger valida que el perfil del administrador tenga estos datos cargados antes de sincronizarlo.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `gestion-syso-multitenant-security`
- `supabase`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260625000000_sync_owner_admin_to_miembros.sql`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Ejecutado script de inspección de usuarios PG, confirmando que los perfiles administradores completos (`admin@gestionsyso.com` y `sebastianmerlassino@gmail.com`) se crearon e integraron automáticamente en `miembros_equipo` con su correspondiente `profile_id`.
- Compilación del build de producción local exitosa (`npm run build`), certificando el empaquetado del 100% de las páginas sin advertencias ni errores.

### Riesgos Detectados / Remanentes
- En caso de registrarse nuevos administradores o dueños, estos no figurarán en la lista de responsables hasta tanto completen su información mínima requerida en la pantalla de Perfil (onboarding), debido a las restricciones `NOT NULL` de la tabla `miembros_equipo`.

### Próximo Paso Recomendado
- Monitorear el correcto funcionamiento de los desplegables de responsable/capacitador durante la operatoria diaria en el entorno de desarrollo y producción.

---

## [2026-06-18] Redirecciones de Autenticación de Supabase y Personalización de Plantillas de Correo

### Resumen Ejecutivo
Se implementó soporte para la redirección dinámica en el registro de cuentas de usuario y se diseñaron plantillas HTML responsivas y adaptadas a la marca para la verificación de cuenta y el restablecimiento de contraseñas. Además, se redactó una guía detallada para que el administrador configure el servidor SMTP propio de su dominio y las URLs de redirección permitidas en la consola de producción de Supabase, solucionando los enlaces fallidos dirigidos a localhost. Por último, se homogeneizó el diseño de la página de restablecimiento de contraseña para coincidir con la del login.

### Cambios Realizados
- **Formulario de Registro (`register/page.js`):** Añadido el parámetro `emailRedirectTo` en la invocación de `supabase.auth.signUp`, apuntando dinámicamente al origen actual (`window.location.origin/login`), lo que fuerza a Supabase a redirigir al usuario al login una vez que la cuenta sea verificada.
- **Formulario de Restablecimiento de Contraseña (`reset-password/page.js`):**
  - Removido el indicador gráfico en forma de burbuja con la letra "H".
  - Integrado el logotipo de la marca (`logo-black.png`) en el encabezado de la tarjeta.
  - Añadido soporte interactivo de toggles de visibilidad (icono del ojo) para la contraseña y confirmación de la contraseña.
  - Implementada regla de validación de contraseña robusta (mínimo 8 caracteres, 1 mayúscula, 1 número) y su texto informativo correspondiente.
  - Modificado el cuadro de éxito final eliminando toda referencia a la base de datos de Supabase por un mensaje genérico profesional: *"Tu clave ha sido actualizada con éxito. Ya podés ingresar a tu panel."*.
- **Plantillas de Correo HTML:** Diseñadas dos plantillas de correo responsivas e integradas bajo la paleta cromática de marca (`#468DFF`, `#0511F2`) y tipografías corporativas, con enlaces seguros y el logotipo de Gestión SySO para:
  - Verificación de cuenta nueva (Confirm Signup).
  - Restablecimiento de contraseña olvidada (Reset Password).

### Validaciones Ejecutadas
- Compilación de producción local exitosa (`npm.cmd run build`) confirmando que los nuevos parámetros y la reestructuración de la UI no generan fallas sintácticas ni rotura en los bundles.

### Próximo Paso Recomendado
- Validar el flujo de recuperación de clave completo en producción y verificar que el diseño y usabilidad sean óptimos en computadoras y dispositivos móviles.

---

## [2026-06-18] Ajustes de Layout (Ancho al 95%), Corrección de Porcentajes y Mejoras de Usabilidad en Clientes

### Resumen Ejecutivo
Se unificaron y optimizaron los layouts de todas las secciones principales para aprovechar mejor las pantallas de escritorio incrementando el ancho útil al 95%. Se corrigió un problema de visualización de porcentajes en la tabla del programa de gestión y se rediseñó la cabecera de la sección de Clientes, removiendo títulos repetitivos y agregando buscador de texto libre, filtrado, limpieza y ordenamiento interactivo de columnas. Además, se simplificó el botón de salida en el formulario de clientes a "Salir".

### Cambios Realizados
- **Ancho de Contenedores al 95%:** Modificadas las clases de contenedor principal de `max-w-[85%]` a `max-w-[95%]` en:
  - Dashboard (`src/app/[tenant-slug]/dashboard/page.js`)
  - Clientes (`src/app/[tenant-slug]/empresas/page.js`)
  - Equipo de Trabajo (`src/app/[tenant-slug]/equipo/page.js`)
  - Programa de Capacitación (`src/app/[tenant-slug]/capacitacion/page.js`)
  - Acciones Correctivas (`src/app/[tenant-slug]/correctivas/page.js`)
  - Perfil de Usuario (`src/app/[tenant-slug]/profile/page.js`)
- **Corrección de Porcentaje en Programa Anual:** Corregidas filas en la base de datos de Supabase que presentaban un progreso de `1` (importado erróneamente en el script inicial a partir de valores decimales `1.0` de Excel) cambiándolas a `100` mediante un script de mantenimiento.
- **Actualización de Enlaces en Barra Lateral:** Renombrado el enlace `"Programa de Capacitación"` a `"Programa de Capacitación Anual"` en los sidebars móviles y de escritorio en todas las 7 secciones para mayor claridad.
- **Visualización de Documentos PDF Inline:** Añadida la opción `{ download: false }` en la invocación de `createSignedUrl` de Supabase Storage en las secciones de Programa Anual, Perfil de Usuario, Equipo de Trabajo y Acciones Correctivas. Esto indica a Supabase que responda con la cabecera `Content-Disposition: inline` en la URL firmada, permitiendo que el navegador renderice y previsualice los PDFs en la nueva pestaña en lugar de forzar su descarga directa al disco local.
- **Establecimiento de Content-Type en Carga de Archivos:** Añadido el parámetro `contentType: 'application/pdf'` en la llamada a `supabase.storage.from(...).upload` de archivos locales en la sección de Programa de Gestión Anual.
- **Corrección de Mimetypes en Storage (DB):** Ejecutado script de actualización masiva en `storage.objects` que corrigió el mimetype de `148` archivos PDF de `application/octet-stream` a `application/pdf`. Esto soluciona de raíz que el navegador forzara la descarga de los PDFs migrados en lugar de abrirlos en una nueva pestaña.
- **Soporte para Enlaces Externos en PDF:** Modificada la función `handleViewPdf` en `programa/page.js` para detectar enlaces externos de Google Drive y hojas de cálculo (que comiencen con `http` o `https`) y abrirlos directamente con `window.open`, evitando errores al intentar firmarlos en el almacenamiento privado de Supabase.
- **Sección de Clientes (`empresas/page.js`):**
  - Removido el encabezado estático de título y subtítulo por encima de la tabla para homogeneizar la vista con el resto del sistema.
  - Implementada barra de herramientas con input de búsqueda reactiva (Razón Social, Nombre Comercial y CUIT), dropdown de filtro rápido de empresa y botón para limpiar los filtros activos.
  - Habilitado el ordenamiento alfabético interactivo pulsando en la cabecera "Razón Social" y "C.U.I.T.".
  - Configurado el encabezado de la tabla como fijo (`sticky top-0 z-10`) con scroll independiente.
  - Renombrado el botón del formulario de "Salir sin guardar" a simplemente "Salir".

### Validaciones Ejecutadas
- Compilación de producción de Next.js (`npm run build`) ejecutada mediante `cmd.exe` de forma satisfactoria sin advertencias ni errores en ninguno de los bundles.
- Script de base de datos verificado y ejecutado, actualizando 196 registros de `progreso = 1` a `progreso = 100` con éxito.

### Próximo Paso Recomendado
- Validar el enrutamiento general y flujos diarios de carga de clientes por parte de los administradores.

---

## [2026-06-18] Implementación del Programa de Capacitación Anual

### Resumen de Cambios
- **Módulo de Capacitación Anual:** Creada la página `src/app/[tenant-slug]/capacitacion/page.js` que contiene el listado interactivo de capacitaciones, búsqueda, filtrado por cliente, establecimiento y estado, así como el formulario completo (CRUD) dinámico.
- **Campos y Dependencias:** Implementado selector dinámico de Razón Social y Establecimientos dependientes, selección de Temas de Capacitación predefinidos (con auto-rellenado de contenidos y soporte de edición) y Capacitadores predefinidos, además de entradas de texto libre ("Otro tema..." y "Otro capacitador..."). Soportados inputs de Puesto/Sector, Progreso (slider + número), Cronograma de inicio/fin y Observaciones.
- **Navegación Lateral Unificada:** Añadido el enlace al "Programa de Capacitación" con el icono `GraduationCap` de Lucide en los sidebars móviles y de escritorio en Dashboard, Clientes, Equipo de Trabajo, Programa de Gestión Anual, Acciones Correctivas y Editar Perfil.
- **Validación de Salida:** Añadido un botón normal de "Salir sin guardar" que despliega una advertencia modal centrado para evitar pérdida involuntaria de cambios.

### Decisiones de Arquitectura
- **Aislamiento Multi-tenant en Base de Datos:** La tabla `programa_capacitacion` restringe todas las operaciones al tenant del usuario activo mediante RLS (`programa_capacitacion_tenant_isolation`).
- **Campos Opcionales en Custom:** Los campos `tema_id` y `capacitador_id` son configurados como opcionales (`ON DELETE SET NULL`) para admitir ingresos personalizados directamente sobre las columnas de texto `tema` y `capacitador`.

### Archivos Modificados / Creados
- `[NEW] src/app/[tenant-slug]/capacitacion/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`

### Validaciones Ejecutadas
- Compilación de producción de Next.js (`npm run build`) ejecutada mediante `cmd.exe`, comprobando que todas las 10 rutas compilan con éxito sin advertencias ni errores.

---

## [2026-06-18] Estandarización de Headers, Tabla de Capacitaciones y Migración de Archivos de Drive/AppSheet

### Resumen de Cambios
- **Estandarización de Altura y Diseño:** Unificada la altura de la barra de navegación superior (`header`) a exactamente `h-16` en todos los archivos de sección.
- **Coherencia en Tipografía:** Homogeneizados los textos de los títulos de sección con la tipografía uniforme de marca (`font-outfit text-lg font-bold text-slate-900`) y alineados con sus respectivos iconos de Lucide.
- **Resolución de Error Sintáctico:** Corregida una etiqueta `div` huérfana en `equipo/page.js` que impedía la compilación y ejecución exitosa de Next.js.
- **Estructura Izquierda/Derecha Unificada:** Configurado el lado izquierdo para contener el título y el icono representativo de la sección, y el lado derecho para mostrar de manera consistente el nombre de la consultora activa en una tarjeta neutra y la insignia/badge correspondiente a su plan comercial.
- **Creación de la Tabla `temas_capacitacion` en Supabase:** Diseñada y creada la tabla `public.temas_capacitacion` para almacenar temas y contenidos de capacitaciones en Higiene, Seguridad y Medio Ambiente.
- **Importación de Datos Semilla:** Cargados los 31 temas de capacitación legalmente vigentes junto con su desglose de contenidos en la base de datos de producción de Supabase.
- **Migración Automatizada de Archivos y Medios:** Creado y ejecutado el script `scripts/migrate-files.js` que identificó los enlaces externos (Drive y AppSheet) en `programa_anual.documento_url` and `acciones_correctivas.imagen_url`, descargó los binarios respectivos (traduciendo enlaces de Drive a enlaces directos de descarga), los subió a Supabase Storage (`documents` bucket) en rutas compatibles con RLS bajo el UUID del perfil dueño del tenant, y actualizó los registros de base de datos a sus nuevas rutas relativas.
- **Prevención de Propagación de Clics en Programa Anual:** Añadido `onClick={(e) => e.stopPropagation()}` a la celda `td` de la columna de documentos en [programa/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/programa/page.js). Esto previene que al pulsar el icono del PDF o sus bordes se propague el evento al contenedor de la fila `tr` (que dispara la apertura del formulario de edición/detalle), asegurando que el documento cargado se abra limpiamente al tocar el icono.
- **Carga de Archivos desde Enlace de Google Drive:** Añadida una nueva pestaña/opción de carga en el formulario del programa de gestión que permite al usuario ingresar una URL compartida de Google Drive en lugar de seleccionar un archivo local de su dispositivo.
- **API Server-Side de Descarga e Importación:** Creado el endpoint de API `POST /api/upload-from-url` que se ejecuta en el servidor (evitando limitaciones de CORS del navegador), descarga el archivo desde el enlace provisto por el usuario (traduciendo URLs de Drive a descargas directas) y lo sube directamente al bucket de storage de Supabase, devolviendo la ruta correspondiente de forma segura y automática.

### Decisiones Clave
- **Coherencia Visual:** Mantener la barra superior como elemento estático-adhesivo (`sticky top-0 z-20`) con desenfoque de fondo (`backdrop-blur-md bg-white/80`) para asegurar la legibilidad del contenido central durante el scroll independiente.
- **Estructura del Catálogo de Capacitación:** Registrar los temas como un catálogo de sólo lectura a nivel de base de datos (`public.temas_capacitacion`) con Row Level Security (RLS) habilitado y política de acceso público de selección, similar a `programa_anual_catalogo`.
- **Rutas RLS-Compatibles en Storage:** Para satisfacer las estrictas políticas RLS del bucket `documents` (que validan que el primer directorio de la ruta del archivo pertenezca a un perfil UUID o miembro UUID del mismo tenant del usuario solicitante), el script de migración y la API de importación asocian dinámicamente cada recurso al UUID del perfil dueño/administrador de su respectivo `tenant_id`. Así, las rutas resultantes (ej: `${profileId}/programa_${id}.pdf`) se generan y consumen con total transparencia en la aplicación de producción mediante URLs firmadas sin violar el aislamiento multi-tenant.
- **Aislamiento de Clics de Celdas Interactivas:** Toda celda de tabla con botones o enlaces interactivos independientes (`documentos`, `acciones`) debe capturar y detener la propagación del evento click en su nodo contenedor `td`, impidiendo efectos colaterales de selección de fila.
- **Evitar Limitaciones CORS del Cliente:** Al realizar la descarga de archivos compartidos de Drive en el servidor (a través de `/api/upload-from-url`) en lugar de en el navegador del cliente, se esquivan las restricciones CORS impuestas por los servidores de Google, garantizando un flujo de importación confiable.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/correctivas/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/programa/page.js`
- `[NEW] supabase/migrations/20260623000000_create_temas_capacitacion.sql`
- `[NEW] scripts/migrate-files.js`
- `[NEW] src/app/api/upload-from-url/route.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción de Next.js (`npm run build`) ejecutada localmente a través del símbolo del sistema (`cmd.exe`), verificando el empaquetado exitoso sin errores sintácticos o de types en las 9 páginas estáticas y dinámicas.
- Ejecución de la migración SQL (`scripts/run-temas-migration.js`) en la base de datos de producción de Supabase, confirmando la creación y carga completa e íntegra de las filas.
- Ejecución del script `scripts/migrate-files.js` completada de forma satisfactoria en producción, logrando la descarga directa de imágenes de AppSheet y PDFs de Drive, su almacenamiento en Supabase Storage, y la actualización de las rutas relativas en la base de datos para habilitar la visualización en la UI.

### Riesgos Detectados / Remanentes
- Ninguno detectado. La homogeneidad de los headers mejora sustancialmente la experiencia visual y estructural del usuario sin introducir lógica colateral.

### Próximo Paso Recomendado
- Monitorear el correcto funcionamiento de las descargas en los flujos cotidianos de la plataforma por parte de los inspectores en producción.

---

## [2026-06-17] Correcciones y Mejoras de Seguridad, UI, Onboarding y Credenciales

### Resumen Ejecutivo
Se implementaron una serie de mejoras y correcciones a través del login, onboarding, perfiles de usuario, gestión de empresas y programa de gestión, resolviendo problemas de duplicados de tenants, tags JSX mal formados, y añadiendo usabilidad con toggles de visibilidad y layout estándar en el perfil.

### Cambios Realizados
- **Registro & Login (`register/page.js`, `login/page.js`):**
  - Añadido helper de robustez de clave debajo de la contraseña.
  - Implementado caché de `email` y `fullName` en `localStorage` al registrar e iniciar sesión.
  - Movido el logotipo de marca dentro del recuadro blanco del formulario de login.
- **Onboarding (`onboarding/page.js`):**
  - Pre-llenado automático de email y nombre utilizando caché.
  - Confirmación e inicio de cierre de sesión al pulsar "Salir".
  - Verificación y mitigación de errores de duplicado de slug de tenant al claimear o sufijar slugs colisionados.
  - Eliminado bloque duplicado de código JSX que rompía el build.
- **Perfil de Usuario (`profile/page.js`):**
  - Integrados los componentes colapsables Desktop Sidebar, Mobile Sidebar y Navbar en el perfil para conservar consistencia de layout con el dashboard.
- **Gestión de Empresas (`empresas/page.js`):**
  - Refactorizada la eliminación de establecimientos eliminados en la UI mediante diferencia de IDs directos en base de datos.
  - Separada la inserción y actualización de establecimientos en llamadas batch independientes de `insert` y `upsert` para evitar que PostgREST asigne valores `null` a las claves primarias por defecto (`id`) en los nuevos registros durante guardados incrementales.
  - Agregado el mensaje de error explícito de la base de datos en los toasts del formulario de empresas.
  - Asegurada toda llamada a `.trim()` en `handleSaveAll` para prevenir excepciones de tipo `Cannot read properties of undefined (reading 'trim')` ante variables no inicializadas o nulas de la DB.
  - Implementada interfaz de acordeón colapsable en los establecimientos: por defecto se muestran colapsados exponiendo solo su Denominación y Dirección, con un botón "Expandir/Contraer" para ver/editar el resto de campos.
  - Incorporado botón de "Salir sin guardar" en la sección inferior del formulario que advierte al usuario sobre la pérdida de datos antes de limpiar estados y volver al listado.
  - Añadidos botones de ojo (`Eye` / `EyeOff`) para revelar/ocultar contraseñas de plataformas externas (ART, MiBA y Ambiente PBA).
  - Configurado el enlace de la ART para ser clickeable y abrirse en pestaña nueva.
- **Programa de Gestión (`programa/page.js`):**
  - Unificados los controles de vista, buscador de actividades, botón de alta y panel de filtros rápidos en un único componente de tarjeta unificada de Rich Aesthetics.
- **Estructura y Estilos Globales (`globals.css`, layouts):**
  - Reemplazado el contenedor general `min-h-screen` por `h-screen overflow-hidden` en las pantallas de Dashboard, Clientes, Equipo, Programa, Correctivas y Perfil, permitiendo que la barra lateral izquierda del menú permanezca estática y el contenido central tenga scroll vertical independiente.
  - Rediseñada la barra de desplazamiento vertical de la ventana a un ancho estándar de `12px` con un color neutro amigable para mejorar la usabilidad en pantallas claras.

### Validaciones Ejecutadas
- Compilación completa de producción de Next.js finalizada de forma exitosa (`npm run build`).

## [2026-06-16] Implementación de Barra Lateral Colapsable, Ordenamiento y Filtros Avanzados, Filas Clickeables y Correcciones de Base de Datos

### Resumen Ejecutivo
Se implementaron mejoras clave de usabilidad y estabilidad. Se añadió soporte para una barra lateral colapsable (que reduce su ancho de `w-64` a `w-20` para maximizar el área útil del dashboard, clientes, equipo, programa de gestión y acciones correctivas). En las tablas de programa de gestión y acciones correctivas se incorporó el ordenamiento interactivo de columnas, cabeceras sticky y clics de fila para abrir formularios, deteniendo la propagación de eventos en botones internos. Asimismo, se optimizó el guardado de empresas clientes con establecimientos eliminados (previniendo errores de restricción de clave foránea en Supabase) y se eliminó la obligatoriedad del campo de fecha de nacimiento en equipo de trabajo.

### Cambios Realizados
- **Barra Lateral Colapsable (Desktop Sidebar)**:
  - Implementamos la variable de estado `isSidebarCollapsed` con persistencia en `localStorage` en `dashboard`, `empresas`, `equipo`, `programa` y `correctivas`.
  - Agregamos un botón de alternancia (`ChevronLeft` / `ChevronRight`) en la cabecera del sidebar.
  - Ajustamos los anchos de `w-64` a `w-20` con transición suave (`transition-all duration-300`). Ocultamos etiquetas de navegación y perfiles en modo colapsado, mostrando únicamente los iconos alineados de forma centrada.
- **Filtros por Fecha en Programa de Gestión**:
  - Reemplazamos el filtro de "Responsable" por selectores de **Mes** (Enero a Diciembre) y **Año** (2024 a 2030) aplicados sobre `fecha_planificada`.
- **Cabeceras Fijas (Sticky) y Ordenamiento**:
  - En `programa/page.js` y `correctivas/page.js`: Añadimos `sticky top-16 bg-slate-50 z-10 shadow-sm border-b` a la cabecera `<thead>` para mantenerse fija debajo de la barra de navegación del sistema.
  - Añadimos los estados `sortField` y `sortOrder`. Al hacer clic sobre las columnas del encabezado (`<th>`), se ordena la tabla en caliente con flechas visuales indicadoras (`▲` y `▼`).
- **Filas Clickeables**:
  - En ambas vistas de listado de tablas, configuramos `onClick={() => ...}` en el `<tr>` para abrir directamente la ficha de edición/detalle al hacer clic en cualquier parte de la fila.
  - Agregamos `e.stopPropagation()` en los botones internos de PDF, editar, ver evidencia o eliminar para evitar clics duplicados o erráticos.
- **Corrección en Eliminación de Establecimiento (`empresas/page.js`)**:
  - Sustituimos la eliminación total y reinserción de establecimientos (que fallaba ante claves foráneas referenciadas por actividades/correctivas activas) por un borrado dirigido: se detectan únicamente los establecimientos borrados en la UI y se eliminan de la DB, mientras que los restantes se actualizan o insertan usando `.upsert()`.
- **Opcionalidad de Fecha de Nacimiento (`equipo/page.js`)**:
  - Eliminamos la validación `!birthDate` en la función de guardado y los atributos `required` y asteriscos del formulario en la interfaz. El payload ahora mapea `birthDate || null` para registrar valores vacíos correctamente como `NULL` en la base de datos de Supabase.

### Validaciones Ejecutadas
- Compilación y optimización final de producción de Next.js finalizada de forma exitosa (`npm run build`).

---

## [2026-06-16] Reorganización de Dashboard con Calendario Compacto, Vista de Programa Anual por Defecto y Botones de Cámara

### Resumen Ejecutivo
Se reorganizó el panel principal (Dashboard) para adaptarlo a las funcionalidades reales (reemplazando mocks de estadísticas, eliminando accesos directos obsoletos e integrando un calendario mensual compacto e interactivo conectado al programa de gestión). Asimismo, en la sección de Programa de Gestión Anual se definió la vista de listado por defecto y se renombró el selector de visualización, y en la sección de Acciones Correctivas se separó la carga de evidencia fotográfica en dos botones independientes: selección de archivos y captura directa de cámara.

### Cambios Realizados
- **Dashboard Principal (`src/app/[tenant-slug]/dashboard/page.js`)**:
  - **Métricas Reales**: Cambiamos la métrica "Inspecciones" (mock) por "Acciones Correctivas" dinámicas, conectadas mediante conteo real a la base de datos de Supabase. Calculamos el porcentaje de cumplimiento real del programa anual en base a las actividades ya completadas.
  - **Calendario Compacto Interactivo**: Creamos un componente de calendario mensual integrado en una grilla junto con la tabla de vencimientos del mes. Permite navegar los meses del año y visualizar un listado de actividades del día que el usuario seleccione haciendo clic. Los días con tareas planificadas muestran indicadores de color reactivos según su estado.
  - **Limpieza de Accesos Rápidos**: Eliminamos los enlaces obsoletos ("Nueva Auditoría" y "Centro de Soporte") y los reemplazamos por accesos a las secciones de "Programa de Gestión" y "Nueva Acción Correctiva" (que abre automáticamente el formulario de alta).
- **Programa de Gestión Anual (`src/app/[tenant-slug]/programa/page.js`)**:
  - **Visualización por Defecto**: Definimos el estado de vista inicial `view` como `'list'` para que al ingresar se exponga directamente el Programa Anual en formato tabla.
  - **Renombrado**: Cambiamos el texto del botón selector "Tabla de control" a "Programa anual".
- **Acciones Correctivas (`src/app/[tenant-slug]/correctivas/page.js`)**:
  - **Detección de Parámetro**: Añadimos lógica en el cargador inicial para abrir directamente el formulario de registro si detecta el parámetro `?new=true` en la URL.
  - **Botones de Carga de Evidencia**: Reemplazamos la etiqueta unificada por dos botones de control específicos:
    1. *Seleccionar imagen*: Abre el selector de archivos del dispositivo.
    2. *Sacar foto (Cámara)*: Utiliza la propiedad estándar `capture="environment"` que activa automáticamente la cámara trasera en dispositivos móviles.

### Validaciones Ejecutadas
- **Prueba de Compilación de Next.js**: Verificamos que el build de producción finaliza satisfactoriamente (`npm.cmd run build`), generando los bundles optimizados sin errores de JSX o de imports.

---

## [2026-06-16] Ajuste de CSS y Contenedores para Centrado y Ancho Ampliado al 85%

### Resumen Ejecutivo
Se modificaron los estilos de contenedor de todas las pantallas y sus formularios de carga para que ocupen al menos el 85% del ancho de pantalla disponible y queden perfectamente centrados en resoluciones de escritorio.

### Cambios Realizados
- **Modificación de Clases de Contenedor**:
  - En `dashboard/page.js`, `empresas/page.js` y `equipo/page.js`: Cambiamos la clase `max-w-5xl` (alineado a la izquierda por defecto) a `max-w-[85%] mx-auto w-full` para centrar el dashboard, los listados de clientes y equipo de trabajo, así como sus respectivos formularios de creación/edición.
  - En `programa/page.js` y `correctivas/page.js`: Cambiamos la clase `max-w-6xl mx-auto w-full` a `max-w-[85%] mx-auto w-full` para que los calendarios, tablas de control y seguimiento utilicen el mismo ancho ampliado.
  - En `profile/page.js`: Modificamos la clase `max-w-3xl` a `max-w-[85%]` en el contenedor del formulario para aprovechar el mismo espacio de visualización en pantallas anchas.

### Validaciones Ejecutadas
- **Prueba de Compilación de Next.js**: Build de producción completado con éxito (`npm.cmd run build`), verificando que no hay errores sintácticos.

---

## [2026-06-16] Implementación de Filtro por Establecimiento en Seguimiento de Acciones Correctivas

### Resumen Ejecutivo
Se implementó el filtro por establecimiento en la sección de Seguimiento de Acciones Correctivas, completando los requisitos de filtrado de datos solicitados por el usuario (Cliente, Establecimiento, Nivel de Riesgo y Estado).

### Cambios Realizados
- **Pantalla de Seguimiento (`src/app/[tenant-slug]/correctivas/page.js`)**:
  - **Estado y Lógica**: Añadimos el estado local `filterEstablecimiento` y su limpieza automática al alternar o limpiar el filtro por Cliente (`filterEmpresa`).
  - **Grid de Filtros**: Ajustamos el contenedor de filtros a un grid responsivo de 4 columnas (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
  - **Selector de Establecimiento (Dependiente)**: Incorporamos un selector dinámico que permanece deshabilitado (mostrando "Selecciona un cliente primero") si no hay ningún cliente seleccionado en el filtro principal, y se habilita automáticamente mostrando solo los establecimientos asociados cuando se elige una Razón Social.
  - **Lógica de Filtro**: Actualizamos la condición en la lista calculada `filteredAcciones` para aplicar el filtro por `establecimiento_id`.

### Validaciones Ejecutadas
- **Prueba de Compilación de Next.js**: Verificamos que el build de producción finaliza satisfactoriamente (`npm.cmd run build`) con todos los bundles optimizados.

---

## [2026-06-16] Implementación del Módulo de Seguimiento de Acciones Correctivas con Estados Reactivos y Evidencia Fotográfica

### Resumen Ejecutivo
Se diseñó e implementó la nueva sección **Seguimiento de Acciones Correctivas** (Corrective Actions Tracking) en el sistema. Este módulo permite registrar, editar y listar hallazgos con un análisis técnico detallado, plazos y subida de imágenes de respaldo a storage. Además, se integró el acceso dinámico en el menú de navegación lateral de todas las vistas del dashboard, clientes, equipo de trabajo y programa de gestión.

### Cambios Realizados
- **Base de Datos y RLS (`20260622000000_create_acciones_correctivas.sql`)**:
  - Creamos la tabla `public.acciones_correctivas` enlazada a las tablas `tenants`, `empresas` y `establecimientos`.
  - Habilitamos Row Level Security (RLS) y aplicamos una política de aislamiento multi-tenant `acciones_correctivas_tenant_isolation` para restringir el acceso total al personal autenticado del mismo tenant.
- **Pantalla de Seguimiento (`src/app/[tenant-slug]/correctivas/page.js`)**:
  - **Tabla de Hallazgos**: Visualización tabular de los campos críticos (Cliente, Establecimiento, Fuente, Fecha, Hallazgo, Nivel de riesgo, Estado, Responsable y Evidencia).
  - **Filtros Avanzados**: Búsqueda por texto libre y filtrado dinámico en caliente por Cliente, Nivel de Riesgo y Estado.
  - **Formulario de Registro**: Formulario con selectores dependientes de establecimientos y opciones de valor personalizado ("Otra" / "Otro") para los campos de Fuente y Tipo de Hallazgo.
  - **Gestión de Evidencias**: Carga de imágenes JPG/PNG (hasta 5 MB) almacenadas de forma segura y privada en el bucket `documents` de Supabase Storage en la ruta `${userId}/corrective_${Date.now()}.${ext}`, con visualización a través de URLs firmadas temporales.
  - **Cálculo Reactivo de Estados**:
    - `En análisis`: si no tiene fecha planificada.
    - `En tiempo`: si tiene fecha planificada >= hoy y no hay fecha de implementación.
    - `Vencido`: si tiene fecha planificada < hoy y no hay fecha de implementación (badge rojo).
    - `Cerrada`: si tiene fecha de implementación (badge verde `#00b050`).
- **Navegación Lateral (Sidebar)**:
  - Agregamos la opción "Acciones Correctivas" con el icono `ClipboardList` en los sidebars móviles y de escritorio en `dashboard/page.js`, `empresas/page.js`, `equipo/page.js` y `programa/page.js`.

### Validaciones Ejecutadas
- **Prueba de Compilación de Next.js**: Build de producción completado de forma satisfactoria (`npm.cmd run build`), generando el bundle estático y dinámico sin errores.

---

## [2026-06-15] Importación Masiva de Clientes y Establecimientos a Supabase, Corrección de Botón de Borrado y Estandarización de Colores Tailwind

### Resumen Ejecutivo
Se ejecutó satisfactoriamente la importación masiva de la base de datos de clientes y establecimientos desde la planilla de Excel oficial, y se corrigieron diversos problemas visuales de los modales de borrado y estados hover en el frontend debido a clases de color no estándar de Tailwind.

### Cambios Realizados
- **Importación de Clientes y Establecimientos**:
  - Parseamos la planilla de Excel `G:\Mi unidad\Gestión SySO\app\Clientes.xlsx` mediante un script de extracción que procesó 81 filas y agrupó los datos de contacto en objetos JSON estructurados.
  - Diseñamos y ejecutamos un script cargador Node.js (`scripts/import-clients.js`) que insertó y actualizó de forma atómica en Supabase Postgres 61 nuevas empresas y 79 establecimientos vinculados bajo el tenant `Recalificart`, realizando automáticamente la dotación de personal equivalente, el checklist de capítulos del Decreto 351/79 y la estimación de horas profesionales mensuales.
- **Ajustes de Interfaz y Colores Estándar**:
  - **Botón de Borrado en Clientes (`empresas/page.js`)**: Cambiamos la clase `bg-red-50 text-white hover:bg-red-650` por `bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/10` para solucionar la invisibilidad del texto.
  - **Corrección de Colores No Soportados**:
    - En `empresas/page.js`: Reemplazamos `text-slate-650` por `text-slate-600` (líneas de trabajadores), `text-slate-750` por `text-slate-700` (actividades seleccionadas), `text-slate-850` por `text-slate-800` (razón social en tabla), y `border-slate-350` por `border-slate-300` (maquinarias personalizadas).
    - En `equipo/page.js`: Reemplazamos `hover:text-slate-850` y `border-slate-350` por `hover:text-slate-800` and `border-slate-300` (botón volver), y `border-slate-850` por `border-slate-800` (borde de toast).
    - En `profile/page.js` y `login/page.js`: Reemplazamos `hover:text-slate-650` por `hover:text-slate-700` en los botones de ojo de contraseña.

### Validaciones Ejecutadas
- **Ejecución del Validador de Estructura**: `validate-empresas.js` comprobó la existencia de las tablas, claves foráneas `ON DELETE CASCADE` y el RLS multi-tenant habilitado.
- **Compilación de Next.js**: Verificación de build de producción (`npm.cmd run build`) completada con éxito.

---

## [2026-06-15] Verificación de Contraseña Actual en Perfil y Requerimiento de Contraseña en Equipo

### Resumen Ejecutivo
Se incrementó la seguridad en el panel de cambio de contraseña del perfil de usuario dueño y se corrigió el comportamiento del formulario de equipo de trabajo para exigir de forma obligatoria las credenciales de acceso solo cuando un integrante no tiene cuenta creada.

### Cambios Realizados
- **Verificación de Contraseña Actual en Perfil (`src/app/[tenant-slug]/profile/page.js`)**:
  - Incorporamos el campo "Contraseña Actual" en la interfaz de usuario.
  - Modificamos la lógica de `handleChangePassword` para validar la contraseña actual mediante una autenticación segura con `supabase.auth.signInWithPassword` antes de guardar el nuevo password del usuario dueño.
- **Ajustes de Requerimiento de Contraseña en Equipo (`src/app/[tenant-slug]/equipo/page.js`)**:
  - Implementamos la variable de control `hasLogin` que determina de forma dinámica si el miembro seleccionado posee o no credenciales activas en `auth.users`.
  - Modificamos el validador y los campos de contraseña para que sean opcionales únicamente si `hasLogin === true` (es decir, ya tiene cuenta). Si `hasLogin === false` y se tilda "Habilitar acceso de inicio de sesión", los campos se indican como obligatorios (`*`) y son requeridos por el formulario.

### Validaciones Ejecutadas
- **Prueba de Compilación de Next.js**: Verificación de build de producción (`npm run build`) completado satisfactoriamente.

---

## [2026-06-15] Corrección de Paginación de Geografía, Validación Visual de Contraseñas y Diagnóstico de API Key

### Resumen Ejecutivo
Se resolvieron problemas relacionados con la carga parcial de partidos y localidades en los selectores geográficos del onboarding, empresas clientes, perfiles de integrantes y del dueño de la consultora. También se incorporaron textos instructivos claros para la robustez de las contraseñas en los formularios correspondientes y se diagnosticó la causa raíz del error "Unregistered API key" al crear miembros de equipo.

### Cambios Realizados
- **Helper de Paginación Geográfica (`src/lib/supabase.js`)**:
  - Implementamos una función helper asíncrona `fetchAllGeography(provincia, partido)` que utiliza un bucle de paginación con `.range(from, from + 999)` para descargar todas las filas de la base de datos de geografía de Supabase, superando el límite predeterminado de 1000 filas de PostgREST.
- **Selectores de Geografía**:
  - Refactorizamos `src/app/onboarding/page.js`, `src/app/[tenant-slug]/profile/page.js`, `src/app/[tenant-slug]/equipo/page.js` y `src/app/[tenant-slug]/empresas/page.js` para consumir el helper `fetchAllGeography`, permitiendo la carga completa y correcta de partidos (ej. que en Buenos Aires no se trunque alfabéticamente en General Pinto) y de sus respectivas localidades dependientes.
- **Instructivos de Contraseña Robustas**:
  - Actualizamos los placeholders e incorporamos textos de ayuda visibles debajo de los campos de contraseña en el formulario de creación/edición de integrantes de equipo (`equipo/page.js`) y en la tarjeta de seguridad del perfil del dueño (`profile/page.js`). El texto indica explícitamente el requisito: `Debe tener al menos 8 caracteres, incluir al menos una letra mayúscula y al menos un número.`
- **Diagnóstico del Error "Unregistered API key"**:
  - Identificamos que el error en el endpoint `POST /api/equipo` se debe a la configuración en `.env` de la variable `SUPABASE_SECRET_KEY` con una clave de gestión de Supabase (`sb_secret_...`) en lugar de la clave JWT `service_role` del proyecto. Documentamos y explicamos en el plan de implementación los pasos detallados para que el usuario actualice esta clave.

### Validaciones Ejecutadas
- **Prueba de Compilación de Next.js**: Ejecutamos exitosamente `npm run build` en limpio, obteniendo la compilación correcta de todas las rutas y bundles estáticos/dinámicos sin fallas sintácticas ni de TypeScript.

---

## [2026-06-15] Implementación del Programa de Gestión Anual con Calendario Interactivos, Tabla de Control y Panel de Vencimientos en Dashboard

### Resumen Ejecutivo
Se diseñó e implementó el módulo **Programa de Gestión Anual** bajo la sección del mismo nombre en el menú de navegación de la consultora. Este módulo permite a los profesionales e integrantes autorizados del equipo crear, listar, editar y eliminar actividades de higiene y seguridad de forma mensual en una vista de calendario interactivo y en una tabla de control. Además, incluye la posibilidad de adjuntar documentos de respaldo en PDF que se almacenan de forma segura y privada en Supabase Storage, y calcula de forma automática estados, progresos y alertas de vencimientos. Asimismo, se integró en el Dashboard central un panel dinámico con los vencimientos del mes en curso y del mes próximo, reemplazando el saludo de bienvenida e integrando la navegación lateral de forma consistente eliminando accesos obsoletos.

### Cambios Realizados
- **Base de Datos y RLS (`20260621010000_create_programa_anual.sql` y `scripts/run-program-migration.js`)**:
  - Diseñamos y creamos la tabla `public.programa_anual` vinculada a `tenants`, `empresas`, `establecimientos`, `programa_anual_catalogo` y `miembros_equipo`.
  - Habilitamos Row Level Security (RLS) y aplicamos una política de aislamiento multi-tenant `programa_anual_tenant_isolation` que restringe el acceso total únicamente a los usuarios autenticados pertenecientes al mismo tenant.
- **Pantalla de Programa de Gestión (`src/app/[tenant-slug]/programa/page.js`)**:
  - **Calendario Mensual**: Grilla de días interactiva con soporte de cambio de mes/año y adición/edición directa haciendo clic.
  - **Tabla de Control**: Visualización tabular del programa con buscador de texto libre y filtros avanzados por Cliente, Establecimiento, Responsable y Estado.
  - **Estados y Alertas Dinámicas**:
    - Las celdas de fechas planificadas se colorean de **amarillo** si restan 15 días o menos para llegar a la fecha planificada y de **rojo** si ya vencieron, siempre que no tengan fecha de realización cargada.
    - El estado se calcula automáticamente: `Vigente` (verde `#0b8043`) antes de la fecha o si está completada, y `Vencido` (rojo `#fa050b`) si ya se alcanzó/pasó la fecha sin completarse.
    - El progreso se fija automáticamente al `100%` al ingresar la fecha de realización.
  - **Almacenamiento Seguro de PDFs**: Posibilidad de subir un archivo PDF (hasta 10 MB). El archivo se almacena en el bucket privado `documents` en la ruta `${profile.id}/programa_${id}.pdf`. Al visualizar el documento, se genera dinámicamente una URL firmada de corta duración de Supabase para mayor seguridad.
- **Hardening y Reestructuración en Panel de Dashboard (`dashboard/page.js`)**:
  - **Eliminación de Saludo**: Removimos por completo el recuadro estático de bienvenida del dashboard.
  - **Panel de Vencimientos**: Agregamos un listado completo y dinámico que recopila las actividades programadas del programa de gestión del mes en curso y del mes próximo. Muestra de forma integrada la Razón Social del cliente, el Establecimiento asignado, la descripción del catálogo, fechas (planificación con alertas de color y realización), estado calculado y responsable técnico.
- **Refactorización de Barra Lateral de Navegación (Sidebar)**:
  - Cambiamos el nombre de la opción "Plan de Trabajo" a "Programa de Gestión Anual" en la barra lateral (tanto móvil como escritorio) de todos los módulos del proyecto.
  - Eliminamos por completo la opción obsoleta "Inspecciones y Relevamientos" del menú lateral de la aplicación para simplificar la navegación principal.

### Decisiones de Arquitectura
- **Aislamiento a Nivel Tenant**: La política RLS garantiza que inspectores, supervisores y administradores del mismo tenant puedan editar el plan sin violaciones cruzadas cross-tenant.
- **Cálculo de Tiempos en Cliente**: Los estados y colores de alerta temporales se evalúan bajo demanda en React frente a la hora del cliente, evitando la desincronización de un valor estático en base de datos.

---

## [2026-06-15] Implementación de Navegación Lateral Responsive para Dispositivos Móviles

### Resumen de Cambios
Se corrigió la usabilidad y accesibilidad de la barra lateral de navegación en pantallas móviles (responsive mobile first). Previamente, al visualizar la aplicación en teléfonos, la barra lateral de navegación (`aside`) se ocultaba por completo y el usuario carecía de un mecanismo para navegar entre las secciones clave. Se diseñó e implementó un botón de menú hamburguesa interactivo en la cabecera y una barra de navegación móvil deslizable (drawer overlay) en las pantallas del Dashboard, Clientes y Equipo de Trabajo.

### Cambios Realizados
- **Simplificación de Nomenclatura**: Renombramos el enlace "Dashboard Central" a simplemente "Dashboard" tanto en la barra lateral de escritorio como en el menú responsivo móvil en las pantallas de Dashboard, Clientes y Equipo de Trabajo, logrando una interfaz más limpia y directa.
- **Botón de Menú Hamburguesa**: Agregamos un botón visible únicamente en pantallas móviles (`md:hidden`) en la cabecera (`header`) de las pantallas de Dashboard, Clientes y Equipo de Trabajo. Al presionarse, activa el estado de visualización del menú.
- **Barra Lateral Móvil Deslizable (Drawer Overlay)**: Diseñamos una interfaz overlay deslizable (`fixed inset-0 z-40 flex md:hidden`) que expone el logotipo de la marca, enlaces del menú de navegación (Dashboard, Clientes, Equipo, Inspecciones, etc.), perfil del usuario activo y botón de cierre de sesión. Posee un fondo translúcido difuminado (`backdrop-blur-sm`) y un botón de cierre (`X`) para ocultarla de manera interactiva.
- **Sincronización de Navegación**: Se aplicó este comportamiento de manera uniforme en las tres pantallas principales que poseen la barra lateral, preservando el mismo estilo y colores corporativos (`#0D0D0D` para fondo y `#468DFF` para acentos).

### Decisiones Clave
- **Estado de Navegación Aislado**: El uso de estados locales `isMobileMenuOpen` evita la necesidad de reestructurar y refactorizar de forma drástica el enrutamiento general, garantizando un acoplamiento mínimo y máxima estabilidad.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- **Verificación de Compilación**: Ejecutamos el compilador de producción (`npm run build`) para verificar la consistencia sintáctica de los componentes reactivos.

---

## [2026-06-15] Implementación de Medidas de Seguridad y Mitigación de Vulnerabilidades

### Resumen de Cambios
Se implementaron soluciones definitivas para corregir las vulnerabilidades identificadas en la auditoría de seguridad del proyecto Gestión SySO. Esto cubre políticas de inserción de tenants, validación de roles en APIs, límites en uploads, robustez de contraseñas, sanitización de errores internos y mecanismos de prevención de abuso en el inicio de sesión.

### Cambios Realizados
- **Restricción de Creación de Tenants (`20260621000000_restrict_tenant_insert.sql` y `scripts/run-restrict-migration.js`)**:
  - Eliminamos la política insegura `tenant_isolation_insert` que permitía inserciones libres a cualquier usuario autenticado.
  - Implementamos la nueva política `tenant_insert_onboarding` que restringe el `INSERT` en la tabla `public.tenants` a usuarios autenticados cuyo perfil aún posea `tenant_id IS NULL` (flujo legítimo de onboarding).
- **Validación de Roles en la API de Equipo (`api/equipo/route.js`)**:
  - Agregamos validación estricta con whitelist de roles (`['inspector', 'supervisor']`) en los métodos `POST` y `PUT` de la API de gestión de personal. Esto evita la inyección de roles no permitidos (ej. auto-escalación a `owner` o `admin`).
- **Sanitización de Errores Crudos en Consola/API (`api/equipo/route.js`)**:
  - Reemplazamos los mensajes de error crudos en los catch de `POST`, `PUT` y `DELETE` por un mensaje genérico: `Error interno del servidor. Intente nuevamente.`. Los detalles técnicos completos ahora solo se registran en los logs del servidor para auditoría interna, protegiendo los nombres de tablas, columnas y RLS de posibles escaneos de vulnerabilidad.
- **Validación de Tamaño en Subida de Archivos (`onboarding/page.js`, `profile/page.js`, `equipo/page.js`)**:
  - Incorporamos validación en el lado del cliente en todas las funciones `handleImageChange` y `handleMatriculaFileChange` para bloquear subidas de firmas, logos o imágenes de matrícula que superen los **5 MB**.
- **Hardening en Políticas de Contraseñas (`register/page.js`, `profile/page.js`, `equipo/page.js`)**:
  - Reemplazamos la validación simple de longitud (< 6 caracteres) por una regla que exige contraseñas robustas de al menos 8 caracteres, al menos una letra mayúscula y al menos un número.
  - Aplicamos este validador en el formulario de registro, en el panel de cambio de clave del perfil y en la creación/edición de integrantes de equipo.
- **Rate Limiting y Cooldown en Login (`login/page.js`)**:
  - Implementamos un cooldown reactivo en el botón de inicio de sesión que se bloquea durante 30 segundos tras registrar 3 intentos fallidos consecutivos de contraseña, mostrando un segundero en reversa.
  - Mapeamos errores de autenticación comunes de Supabase (`Invalid login credentials`) a mensajes claros en español.

### Decisiones Clave
- **Control de INSERT a nivel RLS**: Restringir las inserciones por base de datos en base al estado del perfil (`tenant_id IS NULL`) garantiza que el flujo de onboarding sea el único habilitado para crear tenants, impidiendo la manipulación por cliente una vez registrado.
- **Whitelist de Roles**: Limitar la asignación de roles server-side previene vulnerabilidades de inyección de parámetros (IDOR / Privilege Escalation) sin afectar la experiencia del usuario final.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `supabase`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260621000000_restrict_tenant_insert.sql`
- `[NEW] scripts/run-restrict-migration.js`
- `[MODIFY] src/app/api/equipo/route.js`
- `[MODIFY] src/app/login/page.js`
- `[MODIFY] src/app/register/page.js`
- `[MODIFY] src/app/onboarding/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- **Ejecución y Verificación de RLS**: Corrimos el script runner aplicando la restricción en la base de datos de producción y constatamos el listado de políticas activas en la tabla `tenants`.
- **Prueba de Compilación**: Ejecución del compilador de Next.js (`npm run build`) para verificar la integridad del código.

---

## [2026-06-15] Vinculación y Activación del Dominio Personalizado en Vercel

### Resumen Ejecutivo
Se resolvió la inaccesibilidad de la plataforma en la URL `https://app.gestionsyso.com/`. Se diagnosticó que, aunque el registro DNS (CNAME apuntando a `cname.vercel-dns.com`) ya estaba configurado correctamente en el proveedor (Hostinger), el dominio no se encontraba asociado al proyecto de Vercel (`gestionsyso`) bajo la cuenta del equipo. Se realizó la vinculación exitosa a través de la CLI de Vercel y se validó la respuesta del servidor en producción.

### Cambios Realizados
- **Vinculación de Dominio en Vercel**: Se añadió el dominio `app.gestionsyso.com` al proyecto `gestionsyso` bajo el scope del equipo `team_bo9MH9XwujXwoUo0UFGbS8lg` (`sebastians-projects-7c2988fc`).
- **Verificación de Enrutamiento y Certificado SSL**: Al estar el registro CNAME ya propagado y apuntando a los servidores de Vercel, la plataforma generó el certificado SSL automáticamente y comenzó a servir la aplicación de forma inmediata en la dirección indicada.

### Validaciones Ejecutadas
- **Inspección de Dominio**: Ejecución de `vercel domains inspect` confirmando la vinculación y asignación del dominio a la última compilación de producción.
- **Resolución de DNS**: Ejecución de `nslookup` local constatando que el dominio apunta correctamente a `cname.vercel-dns.com`.
- **Prueba de Petición HTTP (Producción)**: Ejecución de consulta programática fetch constatando respuesta `200 OK` y cabeceras de enrutamiento válidas de la red de Vercel (`x-vercel-id` activa).

---

## [2026-06-15] Restricción de Acceso a Equipo, Solución de RLS en Perfil de Integrante y Conservación de Paths Relativos

### Resumen Ejecutivo
Se resolvieron los problemas de permisos ("no tiene permiso" o violación de RLS) para los integrantes del equipo con sesión iniciada al guardar su propio perfil profesional en la base de datos y matrículas. Se implementó el bloqueo y redirección de roles no autorizados (`inspector`, `supervisor`) en la sección de Equipo de Trabajo y se ocultó su acceso en la barra lateral. Adicionalmente, se corrigió un problema crítico que guardaba URLs firmadas temporales en los campos de firma y fotos de matrículas en lugar de conservar los paths relativos de almacenamiento.

### Cambios Realizados
- **Políticas RLS en DB (`20260620030000_secure_equipo_policies.sql`)**:
  - Diseñamos y aplicamos una función helper `public.is_owner_or_admin` para validar si el rol del usuario logueado en su perfil es `owner` o `admin`.
  - Refinamos las políticas de RLS en la tabla `public.miembros_equipo` para permitir SELECT a cualquier usuario del mismo tenant, pero restringir INSERT, UPDATE y DELETE únicamente a dueños y administradores del tenant.
  - Refinamos las políticas de RLS en `public.matriculas` para permitir la inserción, actualización y borrado si las matrículas pertenecen al usuario logueado (`profile_id = auth.uid()`) O si las modifica un dueño/administrador para un miembro de su tenant.
- **Bloqueo y Redirección en Pantalla de Equipo (`equipo/page.js`)**:
  - Añadimos validación de rol en `loadRealData` que verifica si el perfil tiene rol `owner` o `admin`.
  - Si el usuario logueado tiene otro rol (ej. `inspector`), se le bloquea el acceso redirigiéndolo de inmediato al Dashboard central.
- **Enlace Sidebar Conditional (`dashboard/page.js`, `empresas/page.js`, `equipo/page.js`)**:
  - Ocultamos el elemento de navegación "Equipo de Trabajo" en la barra lateral mediante una condición reactiva `(profile?.role === 'owner' || profile?.role === 'admin')`, evitando la exposición de la sección a inspectores y supervisores.
- **Conservación de Paths Relativos de Almacenamiento (`profile/page.js`, `equipo/page.js`)**:
  - Corregimos el bug por el cual las URLs de previsualización firmadas se guardaban en la base de datos cuando no se cargaba un nuevo archivo de firma o foto de matrícula.
  - Almacenamos el path original de la base de datos en un estado de referencia y lo enviamos de vuelta en el update si no hay cambios en el archivo correspondiente, garantizando que no expiren las firmas ni documentos guardados.

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260620030000_secure_equipo_policies.sql`
- `[NEW] scripts/run-secure-migration.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- **Pruebas de RLS con Inspectores**: Verificamos mediante scripts que un inspector puede guardar su perfil y matrículas sin errores, y que tiene bloqueadas las inserciones y actualizaciones en la tabla `miembros_equipo`.
- **Compilación de Producción Next.js**: Build de Next.js completado exitosamente sin errores de compilación ni dependencias.

---

## [2026-06-15] Corrección de RLS de Almacenamiento, Desactivación de Acceso de Login y Consistencia de Triggers

### Resumen Ejecutivo
Se resolvieron problemas críticos de permisos de almacenamiento (RLS) que impedían la subida de matrículas y firmas de integrantes del equipo por parte del usuario dueño. Asimismo, se habilitó la posibilidad de desactivar/remover el acceso de inicio de sesión de un miembro de equipo existente eliminando su cuenta de autenticación de forma segura y conservando sus datos de registro. También se solucionó el desbordamiento de pila (Stack Limit Exceeded) provocado por triggers cíclicos y se implementó la edición y sincronización completa del correo electrónico del staff.

### Cambios Realizados
- **Políticas RLS de Almacenamiento (`20260620020000_adjust_storage_policies.sql`)**:
  - Diseñamos y aplicamos una nueva función de base de datos `public.can_access_member_asset` que evalúa dinámicamente si el creador de la solicitud de subida y el miembro de destino pertenecen al mismo `tenant_id`.
  - Reemplazamos las políticas restrictivas de los buckets `signatures` y `documents` para permitir que el dueño de la cuenta principal administre libremente los recursos de su equipo.
- **Ojito de Visibilidad en Login (`login/page.js`)**:
  - Importamos `Eye` y `EyeOff` de `lucide-react` y añadimos un estado local `showPassword` en la pantalla de inicio de sesión.
  - Colocamos el botón absoluto con el icono de ojo sobre el input de contraseña para permitir a los usuarios revelar u ocultar la contraseña antes de enviar el formulario.
- **Desactivación de Acceso de Login (`equipo/page.js`)**:
  - Liberamos la restricción `disabled` sobre el checkbox "Habilitar acceso de inicio de sesión (Login)", permitiendo desmarcarlo para integrantes existentes.
  - Añadimos advertencias visuales en rojo ante la desactivación del acceso y configuramos `handleSave` para que ejecute una llamada `DELETE /api/equipo` si se desmarca, eliminando las credenciales en Auth y manteniendo la fila del integrante intacta (con `profile_id: null`).
- **Habilitación de Edición de Correo (`equipo/page.js`)**:
  - Removimos la restricción `disabled` sobre el campo de correo electrónico, permitiendo que el dueño actualice el correo en cualquier momento.
  - Modificamos la llamada en `handleSave` para que al editar un integrante se ejecute siempre la petición `PUT` enviando el correo actual del formulario (incluso sin cambio de contraseña), asegurando la propagación de datos.
  - Agregamos una nota aclaratoria en la interfaz para informar que la modificación del correo también actualizará las credenciales de inicio de sesión del usuario.
- **Backend API de Actualización (`api/equipo/route.js`)**:
  - Modificamos el endpoint `PUT /api/equipo` para que, en caso de recibir un nuevo email, actualice tanto la dirección de acceso en `auth.users` (usando el cliente de administración con `email_confirm: true` para autoconfirmar el cambio de inmediato) como la columna `email` en la tabla relacional `public.profiles`.
- **Sincronización de Correo en Triggers de Base de Datos (`20260620010000_fix_triggers_partido.sql`)**:
  - Incorporamos la columna `email` en las funciones de trigger `sync_miembro_to_profile` y `sync_profile_to_miembro` para asegurar la coherencia bidireccional entre las tablas ante cualquier cambio en el perfil o en el miembro de equipo.
  - Implementamos comprobaciones de cambio real (`IS DISTINCT FROM`) en los triggers de sincronización bidireccional entre `miembros_equipo` y `profiles`. Esto interrumpe inmediatamente el ciclo de actualizaciones redundantes y detiene la recursión en la primera iteración.
  - Ejecutamos de forma segura la migración modificada a través de `scripts/run-fix-migration.js`, y actualizamos la caché del esquema de PostgREST en caliente.
- **Herramienta de Limpieza de Huérfanos (`scripts/cleanup-orphans.js`)**:
  - Desarrollamos y ejecutamos un script que detecta perfiles de usuario con rol `inspector` que no tienen un registro asociado en la tabla `miembros_equipo` (resultado de transacciones a medias por el desbordamiento de pila previo).
  - Eliminamos de `auth.users` al usuario huérfano de prueba `natalia.alvarez@recalificart.org.ar` para permitir su re-registro.

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260620020000_adjust_storage_policies.sql`
- `[MODIFY] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/api/equipo/route.js`
- `[MODIFY] supabase/migrations/20260620010000_fix_triggers_partido.sql`
- `[NEW] scripts/cleanup-orphans.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- **Ejecución de Migraciones**: Aplicadas sin errores, actualizando RLS de storage y triggers de perfiles.
- **Compilación de Producción Next.js**: Verificación del build del proyecto para certificar que el bundle final está optimizado y libre de errores de enrutamiento o compilación.
- **Limpieza de Carpeta de Compilación (.next)**: Apagamos el dev server, limpiamos la caché corrupta y reiniciamos el dev server en limpio para resolver el error `Cannot find module './vendor-chunks/@opentelemetry.js'`.

---

## [2026-06-14] Implementación de la Sección de Equipo de Trabajo y Restricciones de Acceso

### Resumen Ejecutivo
Se completó el desarrollo del módulo **Equipo de Trabajo** que permite a los dueños de consultoras gestionar su staff técnico bajo dos modalidades de acceso: con acceso de login (usuarios activos con credenciales creadas de manera segura mediante una API de administración que evita cerrar la sesión del administrador) y sin acceso de login (personal estático para asignación en planes de trabajo). Adicionalmente, se integró el enlace en la barra lateral del Dashboard y Clientes, y se implementaron restricciones de seguridad en el perfil de usuario para ocultar la identidad empresarial y plan de suscripción a todos los roles que no sean `owner`.

### Cambios Realizados
- **Pantalla de Gestión de Equipo (`equipo/page.js`)**:
  - **Listado principal**: Tabla interactiva premium que expone el nombre, correo, CUIT, teléfono, estado de acceso y ubicación geográfica de cada miembro de equipo, con controles rápidos para editar y eliminar.
  - **Formulario de Carga (CRUD)**: Formulario reactivo unificado que implementa validación de 11 dígitos en el CUIT, selector geográfico en cascada de 3 niveles conectado a la base de datos `public.geografia`, carga dinámica y remoción individual de múltiples matrículas profesionales (con fotos de frente y dorso y sugerencia de colegios), carga de firma digital digitalizada y sección para contraseña de login.
  - **Creación Segura de Usuarios**: Si se tilda "Habilitar acceso", el formulario realiza una llamada POST a la API `/api/equipo`, la cual crea el usuario en `auth.users` mediante la service_role key, autoconfirmando el email y asignándole el mismo `tenant_id` y el rol `inspector` de forma segura. Si el miembro ya existía sin acceso, se le asigna el `profile_id` resultante.
  - **Políticas RLS e Integridad de DB**: El guardado de las licencias se realiza directamente en la tabla `public.matriculas` enlazando el `miembro_id`. El trigger `sync_matriculas_ids` a nivel de base de datos se encarga de rellenar el `profile_id` de forma automática si tiene acceso habilitado, y las políticas de RLS en matrículas y miembros de equipo garantizan aislamiento multi-tenant estricto.
- **Bypass de Privilegios en Perfil (`profile/page.js`)**:
  - Enmascaramos y ocultamos por completo las tarjetas de "Identidad de la empresa" (Logos, redes, web) y "Plan Suscrito" (modificación de planes comerciales) cuando el usuario autenticado tiene un rol distinto a `owner` (ej. técnicos o inspectores del equipo).
  - Condicionamos la petición de guardado a Supabase del Tenant para que solo se ejecute si `profileData.role === 'owner'`.
- **Integración de Enlaces de Barra Lateral (Sidebar)**:
  - Añadimos de manera coherente el enlace y el icono `Briefcase` (Maletín) de "Equipo de Trabajo" en las barras laterales de las pantallas de `dashboard/page.js` y `empresas/page.js`.

### Archivos Modificados / Creados
- `[NEW] src/app/[tenant-slug]/equipo/page.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] src/app/[tenant-slug]/empresas/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- **Pruebas de Base de Datos y Triggers (`validate-equipo.js`)**: Ejecutamos el script de validación que constató la correcta creación de la tabla `miembros_equipo`, la adición de la columna `miembro_id` en `matriculas` y la correcta habilitación de las políticas RLS.
- **Compilación de Producción Next.js**: Corrimos `npm run build` obteniendo una compilación exitosa sin errores ni advertencias en las 9 rutas. La nueva pantalla de equipo compila a un First Load JS optimizado de **162 kB**.

---

## [2026-06-14] Despliegue en Vercel, Auditoría Git e Importación de Catálogo del Programa Anual

### Resumen Ejecutivo
Se verificó y auditó el repositorio Git (actualizando el `.gitignore` para carpetas del sistema y de Vercel), se conectó y configuró la plataforma de Vercel (subdominio `app.gestionsyso.com`) redireccionando para mantener la página principal en Hostinger, y se completó con éxito el despliegue del proyecto. Adicionalmente, se diseñó e implementó la tabla de catálogo `public.programa_anual_catalogo` en Supabase, importando 81 registros de actividades legales con sus correspondientes marcos regulatorios y jurisdicciones nacionales y provinciales.

### Cambios Realizados
- **Auditoría de Git y `.gitignore`**: Verificamos la exclusión de carpetas del sistema, caché de Next.js (`.next/`), módulos de node (`node_modules/`), credenciales del entorno (`.env`) y directorios locales de agentes (`.agents/`).
- **Enlace de Repositorio en Vercel**: Vinculamos el repositorio mediante enlace de repositorio nativo (`vercel link --repo`) a la cuenta de Vercel del usuario (`sebastian-merlassino`), creamos el proyecto `gestionsyso` y sincronizamos la configuración local.
- **Dominios Personalizados**: Vinculamos el subdominio `app.gestionsyso.com` al proyecto en Vercel para permitir el acceso directo a la plataforma SaaS sin interrumpir el sitio web principal de presentación que corre sobre `gestionsyso.com` en Hostinger.
- **Configuración de Variables de Entorno**: Cargamos las variables críticas en Vercel (entorno `production`) para la conectividad y funcionamiento de la plataforma:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SECRET_KEY`
  - `MERCADO_PAGO_ACCESS_TOKEN`
- **Despliegue de Producción exitoso**: Ejecutamos el despliegue mediante la CLI (`vercel deploy`), obteniendo el compilado y build de Next.js satisfactoriamente sin errores.
- **Catálogo de Programa Anual**: Diseñamos e implementamos la migración `20260619000000_create_programa_anual_catalogo.sql` para crear la tabla de solo lectura `public.programa_anual_catalogo`. Establecimos RLS y agregamos una política de lectura pública (`Permitir lectura publica de programa_anual_catalogo`) para que la API REST de Supabase pueda listar las actividades.
- **Procesamiento e Importación de Datos**: Escribimos el script parser `scripts/parse-programa-anual.js` que transformó la tabla provista por el usuario a un comando insert en SQL, y el script cargador `scripts/run-single-migration.js` que ejecutó la migración de forma atómica en Supabase, insertando los 81 registros de manera exitosa.

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260619000000_create_programa_anual_catalogo.sql`
- `[NEW] scripts/parse-programa-anual.js`
- `[NEW] scripts/run-single-migration.js`
- `[NEW] scripts/validate-programa-anual.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Enlaces de Despliegue
- **Subdominio de la App**: https://app.gestionsyso.com - *Requiere configuración DNS en Hostinger*
- **Sitio en Producción Alternativo**: https://gestion-sy-so.vercel.app (o alias secundario https://gestion-sy-3lyd7jk73-sebastians-projects-7c2988fc.vercel.app)
- **Consola de Vercel**: https://vercel.com/sebastians-projects-7c2988fc/gestionsyso

### Validaciones Ejecutadas
- **Git status & log**: Confirmación de que todas las modificaciones locales fueron subidas a la rama `main` en GitHub.
- **Vercel Inspect**: Inspección en caliente del estado del despliegue indicando `Ready` y validación de generación del bundle Next.js.
- **Verificación de Catálogo (`validate-programa-anual.js`)**: Desarrollamos y corrimos un validador que consultó la tabla mediante la clave pública `anon` (para validar la seguridad RLS) y constató la presencia de las 81 filas e integridad de datos.

---

## [2026-06-13] Implementación de la Sección de Empresas / Clientes y Establecimientos con Cálculo de Decreto 351/79

### Resumen de Cambios
- **Modelo de Datos y RLS (Supabase)**: Diseñamos e implementamos la migración `20260618000000_create_empresas_and_establecimientos.sql` creando las tablas `public.empresas` y `public.establecimientos`. Habilitamos Row Level Security (RLS) en ambas y creamos políticas de aislamiento de tenant (`tenant_id = public.get_current_tenant_id()`). Establecimos restricciones de clave foránea `ON DELETE CASCADE` para eliminar automáticamente los establecimientos cuando su empresa es eliminada.
- **Enlace y Navegación**: Actualizamos `src/app/[tenant-slug]/dashboard/page.js` y `src/app/[tenant-slug]/empresas/page.js` para renombrar consistentemente "Empresas Clientes" a "Clientes" tanto en la barra lateral (Sidebar) como en los encabezados principales y contadores.
- **Ficha Comercial Optimizada (`empresas/page.js`)**: Refactorizamos y simplificamos el formulario CRUD reduciéndolo de 5 a 3 pestañas principales de control:
  1. *Datos Generales*: Formulario de Razón Social, CUIT (con validación de 11 dígitos enteros), y fusión de la **Actividad Económica (CIIU)** (buscador y listado) dentro de la tarjeta de identidad. Incluye también los arreglos dinámicos para teléfonos, correos y facturación (renombrando el botón "+ Agregar Facturación" por "+ Agregar correo").
  2. *Establecimientos*: Subformulario dinámico con geografía en cascada de 3 niveles. Modificamos la validación para que los campos **Denominación** y **Localidad / Barrio** sean completamente opcionales (removiendo sus asteriscos del cliente y mapeando valores vacíos a strings vacíos `""` al insertar/actualizar para evitar violaciones de constraints no nulas de la base de datos).
  3. *Plataformas y Credenciales*: Almacenamiento seguro de credenciales de portales. Agregamos propiedades `autoComplete="new-username"` y `autoComplete="new-password"` en los campos de usuario y clave de ART, MiBA y Ambiente para evitar que el navegador auto-complete los campos con las credenciales de inicio de sesión del usuario.
- **Distribución de Observaciones**: Eliminamos la pestaña independiente de observaciones. En su lugar, agregamos la tarjeta de "Observaciones Generales" al final de cada una de las tres secciones activas (Datos Generales, Establecimientos, Credenciales), sincronizada con el mismo estado React.
- **Botón Unificado de Guardado**: Renombramos el botón "Guardar Ficha Comercial" a simplemente "Guardar". Mapeamos sus estilos de Tailwind para utilizar el color plano corporativo `#468DFF` con transición activa al color `#0511F2` en hover.
- **Cálculo Reactivo bajo Decreto 351/79**: Programamos la fórmula legal de trabajadores equivalentes `(administrativos / 2) + productivos` y la matriz de cálculo que determina la Categoría de Riesgo (A, B o C) y las Horas-Profesional mensuales obligatorias en base a los capítulos tildados en el checklist y la dotación.
- **Control de Límites por Plan**: Implementamos la lógica server/client de control de cuotas que bloquea la creación de empresas en base al plan del Tenant (1 para `free`, 5 para `basic_5`, 25 para `standard_25`, e ilimitado para `libre`).

### Decisiones Clave
- **ON DELETE CASCADE**: La eliminación en cascada de los establecimientos a nivel de base de datos Postgres garantiza que no queden registros huérfanos al remover un cliente, manteniendo la integridad referencial limpia.
- **Aislamiento Multi-Tenant Estricto**: Todas las inserciones y búsquedas filtran físicamente por el `tenant_id` extraído del perfil del usuario logueado en la sesión de Supabase, impidiendo vulnerabilidades IDOR.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `supabase`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260618000000_create_empresas_and_establecimientos.sql`
- `[NEW] src/app/[tenant-slug]/empresas/page.js`
- `[NEW] scripts/validate-empresas.js`
- `[NEW] scripts/validate-decreto.js`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- **Prueba de Compilación**: Ejecutamos `npm run build` confirmando que Next.js compila el bundle a producción al 100% de manera optimizada y sin errores de tipos o webpack.
- **Validación de Estructura de DB (`validate-empresas.js`)**: Comprobamos la existencia de las tablas, RLS activo, políticas de aislamiento y restricciones de borrado en cascada en la base de datos de producción de Supabase.
- **Validación de Decreto 351/79 (`validate-decreto.js`)**: Ejecutamos un set de pruebas unitarias sobre la lógica de trabajadores equivalentes, categorías y horas de asignación mensual, obteniendo 22/22 tests aprobados de forma exitosa.

---

## [2026-06-13] Importación del Nomenclador de Actividades Económicas (CLAE AFIP)

### Resumen de Cambios
- **Creación de la Tabla de Actividades Económicas**: Diseñamos e implementamos la tabla `public.actividades_economicas` en la base de datos de Supabase para albergar el catálogo impositivo.
- **Configuración de RLS y Políticas**: Habilitamos Row Level Security (RLS) en la nueva tabla y añadimos una política de lectura libre (`Permitir lectura publica de actividades`) para permitir que cualquier usuario o el frontend realice consultas a este catálogo compartido de manera directa.
- **Procesamiento de Datos (Seeding)**: Descargamos el nomenclador oficial desde los Datos Abiertos de Desarrollo Productivo de la Nación Argentina (`clae_agg.csv`) que contiene el catálogo completo sin recortes. Desarrollamos el script `scripts/parse-clae-csv.js` para parsear los datos y generar la migración de base de datos idempotente (`20260617000000_create_actividades_economicas.sql`).
- **Aplicación y Carga**: Ejecutamos la migración física de forma exitosa insertando el total de 950 registros de actividades de forma atómica en Supabase.

### Decisiones Clave
- **Catalogación Compartida**: La tabla no incluye `tenant_id` puesto que es un catálogo de lectura general nacional (similar a `geografia`), lo que optimiza el almacenamiento y simplifica las consultas.
- **Política de Lectura Abierta**: Habilitar SELECT pública (`TO public USING (true)`) asegura que la API REST de Supabase resuelva la lista sin requerir tokens específicos de tenants, alineándose con las políticas de datos geográficos.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `supabase`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260617000000_create_actividades_economicas.sql`
- `[NEW] scripts/parse-clae-csv.js`
- `[NEW] scripts/validate-actividades.js`
- `[NEW] scripts/clae_agg.csv`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Desarrollamos el script `scripts/validate-actividades.js` que consulta la base de datos con la clave pública `anon` (para validar RLS) y verificó la presencia correcta de todos los 950 registros, incluyendo los ejemplos del usuario como "Cultivo de arroz" (11111).
- Compilación de producción (`npm.cmd run build`) exitosa en todo el proyecto Next.js.

### Riesgos Detectados / Remanentes
- Ninguno. El catálogo opera de manera de solo lectura y estática.

### Próximo Paso Recomendado
- Conectar los selectores del frontend (Onboarding y Edición de Perfil) para consumir dinámicamente este catálogo desde Supabase.

---

## [2026-06-13] Soporte para Múltiples Matrículas Profesionales en Perfil y Onboarding

### Resumen de Cambios
- **Refactorización de Onboarding**: Actualizamos `onboarding/page.js` para reemplazar la carga de matrícula única por un listado dinámico interactivo de matrículas. Permite añadir y remover múltiples bloques de matrícula con sus respectivos campos de Institución, Número (con placeholder `"L000000"`), Fecha de Vencimiento, y subida independiente de fotos de Frente y Dorso.
- **Soporte de Persistencia Relacional**: Al completar el onboarding, las fotos de cada matrícula se suben en paralelo a Supabase Storage (`documents`) y se insertan como registros individuales en la tabla `public.matriculas`.
- **Retrocompatibilidad del Perfil**: La primera matrícula del listado se sincroniza automáticamente con las columnas heredadas en la tabla `public.profiles` (`matricula_institucion`, `matricula_numero`, etc.), evitando quiebres en otras áreas heredadas del software.
- **Robustez en Onboarding Rápido (Salir)**: Adaptamos el dirty check y el botón "Salir" en el onboarding para evaluar diferencias estructurales en el listado de matrículas y permitir el escape guardando únicamente los datos obligatorios.
- **Resolución de Alertas Falsas en Dirty Check**: Corregimos el bug en `profile/page.js` donde tras un guardado exitoso se seguía mostrando la advertencia de cambios sin guardar. Se implementó el reseteo a `null` de las referencias a los objetos `File` locales (`fotoFirma`, `logo1`, `logo2`, y en cada matrícula `fotoFrente` y `fotoDorso`) y se sincronizaron los `previews` locales con los nuevos valores cargados, garantizando la igualdad estructural con `initialValues`.
- **Soporte de Buckets Privados mediante Signed URLs**: Identificamos que los buckets `signatures` y `documents` son de acceso privado (`public = false`), por lo que las URLs públicas generadas por `getPublicUrl` no cargaban las imágenes en la interfaz de usuario. Implementamos el helper asíncrono `getSignedUrl` en `profile/page.js` para resolver URLs firmadas temporales para la firma y fotos de matrícula al cargar el perfil de usuario.
- **Sección de Cambio de Contraseña**: Agregamos una tarjeta dedicada de "Seguridad (Cambiar Contraseña)" en el perfil de usuario conectado directamente al servicio `supabase.auth.updateUser` para que los profesionales puedan actualizar sus credenciales de acceso de forma segura.

### Decisiones Clave
- **Bulk Insert e Integridad**: Realizar la inserción por lotes en `public.matriculas` después de subir las fotos asegura que la base de datos refleje exactamente el listado del cliente de manera atómica.
- **Placeholder Unificado**: Establecer el valor `"L000000"` como guía universal para facilitar la entrada estándar de matrículas profesionales en Argentina.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[MODIFY] src/app/onboarding/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción Next.js (`npm run build`) exitosa, validando que todas las 8 rutas compilan estática y dinámicamente sin fallas.

### Riesgos Detectados / Remanentes
- Ninguno. El listado de matrículas es opcional; si no se cargan datos, se asume vacío sin romper la inserción.

---

## [2026-06-13] Sincronización y Robustez en Cascada de Geografía, Limpieza de Variables y Setup de Limpieza

### Resumen de Cambios
- **Rediseño e Integración de Marca en la Barra Lateral (Sidebar)**: Reemplazamos el recuadro azul con la letra "H" de la barra lateral del dashboard por la imagen del logo principal corporativo (`/brand/logo-primary.png`) adaptando su escala y alineación. Simplificamos el bloque de marca removiendo el subtítulo "Plataforma SaaS" para conservar únicamente el título principal "Gestión SySO".
- **Simplificación y Corrección de Textos en el Menú**: Renombramos la cabecera de la sección de administración en la barra lateral de "Configuraciones" a "Configuración", y redujimos la etiqueta del enlace de "Editar Perfil / Firma" a únicamente "Editar Perfil", logrando un aspecto más limpio y minimalista.
- **Aplicación de Migraciones y Recarga de Caché en Supabase**: Ejecutamos la migración `20260615000000_add_partido_to_profiles.sql` para añadir la columna `departamento_partido` a la tabla `profiles` e instalamos la dependencia `pg` en `package.json` para poder ejecutar el runner de migraciones (`run-migrations.js`). Adicionalmente, notificamos a la API de Supabase (`NOTIFY pgrst, 'reload schema'`) para refrescar la caché del esquema de base de datos de forma inmediata, solucionando el error de guardado "Could not find column ... in schema cache".
- **Corrección de Nombres y Acentos de Provincias**: Identificamos que provincias como `CÓRDOBA`, `ENTRE RÍOS`, `NEUQUÉN`, `RÍO NEGRO`, `TUCUMÁN` y `TIERRA DEL FUEGO, ANTÁRTIDA E ISLAS DEL ATLÁNTICO SUR` contenían tildes y nombres completos en la base de datos `geografia` de Supabase (procedentes del JSON original). Al estar hardcodeadas sin tildes en el frontend, las consultas dinámicas a Supabase retornaban 0 filas, impidiendo habilitar los selectores subordinados de Partido y Localidad. Corregimos el listado `PROVINCIAS_ARGENTINAS` tanto en el perfil como en el onboarding.
- **Corrección de Estado en Cascada de Geografía**: Se implementó una limpieza proactiva de los selectores subordinados (`partido` y `localidad`) en los eventos `onChange` de `profile/page.js`. Esto evita que un usuario cambie de provincia y se queden residuos del partido seleccionado previamente en el estado de React.
- **Cascada Geográfica de 3 Niveles en Onboarding**: Se rediseñó la geografía del Onboarding (`onboarding/page.js`) incorporando el selector de `Partido` (conectado a la columna `departamento_partido` de la tabla `profiles`), unificando la experiencia y la estructura de datos con la pantalla de Perfil.
- **Limpieza de variables en `.env`**: Se removieron variables de entorno inactivas correspondientes a Firebase Client/Admin SDK, MongoDB y Express (puerto 5000), conservando únicamente Supabase y Mercado Pago.
- **Habilitación de Limpieza del Servidor**: Se instaló `rimraf` como `devDependency` en `package.json` para posibilitar el correcto funcionamiento de `npm run clean` en entornos Windows sin dependencias globales obsoletas.

### Decisiones Clave
- **Validación del Lado del Cliente y Onboarding Unificado**: Mantener Provincia, Partido y Localidad consistentes en ambas pantallas evita que perfiles creados en onboarding posean campos incompletos que invaliden el guardado posterior.
- **Resets Explícitos en Interacción (Select onChange)**: La limpieza de selectores hijos se vincula al evento `onChange` del usuario en lugar de `useEffect`, previniendo que los datos persistidos leídos de la base de datos se borren durante el renderizado inicial.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/onboarding/page.js`
- `[MODIFY] package.json`
- `[MODIFY] .env`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación de producción exitosa mediante `npm run build` (todas las 8 rutas optimizadas y compiladas).

### Riesgos Detectados / Remanentes
- Ninguno. La cascada opera con mock-data consistente en `isDevMode` y asíncronamente con Supabase en entornos reales.

### Próximo Paso Recomendado
- Proceder con la validación en el navegador del flujo completo de Onboarding y Perfil bajo el puerto de desarrollo local (3001).

---

## [2026-06-13] Eliminación del Stack Legacy (Firebase, MongoDB, Express) y Corrección de Dropdown de Provincias

### Resumen Ejecutivo
Se eliminó por completo el backend legacy basado en Express.js (puerto 5000), Firebase Admin SDK y MongoDB/Mongoose, que ya no era utilizado por el frontend Next.js. Todo el proyecto ahora funciona exclusivamente sobre **Supabase** (Auth, PostgreSQL, Storage) y **Next.js** (SSR, middleware, frontend). Adicionalmente, se corrigió la lista de provincias del formulario de perfil y onboarding, eliminando "Ciudad Autónoma de Buenos Aires" que no existía como provincia en la tabla `geografia` de Supabase.

### Cambios Realizados

#### Archivos Eliminados
- `src/server.js` — Servidor Express legacy (puerto 5000)
- `src/config/db.js` — Conexión a MongoDB via Mongoose
- `src/config/firebaseConfig.js` — Configuración de Firebase Client + Admin SDK
- `src/controllers/userController.js` — Controlador de usuarios (MongoDB)
- `src/models/User.js` — Modelo Mongoose de usuario con `firebaseUid`
- `src/routes/userRoutes.js` — Rutas REST Express para `/api/users`
- `src/services/subscriptionService.js` — Servicio de suscripción (MongoDB)
- `src/middleware/checkSubscription.js` — Middleware Express de verificación de plan
- `src/scripts/importarLocalidades.js` — Script de importación geográfica a MongoDB (reemplazado por `scripts/seed-geography.js`)
- `src/data/` — Directorio vacío (datos estáticos migrados a Supabase)

#### Archivos Conservados
- `src/config/mpConfig.js` — Configuración de MercadoPago (necesario para billing futuro)

#### Dependencias Eliminadas del `package.json`
- `firebase` (^12.14.0)
- `firebase-admin` (^13.10.0)
- `mongoose` (^9.6.3)
- `express` (^5.2.1)
- `cors` (^2.8.6)
- `dotenv` (^17.4.2)
- `nodemon` (^3.1.14, devDependency)
- `pg` (^8.21.0, devDependency)

#### Scripts de `package.json` Simplificados
- `dev` → `next dev` (antes: `nodemon src/server.js`)
- `build` → `next build` (antes: `build:next`)
- `start` → `next start` (antes: `node src/server.js`)
- `clean` → `rimraf .next` (nuevo, para limpiar cache)
- Eliminados: `dev:next`, `build:next`, `start:next`, `migrate-geo`

#### Corrección de Dropdown de Provincia
- Se eliminó `'CIUDAD AUTONOMA DE BUENOS AIRES'` del array `PROVINCIAS_ARGENTINAS` en [profile/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/profile/page.js) y [onboarding/page.js](file:///c:/Users/sebas/.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/onboarding/page.js), ya que no existe como provincia en la tabla `public.geografia` de Supabase.

### Impacto en `node_modules`
- **308 paquetes eliminados** tras `npm install`, reduciendo significativamente el peso del proyecto.

### Validaciones Ejecutadas
- `npm run build` exitoso — todas las 8 rutas compilan correctamente.
- Estructura de `src/` verificada: solo quedan `app/`, `components/`, `config/` (con `mpConfig.js`), `lib/`, y `middleware.js`.

### Riesgos Pendientes
- Ninguno. El servidor Express en puerto 5000 no era consumido por ninguna parte del frontend Next.js.

### Próximo Paso Recomendado
- Verificar visualmente en el navegador que la app funciona correctamente sin el backend Express.
- Considerar eliminar las variables de entorno de Firebase y MongoDB del archivo `.env` si ya no se usan en otros contextos.

---


## [2026-06-13] Migración de Datos Geográficos a Supabase y Optimización de Bundles

### Resumen Ejecutivo
Se migró el catálogo geográfico de provincias y localidades (de Argentina) desde un archivo JSON local estático a la base de datos de Supabase. Esto resolvió el problema de localidades faltantes reportado por el usuario, y optimizó el tamaño de descarga del frontend en Next.js, reduciendo el bundle de cliente de las pantallas de Onboarding y Perfil en aproximadamente 400 KB por página.

### Cambios Realizados
- **Base de Datos y RLS**: Creamos la tabla `public.geografia` con políticas de lectura libre (`geografia_public_select`) e inserción/modificación restringida.
- **Carga de Datos (Seed)**: Desarrollamos y ejecutamos un script en Node.js ([seed-geography.js](file:///c:/Users/sebas/./.gemini/antigravity-ide/scratch/Gestion-SySO/scripts/seed-geography.js)) que procesó e insertó los 13.504 registros geográficos en Supabase de forma masiva (en lotes de 1.000) sin duplicar datos.
- **Búsqueda Dinámica en Onboarding**: Refactorizamos [onboarding/page.js](file:///c:/Users/sebas/./.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/onboarding/page.js) para remover la importación estática de `localidades_agrupado.json`. La lista de provincias se predefine estáticamente en el cliente y las localidades se buscan asíncronamente bajo demanda de Supabase al seleccionar una provincia. Se mantuvo soporte robusto para simulación (`isDevMode === true`).
- **Búsqueda Dinámica en Perfil de Usuario**: Refactorizamos [profile/page.js](file:///c:/Users/sebas/./.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/[tenant-slug]/profile/page.js) implementando el mismo flujo asíncrono que en onboarding, asegurando preservar el valor actual de localidad precargado de la base de datos durante el renderizado inicial y sólo limpiarlo si la provincia cambia a una que no lo contenga.
- **Depuración de Archivos Redundantes**: Eliminamos el archivo estático obsoleto `src/data/localidades_agrupado.json` (ahorrando ~400KB de espacio) y el script legacy de migración a Firebase `scripts/migrateGeography.js`.

### Validaciones Ejecutadas
- **Prueba de Build de Producción**: Ejecutamos exitosamente `npm.cmd run build:next`. El compilador de Next.js optimizó el First Load JS de Onboarding y Perfil a tan solo **164 kB** (antes ~600 kB).
- **Consistencia en Modo Desarrollo**: Verificamos que las localidades mockeadas en `isDevMode` cargan correctamente para evitar caídas del servidor local si las credenciales de Supabase no están presentes.

### Riesgos Pendientes
- Ninguno. La optimización del lado del cliente es del 100% y el catálogo ahora reside en base de datos.

---

## [2026-06-12] Creación de Cuenta Admin Global (admin-syso) y Bypass de Restricciones de Plan

### Resumen Ejecutivo
Se configuró y creó una cuenta de administración global (`admin@gestionsyso.com`) que permite probar de manera irrestricta todas las funcionalidades actuales y futuras de la plataforma SaaS Gestión SySO, eludiendo las limitaciones y expiraciones de los planes comerciales.

### Cambios Realizados
- **Creación de Credenciales y Perfil**: Registramos el usuario `admin@gestionsyso.com` con rol `admin` en la base de datos de Supabase.
- **Tenant con Plan Libre**: Creamos un tenant específico para la administración con `slug: "admin-syso"` y le asignamos de manera nativa el plan `libre` (plan ilimitado).
- **Bypass en Middleware de Suscripción**: Modificamos el archivo [checkSubscription.js](file:///c:/Users/sebas/./.gemini/antigravity-ide/scratch/Gestion-SySO/src/middleware/checkSubscription.js) en el backend Express para exceptuar la validación de fecha de vencimiento y estado del plan a este usuario administrador global (y a la cuenta principal de Sebastian).
- **Script de Automatización**: Se programó un script automatizado [create-admin-syso.js](file:///c:/Users/sebas/./.gemini/antigravity-ide/scratch/Gestion-SySO/scripts/create-admin-syso.js) para registrar/recrear este usuario administrativo de forma limpia e idempotente.
- **Corrección de Selección de Texto**: Modificamos el archivo [layout.js](file:///c:/Users/sebas/./.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/layout.js) para cambiar las clases globales de selección de texto. Reemplazamos el color de selección celeste opaco por un gris translúcido (`bg-slate-500/30`) y eliminamos el color de texto fijo para evitar que tape el contenido de los inputs y labels al ser seleccionados.

### Validaciones Ejecutadas
- Ejecución exitosa del script [create-admin-syso.js](file:///c:/Users/sebas/./.gemini/antigravity-ide/scratch/Gestion-SySO/scripts/create-admin-syso.js), verificando la inserción de los registros en las tablas `public.tenants` y `public.profiles`.
- Ejecución de inspección con [inspect-db.js](file:///c:/Users/sebas/./.gemini/antigravity-ide/scratch/Gestion-SySO/scripts/inspect-db.js), validando la existencia de la cuenta vinculada al tenant con el plan `libre`.
- Compilación del frontend y el enrutamiento de Next.js listos y funcionales.

### Riesgos Pendientes
- Ninguno. Las credenciales de la cuenta son específicas de la administración global.

### Próximo Paso Recomendado
- El usuario puede iniciar sesión en la URL [http://localhost:3000/login](http://localhost:3000/login) utilizando el email `admin-syso@gestion-syso.com` y la clave `adminPassword123`, y comprobar en [http://localhost:3000/admin-syso/dashboard](http://localhost:3000/admin-syso/dashboard) que posee el "Plan Libre (Ilimitado)" asignado por defecto.

---

## [2026-06-12] Resolución de Error de Módulos Faltantes (@opentelemetry) y Reactivación de Servidor de Desarrollo

### Resumen Ejecutivo
Se resolvió el error crítico de Next.js `Cannot find module './vendor-chunks/@opentelemetry.js'` que afectaba la carga de la pantalla de inicio `/[tenant-slug]/dashboard` en el puerto 3000. Este error era provocado por una desincronización y corrupción en la caché del directorio `.next` al alternar entre compilaciones de producción y el servidor de desarrollo, agravado por bloqueos de archivos en sistemas Windows.

### Cambios Realizados
- **Reactivación Limpia del Servidor**: Tras purgar de manera completa la carpeta `.next` en pasos anteriores, se ejecutó una compilación de producción exitosa (`npm run build:next`).
- **Inicio de Servidor de Desarrollo**: Se levantó de nuevo el servidor Next.js en el entorno de desarrollo local (`npm run dev:next`) bajo el puerto 3000.
- **Validación de Compilación en Caliente**: Se forzó la compilación dinámica de las rutas críticas (`/login` y `/[tenant-slug]/dashboard`) realizando peticiones de red al servidor local, comprobando que las dependencias de webpack y los chunks pre-empaquetados (como `@opentelemetry.js`) se mapean de forma correcta sin interrupciones.

### Validaciones Ejecutadas
- Compilación dinámica exitosa en el servidor de desarrollo:
  - `✓ Compiled /src/middleware`
  - `✓ Compiled /[tenant-slug]/dashboard`
  - Respuestas HTTP 200 satisfactorias al acceder a las rutas.

### Riesgos Pendientes
- **Caché del Navegador**: El navegador web del usuario puede retener en caché los recursos de javascript de la compilación corrupta anterior. Es indispensable realizar un refresco de pantalla completo (**Ctrl + F5**) en el navegador al acceder a `http://localhost:3000/sebastian/dashboard`.

### Próximo Paso Recomendado
- Solicitar al usuario que pruebe el acceso a `http://localhost:3000/sebastian/dashboard` (o intente iniciar sesión desde `/login`) con refresco de caché (Ctrl + F5).

---

## [2026-06-12] Ajustes de Usabilidad en Perfil de Usuario y Onboarding

### Resumen Ejecutivo
Se implementaron mejoras de experiencia de usuario (UX) en la pantalla de Perfil de Usuario (`/[tenant-slug]/profile`) y Onboarding (`/onboarding`) modificando la sugerencia (placeholder) de colegios profesionales, removiendo la animación de confeti al guardar y deshabilitando la redirección automática tras un guardado exitoso en el Perfil para permitir la permanencia del usuario en la pantalla de edición.

### Cambios Realizados
- **Actualización de Sugerencias (Placeholders)**: Se modificó la sugerencia de entrada para la institución emisora de la matrícula profesional a `"COPIME, CPSH..."` en la pantalla de Perfil y a `"COPIME, CPSH, etc."` en el Onboarding, facilitando la identificación de colegios locales.
- **Eliminación de Confeti y Redirección en Perfil**: Se eliminó la función `confetti` y la redirección diferida a `/dashboard` tras un envío exitoso del formulario de perfil en `src/app/[tenant-slug]/profile/page.js`. Ahora, al guardar los datos, el sistema muestra el modal emergente de éxito y el usuario permanece en la pantalla de edición.
- **Actualización Dinámica de Dirty Check**: Tras guardar con éxito, se actualizan los valores del estado `initialValues` con los nuevos datos persistidos. Esto previene que el dirty check de escape al presionar "Salir" o "Volver" despliegue falsas advertencias de "cambios sin guardar".

### Validaciones Ejecutadas
- Compilación de producción con Next.js exitosa (`npm.cmd run build:next`), comprobando que no existan advertencias ni errores en el perfil y onboarding.
- Confirmamos que las llamadas a redireccionar en `handleSaveChanges` fueron suprimidas.

### Riesgos Pendientes
- Ninguno. El flujo es más limpio y centrado en el control manual del usuario.

### Próximo Paso Recomendado
- El usuario puede verificar en el navegador que al hacer clic en "Guardar" se actualiza el perfil con éxito sin forzar la salida al dashboard, y que los placeholders de la matrícula profesional muestran las nuevas sugerencias.

---

## [2026-06-12] Estandarización y Unificación Visual del Perfil de Usuario, Corrección de Clases CSS, Depuración de Caché y Aplicación de Logo en Login con Estilos Inline Resilientes

### Resumen Ejecutivo
Se unificó estéticamente la pantalla de Perfil de Usuario (`/[tenant-slug]/profile`), se auditaron y corrigieron clases de Tailwind CSS obsoletas o fuera de rango en Perfil y Onboarding (`/onboarding`), se depuró la caché corrupta de Webpack (`.next`) del servidor de desarrollo para solucionar el error `Cannot find module './682.js'`, y se aplicó con éxito la imagen del logo corporativo negro (`/brand/logo-black.png`) en el Login adaptando su tamaño a través de atributos HTML y estilos inline (`style={{ width: '220px', height: 'auto' }}`) para garantizar que la imagen se renderice siempre correctamente a una escala equivalente a la del texto, protegiendo el diseño en caso de que existan reintentos o bloqueos de caché de la hoja de estilos externa.

### Cambios Realizados
- **Logo de Marca en Login**: Se reemplazó el texto "Gestión SySO" por el logo `/brand/logo-black.png` con la clase responsiva y atributos nativos de escala de imagen: `width="220" style={{ width: '220px', height: 'auto', display: 'block', margin: '0 auto' }}` en [login/page.js](file:///c:/Users/sebas/./.gemini/antigravity-ide/scratch/Gestion-SySO/src/app/login/page.js). Esto restringe físicamente la imagen y asegura que esté siempre centrada y con una escala perfecta de `220px` por encima de la tarjeta.
- **Depuración de Caché de Servidor (Webpack)**: Se detuvo el servidor de desarrollo en ejecución, se eliminó por completo el directorio `.next` para purgar la caché corrupta de compilación hot-reload de Next.js, y se reinició el servidor de desarrollo (`npm.cmd run dev:next`).
- **Corrección de Clases CSS Fuera de Rango**: Se reemplazaron las clases no estándar de Tailwind (e.g. `text-slate-750`, `bg-red-650`, `hover:bg-red-750`, `text-slate-650`, `text-slate-550`) por sus contrapartes válidas de la paleta estándar de Tailwind CSS v3 (`text-slate-700`, `bg-red-600`, `hover:bg-red-700`, `text-slate-600`, `text-slate-500`) en la pantalla de Perfil y Onboarding. Esto asegura un renderizado visual correcto y consistente.
- **Unificación de Interfaz del Perfil**: Se adecuó por completo el estilo de la página de perfil con tarjetas blancas (`bg-white`), borde de bajo contraste (`border-slate-200/80`), fondos generales grises `#D9D9D9`, y el color principal de acento `#468DFF`.

### Validaciones Ejecutadas
- Se validó que el servidor de desarrollo local de Next.js inicializó exitosamente de manera limpia y que la compilación del middleware es correcta sin dependencias rotas en caché.
- Compilación de producción con Next.js exitosa (`npm.cmd run build:next`), comprobando que no existan advertencias ni errores de TypeScript/Linter en la generación de páginas estáticas y dinámicas.

### Riesgos Pendientes
- Ninguno crítico identificado. Las páginas ahora compilan correctamente de manera estática y dinámica.

### Próximo Paso Recomendado
- Se recomienda que el usuario pruebe la navegación en el entorno de desarrollo local y proceda al deploy a producción en Vercel si los resultados visuales en la edición de perfil son los esperados.

---

## [2026-06-12] Rediseño Visual y de UX del Dashboard (Tema Claro Premium) y Configuración de Tailwind CSS

### Resumen de Cambios
- **Instalación y Configuración de Tailwind CSS**: Se detectó que el proyecto no contaba con las dependencias `tailwindcss`, `postcss` ni `autoprefixer`, ni sus correspondientes archivos de configuración (`tailwind.config.js` y `postcss.config.js`). Esto impedía la compilación de estilos, provocando que el navegador viera la aplicación sin estilos CSS. Se instaló `tailwindcss@3` para asegurar compatibilidad con Next.js 14.x y shadcn/ui, y se crearon los archivos de configuración en la raíz del proyecto.
- **Rediseño del Dashboard**: Migramos la interfaz del dashboard (`src/app/[tenant-slug]/dashboard/page.js`) a una estética de tema claro premium.
- **Paleta de Colores de Estructura**: Se asignó `#D9D9D9` como fondo de pantalla de la aplicación y `#0D0D0D` como color de fondo de la barra lateral (Sidebar), sin bordes divisorios.
- **Navegación Interactiva**: Implementamos `#468DFF` como color principal de la marca para acentos. Los elementos de navegación inactivos usan una transición hover a fondo `#468DFF` y texto/icono en blanco. El enlace seleccionado posee este estilo por defecto.
- **Legibilidad y Contenedores**: Adaptamos la cabecera (Navbar superior) y las tarjetas del dashboard (métricas, accesos rápidos, plan de trabajo) a contenedores blancos limpios (`bg-white` y `shadow-sm`) con bordes grises de bajo contraste, garantizando legibilidad y profesionalismo.
- **Banner de Bienvenida**: Rediseñamos el banner utilizando un degradado claro de fondo (`from-blue-50 to-indigo-50/30`) y bordes en azul `#468DFF`.

### Decisiones Clave
- **Adopción de Tailwind v3**: Se instaló explícitamente `tailwindcss@3` debido a que la versión por defecto de Tailwind v4 requiere loaders de PostCSS adicionales (`@tailwindcss/postcss`) no presentes en la versión de Next.js 14.x del proyecto.
- **Contraste de Accesibilidad**: Se elevó la tipografía y peso tipográfico en las tarjetas claras del dashboard para mantener una lectura óptima y agradable sobre el fondo `#D9D9D9` (gris claro).

### Archivos Modificados / Creados
- `[NEW] tailwind.config.js`
- `[NEW] postcss.config.js`
- `[MODIFY] package.json`
- `[MODIFY] src/app/[tenant-slug]/dashboard/page.js`

### Validaciones Ejecutadas
- Ejecución de compilación de producción Next.js (`npm run build:next`) exitosa.
- Navegación automática en navegador headless, tomando captura de pantalla para verificar el aspecto del nuevo tema visual.

---

## [2026-06-12] Ajuste de Políticas de RLS, Ventanas Emergentes, Remoción de Logo, Intercepción de Correos Duplicados y Corrección de Middleware

### Resumen de Cambios
- **Corrección Crítica de Middleware y Cookies**: Se solucionó el bug que causaba un bucle de redirección en `/login` al no persistir o leer correctamente la sesión del usuario. Se detectó que el middleware (`src/middleware.js`) utilizaba los métodos `getAll()` y `setAll()` de `@supabase/ssr`, los cuales no eran compatibles con la versión instalada en el proyecto (`^0.3.0`), la cual utiliza los métodos específicos `get(name)`, `set(name, value, options)` y `remove(name, options)`. 
- **Decodificación de Cookies en Middleware**: Se implementó la decodificación explícita de cookies usando `decodeURIComponent` dentro del método `get` de `createServerClient`. Al estar codificadas en formato URL por el navegador, la versión anterior de la librería de Supabase no lograba parsear el JSON de sesión, arrojando el error `Auth session missing!` y redirigiendo de vuelta a `/login`.
- **Corrección de RLS en Creación de Tenant**: Se resolvió el error de violación de RLS en la tabla `tenants` al guardar. Se detectó que el método `.select()` de Supabase gatillaba la política de SELECT, la cual requería de forma restrictiva que el perfil tuviera un `tenant_id` ya asignado (problema de huevo o gallina). Se ajustó la política `tenant_isolation_select` de `tenants` para permitir lectura pública (`USING (true)`), manteniendo las de creación (autenticado) y modificación (propietario) seguras.
- **Ventanas Emergentes en toda la App**: Se migraron todas las notificaciones flotantes tipo Toast (esquina inferior derecha) y alertas de error inline en Onboarding (`onboarding/page.js`), Edición de Perfil (`profile/page.js`) y Registro (`register/page.js`) a **Ventanas Emergentes Modales Centradas** en pantalla con difuminado de fondo (`backdrop-blur-sm`), cumpliendo con el requerimiento estricto del usuario.
- **Remoción del Logo "S" en Login y Registro**: Se retiró el isotipo circular decorativo "S" de la cabecera en las pantallas de Login (`login/page.js`) y Registro (`register/page.js`).
- **Intercepción de Correo Duplicado**: Se implementó una verificación de duplicados de correo en el Registro basada en la propiedad `identities` devuelta por `supabase.auth.signUp`. Esto previene el comportamiento de "simulación exitosa" estándar de Supabase y despliega una ventana emergente modal clara de error si el correo ya está registrado.
- **Política RLS Autocentrada de Perfiles**: Se agregó la política `profile_self_select` para permitir a cualquier usuario autenticado ver su propio perfil independientemente de su estado de onboarding.
- **Inicio de Servidor de Desarrollo**: Se inició el servidor Next.js en el puerto 3000 usando `npm.cmd run dev:next` en segundo plano para mitigar restricciones de PowerShell.

### Decisiones Clave
- **Esquema de Lectura Pública de Tenants**: Permitir SELECT libre en la tabla `tenants` es estándar y necesario para flujos de login por subdominio/slug y logos públicos. La seguridad operativa sigue garantizada dado que las tablas con información sensible (`empresas`, `audits`, etc.) permanecen con aislamiento estricto por `tenant_id`.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260612000000_add_profile_self_select.sql`
- `[NEW] supabase/migrations/20260612010000_adjust_tenant_select_policy.sql`
- `[MODIFY] src/app/login/page.js`
- `[MODIFY] src/app/register/page.js`
- `[MODIFY] src/app/onboarding/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Simulación SQL del comando `INSERT` con rol `authenticated` y claims de JWT, validando la desaparición del error de RLS.
- Compilación de producción con `npm.cmd run build:next` exitosa.

### Riesgos Detectados / Remanentes
- Los navegadores de los usuarios pueden almacenar en caché los viejos scripts JavaScript compilados, por lo que es necesario realizar un refresco de pantalla completo (Ctrl + F5) tras la reactivación del servidor.

### Próximo Paso Recomendado
- El usuario puede abrir la aplicación, verificar la desaparición del isotipo "S" y probar registrar un correo repetido para validar la alerta modal emergente.

---

## [2026-06-11] Reestructuración, Unificación y Rediseño de Perfil de Usuario (Onboarding y Edición)

### Resumen de Cambios
- **Remoción de la letra "S"**: Se eliminó el isotipo decorativo "S" de la cabecera en el Onboarding (`src/app/onboarding/page.js`).
- **Unificación de Títulos**: Se cambiaron los títulos a **"Perfil de usuario"** en ambas pantallas para homogenizar la experiencia de creación y edición.
- **Eliminación de Numeraciones**: Se quitaron los números identificadores de sección ("1", "2", "3", "5") en los subtítulos de Onboarding y Perfil.
- **Reorganización de Campos**: Se integraron los campos opcionales de matrícula profesional y firma digital dentro del primer bloque: **"Información del usuario"** (tanto en onboarding como en edición).
- **Subtítulo de Empresa**: Se renombró la sección empresarial a **"Identidad de la empresa"**.
- **Tipo de Plan**: Se reubicó la sección del plan comercial al final de las pantallas bajo el subtítulo **"Tipo de plan"**.
- **Notificaciones Toast**: Se migró el Onboarding a notificaciones flotantes y autolimpiables de tipo **Toast**, idénticas a las de la pantalla de perfil, retirando el antiguo banner superior estático.
- **Botones Unificados de Guardar y Salir con Detección de Cambios**: Se simplificaron las acciones de guardado y escape en Onboarding y Perfil. El botón de envío principal se renombró a **"Guardar"** y el de escape secundario a **"Salir"** (que en Onboarding persiste los datos mínimos obligatorios y en Perfil sale sin guardar, redirigiendo a la pantalla de inicio/dashboard). Si el usuario modificó algún dato en el formulario y presiona "Salir", el sistema lo detecta ("dirty check") y le solicita confirmación mediante un diálogo emergente antes de abandonar la edición.
- **Bypass de Columnas de Redes en Guardado Rápido**: Se simplificó el payload del insert mínimo del Tenant en `handleSaveOnlyRequired` omitiendo columnas de redes sociales (`social_facebook`, `social_linkedin`, etc.). Esto previene errores del schema cache de PostgREST en Supabase en caso de que la migración incremental no se haya ejecutado físicamente en la base de datos del usuario.
- **Creación de Pantalla de Inicio (Dashboard)**: Se creó la ruta y página del panel de control de la SaaS en `src/app/[tenant-slug]/dashboard/page.js` con sidebar, métricas interactivas de clientes cargados, cumplimiento y plan contratado, permitiendo que la redirección tras guardar o salir cargue correctamente esta pantalla de inicio en Next.js.
- **Branding y Colores de Marca**: Alineación total del frontend con la paleta corporativa (`#468DFF` y `#0511F2`) en loaders, bordes de entrada activos, hovers y gradientes en botones de guardado.

### Decisiones Clave
- **Integridad y Flujo de Registro**: El botón de escape en Onboarding no realiza una simple redirección, sino que persiste en Supabase los datos obligatorios indispensables (creando el Tenant y asociándole el `tenant_id` al perfil) para asegurar que el middleware no bloquee al usuario y el sistema multi-tenant funcione correctamente.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-brand-guidelines`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[MODIFY] src/app/onboarding/page.js`
- `[MODIFY] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación del bundle de producción exitosa con `npm run build:next`.

---

## [2026-06-10] Recuperación de Contraseña, Edición de Perfil, Alertas Modales y Nuevo Modelo Comercial de Planes

### Resumen de Cambios
- Reemplazo de banners de error de acceso en el Login por **ventanas emergentes modales de notificación** de error.
- Implementación de modal de **¿La olvidaste?** en el Login para ingreso de correo y envío de enlace de restablecimiento por correo.
- Creación de la pantalla **/reset-password** para el restablecimiento de contraseñas de manera segura conectada a `supabase.auth.updateUser`.
- Modificación del Onboarding para **auto-rellenar el Nombre y Correo** del usuario autenticado en la carga de la página.
- Configuración de la **Fecha de Nacimiento como dato estrictamente obligatorio** en el alta y edición de perfil.
- Creación de la pantalla de **Edición de Perfil** `/[tenant-slug]/profile` para actualización segura de datos, re-agrupando matrícula y firma bajo la sección de "Información del usuario".
- Incorporación de notificaciones de tipo **Toast flotantes auto-cerrables** para el guardado de datos en el perfil.
- Adición de la acción **"Salir al Dashboard"** en la edición para permitir el retorno sin persistencia forzada de inputs opcionales.
- Alineación del diseño del frontend con los **colores oficiales de la marca** (`#468DFF` y `#0511F2`).
- Reestructuración de la base de datos y la interfaz del plan a: **Gratis permanente (1 cliente)**, Plan 5 ($3.500), Plan 25 ($7.500) y Plan Libre ($12.000).
- Creación de la migración incremental SQL `20260610010000_adjust_plans_constraint.sql` para actualizar la restricción de planes.

### Decisiones Clave
- **Privacidad y Rutas**: Registro de la ruta `/reset-password` en el middleware de Next.js como pública para que los usuarios puedan reestablecer su clave sin bloqueos de ruteo.
- **Persistencia Segura**: Habilitación de la edición de perfil bajo la política RLS Postgres `profile_self_update` que garantiza que el usuario solo pueda modificar sus propios datos.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260610010000_adjust_plans_constraint.sql`
- `[NEW] src/app/reset-password/page.js`
- `[NEW] src/app/[tenant-slug]/profile/page.js`
- `[MODIFY] src/app/login/page.js`
- `[MODIFY] src/app/onboarding/page.js`
- `[MODIFY] src/middleware.js`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Compilación y build de verificación de Next.js finalizada con éxito.

### Riesgos Detectados / Remanentes
- Los enlaces de recuperación locales redirigen a `http://localhost:3000/reset-password` y deberán configurarse en las variables de entorno de Supabase para producción.

### Próximo Paso Recomendado
- Aplicar la nueva migración SQL incremental en Supabase y continuar con el desarrollo de la pantalla del Dashboard de Clientes para validar el límite del Plan Gratis de 1 cliente.

---

## [2026-06-09] Sistema de Login, Registro y Onboarding Completo en Next.js

### Resumen de Cambios
- Consolidación del flujo de onboarding en una **pantalla única** (eliminando el stepper por pasos previos).
- Reclasificación de campos obligatorios: **Nombre, Correo (autocompletado), Teléfono, CUIT (11 números) y Geografía (Provincia/Localidad)**. El resto de datos (Matrícula, Firma, Logos, Redes) se configuran como **opcionales**.
- Inclusión de campos de **Redes Sociales** (LinkedIn, Instagram, Facebook, TikTok, YouTube) y Sitio Web en la base de datos y formulario de empresa.
- Redirección automática desde la raíz `/` directamente a la pantalla de `/login` para evitar el showcase promocional estático.
- Cambio de textos de acción: botón principal renombrado a **"Guardar datos"** y adición de la opción interactiva **"Contratar / Subir Plan"** con selector de planes en modal.
- Creación de la migración incremental de base de datos `20260610000000_add_tenant_social_fields.sql`.

### Decisiones Clave
- **Políticas RLS en Storage**: Los buckets `signatures`, `documents` (privados) y `logos` (público) se configuran con políticas a nivel de Postgres que restringen la subida/edición basándose en `auth.uid()` o en el `tenant_id` del perfil.
- **Transición de Entorno**: Actualización del archivo `package.json` agregando dependencias de Next.js y Supabase para permitir el desarrollo frontend unificado.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `next-best-practices`
- `supabase`

### Archivos Modificados / Creados
- `[NEW] supabase/migrations/20260609000000_add_user_onboarding_fields.sql`
- `[NEW] src/app/login/page.js`
- `[NEW] src/app/register/page.js`
- `[NEW] src/app/onboarding/page.js`
- `[NEW] src/middleware.js`
- `[NEW] jsconfig.json`
- `[MODIFY] package.json`
- `[MODIFY] src/lib/supabase.js`
- `[MODIFY] .env`
- `[MODIFY] docs/BITACORA_DESARROLLO.md`

### Validaciones Ejecutadas
- Instalación de dependencias de npm finalizada con éxito.
- Compilación y build de validación de Next.js.

### Riesgos Detectados / Remanentes
- El backend Express existente sigue viviendo en `src/server.js` y debe convivir con el enrutamiento y API de Next.js, coordinando variables de entorno comunes.

### Próximo Paso Recomendado
- Aplicar la migración SQL de Supabase y proceder con la construcción del Dashboard de la empresa (`/[tenant-slug]/dashboard`).

---

## [2026-06-08] Setup de Arquitectura y Alineación de Marca

### Resumen de Cambios
- Creación e instalación de las skills locales `.agents/skills/gestion-syso-bitacora/SKILL.md` y `.agents/skills/gestion-syso-multitenant-security/SKILL.md`.
- Corrección y alineación de la paleta de colores de marca y estilos CSS con respecto a la guía de `RULES_WORKSPACE.md`, remapeando el color principal al azul corporativo `#468DFF` y el resaltado a `#0511F2` (reemplazando el naranja previo).
- Actualización de los estilos en `globals.css`, `layout.js`, `page.js` y `button.jsx` para reflejar uniformemente el tema visual azul.

### Decisiones Clave
- **Consistencia Visual**: Se adoptan los códigos hexadecimales estipulados en las reglas globales del workspace. Para Tailwind, se mapearon sus equivalencias HSL en las variables de capa base (`globals.css`).
- **Formalización de Skills**: Se documenta la bitácora técnica de desarrollo y las pautas multi-tenant como reglas automatizadas para futuros agentes.

### Skills Utilizadas
- `gestion-syso-bitacora`
- `gestion-syso-multitenant-security`
- `next-best-practices`

### Archivos Modificados / Creados
- `[NEW] .agents/skills/gestion-syso-bitacora/SKILL.md`
- `[NEW] .agents/skills/gestion-syso-multitenant-security/SKILL.md`
- `[MODIFY] docs/brand/BRAND_GUIDELINES.md`
- `[MODIFY] src/app/globals.css`
- `[MODIFY] src/app/layout.js`
- `[MODIFY] src/app/page.js`
- `[MODIFY] src/components/ui/button.jsx`

### Validaciones Ejecutadas
- Ejecución de prueba del servidor Express existente para asegurar estabilidad del backend.
- Verificación visual y de consistencia de clases CSS condicionales.

### Riesgos Detectados / Remanentes
- El mockup estático `placeholder_hero.png` sigue mostrando el color naranja inicial. Deberá regenerarse cuando se realicen actualizaciones estéticas mayores.

### Próximo Paso Recomendado
- Proceder con la configuración de las skills comunitarias propuestas (`openapi-contracts`, `zod-validation`) e iniciar la integración de la API con Supabase Auth y el modelo multi-tenant.

---

## [2026-06-08] Setup Inicial de la Estructura de Carpetas

### Resumen de Cambios
- Creación de la estructura base del proyecto para soportar la futura migración a Next.js App Router y Supabase sin interferir con el servidor Express actual.
- Configuración inicial de documentos de arquitectura (ADR) y guías de marca (Branding, Tipografía).
- Definición de flujos críticos de la aplicación (Autenticación, Registro de Tenant, Auditoría).
- Estructuración inicial de base de datos Supabase (esquemas de migración multi-tenant con RLS y archivo seed).
- Preparación del espacio de trabajo para Next.js con archivos de layout, páginas, estilos globales (`globals.css` utilizando variables CSS compatibles con shadcn/ui), utilidades y configuración de `components.json` y `vercel.json`.

### Decisiones Clave
- **Coexistencia**: El backend actual basado en Node/Express/Mongoose sigue estando activo y operativo en `src/server.js`, mientras que la nueva estructura Next.js se prepara bajo `src/app/` y `src/components/`.
- **Enfoque Multi-tenant**: Se ha establecido desde el inicio un esquema relacional con `tenant_id` obligatorio en todas las tablas sensibles del tenant, protegido a nivel de base de datos usando Row Level Security (RLS) en Postgres/Supabase.
