// src/app/[tenant-slug]/protocolos/iluminacion/components/ProtocoloForm.js
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/providers/ToastProvider';
import AppButton from '@/components/ui/AppButton';
import AppInput from '@/components/ui/AppInput';
import AppSelect from '@/components/ui/AppSelect';
import AppCard from '@/components/ui/AppCard';
import AppTextarea from '@/components/ui/AppTextarea';
import AppLabel from '@/components/ui/AppLabel';
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
import Tabla1Modal from './Tabla1Modal';
import MetodoCuadriculaModal from './MetodoCuadriculaModal';

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

export default function ProtocoloForm({
  tenantSlug,
  profile,
  tenant,
  editingId = null,
  mode = 'create', // 'create' | 'edit' | 'view'
  onClose,
  onSaveSuccess
}) {
  const globalToast = useToast();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  
  // Tabla 1 & Método Cuadrícula Modal State
  const [isTabla1Open, setIsTabla1Open] = useState(false);
  const [targetPuntoIdForTabla1, setTargetPuntoIdForTabla1] = useState(null);
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
  const [horariosTurnosText, setHorariosTurnosText] = useState('');

  // Medicion
  const [instrumento, setInstrumento] = useState('');
  const [fechaCalibracion, setFechaCalibracion] = useState('');
  const [metodologia, setMetodologia] = useState('Guía Práctica sobre Iluminación en el Ambiente Laboral de la SRT (Método de la Cuadrícula).');
  const [fechaMedicion, setFechaMedicion] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFinalizacion, setHoraFinalizacion] = useState('');
  const [condicionesAtmosfericas, setCondicionesAtmosfericas] = useState('Medición realizada en condiciones diurnas normales, cielo despejado, iluminación artificial encendida.');
  const [documentacionAdjunta, setDocumentacionAdjunta] = useState('Certificado de calibración del luxómetro, croquis de distribución de los puntos.');
  const [observacionesGenerales, setObservacionesGenerales] = useState('');

  // Análisis
  const [conclusiones, setConclusiones] = useState('');
  const [recomendaciones, setRecomendaciones] = useState('');
  const [estado, setEstado] = useState('borrador'); // 'borrador' | 'completado' | 'anulado'

  // Sampling Points State
  const [puntos, setPuntos] = useState([]);

  // Attachments state (local files / Google Drive)
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

  // Profile Syncing Dialog State
  const [syncQueue, setSyncQueue] = useState([]);
  const [syncIndex, setSyncIndex] = useState(0);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorImageUrl, setEditorImageUrl] = useState('');
  const [editPhotoIndex, setEditPhotoIndex] = useState(null);

  const canEdit = mode !== 'view' && estado !== 'anulado';
  const isReadOnly = mode === 'view';

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

  // Calculations helper for points
  const getPuntoCalculos = useCallback((p) => {
    const largo = parseFloat(p.largo_m);
    const ancho = parseFloat(p.ancho_m);
    const altura = parseFloat(p.altura_m);
    const required = parseFloat(p.valor_requerido_legal_lux);

    let indice_local = null;
    let indice_local_corregido = null;
    let numero_minimo_puntos_medicion = null;

    if (largo > 0 && ancho > 0 && altura > 0) {
      indice_local = (largo * ancho) / (altura * (largo + ancho));
      indice_local_corregido = indice_local >= 3 ? 4 : Math.ceil(indice_local);
      numero_minimo_puntos_medicion = Math.pow(indice_local_corregido + 2, 2);
    }

    const validMediciones = p.mediciones
      .map(m => parseFloat(m.valor_lux))
      .filter(val => !isNaN(val) && val >= 0);

    let iluminancia_media = null;
    let iluminancia_minima = null;
    let uniformidad_requerida = null;
    let verificacion_uniformidad = 'Sin evaluar';
    let verificacion_legal = 'Sin evaluar';
    let resultado_punto = 'Sin evaluar';

    const count = validMediciones.length;

    if (count > 0) {
      const suma = validMediciones.reduce((a, b) => a + b, 0);
      iluminancia_media = suma / count;
      iluminancia_minima = Math.min(...validMediciones);
      uniformidad_requerida = iluminancia_media / 2;

      if (p.aplicaVerificacionUniformidad) {
        verificacion_uniformidad = iluminancia_minima >= uniformidad_requerida ? 'Cumple' : 'No cumple';
      } else {
        verificacion_uniformidad = 'No aplica';
      }

      if (!isNaN(required) && required > 0) {
        verificacion_legal = iluminancia_media >= required ? 'Cumple' : 'No cumple';
      }

      const isLegalOk = verificacion_legal === 'Cumple';
      const isUniformityOk = !p.aplicaVerificacionUniformidad || verificacion_uniformidad === 'Cumple';

      if (verificacion_legal === 'No cumple' || (p.aplicaVerificacionUniformidad && verificacion_uniformidad === 'No cumple')) {
        resultado_punto = 'No cumple';
      } else if (verificacion_legal === 'Cumple' && isUniformityOk) {
        resultado_punto = 'Cumple';
      } else {
        resultado_punto = 'Parcial';
      }
    }

    return {
      indice_local: indice_local ? Number(indice_local.toFixed(2)) : null,
      indice_local_corregido,
      numero_minimo_puntos_medicion,
      cantidad_mediciones_cargadas: count,
      iluminancia_media: iluminancia_media ? Number(iluminancia_media.toFixed(2)) : null,
      iluminancia_minima: iluminancia_minima ? Number(iluminancia_minima.toFixed(2)) : null,
      uniformidad_requerida: uniformidad_requerida ? Number(uniformidad_requerida.toFixed(2)) : null,
      verificacion_uniformidad,
      verificacion_legal,
      resultado_punto,
      valor_medido_lux: iluminancia_media ? Number(iluminancia_media.toFixed(2)) : null
    };
  }, []);

  // Calculate Overall Protocol Result
  const getResultadoGeneral = useCallback(() => {
    if (puntos.length === 0) return 'Sin evaluar';
    const calculados = puntos.map(p => getPuntoCalculos(p));
    if (calculados.some(c => c.resultado_punto === 'No cumple')) return 'No cumple';
    if (calculados.some(c => c.resultado_punto === 'Parcial' || c.resultado_punto === 'Sin evaluar')) return 'Parcial';
    return 'Cumple';
  }, [puntos, getPuntoCalculos]);

  // Load companies & establishments lookups
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let emps = [];
        let ests = [];

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
          await loadExistingRecord(session);
        } else {
          // Initialize with 1 default sampling point
          setPuntos([createNewPunto(1)]);
          setLoading(false);
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
  const loadExistingRecord = async (session) => {
    try {
      if (!session) {
        // Dev Mock Record
        setLoading(false);
        return;
      }

      // 1. Principal
      const { data: proto, error: prErr } = await supabase
        .from('protocolos_iluminacion')
        .select('*')
        .eq('id', editingId)
        .single();
      if (prErr) throw prErr;

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
      setCondicionesAtmosfericas(proto.condiciones_atmosfericas || '');
      setDocumentacionAdjunta(proto.documentacion_adjunta || '');
      setObservacionesGenerales(proto.observaciones || '');
      setConclusiones(proto.conclusiones || '');
      setRecomendaciones(proto.recomendaciones || '');
      setEstado(proto.estado || 'borrador');
      setProfesionalNombre(proto.profesional_nombre || '');
      setProfesionalMatricula(proto.profesional_matricula || '');
      setFirmaTipo(proto.firma_tipo || 'perfil');
      if (proto.firma_profesional) {
        setFirmaProfSavedUrl(proto.firma_profesional);
      }

      // Cargar sectores del establecimiento seleccionado
      if (proto.establecimiento_id) {
        const activeEst = allEstablecimientos.find(e => e.id === proto.establecimiento_id);
        if (activeEst) {
          setEstSectoresLocal(activeEst.sectores || []);
        }
      }

      // 2. Puntos y mediciones
      const { data: ptsData, error: ptsErr } = await supabase
        .from('protocolos_iluminacion_puntos')
        .select('*, mediciones:protocolos_iluminacion_mediciones(*)')
        .eq('protocolo_id', editingId)
        .order('orden');
      if (ptsErr) throw ptsErr;

      const loadedPuntos = (ptsData || []).map(p => ({
        id: p.id,
        orden: p.orden,
        punto_muestreo: p.punto_muestreo,
        sector_id: p.sector_id || '',
        sector_text: p.sector_text || '',
        largo_m: p.largo_m !== null ? String(p.largo_m) : '',
        ancho_m: p.ancho_m !== null ? String(p.ancho_m) : '',
        altura_m: p.altura_m !== null ? String(p.altura_m) : '',
        puesto_id: p.puesto_id || '',
        puesto_text: p.puesto_text || '',
        tipo_iluminacion: p.tipo_iluminacion || 'Artificial',
        tipo_fuente_luminica: p.tipo_fuente_luminica || 'Led',
        iluminacion: p.iluminacion || 'General',
        valor_requerido_legal_lux: p.valor_requerido_legal_lux !== null ? String(p.valor_requerido_legal_lux) : '',
        observaciones_punto: p.observaciones_punto || '',
        aplicaVerificacionUniformidad: p.verificacion_uniformidad !== 'No aplica',
        isCollapsed: true,
        mediciones: (p.mediciones || []).map(m => ({ id: m.id, valor_lux: String(m.valor_lux) }))
      }));

      setPuntos(loadedPuntos.length > 0 ? loadedPuntos : [createNewPunto(1)]);

      // 3. Adjuntos
      const { data: adjData, error: adjErr } = await supabase
        .from('protocolos_iluminacion_adjuntos')
        .select('*')
        .eq('protocolo_id', editingId);
      if (adjErr) throw adjErr;

      // Generar URL firmadas si los archivos no son urls completas
      const pathsToSign = (adjData || []).map(ad => ad.storage_path).filter(p => !p.startsWith('http'));
      let signedUrlsMap = {};

      if (pathsToSign.length > 0) {
        const { data: signedData } = await supabase.storage
          .from('protocolos-iluminacion')
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
        preview: ad.storage_path.startsWith('http') ? ad.storage_path : (signedUrlsMap[ad.storage_path] || '')
      })));

      setLoading(false);
    } catch (err) {
      console.error('Error al cargar registro existente:', err);
      globalToast.toast('Error al recuperar los datos del protocolo.', 'error');
      setLoading(false);
    }
  };

  const createNewPunto = (num) => ({
    id: 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    orden: num,
    punto_muestreo: num,
    sector_id: '',
    sector_text: '',
    largo_m: '',
    ancho_m: '',
    altura_m: '',
    puesto_id: '',
    puesto_text: '',
    tipo_iluminacion: 'Artificial',
    tipo_fuente_luminica: 'Led',
    iluminacion: 'General',
    mediciones: [
      { id: 'm-' + Date.now() + '-1', valor_lux: '' }
    ],
    valor_requerido_legal_lux: '',
    observaciones_punto: '',
    aplicaVerificacionUniformidad: true,
    isCollapsed: false,
    selectedActividadIndex: ''
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
    const nextNum = puntos.length > 0 ? Math.max(...puntos.map(p => p.punto_muestreo)) + 1 : 1;
    setPuntos([...puntos, {
      ...p,
      id: 'temp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      punto_muestreo: nextNum,
      orden: puntos.length + 1,
      isCollapsed: false,
      mediciones: p.mediciones.map((m, idx) => ({ id: 'm-' + Date.now() + '-' + idx, valor_lux: m.valor_lux }))
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

  // Upload attachment file
  const handleUploadFile = async (file, type) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado.');

      const fileExt = file.name.split('.').pop();
      const uuid = editingId || crypto.randomUUID();
      const filename = `${user.id}/${uuid}/adjuntos/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

      // Upload to private bucket
      const { error } = await supabase.storage
        .from('protocolos-iluminacion')
        .upload(filename, file, { cacheControl: '3600', upsert: true });
      if (error) throw error;

      // Get signed URL preview
      const { data: sData } = await supabase.storage
        .from('protocolos-iluminacion')
        .createSignedUrl(filename, 3600);

      const newAdjunto = {
        id: 'adj-' + Date.now(),
        tipo: type,
        name: file.name,
        path: filename,
        preview: sData?.signedUrl || ''
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
      preview: urlStr
    };
    setAdjuntos(prev => [...prev, newAdj]);
    globalToast.toast('Enlace de Google Drive registrado con éxito.', 'success');
  };

  const handleDeleteAdjunto = (id) => {
    setAdjuntos(prev => prev.filter(ad => ad.id !== id));
  };

  const handleSaveEditedPhoto = async (dataUrl) => {
    try {
      const planoFotosAdjuntos = adjuntos.filter(a => a.tipo === 'Evidencia Fotográfica Plano' || a.tipo === 'Foto Plano');
      const targetPhoto = planoFotosAdjuntos[editPhotoIndex];
      if (!targetPhoto) return;

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `puntos_medicion_${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Eliminar el adjunto anterior
      setAdjuntos(prev => prev.filter(ad => ad.id !== targetPhoto.id));

      // Subir el nuevo adjunto modificado
      await handleUploadFile(file, 'Evidencia Fotográfica Plano');
    } catch (err) {
      console.error('Error al guardar la foto editada:', err);
      globalToast.toast('Error al guardar los marcadores en la imagen.', 'error');
    }
  };

  // SUBMIT FLOW - PROFILE SYNC WIZARD
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    if (!empresaId || !establecimientoId || !fechaMedicion) {
      globalToast.toast('Complete la Razón Social, Establecimiento y Fecha de Medición.', 'error');
      return;
    }

    if (!instrumento.trim()) {
      globalToast.toast('Ingrese el instrumento utilizado en la medición.', 'error');
      return;
    }

    // Validaciones para guardado como COMPLETADO
    if (estado === 'completado') {
      if (!fechaCalibracion || !metodologia.trim()) {
        globalToast.toast('Para completar el protocolo es obligatorio cargar la fecha de calibración y la metodología.', 'error');
        return;
      }

      if (puntos.length === 0) {
        globalToast.toast('Debe cargar al menos un punto de muestreo.', 'error');
        return;
      }

      for (let i = 0; i < puntos.length; i++) {
        const p = puntos[i];
        if (!p.sector_text.trim()) {
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
        if (generalRes === 'No cumple' && (!conclusiones.trim() || !recomendaciones.trim())) {
          globalToast.toast('Al detectarse puntos que NO CUMPLEN, es obligatorio completar las Conclusiones y Recomendaciones.', 'error');
          return;
        }
      }
    }

    // WIZARD: Escaneo de perfiles para sincronización
    const queue = [];
    const localSectors = JSON.parse(JSON.stringify(estSectoresLocal));

    puntos.forEach(p => {
      const sectorName = p.sector_text.trim();
      const puestoName = p.puesto_text.trim();
      const largo = parseFloat(p.largo_m);
      const ancho = parseFloat(p.ancho_m);
      const altura = parseFloat(p.altura_m);

      if (!sectorName) return;

      // 1. Validar si el sector ya existe en el perfil (búsqueda insensible a mayúsculas)
      let sectorIdx = localSectors.findIndex(s => s.denominacion.toLowerCase() === sectorName.toLowerCase());

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
          const puestoExists = dbPuestos.some(pst => pst.denominacion.toLowerCase() === puestoName.toLowerCase());

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
  };

  // Handle Wizard action buttons
  const handleSyncConfirm = async (action) => {
    const currentItem = syncQueue[syncIndex];
    let updatedSectors = [...estSectoresLocal];

    if (action === 'save_profile') {
      if (currentItem.type === 'new_sector') {
        const newSec = {
          id: 'sec-' + Date.now() + Math.random().toString(36).substr(2, 5),
          denominacion: currentItem.sectorName,
          descripcion: '',
          largo: currentItem.largo || '',
          ancho: currentItem.ancho || '',
          altura: currentItem.altura || '',
          puestos: currentItem.puestoName ? [{
            id: 'pst-' + Date.now(),
            denominacion: currentItem.puestoName,
            descripcion: ''
          }] : []
        };
        updatedSectors.push(newSec);
      } else if (currentItem.type === 'modify_dimensions') {
        updatedSectors[currentItem.sectorIndex] = {
          ...updatedSectors[currentItem.sectorIndex],
          largo: currentItem.largo,
          ancho: currentItem.ancho,
          altura: currentItem.altura
        };
      } else if (currentItem.type === 'new_puesto') {
        const puestos = [...(updatedSectors[currentItem.sectorIndex].puestos || [])];
        puestos.push({
          id: 'pst-' + Date.now(),
          denominacion: currentItem.puestoName,
          descripcion: ''
        });
        updatedSectors[currentItem.sectorIndex] = {
          ...updatedSectors[currentItem.sectorIndex],
          puestos
        };
      }
      setEstSectoresLocal(updatedSectors);
    }

    // Avanzar el wizard
    const nextIdx = syncIndex + 1;
    if (nextIdx < syncQueue.length) {
      setSyncIndex(nextIdx);
    } else {
      // Fin del wizard, cerrar modal y proceder a guardar
      setIsSyncOpen(false);
      await executeSave(updatedSectors);
    }
  };

  // FINAL SAVE DATABASE WRITER
  const executeSave = async (sectorsToSave) => {
    setSaveLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user && !isDevMode) throw new Error('No autorizado');

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
        finalFirmaProf = firmaPerfilPreviewUrl || signaturePath || '';
      } else if (firmaTipo === 'mano' && firmaProfCanvasRef.current && hasSignedProf) {
        finalFirmaProf = firmaProfCanvasRef.current.toDataURL('image/png');
      }

      const payloadProto = {
        id: tempId,
        tenant_id: tenant.id,
        user_id: user?.id || 'mock-user-id',
        organization_id: tenant.id,
        razon_social_id: empresaId || null,
        establecimiento_id: establecimientoId || null,
        razon_social_text: razonSocialText,
        cuit_text: cuitText,
        establecimiento_text: establecimientoText,
        direccion_text: direccionText,
        provincia_text: provinciaText,
        localidad_text: localidadText,
        cp_text: cpText,
        horarios_turnos_text: horariosTurnosText,
        instrumento_marca_modelo_serie: instrumento,
        fecha_calibracion: convertToDbDate(fechaCalibracion) || null,
        metodologia_utilizada: metodologia,
        fecha_medicion: convertToDbDate(fechaMedicion) || null,
        hora_inicio: horaInicio || null,
        hora_finalizacion: horaFinalizacion || null,
        condiciones_atmosfericas: condicionesAtmosfericas,
        documentacion_adjunta: documentacionAdjunta,
        observaciones: observacionesGenerales || null,
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
        globalToast.toast('Protocolo de Iluminación guardado con éxito (Mock).', 'success');
        onSaveSuccess();
        return;
      }

      if (editingId) {
        payloadProto.updated_by = user.id;
        const { error: prErr } = await supabase
          .from('protocolos_iluminacion')
          .update(payloadProto)
          .eq('id', editingId);
        if (prErr) throw prErr;
      } else {
        payloadProto.created_by = user.id;
        payloadProto.created_at = new Date().toISOString();
        const { error: prErr } = await supabase
          .from('protocolos_iluminacion')
          .insert([payloadProto]);
        if (prErr) throw prErr;
      }

      // 2. Guardar Puntos de Muestreo (Cascade delete old ones first if editing)
      if (editingId) {
        const { error: delErr } = await supabase
          .from('protocolos_iluminacion_puntos')
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
          sector_id: p.sector_id || null,
          sector_text: p.sector_text || null,
          largo_m: parseFloat(p.largo_m) || null,
          ancho_m: parseFloat(p.ancho_m) || null,
          altura_m: parseFloat(p.altura_m) || null,
          puesto_id: p.puesto_id || null,
          puesto_text: p.puesto_text || null,
          tipo_iluminacion: p.tipo_iluminacion,
          tipo_fuente_luminica: p.tipo_fuente_luminica,
          iluminacion: p.iluminacion,
          indice_local: cal.indice_local,
          indice_local_corregido: cal.indice_local_corregido,
          numero_minimo_puntos_medicion: cal.numero_minimo_puntos_medicion,
          cantidad_mediciones_cargadas: cal.cantidad_mediciones_cargadas,
          iluminancia_media: cal.iluminancia_media,
          iluminancia_minima: cal.iluminancia_minima,
          uniformidad_requerida: cal.uniformidad_requerida,
          valor_uniformidad_iluminancia: cal.uniformidad_requerida,
          valor_medido_lux: cal.valor_medido_lux,
          valor_requerido_legal_lux: parseFloat(p.valor_requerido_legal_lux) || null,
          verificacion_uniformidad: cal.verificacion_uniformidad,
          verificacion_legal: cal.verificacion_legal,
          resultado_punto: cal.resultado_punto,
          observaciones_punto: p.observaciones_punto || null
        };
      });

      const { data: insertedPoints, error: ptsErr } = await supabase
        .from('protocolos_iluminacion_puntos')
        .select()
        .insert(pointsPayload);
      if (ptsErr) throw ptsErr;

      // 3. Guardar Mediciones
      const medicionesPayload = [];
      insertedPoints.forEach(dbPunto => {
        // Encontrar punto local correspondiente por orden correlativo
        const localP = puntos.find(lp => lp.punto_muestreo === dbPunto.punto_muestreo);
        if (localP) {
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

      if (medicionesPayload.length > 0) {
        const { error: medErr } = await supabase
          .from('protocolos_iluminacion_mediciones')
          .insert(medicionesPayload);
        if (medErr) throw medErr;
      }

      // 4. Guardar Adjuntos
      if (editingId) {
        const { error: delAdjErr } = await supabase
          .from('protocolos_iluminacion_adjuntos')
          .delete()
          .eq('protocolo_id', editingId);
        if (delAdjErr) throw delAdjErr;
      }

      if (adjuntos.length > 0) {
        const adjPayload = adjuntos.map(ad => ({
          protocolo_id: tempId,
          tipo: ad.tipo,
          nombre_archivo: ad.name,
          storage_path: ad.path,
          public_url: ad.preview,
          created_by: user.id
        }));

        const { error: insAdjErr } = await supabase
          .from('protocolos_iluminacion_adjuntos')
          .insert(adjPayload);
        if (insAdjErr) throw insAdjErr;
      }

      globalToast.toast('Protocolo de Iluminación guardado correctamente.', 'success');
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
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col max-h-[85vh] animate-fade-in w-full">
      {/* Cabecera del Formulario */}
      <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-outfit text-base font-bold text-slate-900">
            {mode === 'create' ? 'Nuevo Protocolo de Iluminación' : mode === 'edit' ? 'Editar Protocolo de Iluminación' : 'Detalle de Protocolo de Iluminación'}
          </span>
          <button
            type="button"
            onClick={() => setIsMetodoCuadriculaOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#468DFF] hover:bg-[#468DFF] hover:text-white border border-blue-200 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ml-1.5"
            title="Ver explicativo del Método de la Cuadrícula (Res. SRT 84/12 & Dec. 351/79)"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Método de Cuadrícula (Res. 84/12)</span>
            <span className="sm:hidden text-[10px]">Método Cuadrícula</span>
          </button>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
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
              <AppLabel htmlFor="empresaId">Razón Social</AppLabel>
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
              <AppLabel htmlFor="establecimientoId">Establecimiento</AppLabel>
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
              <div className="flex flex-col gap-1 md:col-span-3">
                <AppLabel htmlFor="horariosTurnosText">Horarios / Turnos Habituales de Trabajo</AppLabel>
                <AppInput 
                  id="horariosTurnosText"
                  disabled={isReadOnly || (!!establecimientoId && estHasHorarios)} 
                  value={horariosTurnosText} 
                  onChange={(e) => setHorariosTurnosText(e.target.value)}
                  placeholder="Horarios y turnos de trabajo"
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
              <AppLabel htmlFor="instrumento" className="min-h-[2.5rem] flex items-center mb-1">
                Marca, modelo y N° de serie del instrumento
              </AppLabel>
              <AppInput
                id="instrumento"
                disabled={!canEdit}
                value={instrumento}
                onChange={(e) => setInstrumento(e.target.value)}
                placeholder="Ej: Luxómetro LUTRON LX-101 N/S 12345"
              />
            </div>

            <div className="flex flex-col gap-1 relative md:col-span-1">
              <AppLabel htmlFor="fechaCalibracion" className="min-h-[2.5rem] flex items-center mb-1">
                Fecha de Calibración del Instrumental
              </AppLabel>
              <div className="relative">
                <AppInput
                  id="fechaCalibracion"
                  disabled={!canEdit}
                  placeholder="DD/MM/AAAA"
                  value={fechaCalibracion}
                  onChange={(e) => setFechaCalibracion(formatAsDateInput(e.target.value))}
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
                            setFechaCalibracion(`${parts[2]}/${parts[1]}/${parts[0]}`);
                          }
                        } else {
                          setFechaCalibracion('');
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

            <div className="flex flex-col gap-1 col-span-full">
              <div className="flex items-center justify-between">
                <AppLabel htmlFor="metodologia">Metodología Utilizada en la Medición</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={metodologia}
                  onChange={setMetodologia}
                  context="Metodología técnica para medición de iluminancia laboral usando el luxómetro y grilla SRT"
                />
              </div>
              <AppTextarea
                id="metodologia"
                disabled={!canEdit}
                rows={3}
                value={metodologia}
                onChange={(e) => setMetodologia(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 col-span-full">
              <div className="flex flex-col gap-1">
                <AppLabel htmlFor="fechaMedicion">Fecha Medición</AppLabel>
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

            <div className="flex flex-col gap-1 col-span-full">
              <div className="flex items-center justify-between">
                <AppLabel htmlFor="condicionesAtmosfericas">Condiciones Atmosféricas</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={condicionesAtmosfericas}
                  onChange={setCondicionesAtmosfericas}
                  context="Detalle del estado del tiempo, cielo despejado/nublado, y luces activas en local cerrado o exterior"
                />
              </div>
              <AppTextarea
                id="condicionesAtmosfericas"
                disabled={!canEdit}
                rows={2}
                value={condicionesAtmosfericas}
                onChange={(e) => setCondicionesAtmosfericas(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1 col-span-full">
              <div className="flex items-center justify-between">
                <AppLabel htmlFor="documentacionAdjunta">Documentación que se Adjuntará</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={documentacionAdjunta}
                  onChange={setDocumentacionAdjunta}
                  context="Listado de anexos técnicos del protocolo de iluminación"
                />
              </div>
              <AppTextarea
                id="documentacionAdjunta"
                disabled={!canEdit}
                rows={2}
                value={documentacionAdjunta}
                onChange={(e) => setDocumentacionAdjunta(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1 col-span-full">
              <div className="flex items-center justify-between">
                <AppLabel htmlFor="observacionesGenerales">Observaciones Generales de la Medición</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={observacionesGenerales}
                  onChange={setObservacionesGenerales}
                  context="Observaciones generales sobre la instalación luminaria o del ambiente de trabajo"
                />
              </div>
              <AppTextarea
                id="observacionesGenerales"
                disabled={!canEdit}
                rows={2}
                value={observacionesGenerales}
                onChange={(e) => setObservacionesGenerales(e.target.value)}
                placeholder="Observaciones generales..."
              />
            </div>
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
                          <AppLabel htmlFor={`sector-sel-${p.id}`}>Sector</AppLabel>
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

                      {/* Fila 2A: Geometría (Largo, Ancho, Altura en una misma fila) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col gap-1">
                          <AppLabel htmlFor={`largo-${p.id}`}>Largo (m)</AppLabel>
                          <AppInput
                            id={`largo-${p.id}`}
                            disabled={!canEdit}
                            type="number"
                            step="0.01"
                            placeholder="Ej: 6.00"
                            value={p.largo_m}
                            onChange={(e) => handlePuntoGeometriaChange(p.id, 'largo_m', e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <AppLabel htmlFor={`ancho-${p.id}`}>Ancho (m)</AppLabel>
                          <AppInput
                            id={`ancho-${p.id}`}
                            disabled={!canEdit}
                            type="number"
                            step="0.01"
                            placeholder="Ej: 4.00"
                            value={p.ancho_m}
                            onChange={(e) => handlePuntoGeometriaChange(p.id, 'ancho_m', e.target.value)}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <AppLabel htmlFor={`altura-${p.id}`}>Altura (m)</AppLabel>
                          <AppInput
                            id={`altura-${p.id}`}
                            disabled={!canEdit}
                            type="number"
                            step="0.01"
                            placeholder="Ej: 2.50"
                            value={p.altura_m}
                            onChange={(e) => handlePuntoGeometriaChange(p.id, 'altura_m', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Fila 2B (Debajo): Tipo de Iluminación, Tipo de Fuente, Iluminación (Distribución) y Check Uniformidad */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex flex-col gap-1">
                          <AppLabel htmlFor={`tipo-ilu-${p.id}`}>Tipo de iluminación</AppLabel>
                          {isReadOnly ? (
                            <AppInput id={`tipo-ilu-${p.id}`} disabled value={p.tipo_iluminacion} />
                          ) : (
                            <AppSelect
                              id={`tipo-ilu-${p.id}`}
                              placeholder={null}
                              disabled={!canEdit}
                              value={p.tipo_iluminacion}
                              onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, tipo_iluminacion: e.target.value } : x))}
                            >
                              <option value="Natural">Natural</option>
                              <option value="Artificial">Artificial</option>
                              <option value="Mixta">Mixta</option>
                            </AppSelect>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <AppLabel htmlFor={`fuente-${p.id}`}>Tipo de fuente</AppLabel>
                          {isReadOnly ? (
                            <AppInput id={`fuente-${p.id}`} disabled value={p.tipo_fuente_luminica} />
                          ) : (
                            <AppSelect
                              id={`fuente-${p.id}`}
                              placeholder={null}
                              disabled={!canEdit}
                              value={p.tipo_fuente_luminica}
                              onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, tipo_fuente_luminica: e.target.value } : x))}
                            >
                              <option value="Incandescente">Incandescente</option>
                              <option value="Descarga">Descarga</option>
                              <option value="Mixta">Mixta</option>
                              <option value="Led">Led</option>
                            </AppSelect>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <AppLabel htmlFor={`distribucion-${p.id}`}>Iluminación (Distribución)</AppLabel>
                          {isReadOnly ? (
                            <AppInput id={`distribucion-${p.id}`} disabled value={p.iluminacion} />
                          ) : (
                            <AppSelect
                              id={`distribucion-${p.id}`}
                              placeholder={null}
                              disabled={!canEdit}
                              value={p.iluminacion}
                              onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, iluminacion: e.target.value } : x))}
                            >
                              <option value="General">General</option>
                              <option value="Localizada">Localizada</option>
                              <option value="Mixta">Mixta</option>
                            </AppSelect>
                          )}
                        </div>

                        <div className="flex flex-col gap-0.5 justify-center pb-1 col-span-full lg:col-span-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              id={`uniformidad-check-${p.id}`}
                              disabled={!canEdit}
                              checked={p.aplicaVerificacionUniformidad}
                              onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, aplicaVerificacionUniformidad: e.target.checked } : x))}
                              className="rounded text-[#468DFF] focus:ring-[#468DFF] cursor-pointer h-4 w-4 shrink-0"
                            />
                            <label htmlFor={`uniformidad-check-${p.id}`} className="text-[11px] font-semibold text-slate-700 cursor-pointer leading-tight">
                              Aplica verificación de uniformidad (E_mín ≥ E_media / 2)
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsMetodoCuadriculaOpen(true)}
                              className="text-slate-400 hover:text-[#468DFF] transition-colors p-0.5 shrink-0"
                              title="Aplica cuando la iluminación es General o se evalúa por el Método de Cuadrícula (Res. SRT 84/12 & Dec. 351/79). Clic para ver criterio."
                            >
                              <HelpCircle className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium pl-5">
                            *Aplica en iluminación general o recinto evaluado por cuadrícula.
                          </span>
                        </div>
                      </div>

                      {/* Fila 3: Criterio Legal (Anexo IV Dec. 351/79) */}
                      <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                              Valor requerido legalmente Según Anexo IV Dec. 351/79
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetPuntoIdForTabla1(p.id);
                                setIsTabla1Open(true);
                              }}
                              className="text-[#468DFF] hover:text-[#0511F2] transition-colors p-1 rounded-full hover:bg-blue-50 flex items-center gap-1 font-bold text-xs"
                              title="Ver TABLA 1 - Intensidad Media de Iluminación para Diversas Clases de Tarea Visual"
                            >
                              <HelpCircle className="h-4 w-4" />
                              <span className="underline text-[11px]">Ver Tabla 1</span>
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Basado en Norma IRAM-AADL J 20-06
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2 flex flex-col gap-1">
                            <AppLabel htmlFor={`requerido-sel-${p.id}`} className="min-h-[2.5rem] flex items-center mb-1 text-[10px] text-slate-500 font-semibold">
                              TABLA 2 - Intensidad mínima de iluminación (Seleccionar opción)
                            </AppLabel>
                            <AppSelect
                              id={`requerido-sel-${p.id}`}
                              placeholder={null}
                              disabled={!canEdit}
                              value={p.selectedTabla2Index !== undefined ? p.selectedTabla2Index : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val !== '') {
                                  const item = TABLA_2_ILUMINACION[val];
                                  if (item) {
                                    setPuntos(puntos.map(x => x.id === p.id ? {
                                      ...x,
                                      selectedTabla2Index: val,
                                      valor_requerido_legal_lux: String(item.lux)
                                    } : x));
                                  }
                                } else {
                                  setPuntos(puntos.map(x => x.id === p.id ? { ...x, selectedTabla2Index: '' } : x));
                                }
                              }}
                            >
                              <option value="">Seleccione Tipo de edificio, local y tarea visual...</option>
                              {TABLA_2_ILUMINACION.map((item, t2Idx) => (
                                <option key={t2Idx} value={t2Idx}>
                                  {item.grupo} {item.subtitulo ? `(${item.subtitulo})` : ''} - {item.tarea}: {item.lux} lux
                                </option>
                              ))}
                            </AppSelect>
                          </div>

                          <div className="md:col-span-1 flex flex-col gap-1">
                            <AppLabel htmlFor={`requerido-manual-${p.id}`} className="min-h-[2.5rem] flex items-center mb-1 text-[10px] text-slate-500 font-semibold">
                              Valor mínimo de servicio de iluminación (lux)
                            </AppLabel>
                            <AppInput
                              id={`requerido-manual-${p.id}`}
                              type="number"
                              disabled={!canEdit}
                              placeholder="Ej: 500"
                              value={p.valor_requerido_legal_lux}
                              onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? {
                                ...x,
                                valor_requerido_legal_lux: e.target.value
                              } : x))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Fila 4: Mediciones Lux Obtenidas */}
                      <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <AppLabel htmlFor={`medicion-${p.id}-0`} className="mb-0 font-bold text-slate-800 text-xs">
                              Mediciones de Lux Obtenidas
                            </AppLabel>
                            {cal.numero_minimo_puntos_medicion !== null && (
                              <p className="text-[11px] text-[#468DFF] font-semibold">
                                Requerido por norma (Índice Local x={cal.indice_local_corregido}): {cal.numero_minimo_puntos_medicion}
                              </p>
                            )}
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleAddMedicion(p.id)}
                              className="text-[11px] text-[#468DFF] hover:underline font-bold flex items-center gap-1"
                            >
                              <Plus className="h-3.5 w-3.5" /> Agregar Medición Extra
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 pt-1">
                          {p.mediciones.map((m, mIdx) => (
                            <div key={m.id} className="relative flex flex-col gap-0.5">
                              <span className="text-[9px] font-bold text-slate-600 uppercase text-center">
                                Val #{mIdx + 1}
                              </span>
                              <div className="relative flex items-center">
                                <AppInput
                                  id={`medicion-${p.id}-${mIdx}`}
                                  disabled={!canEdit}
                                  type="text"
                                  className="pr-6 text-center text-xs h-8 font-semibold"
                                  placeholder="lux"
                                  value={m.valor_lux}
                                  onChange={(e) => handleMedicionValueChange(p.id, m.id, e.target.value)}
                                />
                                {canEdit && p.mediciones.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMedicion(p.id, m.id)}
                                    className="absolute right-1 text-slate-300 hover:text-red-500 p-0.5"
                                    title="Eliminar esta medición"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                        {/* RESULTADOS CALCULADOS */}
                        {cal.cantidad_mediciones_cargadas > 0 && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                            <h4 className="font-extrabold text-slate-700 font-outfit uppercase tracking-wider text-[10px]">Cálculos e Indicadores Técnicos</h4>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-500">
                              <div>Índice de Local (I): <span className="font-bold text-slate-800">{cal.indice_local !== null ? cal.indice_local : '-'}</span></div>
                              <div>Índice Corregido (x): <span className="font-bold text-slate-800">{cal.indice_local_corregido !== null ? cal.indice_local_corregido : '-'}</span></div>
                              <div>Puntos mínimos requeridos: <span className="font-bold text-slate-800">{cal.numero_minimo_puntos_medicion !== null ? cal.numero_minimo_puntos_medicion : '-'}</span></div>
                              <div>Muestreo suficiente: <span className={`font-bold ${cal.cantidad_mediciones_cargadas >= cal.numero_minimo_puntos_medicion ? 'text-green-600' : 'text-amber-600'}`}>
                                {cal.numero_minimo_puntos_medicion !== null ? (cal.cantidad_mediciones_cargadas >= cal.numero_minimo_puntos_medicion ? 'Sí' : 'Insuficiente') : '-'}
                              </span></div>
                            </div>
                            
                            <div className="border-t border-slate-200 pt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-slate-500">
                              <div>Iluminancia media (E_med): <span className="font-bold text-slate-800">{cal.iluminancia_media} lx</span></div>
                              <div>Iluminancia mínima (E_mín): <span className="font-bold text-slate-800">{cal.iluminancia_minima} lx</span></div>
                              <div>Límite Uniformidad (E_med/2): <span className="font-bold text-slate-800">{cal.uniformidad_requerida} lx</span></div>
                              <div>Uniformidad: <span className={`font-bold ${cal.verificacion_uniformidad === 'Cumple' ? 'text-green-600' : cal.verificacion_uniformidad === 'No aplica' ? 'text-slate-400' : 'text-red-600'}`}>
                                {cal.verificacion_uniformidad}
                              </span></div>
                            </div>

                            <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center text-slate-600">
                              <div>Criterio Legal (Tabla 2): <span className={`font-bold ${cal.verificacion_legal === 'Cumple' ? 'text-green-600' : 'text-red-600'}`}>{cal.verificacion_legal}</span></div>
                            </div>
                          </div>
                        )}
                      </div>
                  )}
                </div>
              );
            })}
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
                  context="Conclusiones sobre el cumplimiento legal y de uniformidad de la iluminación en el ambiente de trabajo"
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
                <AppLabel htmlFor="recomendaciones">Recomendaciones preventivas recomendadas</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={recomendaciones}
                  onChange={setRecommendations => setRecomendaciones(setRecommendations)}
                  context="Recomendaciones preventivas recomendadas para adecuar los niveles de iluminación a la legislación vigente y mejorar la ergonomía visual"
                />
              </div>
              <AppTextarea
                id="recomendaciones"
                disabled={!canEdit}
                rows={3}
                value={recomendaciones}
                onChange={(e) => setRecomendaciones(e.target.value)}
                placeholder="Ej: Reubicar puestos de trabajo, añadir luminarias localizadas, realizar limpieza del instrumental, etc."
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
          const planoDocAdjunto = adjuntos.find(a => a.tipo === 'Plano / Croquis' || a.tipo === 'Croquis/Certificado');
          const planoFotosAdjuntos = adjuntos.filter(a => a.tipo === 'Evidencia Fotográfica Plano' || a.tipo === 'Foto Plano');

          return (
            <AppCard className="p-5 md:p-6 space-y-5">
              <div className="flex items-center gap-2.5 border-b border-slate-150 pb-3">
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
                        Carga del certificado oficial de calibración del luxómetro / fotómetro utilizado.
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
                    onFileChange={(file) => {
                      if (certificadoAdjunto) {
                        handleDeleteAdjunto(certificadoAdjunto.id);
                      }
                      handleUploadFile(file, 'Certificado de Calibración');
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
                        Carga del plano digitalizado del establecimiento y evidencias fotográficas de los puntos de medición.
                      </p>
                    </div>
                  </div>

                  {/* Bloque 1: SySO-Document-Compact-Layout (PDF/Documento) */}
                  <div>
                    <DocumentUploadZone
                      label="Plano o Croquis Digitalizado (PDF / Documento)"
                      fileName={planoDocAdjunto?.name}
                      url={planoDocAdjunto?.preview}
                      signedUrl={planoDocAdjunto?.preview}
                      disabled={!canEdit}
                      accept="application/pdf,image/*"
                      maxSizeMB={15}
                      onFileChange={(file) => {
                        if (planoDocAdjunto) {
                          handleDeleteAdjunto(planoDocAdjunto.id);
                        }
                        handleUploadFile(file, 'Plano / Croquis');
                      }}
                      onDriveImport={(link) => {
                        if (planoDocAdjunto) {
                          handleDeleteAdjunto(planoDocAdjunto.id);
                        }
                        handleImportDriveLink(link, 'Plano / Croquis');
                      }}
                      onDelete={planoDocAdjunto ? () => handleDeleteAdjunto(planoDocAdjunto.id) : null}
                    />
                  </div>

                  {/* Bloque 2: SySO-Multiple-Evidence-Photo-Grid (Imágenes / Evidencias) */}
                  <div className="pt-4 border-t border-slate-200/80">
                    <ImageUploadZone
                      label="Evidencias Fotográficas / Imágenes del Plano o Puntos de Medición"
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
                      onEditPhoto={(index) => {
                        const targetPhoto = planoFotosAdjuntos[index];
                        if (targetPhoto) {
                          setEditPhotoIndex(index);
                          setEditorImageUrl(targetPhoto.preview || targetPhoto.path);
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
          <div className="flex items-center gap-2.5 border-b border-slate-150 pb-3">
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
        <div className="flex justify-between items-center pt-6 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-[#FFFFFF] text-[#468DFF] border border-[#468DFF] rounded-xl text-sm font-bold hover:bg-[#468DFF] hover:text-[#FFFFFF] hover:border-[#FFFFFF] transition-all active:scale-[0.98] cursor-pointer"
          >
            Salir
          </button>

          <div className="flex items-center gap-3">
            {canEdit && (
              <>
                <AppSelect
                  disabled={saveLoading}
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-32 text-xs py-1.5 h-[38px]"
                  placeholder={null}
                >
                  <option value="borrador">Borrador</option>
                  <option value="completado">Completado</option>
                  <option value="anulado">Anulado</option>
                </AppSelect>

                <button
                  type="submit"
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
              </>
            )}
          </div>
        </div>

      </form>
    </div>

      {/* SYNC PROFILE RADIX DIALOG */}
      <Dialog.Root open={isSyncOpen} onOpenChange={setIsSyncOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Dialog.Content className="relative w-full max-w-md p-6 bg-white border border-slate-200 rounded-2xl shadow-2xl animate-scale-up focus:outline-none space-y-4">
              <Dialog.Close asChild>
                <button 
                  className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
                  aria-label="Cerrar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Dialog.Close>

              <div className="mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center bg-blue-50 text-[#468DFF] border border-blue-100">
                <Building className="h-6 w-6 shrink-0" />
              </div>

              <div className="space-y-1.5 text-center">
                <Dialog.Title className="font-outfit text-base font-extrabold text-slate-800">
                  Sincronización del Perfil de Cliente
                </Dialog.Title>
                <Dialog.Description className="text-xs text-slate-500 leading-relaxed">
                  {syncQueue[syncIndex]?.message}
                </Dialog.Description>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSyncConfirm('save_profile')}
                  className="w-full py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#468DFF]"
                >
                  {syncQueue[syncIndex]?.type === 'modify_dimensions' 
                    ? 'Sí, actualizar perfil del cliente'
                    : 'Sí, guardar en perfil del cliente'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSyncConfirm('bypass')}
                  className="w-full py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  No, usar solo en este protocolo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSyncOpen(false);
                    setSyncQueue([]);
                  }}
                  className="w-full py-2 bg-red-50 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100 transition-all cursor-pointer text-center"
                >
                  Cancelar guardado
                </button>
              </div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog.Root>

      {/* TABLA 1 CONSULTA EMERGENTE MODAL */}
      <Tabla1Modal
        isOpen={isTabla1Open}
        onClose={() => setIsTabla1Open(false)}
        onSelectLux={(selectedLux) => {
          if (targetPuntoIdForTabla1) {
            setPuntos(puntos.map(x => x.id === targetPuntoIdForTabla1 ? {
              ...x,
              valor_requerido_legal_lux: String(selectedLux)
            } : x));
          }
        }}
      />

      {/* METODO DE LA CUADRICULA EXPLICATIVO MODAL */}
      <MetodoCuadriculaModal
        isOpen={isMetodoCuadriculaOpen}
        onClose={() => setIsMetodoCuadriculaOpen(false)}
      />

      {/* MODAL EDITOR DE PUNTOS DE MEDICION EN FOTOS */}
      <MeasurementPointsEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        imageUrl={editorImageUrl}
        onSave={handleSaveEditedPhoto}
      />
    </>
  );
}

// ==========================================
// COMPONENTE: MODAL EDITOR DE PUNTOS DE MEDICIÓN
// ==========================================
function MeasurementPointsEditorModal({ isOpen, onClose, imageUrl, onSave }) {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPoints([]);
    }
  }, [isOpen]);

  const handleImageClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Add point
    setPoints(prev => [...prev, { x, y, number: prev.length + 1 }]);
  };

  const handleUndo = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPoints([]);
  };

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
        
        points.forEach((p) => {
          const pxX = (p.x / 100) * img.naturalWidth;
          const pxY = (p.y / 100) * img.naturalHeight;

          // Draw outer stroke circle
          ctx.beginPath();
          ctx.arc(pxX, pxY, radius, 0, 2 * Math.PI);
          ctx.fillStyle = '#EF4444'; // Red-500
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
        onSave(dataUrl);
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
            <div className="flex justify-between items-center border-b border-slate-150 pb-3 mb-4 shrink-0">
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
                  {points.map((p) => (
                    <div
                      key={p.number}
                      style={{
                        position: 'absolute',
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="w-7 h-7 bg-red-500 rounded-full border-2 border-white text-white font-extrabold text-xs flex items-center justify-center shadow-md select-none pointer-events-none"
                    >
                      {p.number}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acciones de edición */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mt-4 pt-3 border-t border-slate-150 shrink-0">
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
                  variant="secondary"
                  disabled={points.length === 0 || loading}
                  onClick={handleClear}
                  className="text-xs py-1.5 h-[34px] text-red-500 border-red-200 hover:bg-red-50"
                >
                  Limpiar todo
                </AppButton>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading || points.length === 0}
                  className="px-4 py-2 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none shadow-md shadow-[#468DFF]/15 disabled:opacity-50"
                >
                  Guardar marcadores
                </button>
              </div>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
