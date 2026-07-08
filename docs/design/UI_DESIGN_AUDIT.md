# Auditoría integral de diseño UI — Gestión SySO

## 1. Resumen ejecutivo

Tras realizar una revisión profunda de las 16 rutas operativas dentro del tenant (`src/app/[tenant-slug]/`), las vistas públicas de acceso (`login`, `register`, `reset-password`) y los flujos de onboarding, se presenta el diagnóstico general del estado de consistencia visual del SaaS **Gestión SySO**.

*   **Estado general de consistencia visual**: El proyecto cuenta con un diseño base limpio y profesional, pero sufre de un alto grado de acoplamiento y duplicación de estilos en el código. Prácticamente todas las páginas actúan de forma aislada, repitiendo la maquetación del sidebar, del navbar superior, y construyendo de forma redundante elementos como modales de confirmación, inputs, tablas y botones a través de clases inline de Tailwind CSS.
*   **Módulos más inconsistentes**: 
    1.  `matriz-riesgos/page.js`: El archivo más extenso (~4700 líneas) con múltiples modales custom inline, inputs anidados de tamaño variable, sliders y badges locales.
    2.  `accidentes/page.js`: Muy acoplado, maquetando celdas complejas y modales de 5 porqués directamente con estilos inline y un sistema de gravedad que usa colores fuera de la marca.
    3.  `dashboard/page.js`: Utiliza tonos de color no estandarizados (como verdes y rojos intensos) y duplica el sidebar y navbar.
*   **Patrones tipográficos detectados**: Se observa una mezcla constante de clases de tamaño sin escala definida (`text-[8px]`, `text-[9px]`, `text-[10px]`, `text-xs`, `text-sm`, `text-base`), aplicadas de forma arbitraria en labels, tablas y badges.
*   **Colores detectados**: Aunque la marca especifica Azul Corporativo (`#468DFF`) y Azul Profundo (`#0511F2`), hay decenas de usos de colores hardcodeados (como el verde `#00b050` en 26 archivos y el rojo `#fa050b` en 4 lugares). Además, existe un error crítico y extendido de escritura con la clase **`border-slate-150`** (usada en más de 300 elementos en toda la app), la cual no está definida en Tailwind CSS ni en las variables CSS, lo que causa que los bordes dependan del color por defecto.
*   **Variantes de botones detectadas**: Se observan al menos 5 formas distintas de codificar botones primarios y secundarios de forma inline. Los botones del CRUD (Guardar, Cancelar, Editar, Eliminar, Documento) varían en padding, alturas y estilos de hover según la pantalla.
*   **Principales riesgos detectados**:
    *   **Riesgo Visual / Marca**: Mezcla de grises oscuros de fondo en CSS variables `:root` configuradas para Dark Mode, mientras que las páginas e interfaces usan clases light de Tailwind, generando inconsistencia en sombras y componentes Radix UI.
    *   **Riesgo UX**: Modales de confirmación de eliminación duplicados inline en cada página. Si se requiere un cambio en el diseño de alertas, se deberán modificar 16 archivos JS.
    *   **Riesgo Responsive**: Modales de visualización de fotos, inputs y tablas que se desbordan en tablets y móviles debido a anchos estáticos (`min-w-[850px]`, `max-w-4xl`) y falta de contenedores con scroll horizontal apropiado.
*   **Nivel de prioridad de normalización**: **CRÍTICA**. Es imperativo estandarizar los componentes y variables de diseño antes de continuar agregando funcionalidades para evitar mayor deriva técnica y deuda de arquitectura.

---

## 2. Mapa visual por sección

La siguiente tabla evalúa la salud visual de las secciones clave analizadas:

| Sección | Ruta | Estado visual | Tipografía | Colores | Botones | Formularios | Tablas | Riesgo |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| **Login** | `/login` | Regular | Aceptable (Inter) | Bueno (Usa marca) | Inline custom | Inline custom | N/A | Bajo |
| **Register** | `/register` | Regular | Aceptable | Bueno | Inline custom | Inline custom | N/A | Bajo |
| **Onboarding** | `/onboarding` | Regular | Aceptable | Bueno | Inline custom | Inline custom | N/A | Bajo |
| **Dashboard** | `/[tenant-slug]/dashboard` | Crítico | Inconsistente (Tamaños inline) | Malo (Usa `#00b050` y `#fa050b`) | Inline custom | N/A | Inconsistente (Celdas duras) | Alto |
| **Clientes** | `/[tenant-slug]/empresas` | Regular | Inconsistente | Inconsistente (`slate-150` / `red-50`) | Inline custom | Inline custom | Estilo custom (arrow keys) | Medio |
| **Equipo** | `/[tenant-slug]/equipo` | Regular | Inconsistente | Inconsistente (`slate-150`) | Inline custom | Inline custom | Estilo custom | Medio |
| **Visitas** | `/[tenant-slug]/visitas` | Crítico | Mezcla de text-xs, text-sm, uppercase | Inconsistente (colores manuales) | Inline custom | Inline custom | Sin indicadores de orden | Alto |
| **Programa Anual** | `/[tenant-slug]/programa` | Regular | Aceptable | Inconsistente (`#00b050`) | Inline custom | Inline custom | Arrow indicators | Medio |
| **Capacitaciones**| `/[tenant-slug]/capacitacion` | Regular | Aceptable | Inconsistente (`#00b050`) | Inline custom | Inline custom | Arrow indicators | Medio |
| **Matriz Riesgos**| `/[tenant-slug]/matriz-riesgos`| Crítico | Muy inconsistente (Microtextos `text-[9px]`) | Inconsistente (colores de riesgo inline) | Inline custom | Altamente complejo y custom | Compleja (Doble scroll) | Crítico |
| **Accidentes** | `/[tenant-slug]/accidentes` | Crítico | Inconsistente (Títulos custom) | Inconsistente (Gravedad no estándar) | Inline custom | Complejo y custom | Estructura densa | Crítico |
| **Extintores** | `/[tenant-slug]/extintores` | Regular | Inconsistente | Inconsistente (`#00b050`) | Inline custom | Inline custom | Estilo custom | Medio |
| **Legajo Técnico**| `/[tenant-slug]/legajo` | Regular | Aceptable | Inconsistente (`slate-150`) | Inline custom | Inline custom | Arrow indicators | Medio |
| **Nómina** | `/[tenant-slug]/nomina` | Regular | Inconsistente | Inconsistente (`red-50`) | Inline custom | Inline custom | Estilo custom | Medio |
| **Perfil** | `/[tenant-slug]/profile` | Regular | Bueno (Estandarizado) | Bueno (Usa marca) | Reusable (Button jsx) | Inline custom | N/A | Bajo |

---

## 3. Inventario tipográfico

Se detalla la jerarquía tipográfica real mapeada en la aplicación:

| Uso | Clase / Tamaño actual | Módulos donde aparece | Problema | Recomendación |
| :--- | :--- | :--- | :--- | :--- |
| **Títulos de Página** | `font-outfit text-base md:text-lg font-bold` | Todos los módulos en Navbar (`header`) | Consistente, pero se define inline en cada archivo. No usa componente común. | Crear un `<AppPageHeader />` que centralice el estilo y la barra superior de acciones. |
| **Secciones del Formulario** | `font-outfit text-sm font-bold uppercase tracking-wider` | `visitas`, `matriz-riesgos`, `extintores`, `profile` | Consistente en la mayoría, pero varía en padding inferior (`pb-1.5` vs `pb-2`) y alineaciones. | Unificar con un componente `<AppSectionHeader />` o token global CSS. |
| **Labels de Formulario** | `text-xs font-bold text-slate-500 uppercase tracking-wider` | `profile`, `visitas`, `accidentes` | Uso de múltiples variantes: a veces se usa `<span>` en lugar de `<label>`, a veces tamaño `text-[10px]` sin tracking. | Estandarizar bajo el componente `<AppLabel />` con clases predefinidas de la marca. |
| **Inputs de Formulario** | `text-sm px-3.5 py-2` vs `text-xs px-3 py-1.5` | `profile` (sm), `visitas` (xs/sm) | Mezcla de tamaños de texto y paddings que rompe la alineación en grillas de formulario. | Definir un `<AppInput />` con tamaño y paddings consistentes (`h-10 text-sm`). |
| **Textos Clarificatorios** | `text-xs text-slate-500` / `text-[10px] text-slate-400` | `login`, `register`, `onboarding`, `visitas` | Diferentes tamaños e interlineados para los subtítulos de ayuda. | Estandarizar bajo un helper `<AppHelpText />`. |
| **Tabla (Encabezado)** | `text-xs font-bold text-slate-400 uppercase tracking-wider` | `visitas`, `programa`, `legajo`, `correctivas`, `matriz-riesgos` | Generalmente consistente, pero algunos agregan `select-none` y otros no. | Centralizar en un `<AppTable />` o normalizar la clase de encabezado. |
| **Tabla (Celdas)** | `text-xs font-normal text-slate-700` | Todos los listados | Algunos campos de nombre clave usan `font-semibold text-slate-900` y otros `font-medium text-slate-600`. | Normalizar la jerarquía de lectura de celdas primarias vs secundarias. |
| **Badges de Estado** | `text-[8px]` / `text-[10px]` font-bold uppercase | `dashboard`, `visitas`, `programa`, `correctivas` | Alturas e interletrados inconsistentes. Algunos usan `font-extrabold`, otros `font-bold`. | Crear un componente `<AppBadge />` con variantes controladas de color y tamaño. |
| **Alertas Inline** | `text-xs text-red-500` / `text-[10px] font-bold` | `programa`, `empresas`, `profile` | Se muestran textos de error sin un estilo visual contenedor o unificado. | Utilizar el componente `<AppFieldError />` para mensajes de validación inline. |

