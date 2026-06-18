# Bitácora de Desarrollo - Gestión SySO

Este documento registra las decisiones técnicas, cambios de arquitectura y progresos del proyecto de manera cronológica.

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
