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
  PenTool
} from 'lucide-react';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import { TABLA_2_ILUMINACION } from '../utils/tablasAnexoIV';
import { getLimiteDbaForTe, getPuntoCalculos } from '../utils/tablasAnexoV';
import Tabla1Modal from './Tabla1Modal';
import Tabla1ErgonomiaModal from './Tabla1ErgonomiaModal';
import Resolucion886Modal from './Resolucion886Modal';

// Catálogo normativo según Anexo IV Dec. 351/79 y SRT
export const ACTIVIDADES_ILUMINACION = [
  { categoria: 'Oficinas', subcategoria: 'Trabajo General', tarea: 'Escritura, lectura, procesamiento de datos, archivo', lux: 500 },
  { categoria: 'Oficinas', subcategoria: 'Trabajo de Precisión', tarea: 'Dibujo técnico, diseño por computadora', lux: 750 },
  { categoria: 'Oficinas', subcategoria: 'Áreas de Tránsito', tarea: 'Pasillos, escaleras, vestíbulos', lux: 150 },
  { categoria: 'Industria', subcategoria: 'Tareas Muy Sencillas', tarea: 'Almacenes, zonas de carga y descarga, pasillos', lux: 100 },
  { categoria: 'Industria', subcategoria: 'Tareas Sencillas', tarea: 'Montaje basto, embalaje, inspección visual básica', lux: 200 },
  { categoria: 'Industria', subcategoria: 'Tareas Medianas', tarea: 'Trabajos de taller mecánico ordinario, torneado, montaje', lux: 300 },
  { categoria: 'Industria', subcategoria: 'Tareas Finas / Precisión', tarea: 'Montaje de precisión, ajuste fino, control de calidad detallado', lux: 500 },
  { categoria: 'Industria', subcategoria: 'Tareas Muy Finas / Alta Precisión', tarea: 'Montaje electrónico de precisión, laboratorios químicos', lux: 1000 },
  { categoria: 'Comercio', subcategoria: 'Salas de Venta', tarea: 'Área general de tiendas, supermercados, locales', lux: 300 },
  { categoria: 'Sanidad', subcategoria: 'Salas de Consulta', tarea: 'Exámenes médicos, tratamientos, salas de espera', lux: 500 },
  { categoria: 'Educación', subcategoria: 'Aulas', tarea: 'Clases generales, laboratorios, bibliotecas', lux: 300 }
];