---

## 4. Inventario de colores

Se relevaron los colores aplicados directamente en el código de forma inline:

| Color / Clase | Uso actual | Módulos | Pertenece a marca | Problema | Recomendación |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **`#468DFF`** (Azul) | Fondos, bordes, textos activos | Todos los módulos | **Sí** (Principal) | Hardcodeado inline en clases de Tailwind (ej. `bg-[#468DFF]`). | Mapear al token `primary` de Tailwind. |
| **`#0511F2`** (Azul acento)| Hover de botones, foco | Todos los módulos | **Sí** (Highlight) | Hardcodeado inline (`bg-[#0511F2]`, `text-[#0511F2]`). | Mapear al token `primary-hover` o acento. |
| **`#00b050` / `#00B050`** | Estados exitosos (Vigente, Completado, Cerrado) | `dashboard`, `matriz-riesgos`, `correctivas`, `visitas`, `ToastProvider` | **No** (Marca usa `#22c55e`) | Hardcodeado directamente en **26 archivos** en lugar de usar Tailwind. Rompe el verde de seguridad estándar. | Estandarizar bajo el token de color `success` en Tailwind y usar el verde institucional `#22c55e`. |
| **`#fa050b`** (Rojo) | Indicadores de alerta, atrasos | `programa`, `dashboard` | **No** (Marca usa `#ef4444`) | Color rojo eléctrico no coincidente con el rojo de alerta corporativo. | Reemplazar por el token `error` / `destructive` (Safety Red `#ef4444`). |
| **`border-slate-150`** | Bordes de tarjetas y tablas | Todos los módulos (318 referencias) | **No** (No existe en Tailwind) | Clase inexistente en Tailwind CSS. Causa que el color de borde dependa del fallback por defecto. | Reemplazar en bloque por `border-slate-200` o mapear a un token de borde unificado en CSS variables. |
| **`border-amber-250`** | Bordes en panel de advertencia | `empresas/page.js` | **No** (No existe) | Clase inexistente en Tailwind CSS. | Reemplazar por `border-amber-200`. |
| **`bg-red-55`** | Fondos de alerta / botones | `matriz-riesgos`, `empresas` | **No** (Inexistente) | Clase inexistente en Tailwind CSS. | Reemplazar por `bg-red-50`. |

---

## 5. Inventario de botones

Variantes de botones encontradas y su consistencia:

| Tipo de botón | Clases actuales | Módulos | Problema | Recomendación |
| :--- | :--- | :--- | :--- | :--- |
| **Primario (Formulario)** | `px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#468DFF]/10 active:scale-[0.98]` | `visitas`, `programa`, `matriz-riesgos`, `legajo` | Generalmente alineado en clases, pero repetido inline en cada formulario. | Centralizar variantes en el componente `<AppButton variant="primary" />`. |
| **Secundario / Salir** | `px-5 py-2.5 bg-[#FFFFFF] text-[#468DFF] border border-[#468DFF] rounded-xl text-sm font-bold hover:bg-[#468DFF] hover:text-[#FFFFFF] hover:border-[#FFFFFF]` | `visitas`, `programa`, `profile` | Padding y transiciones inconsistentes con respecto al primario. | Centralizar en `<AppButton variant="secondary" />`. |
| **Acción Editar (Tabla)**| `p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100` | `visitas`, `correctivas`, `legajo`, `equipo` | Algunos módulos usan hover de fondo distinto. | Estandarizar bajo `<AppButton variant="edit-table" size="icon" />`. |
| **Acción Eliminar (Tabla)**| `p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100` / `bg-red-500/10 text-red-400 hover:bg-red-650` | `visitas`, `nomina`, `legajo`, `accidentes` | Diferentes intensidades de rojo e iconos según el listado. | Estandarizar bajo `<AppButton variant="delete-table" size="icon" />`. |
| **Acción Documento** | `p-1.5 rounded-lg bg-[#EFF6FF] text-[#468DFF] hover:bg-[#DBEAFE] hover:text-[#0511F2]` | `visitas`, `programa`, `legajo` | Cumple visualmente con las directrices de marca, pero sufre de duplicación inline. | Centralizar variante como `variant="document-table"`. |
| **Selectores de Opciones (Sí/No)** | `flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all bg-[#468DFF] text-white border-[#468DFF]` | `visitas`, `extintores`, `checklist-personalizados` | Estos no actúan como botones de acción, sino como inputs. Deberían comportarse de manera unificada. | Crear un componente reutilizable `<AppButtonGroupSelector />` para inputs de opción única. |

---

## 6. Inventario de formularios

Se analiza la estructura de los campos de entrada de datos:

| Elemento | Variante actual | Módulos | Problema | Recomendación |
| :--- | :--- | :--- | :--- | :--- |
| **Input de Texto** | `border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50` | Todos los módulos | Altamente inconsistente en paddings y alturas. El focus ring no se implementa siempre. | Crear `<AppInput />` que centralice el borde, redondeo, focus styling y deshabilitados. |
| **Select Dropdown** | `w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-700 bg-slate-50/50` | `visitas`, `programa`, `correctivas` | Algunos selects usan `text-xs` y otros `text-sm`. La flecha nativa del select a veces se deforma. | Crear `<AppSelect />` con estilos unificados y anchos fijos responsivos. |
| **Textareas** | `w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 min-h-[80px]` | `visitas`, `accidentes`, `correctivas` | Tienen diferentes alturas mínimas. Algunos carecen del botón de dictado de voz obligatorio `<AITextHelper />`. | Centralizar bajo `<AppTextarea />` garantizando la inyección automática del Voice Helper. |
| **Campos Obligatorios** | `*` en texto plano vs `<span className="text-[#468DFF]">*</span>` vs `<span className="text-red-500 ml-1 font-bold">*</span>` | `visitas`, `profile`, `extintores`, `accidentes` | No hay un estándar sobre el color y la posición del asterisco. | Estandarizar bajo `<AppLabel required />` para que pinte el asterisco en color corporativo de forma automática. |
| **Errores de Campo** | Texto inline rojo inline debajo del campo | `programa`, `empresas` | Muchos módulos no muestran errores inline, sino que confían en que el formulario no compile. | Estandarizar bajo `<AppFieldError error={message} />`. |

---

## 7. Inventario de tablas

Se analiza la estructura de grillas de datos principales:

| Módulo | Encabezados | Celdas | Acciones | Empty state | Responsive | Problema |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Visitas** | `bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider` | `px-6 py-4` con `font-semibold` / `font-medium` | Visualizar PDF (azul) | `py-20 text-slate-400 font-bold bg-slate-50/10` | Con scroll horizontal | Sin visualizadores de ordenación activa. Celdas de acción unificadas. |
| **Programa** | Similar | Similar | Editar (amarillo), Eliminar (rojo), Doc | `py-20 text-slate-400 font-bold bg-slate-50/10` | Con scroll horizontal | Muestra indicadores textuales ` ▲` / ` ▼` simples en lugar de iconos Lucide. |
| **Matriz** | `bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10` | Densas, microtexto `text-[9px]` | Editar, Eliminar, Ver | No se encontraron resultados | Con scroll horizontal | Las celdas tienen inputs y colores de severidad manuales. Scroll horizontal tosco. |
| **Nomina** | Similar | Normal, con verificaciones rojas si están vacíos | Eliminar | `py-12 px-6 text-center text-slate-400 italic` | Con scroll horizontal | Celdas de nómina pintan errores manuales en rojo si los datos están vacíos. |
| **Correctivas**| Similar | Normal | Ver, Eliminar | `No se encontraron acciones...` | Con scroll horizontal | Estados de color manuales. |

