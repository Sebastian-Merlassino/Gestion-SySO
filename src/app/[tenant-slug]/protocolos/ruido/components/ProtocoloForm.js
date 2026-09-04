// src/app/[tenant-slug]/protocolos/ruido/components/ProtocoloForm.js
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/providers/ToastProvider';
import AppButton from '@/components/ui/AppButton';
import AppInput from '@/components/ui/AppInput';
import AppDatePicker from '@/components/ui/AppDatePicker';
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
  Printer,
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
import { formatDate, formatAsDateInput, convertToDbDate, sanitizeFileName } from '@/lib/utils';
import { getLimiteDbaForTe, getPuntoCalculos } from '../utils/tablasAnexoV';
import Tabla1RuidoModal from './Tabla1RuidoModal';
import MetodoCuadriculaModal from './MetodoCuadriculaModal';

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
  onPrintPdf = null,
  onExportPdf = null
}) {
  const router = useRouter();
  const globalToast = useToast();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  
  // Normative Modal State
  const [isMetodoCuadriculaOpen, setIsMetodoCuadriculaOpen] = useState(false);
  
  // Lookups data
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  
  // Form fields
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [razonSocialText, setRazonSocialText] = useState('');
  const [cuitText, setCuitText] = useState('');
  const [establecimientoText, setEstablecimientoText] = useState('');
  const [direccionText, setDireccionText] = useState('');
  const [provinciaText, setProvinciaText] = useState('');
  const [localidadText, setLocalidadText] = useState('');
  const [cpText, setCpText] = useState('');
  const [horariosTurnosText, setHorariosTurnosText] = useState('Lunes a viernes de 8:00 a 17:00 hs');

  // Medicion
  const [instrumento, setInstrumento] = useState('');
  const [fechaCalibracion, setFechaCalibracion] = useState('');
  const [metodologia, setMetodologia] = useState('Método de la Cuadrícula');
  const [fechaMedicion, setFechaMedicion] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFinalizacion, setHoraFinalizacion] = useState('');
  const [condicionesAtmosfericas, setCondicionesAtmosfericas] = useState('Al momento de la medición, el establecimiento se encontraba funcionando en condiciones normales de producción.');
  const [documentacionAdjunta, setDocumentacionAdjunta] = useState('Certificado de Calibración.\nPlano o Croquis del establecimiento.');
  const [observacionesGenerales, setObservacionesGenerales] = useState('Al momento de la medición, el establecimiento se encontraba funcionando en condiciones normales.');
  const [informacionAdicional, setInformacionAdicional] = useState('');

  // Análisis
  const [conclusiones, setConclusiones] = useState('Los valores obtenidos en todos los puntos de muestreo, Cumplen con lo establecido en el ANEXO V - CAPITULO 13 (Acústica), del Decreto Nº 351/79.');
  const [recomendaciones, setRecomendaciones] = useState(`Cuando los niveles de exposición al ruido superen o se encuentren próximos a los valores establecidos en el ANEXO V - CAPITULO 13 (Acústica), del Decreto Nº 351/79, se recomienda:

• Implementar controles de ingeniería sobre las fuentes generadoras, mediante mantenimiento, reparación, aislamiento, encapsulamiento, instalación de barreras acústicas, silenciadores o elementos antivibratorios.
• Evaluar la sustitución o modificación de máquinas, herramientas, equipos o procesos por alternativas de menor emisión sonora.
• Delimitar y señalizar el sector, restringiendo el acceso al personal autorizado y estableciendo el uso obligatorio de protección auditiva cuando corresponda.
• Proveer protectores auditivos adecuados, seleccionados según el nivel de exposición, la atenuación requerida y su compatibilidad con otros elementos de protección personal.
• Capacitar al personal expuesto sobre los riesgos del ruido, las medidas preventivas y el uso, ajuste, conservación y reposición de los protectores auditivos.
• Controlar los tiempos de exposición, mediante rotación de tareas, reducción de permanencia o reorganización de las actividades, cuando las medidas técnicas no resulten suficientes.`);
  const [estado, setEstado] = useState('borrador'); // 'borrador' | 'completado' | 'anulado'
  const [isTabla1RuidoOpen, setIsTabla1RuidoOpen] = useState(false);

  // Sampling Points State
  const [puntos, setPuntos] = useState([]);

  // Attachments state (local files / Google Drive)
  const [adjuntos, setAdjuntos] = useState([]);
  
  // Professional & Signature State
  const [miembrosList, setMiembrosList] = useState([]);
  const [profesionalId, setProfesionalId] = useState('');
  const [profesionalNombre, setProfesionalNombre] = useState('');
  const [profesionalMatricula, setProfesionalMatricula] = useState('');
  const [incluirMatriculaPdf, setIncluirMatriculaPdf] = useState(true);
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
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorImageUrl, setEditorImageUrl] = useState('');
  const [editPhotoIndex, setEditPhotoIndex] = useState(null);
  const [estSectoresLocal, setEstSectoresLocal] = useState([]);

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

  const sectionPerms = getSectionPermissions(profile, 'protocolo_ruido');
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
        .from('protocolos_ruido')
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
    if (!instrumento || !instrumento.trim()) return false;
    if (!fechaCalibracion) return false;
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
  }, [empresaId, establecimientoId, fechaMedicion, instrumento, fechaCalibracion, puntos, conclusiones, recomendaciones, getPuntoCalculos, getResultadoGeneral]);

  // Load companies & establishments lookups
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let emps = [];
        let ests = [];
        let dbMatriculas = [];

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

        if (!session) {
          setIsDevMode(true);
          // Load Mock Data
          emps = [
            { id: 'mock-empresa-1', razon_social: 'Ams Inversiones S.A.', cuit: '30-12345678-9' },
            { id: 'mock-empresa-2', razon_social: 'Argento Via Publica', cuit: '30-98765432-1' }
          ];
          ests = [
            { id: 'mock-est-1', empresa_id: 'mock-empresa-1', denominacion: 'Callao 727', direccion: 'Av. Callao 727', provincia: 'CABA', localidad_barrio: 'San Nicolás', cp: '1023', horario_funcionamiento: '09:00 a 18:00', sectores: [{ id: 's-1', denominacion: 'Oficina Central', largo: '6.25', ancho: '3.39', altura: '2.90', puestos: [{ id: 'p-1', denominacion: 'Escritorio Administración' }] }] },
            { id: 'mock-est-2', empresa_id: 'mock-empresa-1', denominacion: 'Cordoba 2045', direccion: 'Av. Córdoba 2045', provincia: 'CABA', localidad_barrio: 'Recoleta', cp: '1120', sectores: [] },
            { id: 'mock-est-3', empresa_id: 'mock-empresa-2', denominacion: 'Único', direccion: 'Perú 345', provincia: 'Buenos Aires', localidad_barrio: 'Tigre', cp: '1648', sectores: [] }
          ];
        } else {
          // Real Supabase data
          const { data: dbEmps, error: empErr } = await supabase
            .from('empresas')
            .select('id, razon_social, cuit')
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
          try {
            const { data: mData } = await supabase
              .from('matriculas')
              .select('profile_id, institucion, numero');
            dbMatriculas = mData || [];
          } catch (mErr) {
            console.log('No tabla matriculas o error al consultar:', mErr);
          }

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
          await loadExistingRecord(session, mems, ests);
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
  const loadExistingRecord = async (session, memsList = [], estsList = []) => {
    try {
      if (!session) {
        // Dev Mock Record
        setLoading(false);
        return;
      }

      // 1. Principal
      const { data: proto, error: prErr } = await supabase
        .from('protocolos_ruido')
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
      setEstablecimientoText(proto.establecimiento_text || '');
      setDireccionText(proto.direccion_text || '');
      setProvinciaText(proto.provincia_text || '');
      setLocalidadText(proto.localidad_text || '');
      setCpText(proto.cp_text || '');
      setHorariosTurnosText(proto.horarios_turnos_text || '');
      setInstrumento(proto.instrumento_marca_modelo_serie || '');
      setFechaCalibracion(formatDate(proto.fecha_calibracion) || '');
      setMetodologia(proto.metodologia_utilizada || '');
      setFechaMedicion(formatDate(proto.fecha_medicion) || '');
      setHoraInicio(proto.hora_inicio || '');
      setHoraFinalizacion(proto.hora_finalizacion || '');
      const rawDocAdj = proto.documentacion_adjunta || '';
      const hasNoMat = rawDocAdj.includes('[NO_MATRICULA_PDF]');
      setIncluirMatriculaPdf(!hasNoMat);
      setDocumentacionAdjunta(rawDocAdj.replace(/\[NO_MATRICULA_PDF\]/g, '').trim());
      setObservacionesGenerales(proto.observaciones || '');
      setInformacionAdicional(proto.informacion_adicional || '');
      setConclusiones(proto.conclusiones || '');
      setRecomendaciones(proto.recomendaciones || '');
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
        const activeEst = estsList.find(e => e.id === proto.establecimiento_id);
        if (activeEst) {
          setEstSectoresLocal(activeEst.sectores || []);
        }
      }

      // 2. Puntos
      const { data: ptsData, error: ptsErr } = await supabase
        .from('protocolos_ruido_puntos')
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
        .from('protocolos_ruido_adjuntos')
        .select('*')
        .eq('protocolo_id', editingId);
      if (adjErr) throw adjErr;

      // Generar URL firmadas si los archivos no son urls completas
      const pathsToSign = [];
      (adjData || []).forEach(ad => {
        if (ad.storage_path && !ad.storage_path.startsWith('http') && !ad.storage_path.startsWith('data:')) {
          pathsToSign.push(ad.storage_path);
        }
        if (ad.original_path && !ad.original_path.startsWith('http') && !ad.original_path.startsWith('data:') && !pathsToSign.includes(ad.original_path)) {
          pathsToSign.push(ad.original_path);
        }
      });

      let signedUrlsMap = {};
      if (pathsToSign.length > 0) {
        const { data: signedData } = await supabase.storage
          .from('protocolos-ruido')
          .createSignedUrls(pathsToSign, 3600);
        if (signedData) {
          signedData.forEach(item => {
            if (item.signedUrl) signedUrlsMap[item.path] = item.signedUrl;
          });
        }
      }

      setAdjuntos((adjData || []).map(ad => {
        let parsedMarkers = [];
        if (Array.isArray(ad.markers)) {
          parsedMarkers = ad.markers;
        } else if (typeof ad.markers === 'string' && ad.markers.trim().startsWith('[')) {
          try {
            parsedMarkers = JSON.parse(ad.markers);
          } catch (e) {
            parsedMarkers = [];
          }
        }

        const origUrl = ad.original_path?.startsWith('http') ? ad.original_path : (signedUrlsMap[ad.original_path] || ad.original_path || ad.storage_path);

        return {
          id: ad.id,
          tipo: ad.tipo || 'Otro',
          name: ad.nombre_archivo || 'Archivo',
          path: ad.storage_path,
          preview: ad.storage_path.startsWith('http') ? ad.storage_path : (signedUrlsMap[ad.storage_path] || ''),
          originalPath: ad.original_path || ad.storage_path,
          originalUrl: origUrl,
          markers: parsedMarkers
        };
      }));

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
      instrumento,
      fechaCalibracion,
      metodologia,
      fechaMedicion,
      horaInicio,
      horaFinalizacion,
      horariosTurnosText,
      condicionesAtmosfericas,
      documentacionAdjunta,
      observacionesGenerales,
      informacionAdicional,
      conclusiones,
      recomendaciones,
      estado,
      profesionalId,
      profesionalNombre,
      profesionalMatricula,
      firmaTipo,
      puntosCount: puntos.length,
      adjuntosCount: adjuntos.length
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
    instrumento,
    fechaCalibracion,
    metodologia,
    fechaMedicion,
    horaInicio,
    horaFinalizacion,
    condicionesAtmosfericas,
    documentacionAdjunta,
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
    setHorariosTurnosText('');
    setEstSectoresLocal([]);

    const emp = empresas.find(e => e.id === val);
    if (emp) {
      setRazonSocialText(emp.razon_social);
      setCuitText(emp.cuit || '');
    } else {
      setRazonSocialText('');
      setCuitText('');
    }
  };

  // Handle establishment change
  const handleEstablecimientoChange = async (val) => {
    setEstablecimientoId(val);
    let est = allEstablecimientos.find(e => e.id === val);
    if (val && !isDevMode) {
      try {
        const { data: freshEst } = await supabase
          .from('establecimientos')
          .select('*')
          .eq('id', val)
          .single();
        if (freshEst) {
          est = freshEst;
          setAllEstablecimientos(prev => {
            const exists = prev.some(e => e.id === freshEst.id);
            return exists ? prev.map(e => e.id === freshEst.id ? freshEst : e) : [...prev, freshEst];
          });
        }
      } catch (err) {
        console.warn('Error refrescando establecimiento en ruido:', err);
      }
    }
    if (est) {
      setEstablecimientoText(est.denominacion || '');
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

  // Upload attachment file
  const handleUploadFile = async (file, type) => {
    try {
      let userId = profile?.id;
      if (!userId) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id;
        } catch (e) {
          console.warn('Network error fetching user:', e);
        }
      }
      if (!userId) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          userId = session?.user?.id;
        } catch (e) {
          console.warn('Network error fetching session:', e);
        }
      }
      if (!userId && !isDevMode) throw new Error('Usuario no autenticado.');
      if (!userId && isDevMode) userId = 'dev-user';

      const uuid = editingId || crypto.randomUUID();
      const safeName = sanitizeFileName(file.name);
      const filename = `${userId}/${uuid}/adjuntos/${Date.now()}_${safeName}`;

      // Upload to private bucket
      const { error } = await supabase.storage
        .from('protocolos-ruido')
        .upload(filename, file, { cacheControl: '3600', upsert: true });
      if (error) throw error;

      // Get signed URL preview
      const { data: sData } = await supabase.storage
        .from('protocolos-ruido')
        .createSignedUrl(filename, 3600);

      const newAdjunto = {
        id: 'adj-' + Date.now(),
        tipo: type,
        name: file.name,
        path: filename,
        preview: sData?.signedUrl || '',
        originalPath: filename,
        markers: []
      };

      setAdjuntos(prev => [...prev, newAdjunto]);
      globalToast.toast(`Archivo "${file.name}" cargado con éxito.`, 'success');
    } catch (err) {
      console.error(err);
      globalToast.toast('Error al subir el archivo al storage.', 'error');
    }
  };

  // Import Google Drive Link
  const handleImportDriveLink = (urlStr, type) => {
    const newAdj = {
      id: 'adj-drive-' + Date.now(),
      tipo: type,
      name: `Drive - ${type}`,
      path: urlStr,
      preview: urlStr,
      originalPath: urlStr,
      markers: []
    };
    setAdjuntos(prev => [...prev, newAdj]);
    globalToast.toast('Enlace de Google Drive registrado con éxito.', 'success');
  };

  const handleDeleteAdjunto = (id) => {
    setAdjuntos(prev => prev.filter(ad => ad.id !== id));
  };

  const handleSaveEditedPhoto = (newPoints, bakedDataUrl) => {
    try {
      const planoFotosAdjuntos = adjuntos.filter(a => a.tipo === 'Evidencia Fotográfica Plano' || a.tipo === 'Foto Plano');
      const targetPhoto = planoFotosAdjuntos[editPhotoIndex];
      if (!targetPhoto) return;

      setAdjuntos(prev => {
        const updated = prev.map(ad => {
          if (ad.id === targetPhoto.id) {
            return {
              ...ad,
              preview: bakedDataUrl,
              markers: newPoints
            };
          }
          return ad;
        });

        // Recalcular correlatividad global
        let allMarkers = [];
        updated.forEach(ad => {
          if (ad.tipo === 'Evidencia Fotográfica Plano' || ad.tipo === 'Foto Plano') {
            allMarkers.push(...(ad.markers || []));
          }
        });

        // Ordenar por timestamp
        allMarkers.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        // Re-asignar números
        allMarkers.forEach((m, idx) => {
          m.number = idx + 1;
        });

        // Mapear los números corregidos de vuelta
        return updated.map(ad => {
          if (ad.tipo === 'Evidencia Fotográfica Plano' || ad.tipo === 'Foto Plano') {
            const mappedMarkers = (ad.markers || []).map(m => {
              const matched = allMarkers.find(am => am.createdAt === m.createdAt);
              return matched ? { ...m, number: matched.number } : m;
            });
            return { ...ad, markers: mappedMarkers };
          }
          return ad;
        });
      });

      globalToast.toast('Marcadores guardados en la sesión. Se subirán al confirmar el protocolo.', 'success');
    } catch (err) {
      console.error('Error al guardar la foto editada:', err);
      globalToast.toast('Error al guardar los marcadores.', 'error');
    }
  };

  // SUBMIT FLOW - PROFILE SYNC WIZARD
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    try {
      const instStr = (instrumento || '').trim();
      const metStr = (metodologia || '').trim();
      const concStr = (conclusiones || '').trim();
      const recStr = (recomendaciones || '').trim();

      if (!empresaId || !establecimientoId || !fechaMedicion) {
        globalToast.toast('Complete la Razón Social, Establecimiento y Fecha de Medición.', 'error');
        return;
      }

      if (!instStr) {
        globalToast.toast('Ingrese el instrumento utilizado en la medición.', 'error');
        return;
      }

      // Validaciones para guardado como COMPLETADO
      if (estado === 'completado') {
        if (!fechaCalibracion) {
          globalToast.toast('Para completar el protocolo es obligatorio cargar la fecha de calibración del instrumental.', 'error');
          return;
        }

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

          if (p.caracteristicas_ruido === 'impulso_impacto') {
            if (p.nivel_pico_lc_pico_dbc === '' || p.nivel_pico_lc_pico_dbc === null || isNaN(parseFloat(p.nivel_pico_lc_pico_dbc))) {
              globalToast.toast(`Debe ingresar el Nivel Pico (LCpico en dBC) en el punto #${i + 1}.`, 'error');
              return;
            }
          } else {
            // Continuo / Intermitente
            if (p.tiempo_exposicion_hs === '' || p.tiempo_exposicion_hs === null || isNaN(parseFloat(p.tiempo_exposicion_hs)) || parseFloat(p.tiempo_exposicion_hs) <= 0) {
              globalToast.toast(`Debe definir el tiempo de exposición del trabajador (en horas) en el punto #${i + 1}.`, 'error');
              return;
            }

            const tipoContinuo = p.tipo_carga_continuo || 'laeq';
            if (tipoContinuo === 'laeq') {
              if (p.nivel_laeq_te_dba === '' || p.nivel_laeq_te_dba === null || isNaN(parseFloat(p.nivel_laeq_te_dba))) {
                globalToast.toast(`Debe ingresar el Nivel Integrado (LAeq,Te en dBA) en el punto #${i + 1}.`, 'error');
                return;
              }
            } else if (tipoContinuo === 'suma_fracciones') {
              if (p.resultado_suma_fracciones === '' || p.resultado_suma_fracciones === null || isNaN(parseFloat(p.resultado_suma_fracciones))) {
                globalToast.toast(`Debe ingresar el resultado de la suma de fracciones en el punto #${i + 1}.`, 'error');
                return;
              }
            } else if (tipoContinuo === 'dosis') {
              if (p.dosis_porcentaje === '' || p.dosis_porcentaje === null || isNaN(parseFloat(p.dosis_porcentaje))) {
                globalToast.toast(`Debe ingresar la dosis diaria de ruido (en porcentaje %) en el punto #${i + 1}.`, 'error');
                return;
              }
            }
          }
        }

        // Si el resultado general es No cumple, debe requerir conclusiones y recomendaciones
        const generalRes = getResultadoGeneral();
        if (generalRes === 'No cumple' && (!concStr || !recStr)) {
          globalToast.toast('Al detectarse puntos que NO CUMPLEN, es obligatorio completar las Conclusiones y Recomendaciones.', 'error');
          return;
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
        await executeSave();
      }
    } catch (err) {
      console.error('Error al enviar formulario:', err);
      globalToast.toast('Ocurrió un error al procesar el formulario.', 'error');
    }
  };

  // Handle Wizard action buttons (Sincronización en 1 solo clic)
  const handleSyncConfirm = async (action) => {
    setIsSyncOpen(false);

    if (action === 'save_profile' && syncQueue.length > 0 && establecimientoId) {
      try {
        let currentDbSectores = [];
        if (!isDevMode) {
          const { data: freshEst, error: fetchErr } = await supabase
            .from('establecimientos')
            .select('sectores')
            .eq('id', establecimientoId)
            .single();
          if (fetchErr) throw fetchErr;
          currentDbSectores = Array.isArray(freshEst?.sectores) ? [...freshEst.sectores] : [];
        } else {
          currentDbSectores = [...estSectoresLocal];
        }

        for (const item of syncQueue) {
          const secName = (item.sectorName || '').trim();
          if (!secName) continue;

          let existingIdx = currentDbSectores.findIndex(s => 
            (typeof s === 'string' ? s : s.denominacion || s.nombre || '').trim().toLowerCase() === secName.toLowerCase()
          );

          if (item.type === 'new_sector') {
            if (existingIdx === -1) {
              const newSec = {
                id: 'sec-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                denominacion: secName,
                descripcion: '',
                largo: item.largo || '',
                ancho: item.ancho || '',
                altura: item.altura || '',
                puestos: item.puestoName ? [{
                  id: 'pst-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                  denominacion: item.puestoName.trim(),
                  descripcion: ''
                }] : []
              };
              currentDbSectores.push(newSec);
            } else if (item.puestoName) {
              const existingSec = currentDbSectores[existingIdx];
              const puestos = Array.isArray(existingSec.puestos) ? [...existingSec.puestos] : [];
              if (!puestos.some(pst => (pst.denominacion || '').trim().toLowerCase() === item.puestoName.trim().toLowerCase())) {
                puestos.push({
                  id: 'pst-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                  denominacion: item.puestoName.trim(),
                  descripcion: ''
                });
                currentDbSectores[existingIdx] = { ...existingSec, puestos };
              }
            }
          } else if (item.type === 'modify_dimensions') {
            if (existingIdx !== -1) {
              const existingSec = currentDbSectores[existingIdx];
              currentDbSectores[existingIdx] = {
                ...existingSec,
                largo: item.largo || existingSec.largo || '',
                ancho: item.ancho || existingSec.ancho || '',
                altura: item.altura || existingSec.altura || ''
              };
            }
          } else if (item.type === 'new_puesto') {
            if (existingIdx !== -1 && item.puestoName) {
              const existingSec = currentDbSectores[existingIdx];
              const puestos = Array.isArray(existingSec.puestos) ? [...existingSec.puestos] : [];
              if (!puestos.some(pst => (pst.denominacion || '').trim().toLowerCase() === item.puestoName.trim().toLowerCase())) {
                puestos.push({
                  id: 'pst-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                  denominacion: item.puestoName.trim(),
                  descripcion: ''
                });
                currentDbSectores[existingIdx] = { ...existingSec, puestos };
              }
            }
          }
        }

        if (!isDevMode) {
          const { error: estUpdErr } = await supabase
            .from('establecimientos')
            .update({ sectores: currentDbSectores })
            .eq('id', establecimientoId);
          if (estUpdErr) throw estUpdErr;
        }

        setEstSectoresLocal(currentDbSectores);
        setAllEstablecimientos(prev => prev.map(est =>
          est.id === establecimientoId ? { ...est, sectores: currentDbSectores } : est
        ));
        globalToast.toast('Perfil de establecimiento actualizado correctamente.', 'success');
      } catch (err) {
        console.error('Error al sincronizar sectores con perfil:', err);
        globalToast.toast('Error al sincronizar datos con el perfil.', 'error');
      }
    }

    setSyncQueue([]);
    await executeSave();
  };

  // FINAL SAVE DATABASE WRITER
  const executeSave = async () => {
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

      // 1. Si faltan datos generales en el establecimiento (localidad, cp, horario), completarlos en BD si están presentes
      if (!isDevMode && establecimientoId) {
        const selectedEst = allEstablecimientos.find(e => e.id === establecimientoId);
        const updateData = {};
        
        if (selectedEst) {
          if (!selectedEst.localidad_barrio && localidadText) {
            updateData.localidad_barrio = localidadText;
          }
          if (!selectedEst.cp && cpText) {
            updateData.cp = cpText;
          }
          if (!selectedEst.horario_funcionamiento && horariosTurnosText) {
            updateData.horario_funcionamiento = horariosTurnosText;
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

      let docAdjunta = (documentacionAdjunta || '').replace(/\[NO_MATRICULA_PDF\]/g, '').trim();
      if (!incluirMatriculaPdf) {
        docAdjunta = docAdjunta ? `${docAdjunta}\n[NO_MATRICULA_PDF]` : '[NO_MATRICULA_PDF]';
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
        establecimiento_text: establecimientoText,
        direccion_text: direccionText,
        provincia_text: provinciaText,
        localidad_text: localidadText,
        cp_text: cpText,
        horarios_turnos_text: horariosTurnosText || null,
        instrumento_marca_modelo_serie: instrumento,
        fecha_calibracion: convertToDbDate(fechaCalibracion) || null,
        metodologia_utilizada: metodologia,
        fecha_medicion: convertToDbDate(fechaMedicion) || null,
        hora_inicio: horaInicio || null,
        hora_finalizacion: horaFinalizacion || null,
        condiciones_atmosfericas: condicionesAtmosfericas || null,
        documentacion_adjunta: docAdjunta,
        observaciones: observacionesGenerales || null,
        informacion_adicional: informacionAdicional || null,
        conclusiones: conclusiones || null,
        recomendaciones: recomendaciones || null,
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
          globalToast.toast('Protocolo de Ruido guardado como COMPLETADO (Mock).', 'success');
        } else if (estado === 'anulado') {
          globalToast.toast('Protocolo de Ruido guardado como ANULADO (Mock).', 'success');
        } else {
          globalToast.toast('Protocolo guardado como BORRADOR (Mock).', 'info');
        }
        onSaveSuccess();
        return;
      }

      if (editingId) {
        payloadProto.updated_by = userId;
        const { error: prErr } = await supabase
          .from('protocolos_ruido')
          .update(payloadProto)
          .eq('id', editingId);
        if (prErr) throw prErr;
      } else {
        payloadProto.created_by = userId;
        payloadProto.created_at = new Date().toISOString();
        const { error: prErr } = await supabase
          .from('protocolos_ruido')
          .insert([payloadProto]);
        if (prErr) throw prErr;
      }

      // 2. Guardar Puntos de Muestreo (Cascade delete old ones first if editing)
      if (editingId) {
        const { error: delErr } = await supabase
          .from('protocolos_ruido_puntos')
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
        .from('protocolos_ruido_puntos')
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
          .from('protocolos_ruido_mediciones')
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
              .from('protocolos-ruido')
              .createSignedUrl(resolvedUrl, 3600);
            if (data?.signedUrl) {
              resolvedUrl = data.signedUrl;
            }
          }

          const bakedDataUrl = await bakeImageWithMarkers(resolvedUrl, ad.markers);
          if (bakedDataUrl) {
            const cleanName = ad.name || `foto_${Date.now()}.jpg`;
            const safeName = sanitizeFileName(cleanName);
            const blob = dataURLtoBlob(bakedDataUrl);
            const file = new File([blob], `baked_${Date.now()}_${safeName}`, { type: 'image/jpeg' });
            
            const uuid = editingId || tempId;
            const filename = `${userId}/${uuid}/adjuntos/${Date.now()}_baked_${safeName}`;
            const { error: uploadErr } = await supabase.storage
              .from('protocolos-ruido')
              .upload(filename, file, { cacheControl: '3600', upsert: true });
              
            if (!uploadErr) {
              const { data: sData } = await supabase.storage
                .from('protocolos-ruido')
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
          .from('protocolos_ruido_adjuntos')
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
          .from('protocolos_ruido_adjuntos')
          .insert(adjPayload);
        if (insAdjErr) throw insAdjErr;
      }

      if (estado === 'completado') {
        globalToast.toast('Protocolo de Ruido guardado como COMPLETADO.', 'success');
      } else if (estado === 'anulado') {
        globalToast.toast('Protocolo de Ruido guardado como ANULADO.', 'success');
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
        <AppLoadingSpinner message="Cargando protocolo de ruido..." />
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
          <span className="font-outfit text-sm sm:text-base font-bold text-slate-900 truncate max-w-[120px] xs:max-w-[170px] sm:max-w-none shrink-0" title={mode === 'create' ? 'Nuevo Protocolo de Ruido' : mode === 'edit' ? 'Editar Protocolo de Ruido' : 'Detalle de Protocolo de Ruido'}>
            {mode === 'create' ? 'Nuevo Protocolo' : mode === 'edit' ? 'Editar Protocolo' : 'Detalle Protocolo'}
          </span>
          <button
            type="button"
            onClick={() => setIsMetodoCuadriculaOpen(true)}
            className="flex items-center gap-1 px-2 py-0.5 sm:px-3 sm:py-1 bg-blue-50 text-[#468DFF] hover:bg-[#468DFF] hover:text-white border border-blue-200 rounded-lg text-[10px] sm:text-xs font-bold transition-all active:scale-95 cursor-pointer ml-1 sm:ml-1.5 shrink-0"
            title="Ver Decreto Nº 351/79 - ANEXO V"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Decreto Nº 351/79 - ANEXO V</span>
            <span className="hidden sm:inline md:hidden">Anexo V</span>
            <span className="sm:hidden">Anexo V</span>
          </button>
        </div>
        <button type="button" onClick={handleExitAttempt} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer shrink-0">
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 select-none overflow-y-auto flex-1 scrollbar-thin">
        
        {/* CARD ESTABLECIMIENTO */}
        <AppCard className="p-3.5 sm:p-5 md:p-6 space-y-3 sm:space-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-full">
              <div className="flex flex-col gap-1">
                <AppLabel htmlFor="provinciaText">Provincia</AppLabel>
                <AppInput id="provinciaText" disabled value={provinciaText} />
              </div>
              <div className="flex flex-col gap-1">
                <AppLabel htmlFor="localidadText">Localidad</AppLabel>
                <AppInput 
                  id="localidadText"
                  disabled={isReadOnly || (!!establecimientoId && estHasLocalidad)} 
                  value={localidadText} 
                  onChange={(e) => setLocalidadText(e.target.value)}
                  placeholder="Localidad del establecimiento"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 col-span-full">
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
        </AppCard>

        {/* CARD DATOS MEDICION */}
        <AppCard className="p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Zap className="h-5 w-5 text-[#468DFF]" />
            <h2 className="font-outfit text-base font-extrabold text-slate-800">Datos de la Medición</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1 md:col-span-2">
              <AppLabel htmlFor="instrumento" className="min-h-[2.5rem] flex items-center mb-1" required>
                Marca, modelo y N° de serie del instrumento
              </AppLabel>
              <AppInput
                id="instrumento"
                disabled={!canEdit}
                value={instrumento}
                onChange={(e) => setInstrumento(e.target.value)}
                placeholder="Decibelimetro Marca: ...; Modelo: ...; Número de serie: ... ."
              />
            </div>

            <div className="flex flex-col relative md:col-span-1">
              <AppDatePicker
                id="fechaCalibracion"
                label="Fecha de Calibración del Instrumental"
                required={estado === 'completado'}
                disabled={!canEdit}
                value={fechaCalibracion}
                onChange={(e) => setFechaCalibracion(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-full">
              <div className="flex flex-col">
                <AppDatePicker
                  id="fechaMedicion"
                  label="Fecha Medición"
                  required
                  disabled={!canEdit}
                  value={fechaMedicion}
                  onChange={(e) => setFechaMedicion(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <AppLabel htmlFor="horaInicio">Hora de Inicio</AppLabel>
                <AppInput
                  id="horaInicio"
                  type="time"
                  disabled={!canEdit}
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <AppLabel htmlFor="horaFinalizacion">Hora de Fin</AppLabel>
                <AppInput
                  id="horaFinalizacion"
                  type="time"
                  disabled={!canEdit}
                  value={horaFinalizacion}
                  onChange={(e) => setHoraFinalizacion(e.target.value)}
                />
              </div>
            </div>

            {/* Contenedor 1: Horarios / Turnos Habituales de Trabajo */}
            <div className="flex flex-col gap-1 col-span-full">
              <div className="flex items-center justify-between">
                <AppLabel htmlFor="horariosTurnosText">Horarios / Turnos Habituales de Trabajo</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={horariosTurnosText}
                  onChange={setHorariosTurnosText}
                  context="Horarios y turnos habituales de trabajo del establecimiento"
                />
              </div>
              <AppTextarea
                id="horariosTurnosText"
                disabled={!canEdit}
                rows={2}
                value={horariosTurnosText}
                onChange={(e) => setHorariosTurnosText(e.target.value)}
                placeholder="Lunes a viernes de 8:00 a 17:00 hs"
              />
            </div>

            {/* Contenedor 2: Describa las condiciones normales y/o habituales de trabajo */}
            <div className="flex flex-col gap-1 col-span-full">
              <div className="flex items-center justify-between">
                <AppLabel htmlFor="condicionesAtmosfericas">Describa las condiciones normales y/o habituales de trabajo</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={condicionesAtmosfericas}
                  onChange={setCondicionesAtmosfericas}
                  context="Descripción de las condiciones normales y/o habituales de trabajo"
                />
              </div>
              <AppTextarea
                id="condicionesAtmosfericas"
                disabled={!canEdit}
                rows={2}
                value={condicionesAtmosfericas}
                onChange={(e) => setCondicionesAtmosfericas(e.target.value)}
                placeholder="Al momento de la medición, el establecimiento se encontraba funcionando en condiciones normales de producción."
              />
            </div>

            {/* Contenedor 3: Describa las condiciones de trabajo al momento de la medición */}
            <div className="flex flex-col gap-1 col-span-full">
              <div className="flex items-center justify-between">
                <AppLabel htmlFor="observacionesGenerales">Describa las condiciones de trabajo al momento de la medición.</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={observacionesGenerales}
                  onChange={setObservacionesGenerales}
                  context="Descripción de las condiciones de trabajo al momento de la medición de ruido"
                />
              </div>
              <AppTextarea
                id="observacionesGenerales"
                disabled={!canEdit}
                rows={2}
                value={observacionesGenerales}
                onChange={(e) => setObservacionesGenerales(e.target.value)}
                placeholder="Al momento de la medición, el establecimiento se encontraba funcionando en condiciones normales."
              />
            </div>
          </div>
        </AppCard>

        {/* CARD DOCUMENTACIÓN QUE SE ADJUNTARÁ */}
        <AppCard className="p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#468DFF]" />
              <h2 className="font-outfit text-base font-extrabold text-slate-800">Documentación que se Adjuntará a la Medición</h2>
            </div>
            <AITextHelper
              disabled={!canEdit}
              value={documentacionAdjunta}
              onChange={setDocumentacionAdjunta}
              context="Listado de anexos técnicos y documentación adjunta a la medición de ruido"
            />
          </div>

          <div className="flex flex-col gap-1 col-span-full">
            <AppTextarea
              id="documentacionAdjunta"
              disabled={!canEdit}
              rows={3}
              value={documentacionAdjunta}
              onChange={(e) => setDocumentacionAdjunta(e.target.value)}
              placeholder="Certificado de Calibración.&#10;Plano o Croquis del establecimiento."
            />
          </div>
        </AppCard>

        {/* CARD PUNTOS DE MUESTREO */}
        <AppCard className="p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#468DFF]" />
              Puntos de Muestreo ({puntos.length})
            </h3>
            {canEdit && (
              <button
                type="button"
                onClick={handleAddPunto}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar punto de muestreo
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
                          <AppLabel htmlFor={`sector-sel-${p.id}`} required={estado === 'completado'}>Sector</AppLabel>
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
        <AppCard className="p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-[#468DFF]" />
              <h2 className="font-outfit text-base font-extrabold text-slate-800">Información adicional</h2>
            </div>
            <AITextHelper
              disabled={!canEdit}
              value={informacionAdicional}
              onChange={setInformacionAdicional}
              context="Información adicional referente a las mediciones del protocolo de ruido"
            />
          </div>

          <div className="space-y-2">
            <AppTextarea
              id="informacionAdicional"
              disabled={!canEdit}
              rows={4}
              value={informacionAdicional}
              onChange={(e) => setInformacionAdicional(e.target.value)}
              placeholder="Ingrese cualquier información adicional relevante respecto a las mediciones de ruido..."
            />
          </div>
        </AppCard>

        {/* CARD ANALISIS Y MEJORAS */}
        <AppCard className="p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Info className="h-5 w-5 text-[#468DFF]" />
            <h2 className="font-outfit text-base font-extrabold text-slate-800">Análisis de los Datos y Mejoras a Realizar</h2>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <AppLabel htmlFor="conclusiones">Conclusiones</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={conclusiones}
                  onChange={setConclusiones}
                  context="Conclusiones sobre el cumplimiento normativo de los niveles de ruido laboral según el Decreto Nº 351/79 Anexo V"
                />
              </div>
              <AppTextarea
                id="conclusiones"
                disabled={!canEdit}
                rows={3}
                value={conclusiones}
                onChange={(e) => setConclusiones(e.target.value)}
                placeholder="Escribe conclusiones del protocolo..."
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <AppLabel htmlFor="recomendaciones">Recomendaciones para adecuar el nivel de ruido</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={recomendaciones}
                  onChange={setRecommendations => setRecomendaciones(setRecommendations)}
                  context="Recomendaciones y medidas de ingeniería/EPP para mitigar el nivel de ruido laboral según el Decreto Nº 351/79 Anexo V"
                />
              </div>
              <AppTextarea
                id="recomendaciones"
                disabled={!canEdit}
                rows={3}
                value={recomendaciones}
                onChange={(e) => setRecomendaciones(e.target.value)}
                placeholder="Ej: Implementar protectores auditivos tipo copa o endoaurales, mantenimiento de maquinaria, apantallamiento acústico, rotación de personal, etc."
              />
              {getResultadoGeneral() === 'No cumple' && (
                <span className="text-[10px] text-red-500 font-bold block mt-1">
                  ⚠️ El resultado general del protocolo es "No cumple". Es obligatorio completar las Conclusiones y Recomendaciones de adecuación.
                </span>
              )}
            </div>
          </div>
        </AppCard>

        {/* CARD DOCUMENTACIÓN ADJUNTA */}
        {(() => {
          const certificadoAdjunto = adjuntos.find(a => a.tipo === 'Certificado de Calibración' || a.tipo === 'Certificado');
          const planoFotosAdjuntos = adjuntos.filter(a => a.tipo === 'Evidencia Fotográfica Plano' || a.tipo === 'Foto Plano');

          return (
            <AppCard className="p-5 md:p-6 space-y-5">
              <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                <FileText className="h-5 w-5 text-[#468DFF]" />
                <h2 className="font-outfit text-base font-extrabold text-slate-800">Documentación Adjunta</h2>
              </div>

              <div className="space-y-5">
                {/* SECCIÓN 1: CERTIFICADO DE CALIBRACIÓN */}
                <div className="bg-slate-50/80 p-4 md:p-5 rounded-2xl border border-slate-200 space-y-3.5">
                  <div className="flex items-start gap-2.5 border-b border-slate-200/80 pb-2.5">
                    <ShieldCheck className="h-5 w-5 text-[#468DFF] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-outfit text-xs font-bold text-slate-800 uppercase tracking-wider leading-snug">
                        Certificado de Calibración del Instrumental
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                        Carga del certificado oficial de calibración del sonómetro / fotómetro utilizado.
                      </p>
                    </div>
                  </div>

                  {/* Bloque SySO-Document-Compact-Layout */}
                  <DocumentUploadZone
                    label="Certificado de Calibración (PDF / Documento)"
                    fileName={certificadoAdjunto?.name}
                    url={certificadoAdjunto?.preview}
                    signedUrl={certificadoAdjunto?.preview}
                    disabled={!canEdit}
                    accept="application/pdf,image/*"
                    maxSizeMB={10}
                    onFileChange={async (file) => {
                      if (certificadoAdjunto) {
                        handleDeleteAdjunto(certificadoAdjunto.id);
                      }
                      await handleUploadFile(file, 'Certificado de Calibración');
                    }}
                    onDriveImport={(link) => {
                      if (certificadoAdjunto) {
                        handleDeleteAdjunto(certificadoAdjunto.id);
                      }
                      handleImportDriveLink(link, 'Certificado de Calibración');
                    }}
                    onDelete={certificadoAdjunto ? () => handleDeleteAdjunto(certificadoAdjunto.id) : null}
                  />
                </div>

                {/* SECCIÓN 2: PLANO O CROQUIS DEL ESTABLECIMIENTO */}
                <div className="bg-slate-50/80 p-4 md:p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-start gap-2.5 border-b border-slate-200/80 pb-2.5">
                    <MapPin className="h-5 w-5 text-[#468DFF] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-outfit text-xs font-bold text-slate-800 uppercase tracking-wider leading-snug">
                        Plano o Croquis del Establecimiento
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                        Carga el plano en formato de imagen (PNG, JPG) para posicionar los puntos de medición.
                      </p>
                    </div>
                  </div>

                  {/* Bloque 2: SySO-Multiple-Evidence-Photo-Grid (Imágenes / Evidencias) */}
                  <div className="pt-2">
                    <ImageUploadZone
                      label="Imágenes del plano o croquis del establecimiento"
                      disabled={!canEdit}
                      multiple={true}
                      maxSizeMB={5}
                      images={planoFotosAdjuntos.map(f => ({
                        id: f.id,
                        preview: f.preview || f.path,
                        name: f.name
                      }))}
                      onAddPhotos={async (filesArray) => {
                        for (const file of filesArray) {
                          await handleUploadFile(file, 'Evidencia Fotográfica Plano');
                        }
                      }}
                      onRemovePhoto={(index) => {
                        const targetPhoto = planoFotosAdjuntos[index];
                        if (targetPhoto) {
                          handleDeleteAdjunto(targetPhoto.id);
                        }
                      }}
                      onEditPhoto={async (index) => {
                        const targetPhoto = planoFotosAdjuntos[index];
                        if (targetPhoto) {
                          setEditPhotoIndex(index);
                          let url = targetPhoto.originalUrl || targetPhoto.originalPath || targetPhoto.path || targetPhoto.preview || targetPhoto.public_url;
                          if (!url.startsWith('http') && !url.startsWith('data:')) {
                            const { data, error } = await supabase.storage
                              .from('protocolos-ruido')
                              .createSignedUrl(url, 3600);
                            if (!error && data?.signedUrl) {
                              url = data.signedUrl;
                            }
                          }
                          setEditorImageUrl(url);
                          setIsEditorOpen(true);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </AppCard>
          );
        })()}

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

              {/* Switch opcional: Incluir matrículas en el reporte PDF */}
              <div className="mt-1 pt-3 border-t border-slate-100 flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">
                    Adjuntar credencial / matrícula en el PDF
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Incluye como anexo técnico las fotos de frente y dorso de la matrícula cargada en el perfil.
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={incluirMatriculaPdf}
                  disabled={!canEdit}
                  onClick={() => setIncluirMatriculaPdf(!incluirMatriculaPdf)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    incluirMatriculaPdf ? 'bg-[#468DFF]' : 'bg-slate-300'
                  } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      incluirMatriculaPdf ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
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
                    type="button"
                    variant="secondary"
                    onClick={onSendPdf}
                    className="flex items-center gap-1.5 shadow-sm"
                  >
                    <Mail className="h-4 w-4" />
                    Enviar PDF
                  </AppButton>
                )}
                {onPrintPdf && (
                  <AppButton
                    type="button"
                    variant="secondary"
                    onClick={onPrintPdf}
                    className="flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </AppButton>
                )}
                {onExportPdf && (
                  <AppButton
                    type="button"
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
                      router.push(`/${tenantSlug}/protocolos/ruido/${editingId}/editar`);
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
                  <AppButton
                    type="submit"
                    onClick={handleSubmit}
                    loading={saveLoading}
                    variant="primary"
                    size="md"
                  >
                    Guardar
                  </AppButton>
                )}
              </>
            )}
          </div>
        </div>
      </form>
    </div>

    {/* MODAL EDITOR DE PUNTOS DE MEDICIÓN EN PLANO / CROQUIS */}
    {(() => {
      const planoFotosAdjuntos = adjuntos.filter(a => a.tipo === 'Evidencia Fotográfica Plano' || a.tipo === 'Foto Plano');
      const currentTargetPhoto = editPhotoIndex !== null ? planoFotosAdjuntos[editPhotoIndex] : null;
      const otherImagesMarkers = editPhotoIndex !== null 
        ? planoFotosAdjuntos.filter((_, idx) => idx !== editPhotoIndex).flatMap(a => a.markers || [])
        : [];

      return (
        <MeasurementPointsEditorModal
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditPhotoIndex(null);
          }}
          imageUrl={editorImageUrl}
          initialPoints={currentTargetPhoto?.markers || []}
          otherImagesMarkers={otherImagesMarkers}
          onSave={(newPoints, bakedDataUrl) => {
            handleSaveEditedPhoto(newPoints, bakedDataUrl);
          }}
        />
      );
    })()}

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
      description="¿Está seguro de que desea eliminar permanentemente este protocolo de iluminación y todos sus puntos de muestreo y mediciones asociados? Esta acción no se puede deshacer."
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
            <AppButton
              type="button"
              variant="secondary"
              size="md"
              onClick={() => handleSyncConfirm('skip')}
            >
              Solo guardar en este protocolo
            </AppButton>

            <AppButton
              type="button"
              variant="primary"
              size="md"
              onClick={() => handleSyncConfirm('save_profile')}
            >
              Guardar todos en el perfil ({syncQueue.length})
            </AppButton>
          </div>
        </div>
      </div>
    )}

    {/* MODAL MÉTODO Y MARCO NORMATIVO RUIDO (Dec. 351/79 ANEXO V) */}
    <MetodoCuadriculaModal
      isOpen={isMetodoCuadriculaOpen}
      onClose={() => setIsMetodoCuadriculaOpen(false)}
    />

    {/* MODAL TABLA 1 VALORES LIMITE RUIDO (RES. 295/03 ANEXO V) */}
    <Tabla1RuidoModal
      isOpen={isTabla1RuidoOpen}
      onClose={() => setIsTabla1RuidoOpen(false)}
    />
  </>
  );
}

// ==========================================
// COMPONENTE: MODAL EDITOR DE PUNTOS DE MEDICIÓN
// ==========================================
function MeasurementPointsEditorModal({ isOpen, onClose, imageUrl, initialPoints = [], otherImagesMarkers = [], onSave }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPoints(Array.isArray(initialPoints) ? [...initialPoints] : []);
    }
  }, [isOpen, initialPoints]);

  const handleImageClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Add point with a timestamp
    setPoints(prev => [...prev, { x, y, createdAt: Date.now() }]);
  };

  const handleUndo = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPoints([]);
  };

  // Combine and calculate numbers dynamically
  const getNumberedPoints = () => {
    const combined = [
      ...otherImagesMarkers.map(m => ({ ...m, source: 'other' })),
      ...points.map(m => ({ ...m, source: 'current' }))
    ];
    combined.sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
    combined.forEach((m, index) => {
      m.number = index + 1;
    });
    return combined.filter(m => m.source === 'current');
  };

  const currentNumberedPoints = getNumberedPoints();

  const handleSave = () => {
    if (!imageUrl) return;
    setLoading(true);
    const img = new Image();
    img.crossOrigin = 'anonymous'; // critical for Supabase signed urls to avoid canvas tainting
    img.src = imageUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Draw points
        const minDim = Math.min(img.naturalWidth, img.naturalHeight);
        const radius = Math.max(16, minDim * 0.02); // 2% of min dimension, min 16px
        
        currentNumberedPoints.forEach((p) => {
          const pxX = (p.x / 100) * img.naturalWidth;
          const pxY = (p.y / 100) * img.naturalHeight;

          // Draw outer stroke circle
          ctx.beginPath();
          ctx.arc(pxX, pxY, radius, 0, 2 * Math.PI);
          ctx.fillStyle = '#468DFF'; // Principal brand blue
          ctx.fill();
          
          ctx.lineWidth = Math.max(2, radius * 0.15);
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();

          // Draw number text
          ctx.fillStyle = '#FFFFFF';
          const fontSize = Math.round(radius * 1.1);
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.number.toString(), pxX, pxY);
        });

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onSave(currentNumberedPoints, dataUrl);
        onClose();
      } catch (err) {
        console.error('Error drawing markers on canvas:', err);
      } finally {
        setLoading(false);
      }
    };
    img.onerror = () => {
      console.error('Failed to load image for canvas editor');
      setLoading(false);
    };
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="relative w-full max-w-4xl p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl animate-scale-up focus:outline-none flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4 shrink-0">
              <Dialog.Title className="font-outfit text-base font-extrabold text-slate-800">
                Identificar Puntos de Medición en Evidencia
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border-none bg-transparent cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>

            <Dialog.Description className="text-xs text-slate-500 leading-tight mb-3 shrink-0">
              Hacé clic en cualquier parte de la imagen para posicionar un punto de medición numerado secuencialmente.
            </Dialog.Description>

            {/* Area de edición de la imagen */}
            <div className="flex-grow overflow-auto bg-slate-100/60 rounded-xl p-4 flex items-center justify-center min-h-[300px] relative select-none">
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-[#468DFF]" />
                  <span className="text-xs font-bold text-slate-600">Guardando cambios...</span>
                </div>
              ) : (
                <div 
                  ref={containerRef}
                  onClick={handleImageClick}
                  className="relative cursor-crosshair max-w-full max-h-[50vh] overflow-hidden rounded-lg shadow-sm"
                >
                  <img 
                    src={imageUrl} 
                    alt="Evidencia a editar" 
                    className="max-w-full max-h-[50vh] object-contain pointer-events-none block"
                  />
                  {/* Puntos de medición */}
                  {currentNumberedPoints.map((p, idx) => (
                    <div
                      key={p.createdAt ? `pt-${p.createdAt}` : `pt-idx-${idx}`}
                      style={{
                        position: 'absolute',
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="w-7 h-7 bg-[#468DFF] rounded-full border-2 border-white text-white font-extrabold text-xs flex items-center justify-center shadow-md select-none pointer-events-none"
                    >
                      {p.number || (idx + 1)}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acciones de edición */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-4 pt-3 border-t border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <AppButton
                  variant="secondary"
                  disabled={points.length === 0 || loading}
                  onClick={handleUndo}
                  className="text-xs py-1.5 h-[34px] flex items-center gap-1.5"
                >
                  Deshacer último
                </AppButton>
                <AppButton
                  variant="outline"
                  disabled={points.length === 0 || loading}
                  onClick={handleClear}
                  className="text-xs py-1.5 h-[34px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                >
                  Limpiar todo
                </AppButton>
              </div>

              <div className="flex items-center gap-2">
                <AppButton
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="text-xs py-1.5 h-[34px] hover:bg-slate-100 hover:text-slate-900"
                >
                  Cancelar
                </AppButton>
                <AppButton
                  variant="primary"
                  onClick={handleSave}
                  disabled={loading}
                  className="text-xs py-1.5 h-[34px]"
                >
                  Guardar marcadores
                </AppButton>
              </div>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Helpers de procesamiento de imágenes asíncronos y evasión de CSP
const dataURLtoBlob = (dataUrl) => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const bakeImageWithMarkers = (imageUrl, markers) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const minDim = Math.min(img.naturalWidth, img.naturalHeight);
        const radius = Math.max(16, minDim * 0.02);
        
        markers.forEach((p) => {
          const pxX = (p.x / 100) * img.naturalWidth;
          const pxY = (p.y / 100) * img.naturalHeight;

          ctx.beginPath();
          ctx.arc(pxX, pxY, radius, 0, 2 * Math.PI);
          ctx.fillStyle = '#468DFF';
          ctx.fill();
          
          ctx.lineWidth = Math.max(2, radius * 0.15);
          ctx.strokeStyle = '#FFFFFF';
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          const fontSize = Math.round(radius * 1.1);
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.number.toString(), pxX, pxY);
        });

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        console.error('Error in bakeImageWithMarkers:', err);
        resolve(null);
      }
    };
    img.onerror = () => {
      resolve(null);
    };
  });
};
