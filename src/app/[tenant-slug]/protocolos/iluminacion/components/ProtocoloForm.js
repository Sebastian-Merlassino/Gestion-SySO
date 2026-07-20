// src/app/[tenant-slug]/protocolos/iluminacion/components/ProtocoloForm.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  X
} from 'lucide-react';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';

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
  
  // Profile Syncing Dialog State
  const [syncQueue, setSyncQueue] = useState([]);
  const [syncIndex, setSyncIndex] = useState(0);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [estSectoresLocal, setEstSectoresLocal] = useState([]); // local sectors copy to update on finish

  const canEdit = mode !== 'view' && estado !== 'anulado';
  const isReadOnly = mode === 'view';

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

      setAdjuntos([...adjuntos, newAdjunto]);
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
    setAdjuntos([...adjuntos, newAdj]);
    globalToast.toast('Enlace de Google Drive registrado con éxito.', 'success');
  };

  const handleDeleteAdjunto = (id) => {
    setAdjuntos(adjuntos.filter(ad => ad.id !== id));
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

      // 1. Si se actualizaron sectores en el perfil del establecimiento, guardarlos en BD
      if (!isDevMode && sectorsToSave && sectorsToSave.length > 0) {
        const { error: estUpdErr } = await supabase
          .from('establecimientos')
          .update({ sectores: sectorsToSave })
          .eq('id', establecimientoId);
        if (estUpdErr) throw estUpdErr;
      }

      const tempId = editingId || crypto.randomUUID();
      const resultadoGeneralVal = getResultadoGeneral();

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
              <AppLabel>Razón Social</AppLabel>
              {isReadOnly ? (
                <AppInput disabled value={razonSocialText} />
              ) : (
                <AppSelect
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
              <AppLabel>C.U.I.T.</AppLabel>
              <AppInput disabled value={cuitText} />
            </div>

            <div className="flex flex-col gap-1">
              <AppLabel>Establecimiento</AppLabel>
              {isReadOnly ? (
                <AppInput disabled value={establecimientoText} />
              ) : (
                <AppSelect
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
              <AppLabel>Dirección</AppLabel>
              <AppInput disabled value={direccionText} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-full">
              <div className="flex flex-col gap-1">
                <AppLabel>Provincia</AppLabel>
                <AppInput disabled value={provinciaText} />
              </div>
              <div className="flex flex-col gap-1">
                <AppLabel>Localidad</AppLabel>
                <AppInput disabled value={localidadText} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 col-span-full">
              <div className="flex flex-col gap-1 md:col-span-1">
                <AppLabel>C.P.</AppLabel>
                <AppInput disabled value={cpText} />
              </div>
              <div className="flex flex-col gap-1 md:col-span-3">
                <AppLabel>Horarios / Turnos Habituales de Trabajo</AppLabel>
                <AppInput disabled value={horariosTurnosText} />
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
              <AppLabel>Marca, modelo y N° de serie del instrumento</AppLabel>
              <AppInput
                disabled={!canEdit}
                value={instrumento}
                onChange={(e) => setInstrumento(e.target.value)}
                placeholder="Ej: Luxómetro LUTRON LX-101 N/S 12345"
              />
            </div>

            <div className="flex flex-col gap-1 relative md:col-span-1">
              <AppLabel>Fecha de Calibración del Instrumental</AppLabel>
              <div className="relative">
                <AppInput
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
                <AppLabel>Metodología Utilizada en la Medición</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={metodologia}
                  onChange={setMetodologia}
                  context="Metodología técnica para medición de iluminancia laboral usando el luxómetro y grilla SRT"
                />
              </div>
              <AppTextarea
                disabled={!canEdit}
                rows={3}
                value={metodologia}
                onChange={(e) => setMetodologia(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 col-span-full">
              <div className="flex flex-col gap-1">
                <AppLabel>Fecha Medición</AppLabel>
                <div className="relative">
                  <AppInput
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
                <AppLabel>Hora de Inicio</AppLabel>
                <AppInput
                  type="time"
                  disabled={!canEdit}
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <AppLabel>Hora de Fin</AppLabel>
                <AppInput
                  type="time"
                  disabled={!canEdit}
                  value={horaFinalizacion}
                  onChange={(e) => setHoraFinalizacion(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 col-span-full">
              <div className="flex items-center justify-between">
                <AppLabel>Condiciones Atmosféricas</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={condicionesAtmosfericas}
                  onChange={setCondicionesAtmosfericas}
                  context="Detalle del estado del tiempo, cielo despejado/nublado, y luces activas en local cerrado o exterior"
                />
              </div>
              <AppTextarea
                disabled={!canEdit}
                rows={2}
                value={condicionesAtmosfericas}
                onChange={(e) => setCondicionesAtmosfericas(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1 col-span-full">
              <div className="flex items-center justify-between">
                <AppLabel>Documentación que se Adjuntará</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={documentacionAdjunta}
                  onChange={setDocumentacionAdjunta}
                  context="Listado de anexos técnicos del protocolo de iluminación"
                />
              </div>
              <AppTextarea
                disabled={!canEdit}
                rows={2}
                value={documentacionAdjunta}
                onChange={(e) => setDocumentacionAdjunta(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1 col-span-full">
              <div className="flex items-center justify-between">
                <AppLabel>Observaciones Generales de la Medición</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={observacionesGenerales}
                  onChange={setObservacionesGenerales}
                  context="Observaciones generales sobre la instalación luminaria o del ambiente de trabajo"
                />
              </div>
              <AppTextarea
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
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#468DFF]" />
              <h2 className="font-outfit text-base font-extrabold text-slate-800">Puntos de Muestreo ({puntos.length})</h2>
            </div>
            {canEdit && (
              <AppButton
                type="button"
                onClick={handleAddPunto}
                className="text-xs py-1.5 px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar punto de muestreo
              </AppButton>
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
                <div key={p.id} className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-slate-50/20">
                  
                  {/* ACCORDION HEADER */}
                  <div 
                    onClick={() => handleToggleCollapsePunto(p.id)}
                    className="p-3.5 bg-slate-100/60 hover:bg-slate-100/80 cursor-pointer flex items-center justify-between flex-wrap gap-2 border-b border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-sm text-slate-800 font-outfit">Punto de Muestreo #{p.punto_muestreo}</span>
                      <span className="text-xs text-slate-500 font-medium">
                        {p.sector_text ? `${p.sector_text}` : 'Sin sector'} {p.puesto_text ? ` - Puesto: ${p.puesto_text}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase ${badgeColor}`}>
                        {cal.resultado_punto}
                      </span>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicatePunto(p)}
                            title="Duplicar punto"
                            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePunto(p.id)}
                            title="Eliminar punto"
                            className="p-1 rounded-lg hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <button 
                        type="button" 
                        onClick={() => handleToggleCollapsePunto(p.id)}
                        className="text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        {p.isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* ACCORDION CONTENT */}
                  {!p.isCollapsed && (
                    <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4 animate-scale-up">
                      
                      {/* Left: Geometría e Info */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <AppLabel>Sector</AppLabel>
                            {isReadOnly ? (
                              <AppInput disabled value={p.sector_text} />
                            ) : (
                              <AppSelect
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
                            <AppLabel>Puesto / Sección</AppLabel>
                            {isReadOnly ? (
                              <AppInput disabled value={p.puesto_text} />
                            ) : (
                              <AppSelect
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

                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col gap-1">
                            <AppLabel>Largo (m)</AppLabel>
                            <AppInput
                              disabled={!canEdit}
                              type="number"
                              step="0.01"
                              value={p.largo_m}
                              onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, largo_m: e.target.value } : x))}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <AppLabel>Ancho (m)</AppLabel>
                            <AppInput
                              disabled={!canEdit}
                              type="number"
                              step="0.01"
                              value={p.ancho_m}
                              onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, ancho_m: e.target.value } : x))}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <AppLabel>Altura montaje (m)</AppLabel>
                            <AppInput
                              disabled={!canEdit}
                              type="number"
                              step="0.01"
                              value={p.altura_m}
                              onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, altura_m: e.target.value } : x))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col gap-1">
                            <AppLabel>Iluminación</AppLabel>
                            {isReadOnly ? (
                              <AppInput disabled value={p.tipo_iluminacion} />
                            ) : (
                              <AppSelect
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
                            <AppLabel>Fuente Lumínica</AppLabel>
                            {isReadOnly ? (
                              <AppInput disabled value={p.tipo_fuente_luminica} />
                            ) : (
                              <AppSelect
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
                            <AppLabel>Distribución</AppLabel>
                            {isReadOnly ? (
                              <AppInput disabled value={p.iluminacion} />
                            ) : (
                              <AppSelect
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
                        </div>
                      </div>

                      {/* Right: Mediciones y Criterio Legal */}
                      <div className="space-y-4 border-l border-slate-100 pl-0 md:pl-4">
                        
                        {/* Mediciones Lux Grid */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <AppLabel>Mediciones de Lux Obtenidas</AppLabel>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleAddMedicion(p.id)}
                                className="text-[10px] text-[#468DFF] hover:underline font-bold"
                              >
                                + Agregar Medición
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {p.mediciones.map((m, mIdx) => (
                              <div key={m.id} className="relative flex items-center">
                                <AppInput
                                  disabled={!canEdit}
                                  type="text"
                                  className="pr-6 text-center text-xs h-8"
                                  placeholder={`Val #${mIdx + 1}`}
                                  value={m.valor_lux}
                                  onChange={(e) => handleMedicionValueChange(p.id, m.id, e.target.value)}
                                />
                                {canEdit && p.mediciones.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMedicion(p.id, m.id)}
                                    className="absolute right-1 text-slate-300 hover:text-red-500 p-0.5"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Criterio Legal */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <AppLabel>Actividad / Sector SRT (Catálogo)</AppLabel>
                            {isReadOnly ? (
                              <AppInput disabled value={p.selectedActividadIndex !== '' ? ACTIVIDADES_ILUMINACION[p.selectedActividadIndex]?.tarea : ''} />
                            ) : (
                              <AppSelect
                                value={p.selectedActividadIndex}
                                onChange={(e) => handleActividadSelect(p.id, e.target.value)}
                              >
                                <option value="">Selecciona actividad normada...</option>
                                {ACTIVIDADES_ILUMINACION.map((item, keyIdx) => (
                                  <option key={keyIdx} value={keyIdx}>
                                    {item.categoria} - {item.tarea} ({item.lux} lx)
                                  </option>
                                ))}
                              </AppSelect>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <AppLabel>Requerido legal (lux)</AppLabel>
                            <AppInput
                              type="number"
                              disabled={!canEdit}
                              placeholder="Ej: 500"
                              value={p.valor_requerido_legal_lux}
                              onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, valor_requerido_legal_lux: e.target.value } : x))}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`uniformidad-check-${p.id}`}
                            disabled={!canEdit}
                            checked={p.aplicaVerificacionUniformidad}
                            onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, aplicaVerificacionUniformidad: e.target.checked } : x))}
                            className="rounded text-[#468DFF] focus:ring-[#468DFF] cursor-pointer"
                          />
                          <label htmlFor={`uniformidad-check-${p.id}`} className="text-xs font-semibold text-slate-600 cursor-pointer">
                            Aplica verificación de uniformidad (E_mín ≥ E_media / 2)
                          </label>
                        </div>

                        <div className="flex flex-col gap-1">
                          <AppLabel>Observaciones del Punto</AppLabel>
                          <AppInput
                            disabled={!canEdit}
                            placeholder="Notas o desvíos particulares del punto..."
                            value={p.observaciones_punto}
                            onChange={(e) => setPuntos(puntos.map(x => x.id === p.id ? { ...x, observaciones_punto: e.target.value } : x))}
                          />
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
                <AppLabel>Conclusiones</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={conclusiones}
                  onChange={setConclusiones}
                  context="Conclusiones sobre el cumplimiento legal y de uniformidad de la iluminación en el ambiente de trabajo"
                />
              </div>
              <AppTextarea
                disabled={!canEdit}
                rows={3}
                value={conclusiones}
                onChange={(e) => setConclusiones(e.target.value)}
                placeholder="Escribe conclusiones del protocolo..."
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <AppLabel>Recomendaciones preventivas recomendadas</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={recomendaciones}
                  onChange={setRecomendaciones}
                  context="Recomendaciones preventivas recomendadas para adecuar los niveles de iluminación a la legislación vigente y mejorar la ergonomía visual"
                />
              </div>
              <AppTextarea
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

        {/* CARD ADJUNTOS */}
        <AppCard className="p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="h-5 w-5 text-[#468DFF]" />
            <h2 className="font-outfit text-base font-extrabold text-slate-800">Anexos y Documentación Adjunta</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <AppLabel>Archivos adjuntos cargados</AppLabel>
              {adjuntos.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium">No se han cargado archivos adjuntos para este protocolo.</p>
              ) : (
                <div className="space-y-2">
                  {adjuntos.map(ad => (
                    <div key={ad.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-[#468DFF] shrink-0" />
                        <div className="truncate">
                          <span className="text-xs font-bold text-slate-800 block truncate leading-none">{ad.name}</span>
                          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{ad.tipo}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => window.open(ad.preview, '_blank')}
                          className="p-1 text-slate-400 hover:text-[#468DFF] transition-colors"
                          title="Ver archivo"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAdjunto(ad.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="Eliminar archivo"
                          >
                            <Trash className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canEdit && (
              <div className="space-y-3">
                <AppLabel>Subir nuevo anexo</AppLabel>
                <DocumentUploadZone
                  disabled={!canEdit}
                  accept="application/pdf,image/*"
                  maxSizeMB={10}
                  onFileChange={(file) => handleUploadFile(file, 'Croquis/Certificado')}
                  onDriveImport={(link) => handleImportDriveLink(link, 'Drive Link')}
                />
              </div>
            )}
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
                <select
                  disabled={saveLoading}
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs cursor-pointer h-[38px]"
                >
                  <option value="borrador">Borrador</option>
                  <option value="completado">Completado</option>
                  <option value="anulado">Anulado</option>
                </select>

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
    </>
  );
}
