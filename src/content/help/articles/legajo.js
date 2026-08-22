// src/content/help/articles/legajo.js
import React from 'react';
import { 
  HelpPurpose, 
  HelpStep, 
  HelpTip, 
  HelpWarning, 
  HelpFaq, 
  HelpSection 
} from '@/components/help/HelpComponents';
import { Folder, UploadCloud, FileText, Download } from 'lucide-react';

export const legajoHelp = {
  key: 'legajo',
  title: 'Legajo Técnico Digital',
  subtitle: 'Repositorio documental de higiene, seguridad y medio ambiente por cliente',
  icon: Folder,
  tags: ['legajo', 'documentos', 'pdf', 'certificados', 'habilitaciones', 'planos', 'drive'],
  render: () => (
    <div className="space-y-5">
      <HelpPurpose>
        El **Legajo Técnico Digital** es el repositorio centralizado donde se archiva toda la documentación regulatoria de cada empresa cliente (ej. <em>Habilitaciones Municipales, Planos de Evacuación, Certificados de Desratización, Informes de ART, Seguro de Responsabilidad Civil</em>).
      </HelpPurpose>

      <HelpSection title="1. Carga y Organización de Archivos" id="carga">
        <HelpStep
          number={1}
          title="Selección de Categoría y Archivo"
        >
          Elegí la carpeta o categoría técnica correspondiente y arrastrá el archivo (PDF, JPG, PNG) al componente <strong>DocumentUploadZone</strong>.
        </HelpStep>

        <HelpStep
          number={2}
          title="Vigencia y Vencimiento del Documento"
        >
          Si el documento tiene una fecha de expiración (ej. póliza de seguro o certificado de desinfección), ingresá la fecha para recibir alertas anticipadas.
        </HelpStep>
      </HelpSection>
    </div>
  )
};
