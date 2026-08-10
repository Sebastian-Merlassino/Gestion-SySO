// src/app/[tenant-slug]/capacitaciones-online/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';
import AppPageHeader from '@/components/ui/AppPageHeader';
import AppEmptyState from '@/components/ui/AppEmptyState';
import AppButton from '@/components/ui/AppButton';
import AppSortIcon from '@/components/ui/AppSortIcon';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import DocumentUploadZone from '@/components/ui/DocumentUploadZone';
import AITextHelper from '@/components/ui/AITextHelper';
import { generateCapacitacionOnlinePdf } from './utils/pdfGenerator';
import { 
  GraduationCap, 
  PlusCircle, 
  Search, 
  Building, 
  Users, 
  Tv, 
  FileText, 
  Share2, 
  Download, 
  Trash2, 
  Edit, 
  X, 
  Loader2, 
  ShieldCheck, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeft, 
  AlertTriangle, 
  MapPin,
  User,
  HelpCircle
} from 'lucide-react';

export default function CapacitacionesOnlinePage({ params }) {
  const tenantSlug = params['tenant-slug'];
  const globalToast = useToast();

  // Estados estructurales
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Permisos granulares
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

  const sectionPerms = getSectionPermissions(profile, 'capacitaciones-online');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;

  // Datos principales
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [filterEmpresaId, setFilterEmpresaId] = useState('');
  const [filterEstablecimientoId, setFilterEstablecimientoId] = useState('');
  const [filterText, setFilterText] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Ordenamiento de tabla
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Estados de Formulario y Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);

  // Form State
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [metodologia, setMetodologia] = useState('Asincrónica con PowerPoint/PDF');
  const [duracionValor, setDuracionValor] = useState('45');
  const [duracionUnidad, setDuracionUnidad] = useState('min');
  const [asignacionTipo, setAsignacionTipo] = useState('puesto');
  const [targetPuesto, setTargetPuesto] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentoFile, setDocumentoFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');

  // Modal Firmantes / Registros
  const [viewRegistrosModal, setViewRegistrosModal] = useState({ show: false, capacitacion: null, registros: [], loading: false });

  // Modal Unificado de Compartir (WhatsApp / Email / Enlace)
  const [shareModal, setShareModal] = useState({
    show: false,
    capacitacion: null,
    publicUrl: '',
    activeTab: 'whatsapp',
    phone: '',
    email: '',
    subject: '',
    message: ''
  });

  // Diálogos de confirmación
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, title: '' });
  const [unsavedDialog, setUnsavedDialog] = useState({ show: false, pendingAction: null });
  const [formIsDirty, setFormIsDirty] = useState(false);
  const [showPptTipModal, setShowPptTipModal] = useState(false);

  // Helper para mostrar puestos reales en la tabla
  const getItemPuestos = (item) => {
    if (!item) return 'Todo el personal';
    if (item.target_puesto && !item.target_puesto.toLowerCase().includes('nombre 1') && !item.target_puesto.toLowerCase().includes('nombre 2')) {
      return item.target_puesto;
    }
    if (Array.isArray(item.empleados_asignados) && item.empleados_asignados.length > 0) {
      const puestosSet = new Set();
      item.empleados_asignados.forEach(emp => {
        if (typeof emp === 'object' && emp?.puesto && emp.puesto.trim()) {
          puestosSet.add(emp.puesto.trim());
        }
      });
      const list = Array.from(puestosSet);
      if (list.length > 0) return list.join(', ');
    }
    return 'Todo el personal';
  };

  // Estado de puestos dinamicos traidos de nomina
  const [availablePuestos, setAvailablePuestos] = useState([]);
  const [loadingPuestos, setLoadingPuestos] = useState(false);

  // Estado de seleccion multiple de puestos
  const [selectedPuestos, setSelectedPuestos] = useState([]);
  const [customPuestoInput, setCustomPuestoInput] = useState('');
  const [isPuestosDropdownOpen, setIsPuestosDropdownOpen] = useState(false);

  // Estado de seleccion multiple de trabajadores de la nomina
  const [availableEmpleados, setAvailableEmpleados] = useState([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);
  const [selectedEmpleados, setSelectedEmpleados] = useState([]);
  const [isEmpleadosDropdownOpen, setIsEmpleadosDropdownOpen] = useState(false);
  const [customEmpleadoNombre, setCustomEmpleadoNombre] = useState('');
  const [customEmpleadoDni, setCustomEmpleadoDni] = useState('');
  const [customEmpleadoPuesto, setCustomEmpleadoPuesto] = useState('');

  // Estado del catálogo de Temas de Capacitación y selección múltiple
  const [catalogTemas, setCatalogTemas] = useState([]);
  const [loadingTemas, setLoadingTemas] = useState(false);
  const [selectedTemas, setSelectedTemas] = useState([]);
  const [customTemaInput, setCustomTemaInput] = useState('');
  const [isTemasDropdownOpen, setIsTemasDropdownOpen] = useState(false);

  // Sincronizar temas seleccionados con titulo como string separado por comas
  // Sincronizar temas seleccionados con titulo y autocompletar el campo Contenido
  useEffect(() => {
    setTitulo(selectedTemas.join(', '));

    if (selectedTemas.length === 0) {
      return;
    }

    const itemsWithContent = [];
    selectedTemas.forEach(temaName => {
      const match = catalogTemas.find(c => c.tema === temaName);
      if (match && match.contenido && match.contenido !== 'N/A' && match.contenido.trim() !== '') {
        itemsWithContent.push(`• ${match.tema}:\n  ${match.contenido}`);
      } else {
        itemsWithContent.push(`• ${temaName}`);
      }
    });

    if (itemsWithContent.length > 0) {
      setDescripcion(itemsWithContent.join('\n'));
    }
  }, [selectedTemas, catalogTemas]);

  // Sincronizar puestos seleccionados con targetPuesto como string separado por comas
  useEffect(() => {
    setTargetPuesto(selectedPuestos.join(', '));
  }, [selectedPuestos]);

  const handleFileChange = (file) => {
    setDocumentoFile(file);
    if (file) {
      setSelectedFileName(file.name);
    } else {
      setSelectedFileName('');
    }
    setFormIsDirty(true);
  };

  const handleViewPdf = async (urlToView) => {
    const targetUrl = urlToView || documentUrl;
    if (!targetUrl) return;

    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      window.open(targetUrl, '_blank');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(targetUrl, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (err) {
      console.error('Error al visualizar PDF:', err);
      globalToast.toast('No se pudo abrir el documento.', 'error');
    }
  };

  // Carga inicial de datos
  useEffect(() => {
    fetchInitialData();
  }, [tenantSlug]);

  // Carga dinamica de puestos segun el Perfil del Cliente (y en su defecto de nomina)
  useEffect(() => {
    if (!empresaId || !profile?.tenant_id) {
      setAvailablePuestos([]);
      return;
    }

    const fetchPuestos = async () => {
      setLoadingPuestos(true);
      try {
        // 1. Prioridad Principal: Consultar unicamente los puestos declarados en el Perfil del Cliente (establecimientos -> sectores -> puestos)
        let estQuery = supabase
          .from('establecimientos')
          .select('id, denominacion, sectores')
          .eq('tenant_id', profile.tenant_id)
          .eq('empresa_id', empresaId);

        if (establecimientoId) {
          estQuery = estQuery.eq('id', establecimientoId);
        }

        const { data: estabsData, error: estErr } = await estQuery;

        let profileItems = [];

        if (!estErr && estabsData && estabsData.length > 0) {
          estabsData.forEach(est => {
            const sectoresArray = est.sectores || [];
            if (Array.isArray(sectoresArray)) {
              sectoresArray.forEach(sec => {
                if (Array.isArray(sec.puestos)) {
                  sec.puestos.forEach(pst => {
                    const pstName = typeof pst === 'string' ? pst : pst?.denominacion;
                    if (pstName && pstName.trim()) {
                      profileItems.push(pstName.trim());
                    }
                  });
                }
              });
            }
          });
        }

        let uniqueItems = Array.from(new Set(profileItems.filter(Boolean)));

        // 2. En su defecto: Si no se declararon puestos en el Perfil del Cliente, buscar puestos en la Nomina de Personal
        if (uniqueItems.length === 0) {
          let nominaQuery = supabase
            .from('nomina_personal')
            .select('puesto')
            .eq('tenant_id', profile.tenant_id)
            .eq('empresa_id', empresaId)
            .not('puesto', 'is', null);

          if (establecimientoId) {
            nominaQuery = nominaQuery.eq('establecimiento_id', establecimientoId);
          }

          const { data: nominaData, error: nominaErr } = await nominaQuery;
          if (!nominaErr && nominaData) {
            const nominaItems = nominaData
              .map(item => item.puesto?.trim())
              .filter(Boolean);
            uniqueItems = Array.from(new Set(nominaItems));
          }
        }

        uniqueItems.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        setAvailablePuestos(uniqueItems);
      } catch (err) {
        console.error('Error al cargar puestos:', err);
        setAvailablePuestos([]);
      } finally {
        setLoadingPuestos(false);
      }
    };

    fetchPuestos();
  }, [empresaId, establecimientoId, profile?.tenant_id]);

  // Carga dinamica de trabajadores de la Nomina de Personal segun Empresa y Establecimiento
  useEffect(() => {
    if (!empresaId || !profile?.tenant_id) {
      setAvailableEmpleados([]);
      return;
    }

    const fetchEmpleados = async () => {
      setLoadingEmpleados(true);
      try {
        let query = supabase
          .from('nomina_personal')
          .select('id, nombre_apellido, cuil, puesto, area_sector')
          .eq('tenant_id', profile.tenant_id)
          .eq('empresa_id', empresaId);

        if (establecimientoId) {
          query = query.eq('establecimiento_id', establecimientoId);
        }

        const { data, error } = await query.order('nombre_apellido');

        if (!error && data) {
          setAvailableEmpleados(data || []);
        } else {
          setAvailableEmpleados([]);
        }
      } catch (err) {
        console.error('Error al cargar empleados de la nomina:', err);
        setAvailableEmpleados([]);
      } finally {
        setLoadingEmpleados(false);
      }
    };

    fetchEmpleados();
  }, [empresaId, establecimientoId, profile?.tenant_id]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*, tenants(*)')
        .eq('id', user.id)
        .single();
      
      setProfile(prof);
      setTenant(prof?.tenants);

      if (prof?.role === 'cliente') {
        setIsReadOnlyView(true);
      }

      if (prof?.tenant_id) {
        const { data: emps } = await supabase
          .from('empresas')
          .select('id, razon_social, cuit')
          .eq('tenant_id', prof.tenant_id)
          .order('razon_social');
        setEmpresas(emps || []);

        const { data: estabs } = await supabase
          .from('establecimientos')
          .select('id, empresa_id, denominacion')
          .eq('tenant_id', prof.tenant_id);
        setAllEstablecimientos(estabs || []);

        setLoadingTemas(true);
        const { data: temasData } = await supabase
          .from('temas_capacitacion')
          .select('id, tema, contenido')
          .order('tema');
        setCatalogTemas(temasData || []);
        setLoadingTemas(false);

        await fetchCapacitaciones(prof.tenant_id);
      }
    } catch (err) {
      console.error('Error al cargar datos iniciales:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCapacitaciones = async (tenantId) => {
    const tId = tenantId || profile?.tenant_id;
    if (!tId) return;

    try {
      const { data, error } = await supabase
        .from('capacitaciones_online')
        .select(`
          *,
          empresas ( razon_social ),
          establecimientos ( denominacion ),
          capacitaciones_online_registros ( count )
        `)
        .eq('tenant_id', tId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Advertencia al consultar tabla capacitaciones_online:', error.message);
      } else {
        setCapacitaciones(data || []);
      }
    } catch (err) {
      console.error('Error al obtener capacitaciones:', err);
    }
  };

  // Apertura del Formulario
  const handleAddNew = () => {
    setEditingId(null);
    setIsReadOnlyView(false);
    setEmpresaId('');
    setEstablecimientoId('');
    setTitulo('');
    setDescripcion('');
    setMetodologia('Asincrónica con PowerPoint/PDF');
    setDuracionValor('45');
    setDuracionUnidad('min');
    setAsignacionTipo('puesto');
    setTargetPuesto('');
    setSelectedPuestos([]);
    setCustomPuestoInput('');
    setIsPuestosDropdownOpen(false);
    setSelectedEmpleados([]);
    setCustomEmpleadoNombre('');
    setCustomEmpleadoDni('');
    setCustomEmpleadoPuesto('');
    setIsEmpleadosDropdownOpen(false);
    setSelectedTemas([]);
    setCustomTemaInput('');
    setIsTemasDropdownOpen(false);
    setVideoUrl('');
    setDocumentUrl('');
    setDocumentoFile(null);
    setSelectedFileName('');
    setFormIsDirty(false);
    setIsFormOpen(true);
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setEmpresaId(item.empresa_id || '');
    setEstablecimientoId(item.establecimiento_id || '');
    setTitulo(item.titulo || '');
    setDescripcion(item.descripcion || '');
    setMetodologia(item.metodologia || (item.video_url ? 'Asincrónica con video' : 'Asincrónica con PowerPoint/PDF'));
    
    if (item.duracion) {
      const hsMatch = item.duracion.match(/(\d+)\s*hs?/i);
      const minMatch = item.duracion.match(/(\d+)\s*min/i);
      if (hsMatch) {
        setDuracionValor(hsMatch[1]);
        setDuracionUnidad('hs');
      } else if (minMatch) {
        setDuracionValor(minMatch[1]);
        setDuracionUnidad('min');
      } else {
        const numMatch = item.duracion.match(/(\d+)/);
        setDuracionValor(numMatch ? numMatch[1] : '45');
        setDuracionUnidad(item.duracion.toLowerCase().includes('hs') ? 'hs' : 'min');
      }
    } else {
      setDuracionValor('45');
      setDuracionUnidad('min');
    }

    setAsignacionTipo(item.asignacion_tipo || 'puesto');
    setTargetPuesto(item.target_puesto || '');
    
    const initialPuestos = item.target_puesto
      ? item.target_puesto.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    setSelectedPuestos(initialPuestos);
    setCustomPuestoInput('');
    setIsPuestosDropdownOpen(false);

    const initialTemas = item.titulo
      ? item.titulo.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    setSelectedTemas(initialTemas);
    setCustomTemaInput('');
    setIsTemasDropdownOpen(false);

    if (item.asignacion_tipo === 'nomina' && Array.isArray(item.empleados_asignados)) {
      setSelectedEmpleados(item.empleados_asignados);
    } else {
      setSelectedEmpleados([]);
    }
    setCustomEmpleadoNombre('');
    setCustomEmpleadoDni('');
    setCustomEmpleadoPuesto('');
    setIsEmpleadosDropdownOpen(false);

    setVideoUrl(item.video_url || '');
    setDocumentUrl(item.document_url || '');
    setDocumentoFile(null);
    setSelectedFileName(item.document_url ? 'Documento adjunto' : '');
    setFormIsDirty(false);
    setIsFormOpen(true);
  };

  const handleExitForm = () => {
    if (formIsDirty) {
      setUnsavedDialog({ show: true, pendingAction: () => setIsFormOpen(false) });
    } else {
      setIsFormOpen(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!titulo.trim()) {
      globalToast.toast('El título de la capacitación es obligatorio.', 'warning');
      return;
    }

    if (!empresaId) {
      globalToast.toast('Debe seleccionar una Razón Social (Empresa).', 'warning');
      return;
    }

    if (!videoUrl && !documentUrl) {
      globalToast.toast('Debe incluir al menos un video de YouTube o un documento PDF/PPT.', 'warning');
      return;
    }

    setSaving(true);
    try {
      let finalDocUrl = documentUrl;

      if (documentoFile) {
        const fileExt = documentoFile.name.split('.').pop();
        const filePath = `${profile.id}/capacitaciones_${crypto.randomUUID()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(filePath, documentoFile, { upsert: true });

        if (uploadErr) {
          console.error('Error al subir documento:', uploadErr);
          globalToast.toast('Error al subir el archivo adjunto.', 'error');
          setSaving(false);
          return;
        }
        finalDocUrl = filePath;
      }

      if (!videoUrl && !finalDocUrl) {
        globalToast.toast('Debe incluir al menos un video de YouTube o un documento PDF/PPT.', 'warning');
        setSaving(false);
        return;
      }

      const targetPuestoFormatted = asignacionTipo === 'puesto'
        ? targetPuesto?.trim() || null
        : (Array.from(new Set(selectedEmpleados.map(e => (typeof e === 'object' ? e.puesto : '')).filter(Boolean))).join(', ') || null);

      const duracionFinal = duracionValor?.trim() ? `${duracionValor.trim()} ${duracionUnidad}` : `45 min`;

      const payload = {
        tenant_id: profile.tenant_id,
        empresa_id: empresaId,
        establecimiento_id: establecimientoId || null,
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || null,
        metodologia: metodologia,
        duracion: duracionFinal,
        asignacion_tipo: asignacionTipo,
        target_puesto: targetPuestoFormatted || null,
        empleados_asignados: asignacionTipo === 'nomina' ? selectedEmpleados : [],
        material_tipo: (videoUrl && finalDocUrl) ? 'mixto' : (videoUrl ? 'video' : 'pdf'),
        video_url: videoUrl?.trim() || null,
        document_url: finalDocUrl || null,
        estado: 'activa',
        created_by: profile.id
      };

      if (editingId) {
        const { error } = await supabase
          .from('capacitaciones_online')
          .update(payload)
          .eq('id', editingId)
          .eq('tenant_id', profile.tenant_id);

        if (error) throw error;
        globalToast.toast('Capacitación actualizada exitosamente.', 'success');
      } else {
        const { error } = await supabase
          .from('capacitaciones_online')
          .insert([payload]);

        if (error) throw error;
        globalToast.toast('Nueva capacitación online creada exitosamente.', 'success');
      }

      setIsFormOpen(false);
      setFormIsDirty(false);
      await fetchCapacitaciones(profile.tenant_id);
    } catch (err) {
      console.error('Error al guardar capacitación:', err);
      globalToast.toast('Ocurrió un error al guardar la capacitación.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      const { error } = await supabase
        .from('capacitaciones_online')
        .delete()
        .eq('id', deleteConfirm.id)
        .eq('tenant_id', profile.tenant_id);

      if (error) throw error;
      globalToast.toast('Capacitación eliminada correctamente.', 'success');
      setDeleteConfirm({ show: false, id: null, title: '' });
      await fetchCapacitaciones(profile.tenant_id);
    } catch (err) {
      console.error('Error al eliminar capacitación:', err);
      globalToast.toast('No se pudo eliminar la capacitación.', 'error');
    }
  };

  // Abrir Diálogo Unificado de Compartir
  const handleOpenShareModal = (item, e) => {
    e?.stopPropagation();
    const token = item.access_token || item.id;
    const publicUrl = `${window.location.origin}/capacitar/${token}`;

    const emp = empresas.find(e => e.id === item.empresa_id);
    const defaultEmail = emp?.contactos_correos?.[0]?.valor || '';

    setShareModal({
      show: true,
      capacitacion: item,
      publicUrl,
      activeTab: 'whatsapp',
      phone: '',
      email: defaultEmail,
      subject: `Capacitación Virtual SySO: ${item.titulo}`,
      message: `Hola, les compartimos el enlace para ingresar a la capacitación virtual: "${item.titulo}".\n\nPor favor ingrese al siguiente enlace para revisar el material y registrar su firma de asistencia:\n${publicUrl}\n\nGestión SySO`
    });
  };

  // Copiar Enlace Público Directo
  const handleCopyPublicLink = (item, e) => {
    e?.stopPropagation();
    let publicUrl = '';

    if (typeof item === 'string') {
      publicUrl = item.startsWith('http://') || item.startsWith('https://') 
        ? item 
        : `${window.location.origin}/capacitar/${item}`;
    } else if (item) {
      const token = item.access_token || item.id;
      publicUrl = `${window.location.origin}/capacitar/${token}`;
    }

    if (publicUrl) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(publicUrl);
        globalToast.toast('Enlace público copiado al portapapeles. Listo para enviar por WhatsApp o correo.', 'success');
      } else {
        globalToast.toast(`Enlace público: ${publicUrl}`, 'info');
      }
    }
  };

  // Ver Lista de Firmantes
  const handleOpenRegistrosModal = async (item, e) => {
    e?.stopPropagation();
    setViewRegistrosModal({ show: true, capacitacion: item, registros: [], loading: true });
    try {
      const { data, error } = await supabase
        .from('capacitaciones_online_registros')
        .select('*')
        .eq('capacitacion_id', item.id)
        .eq('tenant_id', profile.tenant_id)
        .order('registrado_at', { ascending: false });

      if (error) throw error;
      setViewRegistrosModal({ show: true, capacitacion: item, registros: data || [], loading: false });
    } catch (err) {
      console.error('Error al cargar registos de firmas:', err);
      globalToast.toast('Error al obtener la lista de firmantes.', 'error');
      setViewRegistrosModal({ show: false, capacitacion: null, registros: [], loading: false });
    }
  };

  // Generar Reporte PDF
  const handleDownloadPdf = async (item, e) => {
    e?.stopPropagation();
    globalToast.toast('Generando reporte PDF de asistencia...', 'info');
    try {
      const { data: registrosData } = await supabase
        .from('capacitaciones_online_registros')
        .select('*')
        .eq('capacitacion_id', item.id)
        .eq('tenant_id', profile.tenant_id)
        .order('registrado_at', { ascending: true });

      const emp = empresas.find(e => e.id === item.empresa_id);

      await generateCapacitacionOnlinePdf({
        capacitacion: item,
        registros: registrosData || [],
        tenant: tenant,
        empresa: emp
      });

      globalToast.toast('Reporte PDF generado exitosamente.', 'success');
    } catch (err) {
      console.error('Error al generar PDF de capacitación:', err);
      globalToast.toast('No se pudo generar el reporte PDF.', 'error');
    }
  };

  // Manejo de ordenamiento de columnas
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtrado de capacitaciones
  const filteredCapacitaciones = capacitaciones.filter(item => {
    const matchesEmpresa = !filterEmpresaId || item.empresa_id === filterEmpresaId;
    const matchesEstablecimiento = !filterEstablecimientoId || item.establecimiento_id === filterEstablecimientoId;
    const matchesSearch = !filterText || 
      item.titulo?.toLowerCase().includes(filterText.toLowerCase()) ||
      item.target_puesto?.toLowerCase().includes(filterText.toLowerCase());
    return matchesEmpresa && matchesEstablecimiento && matchesSearch;
  });

  // Ordenamiento ordenado
  const sortedCapacitaciones = [...filteredCapacitaciones].sort((a, b) => {
    let valA = '';
    let valB = '';

    if (sortField === 'cliente') {
      valA = a.empresas?.razon_social || '';
      valB = b.empresas?.razon_social || '';
    } else if (sortField === 'titulo') {
      valA = a.titulo || '';
      valB = b.titulo || '';
    } else if (sortField === 'puesto') {
      valA = a.target_puesto || '';
      valB = b.target_puesto || '';
    } else if (sortField === 'created_at') {
      valA = a.created_at || '';
      valB = b.created_at || '';
    }

    if (sortOrder === 'asc') {
      return valA.localeCompare(valB);
    } else {
      return valB.localeCompare(valA);
    }
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.removeItem('user-profile');
    }
    window.location.href = '/login';
  };

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      {/* Sidebar de navegación */}
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="capacitaciones-online"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-grow flex flex-col min-w-0 overflow-y-auto">
        <AppPageHeader
          title="Capacitaciones Online"
          icon={GraduationCap}
          tenantName={tenant?.name || 'Gestión SySO'}
          planId={tenant?.plan_id || profile?.tenants?.plan_id}
          showPlanBadge={profile && profile.role !== 'cliente'}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {loading ? (
          <div className="flex-grow flex items-center justify-center p-8">
            <div className="text-center space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Cargando capacitaciones online...</p>
            </div>
          </div>
        ) : (
          <div className="w-full flex-grow flex flex-col min-h-0 p-0 md:py-8 md:max-w-[95%] md:mx-auto md:px-0">
            
            {isFormOpen ? (
              /* FORMULARIO DE ALTA Y EDICIÓN (MATCHING CONTROL-ELECTRICO / PROGRAMA) */
              <div className="bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden flex flex-col h-full md:h-[calc(100vh-128px)] animate-fade-in w-full">
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={handleExitForm}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-xs sm:text-sm md:text-base font-bold text-slate-900 truncate max-w-[55vw] sm:max-w-none">
                      {isReadOnlyView ? 'Detalle / Visualización de Capacitación Online' : editingId ? 'Detalle / Editar Capacitación Online' : 'Registrar Nueva Capacitación Online'}
                    </span>
                  </div>
                  <button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="overflow-y-auto flex-1 scrollbar-thin p-3.5 sm:p-6 space-y-4 sm:space-y-6">
                  <fieldset disabled={isReadOnlyView} className="space-y-4 sm:space-y-6">
                    
                    {/* Sección 1: Cliente y Puesto */}
                    <div className="space-y-4">
                      <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                        <Building className="h-4 w-4 text-[#468DFF]" />
                        1. Cliente / Empresa y Alcance de Asignación
                      </h3>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-600 block">
                            Cliente / Razón Social *
                          </label>
                          <select
                            required
                            value={empresaId}
                            onChange={(e) => {
                              setEmpresaId(e.target.value);
                              setEstablecimientoId('');
                              setFormIsDirty(true);
                            }}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer text-slate-700 font-normal"
                          >
                            <option value="" disabled>Selecciona el cliente...</option>
                            {empresas.map((emp) => (
                              <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-600 block">
                            Establecimiento
                          </label>
                          <select
                            disabled={!empresaId}
                            value={establecimientoId}
                            onChange={(e) => {
                              setEstablecimientoId(e.target.value);
                              setFormIsDirty(true);
                            }}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 text-slate-700 font-normal"
                          >
                            <option value="">
                              {!empresaId ? 'Primero selecciona un cliente' : 'Todos los establecimientos'}
                            </option>
                            {allEstablecimientos
                              .filter(est => est.empresa_id === empresaId)
                              .map((est) => (
                                <option key={est.id} value={est.id}>{est.denominacion}</option>
                              ))
                            }
                          </select>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-600 block">
                            Tipo de Asignación *
                          </label>
                          <select
                            value={asignacionTipo}
                            onChange={(e) => {
                              setAsignacionTipo(e.target.value);
                              setFormIsDirty(true);
                            }}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer text-slate-700 font-normal"
                          >
                            <option value="puesto">Por Puesto de Trabajo</option>
                            <option value="nomina">Por Nómina de Personal</option>
                          </select>
                        </div>

                        {asignacionTipo === 'puesto' && (
                          <div className="flex flex-col gap-1.5 relative">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-600 block">
                                Puesto / Puestos Afectados *
                              </label>
                              {loadingPuestos && (
                                <span className="text-[10px] text-[#468DFF] font-medium animate-pulse flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Cargando puestos...
                                </span>
                              )}
                            </div>

                            {/* Botón desplegable Multi-Select de Puestos */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isReadOnlyView) {
                                    setIsPuestosDropdownOpen(!isPuestosDropdownOpen);
                                  }
                                }}
                                disabled={isReadOnlyView}
                                className="w-full min-h-[42px] border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-left flex items-center justify-between gap-2 cursor-pointer disabled:opacity-60"
                              >
                                <div className="flex flex-wrap gap-1.5 items-center flex-1 min-w-0">
                                  {selectedPuestos.length === 0 ? (
                                    <span className="text-slate-400 text-sm font-normal">
                                      {!empresaId 
                                        ? 'Primero selecciona un cliente...' 
                                        : 'Selecciona uno o varios puestos de trabajo...'}
                                    </span>
                                  ) : (
                                    selectedPuestos.map((puestoName, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#468DFF]/10 text-[#468DFF] border border-[#468DFF]/20 text-xs font-bold animate-fade-in"
                                      >
                                        {puestoName}
                                        {!isReadOnlyView && (
                                          <X
                                            className="h-3 w-3 hover:text-red-500 cursor-pointer transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedPuestos(selectedPuestos.filter(p => p !== puestoName));
                                              setFormIsDirty(true);
                                            }}
                                          />
                                        )}
                                      </span>
                                    ))
                                  )}
                                </div>
                                <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${isPuestosDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>

                              {/* Backdrop para cerrar al hacer clic afuera */}
                              {isPuestosDropdownOpen && (
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={() => setIsPuestosDropdownOpen(false)}
                                />
                              )}

                              {/* Desplegable emergente de Checkboxes de Puestos */}
                              {isPuestosDropdownOpen && (
                                <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2.5 animate-scaleUp">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <span className="text-xs font-bold text-slate-700">
                                      Puestos de Trabajo ({availablePuestos.length})
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (availablePuestos.length > 0) {
                                            setSelectedPuestos(Array.from(new Set([...selectedPuestos, ...availablePuestos])));
                                            setFormIsDirty(true);
                                          }
                                        }}
                                        className="text-[11px] font-bold text-[#468DFF] hover:underline cursor-pointer"
                                      >
                                        Seleccionar todos
                                      </button>
                                      <span className="text-slate-300">•</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedPuestos([]);
                                          setFormIsDirty(true);
                                        }}
                                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                                      >
                                        Limpiar
                                      </button>
                                    </div>
                                  </div>

                                  {/* Lista de Checkboxes scrollable */}
                                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                    {availablePuestos.length === 0 ? (
                                      <p className="text-xs text-slate-400 italic py-2 text-center">
                                        {!empresaId ? 'Selecciona un cliente para ver sus puestos' : 'No se encontraron puestos de trabajo registrados'}
                                      </p>
                                    ) : (
                                      availablePuestos.map((puestoName, idx) => {
                                        const isChecked = selectedPuestos.includes(puestoName);
                                        return (
                                          <label
                                            key={idx}
                                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                              isChecked ? 'bg-[#468DFF]/10 text-[#468DFF] font-bold' : 'hover:bg-slate-50 text-slate-700'
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setSelectedPuestos([...selectedPuestos, puestoName]);
                                                } else {
                                                  setSelectedPuestos(selectedPuestos.filter(p => p !== puestoName));
                                                }
                                                setFormIsDirty(true);
                                              }}
                                              className="rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] h-4 w-4"
                                            />
                                            <span className="truncate">{puestoName}</span>
                                          </label>
                                        );
                                      })
                                    )}
                                  </div>

                                  {/* Opción para agregar un puesto manualmente */}
                                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                    <input
                                      type="text"
                                      placeholder="Escribir un nuevo puesto..."
                                      value={customPuestoInput}
                                      onChange={(e) => setCustomPuestoInput(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          if (customPuestoInput.trim() && !selectedPuestos.includes(customPuestoInput.trim())) {
                                            setSelectedPuestos([...selectedPuestos, customPuestoInput.trim()]);
                                            setCustomPuestoInput('');
                                            setFormIsDirty(true);
                                          }
                                        }
                                      }}
                                      className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (customPuestoInput.trim() && !selectedPuestos.includes(customPuestoInput.trim())) {
                                          setSelectedPuestos([...selectedPuestos, customPuestoInput.trim()]);
                                          setCustomPuestoInput('');
                                          setFormIsDirty(true);
                                        }
                                      }}
                                      className="px-2.5 py-1 bg-[#468DFF] text-white rounded-lg text-xs font-bold hover:bg-[#0511F2] transition-colors cursor-pointer"
                                    >
                                      + Añadir
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Input oculto para validacion HTML5 required */}
                            <input
                              type="text"
                              required
                              tabIndex={-1}
                              value={selectedPuestos.length > 0 ? 'valid' : ''}
                              onChange={() => {}}
                              className="opacity-0 h-0 w-0 absolute pointer-events-none"
                            />
                          </div>
                        )}

                        {asignacionTipo === 'nomina' && (
                          <div className="flex flex-col gap-1.5 relative">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-600 block">
                                Personal Asignado de la Nómina *
                              </label>
                              {loadingEmpleados && (
                                <span className="text-[10px] text-[#468DFF] font-medium animate-pulse flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  Buscando personal...
                                </span>
                              )}
                            </div>

                            {/* Botón desplegable Multi-Select de Empleados */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isReadOnlyView) {
                                    setIsEmpleadosDropdownOpen(!isEmpleadosDropdownOpen);
                                  }
                                }}
                                disabled={isReadOnlyView}
                                className="w-full min-h-[42px] border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-left flex items-center justify-between gap-2 cursor-pointer disabled:opacity-60"
                              >
                                <div className="flex flex-wrap gap-1.5 items-center flex-1 min-w-0">
                                  {selectedEmpleados.length === 0 ? (
                                    <span className="text-slate-400 text-sm font-normal">
                                      {!empresaId 
                                        ? 'Primero selecciona un cliente...' 
                                        : 'Selecciona uno o varios empleados de la nómina...'}
                                    </span>
                                  ) : (
                                    selectedEmpleados.map((emp, idx) => {
                                      const empName = typeof emp === 'string' ? emp : emp.nombre_apellido;
                                      const empPuesto = typeof emp === 'object' && emp?.puesto ? emp.puesto : '';
                                      return (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#468DFF]/10 text-[#468DFF] border border-[#468DFF]/20 text-xs font-bold animate-fade-in"
                                        >
                                          <User className="h-3 w-3 text-[#468DFF] shrink-0" />
                                          {empName}
                                          {empPuesto ? ` (${empPuesto})` : ''}
                                          {!isReadOnlyView && (
                                            <X
                                              className="h-3 w-3 hover:text-red-500 cursor-pointer transition-colors"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedEmpleados(selectedEmpleados.filter(item => (typeof item === 'string' ? item : item.nombre_apellido) !== empName));
                                                setFormIsDirty(true);
                                              }}
                                            />
                                          )}
                                        </span>
                                      );
                                    })
                                  )}
                                </div>
                                <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${isEmpleadosDropdownOpen ? 'rotate-180' : ''}`} />
                              </button>

                              {/* Backdrop para cerrar al hacer clic afuera */}
                              {isEmpleadosDropdownOpen && (
                                <div
                                  className="fixed inset-0 z-20"
                                  onClick={() => setIsEmpleadosDropdownOpen(false)}
                                />
                              )}

                              {/* Desplegable emergente de Checkboxes de Empleados */}
                              {isEmpleadosDropdownOpen && (
                                <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2.5 animate-scaleUp">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <span className="text-xs font-bold text-slate-700">
                                      Personal de la Nómina ({availableEmpleados.length})
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (availableEmpleados.length > 0) {
                                            const allMapped = availableEmpleados.map(e => ({
                                              id: e.id,
                                              nombre_apellido: e.nombre_apellido,
                                              cuil: e.cuil || '',
                                              puesto: e.puesto || ''
                                            }));
                                            setSelectedEmpleados(allMapped);
                                            setFormIsDirty(true);
                                          }
                                        }}
                                        className="text-[11px] font-bold text-[#468DFF] hover:underline cursor-pointer"
                                      >
                                        Seleccionar todos
                                      </button>
                                      <span className="text-slate-300">•</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedEmpleados([]);
                                          setFormIsDirty(true);
                                        }}
                                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                                      >
                                        Limpiar
                                      </button>
                                    </div>
                                  </div>

                                  {/* Lista de Checkboxes scrollable */}
                                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                    {availableEmpleados.length === 0 ? (
                                      <p className="text-xs text-slate-400 italic py-2 text-center">
                                        {!empresaId ? 'Selecciona un cliente para ver su nómina' : 'No se encontraron trabajadores en la nómina de este establecimiento'}
                                      </p>
                                    ) : (
                                      availableEmpleados.map((empItem, idx) => {
                                        const isChecked = selectedEmpleados.some(item => 
                                          (typeof item === 'string' ? item : item.nombre_apellido) === empItem.nombre_apellido
                                        );
                                        return (
                                          <label
                                            key={empItem.id || idx}
                                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                              isChecked ? 'bg-[#468DFF]/10 text-[#468DFF] font-bold' : 'hover:bg-slate-50 text-slate-700'
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={(e) => {
                                                if (e.target.checked) {
                                                  setSelectedEmpleados([...selectedEmpleados, {
                                                    id: empItem.id,
                                                    nombre_apellido: empItem.nombre_apellido,
                                                    cuil: empItem.cuil || '',
                                                    puesto: empItem.puesto || ''
                                                  }]);
                                                } else {
                                                  setSelectedEmpleados(selectedEmpleados.filter(item => 
                                                    (typeof item === 'string' ? item : item.nombre_apellido) !== empItem.nombre_apellido
                                                  ));
                                                }
                                                setFormIsDirty(true);
                                              }}
                                              className="rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] h-4 w-4"
                                            />
                                            <div className="flex-1 min-w-0">
                                              <span className="truncate block font-semibold">{empItem.nombre_apellido}</span>
                                              <span className="text-[10px] text-slate-400 block truncate">
                                                {empItem.puesto ? `Puesto: ${empItem.puesto}` : 'Sin puesto asignado'} {empItem.cuil ? `| CUIL/DNI: ${empItem.cuil}` : ''}
                                              </span>
                                            </div>
                                          </label>
                                        );
                                      })
                                    )}
                                  </div>

                                  {/* Opción para agregar un empleado manualmente */}
                                  <div className="pt-2 border-t border-slate-100 space-y-2">
                                    <span className="text-[11px] font-bold text-slate-500 block">+ Agregar empleado manualmente a esta capacitación:</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                                      <input
                                        type="text"
                                        placeholder="Nombre y Apellido *"
                                        value={customEmpleadoNombre}
                                        onChange={(e) => setCustomEmpleadoNombre(e.target.value)}
                                        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50"
                                      />
                                      <input
                                        type="text"
                                        placeholder="DNI / CUIL (Opcional)"
                                        value={customEmpleadoDni}
                                        onChange={(e) => setCustomEmpleadoDni(e.target.value)}
                                        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Puesto (Opcional)"
                                        value={customEmpleadoPuesto}
                                        onChange={(e) => setCustomEmpleadoPuesto(e.target.value)}
                                        className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50"
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (customEmpleadoNombre.trim()) {
                                            const newEmp = {
                                              id: `manual-${Date.now()}`,
                                              nombre_apellido: customEmpleadoNombre.trim(),
                                              cuil: customEmpleadoDni.trim(),
                                              puesto: customEmpleadoPuesto.trim()
                                            };
                                            setSelectedEmpleados([...selectedEmpleados, newEmp]);
                                            setCustomEmpleadoNombre('');
                                            setCustomEmpleadoDni('');
                                            setCustomEmpleadoPuesto('');
                                            setFormIsDirty(true);
                                          }
                                        }}
                                        className="px-3 py-1.5 bg-[#468DFF] text-white rounded-lg text-xs font-bold hover:bg-[#0511F2] transition-colors cursor-pointer"
                                      >
                                        + Añadir Empleado
                                      </button>
                                    </div>
                                  </div>

                                  <div className="pt-1 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setIsEmpleadosDropdownOpen(false)}
                                      className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                                    >
                                      Listo
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Input oculto para validacion HTML5 required */}
                            <input
                              type="text"
                              required
                              tabIndex={-1}
                              value={selectedEmpleados.length > 0 ? 'valid' : ''}
                              onChange={() => {}}
                              className="opacity-0 h-0 w-0 absolute pointer-events-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sección 2: Detalle de la Capacitación y Recursos */}
                    <div className="space-y-4">
                      <h3 className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-[#468DFF]" />
                        2. Detalle del Tema de Capacitación y Materiales
                      </h3>

                      <div className="space-y-1 relative">
                        <div className="flex items-center justify-between gap-2 min-h-[28px] mb-1">
                          <label className="text-xs font-bold text-slate-600 block mb-0">
                            Tema / Temas de Capacitación *
                          </label>
                          {loadingTemas && (
                            <span className="text-[10px] text-[#468DFF] font-medium animate-pulse flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Cargando catálogo...
                            </span>
                          )}
                        </div>

                        {/* Botón desplegable Multi-Select de Temas */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              if (!isReadOnlyView) {
                                setIsTemasDropdownOpen(!isTemasDropdownOpen);
                              }
                            }}
                            disabled={isReadOnlyView}
                            className="w-full min-h-[42px] border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-left flex items-center justify-between gap-2 cursor-pointer disabled:opacity-60"
                          >
                            <div className="flex flex-wrap gap-1.5 items-center flex-1 min-w-0">
                              {selectedTemas.length === 0 ? (
                                <span className="text-slate-400 text-sm font-normal">
                                  Selecciona uno o varios temas de capacitación...
                                </span>
                              ) : (
                                selectedTemas.map((temaName, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#468DFF]/10 text-[#468DFF] border border-[#468DFF]/20 text-xs font-bold animate-fade-in"
                                  >
                                    {temaName}
                                    {!isReadOnlyView && (
                                      <X
                                        className="h-3 w-3 hover:text-red-500 cursor-pointer transition-colors"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newTemas = selectedTemas.filter(t => t !== temaName);
                                          setSelectedTemas(newTemas);
                                          setFormIsDirty(true);
                                        }}
                                      />
                                    )}
                                  </span>
                                ))
                              )}
                            </div>
                            <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${isTemasDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Backdrop para cerrar al hacer clic afuera */}
                          {isTemasDropdownOpen && (
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setIsTemasDropdownOpen(false)}
                            />
                          )}

                          {/* Desplegable emergente de Checkboxes de Temas */}
                          {isTemasDropdownOpen && (
                            <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 space-y-2.5 animate-scaleUp">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="text-xs font-bold text-slate-700">
                                  Catálogo de Temas de Capacitación ({catalogTemas.length})
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (catalogTemas.length > 0) {
                                        const allTemasNames = catalogTemas.map(t => t.tema);
                                        const newSet = Array.from(new Set([...selectedTemas, ...allTemasNames]));
                                        setSelectedTemas(newSet);
                                        setFormIsDirty(true);
                                      }
                                    }}
                                    className="text-[11px] font-bold text-[#468DFF] hover:underline cursor-pointer"
                                  >
                                    Seleccionar todos
                                  </button>
                                  <span className="text-slate-300">•</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTemas([]);
                                      setDescripcion('');
                                      setFormIsDirty(true);
                                    }}
                                    className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    Limpiar
                                  </button>
                                </div>
                              </div>

                              {/* Lista de Checkboxes scrollable */}
                              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {catalogTemas.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-2 text-center">
                                    Cargando catálogo de temas...
                                  </p>
                                ) : (
                                  catalogTemas.map((tItem, idx) => {
                                    const isChecked = selectedTemas.includes(tItem.tema);
                                    return (
                                      <label
                                        key={tItem.id || idx}
                                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                          isChecked ? 'bg-[#468DFF]/10 text-[#468DFF] font-bold' : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            let updated;
                                            if (e.target.checked) {
                                              updated = [...selectedTemas, tItem.tema];
                                            } else {
                                              updated = selectedTemas.filter(t => t !== tItem.tema);
                                            }
                                            setSelectedTemas(updated);
                                            setFormIsDirty(true);
                                          }}
                                          className="rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] h-4 w-4"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <span className="truncate block font-medium">{tItem.tema}</span>
                                        </div>
                                      </label>
                                    );
                                  })
                                )}
                              </div>

                              {/* Opción para agregar un tema manualmente */}
                              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Escribir un tema de capacitación personalizado..."
                                  value={customTemaInput}
                                  onChange={(e) => setCustomTemaInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (customTemaInput.trim() && !selectedTemas.includes(customTemaInput.trim())) {
                                        const updated = [...selectedTemas, customTemaInput.trim()];
                                        setSelectedTemas(updated);
                                        setCustomTemaInput('');
                                        setFormIsDirty(true);
                                      }
                                    }
                                  }}
                                  className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (customTemaInput.trim() && !selectedTemas.includes(customTemaInput.trim())) {
                                      const updated = [...selectedTemas, customTemaInput.trim()];
                                      setSelectedTemas(updated);
                                      setCustomTemaInput('');
                                      setFormIsDirty(true);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-[#468DFF] text-white rounded-lg text-xs font-bold hover:bg-[#0511F2] transition-colors cursor-pointer"
                                >
                                  + Añadir
                                </button>
                              </div>

                              <div className="pt-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => setIsTemasDropdownOpen(false)}
                                  className="px-3 py-1 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                                >
                                  Listo
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Input oculto para validacion HTML5 required */}
                        <input
                          type="text"
                          required
                          tabIndex={-1}
                          value={selectedTemas.length > 0 ? 'valid' : ''}
                          onChange={() => {}}
                          className="opacity-0 h-0 w-0 absolute pointer-events-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 min-h-[28px] mb-1">
                          <label className="text-xs font-bold text-slate-600 block mb-0">
                            Contenido
                          </label>
                          <AITextHelper
                            value={descripcion}
                            onChange={(val) => {
                              setDescripcion(val);
                              setFormIsDirty(true);
                            }}
                            context="Contenido temático detallado y objetivos preventivos de la capacitación de Higiene y Seguridad"
                            disabled={isReadOnlyView}
                          />
                        </div>
                        <textarea
                          rows="4"
                          placeholder="Contenido temático y puntos de capacitación desarrollados (se completan automáticamente al seleccionar los temas)..."
                          value={descripcion}
                          onChange={(e) => {
                            setDescripcion(e.target.value);
                            setFormIsDirty(true);
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-y text-slate-700 font-normal min-h-[90px]"
                        />
                      </div>

                      {/* Metodología y Duración */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 items-start">
                        {/* Metodología */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 block h-4 leading-4">
                            Metodología *
                          </label>
                          <select
                            value={metodologia}
                            disabled={isReadOnlyView}
                            onChange={(e) => {
                              setMetodologia(e.target.value);
                              setFormIsDirty(true);
                            }}
                            className="w-full h-[42px] border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 font-normal cursor-pointer disabled:opacity-60"
                          >
                            <option value="Asincrónica con video">Asincrónica con video</option>
                            <option value="Asincrónica con PowerPoint/PDF">Asincrónica con PowerPoint/PDF</option>
                          </select>
                        </div>

                        {/* Duración (con selector de valor numérico e ícono/botón de unidad MIN / HS al estilo protocolo Ergonomía) */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 block h-4 leading-4">
                            Duración *
                          </label>
                          <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 w-full h-[42px] focus-within:border-[#468DFF] transition-all">
                            <input
                              type="number"
                              min="1"
                              disabled={isReadOnlyView}
                              placeholder="Ej: 45"
                              value={duracionValor}
                              onChange={(e) => {
                                setDuracionValor(e.target.value);
                                setFormIsDirty(true);
                              }}
                              className="w-full text-sm h-full border-0 focus:ring-0 focus:outline-none font-semibold text-slate-800 bg-transparent px-3.5"
                            />
                            <div className="h-5 w-[1px] bg-slate-200 shrink-0" />
                            <button
                              type="button"
                              disabled={isReadOnlyView}
                              onClick={() => {
                                setDuracionUnidad(duracionUnidad === 'min' ? 'hs' : 'min');
                                setFormIsDirty(true);
                              }}
                              className={`w-14 shrink-0 flex items-center justify-center h-full text-xs font-black uppercase transition-all cursor-pointer select-none ${
                                duracionUnidad === 'min'
                                  ? 'bg-blue-50 text-[#468DFF] hover:bg-blue-100'
                                  : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              }`}
                            >
                              {duracionUnidad === 'min' ? 'MIN' : 'HS'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-1">
                          <Tv className="h-4 w-4 text-red-500" />
                          Enlace de Video de YouTube (Opcional si adjunta PDF)
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: https://www.youtube.com/watch?v=... o https://youtu.be/..."
                          value={videoUrl}
                          onChange={(e) => {
                            setVideoUrl(e.target.value);
                            setFormIsDirty(true);
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-900"
                        />
                        <p className="text-[10px] text-slate-400 font-normal">Pegue el enlace público del video que visualizarán los empleados.</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <label className="text-xs font-bold text-slate-600 block mb-0">
                            Documento o Presentación Adjunta (PDF/PPT)
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowPptTipModal(true)}
                            className="text-[11px] font-bold text-[#468DFF] hover:underline flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 shadow-xs"
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                            Tip para Presentaciones
                          </button>
                        </div>
                        <DocumentUploadZone
                          label=""
                          file={documentoFile}
                          fileName={selectedFileName}
                          url={documentUrl}
                          onFileChange={handleFileChange}
                          onDriveImportSuccess={(filePath) => {
                            setDocumentUrl(filePath);
                            setSelectedFileName('Archivo de Drive importado');
                            setFormIsDirty(true);
                          }}
                          onViewPdf={handleViewPdf}
                          onDelete={() => {
                            setDocumentUrl('');
                            setDocumentoFile(null);
                            setSelectedFileName('');
                            setFormIsDirty(true);
                          }}
                          tenantId={profile?.tenant_id}
                          disabled={isReadOnlyView}
                          onToast={globalToast.toast}
                        />
                      </div>
                    </div>
                  </fieldset>

                  {/* Botones del Formulario (SySO Standard) */}
                  <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleExitForm}
                      className="px-5 py-2.5 bg-[#FFFFFF] text-[#468DFF] border border-[#468DFF] rounded-xl text-sm font-bold hover:bg-[#468DFF] hover:text-[#FFFFFF] hover:border-[#FFFFFF] transition-all cursor-pointer"
                    >
                      Salir
                    </button>
                    <div className="flex items-center gap-3">
                      {canCargar && (
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 disabled:opacity-50"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            'Guardar'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              /* VISTA TABLA PRINCIPAL Y CONTROL (ESTRUCTURA IDÉNTICA A CONTROL ELÉCTRICO) */
              <div className="space-y-0 md:space-y-6 flex-grow flex flex-col min-h-0">
                
                {/* PANEL DE FILTROS Y BÚSQUEDA (MATCHING CONTROL-ELECTRICO 1:1) */}
                <div className="bg-white border-y border-x-0 md:border md:border-slate-200 md:rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-sm space-y-3 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    {/* Espaciador para empujar el buscador a la derecha en desktop */}
                    <div className="hidden md:block flex-1"></div>

                    {/* Buscador en la derecha */}
                    <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                      <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar por tema, capacitador, puesto, cliente..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Filtros avanzados colapsables y Botón Primario a la derecha */}
                  <div className="pt-1.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between min-h-[28px]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowFilters(!showFilters)}
                          className="font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px] hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          <Sliders className="h-3 w-3" />
                          FILTROS DE BÚSQUEDA
                          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {(filterText || filterEmpresaId || filterEstablecimientoId) && (
                          <button
                            onClick={() => {
                              setFilterText('');
                              setFilterEmpresaId('');
                              setFilterEstablecimientoId('');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>

                      {canCargar && (
                        <button
                          type="button"
                          onClick={handleAddNew}
                          className="px-3 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 shrink-0 border border-[#468DFF] hover:border-[#0511F2]"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Nueva Capacitación
                        </button>
                      )}
                    </div>

                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 animate-scaleUp">
                        {/* Empresa Filter */}
                        {profile && profile.role !== 'cliente' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Cliente / Empresa</label>
                            <select
                              value={filterEmpresaId}
                              onChange={(e) => {
                                setFilterEmpresaId(e.target.value);
                                setFilterEstablecimientoId('');
                              }}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer"
                            >
                              <option value="">Todos los Clientes...</option>
                              {empresas.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Establecimiento Filter */}
                        <div className="space-y-1 col-span-1 md:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Establecimiento</label>
                          <select
                            value={filterEstablecimientoId}
                            onChange={(e) => setFilterEstablecimientoId(e.target.value)}
                            disabled={!filterEmpresaId && profile?.role !== 'cliente'}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                          >
                            <option value="">Todos los Establecimientos...</option>
                            {allEstablecimientos.filter(est => !filterEmpresaId || est.empresa_id === filterEmpresaId).map(est => (
                              <option key={est.id} value={est.id}>{est.denominacion}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* CONTENEDOR DE TABLA (SySO Compact Layout) */}
                <div 
                  className={`bg-white border-y border-x-0 md:border md:border-slate-200 md:rounded-2xl shadow-sm overflow-hidden flex flex-col flex-grow min-h-0 md:flex-initial transition-all duration-300 ease-in-out ${showFilters ? 'md:h-[calc(100vh-310px)]' : 'md:h-[calc(100vh-240px)]'}`}
                >
                  <div className="overflow-auto flex-grow scrollbar-thin">
                    {sortedCapacitaciones.length === 0 ? (
                      <AppEmptyState
                        title="No hay capacitaciones online registradas"
                        description="Cree una nueva capacitación online para enviar el enlace público e invitar a los trabajadores a firmar su constancia digital."
                        actionButton={canCargar && (
                          <AppButton
                            onClick={handleAddNew}
                            variant="primary"
                            size="sm"
                            className="shadow-md shadow-[#468DFF]/10 flex items-center gap-1.5"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Registrar la primera
                          </AppButton>
                        )}
                      />
                    ) : (
                      <table className="w-full border-collapse text-left text-xs min-w-[850px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                            <th onClick={() => handleSort('cliente')} className="px-6 py-4 cursor-pointer select-none">
                              <div className="flex items-center gap-1.5">
                                CLIENTE / ESTABLECIMIENTO
                                <AppSortIcon field="cliente" sortField={sortField} sortOrder={sortOrder} />
                              </div>
                            </th>
                            <th onClick={() => handleSort('puesto')} className="px-6 py-4 cursor-pointer select-none">
                              <div className="flex items-center gap-1.5">
                                PUESTOS AFECTADOS
                                <AppSortIcon field="puesto" sortField={sortField} sortOrder={sortOrder} />
                              </div>
                            </th>
                            <th onClick={() => handleSort('titulo')} className="px-6 py-4 cursor-pointer select-none">
                              <div className="flex items-center gap-1.5">
                                TEMA DE CAPACITACIÓN
                                <AppSortIcon field="titulo" sortField={sortField} sortOrder={sortOrder} />
                              </div>
                            </th>
                            <th className="px-6 py-4 text-center">RECURSOS MULTIMEDIA</th>
                            <th className="px-6 py-4 text-center">ASISTENCIA</th>
                            <th className="px-6 py-4 text-right w-36">ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedCapacitaciones.map((item) => {
                            const numFirmas = item.capacitaciones_online_registros?.[0]?.count || 0;
                            const emp = item.empresas;
                            const est = item.establecimientos;

                            return (
                              <tr
                                key={item.id}
                                onClick={() => handleEditClick(item)}
                                className="hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <td className="px-6 py-4 font-semibold text-slate-900">
                                  <span className="block">{emp?.razon_social || 'Desconocido'}</span>
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-normal">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {est?.denominacion || 'Único'}
                                  </span>
                                </td>

                                <td className="px-6 py-4 font-medium text-slate-600">
                                  <span className="block max-w-[180px] truncate">{getItemPuestos(item)}</span>
                                </td>

                                <td className="px-6 py-4 font-medium text-slate-600">
                                  <span className="block max-w-[240px] truncate font-semibold text-slate-800" title={item.titulo}>
                                    {item.titulo}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono font-normal">
                                    {formatDate(item.created_at)}
                                  </span>
                                </td>

                                <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1.5">
                                    {item.document_url && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewPdf(item.document_url);
                                        }}
                                        className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                        title="Visualizar Documento / Presentación"
                                      >
                                        <FileText className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                    {item.video_url && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(item.video_url, '_blank');
                                        }}
                                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                        title="Ver Video Instructivo"
                                      >
                                        <Tv className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                    {!item.document_url && !item.video_url && (
                                      <span className="text-slate-400 text-xs italic">-</span>
                                    )}
                                  </div>
                                </td>

                                <td className="px-6 py-4 text-center" onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRegistrosModal(item, e);
                                }}>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#468DFF]/10 text-[#468DFF] border border-[#468DFF]/20 hover:bg-[#468DFF]/20 cursor-pointer transition-colors">
                                    <ShieldCheck className="h-3.5 w-3.5 text-[#468DFF]" />
                                    {numFirmas} Asistente(s)
                                  </span>
                                </td>

                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    {/* Compartir Enlace */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenShareModal(item, e)}
                                      className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                      title="Compartir Capacitación (WhatsApp / Email / Enlace)"
                                    >
                                      <Share2 className="h-4.5 w-4.5" />
                                    </button>

                                    {/* Ver Firmas */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenRegistrosModal(item, e)}
                                      className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                      title="Ver Asistentes Firmantes"
                                    >
                                      <Users className="h-4.5 w-4.5" />
                                    </button>

                                    {/* Descargar PDF */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleDownloadPdf(item, e)}
                                      className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                      title="Descargar Reporte PDF de Asistencia"
                                    >
                                      <FileText className="h-4.5 w-4.5" />
                                    </button>

                                    {/* Editar */}
                                    {canEditar && (
                                      <button
                                        type="button"
                                        onClick={() => handleEditClick(item)}
                                        className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-700 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                        title="Editar Capacitación"
                                      >
                                        <Edit className="h-4.5 w-4.5" />
                                      </button>
                                    )}

                                    {/* Eliminar */}
                                    {canEliminar && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirm({ show: true, id: item.id, title: item.titulo });
                                        }}
                                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all cursor-pointer inline-flex items-center justify-center shadow-sm"
                                        title="Eliminar Capacitación"
                                      >
                                        <Trash2 className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal de Lista de Firmantes */}
      {viewRegistrosModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Registro de Firmas — {viewRegistrosModal.capacitacion?.titulo}
                </h3>
                <p className="text-xs text-slate-500">
                  Empleados que completaron la capacitación y firmaron digitalmente
                </p>
              </div>
              <button
                onClick={() => setViewRegistrosModal({ show: false, capacitacion: null, registros: [], loading: false })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {viewRegistrosModal.loading ? (
                <div className="py-10 text-center">
                  <Loader2 className="h-6 w-6 text-[#468DFF] animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Cargando firmantes...</p>
                </div>
              ) : viewRegistrosModal.registros.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-xs">
                  Aún ningún empleado ha registrado su firma en esta capacitación.
                </div>
              ) : (
                viewRegistrosModal.registros.map((reg) => (
                  <div
                    key={reg.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="font-bold text-slate-900">{reg.nombre_apellido}</div>
                      <div className="text-slate-500">DNI: <strong className="text-slate-800">{reg.dni}</strong> | Puesto: <strong className="text-slate-800">{reg.puesto}</strong></div>
                      <div className="text-[10px] text-slate-400">Firmado el: {formatDate(reg.registrado_at)}</div>
                    </div>

                    {reg.firma_url && (
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200 shrink-0">
                        <img
                          src={reg.firma_url}
                          alt="Firma Digital"
                          className="h-10 w-24 object-contain"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-500">
                Total Firmantes: {viewRegistrosModal.registros.length}
              </span>
              <button
                type="button"
                onClick={() => handleDownloadPdf(viewRegistrosModal.capacitacion)}
                className="px-4 py-2 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-[#468DFF]/20 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Descargar Reporte PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Diálogo "Cambios sin guardar" Exacto */}
      {unsavedDialog.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-xl border border-slate-200 animate-scaleUp">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-[#0D0D0D] mb-1">
              Cambios sin guardar
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Tenés cambios sin guardar en el formulario. Si salís ahora, perderás toda la información ingresada.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setUnsavedDialog({ show: false, pendingAction: null });
                  if (unsavedDialog.pendingAction) unsavedDialog.pendingAction();
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#FFFFFF] text-[#468DFF] border border-[#468DFF] rounded-xl text-sm font-bold hover:bg-[#468DFF] hover:text-[#FFFFFF] transition-all cursor-pointer"
              >
                Salir sin guardar
              </button>
              <button
                type="button"
                onClick={() => setUnsavedDialog({ show: false, pendingAction: null })}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#468DFF] text-white rounded-xl text-sm font-bold hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/20"
              >
                Quedarse y editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación de Eliminación */}
      <AppConfirmDialog
        isOpen={deleteConfirm.show}
        title="¿Eliminar Capacitación Online?"
        message={`¿Está seguro de que desea eliminar la capacitación "${deleteConfirm.title}"? Esta acción no se puede deshacer y borrará permanentemente sus registros de firma.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ show: false, id: null, title: '' })}
      />

      {/* Modal Unificado de Compartir (WhatsApp / Email / Enlace) */}
      {shareModal.show && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-scaleUp space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-[#468DFF] rounded-xl">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0D0D0D]">Compartir Capacitación</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[280px]">
                    {shareModal.capacitacion?.titulo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModal({ ...shareModal, show: false })}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Selector de Pestañas */}
            <div className="flex border-b border-slate-200 bg-slate-50 p-1 rounded-xl gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setShareModal({ ...shareModal, activeTab: 'whatsapp' })}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  shareModal.activeTab === 'whatsapp'
                    ? 'bg-white text-emerald-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                💬 WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setShareModal({ ...shareModal, activeTab: 'email' })}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  shareModal.activeTab === 'email'
                    ? 'bg-white text-[#468DFF] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                ✉️ Correo
              </button>
              <button
                type="button"
                onClick={() => setShareModal({ ...shareModal, activeTab: 'link' })}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  shareModal.activeTab === 'link'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                🔗 Enlace
              </button>
            </div>

            {/* Contenido Pestaña WhatsApp */}
            {shareModal.activeTab === 'whatsapp' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Número de WhatsApp Destinatario (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. +5491112345678"
                    value={shareModal.phone}
                    onChange={(e) => setShareModal({ ...shareModal, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Mensaje a enviar
                  </label>
                  <textarea
                    rows={4}
                    value={shareModal.message}
                    onChange={(e) => setShareModal({ ...shareModal, message: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50 font-normal leading-relaxed text-slate-800"
                  />
                </div>
                <a
                  href={`https://wa.me/${shareModal.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(shareModal.message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShareModal({ ...shareModal, show: false })}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
                >
                  Enviar por WhatsApp
                </a>
              </div>
            )}

            {/* Contenido Pestaña Correo */}
            {shareModal.activeTab === 'email' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Correo Electrónico Destinatario *
                  </label>
                  <input
                    type="email"
                    placeholder="ejemplo@empresa.com"
                    value={shareModal.email}
                    onChange={(e) => setShareModal({ ...shareModal, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Asunto del Correo
                  </label>
                  <input
                    type="text"
                    value={shareModal.subject}
                    onChange={(e) => setShareModal({ ...shareModal, subject: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Cuerpo del Mensaje
                  </label>
                  <textarea
                    rows={4}
                    value={shareModal.message}
                    onChange={(e) => setShareModal({ ...shareModal, message: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50 font-normal leading-relaxed text-slate-800"
                  />
                </div>
                <a
                  href={`mailto:${shareModal.email}?subject=${encodeURIComponent(shareModal.subject)}&body=${encodeURIComponent(shareModal.message)}`}
                  onClick={() => setShareModal({ ...shareModal, show: false })}
                  className="w-full py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-[#468DFF]/20"
                >
                  Enviar por Correo Electrónico
                </a>
              </div>
            )}

            {/* Contenido Pestaña Enlace Directo */}
            {shareModal.activeTab === 'link' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">
                    Enlace Público para Empleados
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={shareModal.publicUrl}
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-xs bg-slate-100 text-slate-700 font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleCopyPublicLink(shareModal.publicUrl);
                    setShareModal({ ...shareModal, show: false });
                  }}
                  className="w-full py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-[#468DFF]/20"
                >
                  Copiar Enlace al Portapapeles
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Emergente Estándar: Tip para Presentaciones (PPT/PPTX) */}
      {showPptTipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-[#468DFF]">
                <HelpCircle className="h-5 w-5" />
                <h3 className="font-outfit text-base font-bold text-slate-900">
                  Tip para Presentaciones (PPT / PPTX)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPptTipModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100 text-xs text-slate-700 space-y-2 leading-relaxed">
              <p>
                Para presentaciones PowerPoint pesadas (<strong>mayores a 10 MB</strong>), lo más recomendable es utilizar la pestaña <strong>Enlace Drive</strong> e ingresar el enlace público de <strong>Google Slides</strong>.
              </p>
              <p>
                Esto permite que los empleados naveguen la presentación filmina por filmina de forma fluida e instantánea, sin tiempos de espera ni consumo de datos por descarga.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <AppButton
                variant="primary"
                size="sm"
                onClick={() => setShowPptTipModal(false)}
              >
                Entendido
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
