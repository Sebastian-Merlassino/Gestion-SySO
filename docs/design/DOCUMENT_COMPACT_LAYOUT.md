# Estándar de Diseño: SySO-Document-Compact-Layout

Este estándar define el patrón visual y funcional para la carga y visualización de documentos en la plataforma SaaS **Gestión SySO**.

## Nombre Oficial del Patrón
> [!NOTE]
> **`SySO-Document-Compact-Layout`**

---

## 1. Comportamiento Visual
El patrón consta de dos elementos integrados de forma compacta:

1. **Cabecera de Control (Fila Flex Superior)**:
   - **Izquierda**: Etiqueta (`<label>`) en formato `text-xs font-bold text-slate-600` que define el nombre del documento a cargar.
   - **Derecha (Acciones Rápidas)**: Si hay un archivo cargado (local o remoto), se muestran los pictogramas de acciones en línea con el estilo premium del `SySO-AI-Voice-Helper`:
     - **Ver (Ojo - Eye)**: Botón con borde suave `border-slate-200` y hover con fondo azul `bg-blue-50 text-[#468DFF]`.
     - **Descargar (Descarga - Download)**: Botón idéntico con enlace de descarga directa en pestaña nueva.
     - **Eliminar (Papelera - Trash2)**: Botón con hover de peligro en fondo rojo `bg-red-50 text-red-600`. Oculto automáticamente en modo solo lectura (`disabled`).

2. **Zona de Dropzone Limpia (Contenedor Inferior)**:
   - Contenedor con borde discontinuo `border-dashed` que muestra el nombre del archivo cargado ("Archivo existente", "Archivo de Drive importado" o el nombre del archivo local) junto al ícono de documento, **libre de ruidos visuales e iconos de control internos**.

---

## 2. Invocación Técnica
Se invoca de forma directa a través del componente `<DocumentUploadZone />` proporcionando la prop `label`:

```javascript
import DocumentUploadZone from '@/components/ui/DocumentUploadZone';

<DocumentUploadZone
  label="Nombre del Documento"
  file={fileState}
  fileName={fileNameState}
  url={fileUrlState}
  signedUrl={fileSignedUrlState}
  onFileChange={handleFileChange}
  onDelete={handleFileDelete}
  onViewPdf={handleViewPdf}
  disabled={isFormDisabled}
  tenantId={tenant?.id}
  onToast={triggerToast}
/>
```

---

## 3. Beneficios
- **Ahorro de Espacio**: Elimina el maquetado repetitivo de filas y columnas en los formularios principales.
- **Acceso Directo**: Permite visualizar y descargar los archivos adjuntos directamente al inspeccionar registros en modo de solo lectura sin obligar al usuario a entrar en modo de edición.
- **Uniformidad**: Mantiene los botones de interacción alineados estéticamente al asistente de voz e inteligencia artificial del sistema.
