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
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import DocumentUploadZone from '@/components/ui/DocumentUploadZone';
import AITextHelper from '@/components/ui/AITextHelper';
import AppSignatureCanvas from '@/components/ui/AppSignatureCanvas';
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
  RotateCcw,
  Save,
  Camera
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
  const [observacionesGenerales, setObservacionesGenerales] = useState('Valores límites recomendados: Circuito con protección contra contactos indirectos (DID / 30 mA) < 40 ohms; Circuito sin protección contra contactos indirectos < 10 ohms.');
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

  // Firma y Miembros
  const [miembrosList, setMiembrosList] = useState([]);
  const [profesionalId, setProfesionalId] = useState('__custom__');
  const [profesionalNombre, setProfesionalNombre] = useState(profile?.full_name || '');
  const [profesionalMatricula, setProfesionalMatricula] = useState(profile?.matricula || '');
  const [signaturePath, setSignaturePath] = useState('');
  const [firmaProfSavedUrl, setFirmaProfSavedUrl] = useState('');
  const [firmaPerfilPreviewUrl, setFirmaPerfilPreviewUrl] = useState('');
  const [firmaTipo, setFirmaTipo] = useState('perfil');
  const [firmaBase64, setFirmaBase64] = useState('');
  const [hasSignedProf, setHasSignedProf] = useState(false);
  const firmaProfCanvasRef = useRef(null);

  const isReadOnly = mode === 'view';
  const canEdit = mode !== 'view' && estado !== 'anulado';

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
        if (signaturePath) setFirmaPerfilPreviewUrl(signaturePath);
      }
    };
    resolveProfileSignaturePreview();
  }, [signaturePath, firmaTipo, firmaProfSavedUrl]);

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

  const sanitizeFileName = (name) => {
    if (!name) return 'archivo';
    const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalized.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  };

  // Upload attachment file
  const handleUploadFile = async (file, type) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'dev-user';
      const uuid = editingId || crypto.randomUUID();
      const safeName = sanitizeFileName(file.name);
      const filename = `${userId}/${uuid}/adjuntos/${Date.now()}_${safeName}`;

      let bucketToUse = 'protocolos-puesta-a-tierra';
      let uploadRes = await supabase.storage
        .from(bucketToUse)
        .upload(filename, file, { cacheControl: '3600', upsert: true });

      if (uploadRes.error) {
        console.warn(`Error al subir a bucket ${bucketToUse}, intentando fallback a 'documents'...`, uploadRes.error);
        bucketToUse = 'documents';
        uploadRes = await supabase.storage
          .from(bucketToUse)
          .upload(filename, file, { cacheControl: '3600', upsert: true });
      }

      if (uploadRes.error) throw uploadRes.error;

      const { data: sData } = await supabase.storage
        .from(bucketToUse)
        .createSignedUrl(filename, 3600);

      const newAdjunto = {
        id: 'adj-' + Date.now(),
        tipo: type,
        name: file.name,
        path: filename,
        storage_bucket: bucketToUse,
        preview: sData?.signedUrl || '',
        originalPath: filename,
        markers: []
      };

      setAdjuntos(prev => [...prev, newAdjunto]);
      globalToast.toast(`Archivo "${file.name}" cargado con éxito.`, 'success');
    } catch (err) {
      console.error('Error al subir archivo:', err);
      globalToast.toast(`Error al subir el archivo: ${err.message || 'Error en almacenamiento'}`, 'error');
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

  // Estados y funciones para editor modal de puntos sobre plano/croquis
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorImageUrl, setEditorImageUrl] = useState('');
  const [editPhotoIndex, setEditPhotoIndex] = useState(null);

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

        allMarkers.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        allMarkers.forEach((m, idx) => {
          m.number = idx + 1;
        });

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

  // Dirty state tracking & Sync Modal
  const initialSnapshotRef = useRef('');
  const [isReady, setIsReady] = useState(false);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [syncQueue, setSyncQueue] = useState([]);
  const [pendingEstado, setPendingEstado] = useState('completado');

  const getFormSnapshot = () => JSON.stringify({
    empresaId, establecimientoId, instrumento, fechaCalibracion, metodologia,
    fechaMedicion, horaInicio, horaFinalizacion, observacionesGenerales,
    documentacionAdjunta, informacionAdicional, conclusiones, recomendaciones,
    estado, profesionalNombre, profesionalMatricula, firmaTipo,
    puntosCount: puntos.length, adjuntosCount: adjuntos.length
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
    documentacionAdjunta, informacionAdicional, conclusiones, recomendaciones, estado,
    profesionalNombre, profesionalMatricula, firmaTipo, puntos, adjuntos, onDirtyChange
  ]);

  const canEliminar = profile?.role === 'admin' || profile?.role === 'owner' || profile?.role === 'tecnico';
  const canEditar = profile?.role !== 'cliente';

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const executeDelete = async () => {
    if (!editingId) return;
    setDeleteLoading(true);
    try {
      const { error: delErr } = await supabase
        .from('protocolos_puesta_a_tierra')
        .delete()
        .eq('id', editingId);
      if (delErr) throw delErr;

      globalToast.toast('Protocolo eliminado correctamente.', 'success');
      onSaveSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('Error al eliminar protocolo:', err);
      globalToast.toast('Error al eliminar el protocolo.', 'error');
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    if (!empresaId) {
      globalToast.toast('Por favor selecciona una Razón Social.', 'error');
      return;
    }
    if (!establecimientoId) {
      globalToast.toast('Por favor selecciona un Establecimiento.', 'error');
      return;
    }

    const targetEstado = (estado === 'completado' || estado === 'finalizado') ? 'completado' : 'borrador';
    setPendingEstado(targetEstado);

    const queue = [];
    const customSectores = puntos
      .map(p => (p.sector || '').trim())
      .filter(s => s !== '' && !estSectoresLocal.some(sec => sec.denominacion.toLowerCase() === s.toLowerCase()));
    
    const uniqueCustomSectores = Array.from(new Set(customSectores));

    uniqueCustomSectores.forEach(secName => {
      queue.push({
        type: 'new_sector',
        sectorName: secName,
        message: `El sector "${secName}" ingresado no se encuentra cargado en el perfil del cliente. ¿Desea guardarlo para futuras mediciones?`
      });
    });

    if (queue.length > 0 && establecimientoId) {
      setSyncQueue(queue);
      setIsSyncOpen(true);
    } else {
      executeSave(targetEstado);
    }
  };

  const handleSyncConfirm = async (action) => {
    setIsSyncOpen(false);
    if (action === 'save_profile' && syncQueue.length > 0 && establecimientoId) {
      try {
        const currentSectoresObj = Array.isArray(activeEstablecimiento?.sectores) ? activeEstablecimiento.sectores : [];
        const existingNames = currentSectoresObj.map(s => (typeof s === 'string' ? s : s.denominacion || s.nombre || '').toLowerCase());
        
        const newSectorNames = Array.from(new Set(syncQueue.map(item => item.sectorName)));
        const toAdd = newSectorNames.filter(name => !existingNames.includes(name.toLowerCase()));
        
        if (toAdd.length > 0) {
          const newObjs = toAdd.map(secName => ({
            id: `sec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            denominacion: secName
          }));
          const updatedSectoresObj = [...currentSectoresObj, ...newObjs];

          const { error: estErr } = await supabase
            .from('establecimientos')
            .update({ sectores: updatedSectoresObj })
            .eq('id', establecimientoId);

          if (!estErr) {
            setAllEstablecimientos(prev => prev.map(est =>
              est.id === establecimientoId ? { ...est, sectores: updatedSectoresObj } : est
            ));
            globalToast.toast('Nuevos sectores guardados en el perfil del establecimiento.', 'success');
          }
        }
      } catch (err) {
        console.error('Error guardando sectores en perfil:', err);
      }
    }
    setSyncQueue([]);
    executeSave(pendingEstado);
  };

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
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('denominacion', { ascending: true });
        setAllEstablecimientos(estsData || []);
      }

      // Fetch team members / profiles of the organization
      let mems = [];
      try {
        const { data: eqMems } = await supabase
          .from('miembros_equipo')
          .select('id, full_name, signature_url, profile_id')
          .eq('tenant_id', tenant.id)
          .order('full_name');

        const { data: profsData } = await supabase
          .from('profiles')
          .select('id, full_name, signature_url')
          .eq('tenant_id', tenant.id)
          .order('full_name');

        let dbMatriculas = [];
        try {
          const { data: mData } = await supabase
            .from('matriculas')
            .select('profile_id, institucion, numero');
          dbMatriculas = mData || [];
        } catch (mErr) {
          console.log('No tabla matriculas:', mErr);
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
      } catch (errMems) {
        console.error('Error cargando miembros de equipo:', errMems);
      }
      setMiembrosList(mems);

      // Auto-select logged-in professional details
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userMem = mems.find(m => m.id === session.user.id || m.profile_id === session.user.id);
          
          let userNombre = userMem?.nombre || '';
          let userMatricula = userMem?.matricula || '';
          let userSig = userMem?.signature_url || '';

          if (!userNombre) {
            const { data: currentProf } = await supabase
              .from('profiles')
              .select('id, full_name, signature_url, matricula, matricula_profesional')
              .eq('id', session.user.id)
              .maybeSingle();
            if (currentProf) {
              userNombre = currentProf.full_name || '';
              userSig = currentProf.signature_url || '';
              const uMatList = getMatriculasForProfile(session.user.id, currentProf.matricula, currentProf.matricula_profesional);
              userMatricula = uMatList.join(' / ');
            }
          }

          if (!editingId) {
            const autoSelectedId = userMem ? userMem.id : (mems.find(m => m.profile_id === session.user.id)?.id || session.user.id);
            setProfesionalId(autoSelectedId);
            if (userNombre) setProfesionalNombre(userNombre);
            if (userMatricula) setProfesionalMatricula(userMatricula);
            if (userSig) {
              setSignaturePath(userSig);
              setFirmaTipo('perfil');
            }
          }
        }
      } catch (sessErr) {
        console.warn('Error seleccionando profesional logueado:', sessErr);
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
          setFechaCalibracion(formatDate(proto.fecha_calibracion) || '');
          setMetodologia(proto.metodologia_utilizada || '');
          setFechaMedicion(formatDate(proto.fecha_medicion) || '');
          setHoraInicio(proto.hora_inicio || '');
          setHoraFinalizacion(proto.hora_finalizacion || '');
          setObservacionesGenerales(proto.observaciones || '');
          setDocumentacionAdjunta(proto.documentacion_adjunta || 'Croquis de la instalación eléctrica y ubicación de las tomas de tierra medidas.\nCertificado de calibración del telurímetro utilizado.');
          setInformacionAdicional(proto.informacion_adicional !== null && proto.informacion_adicional !== undefined ? proto.informacion_adicional : 'Se probó disparo de disyuntores. Tipo y corriente de disparo, dentro de parámetros.');
          setConclusiones(proto.conclusiones || 'Los valores hallados de la medición de la puesta a tierra cumplen con lo establecido en la Resolución 900/15.');
          setRecomendaciones(proto.recomendaciones || '');
          setEstado(proto.estado || 'borrador');
          setProfesionalNombre(proto.profesional_nombre || '');
          setProfesionalMatricula(proto.profesional_matricula || '');
          setFirmaBase64(proto.firma_profesional || '');
          setFirmaTipo(proto.firma_tipo || 'perfil');

          if (proto.firma_profesional) {
            if (proto.firma_tipo === 'mano') {
              setFirmaProfSavedUrl(proto.firma_profesional);
            } else {
              setSignaturePath(proto.firma_profesional);
            }
          }

          if (mems.length > 0 && proto.profesional_nombre) {
            const matchedMem = mems.find(m => m.nombre === proto.profesional_nombre);
            if (matchedMem) {
              setProfesionalId(matchedMem.id);
            }
          }

          // 2. Puntos de medición
          const { data: ptsData, error: ptsErr } = await supabase
            .from('protocolos_puesta_a_tierra_puntos')
            .select('*')
            .eq('protocolo_id', editingId)
            .order('orden');
          if (ptsErr) console.warn('Error cargando puntos:', ptsErr);

          let loadedPuntosList = [];
          if (ptsData && ptsData.length > 0) {
            loadedPuntosList = ptsData.map(p => ({
              ...p,
              evidencia_fotografica: Array.isArray(p.evidencia_fotografica) ? p.evidencia_fotografica : [],
              isCollapsed: false
            }));
            loadedPuntosList.sort((a, b) => (a.orden || 0) - (b.orden || 0));
          }

          // 3. Adjuntos
          const { data: adjData, error: adjErr } = await supabase
            .from('protocolos_puesta_a_tierra_adjuntos')
            .select('*')
            .eq('protocolo_id', editingId);
          if (adjErr) console.warn('Error cargando adjuntos:', adjErr);

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
            try {
              const { data: signedData } = await supabase.storage
                .from('protocolos-puesta-a-tierra')
                .createSignedUrls(pathsToSign, 3600);
              if (signedData) {
                signedData.forEach(item => {
                  if (item.signedUrl) signedUrlsMap[item.path] = item.signedUrl;
                });
              }
            } catch (sErr) {
              console.warn('Error firmando URLs de adjuntos:', sErr);
            }
          }

          const generalAdjuntos = [];
          const tomaPhotosMap = {};

          (adjData || []).forEach(ad => {
            const prevUrl = ad.storage_path?.startsWith('http') ? ad.storage_path : (signedUrlsMap[ad.storage_path] || ad.public_url || '');
            const origUrl = ad.original_path?.startsWith('http') ? ad.original_path : (signedUrlsMap[ad.original_path] || ad.original_path || ad.storage_path);

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

            const item = {
              id: ad.id,
              tipo: ad.tipo || 'Otro',
              name: ad.nombre_archivo || 'Archivo',
              path: ad.storage_path,
              preview: prevUrl,
              originalPath: ad.original_path || ad.storage_path,
              originalUrl: origUrl,
              markers: parsedMarkers
            };

            if (ad.tipo && ad.tipo.startsWith('Evidencia Fotográfica Toma N° ')) {
              const num = parseInt(ad.tipo.replace('Evidencia Fotográfica Toma N° ', ''), 10);
              if (!tomaPhotosMap[num]) tomaPhotosMap[num] = [];
              tomaPhotosMap[num].push(item);
            } else {
              generalAdjuntos.push(item);
            }
          });

          setAdjuntos(generalAdjuntos);

          if (loadedPuntosList.length > 0) {
            loadedPuntosList = loadedPuntosList.map((pt, idx) => {
              const tNum = pt.toma_tierra_num || (idx + 1);
              const extraEv = tomaPhotosMap[tNum] || [];
              return {
                ...pt,
                evidencia_fotografica: [...(pt.evidencia_fotografica || []), ...extraEv]
              };
            });
            setPuntos(loadedPuntosList);
          } else {
            setPuntos([createNewPunto(1)]);
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
      setEstablecimientoText(est.denominacion || est.nombre || '');
      setDireccionText(est.direccion || est.domicilio || est.direccion_calle || '');
      setProvinciaText(est.provincia || '');
      setLocalidadText(est.localidad_barrio || est.localidad || est.partido || '');
      setCpText(est.cp || est.codigo_postal || '');
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
  const estSectoresLocal = Array.isArray(activeEstablecimiento?.sectores)
    ? activeEstablecimiento.sectores.map(s => {
        if (typeof s === 'string') return { id: s, denominacion: s };
        const den = s.denominacion || s.nombre || s.id || '';
        return { id: s.id || den, denominacion: den };
      }).filter(s => s.denominacion)
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
        evidencia_fotografica: [],
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
      evidencia_fotografica: Array.isArray(targetPunto.evidencia_fotografica) ? [...targetPunto.evidencia_fotografica] : [],
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

  // Carga de evidencia fotográfica por toma (SySO Photo Grid)
  const handleAddPuntoFotos = async (puntoId, filesArray) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'dev-user';
      const uuid = editingId || crypto.randomUUID();

      const uploadedFiles = [];
      for (const file of filesArray) {
        const safeName = sanitizeFileName(file.name);
        const filename = `${userId}/${uuid}/toma_${puntoId}/${Date.now()}_${safeName}`;

        let bucketToUse = 'protocolos-puesta-a-tierra';
        let uploadRes = await supabase.storage
          .from(bucketToUse)
          .upload(filename, file, { cacheControl: '3600', upsert: true });

        if (uploadRes.error) {
          console.warn(`Error al subir a ${bucketToUse}, fallback a 'documents'...`, uploadRes.error);
          bucketToUse = 'documents';
          uploadRes = await supabase.storage
            .from(bucketToUse)
            .upload(filename, file, { cacheControl: '3600', upsert: true });
        }

        if (uploadRes.error) throw uploadRes.error;

        const { data: sData } = await supabase.storage
          .from(bucketToUse)
          .createSignedUrl(filename, 3600);

        uploadedFiles.push({
          id: 'foto-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          name: file.name,
          path: filename,
          storage_bucket: bucketToUse,
          preview: sData?.signedUrl || '',
          originalPath: filename
        });
      }

      setPuntos(prev => prev.map(pt => {
        if (pt.id === puntoId) {
          const currentEv = Array.isArray(pt.evidencia_fotografica) ? pt.evidencia_fotografica : [];
          return {
            ...pt,
            evidencia_fotografica: [...currentEv, ...uploadedFiles]
          };
        }
        return pt;
      }));

      globalToast.toast('Evidencia fotográfica agregada a la toma.', 'success');
    } catch (err) {
      console.error('Error cargando evidencia fotográfica:', err);
      globalToast.toast(`Error al subir imagen de evidencia: ${err.message || ''}`, 'error');
    }
  };

  const handleRemovePuntoFoto = (puntoId, fotoIdx) => {
    setPuntos(prev => prev.map(pt => {
      if (pt.id === puntoId) {
        const currentEv = Array.isArray(pt.evidencia_fotografica) ? pt.evidencia_fotografica : [];
        return {
          ...pt,
          evidencia_fotografica: currentEv.filter((_, i) => i !== fotoIdx)
        };
      }
      return pt;
    }));
  };

  const handleToggleCollapsePunto = (id) => {
    setPuntos(prev => prev.map(p => p.id === id ? { ...p, isCollapsed: !p.isCollapsed } : p));
  };

  const handlePuntoSectorChange = (puntoId, sectorVal) => {
    setPuntos(prev => prev.map(p => {
      if (p.id === puntoId) {
        if (sectorVal === '__custom__') {
          return { ...p, sector: '', isCustomSector: true };
        } else {
          const sec = estSectoresLocal.find(s => s.denominacion === sectorVal || s.id === sectorVal);
          return {
            ...p,
            sector: sec ? sec.denominacion : sectorVal,
            isCustomSector: false
          };
        }
      }
      return p;
    }));
  };

  const handlePuntoChange = (id, field, val) => {
    setPuntos(prev => prev.map(p => {
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



  const executeSave = async (nuevoEstado = 'finalizado') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sesión expirada.');

      let finalFirmaProf = firmaProfSavedUrl;
      if (firmaTipo === 'perfil') {
        finalFirmaProf = signaturePath || firmaPerfilPreviewUrl || '';
      } else if (firmaTipo === 'mano' && firmaProfCanvasRef.current && hasSignedProf) {
        finalFirmaProf = firmaProfCanvasRef.current.toDataURL('image/png');
      }

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
        firma_profesional: finalFirmaProf || firmaBase64 || null,
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
        sector: p.sector || null,
        condicion_terreno: p.condicion_terreno || null,
        uso_puesta_a_tierra: p.uso_puesta_a_tierra || null,
        esquema_conexion: p.esquema_conexion || null,
        valor_medido_ohm: parseFloat(p.valor_medido_ohm) || 0,
        cumple_ohm: p.cumple_ohm || null,
        continuidad_permanente: p.continuidad_permanente || null,
        capacidad_carga: p.capacidad_carga || null,
        dispositivo_proteccion: p.dispositivo_proteccion || null,
        desconexion_automatica: p.desconexion_automatica || null,
        observaciones_punto: p.observaciones_punto || null
      }));

      const { error: ptsErr } = await supabase
        .from('protocolos_puesta_a_tierra_puntos')
        .insert(ptsPayload);
      if (ptsErr) throw ptsErr;

      // 4. Procesar y guardar adjuntos (horneando marcadores sobre plano/croquis)
      setSaveLoading(true);

      const updatedAdjuntos = [...adjuntos];
      for (let i = 0; i < updatedAdjuntos.length; i++) {
        const ad = updatedAdjuntos[i];
        if ((ad.tipo === 'Evidencia Fotográfica Plano' || ad.tipo === 'Foto Plano') && ad.markers && ad.markers.length > 0) {
          let resolvedUrl = ad.originalPath || ad.path;
          if (!resolvedUrl.startsWith('http') && !resolvedUrl.startsWith('data:')) {
            const { data } = await supabase.storage
              .from('protocolos-puesta-a-tierra')
              .createSignedUrl(resolvedUrl, 3600);
            if (data?.signedUrl) {
              resolvedUrl = data.signedUrl;
            }
          }

          const bakedDataUrl = await bakeImageWithMarkers(resolvedUrl, ad.markers);
          if (bakedDataUrl) {
            const cleanName = ad.name || ad.nombre_archivo || `foto_${Date.now()}.jpg`;
            const blob = dataURLtoBlob(bakedDataUrl);
            const file = new File([blob], `baked_${Date.now()}_${cleanName.replace(/\s+/g, '_')}`, { type: 'image/jpeg' });
            
            const uuid = editingId || protoId;
            const filename = `${user.id}/${uuid}/adjuntos/${Date.now()}_baked_${cleanName.replace(/\s+/g, '_')}`;
            const { error: uploadErr } = await supabase.storage
              .from('protocolos-puesta-a-tierra')
              .upload(filename, file, { cacheControl: '3600', upsert: true });
              
            if (!uploadErr) {
              const { data: sData } = await supabase.storage
                .from('protocolos-puesta-a-tierra')
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

      // Reemplazar Adjuntos (Adjuntos generales + Evidencia fotográfica por toma)
      if (editingId) {
        await supabase
          .from('protocolos_puesta_a_tierra_adjuntos')
          .delete()
          .eq('protocolo_id', protoId);
      }

      const allAdjuntosToSave = [
        ...updatedAdjuntos.map(ad => {
          const hasMarkers = ad.markers && ad.markers.length > 0;
          let dbPreview = ad.preview;
          if (dbPreview && dbPreview.startsWith('data:')) {
            dbPreview = ''; // Evitar guardar base64 en la base de datos
          }

          return {
            protocolo_id: protoId,
            tipo: ad.tipo || 'fotografia',
            nombre_archivo: ad.name || ad.nombre_archivo,
            storage_path: hasMarkers ? ad.path : (ad.originalPath || ad.path || ad.storage_path),
            public_url: hasMarkers ? dbPreview : (ad.originalPath && ad.originalPath.startsWith('http') ? ad.originalPath : dbPreview),
            original_path: ad.originalPath || ad.path || ad.storage_path,
            markers: ad.markers || [],
            created_by: user.id
          };
        }),
        ...puntos.flatMap((p, i) =>
          (Array.isArray(p.evidencia_fotografica) ? p.evidencia_fotografica : []).map(ev => ({
            protocolo_id: protoId,
            tipo: `Evidencia Fotográfica Toma N° ${i + 1}`,
            nombre_archivo: ev.name || ev.nombre_archivo || 'Evidencia.jpg',
            storage_path: ev.path || ev.storage_path || ev.originalPath || '',
            public_url: (ev.preview && ev.preview.startsWith('data:')) ? '' : (ev.preview || ev.public_url || ''),
            original_path: ev.originalPath || ev.path || ev.storage_path || '',
            markers: [],
            created_by: user.id
          }))
        )
      ];

      if (allAdjuntosToSave.length > 0) {
        const { error: adjErr } = await supabase
          .from('protocolos_puesta_a_tierra_adjuntos')
          .insert(allAdjuntosToSave);
        if (adjErr) {
          console.error('Error guardando adjuntos:', adjErr);
          throw adjErr;
        }
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
      <div className="bg-white border-y border-x-0 md:border md:border-slate-200 md:rounded-2xl shadow-sm overflow-hidden flex flex-col flex-grow min-h-0 md:h-[calc(100vh-140px)]">
        <AppLoadingSpinner message="Cargando protocolo de puesta a tierra..." />
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
              context="Observaciones sobre la medición de puesta a tierra y continuidad de masas"
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

        {/* CARD DOCUMENTACIÓN QUE SE ADJUNTARÁ */}
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
              context="Listado de anexos técnicos y documentación adjunta a la medición de puesta a tierra (Res. SRT 900/15)"
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
                            placeholder={null}
                            disabled={!establecimientoId || !canEdit}
                            value={
                              estSectoresLocal.some(s => s.denominacion.toLowerCase() === (p.sector || '').toLowerCase())
                                ? (estSectoresLocal.find(s => s.denominacion.toLowerCase() === (p.sector || '').toLowerCase())?.denominacion || p.sector)
                                : (p.isCustomSector || (p.sector && !estSectoresLocal.some(s => s.denominacion.toLowerCase() === (p.sector || '').toLowerCase())) ? '__custom__' : '')
                            }
                            onChange={(e) => handlePuntoSectorChange(p.id, e.target.value)}
                          >
                            <option value="">Selecciona sector...</option>
                            {estSectoresLocal.map((s, sIdx) => (
                              <option key={s.id || sIdx} value={s.denominacion}>{s.denominacion}</option>
                            ))}
                            <option value="__custom__">+ Ingresar sector manual...</option>
                          </AppSelect>
                        )}
                        {(p.isCustomSector || (p.sector && !estSectoresLocal.some(s => s.denominacion.toLowerCase() === (p.sector || '').toLowerCase()))) && canEdit && !isReadOnly && (
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

                    {/* SySO-Multiple-Evidence-Photo-Grid POR TOMA */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Camera className="h-4 w-4 text-[#468DFF]" />
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Evidencia Fotográfica de la Toma
                        </span>
                      </div>
                      <ImageUploadZone
                        label={`Fotografías de evidencia - Toma N° ${p.toma_tierra_num}`}
                        disabled={!canEdit}
                        multiple={true}
                        maxSizeMB={5}
                        images={(p.evidencia_fotografica || []).map(f => ({
                          id: f.id,
                          preview: f.preview || f.public_url || f.path,
                          name: f.name || f.nombre_archivo || 'Evidencia'
                        }))}
                        onAddPhotos={async (filesArray) => {
                          await handleAddPuntoFotos(p.id, filesArray);
                        }}
                        onRemovePhoto={(fotoIdx) => {
                          handleRemovePuntoFoto(p.id, fotoIdx);
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </AppCard>

        {/* CARD: INFORMACIÓN ADICIONAL */}
        <AppCard className="p-4 sm:p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-[#468DFF]" />
              <h2 className="font-outfit text-base font-extrabold text-slate-800">
                Información Adicional
              </h2>
            </div>
            <AITextHelper
              disabled={!canEdit}
              value={informacionAdicional}
              onChange={setInformacionAdicional}
              context="Información adicional sobre el estado de la instalación y mediciones de puesta a tierra"
            />
          </div>

          <div className="flex flex-col gap-1 col-span-full">
            <AppTextarea
              id="informacionAdicional"
              disabled={!canEdit}
              rows={3}
              value={informacionAdicional}
              onChange={(e) => setInformacionAdicional(e.target.value)}
              placeholder="Se probó disparo de disyuntores. Tipo y corriente de disparo, dentro de parámetros."
            />
          </div>
        </AppCard>

        {/* CARD: ANÁLISIS DE LOS DATOS Y MEJORAS A REALIZAR */}
        <AppCard className="p-4 sm:p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CheckCircle2 className="h-5 w-5 text-[#468DFF]" />
            <h2 className="font-outfit text-base font-extrabold text-slate-800">Análisis de los Datos y Mejoras a Realizar</h2>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1 col-span-full">
              <div className="flex items-center justify-between">
                <AppLabel htmlFor="conclusiones">Conclusiones</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={conclusiones}
                  onChange={setConclusiones}
                  context="Conclusiones sobre el cumplimiento de los valores de puesta a tierra (Res. SRT 900/15)"
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

            <div className="flex flex-col gap-1 col-span-full">
              <div className="flex items-center justify-between">
                <AppLabel htmlFor="recomendaciones">Recomendaciones para adecuar la instalación</AppLabel>
                <AITextHelper
                  disabled={!canEdit}
                  value={recomendaciones}
                  onChange={setRecomendaciones}
                  context="Recomendaciones para la adecuación de la puesta a tierra a la legislación vigente (Res. SRT 900/15)"
                />
              </div>
              <AppTextarea
                id="recomendaciones"
                disabled={!canEdit}
                rows={4}
                value={recomendaciones}
                onChange={(e) => setRecomendaciones(e.target.value)}
                placeholder="Ej: Mantener limpio y libre de óxido las terminales de las jabalinas, independizar descargas..."
              />
            </div>
          </div>
        </AppCard>

        {/* CARD: DOCUMENTACIÓN ADJUNTA */}
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
                        Carga del certificado oficial de calibración del telurímetro utilizado.
                      </p>
                    </div>
                  </div>

                  <DocumentUploadZone
                    label="Certificado de Calibración (PDF / Documento)"
                    fileName={certificadoAdjunto?.name || certificadoAdjunto?.nombre_archivo}
                    url={certificadoAdjunto?.preview || certificadoAdjunto?.public_url}
                    signedUrl={certificadoAdjunto?.preview || certificadoAdjunto?.public_url}
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

                  <div className="pt-2">
                    <ImageUploadZone
                      label="Imágenes del plano o croquis del establecimiento"
                      disabled={!canEdit}
                      multiple={true}
                      maxSizeMB={5}
                      images={planoFotosAdjuntos.map(f => ({
                        id: f.id,
                        preview: f.preview || f.public_url || f.path,
                        name: f.name || f.nombre_archivo
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
                              .from('protocolos-puesta-a-tierra')
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
              type="button"
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
                  aria-checked={estado === 'completado' || estado === 'finalizado'}
                  onClick={() => setEstado((estado === 'completado' || estado === 'finalizado') ? 'borrador' : 'completado')}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    (estado === 'completado' || estado === 'finalizado') ? 'bg-[#468DFF]' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      (estado === 'completado' || estado === 'finalizado') ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>

                <span className={`text-xs font-bold ${(estado === 'completado' || estado === 'finalizado') ? 'text-[#468DFF]' : 'text-slate-400'}`}>
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
                      router.push(`/${tenantSlug}/protocolos/puesta-a-tierra/${editingId}/editar`);
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

      {/* Diálogo de Confirmación para Eliminar Protocolo */}
      <AppConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        type="destructive"
        title="Eliminar Protocolo"
        description="¿Está seguro de que desea eliminar permanentemente este protocolo de puesta a tierra y todos sus puntos de muestreo y mediciones asociados? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      {/* Diálogo de Cambios No Guardados */}
      <AppUnsavedChangesDialog
        open={unsavedDialogOpen}
        onOpenChange={setUnsavedDialogOpen}
        onLeave={() => {
          setUnsavedDialogOpen(false);
          onClose();
        }}
      />

      {/* MODAL DE SINCRONIZACIÓN CON PERFIL DE ESTABLECIMIENTO */}
      {isSyncOpen && syncQueue.length > 0 && (
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
    </div>
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

    setPoints(prev => [...prev, { x, y, createdAt: Date.now() }]);
  };

  const handleUndo = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPoints([]);
  };

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
        
        currentNumberedPoints.forEach((p) => {
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