---

## 8. Inventario de cards y contenedores

| Componente / Módulo | Clases actuales | Problema | Recomendación |
| :--- | :--- | :--- | :--- |
| **Contenedores de Listados** | `bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col` | Uso masivo del border `border-slate-150` (inexistente). | Estandarizar bajo `<AppCard className="overflow-hidden" />` con borde `border-slate-200`. |
| **Cards de Estadísticas** | `p-3 sm:p-4 rounded-xl border border-green-400 bg-green-100 flex flex-col justify-between shadow-sm` | `dashboard/page.js` define de forma manual y dura las cards de color verde, amarillo y rojo. | Normalizar clases de cards informativas, con bordes y fondos más sutiles. |
| **Filtros / Buscador** | `bg-white rounded-2xl border border-slate-150 p-3 shadow-sm space-y-3 shrink-0` | Cada página define inline el contenedor de filtros de búsqueda. | Crear un componente `<AppFilterBar />` que simplifique la estructura. |

---

## 9. Revisión de mayúsculas y minúsculas

Se identifican importantes inconsistencias en el tratamiento de textos y mayúsculas:
*   **Encabezados de sección de formularios**: `SECCIÓN 2: GESTIÓN DE ACCIDENTES E INCIDENTES` (Todo en mayúscula) en `visitas/page.js`, pero en `correctivas/page.js` se usa `Acciones Correctivas Registradas` (Title Case).
*   **Nombre de campos / Labels**: Mezcla de Title Case (`Nombre y Apellido`, `Razón Social`) con Sentence Case (`¿Ocurrieron incidentes o accidentes laborales desde la última visita?`).
*   **Columnas de Tablas**: Mezcla de Title Case (`Razón Social`, `Responsable Presente`) con Sentence Case/Minúsculas (`Doc`, `Acciones`).
*   **Placeholder de Inputs**: Mayormente Sentence Case, pero en algunos campos se usan mayúsculas para indicar formatos (`CUIT`).
*   **Regla Estándar Propuesta**:
    1.  **Títulos de Módulo y Modal**: Siempre **Title Case** (`Registrar Nueva Visita`).
    2.  **Encabezados de Sección interna**: Siempre **UPPERCASE con tracking-wider** (`1. DATOS GENERALES`).
    3.  **Labels de Campos**: Siempre **Title Case** (`Razón Social`, `Establecimiento *`).
    4.  **Preguntas / Checkbox Labels**: Siempre **Sentence Case** (`¿Se realizó la investigación del accidente?`).
    5.  **Placeholders**: Siempre descriptivos en **Sentence Case** (`Ingrese la razón social de la empresa...`).
    6.  **Botones**: Siempre **Title Case** para acciones (`Guardar Cambios`, `Cancelar`, `Eliminar`).

---

## 10. Revisión responsive

Mapeo de la adaptabilidad móvil de los componentes:

| Módulo | Desktop | Tablet | Mobile | Problema | Recomendación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sidebar** | Expandido (`w-64`) | Colapsado (`w-20`) | Oculto (Drawer) | Correcto, pero la lógica de estado se duplica en 16 archivos. | Centralizar la estructura en un Layout de Next.js. |
| **Tablas** | Correcto | Scroll horizontal | Scroll horizontal | En móviles, el scroll horizontal obliga a arrastrar la pantalla. Columnas secundarias deberían ocultarse. | Implementar clases `hidden lg:table-cell` en columnas secundarias para visualización adaptativa. |
| **Modales** | Centrado (`max-w-sm` / `md`) | Centrado | Ocupa toda la pantalla | Algunos modales tienen anchos fijos que se desbordan o cortan en móviles pequeños. | Asegurar que los modales tengan `w-full max-w-[90vw] md:max-w-md` y manejen scroll interno. |
| **Filtros** | Barra horizontal | Apilados | Ocultos tras botón | Funcionamiento consistente en `visitas` y `programa`, pero la lógica responsive se duplica inline. | Centralizar en un subcomponente responsivo. |

---

## 11. Revisión de accesibilidad visual

