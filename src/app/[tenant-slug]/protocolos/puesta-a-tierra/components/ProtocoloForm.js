'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import AITextHelper from '@/components/ui/AITextHelper';
import AppSignatureCanvas from '@/components/ui/AppSignatureCanvas';
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
  RotateCcw,
  Save
} from 'lucide-react';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';

const CONDICION_TERRENO_OPTS = [
  'Lecho seco',
  'Lecho húmedo',
  'Arcilloso',
  'Pantanoso',
  'Lluvias recientes',
  'Arenoso seco o húmedo',
  'Otro'
];

const USO_PUESTA_TIERRA_OPTS = [
  'Toma de Tierra de Seguridad de las Masas',
  'Toma de Tierra del neutro de Transformador',
  'De Protección de equipos Electrónicos',
  'De Informática',
  'De Iluminación',
  'De Pararrayos',
  'Otros'
];

const ESQUEMA_CONEXION_OPTS = [
  'TT',
  'TN-S',
  'TN-C',
  'TN-C-S',
  'IT'
];

const DISPOSITIVO_PROTECCION_OPTS = [
  'Dispositivo diferencial (DD)',
  'Interruptor automático (IA)',
  'Fusible (Fus)',
  'Otro'
];

export default function ProtocoloForm({
  tenantSlug,
  profile,
  tenant,
  initialEmpresas = [],
  initialEstablecimientos = [],
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

  // State
  const [loading, setLoading] = useState(mode !== 'create' && !!editingId);
  const [saveLoading, setSaveLoading] = useState(false);
  const [empresas, setEmpresas] = useState(initialEmpresas);
  const [allEstablecimientos, setAllEstablecimientos] = useState(initialEstablecimientos);

  // Form Fields
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

  // Instrumental & Medición
  const [instrumento, setInstrumento] = useState('');
  const [fechaCalibracion, setFechaCalibracion] = useState('');
  const [metodologia, setMetodologia] = useState('“de caída de tensión” según Norma IRAM 2281 parte II: “Guía de mediciones de magnitudes de puesta a tierra”');
  const [fechaMedicion, setFechaMedicion] = useState('');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFinalizacion, setHoraFinalizacion] = useState('');
  const [documentacionAdjunta, setDocumentacionAdjunta] = useState('Certificado de Calibración.\nPlano o Croquis del establecimiento.');
  const [observacionesGenerales, setObservacionesGenerales] = useState('Al momento de la medición, el establecimiento se encontraba funcionando en condiciones normales.');
  const [informacionAdicional, setInformacionAdicional] = useState('Se probó disparo de disyuntores. Tipo y corriente de disparo, dentro de parámetros.');

  // Conclusiones
  const [conclusiones, setConclusiones] = useState('Los valores hallados de la medición de la puesta a tierra cumplen con lo establecido en la Resolución 900/15.');
  const [recomendaciones, setRecomendaciones] = useState('Es recomendable mantener limpio y libre de óxido las terminales de las jabalinas.');
  const [estado, setEstado] = useState('borrador');

  // Puntos
  const [puntos, setPuntos] = useState([
    {
      id: 'temp-1',
      orden: 1,
      toma_tierra_num: 1,
      sector: '',
      condicion_terreno: '',
      uso_puesta_a_tierra: '',
      esquema_conexion: '',
      valor_medido_ohm: '',
      cumple_ohm: '',
      continuidad_permanente: '',
      capacidad_carga: '',
      dispositivo_proteccion: '',
      desconexion_automatica: '',
      observaciones_punto: '',
      isCollapsed: false
    }
  ]);

  // Adjuntos
  const [adjuntos, setAdjuntos] = useState([]);

  // Firma
  const [profesionalNombre, setProfesionalNombre] = useState(profile?.full_name || '');
  const [profesionalMatricula, setProfesionalMatricula] = useState(profile?.matricula || '');
  const [firmaTipo, setFirmaTipo] = useState('perfil');
  const [firmaBase64, setFirmaBase64] = useState('');

  const isReadOnly = mode === 'view';
  const canEdit = mode !== 'view' && estado !== 'anulado';

  // Dirty state tracking
  const initialSnapshotRef = useRef('');
  const [isReady, setIsReady] = useState(false);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [sectorConfirmDialog, setSectorConfirmDialog] = useState({ open: false, newSectors: [], pendingEstado: 'finalizado' });

  const getFormSnapshot = () => JSON.stringify({
    empresaId, establecimientoId, instrumento, fechaCalibracion, metodologia,
    fechaMedicion, horaInicio, horaFinalizacion, observacionesGenerales,
    informacionAdicional, conclusiones, recomendaciones, estado, profesionalNombre,
    profesionalMatricula, firmaTipo, puntosCount: puntos.length, adjuntosCount: adjuntos.length
  });

  useEffect(() => {
    if (onDirtyChange && isReady && initialSnapshotRef.current) {
      if (mode === 'view') {
        onDirtyChange(false);
        return;
      }
      onDirtyChange(getFormSnapshot() !== initialSnapshotRef.current);
    }
  }, [
    mode, isReady, empresaId, establecimientoId, instrumento, fechaCalibracion,
    metodologia, fechaMedicion, horaInicio, horaFinalizacion, observacionesGenerales,
    informacionAdicional, conclusiones, recomendaciones, estado, profesionalNombre,
    profesionalMatricula, firmaTipo, puntos, adjuntos, onDirtyChange
  ]);

  const handleExitAttempt = () => {
    if (mode === 'view') {
      onClose();
      return;
    }
    if (initialSnapshotRef.current && getFormSnapshot() !== initialSnapshotRef.current) {
      setUnsavedDialogOpen(true);
    } else {
      onClose();
    }
  };

  // Carga de Datos
  const loadData = useCallback(async () => {
    try {
      if (!tenant) return;

      if (initialEmpresas && initialEmpresas.length > 0) {
        setEmpresas(initialEmpresas);
      } else {
        const { data: empsData } = await supabase
          .from('empresas')
          .select('id, razon_social, cuit, contactos_correos, contactos_telefonos')
          .eq('tenant_id', tenant.id)
          .order('razon_social', { ascending: true });
        setEmpresas(empsData || []);
      }

      if (initialEstablecimientos && initialEstablecimientos.length > 0) {
        setAllEstablecimientos(initialEstablecimientos);
      } else {
        const { data: estsData } = await supabase
          .from('establecimientos')
          .select('id, empresa_id, denominacion, sectores, direccion, provincia, localidad_barrio, cp, horario_funcionamiento')
          .eq('tenant_id', tenant.id)
          .order('denominacion', { ascending: true });
        setAllEstablecimientos(estsData || []);
      }

      if (editingId) {
        setLoading(true);
        const { data: proto, error: pErr } = await supabase
          .from('protocolos_puesta_a_tierra')
          .select(`
            *,
            protocolos_puesta_a_tierra_puntos(*),
            protocolos_puesta_a_tierra_adjuntos(*)
          `)
          .eq('id', editingId)
          .single();

        if (pErr) throw pErr;

        if (proto) {
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
          setFechaCalibracion(proto.fecha_calibracion ? formatAsDateInput(proto.fecha_calibracion) : '');
          setMetodologia(proto.metodologia_utilizada || '');
          setFechaMedicion(proto.fecha_medicion ? formatAsDateInput(proto.fecha_medicion) : '');
          setHoraInicio(proto.hora_inicio || '');
          setHoraFinalizacion(proto.hora_finalizacion || '');
          setObservacionesGenerales(proto.observaciones || '');
          setDocumentacionAdjunta(proto.documentacion_adjunta || '');
          setInformacionAdicional(proto.informacion_adicional || '');
          setConclusiones(proto.conclusiones || '');
          setRecomendaciones(proto.recomendaciones || '');
          setEstado(proto.estado || 'borrador');
          setProfesionalNombre(proto.profesional_nombre || '');
          setProfesionalMatricula(proto.profesional_matricula || '');
          setFirmaBase64(proto.firma_profesional || '');
          setFirmaTipo(proto.firma_tipo || 'perfil');

          if (proto.protocolos_puesta_a_tierra_puntos?.length > 0) {
            setPuntos(proto.protocolos_puesta_a_tierra_puntos.map(p => ({ ...p, isCollapsed: false })).sort((a, b) => a.orden - b.orden));
          }

          if (proto.protocolos_puesta_a_tierra_adjuntos?.length > 0) {
            setAdjuntos(proto.protocolos_puesta_a_tierra_adjuntos);
          }
        }
      }

      setLoading(false);
      setTimeout(() => {
        initialSnapshotRef.current = getFormSnapshot();
        setIsReady(true);
      }, 100);
    } catch (err) {
      console.error('Error cargando formulario:', err);
      globalToast.toast('Error al recuperar los datos del protocolo.', 'error');
      setLoading(false);
    }
  }, [editingId, tenant, initialEmpresas, initialEstablecimientos]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Razón Social & Establecimiento Handlers
  const handleEmpresaChange = (val) => {
    setEmpresaId(val);
    setEstablecimientoId('');
    setEstablecimientoText('');
    setDireccionText('');
    setProvinciaText('');
    setLocalidadText('');
    setCpText('');
    const emp = empresas.find(e => e.id === val);
    if (emp) {
      setRazonSocialText(emp.razon_social);
      setCuitText(emp.cuit || '');
    } else {
      setRazonSocialText('');
      setCuitText('');
    }
  };

  const handleEstablecimientoChange = (val) => {
    setEstablecimientoId(val);
    const est = allEstablecimientos.find(e => e.id === val);
    if (est) {
      setEstablecimientoText(est.denominacion);
      setDireccionText(est.direccion || '');
      setProvinciaText(est.provincia || '');
      setLocalidadText(est.localidad_barrio || '');
      setCpText(est.cp || '');
      setHorariosTurnosText(est.horario_funcionamiento || 'Lunes a viernes de 8:00 a 17:00 hs');
    } else {
      setEstablecimientoText('');
      setDireccionText('');
      setProvinciaText('');
      setLocalidadText('');
      setCpText('');
    }
  };

  // Sectores del establecimiento activo
  const activeEstablecimiento = allEstablecimientos.find(e => e.id === establecimientoId);
  const sectoresDelEstablecimiento = Array.isArray(activeEstablecimiento?.sectores)
    ? activeEstablecimiento.sectores.map(s => (typeof s === 'string' ? s : s.denominacion || s.nombre || '')).filter(Boolean)
    : [];

  // Manejo de Tomas de Tierra
  const handleAddPunto = () => {
    const nextNum = puntos.length > 0 ? Math.max(...puntos.map(p => p.toma_tierra_num)) + 1 : 1;
    setPuntos([
      ...puntos,
      {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        orden: nextNum,
        toma_tierra_num: nextNum,
        sector: '',
        condicion_terreno: '',
        uso_puesta_a_tierra: '',
        esquema_conexion: '',
        valor_medido_ohm: '',
        cumple_ohm: '',
        continuidad_permanente: '',
        capacidad_carga: '',
        dispositivo_proteccion: '',
        desconexion_automatica: '',
        observaciones_punto: '',
        isCollapsed: false
      }
    ]);
  };

  const handleDuplicatePunto = (idToDuplicate) => {
    const targetIndex = puntos.findIndex(p => p.id === idToDuplicate);
    if (targetIndex === -1) return;
    const targetPunto = puntos[targetIndex];
    const duplicatedPunto = {
      ...targetPunto,
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      isCollapsed: false
    };
    const updatedPuntos = [...puntos];
    updatedPuntos.splice(targetIndex + 1, 0, duplicatedPunto);

    const reindexed = updatedPuntos.map((pt, idx) => ({
      ...pt,
      orden: idx + 1,
      toma_tierra_num: idx + 1
    }));

    setPuntos(reindexed);
    globalToast.toast(`Punto de Muestreo ${targetPunto.toma_tierra_num} duplicado con éxito.`, 'success');
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

  const handlePuntoChange = (id, field, val) => {
    setPuntos(puntos.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: val };
        if (field === 'valor_medido_ohm') {
          const numVal = parseFloat(val);
          if (!isNaN(numVal)) {
            updated.cumple_ohm = numVal <= 40 ? 'SI' : 'NO';
          }
        }
        return updated;
      }
      return p;
    }));
  };

  // Submit Handler con verificación de sectores
  const handleSave = async (nuevoEstado = 'finalizado', bypassSectorCheck = false) => {
    if (!empresaId) {
      globalToast.toast('Por favor selecciona una Razón Social.', 'error');
      return;
    }
    if (!establecimientoId) {
      globalToast.toast('Por favor selecciona un Establecimiento.', 'error');
      return;
    }

    if (!bypassSectorCheck) {
      const newSectorsInForm = Array.from(new Set(
        puntos
          .map(p => (p.sector || '').trim())
          .filter(s => s.length > 0 && !sectoresDelEstablecimiento.some(es => es.toLowerCase() === s.toLowerCase()))
      ));

      if (newSectorsInForm.length > 0) {
        setSectorConfirmDialog({
          open: true,
          newSectors: newSectorsInForm,
          pendingEstado: nuevoEstado
        });
        return;
      }
    }

    executeSave(nuevoEstado);
  };

  const saveNewSectorsAndContinue = async (shouldSaveSectors) => {
    const { newSectors, pendingEstado } = sectorConfirmDialog;
    setSectorConfirmDialog({ open: false, newSectors: [], pendingEstado: 'finalizado' });

    if (shouldSaveSectors && newSectors.length > 0 && establecimientoId) {
      try {
        const currentSectoresObj = Array.isArray(activeEstablecimiento?.sectores) ? activeEstablecimiento.sectores : [];
        const newSectorObjs = newSectors.map(secName => ({
          id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          denominacion: secName
        }));
        const updatedSectoresObj = [...currentSectoresObj, ...newSectorObjs];

        const { error: estErr } = await supabase
          .from('establecimientos')
          .update({ sectores: updatedSectoresObj })
          .eq('id', establecimientoId);

        if (!estErr) {
          setAllEstablecimientos(prev => prev.map(est =>
            est.id === establecimientoId ? { ...est, sectores: updatedSectoresObj } : est
          ));
          globalToast.toast(`Nuevos sectores guardados en el establecimiento.`, 'success');
        }
      } catch (err) {
        console.error('Error guardando nuevos sectores:', err);
      }
    }

    executeSave(pendingEstado);
  };

  const executeSave = async (nuevoEstado = 'finalizado') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión expirada.');

      const payloadProto = {
        tenant_id: tenant.id,
        user_id: user.id,
        organization_id: tenant.id,
        razon_social_id: empresaId,
        establecimiento_id: establecimientoId,
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
        observaciones: observacionesGenerales || null,
        documentacion_adjunta: documentacionAdjunta,
        informacion_adicional: informacionAdicional || null,
        conclusiones: conclusiones || null,
        recomendaciones: recomendaciones || null,
        profesional_nombre: profesionalNombre || null,
        profesional_matricula: profesionalMatricula || null,
        firma_tipo: firmaTipo,
        firma_profesional: firmaBase64 || null,
        estado: nuevoEstado,
        updated_at: new Date().toISOString()
      };

      let protoId = editingId;

      if (protoId) {
        const { error: updErr } = await supabase
          .from('protocolos_puesta_a_tierra')
          .update(payloadProto)
          .eq('id', protoId);
        if (updErr) throw updErr;
      } else {
        const { data: newP, error: insErr } = await supabase
          .from('protocolos_puesta_a_tierra')
          .insert({
            ...payloadProto,
            created_by: user.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        if (insErr) throw insErr;
        protoId = newP.id;
      }

      // Reemplazar Puntos
      if (editingId) {
        await supabase
          .from('protocolos_puesta_a_tierra_puntos')
          .delete()
          .eq('protocolo_id', protoId);
      }

      const ptsPayload = puntos.map((p, i) => ({
        protocolo_id: protoId,
        orden: i + 1,
        toma_tierra_num: i + 1,
        sector: p.sector,
        condicion_terreno: p.condicion_terreno,
        uso_puesta_a_tierra: p.uso_puesta_a_tierra,
        esquema_conexion: p.esquema_conexion,
        valor_medido_ohm: parseFloat(p.valor_medido_ohm) || 0,
        cumple_ohm: p.cumple_ohm,
        continuidad_permanente: p.continuidad_permanente,
        capacidad_carga: p.capacidad_carga,
        dispositivo_proteccion: p.dispositivo_proteccion,
        desconexion_automatica: p.desconexion_automatica,
        observaciones_punto: p.observaciones_punto
      }));

      const { error: ptsErr } = await supabase
        .from('protocolos_puesta_a_tierra_puntos')
        .insert(ptsPayload);
      if (ptsErr) throw ptsErr;

      // Reemplazar Adjuntos
      if (editingId) {
        await supabase
          .from('protocolos_puesta_a_tierra_adjuntos')
          .delete()
          .eq('protocolo_id', protoId);
      }

      if (adjuntos.length > 0) {
        const adjPayload = adjuntos.map(ad => ({
          protocolo_id: protoId,
          tipo: ad.tipo || 'fotografia',
          nombre_archivo: ad.nombre_archivo || ad.name,
          storage_path: ad.storage_path || ad.path,
          public_url: ad.public_url || ad.preview,
          created_by: user.id
        }));

        await supabase
          .from('protocolos_puesta_a_tierra_adjuntos')
          .insert(adjPayload);
      }

      globalToast.toast(`Protocolo guardado como ${nuevoEstado} exitosamente.`, 'success');
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      console.error('Error guardando protocolo:', err);
      globalToast.toast(`Error al guardar: ${err.message}`, 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="h-10 w-10 animate-spin text-[#468DFF]" />
        <p className="text-xs text-slate-500 font-medium">Cargando protocolo de puesta a tierra...</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-y border-x-0 md:border md:border-slate-200 md:rounded-2xl shadow-sm overflow-hidden flex flex-col flex-grow min-h-0 md:h-[calc(100vh-140px)]">

      {/* CABECERA DEL FORMULARIO (SySO Compact Layout v2.0) */}
      <div className="h-16 px-3.5 sm:px-5 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={handleExitAttempt}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
            title="Volver al listado"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-outfit text-sm sm:text-base font-bold text-slate-900 truncate" title={mode === 'create' ? 'Nuevo Protocolo de Puesta a Tierra' : mode === 'edit' ? 'Editar Protocolo' : 'Detalle del Protocolo'}>
            {mode === 'create' ? 'Nuevo Protocolo de Puesta a Tierra' : mode === 'edit' ? 'Editar Protocolo' : 'Detalle del Protocolo'}
          </span>
          <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-[#468DFF] border border-blue-200 rounded-lg text-[10px] font-bold">
            Res. SRT 900/15 & Dec. 351/79 Anexo VI Cap. 14
          </span>
        </div>

        <div className="flex items-center gap-2">
          {editingId && onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          )}

          {editingId && onSendPdf && (
            <button
              type="button"
              onClick={onSendPdf}
              className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Enviar</span>
            </button>
          )}

          {isReadOnly && onEdit && (
            <AppButton
              variant="primary"
              size="sm"
              onClick={onEdit}
            >
              Editar
            </AppButton>
          )}

          <button
            type="button"
            onClick={handleExitAttempt}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition-colors cursor-pointer shrink-0 ml-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* CUERPO DEL FORMULARIO CON SCROLL */}
      <form onSubmit={(e) => { e.preventDefault(); handleSave('finalizado'); }} className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 select-none overflow-y-auto flex-1 scrollbar-thin">

        {/* CARD 1: DATOS DEL ESTABLECIMIENTO */}
        <AppCard className="p-4 sm:p-5 md:p-6 space-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-full">
              <div className="flex flex-col gap-1">
                <AppLabel htmlFor="provinciaText">Provincia</AppLabel>
                <AppInput id="provinciaText" disabled value={provinciaText} />
              </div>
              <div className="flex flex-col gap-1">
                <AppLabel htmlFor="localidadText">Localidad</AppLabel>
                <AppInput id="localidadText" disabled={isReadOnly} value={localidadText} onChange={(e) => setLocalidadText(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <AppLabel htmlFor="cpText">C.P.</AppLabel>
                <AppInput id="cpText" disabled={isReadOnly} value={cpText} onChange={(e) => setCpText(e.target.value)} />
              </div>
            </div>
          </div>
        </AppCard>

        {/* CARD 2: DATOS DE LA MEDICIÓN E INSTRUMENTAL */}
        <AppCard className="p-4 sm:p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Zap className="h-5 w-5 text-[#468DFF]" />
            <h2 className="font-outfit text-base font-extrabold text-slate-800">Datos para medición</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1 md:col-span-2">
              <AppLabel htmlFor="instrumento" className="min-h-[2.25rem] flex items-end mb-1" required>Telurímetro (Marca, Modelo y Serie)</AppLabel>
              <AppInput
                id="instrumento"
                disabled={!canEdit}
                value={instrumento}
                onChange={(e) => setInstrumento(e.target.value)}
                placeholder="Telurímetro digital marca SEW, modelo ST-1520, número de serie 01987952"
              />
            </div>

            <div className="flex flex-col gap-1">
              <AppLabel htmlFor="fechaCalibracion" className="min-h-[2.25rem] flex items-end mb-1">Fecha de Calibración del Instrumental</AppLabel>
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
                          if (parts.length === 3) setFechaCalibracion(`${parts[2]}/${parts[1]}/${parts[0]}`);
                        } else setFechaCalibracion('');
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-full">
              <div className="flex flex-col gap-1">
                <AppLabel htmlFor="fechaMedicion" required>Fecha de la Medición</AppLabel>
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
                            if (parts.length === 3) setFechaMedicion(`${parts[2]}/${parts[1]}/${parts[0]}`);
                          } else setFechaMedicion('');
                        }}
                      />
                    </div>
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
                <AppLabel htmlFor="horaFinalizacion">Hora Finalización</AppLabel>
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
                <AppLabel htmlFor="metodologia">Metodología Utilizada</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={metodologia}
                  onChange={setMetodologia}
                />
              </div>
              <AppTextarea
                id="metodologia"
                disabled={!canEdit}
                rows={2}
                value={metodologia}
                onChange={(e) => setMetodologia(e.target.value)}
              />
            </div>
          </div>
        </AppCard>

        {/* CARD OBSERVACIONES */}
        <AppCard className="p-4 sm:p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#468DFF]" />
              <h2 className="font-outfit text-base font-extrabold text-slate-800">
                Observaciones
              </h2>
            </div>
            <AITextHelper
              disabled={!canEdit}
              value={observacionesGenerales}
              onChange={setObservacionesGenerales}
            />
          </div>

          <div className="flex flex-col gap-1 col-span-full">
            <AppTextarea
              id="observacionesGenerales"
              disabled={!canEdit}
              rows={3}
              value={observacionesGenerales}
              onChange={(e) => setObservacionesGenerales(e.target.value)}
              placeholder="Describa las condiciones de trabajo al momento de la medición..."
            />
          </div>
        </AppCard>

        {/* CARD DOCUMENTACIÓN QUE SE ADJUNTARÁ A LA MEDICIÓN */}
        <AppCard className="p-4 sm:p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#468DFF]" />
              <h2 className="font-outfit text-base font-extrabold text-slate-800">
                Documentación que se Adjuntará a la Medición
              </h2>
            </div>
            <AITextHelper
              disabled={!canEdit}
              value={documentacionAdjunta}
              onChange={setDocumentacionAdjunta}
            />
          </div>

          <div className="flex flex-col gap-1 col-span-full">
            <AppTextarea
              id="documentacionAdjunta"
              disabled={!canEdit}
              rows={3}
              value={documentacionAdjunta}
              onChange={(e) => setDocumentacionAdjunta(e.target.value)}
            />
          </div>
        </AppCard>

        {/* CARD 3: TABLA DE DATOS DE LA MEDICIÓN (JABALINAS) */}
        <AppCard className="p-4 sm:p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#468DFF]" />
              Datos de la medición ({puntos.length})
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
            {puntos.map((p, idx) => (
              <div key={p.id} className="border border-slate-200 rounded-xl bg-slate-50/40 p-4 space-y-4 transition-all">
                <div className="flex justify-between items-center border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-lg border border-slate-300/40 uppercase">
                      Toma N° {p.toma_tierra_num}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleCollapsePunto(p.id); }}
                      className="text-[9px] text-slate-600 hover:text-slate-800 bg-white font-bold px-2 py-0.5 rounded-md border border-slate-200 transition-all cursor-pointer flex items-center gap-0.5"
                    >
                      {p.isCollapsed ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronUp className="h-2.5 w-2.5" />}
                      {p.isCollapsed ? 'Ver más' : 'Ver menos'}
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDuplicatePunto(p.id); }}
                        className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-colors border border-slate-200 flex items-center justify-center cursor-pointer"
                        title="Duplicar punto"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemovePunto(p.id); }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors border border-red-200 flex items-center justify-center cursor-pointer"
                        title="Eliminar punto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {!p.isCollapsed && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <AppLabel htmlFor={`sector-sel-${p.id}`} required>SECTOR</AppLabel>
                        {isReadOnly ? (
                          <AppInput id={`sector-sel-${p.id}`} disabled value={p.sector || ''} />
                        ) : (
                          <AppSelect
                            id={`sector-sel-${p.id}`}
                            disabled={!establecimientoId || !canEdit}
                            value={
                              sectoresDelEstablecimiento.includes(p.sector)
                                ? p.sector
                                : (p.isCustomSector || p.sector ? '__custom__' : '')
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '__custom__') {
                                handlePuntoChange(p.id, 'sector', '');
                                handlePuntoChange(p.id, 'isCustomSector', true);
                              } else {
                                handlePuntoChange(p.id, 'sector', val);
                                handlePuntoChange(p.id, 'isCustomSector', false);
                              }
                            }}
                          >
                            <option value="">Selecciona sector...</option>
                            {sectoresDelEstablecimiento.map((s, sIdx) => (
                              <option key={sIdx} value={s}>{s}</option>
                            ))}
                            <option value="__custom__">+ Ingresar sector manual...</option>
                          </AppSelect>
                        )}
                        {(p.isCustomSector || (!sectoresDelEstablecimiento.includes(p.sector) && (p.sector !== undefined && p.sector !== ''))) && canEdit && !isReadOnly && (
                          <AppInput
                            placeholder="Escribir sector manual..."
                            className="mt-1"
                            value={p.sector || ''}
                            onChange={(e) => handlePuntoChange(p.id, 'sector', e.target.value)}
                          />
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <AppLabel>Condición del Terreno</AppLabel>
                        <AppSelect
                          disabled={!canEdit}
                          value={p.condicion_terreno || ''}
                          onChange={(e) => handlePuntoChange(p.id, 'condicion_terreno', e.target.value)}
                        >
                          {CONDICION_TERRENO_OPTS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </AppSelect>
                      </div>

                      <div className="flex flex-col gap-1">
                        <AppLabel>Uso de Puesta a Tierra</AppLabel>
                        <AppSelect
                          disabled={!canEdit}
                          value={p.uso_puesta_a_tierra || ''}
                          onChange={(e) => handlePuntoChange(p.id, 'uso_puesta_a_tierra', e.target.value)}
                        >
                          {USO_PUESTA_TIERRA_OPTS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </AppSelect>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                      <div className="flex flex-col gap-1">
                        <AppLabel>Esquema Conexión</AppLabel>
                        <AppSelect
                          disabled={!canEdit}
                          value={p.esquema_conexion || ''}
                          onChange={(e) => handlePuntoChange(p.id, 'esquema_conexion', e.target.value)}
                        >
                          {ESQUEMA_CONEXION_OPTS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </AppSelect>
                      </div>

                      <div className="flex flex-col gap-1">
                        <AppLabel>Valor Medido en Ohm (Ω)</AppLabel>
                        <AppInput
                          type="number"
                          step="0.01"
                          disabled={!canEdit}
                          value={p.valor_medido_ohm !== undefined ? p.valor_medido_ohm : ''}
                          onChange={(e) => handlePuntoChange(p.id, 'valor_medido_ohm', e.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <AppLabel>Cumple Res 900/15</AppLabel>
                        <AppSelect
                          disabled={!canEdit}
                          value={p.cumple_ohm || ''}
                          onChange={(e) => handlePuntoChange(p.id, 'cumple_ohm', e.target.value)}
                        >
                          <option value="SI">SI (≤ 40 Ω)</option>
                          <option value="NO">NO (&gt; 40 Ω)</option>
                        </AppSelect>
                      </div>

                      <div className="flex flex-col gap-1">
                        <AppLabel>Continuidad Permanente</AppLabel>
                        <AppSelect
                          disabled={!canEdit}
                          value={p.continuidad_permanente || ''}
                          onChange={(e) => handlePuntoChange(p.id, 'continuidad_permanente', e.target.value)}
                        >
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                        </AppSelect>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <AppLabel>Capacidad Carga Corriente Falla</AppLabel>
                        <AppSelect
                          disabled={!canEdit}
                          value={p.capacidad_carga || ''}
                          onChange={(e) => handlePuntoChange(p.id, 'capacidad_carga', e.target.value)}
                        >
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                        </AppSelect>
                      </div>

                      <div className="flex flex-col gap-1">
                        <AppLabel>Protección Contactos Indirectos</AppLabel>
                        <AppSelect
                          disabled={!canEdit}
                          value={p.dispositivo_proteccion || ''}
                          onChange={(e) => handlePuntoChange(p.id, 'dispositivo_proteccion', e.target.value)}
                        >
                          {DISPOSITIVO_PROTECCION_OPTS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </AppSelect>
                      </div>

                      <div className="flex flex-col gap-1">
                        <AppLabel>Desconexión Automática Efectiva</AppLabel>
                        <AppSelect
                          disabled={!canEdit}
                          value={p.desconexion_automatica || ''}
                          onChange={(e) => handlePuntoChange(p.id, 'desconexion_automatica', e.target.value)}
                        >
                          <option value="SI">SI</option>
                          <option value="NO">NO</option>
                        </AppSelect>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </AppCard>

        {/* CARD 4: REGISTRO FOTOGRÁFICO Y ADJUNTOS */}
        <AppCard className="p-4 sm:p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#468DFF]" />
              <h2 className="font-outfit text-base font-extrabold text-slate-800">3. Registro Fotográfico y Adjuntos</h2>
            </div>
          </div>

          <ImageUploadZone
            images={adjuntos}
            onImagesChange={setAdjuntos}
            bucketName="protocolos-puesta-a-tierra"
            disabled={!canEdit}
          />
        </AppCard>

        {/* CARD 5: CONCLUSIONES Y RECOMENDACIONES (con SySO-AI-Voice-Helper) */}
        <AppCard className="p-4 sm:p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="h-5 w-5 text-[#468DFF]" />
            <h2 className="font-outfit text-base font-extrabold text-slate-800">4. Análisis de Datos, Conclusiones y Recomendaciones</h2>
          </div>

          <div className="flex flex-col gap-1 col-span-full">
            <div className="flex items-center justify-between">
              <AppLabel htmlFor="informacionAdicional">Información Adicional (Prueba de Disyuntores)</AppLabel>
              <AITextHelper
                disabled={!canEdit}
                value={informacionAdicional}
                onChange={setInformacionAdicional}
              />
            </div>
            <AppTextarea
              id="informacionAdicional"
              disabled={!canEdit}
              rows={2}
              value={informacionAdicional}
              onChange={(e) => setInformacionAdicional(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1 col-span-full">
            <div className="flex items-center justify-between">
              <AppLabel htmlFor="conclusiones">Conclusiones</AppLabel>
              <AITextHelper
                disabled={!canEdit}
                value={conclusiones}
                onChange={setConclusiones}
              />
            </div>
            <AppTextarea
              id="conclusiones"
              disabled={!canEdit}
              rows={3}
              value={conclusiones}
              onChange={(e) => setConclusiones(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1 col-span-full">
            <div className="flex items-center justify-between">
              <AppLabel htmlFor="recomendaciones">Recomendaciones para la Adecuación a la Legislación Vigente</AppLabel>
              <AITextHelper
                disabled={!canEdit}
                value={recomendaciones}
                onChange={setRecomendaciones}
              />
            </div>
            <AppTextarea
              id="recomendaciones"
              disabled={!canEdit}
              rows={4}
              value={recomendaciones}
              onChange={(e) => setRecomendaciones(e.target.value)}
            />
          </div>
        </AppCard>

        {/* CARD 6: FIRMA PROFESIONAL */}
        <AppCard className="p-4 sm:p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="h-5 w-5 text-[#468DFF]" />
            <h2 className="font-outfit text-base font-extrabold text-slate-800">5. Firma y Registro del Profesional Interviniente</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <AppLabel htmlFor="profesionalNombre">Nombre Completo del Profesional</AppLabel>
              <AppInput
                id="profesionalNombre"
                disabled={!canEdit}
                value={profesionalNombre}
                onChange={(e) => setProfesionalNombre(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1">
              <AppLabel htmlFor="profesionalMatricula">Matrícula y Registro Profesional</AppLabel>
              <AppInput
                id="profesionalMatricula"
                disabled={!canEdit}
                value={profesionalMatricula}
                onChange={(e) => setProfesionalMatricula(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <AppLabel>Firma Digital del Profesional</AppLabel>
            <AppSignatureCanvas
              value={firmaBase64}
              onChange={setFirmaBase64}
              disabled={!canEdit}
            />
          </div>
        </AppCard>
      </form>

      {/* FOOTER INFERIOR DE ACCIONES (SySO Compact Layout v2.0) */}
      <div className="bg-slate-50 border-t border-slate-200 p-3.5 sm:p-4 px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">Estado:</span>
          <select
            disabled={!canEdit}
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 bg-white cursor-pointer"
          >
            <option value="borrador">Borrador</option>
            <option value="finalizado">Finalizado</option>
            <option value="anulado">Anulado</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <AppButton
            variant="outline"
            size="sm"
            onClick={handleExitAttempt}
          >
            Volver
          </AppButton>

          {canEdit && (
            <>
              <AppButton
                variant="outline"
                size="sm"
                onClick={() => handleSave('borrador')}
                disabled={saveLoading}
              >
                {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar Borrador'}
              </AppButton>

              <AppButton
                variant="primary"
                size="sm"
                onClick={() => handleSave('finalizado')}
                disabled={saveLoading}
                className="flex items-center gap-1.5"
              >
                {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar y Finalizar
              </AppButton>
            </>
          )}
        </div>
      </div>

      {/* Diálogo de Cambios No Guardados */}
      <AppUnsavedChangesDialog
        open={unsavedDialogOpen}
        onConfirm={onClose}
        onCancel={() => setUnsavedDialogOpen(false)}
      />

      {/* Diálogo de Confirmación para Guardar Nuevos Sectores */}
      <AppConfirmDialog
        open={sectorConfirmDialog.open}
        title="Guardar Nuevos Sectores"
        description={`Se detectaron nuevos sectores (${sectorConfirmDialog.newSectors.join(', ')}) que no se encuentran guardados en el perfil del establecimiento. ¿Deseas guardarlos para futuras mediciones?`}
        confirmText="Sí, Guardar Sectores"
        cancelText="No, Continuar sin Guardar"
        onConfirm={() => saveNewSectorsAndContinue(true)}
        onCancel={() => saveNewSectorsAndContinue(false)}
      />
    </div>
  );
}
