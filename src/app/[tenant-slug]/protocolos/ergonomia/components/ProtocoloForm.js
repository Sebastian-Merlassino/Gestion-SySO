// src/app/[tenant-slug]/protocolos/ergonomia/components/ProtocoloForm.js
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/providers/ToastProvider';
import AppButton from '@/components/ui/AppButton';
import AppInput from '@/components/ui/AppInput';
import AppSelect from '@/components/ui/AppSelect';
import AppCard from '@/components/ui/AppCard';
import AppTextarea from '@/components/ui/AppTextarea';
import AppLabel from '@/components/ui/AppLabel';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import AppUnsavedChangesDialog from '@/components/ui/AppUnsavedChangesDialog';
import DocumentUploadZone from '@/components/ui/DocumentUploadZone';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import AITextHelper from '@/components/ui/AITextHelper';
import AppLoadingSpinner from '@/components/ui/AppLoadingSpinner';
import { 
  Building, 
  Trash2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  AlertTriangle,
  Loader2, 
  FileText, 
  Mail,
  Download,
  Copy,
  Info,
  Calendar,
  Zap,
  CheckCircle2,
  Trash,
  ArrowLeft,
  X,
  ShieldCheck,
  MapPin,
  PenTool,
  RotateCcw
} from 'lucide-react';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import Resolucion886Modal from './Resolucion886Modal';