const isValidUuid = (val) => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
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

  // Sampling Points State
  const [puntos, setPuntos] = useState([]);
  
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
            const { data: sData, error: sErr } = await supabase.storage
              .from('signatures')
              .createSignedUrl(relativePath, 3600);
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

  // Calculations helper for noise points
  const getPuntoCalculos = useCallback((p) => {
    let resultado = 'Pendiente';
    let valorMedidoText = '-';
    let limiteLegalText = '-';

    if (p.caracteristicas_ruido === 'impulso_impacto') {
      const valPico = parseFloat(p.nivel_pico_lc_pico_dbc);
      limiteLegalText = '140 dBC (Techo)';
      if (!isNaN(valPico)) {
        valorMedidoText = `${valPico} dBC`;
        resultado = valPico <= 140 ? 'Cumple' : 'No cumple';
      }
    } else {
      // continuo_intermitente
      if (p.tipo_carga_continuo === 'laeq') {
        const valLaeq = parseFloat(p.nivel_laeq_te_dba);
        const teHs = parseFloat(p.tiempo_exposicion_hs);
        const limiteDba = getLimiteDbaForTe(teHs);
        const labelTe = (!isNaN(teHs) && teHs > 0) ? `${teHs} hs` : '8 hs';
        limiteLegalText = `${limiteDba} dBA (${labelTe})`;
        if (!isNaN(valLaeq)) {
          valorMedidoText = `${valLaeq} dBA`;
          resultado = valLaeq <= limiteDba ? 'Cumple' : 'No cumple';
        }
      } else if (p.tipo_carga_continuo === 'suma_fracciones') {
        const valSuma = parseFloat(p.resultado_suma_fracciones);
        limiteLegalText = '1.00';
        if (!isNaN(valSuma)) {
          valorMedidoText = `${valSuma}`;
          resultado = valSuma <= 1.0 ? 'Cumple' : 'No cumple';
        }
      } else if (p.tipo_carga_continuo === 'dosis') {
        const valDosis = parseFloat(p.dosis_porcentaje);
        limiteLegalText = '100 %';
        if (!isNaN(valDosis)) {
          valorMedidoText = `${valDosis} %`;
          resultado = valDosis <= 100 ? 'Cumple' : 'No cumple';
        }
      }
    }

    return {
      resultado_punto: resultado,
      valorMedidoText,
      limiteLegalText
    };
  }, []);

  // Calculate Overall Protocol Result
  const getResultadoGeneral = useCallback(() => {
    if (!puntos || puntos.length === 0) return 'Sin evaluar';
    const calculados = puntos.map(p => getPuntoCalculos(p));
    if (calculados.some(c => c.resultado_punto === 'No cumple')) return 'No cumple';
    if (calculados.some(c => c.resultado_punto === 'Pendiente')) return 'Borrador';
    return 'Cumple';
  }, [puntos, getPuntoCalculos]);

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

    const generalRes = getResultadoGeneral();
    if (generalRes === 'No cumple' && (!conclusiones || !conclusiones.trim() || !recomendaciones || !recomendaciones.trim())) {
      return false;
    }

    return true;
  }, [empresaId, establecimientoId, fechaMedicion, puntos, conclusiones, recomendaciones, getPuntoCalculos, getResultadoGeneral]);

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

      const loadedPuntos = (ptsData || []).map(p => ({
        id: p.id,
        orden: p.orden,
        punto_muestreo: p.punto_muestreo,
        sector_id: p.sector_id || '',
        sector_text: p.sector_text || '',
        puesto_id: p.puesto_id || '',
        puesto_text: p.puesto_text || '',
        tiempo_exposicion_hs: p.tiempo_exposicion_hs !== null ? String(p.tiempo_exposicion_hs) : '8',
        tiempo_integracion: p.tiempo_integracion || '15 min',
        caracteristicas_ruido: p.caracteristicas_ruido || 'continuo_intermitente',
        nivel_pico_lc_pico_dbc: p.nivel_pico_lc_pico_dbc !== null ? String(p.nivel_pico_lc_pico_dbc) : '',
        tipo_carga_continuo: p.tipo_carga_continuo || 'laeq',
        nivel_laeq_te_dba: p.nivel_laeq_te_dba !== null ? String(p.nivel_laeq_te_dba) : '',
        modo_suma_fracciones: p.modo_suma_fracciones || 'directo',
        fracciones: (Array.isArray(p.fracciones) && p.fracciones.length > 0)
          ? p.fracciones
          : [{ id: 'f-' + p.id + '-1', c_horas: '', t_horas: '' }],
        resultado_suma_fracciones: p.resultado_suma_fracciones !== null ? String(p.resultado_suma_fracciones) : '',
        dosis_porcentaje: p.dosis_porcentaje !== null ? String(p.dosis_porcentaje) : '',
        observaciones_punto: p.observaciones_punto || '',
        isCollapsed: true
      }));

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
    conclusiones,
    recomendaciones,
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

  const createNewPunto = (num) => ({
    id: 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    orden: num,
    punto_muestreo: num,
    sector_id: '',
    sector_text: '',
    puesto_id: '',
    puesto_text: '',
    tiempo_exposicion_hs: '8',
    tiempo_integracion: '15 min',
    caracteristicas_ruido: 'continuo_intermitente',
    nivel_pico_lc_pico_dbc: '',
    tipo_carga_continuo: 'laeq',
    nivel_laeq_te_dba: '',
    modo_suma_fracciones: 'directo',
    fracciones: [{ id: 'f-' + Date.now() + '-1', c_horas: '', t_horas: '' }],
    resultado_suma_fracciones: '',
    dosis_porcentaje: '',
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
      setHorariosTurnosText(est.horario_funcionamiento || '');
      setEstSectoresLocal(est.sectores || []);
    } else {
      setEstablecimientoText('');
      setDireccionText('');
      setProvinciaText('');
      setLocalidadText('');
      setCpText('');
      setHorariosTurnosText('');
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

  // Add/remove measurement to point
  const handleAddMedicion = (puntoId) => {
    setPuntos(puntos.map(p => {
      if (p.id === puntoId) {
        return {
          ...p,
          mediciones: [...p.mediciones, { id: 'm-' + Date.now() + '-' + p.mediciones.length, valor_lux: '' }]
        };
      }
      return p;
    }));
  };

  const handleRemoveMedicion = (puntoId, medId) => {
    setPuntos(puntos.map(p => {
      if (p.id === puntoId) {
        if (p.mediciones.length <= 1) {
          globalToast.toast('El punto debe tener al menos una medición lux.', 'warning');
          return p;
        }
        return {
          ...p,
          mediciones: p.mediciones.filter(m => m.id !== medId)
        };
      }
      return p;
    }));
  };

  const handleMedicionValueChange = (puntoId, medId, val) => {
    // Keep positive numeric values
    const cleanVal = val.replace(/[^0-9]/g, '');
    setPuntos(puntos.map(p => {
      if (p.id === puntoId) {
        return {
          ...p,
          mediciones: p.mediciones.map(m => m.id === medId ? { ...m, valor_lux: cleanVal } : m)
        };
      }
      return p;
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
          globalToast.toast('Debe cargar al menos un punto de muestreo.', 'error');
          return;
        }

        for (let i = 0; i < puntos.length; i++) {
          const p = puntos[i];
          const secStr = (p.sector_text || '').trim();

          if (!secStr) {
            globalToast.toast(`Falta definir el sector en el punto #${i + 1}.`, 'error');
            return;
          }

          const cal = getPuntoCalculos(p);
          if (cal.cantidad_mediciones_cargadas === 0) {
            globalToast.toast(`Debe cargar al menos una medición lux en el punto #${i + 1}.`, 'error');
            return;
          }

          if (isNaN(parseFloat(p.valor_requerido_legal_lux)) || parseFloat(p.valor_requerido_legal_lux) <= 0) {
            globalToast.toast(`Debe definir el valor legal requerido en el punto #${i + 1}.`, 'error');
            return;
          }

          // Si el resultado general es No cumple, debe requerir conclusiones y recomendaciones
          const generalRes = getResultadoGeneral();
          if (generalRes === 'No cumple' && (!concStr || !recStr)) {
            globalToast.toast('Al detectarse puntos que NO CUMPLEN, es obligatorio completar las Conclusiones y Recomendaciones.', 'error');
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
        const cal = getPuntoCalculos(p);
        return {
          protocolo_id: tempId,
          orden: idx + 1,
          punto_muestreo: p.punto_muestreo,
          sector_id: isValidUuid(p.sector_id) ? p.sector_id : null,
          sector_text: p.sector_text || null,
          puesto_id: isValidUuid(p.puesto_id) ? p.puesto_id : null,
          puesto_text: p.puesto_text || null,
          tiempo_exposicion_hs: parseFloat(p.tiempo_exposicion_hs) || null,
          tiempo_integracion: p.tiempo_integracion || null,
          caracteristicas_ruido: p.caracteristicas_ruido || 'continuo_intermitente',
          nivel_pico_lc_pico_dbc: parseFloat(p.nivel_pico_lc_pico_dbc) || null,
          tipo_carga_continuo: p.tipo_carga_continuo || 'laeq',
          nivel_laeq_te_dba: parseFloat(p.nivel_laeq_te_dba) || null,
          modo_suma_fracciones: p.modo_suma_fracciones || 'directo',
          fracciones: p.fracciones || null,
          resultado_suma_fracciones: parseFloat(p.resultado_suma_fracciones) || null,
          dosis_porcentaje: parseFloat(p.dosis_porcentaje) || null,
          resultado_punto: cal.resultado_punto,
          observaciones_punto: p.observaciones_punto || null
        };
      });

      const { data: insertedPoints, error: ptsErr } = await supabase
        .from('protocolos_ergonomia_puntos')
        .insert(pointsPayload)
        .select();
      if (ptsErr) throw ptsErr;

      // 3. Guardar Mediciones (si aplican)
      const medicionesPayload = [];
      if (Array.isArray(insertedPoints)) {
        insertedPoints.forEach(dbPunto => {
          const localP = puntos.find(lp => lp.punto_muestreo === dbPunto.punto_muestreo);
          if (localP && Array.isArray(localP.mediciones)) {
            localP.mediciones.forEach((m, mIdx) => {
              const val = parseFloat(m.valor_lux);
              if (!isNaN(val)) {
                medicionesPayload.push({
                  punto_id: dbPunto.id,
                  orden: mIdx + 1,
                  valor_lux: val
                });
              }
            });
          }
        });
      }

      if (medicionesPayload.length > 0) {
        const { error: medErr } = await supabase
          .from('protocolos_ergonomia_mediciones')
          .insert(medicionesPayload);
        if (medErr) throw medErr;
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
      <div className="flex-grow flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 text-[#468DFF] animate-spin" />
        <span className="ml-3 text-sm text-slate-500 font-medium">Cargando formulario de protocolo...</span>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[85vh] animate-fade-in w-full">
      {/* Cabecera del Formulario */}
      <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={handleExitAttempt} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-outfit text-base font-bold text-slate-900">
            {mode === 'create' ? 'Nuevo Protocolo de Ergonomía' : mode === 'edit' ? 'Editar Protocolo de Ergonomía' : 'Detalle de Protocolo de Ergonomía'}
          </span>
          <button
            type="button"
            onClick={() => setIsResolucionModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#468DFF] hover:bg-[#468DFF] hover:text-white border border-blue-200 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ml-1.5"
            title="Ver Instructivo de Completado (Resolución SRT N° 886/15)"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Resolución SRT N° 886/15</span>
            <span className="sm:hidden text-[10px]">Resolución SRT N° 886/15</span>
          </button>
        </div>
        <button type="button" onClick={handleExitAttempt} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto flex-1 scrollbar-thin select-none">
        
        {/* CARD ESTABLECIMIENTO */}
        <AppCard className="p-5 md:p-6 space-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 col-span-full">
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
              <div className="flex flex-col gap-1 md:col-span-1">
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
            </div>
          </div>
        </AppCard>

        {/* CARD DATOS DE LA EVALUACIÓN */}
        <AppCard className="p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#468DFF]" />
              Datos de la evaluación ({puntos.length})
            </h3>
            {canEdit && (
              <button
                type="button"
                onClick={handleAddPunto}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar Área y sector de estudio
              </button>
            )}
          </div>

          <div className="space-y-4">
            {puntos.map((p, idx) => {
              const cal = getPuntoCalculos(p);

              // Colors based on point result
              let badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
              if (cal.resultado_punto === 'Cumple') badgeColor = 'bg-[#00B050]/15 text-[#00B050] border-[#00B050]/30';
              if (cal.resultado_punto === 'No cumple') badgeColor = 'bg-[#FF0000]/15 text-[#FF0000] border-[#FF0000]/30';
              if (cal.resultado_punto === 'Parcial') badgeColor = 'bg-[#FF9900]/15 text-[#FF9900] border-[#FF9900]/30';

              return (
                <div key={p.id} className="border border-slate-200 rounded-xl bg-slate-50/40 p-4 space-y-4 transition-all">
                  
                  {/* Cabecera del Punto */}
                  <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-lg border border-slate-300/40 uppercase">
                        Punto #{p.punto_muestreo}
                      </span>
                      {p.sector_text && (
                        <span className="text-xs font-bold text-slate-800 max-w-[200px] truncate">
                          - {p.sector_text} {p.puesto_text ? `(${p.puesto_text})` : ''}
                        </span>
                      )}
                      <span className={`ml-2 px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase ${badgeColor}`}>
                        {cal.resultado_punto}
                      </span>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span
                        role="button"
                        onClick={() => handleToggleCollapsePunto(p.id)}
                        className="text-[9px] text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 font-bold px-2 py-0.5 rounded-md border border-slate-200 transition-all cursor-pointer flex items-center gap-0.5 shadow-sm"
                        title={p.isCollapsed ? "Expandir punto" : "Contraer punto"}
                      >
                        {p.isCollapsed ? (
                          <>
                            <ChevronDown className="h-2.5 w-2.5" />
                            Ver más
                          </>
                        ) : (
                          <>
                            <ChevronUp className="h-2.5 w-2.5" />
                            Ver menos
                          </>
                        )}
                      </span>
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDuplicatePunto(p)}
                            className="p-1 text-slate-650 hover:bg-slate-100 rounded transition-colors border border-slate-200 flex items-center justify-center cursor-pointer"
                            title="Duplicar punto"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePunto(p.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors border border-red-200 flex items-center justify-center cursor-pointer"
                            title="Eliminar punto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contenido del Punto */}
                  {!p.isCollapsed && (
                    <div className="space-y-4 pt-1 animate-scale-up">
                      
                      {/* Fila 1: Sector y Puesto */}
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
                      </div>

                      {/* Fila 2: Tiempos de Exposición e Integración */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col gap-1">
                          <AppLabel htmlFor={`tiempo-exp-${p.id}`} required={estado === 'completado'}>
                            Tiempo de exposición del trabajador (Te, en horas)
                          </AppLabel>
                          <AppInput
                            id={`tiempo-exp-${p.id}`}
                            disabled={!canEdit}
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="Ej: 8"
                            value={p.tiempo_exposicion_hs}
                            onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, tiempo_exposicion_hs: e.target.value } : x))}
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <AppLabel htmlFor={`tiempo-integ-${p.id}`}>
                            Tiempo de integración (tiempo de medición)
                          </AppLabel>
                          <AppInput
                            id={`tiempo-integ-${p.id}`}
                            disabled={!canEdit}
                            placeholder="Ej: 15 min / 1 hs"
                            value={p.tiempo_integracion}
                            onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, tiempo_integracion: e.target.value } : x))}
                          />
                        </div>
                      </div>

                      {/* Fila 3: Características generales del ruido a medir */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <AppLabel htmlFor={`carac-ruido-${p.id}`}>
                            Características generales del ruido a medir
                          </AppLabel>
                          <button
                            type="button"
                            onClick={() => setIsTabla1RuidoOpen(true)}
                            className="text-[#468DFF] hover:text-[#0511F2] transition-colors p-1 rounded-full hover:bg-blue-50 flex items-center gap-1 font-bold text-xs cursor-pointer"
                            title="Ver Tabla 1 — Valores límite para ruido"
                          >
                            <HelpCircle className="h-4 w-4" />
                            <span className="underline text-[11px]">Ver Tabla 1</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => setPuntos(puntos.map(x => x.id === p.id ? { ...x, caracteristicas_ruido: 'continuo_intermitente' } : x))}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                              p.caracteristicas_ruido === 'continuo_intermitente'
                                ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Continuo / Intermitente
                          </button>
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => setPuntos(puntos.map(x => x.id === p.id ? { ...x, caracteristicas_ruido: 'impulso_impacto' } : x))}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                              p.caracteristicas_ruido === 'impulso_impacto'
                                ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            De impulso o de impacto
                          </button>
                        </div>
                      </div>

                      {/* CONDICIONAL: Impulso o Impacto */}
                      {p.caracteristicas_ruido === 'impulso_impacto' && (
                        <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 space-y-2 animate-scale-up">
                          <AppLabel htmlFor={`pico-dbc-${p.id}`} className="font-extrabold text-amber-900 text-xs">
                            RUIDO DE IMPULSO O DE IMPACTO - Nivel pico de presión acústica ponderado C (LCpico, en dBC)
                          </AppLabel>
                          <AppInput
                            id={`pico-dbc-${p.id}`}
                            disabled={!canEdit}
                            type="number"
                            step="0.1"
                            placeholder="Ej: 135.0"
                            className="bg-white border-amber-300 focus:border-[#468DFF]"
                            value={p.nivel_pico_lc_pico_dbc}
                            onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, nivel_pico_lc_pico_dbc: e.target.value } : x))}
                          />
                          <p className="text-[10px] text-amber-700 font-medium">
                            *Límite legal techo según Res. 295/03 ANEXO V: Nivel pico ponderado C no debe exceder 140 dBC.
                          </p>
                        </div>
                      )}

                      {/* CONDICIONAL: Sonido Continuo o Intermitente */}
                      {p.caracteristicas_ruido === 'continuo_intermitente' && (
                        <div className="bg-slate-100/80 p-4 rounded-xl border border-slate-200 space-y-3.5 animate-scale-up">
                          <h4 className="font-extrabold text-slate-800 font-outfit uppercase tracking-wider text-xs flex items-center gap-2 border-b border-slate-200 pb-2">
                            SONIDO CONTINUO o INTERMITENTE
                          </h4>

                          {/* Pestañas de selección de modalidad de carga */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setPuntos(puntos.map(x => x.id === p.id ? { ...x, tipo_carga_continuo: 'laeq' } : x))}
                              className={`p-2.5 rounded-lg text-[11px] font-bold text-center border transition-all cursor-pointer ${
                                p.tipo_carga_continuo === 'laeq'
                                  ? 'bg-white text-[#468DFF] border-[#468DFF] shadow-sm'
                                  : 'bg-slate-200/60 text-slate-600 border-slate-300/40 hover:bg-slate-200'
                              }`}
                            >
                              Nivel Integrado (LAeq,Te en dBA)
                            </button>
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setPuntos(puntos.map(x => x.id === p.id ? { ...x, tipo_carga_continuo: 'suma_fracciones' } : x))}
                              className={`p-2.5 rounded-lg text-[11px] font-bold text-center border transition-all cursor-pointer ${
                                p.tipo_carga_continuo === 'suma_fracciones'
                                  ? 'bg-white text-[#468DFF] border-[#468DFF] shadow-sm'
                                  : 'bg-slate-200/60 text-slate-600 border-slate-300/40 hover:bg-slate-200'
                              }`}
                            >
                              Suma de las Fracciones (Σ Ci/Ti)
                            </button>
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setPuntos(puntos.map(x => x.id === p.id ? { ...x, tipo_carga_continuo: 'dosis' } : x))}
                              className={`p-2.5 rounded-lg text-[11px] font-bold text-center border transition-all cursor-pointer ${
                                p.tipo_carga_continuo === 'dosis'
                                  ? 'bg-white text-[#468DFF] border-[#468DFF] shadow-sm'
                                  : 'bg-slate-200/60 text-slate-600 border-slate-300/40 hover:bg-slate-200'
                              }`}
                            >
                              Dosis (en porcentaje %)
                            </button>
                          </div>

                          {/* Inputs según modalidad de carga */}
                          <div className="bg-white p-3 rounded-xl border border-slate-200">
                            {p.tipo_carga_continuo === 'laeq' && (
                              <div className="flex flex-col gap-1">
                                <AppLabel htmlFor={`laeq-${p.id}`} className="text-xs font-semibold">
                                  Nivel de presión acústica integrado (LAeq,Te en dBA)
                                </AppLabel>
                                <AppInput
                                  id={`laeq-${p.id}`}
                                  disabled={!canEdit}
                                  type="number"
                                  step="0.1"
                                  placeholder="Ej: 82.5"
                                  value={p.nivel_laeq_te_dba}
                                  onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, nivel_laeq_te_dba: e.target.value } : x))}
                                />
                              </div>
                            )}

                            {p.tipo_carga_continuo === 'suma_fracciones' && (
                              <div className="space-y-3">
                                {/* Selector de modalidad para Suma de Fracciones */}
                                <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                  <span className="text-xs font-bold text-slate-700">
                                    Modalidad de carga para Suma de Fracciones:
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={!canEdit}
                                      onClick={() => setPuntos(puntos.map(x => x.id === p.id ? { ...x, modo_suma_fracciones: 'directo' } : x))}
                                      className={`px-3 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                                        (p.modo_suma_fracciones || 'directo') === 'directo'
                                          ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
                                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      Resultado Directo
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!canEdit}
                                      onClick={() => setPuntos(puntos.map(x => x.id === p.id ? { ...x, modo_suma_fracciones: 'desglose' } : x))}
                                      className={`px-3 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                                        p.modo_suma_fracciones === 'desglose'
                                          ? 'bg-[#468DFF] text-white border-[#468DFF] shadow-sm'
                                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      Desglose de Fracciones (C1/T1 + C2/T2 + ...)
                                    </button>
                                  </div>
                                </div>

                                {/* MODALIDAD 1: RESULTADO DIRECTO */}
                                {(p.modo_suma_fracciones || 'directo') === 'directo' && (
                                  <div className="flex flex-col gap-1">
                                    <AppLabel htmlFor={`suma-${p.id}`} className="text-xs font-semibold">
                                      Resultado final de la suma de fracciones (Σ C1/T1 + C2/T2 + ...)
                                    </AppLabel>
                                    <AppInput
                                      id={`suma-${p.id}`}
                                      disabled={!canEdit}
                                      type="number"
                                      step="0.01"
                                      placeholder="Ej: 0.85"
                                      value={p.resultado_suma_fracciones}
                                      onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, resultado_suma_fracciones: e.target.value } : x))}
                                    />
                                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                                      *Límite legal según Anexo V Res. 295/03: La suma acumulada no debe exceder de 1.00.
                                    </span>
                                  </div>
                                )}

                                {/* MODALIDAD 2: DESGLOSE DE FRACCIONES */}
                                {p.modo_suma_fracciones === 'desglose' && (
                                  <div className="space-y-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                                    <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                                          Desglose de Fracciones (Res. 295/03 ANEXO V)
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setIsTabla1RuidoOpen(true)}
                                          className="text-[#468DFF] hover:text-[#0511F2] transition-colors p-1 rounded-full hover:bg-blue-50 flex items-center gap-1 font-bold text-xs cursor-pointer"
                                          title="Ver Tabla 1 — Valores límite para ruido"
                                        >
                                          <HelpCircle className="h-4 w-4" />
                                          <span className="underline text-[11px]">Ver Tabla 1</span>
                                        </button>
                                      </div>
                                      {canEdit && (
                                        <button
                                          type="button"
                                          onClick={() => handleAddFraccion(p.id)}
                                          className="text-[11px] text-[#468DFF] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                                        >
                                          <Plus className="h-3.5 w-3.5" /> Agregar Fracción (Cn/Tn)
                                        </button>
                                      )}
                                    </div>

                                    {/* Lista de filas de fracciones */}
                                    <div className="space-y-2">
                                      {((p.fracciones && p.fracciones.length > 0) ? p.fracciones : [{ id: 'f-' + p.id + '-1', c_horas: '', t_horas: '' }]).map((f, fIdx) => {
                                        const cVal = parseFloat(f.c_horas);
                                        const tVal = parseFloat(f.t_horas);
                                        const fracRes = (!isNaN(cVal) && !isNaN(tVal) && tVal > 0) ? (cVal / tVal).toFixed(3) : '-';

                                        return (
                                          <div key={f.id || `f-${fIdx}`} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                                            <div className="col-span-12 sm:col-span-1 text-center font-extrabold text-xs text-slate-500">
                                              #{fIdx + 1}
                                            </div>
                                            <div className="col-span-12 sm:col-span-4 flex flex-col gap-0.5">
                                              <span className="text-[10px] text-slate-500 font-semibold">Ci (Exposición en hs)</span>
                                              <AppInput
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                placeholder="Ej: 4"
                                                disabled={!canEdit}
                                                className="h-8 text-xs"
                                                value={f.c_horas || ''}
                                                onChange={(e) => handleFraccionChange(p.id, f.id || ('f-' + p.id + '-1'), 'c_horas', e.target.value)}
                                              />
                                            </div>
                                            <div className="col-span-12 sm:col-span-4 flex flex-col gap-0.5">
                                              <span className="text-[10px] text-slate-500 font-semibold">Ti (Máximo permitido en hs)</span>
                                              <AppInput
                                                type="number"
                                                step="0.1"
                                                min="0.1"
                                                placeholder="Ej: 8"
                                                disabled={!canEdit}
                                                className="h-8 text-xs"
                                                value={f.t_horas || ''}
                                                onChange={(e) => handleFraccionChange(p.id, f.id || ('f-' + p.id + '-1'), 't_horas', e.target.value)}
                                              />
                                            </div>
                                            <div className="col-span-10 sm:col-span-2 text-center bg-blue-50/60 py-1 px-2 rounded-md font-bold text-xs text-[#468DFF] border border-blue-100">
                                              C/T = {fracRes}
                                            </div>
                                            <div className="col-span-2 sm:col-span-1 flex justify-center">
                                              {canEdit && (p.fracciones && p.fracciones.length > 1) && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveFraccion(p.id, f.id)}
                                                  className="text-slate-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                                                  title="Eliminar fracción"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Resumen Total Calculado de la Suma de Fracciones */}
                                    <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 text-xs mt-2">
                                      <span className="font-semibold text-slate-600">Suma Total Acumulada Calculada:</span>
                                      <span className={`font-extrabold text-sm ${parseFloat(p.resultado_suma_fracciones) > 1.0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        Σ (Ci / Ti) = {p.resultado_suma_fracciones || '0.00'}
                                      </span>
                                    </div>

                                    <p className="text-[10px] text-slate-400 font-medium">
                                      *Donde Ci = Tiempo total de exposición a un nivel determinado (hs) y Ti = Tiempo total permitido a ese nivel según Res. 295/03 ANEXO V (hs). Límite legal = 1.00.
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {p.tipo_carga_continuo === 'dosis' && (
                              <div className="flex flex-col gap-1">
                                <AppLabel htmlFor={`dosis-${p.id}`} className="text-xs font-semibold">
                                  Dosis de ruido diaria acumulada (Dosis %)
                                </AppLabel>
                                <AppInput
                                  id={`dosis-${p.id}`}
                                  disabled={!canEdit}
                                  type="number"
                                  step="0.1"
                                  placeholder="Ej: 75.0"
                                  value={p.dosis_porcentaje}
                                  onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, dosis_porcentaje: e.target.value } : x))}
                                />
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-slate-500 font-medium mt-0.5">
                                  <span>*Límite legal: Dosis máxima diaria permitida = 100 %.</span>
                                  <span className="text-amber-700 font-semibold">NOTA: Completar este campo sólo cuando la medición se realice con un dosímetro</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* RESULTADOS Y EVALUACIÓN TÉCNICA */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                        <h4 className="font-extrabold text-slate-700 font-outfit uppercase tracking-wider text-[10px]">Cálculos e Indicadores Técnicos</h4>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-slate-500">
                          <div>Característica de ruido: <span className="font-bold text-slate-800 capitalize">{p.caracteristicas_ruido === 'impulso_impacto' ? 'Impulso / Impacto' : 'Continuo / Intermitente'}</span></div>
                          <div>Parámetro medido: <span className="font-bold text-slate-800">{cal.valorMedidoText}</span></div>
                          <div>Límite normativo: <span className="font-bold text-slate-800">{cal.limiteLegalText}</span></div>
                        </div>

                        <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center text-slate-600">
                          <div>Verificación de cumplimiento (Decreto Nº 351/79 - ANEXO V - CAPITULO 13 (ACUSTICA)):</div>
                          <span className={`font-extrabold text-xs px-2.5 py-0.5 rounded-full border ${
                            cal.resultado_punto === 'Cumple'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              : cal.resultado_punto === 'No cumple'
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {cal.resultado_punto}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </AppCard>

        {/* CARD INFORMACIÓN ADICIONAL */}
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
                          className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-1 bg-red-50 text-red-500 hover:bg-red-100 rounded-md transition-colors cursor-pointer border border-red-200/50"
                        >
                          Limpiar Firma
                        </button>
                      )}
                    </div>
                  )}
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
                      router.push(`/${tenantSlug}/protocolos/iluminacion/${editingId}/editar`);
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
          
          <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
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
            <div className="max-h-[160px] overflow-y-auto border border-slate-100 rounded-xl p-3 bg-slate-50/50 space-y-2 text-xs">
              {syncQueue.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center gap-2 border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                  <span className="font-bold text-slate-700">{item.label}</span>
                  <span className="text-slate-500 font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <AppButton
              variant="outline"
              onClick={() => {
                setIsSyncOpen(false);
                executeSave(estSectoresLocal);
              }}
              className="text-xs py-1.5 h-[34px]"
            >
              Omitir todo
            </AppButton>
            <AppButton
              variant="primary"
              onClick={async () => {
                setIsSyncOpen(false);
                setSaveLoading(true);
                try {
                  const updatedSectores = [...estSectoresLocal];
                  
                  for (let i = 0; i < syncQueue.length; i++) {
                    const qItem = syncQueue[i];
                    if (qItem.type === 'sector') {
                      const exists = updatedSectores.some(s => s.denominacion.toLowerCase() === qItem.value.toLowerCase());
                      if (!exists) {
                        updatedSectores.push({
                          id: 's-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                          denominacion: qItem.value,
                          puestos: []
                        });
                      }
                    }
                  }
                  
                  // Guardar sincronizados
                  await executeSave(updatedSectores);
                } catch (err) {
                  console.error('Error in sync wizard save:', err);
                  globalToast.toast('Error al sincronizar datos con el perfil.', 'error');
                  setSaveLoading(false);
                }
              }}
              className="text-xs py-1.5 h-[34px]"
            >
              Guardar y Sincronizar
            </AppButton>
          </div>
        </div>
      </div>
    )}

    {/* MODAL INSTRUCTIVO Y RESOLUCIÓN SRT N° 886/15 */}
    <Resolucion886Modal
      isOpen={isResolucionModalOpen}
      onClose={() => setIsResolucionModalOpen(false)}
    />

    {/* MODAL ANEXO IV DEC 351/79 TABLA 1 (Buscador y Selección de Lux) */}
    <Tabla1Modal
      isOpen={isTabla1Open}
      onClose={() => {
        setIsTabla1Open(false);
        setTargetPuntoIdForTabla1(null);
      }}
      onSelectLux={handleSelectLuxFromTabla1}
    />

    {/* MODAL TABLA 1 VALORES LIMITE RUIDO (RES. 295/03 ANEXO V) */}
    <Tabla1ErgonomiaModal
      isOpen={isTabla1RuidoOpen}
      onClose={() => setIsTabla1RuidoOpen(false)}
    />
  </>
  );
}