*   **Contraste**: El texto secundario `text-slate-400` y `text-slate-500` sobre fondos grises (`bg-slate-50`) posee un contraste que no supera el estándar WCAG AA de `4.5:1` en tamaños de texto pequeños (`text-xs`).
*   **Foco Visible**: El uso generalizado de `focus:outline-none` en campos de texto, sin un `focus:ring-2 focus:ring-primary` alternativo en algunos inputs, dificulta la navegación por teclado.
*   **Tamaño Táctil de Botones**: En móviles, los botones pequeños de acciones de tabla (`h-7.5 w-7.5` o paddings muy estrechos) quedan por debajo del área recomendada de `44x44px` para interacción táctil de las pautas de accesibilidad móvil.
*   **Dependencia Exclusiva del Color**: La severidad en la matriz de riesgos y el estado de vigencia de extintores depende exclusivamente del fondo de celda de color (`#00b050`, `#fa050b`), lo que dificulta la comprensión para usuarios daltónicos si no se acompaña de etiquetas textuales legibles.

---

## 12. Hallazgos críticos

| ID | Hallazgo | Evidencia | Impacto | Recomendación | Archivo |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **HC-01** | Uso de clase inexistente `border-slate-150` | `border-slate-150` repetido 318 veces | Alto | Reemplazar masivamente por `border-slate-200`. | 12 archivos bajo `src/app/` |
| **HC-02** | Contradicción de CSS variables `:root` | `:root` tiene HSL oscuros (Dark Mode) pero las páginas usan Tailwind light. | Alto | Estandarizar `:root` para Light Mode y mapear Dark Mode en la clase `.dark`. | `src/app/globals.css` |
| **HC-03** | Modales de Confirmación duplicados inline | Cada página implementa su markup y estado local para confirmar borrados. | Alto | Migrar al uso del hook o componente unificado `@/components/ui/AppConfirmDialog`. | 13 páginas bajo `[tenant-slug]` |

---

## 13. Hallazgos altos

| ID | Hallazgo | Evidencia | Impacto | Recomendación | Archivo |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **HA-01** | Color verde de éxito no institucional | Hardcodeo de `#00b050` / `#00B050` | Medio | Reemplazar por el color institucional `#22c55e` (Safety Green) mapeado a `success`. | 26 archivos bajo `src/` |
| **HA-02** | Color rojo de alerta no institucional | Hardcodeo de `#fa050b` | Medio | Reemplazar por el rojo corporativo `#ef4444` (Safety Red) mapeado a `destructive`. | `programa/page.js`, `dashboard/page.js` |
| **HA-03** | Duplicación masiva de Sidebar y Layout | `<Sidebar ... />` instanciado y controlado localmente en cada página. | Medio | Mover el Sidebar al layout global de Next.js (`/[tenant-slug]/layout.js`). | 16 páginas de tenant |

---

## 14. Hallazgos medios

| ID | Hallazgo | Evidencia | Impacto | Recomendación | Archivo |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **HM-01** | Inputs manuales en lugar de componente | `<input className="..." />` repetido en todos los formularios. | Bajo | Reemplazar por un componente `<AppInput />`. | Todos los formularios |
| **HM-02** | Spinners de carga inconsistentes | `Loader2` con tamaños `h-5`, `h-8`, `h-10` y alineaciones manuales. | Bajo | Crear el componente `<AppLoadingSpinner size="sm/md/lg" />`. | Todos los módulos |
| **HM-03** | Alturas calc duras en tablas | `style={{ height: 'calc(100vh - 240px)' }}` inline en 11 archivos. | Bajo | Centralizar el cálculo de altura responsive en un componente o helper CSS. | 11 archivos de página |

---

## 15. Hallazgos bajos y observaciones

| ID | Hallazgo | Evidencia | Impacto | Recomendación | Archivo |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **HB-01** | Indicadores de ordenación textuales | Uso de ` ▲` y ` ▼` crudos en las tablas. | Bajo | Reemplazar por iconos dinámicos de Lucide React (`ChevronUp`, `ChevronDown`). | `programa/page.js`, `legajo/page.js` |
| **HB-02** | Falta de indicadores de orden | Las tablas no muestran en qué columna está ordenado el listado. | Bajo | Mostrar de manera clara qué columna tiene el orden activo. | `visitas/page.js` |
| **HB-03** | Asterisco obligatorio inconsistente | Varias formas de codificar la marca requerida en inputs. | Bajo | Centralizar en la prop `required` del componente `<AppLabel />`. | Todos los formularios |