export const CUESTIONARIOS_PLANILLA2 = {
  levantamiento: {
    isTwoStep: true,
    paso1: [
      { id: 'p1_1', text: 'Levantar y/o bajar manualmente cargas de peso superior a 2 kg. y hasta 25 kg.' },
      { id: 'p1_2', text: 'Realizar diariamente y en forma cíclica operaciones de levantamiento / descenso con una frecuencia > 1 por hora o < 360 (si se realiza en forma esporádica consignar NO)' },
      { id: 'p1_3', text: 'Levantar y/o bajar manualmente cargas de peso superior a 25 kg.' }
    ],
    paso2: [
      { id: 'p2_1', text: 'El trabajador levanta, sostiene y deposita la carga sobrepasando con sus manos 30 cm sobre la altura del hombro' },
      { id: 'p2_2', text: 'El trabajador levanta, sostiene y deposita la carga sobrepasando con sus manos una distancia horizontal mayor a 80 cm desde el punto medio entre los tobillos' },
      { id: 'p2_3', text: 'Entre la toma y el deposito de la carga, el trabajador gira o inclina la cintura mas de 30° a uno u otro (o a ambos) considerados desde el plano sagital' },
      { id: 'p2_4', text: 'Las cargas poseen formas irregulares, son difíciles de asir, se deforman o hay movimiento en su interior' },
      { id: 'p2_5', text: 'El trabajador levanta, sostiene y deposita la carga con un solo brazo' },
      { id: 'p2_6', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el ART 1 de la presente Resolución' }
    ]
  },
  empuje_arrastre: {
    isTwoStep: true,
    paso1: [
      { id: 'p1_1', text: 'Se realizan diariamente tareas cíclicas con una frecuencia >1 movimientos por jornada (si son esporádicas consignar NO)' },
      { id: 'p1_2', text: 'El trabajador se desplaza empujando y/o arrastrando manualmente un objeto recorriendo una distancia mayor a 60 mts.' },
      { id: 'p1_3', text: 'En el puesto de trabajo se empujan o arrastran cíclicamente objetos (bolsones, cajas, muebles, maquinas etc.) cuyo esfuerzo medido con dinamómetro superior a 34 kgf' }
    ],
    paso2: [
      { id: 'p2_1', text: 'Para empujar el objeto rodante se requiere un esfuerzo inicial medido con dinamómetro > 12 kgf para hombres o 10 kgf para mujeres' },
      { id: 'p2_2', text: 'Para arrastrar el objeto rodante se requiere un esfuerzo inicial medido con dinamómetro > 10 kgf para hombres o mujeres' },
      { id: 'p2_3', text: 'El objeto rodante es empujado y/o arrastrado con dificultad (la superficie de deslizamiento es despareja, hay rampas que subir o bajar, hay roturas u obstáculos en el recorrido, ruedas en mal estado, mal diseño del asa etc.)' },
      { id: 'p2_4', text: 'El objeto rodante no puede ser empujado y/o arrastrado con ambas manos, y en caso de que lo permita, el apoyo de las manos se encuentra a una altura incomoda (por encima del pecho o por debajo de la cintura)' },
      { id: 'p2_5', text: 'En el movimiento de empujar y/o arrastrar, el esfuerzo inicial requerido se mantiene significativamente una vez puesto en movimiento el objeto (se produce atascamiento de las ruedas, tirones o falta de deslizamiento uniforme)' },
      { id: 'p2_6', text: 'El trabajador empuja o arrastra el objeto rodante asiéndolo con una sola mano' },
      { id: 'p2_7', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el artículo 1 de la presente resolución' }
    ]
  },
  transporte: {
    isTwoStep: true,
    paso1: [
      { id: 'p1_1', text: 'Transporta manualmente carga superiores a 2 kg. Hasta 25 kg.' },
      { id: 'p1_2', text: 'El trabajador se desplaza sosteniendo manualmente la carga recorriendo una distancia mayor a 1 metro' },
      { id: 'p1_3', text: 'Realiza diariamente en forma cíclica (si es esporádica consignar NO)' },
      { id: 'p1_4', text: 'Se transporta manualmente cargas a una distancia superior a 20 mts.' },
      { id: 'p1_5', text: 'Se transporta manualmente cargas superiores a 25 kg.' }
    ],
    paso2: [
      { id: 'p2_1', text: 'En condiciones habituales de levantamiento el trabajador transporta la carga entre 1 y 10 metros con una masa acumulada (el producto de la masa por frecuencia) mayor que 10.000 kg durante la jornada habitual' },
      { id: 'p2_2', text: 'En condiciones habituales de levantamiento el trabajador transporta la carga entre 10 y 20 metros con una masa acumulada (el producto de la masa por la frecuencia) mayor a 6.000 kg durante la jornada habitual' },
      { id: 'p2_3', text: 'Las cargas poseen formas irregulares, son difíciles de asir, se deforman o hay movimientos en su interior' },
      { id: 'p2_4', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el artículo 1 de la presente Resolución' }
    ]
  },
  bipedestacion: {
    isTwoStep: true,
    paso1: [
      { id: 'p1_1', text: 'El puesto de trabajo se desarrolla en posición de pie, sin posibilidad de sentarse durante 2 horas seguidas o mas' }
    ],
    paso2: [
      { id: 'p2_1', text: 'En el puesto se realizan tareas donde se permanece de pie durante 3 horas seguidas o más, sin posibilidades de sentarse con escasa deambulación (caminando no más de 100 mts. Por hora).' },
      { id: 'p2_2', text: 'En el puesto se realizan tareas donde se permanece de pie durante 2 horas seguidas o más, sin posibilidades de sentarse o con escasa deambulación levantando y transportando cargas > 2 kg.' },
      { id: 'p2_3', text: 'Trabajos efectuados con bipedestación prolongada en ambientes donde la temperatura y humedad del aire sobrepasan los limites legalmente admisibles y que demanden actividad física.' },
      { id: 'p2_4', text: 'El trabajador presenta alguna manifestación temprana de enfermedades mencionadas en el artículo 1° de la presente Resolución.' }
    ]
  },
  mov_repetitivos: {
    isTwoStep: true,
    paso1: [
      { id: 'p1_1', text: 'Realizar diariamente una o más tareas donde se utilizan las extremidades superiores, durante 4 o más horas en la jornada habitual de trabajo en forma cíclica (en forma continuada o alternada)' }
    ],
    paso2: [
      { id: 'p2_1', text: 'Las extremidades superiores están activas por más del 40% del tiempo total del ciclo de trabajo' },
      { id: 'p2_2', text: 'En el ciclo de trabajo se realiza un esfuerzo superior a moderado a 3 según la escala de Borg, durante más de 6 segundos y más de una vez por minuto.' },
      { id: 'p2_3', text: 'Se realiza un esfuerzo superior a 7 según la escala de Borg.' },
      { id: 'p2_4', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el artículo 1º de la presente resolución' }
    ]
  },
  posturas_forzadas: {
    isTwoStep: true,
    paso1: [
      { id: 'p1_1', text: 'Adoptar posturas forzadas en forma habitual durante la jornada de trabajo, con o sin aplicación de fuerza. (No se deben considerar si las posturas son ocasionales)' }
    ],
    paso2: [
      { id: 'p2_1', text: 'Cuello en extensión, flexión, lateralización y/o rotación' },
      { id: 'p2_2', text: 'Brazos por encima de los hombros o con movimientos de supinación, pronación o rotación' },
      { id: 'p2_3', text: 'Muñecas y manos en flexión, extensión desviación cubital o radial' },
      { id: 'p2_4', text: 'Cintura en flexión, extensión, lateralización y/o rotación' },
      { id: 'p2_5', text: 'Miembros inferiores: trabajo en posición de rodillas o cuclillas' },
      { id: 'p2_6', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el Artículo 1º de la presente resolución' }
    ]
  },
  vibraciones_mano_brazo: {
    isTwoStep: true,
    paso1: [
      { id: 'p1_1', text: 'Trabajar con herramientas que producen vibraciones (martillo neumático, perforadora, destornilladores, pulidoras, esmeriladoras, otros).' },
      { id: 'p1_2', text: 'Sujetar piezas con las manos mientras estas son mecanizadas' },
      { id: 'p1_3', text: 'Sujetar palancas, volantes, etc. Que transmiten vibraciones' }
    ],
    paso2: [
      { id: 'p2_1', text: 'El valor de las vibraciones supera los límites establecidos en la Tabla I, de la parte correspondiente a Vibración (segmental) mano-brazo, del Anexo V, Resolución MTEySS Nº 295/03' },
      { id: 'p2_2', text: 'El trabajador presenta una manifestación temprana de las enfermedades mencionadas en el Artículo 1º de la presente Resolución' }
    ]
  },
  vibraciones_cuerpo_entero: {
    isTwoStep: true,
    paso1: [
      { id: 'p1_1', text: 'Conducir vehículos industriales, camiones, maquinas agrícolas, transporte público y otros.' },
      { id: 'p1_2', text: 'Trabajar próximo a máximas generadoras de impacto' }
    ],
    paso2: [
      { id: 'p2_1', text: 'El valor de las vibraciones supera los límites establecidos en la parte correspondiente a Vibración Cuerpo entero, del Anexo V. Resolución MTEySS Nº 295/03' },
      { id: 'p2_2', text: 'El trabajador presenta una manifestación temprana de las enfermedades mencionadas en el Artículo 1º de la presente Resolución' }
    ]
  },
  confort_termico: {
    isTwoStep: true,
    paso1: [
      { id: 'p1_1', text: 'En el puesto de trabajo se perciben temperaturas no confortables para la realización de tareas' }
    ],
    paso2: [
      { id: 'p2_1', text: 'Resultado del uso de la curva de Confort de Fanger, se encuentra por fuera de la zona de confort' }
    ]
  },
  estres_contacto: {
    isTwoStep: true,
    paso1: [
      { id: 'p1_1', text: 'Mantener apoyada alguna parte del cuerpo ejerciendo una presión, contra una herramienta, plano de trabajo, máquina herramienta o partes y materiales' }
    ],
    paso2: [
      { id: 'p2_1', text: 'El trabajador mantiene apoyada la muñeca, antebrazo, axila o muslo u otro segmento corporal sobre una superficie aguda o con canto' },
      { id: 'p2_2', text: 'El trabajador utiliza herramientas de mano o manipula piezas que presionan sobre sus dedos y/o palma de la mano hábil' },
      { id: 'p2_3', text: 'El trabajador realiza movimientos de percusión sobre partes o herramientas' },
      { id: 'p2_4', text: 'El trabajador presenta alguna manifestación temprana de las enfermedades mencionadas en el Artículo 1º de la presente resolución' }
    ]
  }
};

export const getDefaultPlanilla3Generales = (fechaDefault = '') => [
  {
    num: 1,
    medida: 'Se ha informado al trabajador/es, supervisores, ingenieros, directivos relacionados con el puesto de trabajo, sobre el riesgo que tiene la tarea de desarrollar TME',
    fecha: fechaDefault,
    aplica: 'si',
    observaciones: '-'
  },
  {
    num: 2,
    medida: 'Se ha capacitado al trabajador/es y supervisor/es relacionados con el puesto de trabajo, sobre la identificación de síntomas relacionados con el desarrollo de TME',
    fecha: fechaDefault,
    aplica: 'si',
    observaciones: '-'
  },
  {
    num: 3,
    medida: 'Se ha capacitado al trabajador/es y supervisor/es relacionados con el puesto de trabajo, sobre las medidas y/o procedimientos para prevenir el desarrollo de TME',
    fecha: fechaDefault,
    aplica: 'si',
    observaciones: '-'
  }
];

export const getDefaultPlanilla3Especificas = () => [
  { num: 1, medida: 'Realizar evaluación de los factores de riesgo ergonómico del puesto de trabajo (Levantamiento y descenso, Transporte y posturas forzadas)', observaciones: '-' },
  { num: 2, medida: '', observaciones: '' },
  { num: 3, medida: '', observaciones: '' },
  { num: 4, medida: '', observaciones: '' },
  { num: 5, medida: '', observaciones: '' },
  { num: 6, medida: '', observaciones: '' },
  { num: 7, medida: '', observaciones: '' },
  { num: 8, medida: '', observaciones: '' },
  { num: 9, medida: '', observaciones: '' },
  { num: 10, medida: '', observaciones: '' },
  { num: 11, medida: '', observaciones: '' },
  { num: 12, medida: '', observaciones: '' },
  { num: 13, medida: '', observaciones: '' },
  { num: 14, medida: '', observaciones: '' },
  { num: 15, medida: '', observaciones: '' }
];

export const getDefaultPlanilla4 = (puestoNombre = '', fechaEval = '') => [
  { num: 1, mcp: '', puesto_nombre: puestoNombre, fecha_evaluacion: fechaEval, nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
  { num: 2, mcp: '', puesto_nombre: puestoNombre, fecha_evaluacion: fechaEval, nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
  { num: 3, mcp: '', puesto_nombre: puestoNombre, fecha_evaluacion: fechaEval, nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
  { num: 4, mcp: '', puesto_nombre: puestoNombre, fecha_evaluacion: fechaEval, nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
  { num: 5, mcp: '', puesto_nombre: puestoNombre, fecha_evaluacion: fechaEval, nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
  { num: 6, mcp: '', puesto_nombre: puestoNombre, fecha_evaluacion: fechaEval, nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
  { num: 7, mcp: '', puesto_nombre: puestoNombre, fecha_evaluacion: fechaEval, nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
  { num: 8, mcp: '', puesto_nombre: puestoNombre, fecha_evaluacion: fechaEval, nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
  { num: 9, mcp: '', puesto_nombre: puestoNombre, fecha_evaluacion: fechaEval, nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' },
  { num: 10, mcp: '', puesto_nombre: puestoNombre, fecha_evaluacion: fechaEval, nivel_riesgo: '', fecha_impl_admin: '', fecha_impl_ing: '', fecha_cierre: '' }
];


const isValidUuid = (val) => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};

const parseTiempo = (tiempoStr) => {
  if (!tiempoStr) return { valor: '', unidad: 'min' };
  const str = String(tiempoStr).trim();
  
  if (str.toLowerCase() === 'min') return { valor: '', unidad: 'min' };
  if (str.toLowerCase() === 'hs') return { valor: '', unidad: 'hs' };

  const matches = str.match(/^([\d.,]+)?\s*(min|hs|horas|m|h|hora|minutos)?$/i);
  if (!matches) {
    const num = parseFloat(str.replace(',', '.'));
    return {
      valor: isNaN(num) ? '' : String(num),
      unidad: str.toLowerCase().includes('h') ? 'hs' : 'min'
    };
  }
  const valor = matches[1] || '';
  const unitText = (matches[2] || '').toLowerCase();
  const unidad = (unitText.startsWith('h')) ? 'hs' : 'min';
  return { valor, unidad };
};

const sumarTiemposTarea = (t) => {
  let totalMinutos = 0;
  const factorKeys = [
    'levantamiento', 'empuje_arrastre', 'transporte', 'bipedestacion',
    'mov_repetitivos', 'posturas_forzadas', 'vibraciones_mano_brazo',
    'vibraciones_cuerpo_entero', 'confort_termico', 'estres_contacto'
  ];
  
  factorKeys.forEach(key => {
    // Solo sumamos si el factor está identificado como presente ('si')
    if (t[`f_${key}_identificado`] === 'si') {
      const tiempoRaw = t[`f_${key}_tiempo`] || '';
      const { valor, unidad } = parseTiempo(tiempoRaw);
      const num = parseFloat(String(valor).replace(',', '.'));
      if (!isNaN(num) && num > 0) {
        if (unidad === 'hs') {
          totalMinutos += num * 60;
        } else {
          totalMinutos += num;
        }
      }
    }
  });

  if (totalMinutos === 0) return null;
  
  const horas = Math.floor(totalMinutos / 60);
  const mins = Math.round(totalMinutos % 60);
  
  let formatted = '';
  if (horas > 0) {
    formatted += `${horas} hs`;
  }
  if (mins > 0) {
    formatted += `${formatted ? ' ' : ''}${mins} min`;
  }
  
  const totalHorasVal = (totalMinutos / 60).toFixed(2);
  const totalHorasStr = totalHorasVal.endsWith('.00') 
    ? totalHorasVal.slice(0, -3) + ' hs' 
    : totalHorasVal.replace('.', ',') + ' hs';

  return {
    formatted,
    totalMinutos,
    totalHoras: totalHorasStr
  };
};


export default function ProtocoloForm({
  tenantSlug,
  profile,
  tenant,
  editingId = null,
  mode = 'create', // 'create' | 'edit' | 'view'
  onClose,
  onSaveSuccess,
  onEdit = null,
  onDirtyChange = null,
  onSendPdf = null,
  onExportPdf = null
}) {
  const router = useRouter();
  const globalToast = useToast();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  
  // Tabla 1 & Método Cuadrícula Modal State
  const [isTabla1Open, setIsTabla1Open] = useState(false);
  const [targetPuntoIdForTabla1, setTargetPuntoIdForTabla1] = useState(null);
  const [isResolucionModalOpen, setIsResolucionModalOpen] = useState(false);
  
  // Lookups data
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [actividadesEconomicas, setActividadesEconomicas] = useState([]);

  const getCiiuFormattedValue = (codesArray, actsList) => {
    if (!codesArray || !Array.isArray(codesArray)) return '';
    const mapped = codesArray.map(code => {
      const match = actsList.find(a => a.codigo === code);
      return match ? `${code} ${match.descripcion}` : code;
    });
    return mapped.join(', ');
  };
  
  // Form fields
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [razonSocialText, setRazonSocialText] = useState('');
  const [cuitText, setCuitText] = useState('');
  const [ciiuText, setCiiuText] = useState('');
  const [establecimientoText, setEstablecimientoText] = useState('');
  const [direccionText, setDireccionText] = useState('');
  const [provinciaText, setProvinciaText] = useState('');
  const [localidadText, setLocalidadText] = useState('');
  const [cpText, setCpText] = useState('');
  const [fechaMedicion, setFechaMedicion] = useState('');
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  
  const [estado, setEstado] = useState('borrador'); // 'borrador' | 'completado' | 'anulado'
  const [isTabla1RuidoOpen, setIsTabla1RuidoOpen] = useState(false);

  const [puntos, setPuntos] = useState([]);
  const [collapsedTareas, setCollapsedTareas] = useState({});
  const [collapsedFactores, setCollapsedFactores] = useState({});
  const [mostrarBorg, setMostrarBorg] = useState(false);
  const [mostrarFanger, setMostrarFanger] = useState(false);
  const [adjuntos, setAdjuntos] = useState([]);
  
  // Professional & Signature State
  const [miembrosList, setMiembrosList] = useState([]);
  const [profesionalId, setProfesionalId] = useState('');
  const [profesionalNombre, setProfesionalNombre] = useState('');
  const [profesionalMatricula, setProfesionalMatricula] = useState('');
  const [firmaTipo, setFirmaTipo] = useState('perfil'); // 'perfil' | 'mano'
  const [signaturePath, setSignaturePath] = useState('');
  const [firmaPerfilPreviewUrl, setFirmaPerfilPreviewUrl] = useState('');
  const [firmaProfSavedUrl, setFirmaProfSavedUrl] = useState('');
  const [hasSignedProf, setHasSignedProf] = useState(false);
  const firmaProfCanvasRef = useRef(null);

  // Employer Signature State
  const [empleadorNombre, setEmpleadorNombre] = useState('');
  const [firmaEmpleadorSavedUrl, setFirmaEmpleadorSavedUrl] = useState('');
  const [hasSignedEmpleador, setHasSignedEmpleador] = useState(false);
  const firmaEmpleadorCanvasRef = useRef(null);

  // Occupational Medicine Responsible Signature State
  const [medicinaNombre, setMedicinaNombre] = useState('');
  const [medicinaMatricula, setMedicinaMatricula] = useState('');
  const [firmaMedicinaSavedUrl, setFirmaMedicinaSavedUrl] = useState('');
  const [hasSignedMedicina, setHasSignedMedicina] = useState(false);
  const firmaMedicinaCanvasRef = useRef(null);

  // Profile Syncing Dialog State
  const [syncQueue, setSyncQueue] = useState([]);
  const [syncIndex, setSyncIndex] = useState(0);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [estSectoresLocal, setEstSectoresLocal] = useState([]);

  const handleSelectLuxFromTabla1 = (luxValue) => {
    if (!targetPuntoIdForTabla1) return;
    setPuntos(prev => prev.map(p => p.id === targetPuntoIdForTabla1 ? {
      ...p,
      valor_requerido_legal_lux: String(luxValue)
    } : p));
    setTargetPuntoIdForTabla1(null);
  };

  const canEdit = mode !== 'view' && estado !== 'anulado';
  const isReadOnly = mode === 'view';

  const getSectionPermissions = (userProfile, sectionName) => {
    if (!userProfile) return { cargar: true, editar: true, eliminar: true };
    if (userProfile.role === 'cliente') return { cargar: false, editar: false, eliminar: false };
    if (userProfile.role === 'admin') return { cargar: true, editar: true, eliminar: true };
    const perm = userProfile.permisos?.[sectionName];
    if (perm === true || perm === undefined) return { cargar: true, editar: true, eliminar: true };
    if (perm === false) return { cargar: false, editar: false, eliminar: false };
    return {
      cargar: perm.cargar === true,
      editar: perm.editar === true,
      eliminar: perm.eliminar === true
    };
  };

  const sectionPerms = getSectionPermissions(profile, 'protocolo_ergonomia');
  const canEliminar = sectionPerms.eliminar;
  const canEditar = sectionPerms.editar;

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const initialSnapshotRef = useRef('');
  const [isReady, setIsReady] = useState(false);

  const executeDelete = async () => {
    if (!editingId) return;
    setDeleteLoading(true);
    try {
      const { error: delErr } = await supabase
        .from('protocolos_ergonomia')
        .delete()
        .eq('id', editingId);
      if (delErr) throw delErr;

      globalToast.toast('Protocolo eliminado correctamente.', 'success');
      onClose();
    } catch (err) {
      console.error('Error al eliminar protocolo:', err);
      globalToast.toast('Error al eliminar el protocolo.', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  // Resolve profile signature preview signed URL
  useEffect(() => {
    const resolveProfileSignaturePreview = async () => {
      if (!signaturePath || signaturePath === 'N/A' || firmaTipo !== 'perfil') {
        if (firmaProfSavedUrl && firmaTipo === 'perfil') {
          setFirmaPerfilPreviewUrl(firmaProfSavedUrl);
        }
        return;
      }
      try {
        if (signaturePath.startsWith('data:')) {
          setFirmaPerfilPreviewUrl(signaturePath);
        } else if (isDevMode || signaturePath.startsWith('mock')) {
          setFirmaPerfilPreviewUrl('/brand/logo-primary.png');
        } else {
          let relativePath = signaturePath;
          let isExternal = false;
          
          if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
            try {
              const urlObj = new URL(relativePath);
              const pathParts = urlObj.pathname.split('/');
              const bucketIndex = pathParts.findIndex(part => part === 'signatures' || part === 'documents' || part === 'avatars');
              if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
                relativePath = pathParts.slice(bucketIndex + 1).join('/');
              } else {
                isExternal = true;
              }
            } catch (urlErr) {
              isExternal = true;
            }
          }

          if (isExternal) {
            setFirmaPerfilPreviewUrl(signaturePath);
          } else {
            let cleanPath = relativePath;
            if (cleanPath.startsWith('signatures/')) {
              cleanPath = cleanPath.slice(11);
            }
            const { data: sData, error: sErr } = await supabase.storage
              .from('signatures')
              .createSignedUrl(cleanPath, 3600);
            if (!sErr && sData?.signedUrl) {
              setFirmaPerfilPreviewUrl(sData.signedUrl);
            } else {
              setFirmaPerfilPreviewUrl(signaturePath);
            }
          }
        }
      } catch (e) {
        console.error('Error cargando previsualización de firma de perfil:', e);
        if (signaturePath) {
          setFirmaPerfilPreviewUrl(signaturePath);
        }
      }
    };
    resolveProfileSignaturePreview();
  }, [signaturePath, firmaTipo, firmaProfSavedUrl, isDevMode]);

  // Canvas drawing setup for hand signature
  const setupCanvas = useCallback((canvas, setHasSigned) => {
    if (!canvas || !canEdit) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    const getPos = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * canvas.width;
      const y = ((clientY - rect.top) / rect.height) * canvas.height;
      return { x, y };
    };

    const startDrawing = (e) => {
      drawing = true;
      const client = e.touches ? e.touches[0] : e;
      const pos = getPos(client.clientX, client.clientY);
      lastX = pos.x;
      lastY = pos.y;
      setHasSigned(true);
    };

    const draw = (e) => {
      if (!drawing) return;
      if (e.cancelable) e.preventDefault();
      const client = e.touches ? e.touches[0] : e;
      const pos = getPos(client.clientX, client.clientY);

      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      lastX = pos.x;
      lastY = pos.y;
    };

    const stopDrawing = () => {
      drawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    canvas._cleanup = () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [canEdit]);

  const firmaProfRefCallback = useCallback((node) => {
    if (node) {
      firmaProfCanvasRef.current = node;
      setupCanvas(node, setHasSignedProf);
    } else {
      if (firmaProfCanvasRef.current && firmaProfCanvasRef.current._cleanup) {
        firmaProfCanvasRef.current._cleanup();
      }
      firmaProfCanvasRef.current = null;
    }
  }, [setupCanvas]);

  const handleClearCanvas = () => {
    if (firmaProfCanvasRef.current) {
      const ctx = firmaProfCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, firmaProfCanvasRef.current.width, firmaProfCanvasRef.current.height);
    }
    setHasSignedProf(false);
    setFirmaProfSavedUrl('');
  };

  const firmaEmpleadorRefCallback = useCallback((node) => {
    if (node) {
      firmaEmpleadorCanvasRef.current = node;
      setupCanvas(node, setHasSignedEmpleador);
    } else {
      if (firmaEmpleadorCanvasRef.current && firmaEmpleadorCanvasRef.current._cleanup) {
        firmaEmpleadorCanvasRef.current._cleanup();
      }
      firmaEmpleadorCanvasRef.current = null;
    }
  }, [setupCanvas]);

  const handleClearEmpleadorCanvas = () => {
    if (firmaEmpleadorCanvasRef.current) {
      const ctx = firmaEmpleadorCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, firmaEmpleadorCanvasRef.current.width, firmaEmpleadorCanvasRef.current.height);
    }
    setHasSignedEmpleador(false);
    setFirmaEmpleadorSavedUrl('');
  };

  const firmaMedicinaRefCallback = useCallback((node) => {
    if (node) {
      firmaMedicinaCanvasRef.current = node;
      setupCanvas(node, setHasSignedMedicina);
    } else {
      if (firmaMedicinaCanvasRef.current && firmaMedicinaCanvasRef.current._cleanup) {
        firmaMedicinaCanvasRef.current._cleanup();
      }
      firmaMedicinaCanvasRef.current = null;
    }
  }, [setupCanvas]);

  const handleClearMedicinaCanvas = () => {
    if (firmaMedicinaCanvasRef.current) {
      const ctx = firmaMedicinaCanvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, firmaMedicinaCanvasRef.current.width, firmaMedicinaCanvasRef.current.height);
    }
    setHasSignedMedicina(false);
    setFirmaMedicinaSavedUrl('');
  };

  // Calculations helper for ergonomics points
  const getPuntoCalculos = useCallback((p) => {
    return {
      resultado_punto: p.resultado_punto || 'Cumple',
      nivel_de_riesgo: p.nivel_de_riesgo || 'Bajo'
    };
  }, []);

  // Calculate Overall Protocol Result
  const getResultadoGeneral = useCallback(() => {
    if (!puntos || puntos.length === 0) return 'Sin evaluar';
    if (puntos.some(p => p.resultado_punto === 'No cumple')) return 'No cumple';
    return 'Cumple';
  }, [puntos]);

  // Check if protocol has all required technical and regulatory fields to be marked as 'completado'
  const checkIsProtocoloCompleto = useCallback(() => {
    if (!empresaId || !establecimientoId || !fechaMedicion) return false;
    if (!puntos || puntos.length === 0) return false;

    for (let i = 0; i < puntos.length; i++) {
      const p = puntos[i];
      if (!p.sector_text || !p.sector_text.trim()) return false;
      const cal = getPuntoCalculos(p);
      if (cal.resultado_punto === 'Pendiente') return false;
    }

    return true;
  }, [empresaId, establecimientoId, fechaMedicion, puntos, getPuntoCalculos, getResultadoGeneral]);

  // Load companies & establishments lookups
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let emps = [];
        let ests = [];

        let dbActs = [];
        if (!session) {
          setIsDevMode(true);
          // Load Mock Data
          dbActs = [
            { codigo: '492290', descripcion: 'Servicio de transporte automotor de cargas' },
            { codigo: '11111', descripcion: 'Elaboración de hormigón' },
            { codigo: '123456', descripcion: 'Actividad de prueba' }
          ];
          setActividadesEconomicas(dbActs);
          emps = [
            { id: 'mock-empresa-1', razon_social: 'Ams Inversiones S.A.', cuit: '30-12345678-9', actividades_ciiu: ['492290', '11111'] },
            { id: 'mock-empresa-2', razon_social: 'Argento Via Publica', cuit: '30-98765432-1', actividades_ciiu: ['123456'] }
          ];
          ests = [
            { id: 'mock-est-1', empresa_id: 'mock-empresa-1', denominacion: 'Callao 727', direccion: 'Av. Callao 727', provincia: 'CABA', localidad_barrio: 'San Nicolás', cp: '1023', horario_funcionamiento: '09:00 a 18:00', sectores: [{ id: 's-1', denominacion: 'Oficina Central', largo: '6.25', ancho: '3.39', altura: '2.90', puestos: [{ id: 'p-1', denominacion: 'Escritorio Administración' }] }] },
            { id: 'mock-est-2', empresa_id: 'mock-empresa-1', denominacion: 'Cordoba 2045', direccion: 'Av. Córdoba 2045', provincia: 'CABA', localidad_barrio: 'Recoleta', cp: '1120', sectores: [] },
            { id: 'mock-est-3', empresa_id: 'mock-empresa-2', denominacion: 'Único', direccion: 'Perú 345', provincia: 'Buenos Aires', localidad_barrio: 'Tigre', cp: '1648', sectores: [] }
          ];
        } else {
          const { data: actsData } = await supabase
            .from('actividades_economicas')
            .select('codigo, descripcion');
          dbActs = actsData || [];
          setActividadesEconomicas(dbActs);
          // Real Supabase data
          const { data: dbEmps, error: empErr } = await supabase
            .from('empresas')
            .select('id, razon_social, cuit, actividades_ciiu')
            .eq('tenant_id', tenant.id)
            .order('razon_social');
          if (empErr) throw empErr;
          emps = dbEmps || [];

          const { data: dbEsts, error: estErr } = await supabase
            .from('establecimientos')
            .select('*')
            .eq('tenant_id', tenant.id)
            .order('denominacion');
          if (estErr) throw estErr;
          ests = dbEsts || [];
        }

        setEmpresas(emps);
        setAllEstablecimientos(ests);

        // Fetch team members / profiles of the organization
        let mems = [];
        if (!session) {
          mems = [
            { id: 'mock-m-1', nombre: 'Ing. Carlos Gómez', matricula: 'MP 12345 / Res. SRT 84/12', signature_url: '/brand/logo-primary.png' },
            { id: 'mock-m-2', nombre: 'Lic. María Fernández', matricula: 'MN 6789', signature_url: '' }
          ];
        } else {
          // 1. Query miembros_equipo table
          const { data: eqMems } = await supabase
            .from('miembros_equipo')
            .select('id, full_name, signature_url, profile_id')
            .eq('tenant_id', tenant.id)
            .order('full_name');

          // 2. Query profiles table
          const { data: profsData } = await supabase
            .from('profiles')
            .select('id, full_name, signature_url')
            .eq('tenant_id', tenant.id)
            .order('full_name');

          // 3. Query matriculas table for all profiles
          let dbMatriculas = [];
          try {
            const { data: mData } = await supabase
              .from('matriculas')
              .select('profile_id, institucion, numero');
            dbMatriculas = mData || [];
          } catch (mErr) {
            console.log('No tabla matriculas o error al consultar:', mErr);
          }

          const getMatriculasForProfile = (profId, singleMat, singleMatProf) => {
            const matList = [];
            dbMatriculas
              .filter(m => m.profile_id === profId && m.numero)
              .forEach(m => {
                const formatted = m.institucion ? `${m.institucion} ${m.numero}` : m.numero;
                matList.push(formatted);
              });
            if (singleMat) matList.push(singleMat);
            if (singleMatProf) matList.push(singleMatProf);
            return Array.from(new Set(matList.filter(Boolean)));
          };

          const map = new Map();

          if (eqMems && eqMems.length > 0) {
            eqMems.forEach(m => {
              const uMatList = getMatriculasForProfile(m.profile_id || m.id, null, null);
              map.set(m.id, {
                id: m.id,
                nombre: m.full_name || 'Sin nombre',
                matricula: uMatList.join(' / '),
                listaMatriculas: uMatList,
                signature_url: m.signature_url || '',
                profile_id: m.profile_id
              });
            });
          }

          if (profsData && profsData.length > 0) {
            profsData.forEach(p => {
              const name = p.full_name || p.nombre_apellido || 'Sin nombre';
              const sig = p.signature_url || '';
              const uMatList = getMatriculasForProfile(p.id, p.matricula, p.matricula_profesional);
              const formattedMat = uMatList.join(' / ');

              let existingKey = null;
              for (const [k, v] of map.entries()) {
                if (k === p.id || v.profile_id === p.id) {
                  existingKey = k;
                  break;
                }
              }

              if (existingKey) {
                const existing = map.get(existingKey);
                const mergedMatList = Array.from(new Set([...(existing.listaMatriculas || []), ...uMatList]));
                map.set(existingKey, {
                  ...existing,
                  nombre: existing.nombre !== 'Sin nombre' ? existing.nombre : name,
                  matricula: mergedMatList.join(' / '),
                  listaMatriculas: mergedMatList,
                  signature_url: existing.signature_url || sig
                });
              } else {
                map.set(p.id, {
                  id: p.id,
                  nombre: name,
                  matricula: formattedMat,
                  listaMatriculas: uMatList,
                  signature_url: sig,
                  profile_id: p.id
                });
              }
            });
          }

          mems = Array.from(map.values());
        }
        setMiembrosList(mems);

        // Auto-select logged-in professional details
        if (session?.user) {
          const userMem = mems.find(m => m.id === session.user.id || m.profile_id === session.user.id);
          
          let userNombre = userMem?.nombre || '';
          let userMatricula = userMem?.matricula || '';
          let userSig = userMem?.signature_url || '';

          if (!userNombre) {
            const { data: currentProf } = await supabase
              .from('profiles')
              .select('id, full_name, signature_url')
              .eq('id', session.user.id)
              .single();
            if (currentProf) {
              userNombre = currentProf.full_name || '';
              userSig = currentProf.signature_url || '';
              const uMatList = getMatriculasForProfile(session.user.id, null, null);
              userMatricula = uMatList.join(' / ');
            }
          }

          if (!editingId) {
            setProfesionalId(userMem ? userMem.id : session.user.id);
            setProfesionalNombre(userNombre);
            setProfesionalMatricula(userMatricula);
            setSignaturePath(userSig);
            if (userSig) {
              setFirmaTipo('perfil');
            }
          }
        }

        // Load existing record if editing
        if (editingId) {
          await loadExistingRecord(session, mems, emps, dbActs);
        } else {
          // Initialize with 1 default sampling point
          setPuntos([createNewPunto(1)]);
          setLoading(false);
          setTimeout(() => {
            initialSnapshotRef.current = getFormSnapshot();
            setIsReady(true);
          }, 100);
        }
      } catch (err) {
        console.error('Error al inicializar formulario:', err);
        globalToast.toast('Error al obtener datos iniciales de la base de datos.', 'error');
        setLoading(false);
      }
    };
    loadLookups();
  }, [editingId, tenant]);

  // Load existing record
  const loadExistingRecord = async (session, memsList = [], empresasList = [], dbActsList = []) => {
    try {
      if (!session) {
        // Dev Mock Record
        setLoading(false);
        return;
      }

      // 1. Principal
      const { data: proto, error: prErr } = await supabase
        .from('protocolos_ergonomia')
        .select('*')
        .eq('id', editingId)
        .maybeSingle();
      if (prErr) throw prErr;
      if (!proto) {
        globalToast.toast('El protocolo solicitado no existe o no se encuentra disponible.', 'error');
        setLoading(false);
        return;
      }

      setEmpresaId(proto.razon_social_id || '');
      setEstablecimientoId(proto.establecimiento_id || '');
      setRazonSocialText(proto.razon_social_text || '');
      setCuitText(proto.cuit_text || '');
      const resolvedCiiu = proto.ciiu_text || 
        (empresasList.length > 0 ? getCiiuFormattedValue(empresasList.find(e => e.id === proto.razon_social_id)?.actividades_ciiu, dbActsList) : '') || '';
      setCiiuText(resolvedCiiu);
      setEstablecimientoText(proto.establecimiento_text || '');
      setDireccionText(proto.direccion_text || '');
      setProvinciaText(proto.provincia_text || '');
      setLocalidadText(proto.localidad_text || '');
      setCpText(proto.cp_text || '');
      setFechaMedicion(formatDate(proto.fecha_medicion) || '');
      setObservacionesGenerales(proto.observaciones || '');
      setEstado(proto.estado || 'borrador');
      setProfesionalNombre(proto.profesional_nombre || '');
      setProfesionalMatricula(proto.profesional_matricula || '');
      setFirmaTipo(proto.firma_tipo || 'perfil');
      
      setEmpleadorNombre(proto.empleador_nombre || '');
      setFirmaEmpleadorSavedUrl(proto.firma_empleador || '');
      setMedicinaNombre(proto.medicina_nombre || '');
      setMedicinaMatricula(proto.medicina_matricula || '');
      setFirmaMedicinaSavedUrl(proto.firma_medicina || '');
      
      // Buscar coincidencia en la nómina para pre-seleccionar profesionalId
      const matchingMem = memsList.find(
        m => m.nombre === proto.profesional_nombre && 
        (m.matricula === proto.profesional_matricula || proto.profesional_matricula?.includes(m.matricula))
      );
      if (matchingMem) {
        setProfesionalId(matchingMem.id);
      } else {
        setProfesionalId(proto.profesional_nombre ? '__custom__' : '');
      }

      if (proto.firma_profesional) {
        if (proto.firma_tipo === 'perfil') {
          setSignaturePath(proto.firma_profesional);
        } else {
          setFirmaProfSavedUrl(proto.firma_profesional);
        }
      }

      // Cargar sectores del establecimiento seleccionado
      if (proto.establecimiento_id) {
        const activeEst = allEstablecimientos.find(e => e.id === proto.establecimiento_id);
        if (activeEst) {
          setEstSectoresLocal(activeEst.sectores || []);
        }
      }

      // 2. Puntos
      const { data: ptsData, error: ptsErr } = await supabase
        .from('protocolos_ergonomia_puntos')
        .select('*')
        .eq('protocolo_id', editingId)
        .order('orden');
      if (ptsErr) throw ptsErr;

      const loadedPuntos = (ptsData || []).map(p => {
        let mappedTareas = [];
        if (Array.isArray(p.tareas) && p.tareas.length > 0) {
          mappedTareas = p.tareas.map(t => ({
            ...t,
            f_levantamiento_tiempo: t.f_levantamiento_tiempo || '',
            f_levantamiento_respuestas: t.f_levantamiento_respuestas || {},
            f_empuje_arrastre_tiempo: t.f_empuje_arrastre_tiempo || '',
            f_empuje_arrastre_respuestas: t.f_empuje_arrastre_respuestas || {},
            f_transporte_tiempo: t.f_transporte_tiempo || '',
            f_transporte_respuestas: t.f_transporte_respuestas || {},
            f_bipedestacion_tiempo: t.f_bipedestacion_tiempo || '',
            f_bipedestacion_respuestas: t.f_bipedestacion_respuestas || {},
            f_mov_repetitivos_tiempo: t.f_mov_repetitivos_tiempo || '',
            f_mov_repetitivos_respuestas: t.f_mov_repetitivos_respuestas || {},
            f_posturas_forzadas_tiempo: t.f_posturas_forzadas_tiempo || '',
            f_posturas_forzadas_respuestas: t.f_posturas_forzadas_respuestas || {},
            f_vibraciones_mano_brazo_identificado: t.f_vibraciones_mano_brazo_identificado || 'no',
            f_vibraciones_mano_brazo_tiempo: t.f_vibraciones_mano_brazo_tiempo || '',
            f_vibraciones_mano_brazo_riesgo: t.f_vibraciones_mano_brazo_riesgo || '',
            f_vibraciones_mano_brazo_respuestas: t.f_vibraciones_mano_brazo_respuestas || {},
            f_vibraciones_cuerpo_entero_identificado: t.f_vibraciones_cuerpo_entero_identificado || 'no',
            f_vibraciones_cuerpo_entero_tiempo: t.f_vibraciones_cuerpo_entero_tiempo || '',
            f_vibraciones_cuerpo_entero_riesgo: t.f_vibraciones_cuerpo_entero_riesgo || '',
            f_vibraciones_cuerpo_entero_respuestas: t.f_vibraciones_cuerpo_entero_respuestas || {},
            f_vibraciones_tiempo: t.f_vibraciones_tiempo || '',
            f_vibraciones_respuestas: t.f_vibraciones_respuestas || {},
            f_confort_termico_tiempo: t.f_confort_termico_tiempo || '',
            f_confort_termico_respuestas: t.f_confort_termico_respuestas || {},
            f_estres_contacto_tiempo: t.f_estres_contacto_tiempo || '',
            f_estres_contacto_respuestas: t.f_estres_contacto_respuestas || {},
            p3_medidas_generales: Array.isArray(t.p3_medidas_generales) && t.p3_medidas_generales.length === 3
              ? t.p3_medidas_generales
              : getDefaultPlanilla3Generales(p.fecha_medicion ? formatDate(p.fecha_medicion) : ''),
            p3_medidas_especificas: Array.isArray(t.p3_medidas_especificas) && t.p3_medidas_especificas.length === 15
              ? t.p3_medidas_especificas
              : getDefaultPlanilla3Especificas(),
            p3_observaciones: t.p3_observaciones || ''
          }));
        } else {
          // Si no tiene tareas guardadas (registro viejo), migrar los datos viejos a la primera tarea
          mappedTareas = [{
            id: 't-legacy-' + p.id,
            orden: 1,
            nombre: p.tarea_desempenada || 'Tarea habitual 1',
            f_levantamiento_identificado: p.f_levantamiento_identificado || 'no',
            f_levantamiento_tiempo: '',
            f_levantamiento_riesgo: p.f_levantamiento_requiere_eval === 'si' ? '2' : '',
            f_levantamiento_respuestas: {},
            f_empuje_arrastre_identificado: p.f_empuje_arrastre_identificado || 'no',
            f_empuje_arrastre_tiempo: '',
            f_empuje_arrastre_riesgo: p.f_empuje_arrastre_requiere_eval === 'si' ? '2' : '',
            f_empuje_arrastre_respuestas: {},
            f_transporte_identificado: p.f_transporte_identificado || 'no',
            f_transporte_tiempo: '',
            f_transporte_riesgo: p.f_transporte_requiere_eval === 'si' ? '2' : '',
            f_transporte_respuestas: {},
            f_bipedestacion_identificado: p.f_bipedestacion_identificado || 'no',
            f_bipedestacion_tiempo: '',
            f_bipedestacion_riesgo: p.f_bipedestacion_requiere_eval === 'si' ? '2' : '',
            f_bipedestacion_respuestas: {},
            f_mov_repetitivos_identificado: p.f_mov_repetitivos_identificado || 'no',
            f_mov_repetitivos_tiempo: '',
            f_mov_repetitivos_riesgo: p.f_mov_repetitivos_requiere_eval === 'si' ? '2' : '',
            f_mov_repetitivos_respuestas: {},
            f_posturas_forzadas_identificado: p.f_posturas_forzadas_identificado || 'no',
            f_posturas_forzadas_tiempo: '',
            f_posturas_forzadas_riesgo: p.f_posturas_forzadas_requiere_eval === 'si' ? '2' : '',
            f_posturas_forzadas_respuestas: {},
            f_vibraciones_mano_brazo_identificado: p.f_vibraciones_identificado || 'no',
            f_vibraciones_mano_brazo_tiempo: '',
            f_vibraciones_mano_brazo_riesgo: p.f_vibraciones_requiere_eval === 'si' ? '2' : '',
            f_vibraciones_mano_brazo_respuestas: {},
            f_vibraciones_cuerpo_entero_identificado: 'no',
            f_vibraciones_cuerpo_entero_tiempo: '',
            f_vibraciones_cuerpo_entero_riesgo: '',
            f_vibraciones_cuerpo_entero_respuestas: {},
            f_vibraciones_identificado: p.f_vibraciones_identificado || 'no',
            f_vibraciones_tiempo: '',
            f_vibraciones_riesgo: p.f_vibraciones_requiere_eval === 'si' ? '2' : '',
            f_vibraciones_respuestas: {},
            f_confort_termico_identificado: p.f_confort_termico_identificado || 'no',
            f_confort_termico_tiempo: '',
            f_confort_termico_riesgo: p.f_confort_termico_requiere_eval === 'si' ? '2' : '',
            f_confort_termico_respuestas: {},
            f_estres_contacto_identificado: 'no',
            f_estres_contacto_tiempo: '',
            f_estres_contacto_riesgo: '',
            f_estres_contacto_respuestas: {}
          }];
        }

        const defaultTiempos = {
          levantamiento: '',
          empuje_arrastre: '',
          transporte: '',
          bipedestacion: '',
          mov_repetitivos: '',
          posturas_forzadas: '',
          vibraciones: '',
          confort_termico: '',
          estres_contacto: ''
        };

        return {
          id: p.id,
          orden: p.orden,
          punto_muestreo: p.punto_muestreo,
          sector_id: p.sector_id || '',
          sector_text: p.sector_text || '',
          puesto_id: p.puesto_id || '',
          puesto_text: p.puesto_text || '',
          cantidad_expuestos: p.cantidad_expuestos !== null ? String(p.cantidad_expuestos) : '1',
          procedimiento_escrito: p.procedimiento_escrito || 'no',
          capacitacion: p.capacitacion || 'no',
          nombres_trabajadores: p.nombres_trabajadores || '',
          manifestacion_temprana: p.manifestacion_temprana || 'no',
          ubicacion_sintoma: p.ubicacion_sintoma || '',
          tareas: mappedTareas,
          tiempos_exposicion: { ...defaultTiempos, ...(p.tiempos_exposicion || {}) },
          p4_medidas: Array.isArray(p.p4_medidas) && p.p4_medidas.length >= 1
            ? p.p4_medidas
            : getDefaultPlanilla4(p.puesto_text || '', proto.fecha_medicion ? formatDate(proto.fecha_medicion) : ''),
          nivel_de_riesgo: p.nivel_de_riesgo || 'Bajo',
          resultado_punto: p.resultado_punto || 'Cumple',
          observaciones_punto: p.observaciones_punto || '',
          isCollapsed: true
        };
      });

      setPuntos(loadedPuntos.length > 0 ? loadedPuntos : [createNewPunto(1)]);

      // 3. Adjuntos
      const { data: adjData, error: adjErr } = await supabase
        .from('protocolos_ergonomia_adjuntos')
        .select('*')
        .eq('protocolo_id', editingId);
      if (adjErr) throw adjErr;

      // Generar URL firmadas si los archivos no son urls completas
      const pathsToSign = (adjData || []).map(ad => ad.storage_path).filter(p => !p.startsWith('http'));
      let signedUrlsMap = {};

      if (pathsToSign.length > 0) {
        const { data: signedData } = await supabase.storage
          .from('protocolos-ergonomia')
          .createSignedUrls(pathsToSign, 3600);
        if (signedData) {
          signedData.forEach(item => {
            if (item.signedUrl) signedUrlsMap[item.path] = item.signedUrl;
          });
        }
      }

      setAdjuntos((adjData || []).map(ad => ({
        id: ad.id,
        tipo: ad.tipo || 'Otro',
        name: ad.nombre_archivo || 'Archivo',
        path: ad.storage_path,
        preview: ad.storage_path.startsWith('http') ? ad.storage_path : (signedUrlsMap[ad.storage_path] || ''),
        originalPath: ad.original_path || ad.storage_path,
        markers: Array.isArray(ad.markers) ? ad.markers : []
      })));

      setLoading(false);
      setTimeout(() => {
        initialSnapshotRef.current = getFormSnapshot();
        setIsReady(true);
      }, 100);
    } catch (err) {
      console.error('Error al cargar registro existente:', err);
      globalToast.toast('Error al recuperar los datos del protocolo.', 'error');
      setLoading(false);
    }
  };

  const getFormSnapshot = () => {
    return JSON.stringify({
      empresaId,
      establecimientoId,
      ciiuText,
      fechaMedicion,
      observacionesGenerales,
      empleadorNombre,
      medicinaNombre,
      medicinaMatricula,
      estado,
      profesionalId,
      profesionalNombre,
      profesionalMatricula,
      firmaTipo,
      puntosCount: puntos.length
    });
  };

  useEffect(() => {
    if (onDirtyChange && isReady && initialSnapshotRef.current) {
      if (mode === 'view') {
        onDirtyChange(false);
        return;
      }
      const currentSnapshot = getFormSnapshot();
      onDirtyChange(currentSnapshot !== initialSnapshotRef.current);
    }
  }, [
    mode,
    isReady,
    empresaId,
    establecimientoId,
    fechaMedicion,
    observacionesGenerales,
    empleadorNombre,
    medicinaNombre,
    medicinaMatricula,
    estado,
    profesionalId,
    profesionalNombre,
    profesionalMatricula,
    firmaTipo,
    puntos,
    adjuntos,
    onDirtyChange
  ]);

  const handleExitAttempt = () => {
    if (mode === 'view') {
      onClose();
      return;
    }
    const currentSnapshot = getFormSnapshot();
    if (initialSnapshotRef.current && currentSnapshot !== initialSnapshotRef.current) {
      setUnsavedDialogOpen(true);
    } else {
      onClose();
    }
  };

  const createNewTareaHabitual = (num) => ({
    id: 't-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    orden: num,
    nombre: `Tarea habitual ${num}`,
    // Los 9 factores
    f_levantamiento_identificado: 'no',
    f_levantamiento_tiempo: '',
    f_levantamiento_riesgo: '',
    f_levantamiento_respuestas: {},
    f_empuje_arrastre_identificado: 'no',
    f_empuje_arrastre_tiempo: '',
    f_empuje_arrastre_riesgo: '',
    f_empuje_arrastre_respuestas: {},
    f_transporte_identificado: 'no',
    f_transporte_tiempo: '',
    f_transporte_riesgo: '',
    f_transporte_respuestas: {},
    f_bipedestacion_identificado: 'no',
    f_bipedestacion_tiempo: '',
    f_bipedestacion_riesgo: '',
    f_bipedestacion_respuestas: {},
    f_mov_repetitivos_identificado: 'no',
    f_mov_repetitivos_tiempo: '',
    f_mov_repetitivos_riesgo: '',
    f_mov_repetitivos_respuestas: {},
    f_posturas_forzadas_identificado: 'no',
    f_posturas_forzadas_tiempo: '',
    f_posturas_forzadas_riesgo: '',
    f_posturas_forzadas_respuestas: {},
    f_vibraciones_mano_brazo_identificado: 'no',
    f_vibraciones_mano_brazo_tiempo: '',
    f_vibraciones_mano_brazo_riesgo: '',
    f_vibraciones_mano_brazo_respuestas: {},
    f_vibraciones_cuerpo_entero_identificado: 'no',
    f_vibraciones_cuerpo_entero_tiempo: '',
    f_vibraciones_cuerpo_entero_riesgo: '',
    f_vibraciones_cuerpo_entero_respuestas: {},
    f_vibraciones_identificado: 'no',
    f_vibraciones_tiempo: '',
    f_vibraciones_riesgo: '',
    f_vibraciones_respuestas: {},
    f_confort_termico_identificado: 'no',
    f_confort_termico_tiempo: '',
    f_confort_termico_riesgo: '',
    f_confort_termico_respuestas: {},
    f_estres_contacto_identificado: 'no',
    f_estres_contacto_tiempo: '',
    f_estres_contacto_riesgo: '',
    f_estres_contacto_respuestas: {},
    p3_medidas_generales: getDefaultPlanilla3Generales(fechaMedicion ? formatAsDateInput(fechaMedicion) : ''),
    p3_medidas_especificas: getDefaultPlanilla3Especificas(),
    p3_observaciones: ''
  });

  const createNewPunto = (num) => ({
    id: 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    orden: num,
    punto_muestreo: num,
    sector_id: '',
    sector_text: '',
    puesto_id: '',
    puesto_text: '',
    cantidad_expuestos: '1',
    procedimiento_escrito: 'no',
    capacitacion: 'no',
    nombres_trabajadores: '',
    manifestacion_temprana: 'no',
    ubicacion_sintoma: '',
    tareas: [createNewTareaHabitual(1)],
    tiempos_exposicion: {
      levantamiento: '',
      empuje_arrastre: '',
      transporte: '',
      bipedestacion: '',
      mov_repetitivos: '',
      posturas_forzadas: '',
      vibraciones: '',
      confort_termico: '',
      estres_contacto: ''
    },
    p4_medidas: getDefaultPlanilla4('', fechaMedicion ? formatAsDateInput(fechaMedicion) : ''),
    nivel_de_riesgo: 'Bajo',
    resultado_punto: 'Cumple',
    observaciones_punto: '',
    isCollapsed: false
  });

  // Handle company change
  const handleEmpresaChange = (val) => {
    setEmpresaId(val);
    setEstablecimientoId('');
    setEstablecimientoText('');
    setDireccionText('');
    setProvinciaText('');
    setLocalidadText('');
    setCpText('');
    setEstSectoresLocal([]);

    const emp = empresas.find(e => e.id === val);
    if (emp) {
      setRazonSocialText(emp.razon_social);
      setCuitText(emp.cuit || '');
      setCiiuText(getCiiuFormattedValue(emp.actividades_ciiu, actividadesEconomicas));
    } else {
      setRazonSocialText('');
      setCuitText('');
      setCiiuText('');
    }
  };

  // Handle establishment change
  const handleEstablecimientoChange = (val) => {
    setEstablecimientoId(val);
    const est = allEstablecimientos.find(e => e.id === val);
    if (est) {
      setEstablecimientoText(est.denominacion);
      setDireccionText(est.direccion || '');
      setProvinciaText(est.provincia || '');
      setLocalidadText(est.localidad_barrio || '');
      setCpText(est.cp || '');
      setEstSectoresLocal(est.sectores || []);
    } else {
      setEstablecimientoText('');
      setDireccionText('');
      setProvinciaText('');
      setLocalidadText('');
      setCpText('');
      setEstSectoresLocal([]);
    }
  };

  // Points manipulation
  const handleAddPunto = () => {
    const nextNum = puntos.length > 0 ? Math.max(...puntos.map(p => p.punto_muestreo)) + 1 : 1;
    setPuntos([...puntos, createNewPunto(nextNum)]);
  };

  const handleDuplicatePunto = (p) => {
    const nextNum = puntos.length > 0 ? Math.max(...puntos.map(pt => pt.punto_muestreo)) + 1 : 1;
    const copiedFracciones = Array.isArray(p.fracciones)
      ? p.fracciones.map((f, idx) => ({ ...f, id: 'f-' + Date.now() + '-' + idx }))
      : [{ id: 'f-' + Date.now() + '-1', c_horas: '', t_horas: '' }];

    setPuntos([...puntos, {
      ...p,
      id: 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      punto_muestreo: nextNum,
      orden: puntos.length + 1,
      isCollapsed: false,
      fracciones: copiedFracciones
    }]);
    globalToast.toast(`Punto de Muestreo ${p.punto_muestreo} duplicado con éxito.`);
  };

  const handleRemovePunto = (id) => {
    if (puntos.length <= 1) {
      globalToast.toast('Debe cargar al menos un punto de muestreo.', 'warning');
      return;
    }
    setPuntos(puntos.filter(p => p.id !== id));
  };

  const handleToggleCollapsePunto = (id) => {
    setPuntos(puntos.map(p => p.id === id ? { ...p, isCollapsed: !p.isCollapsed } : p));
  };

  // Sector selection within point
  const handlePuntoSectorChange = (puntoId, sectorVal) => {
    setPuntos(puntos.map(p => {
      if (p.id === puntoId) {
        if (sectorVal === '__custom__') {
          return { ...p, sector_id: '', sector_text: '', largo_m: '', ancho_m: '', altura_m: '', puesto_id: '', puesto_text: '' };
        } else {
          const sec = estSectoresLocal.find(s => s.id === sectorVal);
          return {
            ...p,
            sector_id: sectorVal,
            sector_text: sec ? sec.denominacion : '',
            largo_m: sec && sec.largo ? String(sec.largo) : '',
            ancho_m: sec && sec.ancho ? String(sec.ancho) : '',
            altura_m: sec && sec.altura ? String(sec.altura) : '',
            puesto_id: '',
            puesto_text: ''
          };
        }
      }
      return p;
    }));
  };

  // Job selection within point
  const handlePuntoPuestoChange = (puntoId, puestoVal) => {
    setPuntos(puntos.map(p => {
      if (p.id === puntoId) {
        if (puestoVal === '__custom__') {
          return { ...p, puesto_id: '', puesto_text: '' };
        } else {
          // Find selected sector to inspect its job positions
          const sec = estSectoresLocal.find(s => s.id === p.sector_id);
          const pst = sec?.puestos?.find(pst => pst.id === puestoVal);
          return {
            ...p,
            puesto_id: puestoVal,
            puesto_text: pst ? pst.denominacion : ''
          };
        }
      }
      return p;
    }));
  };

  // Fraction breakdown manipulation and automated sum calculation (Res. 295/03 ANEXO V)
  const handleAddFraccion = (puntoId) => {
    setPuntos(puntos.map(p => {
      if (p.id === puntoId) {
        const fracs = (p.fracciones && p.fracciones.length > 0)
          ? p.fracciones
          : [{ id: 'f-' + Date.now() + '-1', c_horas: '', t_horas: '' }];
        const newFrac = { id: 'f-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4), c_horas: '', t_horas: '' };
        return recalculateSumaFracciones(p, [...fracs, newFrac]);
      }
      return p;
    }));
  };

  const handleRemoveFraccion = (puntoId, fracId) => {
    setPuntos(puntos.map(p => {
      if (p.id === puntoId) {
        const fracs = (p.fracciones || []).filter(f => f.id !== fracId);
        const nextFracs = fracs.length > 0 ? fracs : [{ id: 'f-' + Date.now() + '-1', c_horas: '', t_horas: '' }];
        return recalculateSumaFracciones(p, nextFracs);
      }
      return p;
    }));
  };

  const handleFraccionChange = (puntoId, fracId, field, value) => {
    setPuntos(puntos.map(p => {
      if (p.id === puntoId) {
        const baseFracs = (p.fracciones && p.fracciones.length > 0)
          ? p.fracciones
          : [{ id: fracId || ('f-' + Date.now() + '-1'), c_horas: '', t_horas: '' }];
        const fracs = baseFracs.map(f => f.id === fracId ? { ...f, [field]: value } : f);
        return recalculateSumaFracciones(p, fracs);
      }
      return p;
    }));
  };

  const recalculateSumaFracciones = (p, fracs) => {
    let total = 0;
    let validCount = 0;
    fracs.forEach(f => {
      const c = parseFloat(f.c_horas);
      const t = parseFloat(f.t_horas);
      if (!isNaN(c) && c >= 0 && !isNaN(t) && t > 0) {
        total += (c / t);
        validCount++;
      }
    });

    return {
      ...p,
      fracciones: fracs,
      resultado_suma_fracciones: validCount > 0 ? Number(total.toFixed(3)).toString() : p.resultado_suma_fracciones
    };
  };

  // Specific Activity selection (Table 2 lookup)
  const handleActividadSelect = (puntoId, idx) => {
    setPuntos(puntos.map(p => {
      if (p.id === puntoId) {
        const item = ACTIVIDADES_ILUMINACION[idx];
        return {
          ...p,
          selectedActividadIndex: idx,
          valor_requerido_legal_lux: item ? String(item.lux) : p.valor_requerido_legal_lux
        };
      }
      return p;
    }));
  };

  // Handle geometry change (auto recalculates minimum measurement points)
  const handlePuntoGeometriaChange = (puntoId, field, val) => {
    setPuntos(puntos.map(p => {
      if (p.id !== puntoId) return p;
      const updatedPunto = { ...p, [field]: val };

      const largo = parseFloat(field === 'largo_m' ? val : updatedPunto.largo_m);
      const ancho = parseFloat(field === 'ancho_m' ? val : updatedPunto.ancho_m);
      const altura = parseFloat(field === 'altura_m' ? val : updatedPunto.altura_m);

      if (largo > 0 && ancho > 0 && altura > 0) {
        const indice_local = (largo * ancho) / (altura * (largo + ancho));
        const indice_local_corregido = indice_local >= 3 ? 4 : Math.ceil(indice_local);
        const numero_minimo_puntos_medicion = Math.pow(indice_local_corregido + 2, 2);

        let currentMediciones = [...updatedPunto.mediciones];
        if (currentMediciones.length < numero_minimo_puntos_medicion) {
          const needed = numero_minimo_puntos_medicion - currentMediciones.length;
          for (let i = 0; i < needed; i++) {
            currentMediciones.push({
              id: 'm-' + Date.now() + '-' + i + '-' + Math.random().toString(36).substr(2, 4),
              valor_lux: ''
            });
          }
          updatedPunto.mediciones = currentMediciones;
        }
      }

      return updatedPunto;
    }));
  };

  // SUBMIT FLOW - PROFILE SYNC WIZARD
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    try {
      if (!empresaId || !establecimientoId || !fechaMedicion) {
        globalToast.toast('Complete la Razón Social, Establecimiento y Fecha de la Evaluación.', 'error');
        return;
      }

      // Validaciones para guardado como COMPLETADO
      if (estado === 'completado') {
        if (puntos.length === 0) {
          globalToast.toast('Debe cargar al menos un puesto de trabajo.', 'error');
          return;
        }

        for (let i = 0; i < puntos.length; i++) {
          const p = puntos[i];
          const secStr = (p.sector_text || '').trim();
          const pstStr = (p.puesto_text || '').trim();

          if (!secStr) {
            globalToast.toast(`Falta definir el sector en el puesto #${i + 1}.`, 'error');
            return;
          }
          if (!pstStr) {
            globalToast.toast(`Falta definir el puesto en el puesto #${i + 1}.`, 'error');
            return;
          }
        }
      }

      // WIZARD: Escaneo de perfiles para sincronización
      const queue = [];
      const localSectors = JSON.parse(JSON.stringify(estSectoresLocal));

      puntos.forEach(p => {
        const sectorName = (p.sector_text || '').trim();
        const puestoName = (p.puesto_text || '').trim();
        const largo = parseFloat(p.largo_m);
        const ancho = parseFloat(p.ancho_m);
        const altura = parseFloat(p.altura_m);

        if (!sectorName) return;

        // 1. Validar si el sector ya existe en el perfil (búsqueda insensible a mayúsculas)
        let sectorIdx = localSectors.findIndex(s => (s.denominacion || '').toLowerCase() === sectorName.toLowerCase());

        if (sectorIdx === -1) {
          // El sector no existe
          queue.push({
            type: 'new_sector',
            sectorName,
            puestoName,
            largo,
            ancho,
            altura,
            message: `El sector "${sectorName}" ingresado no se encuentra cargado en el perfil del establecimiento. ¿Desea guardarlo para futuras mediciones?`
          });
        } else {
          // El sector existe. Validar si se modificaron o agregaron dimensiones
          const dbSec = localSectors[sectorIdx];
          const dbLargo = parseFloat(dbSec.largo);
          const dbAncho = parseFloat(dbSec.ancho);
          const dbAltura = parseFloat(dbSec.altura);

          const dimChanged = 
            (!isNaN(largo) && largo > 0 && largo !== dbLargo) ||
            (!isNaN(ancho) && ancho > 0 && ancho !== dbAncho) ||
            (!isNaN(altura) && altura > 0 && altura !== dbAltura);

          if (dimChanged) {
            queue.push({
              type: 'modify_dimensions',
              sectorIndex: sectorIdx,
              sectorName,
              largo: !isNaN(largo) ? largo : dbLargo,
              ancho: !isNaN(ancho) ? ancho : dbAncho,
              altura: !isNaN(altura) ? altura : dbAltura,
              message: `Se detectaron datos dimensionales nuevos o modificados para el sector "${sectorName}". ¿Desea actualizar el perfil del cliente?`
            });
          }

          // Validar si el puesto existe en ese sector
          if (puestoName) {
            const dbPuestos = dbSec.puestos || [];
            const puestoExists = dbPuestos.some(pst => (pst.denominacion || '').toLowerCase() === puestoName.toLowerCase());

            if (!puestoExists) {
              queue.push({
                type: 'new_puesto',
                sectorIndex: sectorIdx,
                sectorName,
                puestoName,
                message: `El puesto "${puestoName}" ingresado no se encuentra cargado en el sector "${sectorName}" del cliente. ¿Desea guardarlo para futuras mediciones?`
              });
            }
          }
        }
      });

      if (queue.length > 0) {
        setSyncQueue(queue);
        setSyncIndex(0);
        setIsSyncOpen(true);
      } else {
        // No hay sincronizaciones pendientes, guardar directamente
        await executeSave(localSectors);
      }
    } catch (err) {
      console.error('Error al enviar formulario:', err);
      globalToast.toast('Ocurrió un error al procesar el formulario.', 'error');
    }
  };

  // Handle Wizard action buttons (Sincronización en 1 solo clic)
  const handleSyncConfirm = async (action) => {
    let updatedSectors = [...estSectoresLocal];

    if (action === 'save_profile') {
      for (const item of syncQueue) {
        if (item.type === 'new_sector') {
          const existingIdx = updatedSectors.findIndex(s => (s.denominacion || '').toLowerCase() === item.sectorName.toLowerCase());
          if (existingIdx === -1) {
            const newSec = {
              id: 'sec-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
              denominacion: item.sectorName,
              descripcion: '',
              largo: item.largo || '',
              ancho: item.ancho || '',
              altura: item.altura || '',
              puestos: item.puestoName ? [{
                id: 'pst-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                denominacion: item.puestoName,
                descripcion: ''
              }] : []
            };
            updatedSectors.push(newSec);
          } else if (item.puestoName) {
            const puestos = [...(updatedSectors[existingIdx].puestos || [])];
            if (!puestos.some(pst => (pst.denominacion || '').toLowerCase() === item.puestoName.toLowerCase())) {
              puestos.push({
                id: 'pst-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                denominacion: item.puestoName,
                descripcion: ''
              });
              updatedSectors[existingIdx] = { ...updatedSectors[existingIdx], puestos };
            }
          }
        } else if (item.type === 'modify_dimensions') {
          if (updatedSectors[item.sectorIndex]) {
            updatedSectors[item.sectorIndex] = {
              ...updatedSectors[item.sectorIndex],
              largo: item.largo,
              ancho: item.ancho,
              altura: item.altura
            };
          }
        } else if (item.type === 'new_puesto') {
          if (updatedSectors[item.sectorIndex]) {
            const puestos = [...(updatedSectors[item.sectorIndex].puestos || [])];
            if (!puestos.some(pst => (pst.denominacion || '').toLowerCase() === item.puestoName.toLowerCase())) {
              puestos.push({
                id: 'pst-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                denominacion: item.puestoName,
                descripcion: ''
              });
              updatedSectors[item.sectorIndex] = { ...updatedSectors[item.sectorIndex], puestos };
            }
          }
        }
      }
      setEstSectoresLocal(updatedSectors);
    }

    setIsSyncOpen(false);
    await executeSave(action === 'save_profile' ? updatedSectors : estSectoresLocal);
  };

  // FINAL SAVE DATABASE WRITER
  const executeSave = async (sectorsToSave) => {
    setSaveLoading(true);
    try {
      let userId = profile?.id;
      if (!userId) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id;
        } catch (e) {
          console.warn('Network error fetching user in save:', e);
        }
      }
      if (!userId) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          userId = session?.user?.id;
        } catch (e) {
          console.warn('Network error fetching session in save:', e);
        }
      }
      if (!userId && !isDevMode) throw new Error('No autorizado');

      // 1. Si se actualizaron sectores, localidad, cp o horarios en el perfil del establecimiento, guardarlos en BD
      if (!isDevMode && establecimientoId) {
        const selectedEst = allEstablecimientos.find(e => e.id === establecimientoId);
        const updateData = {};
        
        if (sectorsToSave && sectorsToSave.length > 0) {
          updateData.sectores = sectorsToSave;
        }
        
        if (selectedEst) {
          if (!selectedEst.localidad_barrio && localidadText) {
            updateData.localidad_barrio = localidadText;
          }
          if (!selectedEst.cp && cpText) {
            updateData.cp = cpText;
          }
        }
        
        if (Object.keys(updateData).length > 0) {
          const { error: estUpdErr } = await supabase
            .from('establecimientos')
            .update(updateData)
            .eq('id', establecimientoId);
          if (estUpdErr) throw estUpdErr;
        }
      }

      const tempId = editingId || crypto.randomUUID();
      const resultadoGeneralVal = getResultadoGeneral();

      let finalFirmaProf = firmaProfSavedUrl;
      if (firmaTipo === 'perfil') {
        finalFirmaProf = signaturePath || '';
      } else if (firmaTipo === 'mano' && firmaProfCanvasRef.current && hasSignedProf) {
        finalFirmaProf = firmaProfCanvasRef.current.toDataURL('image/png');
      }

      let finalFirmaEmpleador = firmaEmpleadorSavedUrl;
      if (firmaEmpleadorCanvasRef.current && hasSignedEmpleador) {
        finalFirmaEmpleador = firmaEmpleadorCanvasRef.current.toDataURL('image/png');
      }

      let finalFirmaMedicina = firmaMedicinaSavedUrl;
      if (firmaMedicinaCanvasRef.current && hasSignedMedicina) {
        finalFirmaMedicina = firmaMedicinaCanvasRef.current.toDataURL('image/png');
      }

      const payloadProto = {
        id: tempId,
        tenant_id: tenant.id,
        user_id: userId || 'mock-user-id',
        organization_id: tenant.id,
        razon_social_id: isValidUuid(empresaId) ? empresaId : null,
        establecimiento_id: isValidUuid(establecimientoId) ? establecimientoId : null,
        razon_social_text: razonSocialText,
        cuit_text: cuitText,
        ciiu_text: ciiuText || null,
        establecimiento_text: establecimientoText,
        direccion_text: direccionText,
        provincia_text: provinciaText,
        localidad_text: localidadText,
        cp_text: cpText,
        fecha_medicion: convertToDbDate(fechaMedicion) || null,
        observaciones: observacionesGenerales || null,
        resultado_general: resultadoGeneralVal,
        profesional_nombre: profesionalNombre || null,
        profesional_matricula: profesionalMatricula || null,
        firma_tipo: firmaTipo,
        firma_profesional: finalFirmaProf || null,
        empleador_nombre: empleadorNombre || null,
        firma_empleador: finalFirmaEmpleador || null,
        medicina_nombre: medicinaNombre || null,
        medicina_matricula: medicinaMatricula || null,
        firma_medicina: finalFirmaMedicina || null,
        estado: estado,
        updated_at: new Date().toISOString()
      };

      if (isDevMode) {
        if (estado === 'completado') {
          globalToast.toast('Protocolo de Ergonomía guardado como COMPLETADO (Mock).', 'success');
        } else if (estado === 'anulado') {
          globalToast.toast('Protocolo de Ergonomía guardado como ANULADO (Mock).', 'success');
        } else {
          globalToast.toast('Protocolo guardado como BORRADOR (Mock).', 'info');
        }
        onSaveSuccess();
        return;
      }

      if (editingId) {
        payloadProto.updated_by = userId;
        const { error: prErr } = await supabase
          .from('protocolos_ergonomia')
          .update(payloadProto)
          .eq('id', editingId);
        if (prErr) throw prErr;
      } else {
        payloadProto.created_by = userId;
        payloadProto.created_at = new Date().toISOString();
        const { error: prErr } = await supabase
          .from('protocolos_ergonomia')
          .insert([payloadProto]);
        if (prErr) throw prErr;
      }

      // 2. Guardar Puntos de Muestreo (Cascade delete old ones first if editing)
      if (editingId) {
        const { error: delErr } = await supabase
          .from('protocolos_ergonomia_puntos')
          .delete()
          .eq('protocolo_id', editingId);
        if (delErr) throw delErr;
      }

      const pointsPayload = puntos.map((p, idx) => {
        const firstTask = (Array.isArray(p.tareas) && p.tareas.length > 0) ? p.tareas[0] : {};
        return {
          protocolo_id: tempId,
          orden: idx + 1,
          punto_muestreo: p.punto_muestreo,
          sector_id: isValidUuid(p.sector_id) ? p.sector_id : null,
          sector_text: p.sector_text || null,
          puesto_id: isValidUuid(p.puesto_id) ? p.puesto_id : null,
          puesto_text: p.puesto_text || null,
          cantidad_expuestos: parseInt(p.cantidad_expuestos) || 1,
          procedimiento_escrito: p.procedimiento_escrito || 'no',
          capacitacion: p.capacitacion || 'no',
          nombres_trabajadores: p.nombres_trabajadores || '',
          manifestacion_temprana: p.manifestacion_temprana || 'no',
          ubicacion_sintoma: p.ubicacion_sintoma || '',
          tareas: p.tareas || [],
          tiempos_exposicion: p.tiempos_exposicion || {},
          p4_medidas: p.p4_medidas || [],
          nivel_de_riesgo: typeof p.nivel_de_riesgo === 'number' ? p.nivel_de_riesgo : (parseInt(p.nivel_de_riesgo) || (p.nivel_de_riesgo === 'Alto' ? 3 : p.nivel_de_riesgo === 'Medio' ? 2 : 1)),
          resultado_punto: p.resultado_punto || 'Cumple',
          observaciones_punto: p.observaciones_punto || null,
          // Rellenar columnas legacy para compatibilidad básica desde la primera tarea (booleans para Postgres)
          tarea_desempenada: firstTask.nombre || null,
          f_levantamiento_identificado: firstTask.f_levantamiento_identificado === 'si',
          f_levantamiento_requiere_eval: !!firstTask.f_levantamiento_riesgo,
          f_empuje_arrastre_identificado: firstTask.f_empuje_arrastre_identificado === 'si',
          f_empuje_arrastre_requiere_eval: !!firstTask.f_empuje_arrastre_riesgo,
          f_transporte_identificado: firstTask.f_transporte_identificado === 'si',
          f_transporte_requiere_eval: !!firstTask.f_transporte_riesgo,
          f_bipedestacion_identificado: firstTask.f_bipedestacion_identificado === 'si',
          f_bipedestacion_requiere_eval: !!firstTask.f_bipedestacion_riesgo,
          f_mov_repetitivos_identificado: firstTask.f_mov_repetitivos_identificado === 'si',
          f_mov_repetitivos_requiere_eval: !!firstTask.f_mov_repetitivos_riesgo,
          f_posturas_forzadas_identificado: firstTask.f_posturas_forzadas_identificado === 'si',
          f_posturas_forzadas_requiere_eval: !!firstTask.f_posturas_forzadas_riesgo,
          f_vibraciones_identificado: (firstTask.f_vibraciones_mano_brazo_identificado === 'si' || firstTask.f_vibraciones_cuerpo_entero_identificado === 'si'),
          f_vibraciones_requiere_eval: !!(firstTask.f_vibraciones_mano_brazo_riesgo || firstTask.f_vibraciones_cuerpo_entero_riesgo),
          f_confort_termico_identificado: firstTask.f_confort_termico_identificado === 'si',
          f_confort_termico_requiere_eval: !!firstTask.f_confort_termico_riesgo
        };
      });

      let { data: insertedPoints, error: ptsErr } = await supabase
        .from('protocolos_ergonomia_puntos')
        .insert(pointsPayload)
        .select();

      if (ptsErr && (ptsErr.code === 'PGRST204' || ptsErr.message?.includes('p4_medidas'))) {
        const fallbackPayload = pointsPayload.map(({ p4_medidas, ...rest }) => rest);
        const { data: retryData, error: retryErr } = await supabase
          .from('protocolos_ergonomia_puntos')
          .insert(fallbackPayload)
          .select();
        if (retryErr) throw retryErr;
        insertedPoints = retryData;
      } else if (ptsErr) {
        throw ptsErr;
      }

      // 4. Guardar Adjuntos
      setSaveLoading(true);

      const updatedAdjuntos = [...adjuntos];
      for (let i = 0; i < updatedAdjuntos.length; i++) {
        const ad = updatedAdjuntos[i];
        if ((ad.tipo === 'Evidencia Fotográfica Plano' || ad.tipo === 'Foto Plano') && ad.markers && ad.markers.length > 0) {
          let resolvedUrl = ad.originalPath || ad.path;
          if (!resolvedUrl.startsWith('http') && !resolvedUrl.startsWith('data:')) {
            const { data } = await supabase.storage
              .from('protocolos-ergonomia')
              .createSignedUrl(resolvedUrl, 3600);
            if (data?.signedUrl) {
              resolvedUrl = data.signedUrl;
            }
          }

          const bakedDataUrl = await bakeImageWithMarkers(resolvedUrl, ad.markers);
          if (bakedDataUrl) {
            const cleanName = ad.name || `foto_${Date.now()}.jpg`;
            const blob = dataURLtoBlob(bakedDataUrl);
            const file = new File([blob], `baked_${Date.now()}_${cleanName.replace(/\s+/g, '_')}`, { type: 'image/jpeg' });
            
            const uuid = editingId || tempId;
            const filename = `${userId}/${uuid}/adjuntos/${Date.now()}_baked_${cleanName.replace(/\s+/g, '_')}`;
            const { error: uploadErr } = await supabase.storage
              .from('protocolos-ergonomia')
              .upload(filename, file, { cacheControl: '3600', upsert: true });
              
            if (!uploadErr) {
              const { data: sData } = await supabase.storage
                .from('protocolos-ergonomia')
                .createSignedUrl(filename, 3600);

              updatedAdjuntos[i] = {
                ...ad,
                path: filename,
                preview: sData?.signedUrl || ad.preview
              };
            } else {
              console.error('Error uploading baked image:', uploadErr);
            }
          }
        }
      }

      if (editingId) {
        const { error: delAdjErr } = await supabase
          .from('protocolos_ergonomia_adjuntos')
          .delete()
          .eq('protocolo_id', editingId);
        if (delAdjErr) throw delAdjErr;
      }

      if (updatedAdjuntos.length > 0) {
        const adjPayload = updatedAdjuntos.map(ad => {
          const hasMarkers = ad.markers && ad.markers.length > 0;
          
          let dbPreview = ad.preview;
          if (dbPreview && dbPreview.startsWith('data:')) {
            dbPreview = ''; // Evitar guardar base64 en la base de datos
          }

          return {
            protocolo_id: tempId,
            tipo: ad.tipo,
            nombre_archivo: ad.name,
            storage_path: hasMarkers ? ad.path : (ad.originalPath || ad.path),
            public_url: hasMarkers ? dbPreview : (ad.originalPath && ad.originalPath.startsWith('http') ? ad.originalPath : dbPreview),
            original_path: ad.originalPath || ad.path,
            markers: ad.markers || [],
            created_by: userId
          };
        });

        const { error: insAdjErr } = await supabase
          .from('protocolos_ergonomia_adjuntos')
          .insert(adjPayload);
        if (insAdjErr) throw insAdjErr;
      }

      if (estado === 'completado') {
        globalToast.toast('Protocolo de Ergonomía guardado como COMPLETADO.', 'success');
      } else if (estado === 'anulado') {
        globalToast.toast('Protocolo de Ergonomía guardado como ANULADO.', 'success');
      } else {
        globalToast.toast('Protocolo guardado como BORRADOR.', 'info');
      }
      onSaveSuccess();
    } catch (err) {
      console.error(err);
      globalToast.toast('Error al persistir el protocolo en la base de datos.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const selectedEst = allEstablecimientos.find(e => e.id === establecimientoId);
  const estHasLocalidad = selectedEst && !!selectedEst.localidad_barrio;
  const estHasCp = selectedEst && !!selectedEst.cp;
  const estHasHorarios = selectedEst && !!selectedEst.horario_funcionamiento;

  if (loading) {
    return (
      <div className="bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden flex flex-col h-full md:h-[calc(100vh-128px)] animate-fade-in w-full">
        <AppLoadingSpinner message="Cargando protocolo de ergonomía..." />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden flex flex-col h-full md:h-[calc(100vh-128px)] animate-fade-in w-full">
      {/* Cabecera del Formulario */}
      <div className="h-16 px-2 sm:px-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button type="button" onClick={handleExitAttempt} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-outfit text-sm sm:text-base font-bold text-slate-900 truncate max-w-[120px] xs:max-w-[170px] sm:max-w-none shrink-0" title={mode === 'create' ? 'Nuevo Protocolo de Ergonomía' : mode === 'edit' ? 'Editar Protocolo de Ergonomía' : 'Detalle de Protocolo de Ergonomía'}>
            {mode === 'create' ? 'Nuevo Protocolo' : mode === 'edit' ? 'Editar Protocolo' : 'Detalle Protocolo'}
          </span>
          <button
            type="button"
            onClick={() => setIsResolucionModalOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-50 text-[#468DFF] hover:bg-[#468DFF] hover:text-white border border-blue-200 rounded-lg text-[10px] sm:text-xs font-bold transition-all active:scale-95 cursor-pointer ml-1 sm:ml-1.5 shrink-0"
            title="Ver Instructivo de Completado (Resolución SRT N° 886/15)"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Resolución SRT N° 886/15</span>
            <span className="hidden sm:inline md:hidden">Res. 886/15</span>
            <span className="sm:hidden">Guía 886</span>
          </button>
        </div>
        <button type="button" onClick={handleExitAttempt} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer shrink-0">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 select-none overflow-y-auto flex-1 scrollbar-thin">
        
        {/* CARD ESTABLECIMIENTO Y PLANILLA 1 */}
        <AppCard className="p-3.5 sm:p-5 md:p-6 space-y-4">
          {/* BANNER ANEXO I - PLANILLA 1 */}
          <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#468DFF] shrink-0" />
              <div>
                <h5 className="font-extrabold text-slate-800 font-outfit uppercase tracking-wider text-xs">
                  ANEXO I- PLANILLA 1: IDENTIFICACION DE FACTORES DE RIESGO
                </h5>
                <p className="text-[11px] font-bold text-[#468DFF] uppercase tracking-wide mt-0.5">
                  Identificación de Factores de Riesgo
                </p>
              </div>
            </div>
            <div className="bg-white/80 border border-slate-200/80 px-3 py-1 rounded-md shadow-sm shrink-0 self-start sm:self-auto">
              <p className="text-xs font-bold text-slate-700">
                Resolución SRT <span className="text-slate-900 font-extrabold">N° 886/15</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building className="h-5 w-5 text-[#468DFF]" />
            <h2 className="font-outfit text-base font-extrabold text-slate-800">Datos del Establecimiento</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <AppLabel htmlFor="empresaId" required>Razón Social</AppLabel>
              {isReadOnly ? (
                <AppInput id="empresaId" disabled value={razonSocialText} />
              ) : (
                <AppSelect
                  id="empresaId"
                  disabled={!canEdit}
                  value={empresaId}
                  onChange={(e) => handleEmpresaChange(e.target.value)}
                  placeholder="Selecciona una Razón Social..."
                >
                  {empresas.map(e => (
                    <option key={e.id} value={e.id}>{e.razon_social}</option>
                  ))}
                </AppSelect>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <AppLabel htmlFor="cuitText">C.U.I.T.</AppLabel>
              <AppInput id="cuitText" disabled value={cuitText} />
            </div>

            <div className="flex flex-col gap-1 col-span-full">
              <AppLabel htmlFor="ciiuText">CIIU</AppLabel>
              <AppInput id="ciiuText" disabled value={ciiuText} />
            </div>

            <div className="flex flex-col gap-1">
              <AppLabel htmlFor="establecimientoId" required>Establecimiento</AppLabel>
              {isReadOnly ? (
                <AppInput id="establecimientoId" disabled value={establecimientoText} />
              ) : (
                <AppSelect
                  id="establecimientoId"
                  disabled={!empresaId || !canEdit}
                  value={establecimientoId}
                  onChange={(e) => handleEstablecimientoChange(e.target.value)}
                  placeholder="Selecciona un establecimiento..."
                >
                  {allEstablecimientos
                    .filter(e => e.empresa_id === empresaId)
                    .map(e => (
                      <option key={e.id} value={e.id}>{e.denominacion}</option>
                    ))}
                </AppSelect>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <AppLabel htmlFor="direccionText">Dirección</AppLabel>
              <AppInput id="direccionText" disabled value={direccionText} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-full">
              <div className="flex flex-col gap-1 md:col-span-1">
                <AppLabel htmlFor="provinciaText">Provincia</AppLabel>
                <AppInput id="provinciaText" disabled value={provinciaText} />
              </div>
              <div className="flex flex-col gap-1 md:col-span-1">
                <AppLabel htmlFor="localidadText">Localidad</AppLabel>
                <AppInput 
                  id="localidadText"
                  disabled={isReadOnly || (!!establecimientoId && estHasLocalidad)} 
                  value={localidadText} 
                  onChange={(e) => setLocalidadText(e.target.value)}
                  placeholder="Localidad del establecimiento"
                />
              </div>
              <div className="flex flex-col gap-1 md:col-span-1">
                <AppLabel htmlFor="cpText">C.P.</AppLabel>
                <AppInput 
                  id="cpText"
                  disabled={isReadOnly || (!!establecimientoId && estHasCp)} 
                  value={cpText} 
                  onChange={(e) => setCpText(e.target.value)}
                  placeholder="C.P."
                />
              </div>
            </div>
          </div>

          {/* SEPARADOR DE SECCIÓN */}
          <div className="border-t border-slate-200 my-4" />

          {/* SECCIÓN DATOS DE LA EVALUACIÓN */}
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#468DFF]" />
                Datos de la evaluación
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1 max-w-[240px]">
                <AppLabel htmlFor="fechaMedicion" required>Fecha de la Evaluación</AppLabel>
                <div className="relative">
                  <AppInput
                    id="fechaMedicion"
                    disabled={!canEdit}
                    placeholder="DD/MM/AAAA"
                    value={fechaMedicion}
                    onChange={(e) => setFechaMedicion(formatAsDateInput(e.target.value))}
                  />
                  {canEdit && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                      <Calendar className="h-4 w-4" />
                      <input
                        type="date"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            const parts = val.split('-');
                            if (parts.length === 3) {
                              setFechaMedicion(`${parts[2]}/${parts[1]}/${parts[0]}`);
                            }
                          } else {
                            setFechaMedicion('');
                          }
                        }}
                      />
                    </div>
                  )}
                  {!canEdit && (
                    <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  )}
                </div>
              </div>

              {puntos.map((p, idx) => {
                const cal = getPuntoCalculos(p);

                return (
                  <div key={p.id} className="space-y-4 pt-2">
                    {/* Datos generales del puesto sin tarjeta interna */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <AppLabel htmlFor={`sector-sel-${p.id}`} required={estado === 'completado'}>Área y sector de estudio</AppLabel>
                          {isReadOnly ? (
                            <AppInput id={`sector-sel-${p.id}`} disabled value={p.sector_text} />
                          ) : (
                            <AppSelect
                              id={`sector-sel-${p.id}`}
                              placeholder={null}
                              disabled={!establecimientoId}
                              value={p.sector_id || (p.sector_text ? '__custom__' : '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__custom__') {
                                  handlePuntoSectorChange(p.id, '__custom__');
                                } else {
                                  handlePuntoSectorChange(p.id, val);
                                }
                              }}
                            >
                              <option value="">Selecciona sector...</option>
                              {estSectoresLocal.map(s => (
                                <option key={s.id} value={s.id}>{s.denominacion}</option>
                              ))}
                              <option value="__custom__">+ Ingresar sector manual...</option>
                            </AppSelect>
                          )}
                          {!p.sector_id && canEdit && (
                            <AppInput
                              placeholder="Escribir sector manual..."
                              className="mt-1"
                              value={p.sector_text}
                              onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, sector_text: e.target.value } : x))}
                            />
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <AppLabel htmlFor={`puesto-sel-${p.id}`}>Puesto / Sección</AppLabel>
                          {isReadOnly ? (
                            <AppInput id={`puesto-sel-${p.id}`} disabled value={p.puesto_text} />
                          ) : (
                            <AppSelect
                              id={`puesto-sel-${p.id}`}
                              placeholder={null}
                              disabled={!p.sector_id}
                              value={p.puesto_id || (p.puesto_text ? '__custom__' : '')}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__custom__') {
                                  handlePuntoPuestoChange(p.id, '__custom__');
                                } else {
                                  handlePuntoPuestoChange(p.id, val);
                                }
                              }}
                            >
                              <option value="">Selecciona puesto...</option>
                              {p.sector_id && estSectoresLocal.find(s => s.id === p.sector_id)?.puestos?.map(pst => (
                                <option key={pst.id} value={pst.id}>{pst.denominacion}</option>
                              ))}
                              <option value="__custom__">+ Ingresar puesto manual...</option>
                            </AppSelect>
                          )}
                          {(!p.puesto_id) && canEdit && (
                            <AppInput
                              placeholder="Escribir puesto manual..."
                              className="mt-1"
                              value={p.puesto_text}
                              onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, puesto_text: e.target.value } : x))}
                            />
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <AppLabel htmlFor={`expuestos-${p.id}`} required={estado === 'completado'}>
                            Número de trabajadores en el puesto
                          </AppLabel>
                          <AppInput
                            id={`expuestos-${p.id}`}
                            disabled={!canEdit}
                            type="number"
                            min="1"
                            value={p.cantidad_expuestos || '1'}
                            onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, cantidad_expuestos: e.target.value } : x))}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <AppLabel htmlFor={`nombres-trabajadores-${p.id}`}>
                            Nombre del trabajador/es
                          </AppLabel>
                          <AppInput
                            id={`nombres-trabajadores-${p.id}`}
                            disabled={!canEdit}
                            placeholder="Aclaración de nombres..."
                            value={p.nombres_trabajadores || ''}
                            onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, nombres_trabajadores: e.target.value } : x))}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <AppLabel>
                            Procedimiento de trabajo escrito
                          </AppLabel>
                          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-1 w-full max-w-[200px] shrink-0">
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setPuntos(puntos.map(x => x.id === p.id ? { ...x, procedimiento_escrito: 'si' } : x))}
                              className={`flex-1 py-1.5 text-xs font-bold transition-all rounded-md text-center cursor-pointer ${
                                p.procedimiento_escrito === 'si'
                                  ? 'bg-[#468DFF] text-white shadow-sm'
                                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                              }`}
                            >
                              Sí
                            </button>
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setPuntos(puntos.map(x => x.id === p.id ? { ...x, procedimiento_escrito: 'no' } : x))}
                              className={`flex-1 py-1.5 text-xs font-bold transition-all rounded-md text-center cursor-pointer ${
                                (p.procedimiento_escrito || 'no') === 'no'
                                  ? 'bg-slate-500 text-white shadow-sm'
                                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <AppLabel>
                            Capacitación
                          </AppLabel>
                          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-1 w-full max-w-[200px] shrink-0">
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setPuntos(puntos.map(x => x.id === p.id ? { ...x, capacitacion: 'si' } : x))}
                              className={`flex-1 py-1.5 text-xs font-bold transition-all rounded-md text-center cursor-pointer ${
                                p.capacitacion === 'si'
                                  ? 'bg-[#468DFF] text-white shadow-sm'
                                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                              }`}
                            >
                              Sí
                            </button>
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setPuntos(puntos.map(x => x.id === p.id ? { ...x, capacitacion: 'no' } : x))}
                              className={`flex-1 py-1.5 text-xs font-bold transition-all rounded-md text-center cursor-pointer ${
                                (p.capacitacion || 'no') === 'no'
                                  ? 'bg-slate-500 text-white shadow-sm'
                                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <AppLabel>
                            Manifestación Temprana
                          </AppLabel>
                          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-1 w-full max-w-[200px] shrink-0">
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setPuntos(puntos.map(x => x.id === p.id ? { ...x, manifestacion_temprana: 'si' } : x))}
                              className={`flex-1 py-1.5 text-xs font-bold transition-all rounded-md text-center cursor-pointer ${
                                p.manifestacion_temprana === 'si'
                                  ? 'bg-[#468DFF] text-white shadow-sm'
                                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                              }`}
                            >
                              Sí
                            </button>
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setPuntos(puntos.map(x => x.id === p.id ? { ...x, manifestacion_temprana: 'no' } : x))}
                              className={`flex-1 py-1.5 text-xs font-bold transition-all rounded-md text-center cursor-pointer ${
                                (p.manifestacion_temprana || 'no') === 'no'
                                  ? 'bg-slate-500 text-white shadow-sm'
                                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <AppLabel htmlFor={`sintoma-${p.id}`}>
                            Ubicación del síntoma
                          </AppLabel>
                          <AppInput
                            id={`sintoma-${p.id}`}
                            disabled={!canEdit || p.manifestacion_temprana !== 'si'}
                            placeholder={p.manifestacion_temprana === 'si' ? "Ej: hombro derecho, lumbar..." : "No aplica"}
                            value={p.ubicacion_sintoma || ''}
                            onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, ubicacion_sintoma: e.target.value } : x))}
                          />
                        </div>
                      </div>

                      {/* Contenedor de Tareas Habituales */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                          <h4 className="font-extrabold text-slate-800 font-outfit uppercase tracking-wider text-xs">
                            Tareas Habituales del Puesto
                          </h4>
                          {canEdit && (
                            <AppButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="text-xs font-bold px-3 py-1 h-7 shrink-0 w-auto"
                              onClick={() => {
                                const newTarea = createNewTareaHabitual(p.tareas.length + 1);
                                setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: [...x.tareas, newTarea] } : x));
                              }}
                            >
                              + Agregar Tarea
                            </AppButton>
                          )}
                        </div>

                        <p className="text-xs font-medium text-slate-600 leading-relaxed">
                          <span className="font-bold text-slate-800">Paso 1:</span> Identificar para el puesto de trabajo, las tareas y los factores de riesgo que se presentan de forma habitual en cada una de ellas.
                        </p>

                        <div className="space-y-4">
                          {p.tareas?.map((t, tIdx) => {
                            const isCollapsed = !!collapsedTareas[t.id];
                            return (
                              <div key={t.id} className="border border-slate-200 rounded-lg p-2.5 sm:p-3 bg-slate-50/50 space-y-3">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 border-b border-slate-200/50 pb-2.5 sm:pb-0 sm:border-b-0">
                                  <div className="flex items-center gap-2 justify-between sm:justify-start w-full sm:w-auto">
                                    <span className="text-[11px] font-bold text-slate-650 bg-slate-200/80 px-3 py-1 rounded uppercase tracking-wider whitespace-nowrap">
                                      Tarea #{tIdx + 1}
                                    </span>
                                    {/* Botones de control en móviles */}
                                    <div className="flex items-center gap-1.5 sm:hidden shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCollapsedTareas(prev => ({
                                            ...prev,
                                            [t.id]: !prev[t.id]
                                          }));
                                        }}
                                        className="p-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded transition-colors cursor-pointer inline-flex items-center justify-center h-7 w-7"
                                        title={isCollapsed ? "Expandir tarea" : "Contraer tarea"}
                                      >
                                        {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                      </button>

                                      {canEdit && (
                                        <>
                                          <button
                                            type="button"
                                            title="Duplicar tarea"
                                            onClick={() => {
                                              const dupTarea = {
                                                ...t,
                                                id: 't-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                                                orden: p.tareas.length + 1,
                                                nombre: t.nombre + ' (Copia)'
                                              };
                                              setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: [...x.tareas, dupTarea] } : x));
                                            }}
                                            className="p-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded transition-colors cursor-pointer inline-flex items-center justify-center h-7 w-7"
                                          >
                                            <Copy className="h-3.5 w-3.5" />
                                          </button>
                                          {p.tareas.length > 1 && (
                                            <button
                                              type="button"
                                              title="Eliminar tarea"
                                              onClick={() => {
                                                const filteredTareas = p.tareas.filter(x => x.id !== t.id).map((x, idx) => ({ ...x, orden: idx + 1 }));
                                                setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: filteredTareas } : x));
                                              }}
                                              className="p-1 bg-white hover:bg-red-50 border border-red-200 text-red-500 rounded transition-colors cursor-pointer inline-flex items-center justify-center h-7 w-7"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-grow w-full">
                                    <AppInput
                                      disabled={!canEdit}
                                      placeholder="Ej: Embalar pedidos, Cargar pallets..."
                                      className="h-8 text-xs bg-white w-full"
                                      value={t.nombre || ''}
                                      onChange={(e) => {
                                        const updatedTareas = p.tareas.map(x => x.id === t.id ? { ...x, nombre: e.target.value } : x);
                                        setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                      }}
                                    />
                                  </div>
                                  {/* Botones de control en escritorio */}
                                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCollapsedTareas(prev => ({
                                          ...prev,
                                          [t.id]: !prev[t.id]
                                        }));
                                      }}
                                      className="p-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
                                      title={isCollapsed ? "Expandir tarea" : "Contraer tarea"}
                                    >
                                      {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                                    </button>

                                    {canEdit && (
                                      <>
                                        <button
                                          type="button"
                                          title="Duplicar tarea"
                                          onClick={() => {
                                            const dupTarea = {
                                              ...t,
                                              id: 't-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                                              orden: p.tareas.length + 1,
                                              nombre: t.nombre + ' (Copia)'
                                            };
                                            setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: [...x.tareas, dupTarea] } : x));
                                          }}
                                          className="p-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
                                        >
                                          <Copy className="h-3 w-3" />
                                        </button>
                                        {p.tareas.length > 1 && (
                                          <button
                                            type="button"
                                            title="Eliminar tarea"
                                            onClick={() => {
                                              const filteredTareas = p.tareas.filter(x => x.id !== t.id).map((x, idx) => ({ ...x, orden: idx + 1 }));
                                              setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: filteredTareas } : x));
                                            }}
                                            className="p-1 bg-white hover:bg-red-50 border border-red-200 text-red-500 rounded transition-colors cursor-pointer"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>

                                {!isCollapsed && (
                                  <div className="space-y-4 pt-1">
                                    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                                    <table className="w-full text-xs text-left border-collapse block md:table">
                                    <thead className="hidden md:table-header-group">
                                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="p-2">Identificación de Factores de Riesgo</th>
                                        <th className="p-2 text-center w-24">¿Presente?</th>
                                        <th className="p-2 text-center w-32">Tiempo Exp.</th>
                                        <th className="p-2 text-center w-36">Nivel de Riesgo</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 block md:table-row-group">
                                      {[
                                        { key: 'levantamiento', label: 'A. Levantamiento y descenso' },
                                        { key: 'empuje_arrastre', label: 'B. Empuje / Arrastre' },
                                        { key: 'transporte', label: 'C. Transporte' },
                                        { key: 'bipedestacion', label: 'D. Bipedestación' },
                                        { key: 'mov_repetitivos', label: 'E. Movimientos Repetitivos de MMSS' },
                                        { key: 'posturas_forzadas', label: 'F. Posturas Forzadas' },
                                        { key: 'vibraciones_mano_brazo', label: 'G. Vibraciones Mano - Brazo (5 a 1500 Hz)' },
                                        { key: 'vibraciones_cuerpo_entero', label: 'G2. Vibraciones Cuerpo Entero (1 a 80 Hz)' },
                                        { key: 'confort_termico', label: 'H. Confort Térmico' },
                                        { key: 'estres_contacto', label: 'I. Estrés de Contacto' }
                                      ].map((f) => {
                                        const idKey = `f_${f.key}_identificado`;
                                        const rskKey = `f_${f.key}_riesgo`;
                                        const isPresent = t[idKey] === 'si';
                                        const factorCollapsedKey = `${t.id}_${f.key}`;
                                        const isFactorCollapsed = !!collapsedFactores[factorCollapsedKey];
                                        return (
                                          <React.Fragment key={f.key}>
                                            <tr className="hover:bg-slate-50/50 flex flex-col md:table-row p-3 md:p-0 border-b border-slate-100 md:border-b-0 w-full">
                                              <td className="p-2 font-medium text-slate-750 block md:table-cell w-full">
                                                <div className="flex items-center gap-1.5 justify-between md:justify-start">
                                                  <span>{f.label}</span>
                                                  <div className="flex items-center gap-1">
                                                    {isPresent && (
                                                      <span className="text-[9px] font-bold bg-[#468DFF]/10 text-[#468DFF] border border-[#468DFF]/25 px-1.5 py-0.2 rounded-full uppercase">
                                                        Planilla 2
                                                      </span>
                                                    )}
                                                    {isPresent && (
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setCollapsedFactores(prev => ({
                                                            ...prev,
                                                            [factorCollapsedKey]: !prev[factorCollapsedKey]
                                                          }));
                                                        }}
                                                        className="p-1 hover:bg-slate-200 text-slate-500 rounded transition-colors cursor-pointer inline-flex items-center"
                                                        title={isFactorCollapsed ? "Expandir evaluación" : "Colapsar evaluación"}
                                                      >
                                                        {isFactorCollapsed ? (
                                                          <ChevronDown className="h-3 w-3" />
                                                        ) : (
                                                          <ChevronUp className="h-3 w-3" />
                                                        )}
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="p-1.5 sm:p-2 block md:table-cell flex items-center justify-between md:justify-center gap-2 flex-nowrap w-full">
                                                <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase w-20 shrink-0 text-left">¿Presente?:</span>
                                                <div className="inline-flex rounded-md shadow-sm border border-slate-300 overflow-hidden bg-white shrink-0 flex-nowrap">
                                                  <button
                                                    type="button"
                                                    disabled={!canEdit}
                                                    onClick={() => {
                                                      const updatedTareas = p.tareas.map(x => {
                                                        if (x.id === t.id) {
                                                          return { 
                                                            ...x, 
                                                            [idKey]: 'si', 
                                                            [rskKey]: x[rskKey] || '1' 
                                                          };
                                                        }
                                                        return x;
                                                      });
                                                      setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                    }}
                                                    className={`px-3 py-1 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                                                      isPresent
                                                        ? 'bg-[#468DFF] text-white shadow-inner'
                                                        : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 bg-white'
                                                    }`}
                                                  >
                                                    Sí
                                                  </button>
                                                  <button
                                                    type="button"
                                                    disabled={!canEdit}
                                                    onClick={() => {
                                                      const updatedTareas = p.tareas.map(x => {
                                                        if (x.id === t.id) {
                                                          return { 
                                                            ...x, 
                                                            [idKey]: 'no', 
                                                            [rskKey]: '' 
                                                          };
                                                        }
                                                        return x;
                                                      });
                                                      setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                    }}
                                                    className={`px-3 py-1 text-xs font-bold border-l border-slate-200 transition-all cursor-pointer shrink-0 ${
                                                      !isPresent
                                                        ? 'bg-slate-500 text-white shadow-inner'
                                                        : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 bg-white'
                                                    }`}
                                                  >
                                                    No
                                                  </button>
                                                </div>
                                              </td>
                                              <td className="p-1.5 sm:p-2 block md:table-cell flex items-center justify-between md:justify-center gap-2 flex-nowrap w-full">
                                                <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase w-20 shrink-0 text-left">Tiempo Exp.:</span>
                                                {(() => {
                                                  const tiempoRaw = t[`f_${f.key}_tiempo`] || '';
                                                  const { valor, unidad } = parseTiempo(tiempoRaw);
                                                  return (
                                                    <div className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-white shrink-0 w-24 xs:w-28 sm:w-32 md:w-28 mx-auto h-8 shadow-sm">
                                                      <input
                                                        type="text"
                                                        disabled={!canEdit || !isPresent}
                                                        placeholder="Ej: 60"
                                                        value={valor}
                                                        onChange={(e) => {
                                                          const newValor = e.target.value;
                                                          const newVal = newValor ? `${newValor} ${unidad}` : unidad;
                                                          const updatedTareas = p.tareas.map(x => x.id === t.id ? { ...x, [`f_${f.key}_tiempo`]: newVal } : x);
                                                          setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                        }}
                                                        className="w-full min-w-0 text-center text-xs h-full border-0 focus:ring-0 focus:outline-none font-semibold text-slate-800 bg-transparent px-1"
                                                      />
                                                      <div className="h-4 w-[1px] bg-slate-200 shrink-0" />
                                                      <button
                                                        type="button"
                                                        disabled={!canEdit || !isPresent}
                                                        onClick={() => {
                                                          const nextUnit = unidad === 'min' ? 'hs' : 'min';
                                                          const newVal = valor ? `${valor} ${nextUnit}` : nextUnit;
                                                          const updatedTareas = p.tareas.map(x => x.id === t.id ? { ...x, [`f_${f.key}_tiempo`]: newVal } : x);
                                                          setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                        }}
                                                        className={`w-10 shrink-0 flex items-center justify-center h-full text-[10px] font-extrabold uppercase transition-all cursor-pointer select-none ${
                                                          !isPresent
                                                            ? 'text-slate-400 bg-slate-50'
                                                            : unidad === 'min'
                                                            ? 'bg-blue-50 text-[#468DFF] hover:bg-blue-100/70'
                                                            : 'bg-amber-50 text-amber-600 hover:bg-amber-100/70'
                                                        }`}
                                                      >
                                                        {unidad}
                                                      </button>
                                                    </div>
                                                  );
                                                })()}
                                              </td>
                                              <td className="p-1.5 sm:p-2 block md:table-cell flex items-center justify-between md:justify-center gap-2 whitespace-nowrap flex-nowrap w-full">
                                                <span className="md:hidden text-[10px] font-bold text-slate-400 uppercase w-20 shrink-0 text-left">Riesgo:</span>
                                                {(() => {
                                                  if (!isPresent) {
                                                    return (
                                                      <span className="inline-block px-2.5 py-1 rounded text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wide shrink-0">
                                                        Sin Evaluar
                                                      </span>
                                                    );
                                                  }
                                                  
                                                  const rskVal = t[rskKey] || '1';
                                                  if (rskVal === '3') {
                                                    return (
                                                      <span className="inline-block px-2.5 py-1 rounded text-xs font-bold bg-red-50 text-red-600 border border-red-200 uppercase tracking-wide shrink-0">
                                                        Nivel 3
                                                      </span>
                                                    );
                                                  }
                                                  if (rskVal === '2') {
                                                    return (
                                                      <span className="inline-block px-2.5 py-1 rounded text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-wide shrink-0">
                                                        Nivel 2
                                                      </span>
                                                    );
                                                  }
                                                  return (
                                                    <span className="inline-block px-2.5 py-1 rounded text-xs font-bold bg-[#00B050]/10 text-[#00B050] border border-[#00B050]/20 uppercase tracking-wide shrink-0">
                                                      Nivel 1
                                                    </span>
                                                  );
                                                })()}
                                              </td>
                                            </tr>
                                            {isPresent && !isFactorCollapsed && (
                                              <tr className="bg-[#468DFF]/5 flex flex-col md:table-row w-full">
                                                <td colSpan={4} className="p-3 border-b border-slate-200 block md:table-cell w-full">
                                                  <div className="space-y-2 text-xs">
                                                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                                                      <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">
                                                        ANEXO I- PLANILLA 2: EVALUACION INICIAL DE FACTORES DE RIESGO — {f.label}
                                                      </span>
                                                      <span className="text-[10px] text-slate-500 italic">
                                                        Responda Sí/No para evaluar el nivel de riesgo
                                                      </span>
                                                    </div>

                                                    {/* Renderizado condicional para estructuración de dos pasos */}
                                                    {CUESTIONARIOS_PLANILLA2[f.key]?.isTwoStep ? (
                                                      <div className="space-y-4">
                                                        {/* Paso 1 */}
                                                        <div className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-inner">
                                                          <h5 className="font-bold text-slate-800 border-b border-slate-100 pb-1 uppercase text-[9px] tracking-wider text-slate-500">
                                                            Paso 1: Identificar si la tarea del puesto de trabajo implica:
                                                          </h5>
                                                          {CUESTIONARIOS_PLANILLA2[f.key].paso1.map((q) => {
                                                            const currentRespuestas = t[`f_${f.key}_respuestas`] || {};
                                                            const ansValue = currentRespuestas[q.id] || 'no';
                                                            return (
                                                              <div key={q.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-4 py-2 sm:py-1 border-b border-slate-100 last:border-0">
                                                                <span className="text-slate-650 font-medium text-left">{q.text}</span>
                                                                <div className="flex w-full sm:w-auto rounded-md shadow-sm border border-slate-300 overflow-hidden bg-white shrink-0 flex-nowrap">
                                                                   <button
                                                                     type="button"
                                                                     disabled={!canEdit}
                                                                     onClick={() => {
                                                                       const newRespuestas = { ...currentRespuestas, [q.id]: 'si' };
                                                                       let autoSuggestedRisk = '1';
                                                                       const triggerNivel3 = f.key === 'transporte' ? (newRespuestas['p1_5'] === 'si') : f.key === 'mov_repetitivos' ? (newRespuestas['p2_3'] === 'si') : (f.key === 'bipedestacion' || f.key === 'posturas_forzadas' || f.key === 'vibraciones_mano_brazo' || f.key === 'vibraciones_cuerpo_entero' || f.key === 'confort_termico' || f.key === 'estres_contacto') ? false : (newRespuestas['p1_3'] === 'si');
                                                                       if (triggerNivel3) {
                                                                         autoSuggestedRisk = '3';
                                                                       } else {
                                                                         const hasAnyP1Si = Object.keys(newRespuestas).some(k => k.startsWith('p1_') && newRespuestas[k] === 'si');
                                                                         if (hasAnyP1Si) {
                                                                           const anyP2Si = Object.keys(newRespuestas).some(k => k.startsWith('p2_') && newRespuestas[k] === 'si');
                                                                           autoSuggestedRisk = anyP2Si ? '2' : '1';
                                                                         }
                                                                       }
                                                                       const updatedTareas = p.tareas.map(x => {
                                                                         if (x.id === t.id) {
                                                                           return { 
                                                                             ...x, 
                                                                             [`f_${f.key}_respuestas`]: newRespuestas,
                                                                             [rskKey]: autoSuggestedRisk
                                                                           };
                                                                         }
                                                                         return x;
                                                                       });
                                                                       setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                                     }}
                                                                     className={`flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center shrink-0 ${
                                                                       ansValue === 'si'
                                                                         ? 'bg-[#468DFF] text-white shadow-inner'
                                                                         : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 bg-white'
                                                                     }`}
                                                                   >
                                                                     Sí
                                                                   </button>
                                                                  <button
                                                                    type="button"
                                                                    disabled={!canEdit}
                                                                    onClick={() => {
                                                                      const newRespuestas = { ...currentRespuestas, [q.id]: 'no' };
                                                                      let autoSuggestedRisk = '1';
                                                                      const triggerNivel3 = f.key === 'transporte' ? (newRespuestas['p1_5'] === 'si') : f.key === 'mov_repetitivos' ? (newRespuestas['p2_3'] === 'si') : (f.key === 'bipedestacion' || f.key === 'posturas_forzadas' || f.key === 'vibraciones_mano_brazo' || f.key === 'vibraciones_cuerpo_entero' || f.key === 'confort_termico' || f.key === 'estres_contacto') ? false : (newRespuestas['p1_3'] === 'si');
                                                                      if (triggerNivel3) {
                                                                        autoSuggestedRisk = '3';
                                                                      } else {
                                                                        const hasAnyP1Si = Object.keys(newRespuestas).some(k => k.startsWith('p1_') && newRespuestas[k] === 'si');
                                                                        if (hasAnyP1Si) {
                                                                          const anyP2Si = Object.keys(newRespuestas).some(k => k.startsWith('p2_') && newRespuestas[k] === 'si');
                                                                          autoSuggestedRisk = anyP2Si ? '2' : '1';
                                                                        }
                                                                      }
                                                                      const updatedTareas = p.tareas.map(x => {
                                                                        if (x.id === t.id) {
                                                                          return { 
                                                                            ...x, 
                                                                            [`f_${f.key}_respuestas`]: newRespuestas,
                                                                            [rskKey]: autoSuggestedRisk
                                                                          };
                                                                        }
                                                                        return x;
                                                                      });
                                                                      setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                                    }}
                                                                    className={`flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs font-bold border-l border-slate-200 transition-all cursor-pointer inline-flex items-center justify-center shrink-0 ${
                                                                      ansValue === 'no'
                                                                        ? 'bg-slate-500 text-white shadow-inner'
                                                                        : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 bg-white'
                                                                    }`}
                                                                  >
                                                                    No
                                                                  </button>
                                                                </div>
                                                              </div>
                                                            );
                                                          })}
                                                        </div>

                                                        {/* Paso 2 (Solo visible si alguna de paso 1 es 'si') */}
                                                         {(() => {
                                                          const currentRespuestas = t[`f_${f.key}_respuestas`] || {};
                                                          const showPaso2 = Object.keys(currentRespuestas).some(k => k.startsWith('p1_') && currentRespuestas[k] === 'si');
                                                          if (!showPaso2) return null;

                                                          return (
                                                            <div className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-inner">
                                                              <div className="flex justify-between items-center border-b border-slate-100 pb-1 mb-2">
                                                                <h5 className="font-bold text-slate-800 uppercase text-[9px] tracking-wider text-slate-500">
                                                                  Paso 2: Determinar el nivel de riesgo
                                                                </h5>
                                                                {f.key === 'mov_repetitivos' && (
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => setMostrarBorg(!mostrarBorg)}
                                                                    className="text-[10px] font-bold text-[#468DFF] hover:text-[#0511F2] transition-colors uppercase border border-[#468DFF]/25 px-1.5 py-0.5 rounded bg-blue-50/50"
                                                                  >
                                                                    {mostrarBorg ? '✕ Ocultar Escala Borg' : '📋 Ver Escala Borg'}
                                                                  </button>
                                                                )}
                                                                {f.key === 'confort_termico' && (
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => setMostrarFanger(!mostrarFanger)}
                                                                    className="text-[10px] font-bold text-[#468DFF] hover:text-[#0511F2] transition-colors uppercase border border-[#468DFF]/25 px-1.5 py-0.5 rounded bg-blue-50/50"
                                                                  >
                                                                    {mostrarFanger ? '✕ Ocultar Curva Fanger' : '📈 Ver Curva Fanger'}
                                                                  </button>
                                                                )}
                                                              </div>
                                                              {f.key === 'mov_repetitivos' && mostrarBorg && (
                                                                <div className="bg-slate-50 p-2 rounded border border-slate-200 mb-3 transition-all animate-fadeIn">
                                                                  <p className="text-[10px] text-slate-500 font-semibold mb-1.5 uppercase">Referencia: Criterio del esfuerzo percibido (Escala de Borg)</p>
                                                                  <img 
                                                                    src="/assets/escala-borg.png" 
                                                                    alt="Escala de Borg" 
                                                                    className="max-h-[160px] mx-auto rounded border border-slate-200 shadow-sm object-contain"
                                                                  />
                                                                </div>
                                                              )}
                                                              {f.key === 'confort_termico' && mostrarFanger && (
                                                                <div className="bg-slate-50 p-2 rounded border border-slate-200 mb-3 transition-all animate-fadeIn">
                                                                  <p className="text-[10px] text-slate-500 font-semibold mb-1.5 uppercase">Referencia: Curva de Confort (P.O. Fanger)</p>
                                                                  <img 
                                                                    src="/assets/curva-fanger.jpg" 
                                                                    alt="Curva de Confort Fanger" 
                                                                    className="max-h-[220px] mx-auto rounded border border-slate-200 shadow-sm object-contain"
                                                                  />
                                                                </div>
                                                              )}
                                                              {CUESTIONARIOS_PLANILLA2[f.key].paso2.map((q) => {
                                                                const ansValue = currentRespuestas[q.id] || 'no';
                                                                return (
                                                                  <div key={q.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-4 py-2 sm:py-1 border-b border-slate-100 last:border-0">
                                                                    <span className="text-slate-650 font-medium text-left">{q.text}</span>
                                                                    <div className="flex w-full sm:w-auto rounded-md shadow-sm border border-slate-300 overflow-hidden bg-white shrink-0 flex-nowrap">
                                                                      <button
                                                                        type="button"
                                                                        disabled={!canEdit}
                                                                        onClick={() => {
                                                                          const newRespuestas = { ...currentRespuestas, [q.id]: 'si' };
                                                                          let autoSuggestedRisk = '1';
                                                                          const triggerNivel3 = f.key === 'transporte' ? (newRespuestas['p1_5'] === 'si') : f.key === 'mov_repetitivos' ? (newRespuestas['p2_3'] === 'si') : (f.key === 'bipedestacion' || f.key === 'posturas_forzadas' || f.key === 'vibraciones_mano_brazo' || f.key === 'vibraciones_cuerpo_entero' || f.key === 'confort_termico' || f.key === 'estres_contacto') ? false : (newRespuestas['p1_3'] === 'si');
                                                                          if (triggerNivel3) {
                                                                            autoSuggestedRisk = '3';
                                                                          } else {
                                                                            const hasAnyP1Si = Object.keys(newRespuestas).some(k => k.startsWith('p1_') && newRespuestas[k] === 'si');
                                                                            if (hasAnyP1Si) {
                                                                              const anyP2Si = Object.keys(newRespuestas).some(k => k.startsWith('p2_') && newRespuestas[k] === 'si');
                                                                              autoSuggestedRisk = anyP2Si ? '2' : '1';
                                                                            }
                                                                          }
                                                                          const updatedTareas = p.tareas.map(x => {
                                                                            if (x.id === t.id) {
                                                                              return { 
                                                                                ...x, 
                                                                                [`f_${f.key}_respuestas`]: newRespuestas,
                                                                                [rskKey]: autoSuggestedRisk
                                                                              };
                                                                            }
                                                                            return x;
                                                                          });
                                                                          setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                                        }}
                                                                        className={`flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center shrink-0 ${
                                                                          ansValue === 'si'
                                                                            ? 'bg-[#468DFF] text-white shadow-inner'
                                                                            : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 bg-white'
                                                                        }`}
                                                                      >
                                                                        Sí
                                                                      </button>
                                                                      <button
                                                                        type="button"
                                                                        disabled={!canEdit}
                                                                        onClick={() => {
                                                                          const newRespuestas = { ...currentRespuestas, [q.id]: 'no' };
                                                                          let autoSuggestedRisk = '1';
                                                                          const triggerNivel3 = f.key === 'transporte' ? (newRespuestas['p1_5'] === 'si') : f.key === 'mov_repetitivos' ? (newRespuestas['p2_3'] === 'si') : (f.key === 'bipedestacion' || f.key === 'posturas_forzadas' || f.key === 'vibraciones_mano_brazo' || f.key === 'vibraciones_cuerpo_entero' || f.key === 'confort_termico' || f.key === 'estres_contacto') ? false : (newRespuestas['p1_3'] === 'si');
                                                                          if (triggerNivel3) {
                                                                            autoSuggestedRisk = '3';
                                                                          } else {
                                                                            const hasAnyP1Si = Object.keys(newRespuestas).some(k => k.startsWith('p1_') && newRespuestas[k] === 'si');
                                                                            if (hasAnyP1Si) {
                                                                              const anyP2Si = Object.keys(newRespuestas).some(k => k.startsWith('p2_') && newRespuestas[k] === 'si');
                                                                              autoSuggestedRisk = anyP2Si ? '2' : '1';
                                                                            }
                                                                          }
                                                                          const updatedTareas = p.tareas.map(x => {
                                                                            if (x.id === t.id) {
                                                                              return { 
                                                                                ...x, 
                                                                                [`f_${f.key}_respuestas`]: newRespuestas,
                                                                                [rskKey]: autoSuggestedRisk
                                                                              };
                                                                            }
                                                                            return x;
                                                                          });
                                                                          setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                                        }}
                                                                        className={`flex-1 sm:flex-initial text-center px-3 py-1.5 text-xs font-bold border-l border-slate-200 transition-all cursor-pointer inline-flex items-center justify-center shrink-0 ${
                                                                          ansValue === 'no'
                                                                            ? 'bg-slate-500 text-white shadow-inner'
                                                                            : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 bg-white'
                                                                        }`}
                                                                      >
                                                                        No
                                                                      </button>
                                                                    </div>
                                                                  </div>
                                                                );
                                                              })}
                                                            </div>
                                                          );
                                                        })()}

                                                      </div>
                                                    ) : (
                                                      // Cuestionario plano estándar para otros factores
                                                      <>
                                                        <div className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-inner">
                                                          {(CUESTIONARIOS_PLANILLA2[f.key] || []).map((q) => {
                                                            const currentRespuestas = t[`f_${f.key}_respuestas`] || {};
                                                            const ansValue = currentRespuestas[q.id] || 'no';
                                                            return (
                                                              <div key={q.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-4 py-2 sm:py-1 border-b border-slate-100 last:border-0">
                                                                <span className="text-slate-650 font-medium text-left">{q.text}</span>
                                                                <div className="flex w-full sm:w-auto rounded-md shadow-sm border border-slate-300 overflow-hidden bg-white shrink-0 flex-nowrap">
                                                                  <button
                                                                    type="button"
                                                                    disabled={!canEdit}
                                                                    onClick={() => {
                                                                      const newRespuestas = { ...currentRespuestas, [q.id]: 'si' };
                                                                      const hasAnySi = Object.values(newRespuestas).some(ans => ans === 'si');
                                                                      const autoSuggestedRisk = hasAnySi ? '2' : '1';
                                                                      const updatedTareas = p.tareas.map(x => {
                                                                        if (x.id === t.id) {
                                                                          return { 
                                                                            ...x, 
                                                                            [`f_${f.key}_respuestas`]: newRespuestas,
                                                                            [rskKey]: autoSuggestedRisk
                                                                          };
                                                                        }
                                                                        return x;
                                                                      });
                                                                      setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                                    }}
                                                                    className={`px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                                                                      ansValue === 'si'
                                                                        ? 'bg-[#468DFF] text-white shadow-inner'
                                                                        : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 bg-white'
                                                                    }`}
                                                                  >
                                                                    Sí
                                                                  </button>
                                                                  <button
                                                                    type="button"
                                                                    disabled={!canEdit}
                                                                    onClick={() => {
                                                                      const newRespuestas = { ...currentRespuestas, [q.id]: 'no' };
                                                                      const hasAnySi = Object.values(newRespuestas).some(ans => ans === 'si');
                                                                      const autoSuggestedRisk = hasAnySi ? '2' : '1';
                                                                      const updatedTareas = p.tareas.map(x => {
                                                                        if (x.id === t.id) {
                                                                          return { 
                                                                            ...x, 
                                                                            [`f_${f.key}_respuestas`]: newRespuestas,
                                                                            [rskKey]: autoSuggestedRisk
                                                                          };
                                                                        }
                                                                        return x;
                                                                      });
                                                                      setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                                    }}
                                                                    className={`px-3 py-1 text-xs font-bold border-l border-slate-200 transition-all cursor-pointer ${
                                                                      ansValue === 'no'
                                                                        ? 'bg-slate-500 text-white shadow-inner'
                                                                        : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 bg-white'
                                                                    }`}
                                                                  >
                                                                    No
                                                                  </button>
                                                                </div>
                                                              </div>
                                                            );
                                                          })}
                                                        </div>
                                                      </>
                                                    )}
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </React.Fragment>
                                        );
                                      })}
                                    </tbody>

                                  </table>
                                  </div>

                                  {/* Texto aclaratorio para el paso a Planilla 2 */}
                                  <p className="text-xs text-slate-600 font-medium italic mt-2 px-1">
                                    Si alguno de los factores de riesgo se encuentra presente, continuar con la Evaluación Inicial de Factores de Riesgo que se identifican, completando la planilla 2.
                                  </p>

                                  {/* ANEXO I - PLANILLA 3: IDENTIFICACION DE MEDIDAS CORRECTIVAS Y PREVENTIVAS */}
                                  <div className="mt-5 pt-4 border-t border-slate-200 space-y-4">
                                    <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-[#468DFF] shrink-0" />
                                        <div>
                                          <h5 className="font-extrabold text-slate-800 font-outfit uppercase tracking-wider text-xs">
                                            ANEXO I- PLANILLA 3: IDENTIFICACION DE MEDIDAS CORRECTIVAS Y PREVENTIVAS
                                          </h5>
                                          <p className="text-[11px] font-bold text-[#468DFF] uppercase tracking-wide mt-0.5">
                                            Medidas Correctivas y Preventivas (M.C.P.)
                                          </p>
                                        </div>
                                      </div>
                                      <div className="bg-white/80 border border-slate-200/80 px-3 py-1 rounded-md shadow-sm shrink-0 self-start sm:self-auto">
                                        <p className="text-xs font-bold text-slate-700">
                                          Tarea {tIdx + 1}: <span className="text-slate-900 font-extrabold">{t.nombre || `Tarea habitual ${tIdx + 1}`}</span>
                                        </p>
                                      </div>
                                    </div>

                                    {/* 1. Medidas Preventivas Generales */}
                                    <div className="space-y-2">
                                      <h6 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                        Medidas Preventivas Generales
                                      </h6>
                                      <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm">
                                        <table className="w-full text-xs text-left border-collapse">
                                          <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                              <th className="p-2 text-center w-10">Nº</th>
                                              <th className="p-2">Medidas Preventivas Generales</th>
                                              <th className="p-2 text-center w-36">Fecha:</th>
                                              <th className="p-2 text-center w-28">SI / NO</th>
                                              <th className="p-2 w-48">Observaciones</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {(t.p3_medidas_generales || getDefaultPlanilla3Generales()).map((mg, mgIdx) => (
                                              <tr key={mg.num} className="hover:bg-slate-50/50">
                                                <td className="p-2 text-center font-bold text-slate-600 bg-slate-50/50">{mg.num}</td>
                                                <td className="p-2 font-medium text-slate-750 text-[11.5px]">{mg.medida}</td>
                                                <td className="p-2 text-center">
                                                  <div className="relative flex items-center justify-center">
                                                    <AppInput
                                                      type="text"
                                                      disabled={!canEdit}
                                                      placeholder="DD/MM/AAAA"
                                                      className="h-7 text-xs text-center pr-7 w-32 bg-white"
                                                      value={mg.fecha || ''}
                                                      onChange={(e) => {
                                                        const formatted = formatAsDateInput(e.target.value);
                                                        const updatedGen = (t.p3_medidas_generales || getDefaultPlanilla3Generales()).map((item, idx) =>
                                                          idx === mgIdx ? { ...item, fecha: formatted } : item
                                                        );
                                                        const updatedTareas = p.tareas.map(x => x.id === t.id ? { ...x, p3_medidas_generales: updatedGen } : x);
                                                        setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                      }}
                                                    />
                                                    {canEdit && (
                                                      <div className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        <input
                                                          type="date"
                                                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                          onChange={(e) => {
                                                            if (e.target.value) {
                                                              const [yyyy, mm, dd] = e.target.value.split('-');
                                                              const formatted = `${dd}/${mm}/${yyyy}`;
                                                              const updatedGen = (t.p3_medidas_generales || getDefaultPlanilla3Generales()).map((item, idx) =>
                                                                idx === mgIdx ? { ...item, fecha: formatted } : item
                                                              );
                                                              const updatedTareas = p.tareas.map(x => x.id === t.id ? { ...x, p3_medidas_generales: updatedGen } : x);
                                                              setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                            }
                                                          }}
                                                        />
                                                      </div>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="p-2 text-center">
                                                  <div className="inline-flex rounded-md shadow-sm border border-slate-300 overflow-hidden bg-white shrink-0">
                                                    <button
                                                      type="button"
                                                      disabled={!canEdit}
                                                      onClick={() => {
                                                        const updatedGen = (t.p3_medidas_generales || getDefaultPlanilla3Generales()).map((item, idx) =>
                                                          idx === mgIdx ? { ...item, aplica: 'si' } : item
                                                        );
                                                        const updatedTareas = p.tareas.map(x => x.id === t.id ? { ...x, p3_medidas_generales: updatedGen } : x);
                                                        setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                      }}
                                                      className={`px-2.5 py-0.5 text-xs font-bold transition-all cursor-pointer ${
                                                        mg.aplica === 'si'
                                                          ? 'bg-[#468DFF] text-white shadow-inner'
                                                          : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 bg-white'
                                                      }`}
                                                    >
                                                      Si
                                                    </button>
                                                    <button
                                                      type="button"
                                                      disabled={!canEdit}
                                                      onClick={() => {
                                                        const updatedGen = (t.p3_medidas_generales || getDefaultPlanilla3Generales()).map((item, idx) =>
                                                          idx === mgIdx ? { ...item, aplica: 'no' } : item
                                                        );
                                                        const updatedTareas = p.tareas.map(x => x.id === t.id ? { ...x, p3_medidas_generales: updatedGen } : x);
                                                        setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                      }}
                                                      className={`px-2.5 py-0.5 text-xs font-bold border-l border-slate-200 transition-all cursor-pointer ${
                                                        mg.aplica === 'no'
                                                          ? 'bg-slate-500 text-white shadow-inner'
                                                          : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900 bg-white'
                                                      }`}
                                                    >
                                                      No
                                                    </button>
                                                  </div>
                                                </td>
                                                <td className="p-2">
                                                  <AppInput
                                                    disabled={!canEdit}
                                                    placeholder="-"
                                                    className="h-7 text-xs bg-white"
                                                    value={mg.observaciones || ''}
                                                    onChange={(e) => {
                                                      const updatedGen = (t.p3_medidas_generales || getDefaultPlanilla3Generales()).map((item, idx) =>
                                                        idx === mgIdx ? { ...item, observaciones: e.target.value } : item
                                                      );
                                                      const updatedTareas = p.tareas.map(x => x.id === t.id ? { ...x, p3_medidas_generales: updatedGen } : x);
                                                      setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                    }}
                                                  />
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>

                                    {/* 2. Medidas Correctivas y Preventivas Especificas (Administrativas y de Ingeniería) */}
                                    <div className="space-y-2">
                                      <h6 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                                        Medidas Correctivas y Preventivas Especificas (Administrativas y de Ingeniería)
                                      </h6>
                                      <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm">
                                        <table className="w-full text-xs text-left border-collapse">
                                          <thead className="bg-slate-50">
                                            <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                              <th className="p-2 text-center w-10">Nº</th>
                                              <th className="p-2">Medidas Correctivas y Preventivas Especificas (Administrativas y de Ingeniería)</th>
                                              <th className="p-2 w-56">Observaciones</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100">
                                            {(t.p3_medidas_especificas || getDefaultPlanilla3Especificas()).map((me, meIdx) => (
                                              <tr key={me.num} className="hover:bg-slate-50/50">
                                                <td className="p-2 text-center font-bold text-slate-600 bg-slate-50/50">{me.num}</td>
                                                <td className="p-1.5">
                                                  <AppInput
                                                    disabled={!canEdit}
                                                    placeholder="Ingrese medida específica (administrativa o ingeniería)..."
                                                    className="h-7 text-xs bg-white"
                                                    value={me.medida || ''}
                                                    onChange={(e) => {
                                                      const updatedEsp = (t.p3_medidas_especificas || getDefaultPlanilla3Especificas()).map((item, idx) =>
                                                        idx === meIdx ? { ...item, medida: e.target.value } : item
                                                      );
                                                      const updatedTareas = p.tareas.map(x => x.id === t.id ? { ...x, p3_medidas_especificas: updatedEsp } : x);
                                                      setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                    }}
                                                  />
                                                </td>
                                                <td className="p-1.5">
                                                  <AppInput
                                                    disabled={!canEdit}
                                                    placeholder="Observaciones..."
                                                    className="h-7 text-xs bg-white"
                                                    value={me.observaciones || ''}
                                                    onChange={(e) => {
                                                      const updatedEsp = (t.p3_medidas_especificas || getDefaultPlanilla3Especificas()).map((item, idx) =>
                                                        idx === meIdx ? { ...item, observaciones: e.target.value } : item
                                                      );
                                                      const updatedTareas = p.tareas.map(x => x.id === t.id ? { ...x, p3_medidas_especificas: updatedEsp } : x);
                                                      setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                                    }}
                                                  />
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>

                                    {/* Observaciones generales Planilla 3 con SySO-AI-Voice-Helper */}
                                    <div className="space-y-1.5 pt-1">
                                      <div className="flex items-center justify-between gap-2 min-h-[28px]">
                                        <AppLabel htmlFor={`p3-obs-${t.id}`} className="font-bold text-slate-700">
                                          Observaciones
                                        </AppLabel>
                                        {canEdit && (
                                          <AITextHelper
                                            value={t.p3_observaciones || ''}
                                            onChange={(newVal) => {
                                              const updatedTareas = p.tareas.map(x => x.id === t.id ? { ...x, p3_observaciones: newVal } : x);
                                              setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                            }}
                                          />
                                        )}
                                      </div>
                                      <AppTextarea
                                        id={`p3-obs-${t.id}`}
                                        disabled={!canEdit}
                                        rows={2}
                                        placeholder="Observaciones generales sobre la Planilla 3 (Medidas Correctivas y Preventivas)..."
                                        value={t.p3_observaciones || ''}
                                        onChange={(e) => {
                                          const updatedTareas = p.tareas.map(x => x.id === t.id ? { ...x, p3_observaciones: e.target.value } : x);
                                          setPuntos(puntos.map(x => x.id === p.id ? { ...x, tareas: updatedTareas } : x));
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        </div>
                      </div>

                      {/* ANEXO I - PLANILLA 4: MATRIZ DE SEGUIMIENTO MEDIDAS CORRECTIVAS Y PREVENTIVAS POR PUESTO */}
                      <div className="mt-5 pt-4 border-t border-slate-200 space-y-4">
                        <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-[#468DFF] shrink-0" />
                            <div>
                              <h5 className="font-extrabold text-slate-800 font-outfit uppercase tracking-wider text-xs">
                                ANEXO I- PLANILLA 4: MATRIZ DE SEGUIMIENTO MEDIDAS CORRECTIVAS Y PREVENTIVAS
                              </h5>
                              <p className="text-[11px] font-bold text-[#468DFF] uppercase tracking-wide mt-0.5">
                                Matriz de Seguimiento Medidas Correctivas y Preventivas (M.C.P.)
                              </p>
                            </div>
                          </div>
                          <div className="bg-white/80 border border-slate-200/80 px-3 py-1 rounded-md shadow-sm shrink-0 self-start sm:self-auto">
                            <p className="text-xs font-bold text-slate-700">
                              Puesto: <span className="text-slate-900 font-extrabold">{p.puesto_text || `Puesto #${p.punto_muestreo || idx + 1}`}</span>
                            </p>
                          </div>
                        </div>

                        <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-slate-50">
                              <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-2 text-center w-12 leading-tight">Nº<br/><span className="text-[9px]">M.C.P.</span></th>
                                <th className="p-2 text-center min-w-[200px]">Nombre del Puesto</th>
                                <th className="p-2 text-center w-32">Fecha de Evaluación</th>
                                <th className="p-2 text-center w-28">Nivel de riesgo</th>
                                <th className="p-2 text-center w-32">Fecha impl. medida Admin.</th>
                                <th className="p-2 text-center w-32">Fecha impl. medida Ing.</th>
                                <th className="p-2 text-center w-32">Fecha de Cierre</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(p.p4_medidas || getDefaultPlanilla4(p.puesto_text || '', fechaMedicion ? formatAsDateInput(fechaMedicion) : '')).map((m4, m4Idx) => (
                                <tr key={m4.num || m4Idx} className="hover:bg-slate-50/50">
                                  <td className="p-2 text-center font-bold text-slate-600 bg-slate-50/50">{m4.num || m4Idx + 1}</td>
                                  <td className="p-1.5">
                                    <AppInput
                                      disabled={!canEdit}
                                      placeholder="Descripción de la medida (M.C.P.)..."
                                      className="h-7 text-xs bg-white"
                                      value={m4.mcp || ''}
                                      onChange={(e) => {
                                        const updatedP4 = (p.p4_medidas || getDefaultPlanilla4(p.puesto_text || '', fechaMedicion ? formatAsDateInput(fechaMedicion) : '')).map((item, idx) =>
                                          idx === m4Idx ? { ...item, mcp: e.target.value } : item
                                        );
                                        setPuntos(puntos.map(x => x.id === p.id ? { ...x, p4_medidas: updatedP4 } : x));
                                      }}
                                    />
                                  </td>
                                  {/* Fecha de Evaluación */}
                                  <td className="p-1.5 text-center">
                                    <div className="relative flex items-center justify-center">
                                      <AppInput
                                        type="text"
                                        disabled={!canEdit}
                                        placeholder="DD/MM/AAAA"
                                        className="h-7 text-xs text-center pr-7 w-32 bg-white"
                                        value={m4.fecha_evaluacion || ''}
                                        onChange={(e) => {
                                          const formatted = formatAsDateInput(e.target.value);
                                          const updatedP4 = (p.p4_medidas || getDefaultPlanilla4(p.puesto_text || '', fechaMedicion ? formatAsDateInput(fechaMedicion) : '')).map((item, idx) =>
                                            idx === m4Idx ? { ...item, fecha_evaluacion: formatted } : item
                                          );
                                          setPuntos(puntos.map(x => x.id === p.id ? { ...x, p4_medidas: updatedP4 } : x));
                                        }}
                                      />
                                      {canEdit && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                                          <Calendar className="h-3.5 w-3.5" />
                                          <input
                                            type="date"
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                const [yyyy, mm, dd] = e.target.value.split('-');
                                                const formatted = `${dd}/${mm}/${yyyy}`;
                                                const updatedP4 = (p.p4_medidas || getDefaultPlanilla4(p.puesto_text || '', fechaMedicion ? formatAsDateInput(fechaMedicion) : '')).map((item, idx) =>
                                                  idx === m4Idx ? { ...item, fecha_evaluacion: formatted } : item
                                                );
                                                setPuntos(puntos.map(x => x.id === p.id ? { ...x, p4_medidas: updatedP4 } : x));
                                              }
                                            }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  {/* Nivel de Riesgo */}
                                  <td className="p-1.5 text-center">
                                    <AppSelect
                                      disabled={!canEdit}
                                      className="h-7 text-xs bg-white py-0 px-2"
                                      value={m4.nivel_riesgo || ''}
                                      onChange={(e) => {
                                        const updatedP4 = (p.p4_medidas || getDefaultPlanilla4(p.puesto_text || '', fechaMedicion ? formatAsDateInput(fechaMedicion) : '')).map((item, idx) =>
                                          idx === m4Idx ? { ...item, nivel_riesgo: e.target.value } : item
                                        );
                                        setPuntos(puntos.map(x => x.id === p.id ? { ...x, p4_medidas: updatedP4 } : x));
                                      }}
                                    >
                                      <option value="">- Seleccionar -</option>
                                      <option value="Nivel 1">Nivel 1 (Tolerable)</option>
                                      <option value="Nivel 2">Nivel 2 (Moderado)</option>
                                      <option value="Nivel 3">Nivel 3 (Crítico)</option>
                                    </AppSelect>
                                  </td>
                                  {/* Fecha Impl Admin */}
                                  <td className="p-1.5 text-center">
                                    <div className="relative flex items-center justify-center">
                                      <AppInput
                                        type="text"
                                        disabled={!canEdit}
                                        placeholder="DD/MM/AAAA"
                                        className="h-7 text-xs text-center pr-7 w-32 bg-white"
                                        value={m4.fecha_impl_admin || ''}
                                        onChange={(e) => {
                                          const formatted = formatAsDateInput(e.target.value);
                                          const updatedP4 = (p.p4_medidas || getDefaultPlanilla4(p.puesto_text || '', fechaMedicion ? formatAsDateInput(fechaMedicion) : '')).map((item, idx) =>
                                            idx === m4Idx ? { ...item, fecha_impl_admin: formatted } : item
                                          );
                                          setPuntos(puntos.map(x => x.id === p.id ? { ...x, p4_medidas: updatedP4 } : x));
                                        }}
                                      />
                                      {canEdit && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                                          <Calendar className="h-3.5 w-3.5" />
                                          <input
                                            type="date"
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                const [yyyy, mm, dd] = e.target.value.split('-');
                                                const formatted = `${dd}/${mm}/${yyyy}`;
                                                const updatedP4 = (p.p4_medidas || getDefaultPlanilla4(p.puesto_text || '', fechaMedicion ? formatAsDateInput(fechaMedicion) : '')).map((item, idx) =>
                                                  idx === m4Idx ? { ...item, fecha_impl_admin: formatted } : item
                                                );
                                                setPuntos(puntos.map(x => x.id === p.id ? { ...x, p4_medidas: updatedP4 } : x));
                                              }
                                            }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  {/* Fecha Impl Ing */}
                                  <td className="p-1.5 text-center">
                                    <div className="relative flex items-center justify-center">
                                      <AppInput
                                        type="text"
                                        disabled={!canEdit}
                                        placeholder="DD/MM/AAAA"
                                        className="h-7 text-xs text-center pr-7 w-32 bg-white"
                                        value={m4.fecha_impl_ing || ''}
                                        onChange={(e) => {
                                          const formatted = formatAsDateInput(e.target.value);
                                          const updatedP4 = (p.p4_medidas || getDefaultPlanilla4(p.puesto_text || '', fechaMedicion ? formatAsDateInput(fechaMedicion) : '')).map((item, idx) =>
                                            idx === m4Idx ? { ...item, fecha_impl_ing: formatted } : item
                                          );
                                          setPuntos(puntos.map(x => x.id === p.id ? { ...x, p4_medidas: updatedP4 } : x));
                                        }}
                                      />
                                      {canEdit && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                                          <Calendar className="h-3.5 w-3.5" />
                                          <input
                                            type="date"
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                const [yyyy, mm, dd] = e.target.value.split('-');
                                                const formatted = `${dd}/${mm}/${yyyy}`;
                                                const updatedP4 = (p.p4_medidas || getDefaultPlanilla4(p.puesto_text || '', fechaMedicion ? formatAsDateInput(fechaMedicion) : '')).map((item, idx) =>
                                                  idx === m4Idx ? { ...item, fecha_impl_ing: formatted } : item
                                                );
                                                setPuntos(puntos.map(x => x.id === p.id ? { ...x, p4_medidas: updatedP4 } : x));
                                              }
                                            }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  {/* Fecha de Cierre */}
                                  <td className="p-1.5 text-center">
                                    <div className="relative flex items-center justify-center">
                                      <AppInput
                                        type="text"
                                        disabled={!canEdit}
                                        placeholder="DD/MM/AAAA"
                                        className="h-7 text-xs text-center pr-7 w-32 bg-white"
                                        value={m4.fecha_cierre || ''}
                                        onChange={(e) => {
                                          const formatted = formatAsDateInput(e.target.value);
                                          const updatedP4 = (p.p4_medidas || getDefaultPlanilla4(p.puesto_text || '', fechaMedicion ? formatAsDateInput(fechaMedicion) : '')).map((item, idx) =>
                                            idx === m4Idx ? { ...item, fecha_cierre: formatted } : item
                                          );
                                          setPuntos(puntos.map(x => x.id === p.id ? { ...x, p4_medidas: updatedP4 } : x));
                                        }}
                                      />
                                      {canEdit && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                                          <Calendar className="h-3.5 w-3.5" />
                                          <input
                                            type="date"
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                            onChange={(e) => {
                                              if (e.target.value) {
                                                const [yyyy, mm, dd] = e.target.value.split('-');
                                                const formatted = `${dd}/${mm}/${yyyy}`;
                                                const updatedP4 = (p.p4_medidas || getDefaultPlanilla4(p.puesto_text || '', fechaMedicion ? formatAsDateInput(fechaMedicion) : '')).map((item, idx) =>
                                                  idx === m4Idx ? { ...item, fecha_cierre: formatted } : item
                                                );
                                                setPuntos(puntos.map(x => x.id === p.id ? { ...x, p4_medidas: updatedP4 } : x));
                                              }
                                            }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {canEdit && (
                          <div className="flex justify-end pt-1">
                            <AppButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                const currentP4 = p.p4_medidas || getDefaultPlanilla4(p.puesto_text || '', fechaMedicion ? formatAsDateInput(fechaMedicion) : '');
                                const nextNum = currentP4.length + 1;
                                const newRow = {
                                  num: nextNum,
                                  mcp: '',
                                  puesto_nombre: p.puesto_text || '',
                                  fecha_evaluacion: fechaMedicion ? formatAsDateInput(fechaMedicion) : '',
                                  nivel_riesgo: '',
                                  fecha_impl_admin: '',
                                  fecha_impl_ing: '',
                                  fecha_cierre: ''
                                };
                                setPuntos(puntos.map(x => x.id === p.id ? { ...x, p4_medidas: [...currentP4, newRow] } : x));
                              }}
                              className="text-xs h-7 gap-1"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Agregar Medida a Matriz
                            </AppButton>
                          </div>
                        )}
                      </div>
                </div>
              );
            })}
          </div>
        </div>
      </AppCard>

        {/* CARD FIRMA DEL EMPLEADOR */}
        <AppCard className="p-5 md:p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
            <PenTool className="h-5 w-5 text-[#468DFF]" />
            <h2 className="font-outfit text-base font-extrabold text-slate-800">
              Firma del Empleador o Representante Legal
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Datos del Empleador */}
            <div className="space-y-4">
              <div>
                <AppLabel htmlFor="empleador-nombre">
                  Nombre y Apellido del Empleador / Representante Legal *
                </AppLabel>
                <AppInput
                  id="empleador-nombre"
                  type="text"
                  disabled={!canEdit}
                  value={empleadorNombre}
                  onChange={(e) => setEmpleadorNombre(e.target.value)}
                  placeholder="Aclaración del firmante"
                />
              </div>
            </div>

            {/* Configuración de Firma */}
            <div className="flex flex-col gap-1.5 justify-end">
              <AppLabel>Firma del Empleador</AppLabel>
              
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col min-h-[220px]">
                <div className="p-4 bg-slate-50/50 flex-1 flex flex-col justify-center relative">
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl aspect-[2/1] relative overflow-hidden flex items-center justify-center min-h-[140px] shadow-sm">
                    {firmaEmpleadorSavedUrl && !hasSignedEmpleador ? (
                      <img src={firmaEmpleadorSavedUrl} alt="Firma Empleador" className="w-full h-full object-contain p-2" />
                    ) : (
                      <canvas
                        ref={firmaEmpleadorRefCallback}
                        width={400}
                        height={200}
                        className={`w-full h-full bg-white block ${canEdit ? 'cursor-crosshair' : 'cursor-default'}`}
                      />
                    )}
                    {!hasSignedEmpleador && !firmaEmpleadorSavedUrl && canEdit && (
                      <span className="absolute pointer-events-none text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dibuje la firma aquí</span>
                    )}
                    {canEdit && (hasSignedEmpleador || firmaEmpleadorSavedUrl) && (
                      <button
                        type="button"
                        onClick={handleClearEmpleadorCanvas}
                        className="absolute bottom-2 right-2 z-20 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white/90 hover:bg-white border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        title="Limpiar trazo de firma"
                      >
                        <RotateCcw className="h-3 w-3 text-slate-500" />
                        <span>Limpiar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AppCard>

        {/* CARD FIRMA DEL PROFESIONAL */}
        <AppCard className="p-5 md:p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
            <PenTool className="h-5 w-5 text-[#468DFF]" />
            <h2 className="font-outfit text-base font-extrabold text-slate-800">
              Firma del Profesional de Higiene y Seguridad
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Datos del Profesional */}
            <div className="space-y-4">
              <div>
                <AppLabel htmlFor="profesional-select">
                  Profesional Interviniente *
                </AppLabel>
                <AppSelect
                  id="profesional-select"
                  disabled={!canEdit}
                  placeholder={null}
                  value={profesionalId || '__custom__'}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    setProfesionalId(selectedVal);
                    if (selectedVal !== '__custom__') {
                      const selectedMem = miembrosList.find(m => m.id === selectedVal);
                      if (selectedMem) {
                        setProfesionalNombre(selectedMem.nombre || '');
                        setProfesionalMatricula(selectedMem.matricula || '');
                        setSignaturePath(selectedMem.signature_url || '');
                        setFirmaProfSavedUrl('');
                        setFirmaPerfilPreviewUrl('');
                        if (selectedMem.signature_url) {
                          setFirmaTipo('perfil');
                        } else {
                          setFirmaTipo('mano');
                        }
                      }
                    } else {
                      setProfesionalNombre('');
                      setProfesionalMatricula('');
                      setSignaturePath('');
                      setFirmaProfSavedUrl('');
                      setFirmaPerfilPreviewUrl('');
                      setFirmaTipo('mano');
                    }
                  }}
                >
                  <option value="">Seleccionar Profesional...</option>
                  {miembrosList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                  <option value="__custom__">Otro (cargar manualmente)...</option>
                </AppSelect>

                {profesionalId === '__custom__' && (
                  <div className="mt-2.5">
                    <AppInput
                      id="profesional-nombre-custom"
                      type="text"
                      disabled={!canEdit}
                      value={profesionalNombre}
                      onChange={(e) => setProfesionalNombre(e.target.value)}
                      placeholder="Nombre y Apellido del Profesional"
                    />
                  </div>
                )}
              </div>

              <div>
                <AppLabel htmlFor="profesional-matricula">
                  Matrícula Profesional
                </AppLabel>
                <AppInput
                  id="profesional-matricula"
                  type="text"
                  disabled={!canEdit}
                  value={profesionalMatricula}
                  onChange={(e) => setProfesionalMatricula(e.target.value)}
                  placeholder="Ej. MP 12345"
                />
              </div>
            </div>

            {/* Configuración de Firma: SySO-Signature-Tabbed-Container */}
            <div className="flex flex-col gap-1.5 justify-end">
              <AppLabel>Firma del Profesional Técnico</AppLabel>
              
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col min-h-[220px]">
                {/* Solapas superiores integradas */}
                <div className="flex border-b border-slate-200 bg-white">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      setFirmaTipo('perfil');
                    }}
                    className={`flex-1 py-2.5 text-xs font-bold transition-all cursor-pointer border-none ${
                      firmaTipo === 'perfil'
                        ? 'bg-[#468DFF] text-white font-extrabold shadow-inner'
                        : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    Firma de Perfil
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      setFirmaTipo('mano');
                    }}
                    className={`flex-1 py-2.5 text-xs font-bold transition-all cursor-pointer border-none ${
                      firmaTipo === 'mano'
                        ? 'bg-[#468DFF] text-white font-extrabold shadow-inner'
                        : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    Firmar a mano
                  </button>
                </div>

                {/* Cuerpo del contenedor */}
                <div className="p-4 bg-slate-50/50 flex-1 flex flex-col justify-center relative">
                  {firmaTipo === 'perfil' ? (
                    <div className="border-2 border-dashed border-slate-200 bg-white rounded-xl aspect-[2/1] relative overflow-hidden flex items-center justify-center p-3 text-center min-h-[140px] shadow-sm">
                      {signaturePath || firmaPerfilPreviewUrl || firmaProfSavedUrl ? (
                        <div className="flex flex-col items-center justify-center h-full w-full">
                          {firmaPerfilPreviewUrl || firmaProfSavedUrl ? (
                            <div className="bg-white border border-slate-100 rounded-lg p-2 max-w-[200px] h-[80px] flex items-center justify-center overflow-hidden">
                              <img 
                                src={firmaPerfilPreviewUrl || firmaProfSavedUrl} 
                                alt="Vista previa de firma de perfil" 
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          ) : (
                            <Loader2 className="h-5 w-5 animate-spin text-[#468DFF]" />
                          )}
                          <p className="text-[10px] text-green-600 font-bold mt-2">✓ Firma del perfil cargada correctamente.</p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-amber-600 font-bold p-4">⚠ El profesional seleccionado no tiene una firma digital registrada en su perfil.</p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl aspect-[2/1] relative overflow-hidden flex items-center justify-center min-h-[140px] shadow-sm">
                      {firmaProfSavedUrl && !hasSignedProf ? (
                        <img src={firmaProfSavedUrl} alt="Firma Profesional" className="w-full h-full object-contain p-2" />
                      ) : (
                        <canvas
                          ref={firmaProfRefCallback}
                          width={400}
                          height={200}
                          className={`w-full h-full bg-white block ${canEdit ? 'cursor-crosshair' : 'cursor-default'}`}
                        />
                      )}
                      {!hasSignedProf && !firmaProfSavedUrl && canEdit && (
                        <span className="absolute pointer-events-none text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dibuje la firma aquí</span>
                      )}
                      {canEdit && (hasSignedProf || firmaProfSavedUrl) && (
                        <button
                          type="button"
                          onClick={handleClearCanvas}
                          className="absolute bottom-2 right-2 z-20 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white/90 hover:bg-white border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          title="Limpiar trazo de firma"
                        >
                          <RotateCcw className="h-3 w-3 text-slate-500" />
                          <span>Limpiar</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </AppCard>

        {/* CARD FIRMA DEL RESPONSABLE DE MEDICINA DEL TRABAJO */}
        <AppCard className="p-5 md:p-6 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
            <PenTool className="h-5 w-5 text-[#468DFF]" />
            <h2 className="font-outfit text-base font-extrabold text-slate-800">
              Firma del Responsable del Servicio de Medicina del Trabajo
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Datos del Responsable */}
            <div className="space-y-4">
              <div>
                <AppLabel htmlFor="medicina-nombre">
                  Nombre y Apellido del Responsable *
                </AppLabel>
                <AppInput
                  id="medicina-nombre"
                  type="text"
                  disabled={!canEdit}
                  value={medicinaNombre}
                  onChange={(e) => setMedicinaNombre(e.target.value)}
                  placeholder="Aclaración del responsable de medicina"
                />
              </div>

              <div>
                <AppLabel htmlFor="medicina-matricula">
                  Matrícula Profesional / Registro *
                </AppLabel>
                <AppInput
                  id="medicina-matricula"
                  type="text"
                  disabled={!canEdit}
                  value={medicinaMatricula}
                  onChange={(e) => setMedicinaMatricula(e.target.value)}
                  placeholder="Ej: MN 54321 / MP 98765"
                />
              </div>
            </div>

            {/* Configuración de Firma */}
            <div className="flex flex-col gap-1.5 justify-end">
              <AppLabel>Firma del Responsable Médico</AppLabel>
              
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col min-h-[220px]">
                <div className="p-4 bg-slate-50/50 flex-1 flex flex-col justify-center relative">
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl aspect-[2/1] relative overflow-hidden flex items-center justify-center min-h-[140px] shadow-sm">
                    {firmaMedicinaSavedUrl && !hasSignedMedicina ? (
                      <img src={firmaMedicinaSavedUrl} alt="Firma Responsable Médico" className="w-full h-full object-contain p-2" />
                    ) : (
                      <canvas
                        ref={firmaMedicinaRefCallback}
                        width={400}
                        height={200}
                        className={`w-full h-full bg-white block ${canEdit ? 'cursor-crosshair' : 'cursor-default'}`}
                      />
                    )}
                    {!hasSignedMedicina && !firmaMedicinaSavedUrl && canEdit && (
                      <span className="absolute pointer-events-none text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dibuje la firma aquí</span>
                    )}
                    {canEdit && (hasSignedMedicina || firmaMedicinaSavedUrl) && (
                      <button
                        type="button"
                        onClick={handleClearMedicinaCanvas}
                        className="absolute bottom-2 right-2 z-20 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white/90 hover:bg-white border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        title="Limpiar trazo de firma"
                      >
                        <RotateCcw className="h-3 w-3 text-slate-500" />
                        <span>Limpiar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AppCard>

        {/* Pie de Página del Formulario */}
        <div className="flex justify-between items-center pt-6 border-t border-slate-100 shrink-0 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <AppButton
              variant="secondary"
              onClick={handleExitAttempt}
            >
              Salir
            </AppButton>

            {/* Switch de Estado: Borrador (default) <-> Completado */}
            {canEdit && estado !== 'anulado' && (
              <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 select-none">
                <span className={`text-xs font-bold ${estado === 'borrador' ? 'text-amber-600' : 'text-slate-400'}`}>
                  Borrador
                </span>

                <button
                  type="button"
                  role="switch"
                  aria-checked={estado === 'completado'}
                  onClick={() => setEstado(estado === 'completado' ? 'borrador' : 'completado')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    estado === 'completado' ? 'bg-[#468DFF]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      estado === 'completado' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>

                <span className={`text-xs font-bold ${estado === 'completado' ? 'text-[#468DFF]' : 'text-slate-400'}`}>
                  Completado
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {editingId && (
              <>
                {profile?.role !== 'cliente' && onSendPdf && (
                  <AppButton
                    variant="secondary"
                    onClick={onSendPdf}
                    className="flex items-center gap-1.5 shadow-sm"
                  >
                    <Mail className="h-4 w-4" />
                    Enviar PDF
                  </AppButton>
                )}
                {onExportPdf && (
                  <AppButton
                    variant="primary"
                    onClick={onExportPdf}
                    className="flex items-center gap-1.5 shadow-md shadow-[#468DFF]/10"
                  >
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </AppButton>
                )}
              </>
            )}

            {isReadOnly ? (
              canEditar && estado !== 'anulado' && (
                <AppButton
                  type="button"
                  onClick={() => {
                    if (onEdit) {
                      onEdit();
                    } else {
                      router.push(`/${tenantSlug}/protocolos/ergonomia/${editingId}/editar`);
                    }
                  }}
                  className="bg-amber-500 hover:bg-amber-600 border-amber-500 hover:border-amber-600 text-white shadow-lg shadow-amber-500/10 text-center"
                >
                  Editar
                </AppButton>
              )
            ) : (
              <>
                {editingId && canEliminar && (
                  <AppButton
                    type="button"
                    variant="destructive"
                    disabled={saveLoading || deleteLoading}
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold active:scale-[0.98] cursor-pointer shadow-lg shadow-red-500/10"
                  >
                    Eliminar
                  </AppButton>
                )}

                {canEdit && (
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    disabled={saveLoading}
                    className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#468DFF]/10 disabled:opacity-50"
                  >
                    {saveLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        Guardando...
                      </>
                    ) : (
                      'Guardar'
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </form>
    </div>

    {/* DIÁLOGO DE CONFIRMACIÓN DE CAMBIOS SIN GUARDAR (BOTÓN SALIR) */}
    <AppUnsavedChangesDialog
      open={unsavedDialogOpen}
      onOpenChange={setUnsavedDialogOpen}
      onLeave={() => {
        setUnsavedDialogOpen(false);
        onClose();
      }}
    />

    {/* DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN */}
    <AppConfirmDialog
      open={deleteConfirmOpen}
      onOpenChange={setDeleteConfirmOpen}
      type="destructive"
      title="Eliminar Protocolo"
      description="¿Está seguro de que desea eliminar permanentemente este protocolo de ergonomía y todos sus puntos de muestreo y mediciones asociados? Esta acción no se puede deshacer."
      confirmText="Eliminar"
      onConfirm={executeDelete}
    />

    {/* MODAL DE SINCRONIZACIÓN DE PERFIL DEL ESTABLECIMIENTO (WIZARD) */}
    {isSyncOpen && syncQueue[syncIndex] && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          onClick={() => {
            setIsSyncOpen(false);
            executeSave(estSectoresLocal);
          }} 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" 
        />
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-lg w-full z-10 shadow-2xl relative space-y-4 animate-scale-up select-none">
          
          {/* Botón X de Cierre en esquina superior derecha */}
          <button 
            type="button"
            onClick={() => handleSyncConfirm('skip')}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#468DFF] cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 border-b border-slate-100 pb-3 pr-8">
            <div className="p-2.5 bg-blue-50 text-[#468DFF] rounded-xl shrink-0">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-outfit text-base font-extrabold text-slate-900">
                Sincronización con Perfil de Establecimiento
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                {syncQueue.length} {syncQueue.length === 1 ? 'elemento nuevo / modificado' : 'elementos nuevos / modificados'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">
              Se detectaron los siguientes datos no registrados en el perfil del establecimiento. ¿Desea guardarlos para futuras mediciones?
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed max-h-48 overflow-y-auto space-y-1.5 font-medium">
              {syncQueue.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-[#468DFF] font-bold">•</span>
                  <span>{item.message}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => handleSyncConfirm('skip')}
              className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
            >
              Solo guardar en este protocolo
            </button>

            <button
              type="button"
              onClick={() => handleSyncConfirm('save_profile')}
              className="px-4 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold rounded-xl shadow-md shadow-[#468DFF]/10 transition-all cursor-pointer text-center"
            >
              Guardar todos en el perfil ({syncQueue.length})
            </button>
          </div>
        </div>
      </div>
    )}

    {/* MODAL INSTRUCTIVO Y RESOLUCIÓN SRT N° 886/15 */}
    <Resolucion886Modal
      isOpen={isResolucionModalOpen}
      onClose={() => setIsResolucionModalOpen(false)}
    />

  </>
  );
}
