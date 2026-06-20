// src/app/[tenant-slug]/capacitacion/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  Building, 
  Users, 
  AlertTriangle, 
  X, 
  Check, 
  Loader2, 
  Trash2, 
  Edit, 
  Briefcase, 
  Settings, 
  LogOut, 
  Menu,
  GraduationCap,
  Calendar,
  ClipboardList,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Sliders,
  Flame,
  ClipboardCheck,
  Image as ImageIcon,
  Camera,
  Upload,
  Eye
} from 'lucide-react';

export default function CapacitacionPage({ params }) {
  const tenantSlug = params['tenant-slug'];

  // Estados estructurales
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Datos principales del programa de capacitaciones
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [temasList, setTemasList] = useState([]);
  const [miembrosList, setMiembrosList] = useState([]);

  // Estados del CRUD / Vista Formulario
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Campos del Formulario
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [puesto, setPuesto] = useState('');
  
  // Tema (puede ser predefinido o personalizado)
  const [tema, setTema] = useState(''); // almacena topic.id o "__custom__"
  const [temaId, setTemaId] = useState(null);
  const [temaCustom, setTemaCustom] = useState('');
  
  const [contenido, setContenido] = useState('');
  
  // Capacitador (puede ser miembro del equipo o personalizado)
  const [capacitador, setCapacitador] = useState(''); // almacena miembro.id o "__custom__"
  const [capacitadorId, setCapacitadorId] = useState(null);
  const [capacitadorCustom, setCapacitadorCustom] = useState('');
  
  const [progreso, setProgreso] = useState(0);
  const [fechaInicioPlanificada, setFechaInicioPlanificada] = useState('');
  const [fechaFinPlanificada, setFechaFinPlanificada] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Estados para temas múltiples e imágenes de registro
  const [selectedTemas, setSelectedTemas] = useState([]); // array de { id, tema, contenido }
  const [isTemasDropdownOpen, setIsTemasDropdownOpen] = useState(false);
  const [searchTopicTerm, setSearchTopicTerm] = useState('');
  const [fotosFiles, setFotosFiles] = useState([]); // array de { file: File | null, preview: string, path: string }
  const [viewingFotosCap, setViewingFotosCap] = useState(null); // capacitación para el modal de ver fotos
  const [viewingFotosUrls, setViewingFotosUrls] = useState([]); // urls firmadas para el modal de ver fotos

  // Filtros
  const [filterText, setFilterText] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  // Ordenamiento
  const [sortField, setSortField] = useState('fecha_inicio_planificada');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modales y Feedback
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    const collapsed = localStorage.getItem('sidebar-collapsed');
    if (collapsed === 'true') {
      setIsSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    const newVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(newVal);
    localStorage.setItem('sidebar-collapsed', String(newVal));
  };

  // Cargar datos
  useEffect(() => {
    const checkEnvAndLoad = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsDevMode(true);
        loadMockData();
      } else {
        await loadRealData();
      }
    };
    checkEnvAndLoad();
  }, []);

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const closeAlert = () => setModalAlert({ show: false, title: '', message: '', onConfirm: null });

  // Cargar datos reales de Supabase
  const loadRealData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      // 1. Perfil
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (pErr) throw pErr;
      setProfile(prof);

      // 2. Tenant por slug de URL
      const { data: ten, error: tErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', tenantSlug)
        .single();

      if (tErr || !ten) {
        if (prof.tenant_id) {
          const { data: homeTen } = await supabase
            .from('tenants')
            .select('slug')
            .eq('id', prof.tenant_id)
            .single();
          if (homeTen) {
            window.location.href = `/${homeTen.slug}/capacitacion`;
            return;
          }
        }
        window.location.href = '/login';
        return;
      }

      // Verificar acceso: ¿Es el owner o es miembro activo con acceso?
      let hasAccess = false;
      if (prof.tenant_id === ten.id) {
        hasAccess = true;
      } else {
        const { data: member } = await supabase
          .from('miembros_equipo')
          .select('id, tiene_acceso')
          .eq('tenant_id', ten.id)
          .eq('profile_id', user.id)
          .maybeSingle();

        if (member && member.tiene_acceso) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        if (prof.tenant_id) {
          const { data: homeTen } = await supabase
            .from('tenants')
            .select('slug')
            .eq('id', prof.tenant_id)
            .single();
          if (homeTen) {
            window.location.href = `/${homeTen.slug}/capacitacion`;
            return;
          }
        }
        window.location.href = '/login';
        return;
      }

      setTenant(ten);

      // 3. Clientes
      const { data: emps, error: empErr } = await supabase
        .from('empresas')
        .select('id, razon_social')
        .eq('tenant_id', ten.id)
        .order('razon_social');
      if (empErr) throw empErr;
      setEmpresas(emps || []);

      // 4. Establecimientos
      const { data: ests, error: estErr } = await supabase
        .from('establecimientos')
        .select('id, empresa_id, denominacion')
        .eq('tenant_id', ten.id)
        .order('denominacion');
      if (estErr) throw estErr;
      setAllEstablecimientos(ests || []);

      // 5. Miembros del Equipo
      const { data: mems, error: memErr } = await supabase
        .from('miembros_equipo')
        .select('id, full_name')
        .eq('tenant_id', ten.id)
        .order('full_name');
      if (memErr) throw memErr;
      setMiembrosList(mems || []);

      // 6. Temas de Capacitación
      const { data: topics, error: topicErr } = await supabase
        .from('temas_capacitacion')
        .select('id, tema, contenido')
        .order('tema');
      if (topicErr) throw topicErr;
      setTemasList(topics || []);

      // 7. Programa de Capacitación
      const { data: capData, error: capErr } = await supabase
        .from('programa_capacitacion')
        .select('*')
        .eq('tenant_id', ten.id)
        .order('created_at', { ascending: false });
      if (capErr) throw capErr;

      // Resuelve URLs firmadas para las múltiples fotos de registro
      const resolvedCapacitaciones = await Promise.all((capData || []).map(async (cap) => {
        let signedUrls = [];
        if (cap.fotos_urls && cap.fotos_urls.length > 0) {
          try {
            signedUrls = await Promise.all(cap.fotos_urls.map(async (fpath) => {
              const { data, error: signErr } = await supabase.storage
                .from('documents')
                .createSignedUrl(fpath, 3600, { download: false });
              return !signErr && data ? data.signedUrl : '';
            }));
          } catch (e) {
            console.error('Error resolviendo URLs firmadas de capacitación:', e);
          }
        }
        return {
          ...cap,
          fotos_preview_urls: signedUrls.filter(Boolean)
        };
      }));
      setCapacitaciones(resolvedCapacitaciones);

      setLoading(false);
    } catch (err) {
      console.error('Error cargando datos de Supabase:', err);
      triggerToast('Error al conectar con la base de datos.', 'error');
      setIsDevMode(true);
      loadMockData();
    }
  };

  const loadMockData = () => {
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'owner' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Prueba' });
    setEmpresas([
      { id: 'mock-empresa-1', razon_social: 'Ams Inversiones S.A.' },
      { id: 'mock-empresa-2', razon_social: 'Argento Via Publica' }
    ]);
    setAllEstablecimientos([
      { id: 'mock-est-1', empresa_id: 'mock-empresa-1', denominacion: 'Callao 727' },
      { id: 'mock-est-2', empresa_id: 'mock-empresa-1', denominacion: 'Cordoba 2045' },
      { id: 'mock-est-3', empresa_id: 'mock-empresa-2', denominacion: 'Único' }
    ]);
    setMiembrosList([
      { id: 'mock-miembro-1', full_name: 'Gonzalo Merlo' },
      { id: 'mock-miembro-2', full_name: 'Florencia Benitez' }
    ]);
    setTemasList([
      { id: 'mock-topic-1', tema: 'Riesgo eléctrico', contenido: 'Identificación de riesgos eléctricos; Cinco reglas de oro; Prácticas seguras; Normativa aplicable.' },
      { id: 'mock-topic-2', tema: 'Ergonomía - Manipulación de cargas', contenido: 'Principios básicos de ergonomía; Técnicas de levantamiento seguro; Pausas activas.' }
    ]);
    setCapacitaciones([
      {
        id: 'mock-cap-1',
        empresa_id: 'mock-empresa-1',
        establecimiento_id: 'mock-est-1',
        puesto: 'Mantenimiento',
        tema: 'Riesgo eléctrico',
        tema_id: 'mock-topic-1',
        contenido: 'Identificación de riesgos eléctricos; Cinco reglas de oro; Prácticas seguras; Normativa aplicable.',
        capacitador: 'Gonzalo Merlo',
        capacitador_id: 'mock-miembro-1',
        progreso: 50,
        fecha_inicio_planificada: '2026-07-01',
        fecha_fin_planificada: '2026-07-15',
        observaciones: 'Requiere entrega de folletería técnica.'
      }
    ]);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Filtrar los establecimientos dependientes del cliente elegido en el formulario
  const filteredEstablecimientos = allEstablecimientos.filter(
    (est) => est.empresa_id === empresaId
  );

  // Manejo de cambio de Tema
  const handleTemaChange = (e) => {
    const selectedVal = e.target.value;
    setTema(selectedVal);
    if (selectedVal === '__custom__') {
      setTemaId(null);
      setTemaCustom('');
      setContenido('');
    } else {
      const topicObj = temasList.find(t => t.id === selectedVal);
      if (topicObj) {
        setTemaId(topicObj.id);
        setTemaCustom('');
        setContenido(topicObj.contenido || '');
      }
    }
  };

  // Manejo de cambio de Capacitador
  const handleCapacitadorChange = (e) => {
    const selectedVal = e.target.value;
    setCapacitador(selectedVal);
    if (selectedVal === '__custom__') {
      setCapacitadorId(null);
      setCapacitadorCustom('');
    } else {
      const memberObj = miembrosList.find(m => m.id === selectedVal);
      if (memberObj) {
        setCapacitadorId(memberObj.id);
        setCapacitadorCustom('');
      }
    }
  };

  // Filtrar temas localmente para el dropdown multiselect
  const filteredTemasList = temasList.filter(t => 
    t.tema.toLowerCase().includes(searchTopicTerm.toLowerCase())
  );

  // Manejador para alternar temas en el multiselect
  const handleToggleTema = (topic) => {
    let updated = [];
    const exists = selectedTemas.some(t => t.id === topic.id);
    if (exists) {
      updated = selectedTemas.filter(t => t.id !== topic.id);
    } else {
      updated = [...selectedTemas, topic];
    }
    setSelectedTemas(updated);
    
    // Actualizar contenido reactivamente combinando los contenidos de los temas seleccionados
    const contents = updated
      .map(t => {
        if (t.id === '__custom__') return '';
        return t.contenido;
      })
      .filter(Boolean)
      .join('\n\n');
    setContenido(contents);
  };

  // Manejadores de carga de fotos
  const handleAddPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      path: ''
    }));
    setFotosFiles(prev => [...prev, ...newPhotos]);
  };

  const handleCapturePhoto = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const file = files[0];
    const newPhoto = {
      file,
      preview: URL.createObjectURL(file),
      path: ''
    };
    setFotosFiles(prev => [...prev, newPhoto]);
  };

  const handleRemovePhoto = (index) => {
    setFotosFiles(prev => {
      const target = prev[index];
      if (target && target.preview && target.preview.startsWith('blob:')) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  // Salir con advertencia
  const handleExitForm = () => {
    setModalAlert({
      show: true,
      title: 'Salir sin guardar',
      message: '¿Estás seguro de que deseas salir del formulario? Perderás todos los cambios cargados que no se hayan guardado.',
      onConfirm: () => {
        closeAlert();
        handleCloseForm();
      }
    });
  };

  const handleSidebarNavigation = (e, path) => {
    if (isFormOpen) {
      e.preventDefault();
      setModalAlert({
        show: true,
        title: 'Salir sin guardar',
        message: '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
        onConfirm: () => {
          closeAlert();
          window.location.href = path;
        }
      });
    }
  };


  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);

    setEmpresaId('');
    setEstablecimientoId('');
    setPuesto('');
    setTema('');
    setTemaId(null);
    setTemaCustom('');
    setContenido('');
    setCapacitador('');
    setCapacitadorId(null);
    setCapacitadorCustom('');
    setProgreso(0);
    setFechaInicioPlanificada('');
    setFechaFinPlanificada('');
    setObservaciones('');
    
    // Nuevos
    setSelectedTemas([]);
    setIsTemasDropdownOpen(false);
    setFotosFiles([]);
  };

  const uploadFotoToStorage = async (file, index) => {
    if (isDevMode) return `mock-path/capacitacion_${Date.now()}_${index}_${file.name}`;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autorizado');

      const fileExt = file.name.split('.').pop();
      const fileId = editingId || crypto.randomUUID();
      const fileName = `${user.id}/capacitacion_${fileId}_${index}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;
      return fileName;
    } catch (err) {
      console.error('Error al subir foto de capacitación:', err);
      throw new Error('Error al guardar la foto en el servidor.');
    }
  };

  // Guardado de Capacitación
  const handleSaveCapacitacion = async (e) => {
    e.preventDefault();
    if (!empresaId || !capacitador || !fechaInicioPlanificada || !fechaFinPlanificada) {
      triggerToast('Por favor completa todos los campos obligatorios.', 'error');
      return;
    }

    // Obtener la lista de nombres de temas y ids
    let dbTemasNames = [];
    let dbTemasIds = [];
    
    selectedTemas.forEach(t => {
      if (t.id === '__custom__') {
        if (temaCustom.trim()) {
          dbTemasNames.push(temaCustom.trim());
        }
      } else {
        dbTemasNames.push(t.tema);
        dbTemasIds.push(t.id);
      }
    });

    if (dbTemasNames.length === 0) {
      triggerToast('Debes especificar al menos un tema de capacitación.', 'error');
      return;
    }

    const dbTema = dbTemasNames.join(', ');
    const dbCapacitador = capacitador === '__custom__' ? capacitadorCustom.trim() : (miembrosList.find(m => m.id === capacitador)?.full_name || '');

    if (!dbCapacitador) {
      triggerToast('Debes especificar un capacitador.', 'error');
      return;
    }

    setSaveLoading(true);
    try {
      // Subir fotos
      const finalFotosUrls = [];
      for (const foto of fotosFiles) {
        if (foto.file) {
          const uploadedPath = await uploadFotoToStorage(foto.file, finalFotosUrls.length);
          finalFotosUrls.push(uploadedPath);
        } else if (foto.path) {
          finalFotosUrls.push(foto.path);
        }
      }

      const payload = {
        tenant_id: tenant.id,
        empresa_id: empresaId,
        establecimiento_id: establecimientoId || null,
        puesto: puesto.trim() || null,
        tema: dbTema,
        tema_id: dbTemasIds.length > 0 ? dbTemasIds[0] : null,
        temas: dbTemasNames,
        tema_ids: dbTemasIds,
        contenido: contenido.trim() || null,
        capacitador: dbCapacitador,
        capacitador_id: capacitadorId,
        progreso: Number(progreso),
        fecha_inicio_planificada: fechaInicioPlanificada,
        fecha_fin_planificada: fechaFinPlanificada,
        observaciones: observaciones.trim() || null,
        fotos_urls: finalFotosUrls,
        updated_at: new Date().toISOString()
      };

      if (isDevMode) {
        const updatedCap = {
          ...payload,
          id: editingId || `mock-cap-${Date.now()}`,
          fotos_preview_urls: fotosFiles.map(f => f.preview)
        };
        if (editingId) {
          setCapacitaciones(capacitaciones.map(c => c.id === editingId ? updatedCap : c));
          triggerToast('Capacitación actualizada exitosamente (Mock).');
        } else {
          setCapacitaciones([updatedCap, ...capacitaciones]);
          triggerToast('Capacitación registrada exitosamente (Mock).');
        }
      } else {
        if (editingId) {
          const { error } = await supabase
            .from('programa_capacitacion')
            .update(payload)
            .eq('id', editingId);
          if (error) throw error;
          triggerToast('Capacitación actualizada exitosamente.');
        } else {
          const { error } = await supabase
            .from('programa_capacitacion')
            .insert([{ ...payload, created_at: new Date().toISOString() }]);
          if (error) throw error;
          triggerToast('Capacitación registrada exitosamente.');
        }
        await loadRealData();
      }

      handleCloseForm();
    } catch (err) {
      console.error('Error al guardar capacitación:', err);
      triggerToast(err.message || 'Error al guardar la capacitación.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // Preparar edición
  const handleEditClick = async (cap) => {
    setEditingId(cap.id);
    setEmpresaId(cap.empresa_id);
    setEstablecimientoId(cap.establecimiento_id || '');
    setPuesto(cap.puesto || '');
    setContenido(cap.contenido || '');
    setProgreso(cap.progreso || 0);
    setFechaInicioPlanificada(cap.fecha_inicio_planificada);
    setFechaFinPlanificada(cap.fecha_fin_planificada);
    setObservaciones(cap.observaciones || '');

    // Vincular Temas (opción múltiple)
    if (cap.tema_ids && cap.tema_ids.length > 0) {
      const selected = [];
      cap.tema_ids.forEach(tid => {
        const topic = temasList.find(t => t.id === tid);
        if (topic) selected.push(topic);
      });
      // Si tiene temas en la columna array que no estén vinculados por ID
      if (cap.temas) {
        cap.temas.forEach(tName => {
          if (!selected.some(s => s.tema === tName)) {
            const topic = temasList.find(t => t.tema === tName);
            if (topic) {
              selected.push(topic);
            } else {
              setTemaCustom(tName);
              if (!selected.some(s => s.id === '__custom__')) {
                selected.push({ id: '__custom__', tema: 'Otro tema (Especificar...)' });
              }
            }
          }
        });
      }
      setSelectedTemas(selected);
    } else if (cap.tema_id) {
      const topic = temasList.find(t => t.id === cap.tema_id);
      if (topic) {
        setSelectedTemas([topic]);
      } else {
        setSelectedTemas([]);
      }
    } else {
      setTemaCustom(cap.tema || '');
      setSelectedTemas([{ id: '__custom__', tema: 'Otro tema (Especificar...)' }]);
    }

    // Vincular Capacitador
    if (cap.capacitador_id) {
      setCapacitador(cap.capacitador_id);
      setCapacitadorId(cap.capacitador_id);
      setCapacitadorCustom('');
    } else {
      setCapacitador('__custom__');
      setCapacitadorId(null);
      setCapacitadorCustom(cap.capacitador || '');
    }

    // Vincular Fotos
    if (cap.fotos_urls && cap.fotos_urls.length > 0) {
      const loadedFotos = cap.fotos_urls.map((fpath, idx) => {
        const previewUrl = cap.fotos_preview_urls?.[idx] || '';
        return { file: null, preview: previewUrl || '/brand/logo-primary.png', path: fpath };
      });
      setFotosFiles(loadedFotos);
    } else {
      setFotosFiles([]);
    }

    setIsFormOpen(true);
  };

  // Preparar eliminación
  const handleDeleteClick = (id) => {
    setModalAlert({
      show: true,
      title: '¿Eliminar registro?',
      message: 'Esta acción eliminará de forma permanente el registro de capacitación y no se podrá deshacer.',
      onConfirm: async () => {
        try {
          if (isDevMode) {
            setCapacitaciones(capacitaciones.filter(c => c.id !== id));
            triggerToast('Capacitación eliminada exitosamente (Mock).');
          } else {
            const { error } = await supabase
              .from('programa_capacitacion')
              .delete()
              .eq('id', id);
            if (error) throw error;
            triggerToast('Capacitación eliminada exitosamente.');
            await loadRealData();
          }
        } catch (err) {
          console.error('Error al eliminar:', err);
          triggerToast('Error al intentar eliminar el registro.', 'error');
        } finally {
          closeAlert();
        }
      }
    });
  };

  const handleViewFotosClick = (cap) => {
    setViewingFotosCap(cap);
    setViewingFotosUrls(cap.fotos_preview_urls || []);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Obtener estado calculado según el progreso
  const getProgressStatus = (prog) => {
    if (prog === 100) return { text: 'Completado', color: 'bg-[#00b050]/10 text-[#00b050] border-[#00b050]/20' };
    if (prog > 0) return { text: 'En curso', color: 'bg-blue-500/10 text-[#468DFF] border-blue-500/20' };
    return { text: 'Planificado', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  // Filtrado de la lista
  const filteredCapacitaciones = capacitaciones.filter((cap) => {
    if (filterText) {
      const search = filterText.toLowerCase();
      const t = cap.tema.toLowerCase();
      const c = cap.capacitador.toLowerCase();
      const p = (cap.puesto || '').toLowerCase();
      const o = (cap.observaciones || '').toLowerCase();
      if (!t.includes(search) && !c.includes(search) && !p.includes(search) && !o.includes(search)) {
        return false;
      }
    }

    if (filterEmpresa && cap.empresa_id !== filterEmpresa) return false;
    if (filterEstablecimiento && cap.establecimiento_id !== filterEstablecimiento) return false;

    if (filterEstado) {
      const state = getProgressStatus(cap.progreso).text;
      if (state !== filterEstado) return false;
    }

    return true;
  });

  const sortedCapacitaciones = [...filteredCapacitaciones].sort((a, b) => {
    if (!sortField) return 0;
    
    let valA = '';
    let valB = '';
    
    if (sortField === 'cliente') {
      const empA = empresas.find(e => e.id === a.empresa_id);
      const empB = empresas.find(e => e.id === b.empresa_id);
      valA = empA ? empA.razon_social.toLowerCase() : '';
      valB = empB ? empB.razon_social.toLowerCase() : '';
    } else if (sortField === 'tema') {
      valA = a.tema.toLowerCase();
      valB = b.tema.toLowerCase();
    } else if (sortField === 'capacitador') {
      valA = a.capacitador.toLowerCase();
      valB = b.capacitador.toLowerCase();
    } else if (sortField === 'progreso') {
      valA = a.progreso;
      valB = b.progreso;
    } else {
      valA = a[sortField] || '';
      valB = b[sortField] || '';
    }
    
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="h-screen overflow-hidden bg-[#D9D9D9] text-slate-700 flex flex-col md:flex-row relative font-sans">
      
      {/* Menu Hamburguesa Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          
          <aside className="relative w-64 bg-[#0D0D0D] flex flex-col justify-between p-6 z-10 border-r border-white/5 animate-fade-in-right">
            <div>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <img src="/brand/logo-primary.png" alt="Logo" className="h-9 w-9 object-contain" />
                  <span className="font-outfit text-base font-extrabold text-white tracking-tight">Gestión SySO</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block mb-2">Panel principal</span>
                <a href={`/${tenantSlug}/dashboard`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/dashboard`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Building className="h-4 w-4" />
                  Dashboard
                </a>
                <a href={`/${tenantSlug}/empresas`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/empresas`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Users className="h-4 w-4" />
                  Clientes
                </a>
                {(profile?.role === 'owner' || profile?.role === 'admin') && (
                  <a href={`/${tenantSlug}/equipo`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/equipo`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                    <Briefcase className="h-4 w-4" />
                    Equipo de Trabajo
                  </a>
                )}
                <a href={`/${tenantSlug}/programa`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/programa`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Calendar className="h-4 w-4" />
                  Programa de Gestión Anual
                </a>
                <a href={`/${tenantSlug}/capacitacion`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/capacitacion`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10">
                  <GraduationCap className="h-4 w-4" />
                  Programa de Capacitación Anual
                </a>
                <a href={`/${tenantSlug}/correctivas`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/correctivas`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <ClipboardList className="h-4 w-4" />
                  Acciones Correctivas
                </a>
                <a href={`/${tenantSlug}/extintores`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/extintores`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Flame className="h-4 w-4" />
                  Extintores
                </a>
                <a href={`/${tenantSlug}/visitas`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/visitas`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <ClipboardCheck className="h-4 w-4" />
                  Constancia de Visita
                </a>
                
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
                <a href={`/${tenantSlug}/profile`} onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/profile`)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all">
                  <Settings className="h-4 w-4" />
                  Editar Perfil
                </a>
              </nav>
            </div>

            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between rounded-xl bg-black/40 p-3 border border-white/5">
                <div className="truncate pr-2">
                  <span className="text-xs font-bold text-white block truncate">{profile?.full_name || 'Usuario'}</span>
                  <span className="text-[10px] text-white/40 block truncate uppercase tracking-wider">{profile?.role || 'Profesional'}</span>
                </div>
                <button onClick={handleLogout} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer shrink-0">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`bg-[#0D0D0D] flex flex-col justify-between shrink-0 hidden md:flex transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-6">
          <div className={`flex items-center justify-between gap-3 mb-8 ${isSidebarCollapsed ? 'flex-col' : ''}`}>
            <div className="flex items-center gap-3">
              <img src="/brand/logo-primary.png" alt="Logo" className="h-9 w-9 object-contain shrink-0" />
              {!isSidebarCollapsed && (
                <span className="font-outfit text-base font-extrabold text-white tracking-tight block animate-fade-in">Gestión SySO</span>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              title={isSidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav className="space-y-1.5">
            {!isSidebarCollapsed ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block mb-2">Panel principal</span>
            ) : (
              <div className="h-px bg-white/10 my-3" />
            )}
            <a 
              href={`/${tenantSlug}/dashboard`} 
              title="Dashboard"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/dashboard`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Building className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Dashboard</span>}
            </a>
            <a 
              href={`/${tenantSlug}/empresas`} 
              title="Clientes"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/empresas`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Users className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Clientes</span>}
            </a>
            {(profile?.role === 'owner' || profile?.role === 'admin') && (
              <a 
                href={`/${tenantSlug}/equipo`} 
                title="Equipo de Trabajo"
                onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/equipo`)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
              >
                <Briefcase className="h-4 w-4 shrink-0" />
                {!isSidebarCollapsed && <span className="animate-fade-in">Equipo de Trabajo</span>}
              </a>
            )}
            <a 
              href={`/${tenantSlug}/programa`} 
              title="Programa de Gestión Anual"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/programa`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Calendar className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Programa de Gestión Anual</span>}
            </a>
            <a 
              href={`/${tenantSlug}/capacitacion`} 
              title="Programa de Capacitación Anual"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/capacitacion`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#468DFF] text-white font-semibold text-sm transition-all shadow-md shadow-[#468DFF]/10 ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Programa de Capacitación Anual</span>}
            </a>
            <a 
              href={`/${tenantSlug}/correctivas`} 
              title="Acciones Correctivas"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/correctivas`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Acciones Correctivas</span>}
            </a>
            <a 
              href={`/${tenantSlug}/extintores`} 
              title="Extintores"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/extintores`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Flame className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Extintores</span>}
            </a>
            <a 
              href={`/${tenantSlug}/visitas`} 
              title="Constancia de Visita"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/visitas`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <ClipboardCheck className="h-4.5 w-4.5 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Constancia de Visita</span>}
            </a>

            {!isSidebarCollapsed ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-3 block pt-6 mb-2">Configuración</span>
            ) : (
              <div className="h-px bg-white/10 my-6" />
            )}
            <a 
              href={`/${tenantSlug}/profile`} 
              title="Editar Perfil"
              onClick={(e) => handleSidebarNavigation(e, `/${tenantSlug}/profile`)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-[#468DFF] font-semibold text-sm transition-all ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!isSidebarCollapsed && <span className="animate-fade-in">Editar Perfil</span>}
            </a>
          </nav>
        </div>

        <div className="p-4 border-t border-white/10">
          <div className={`flex items-center justify-between rounded-xl bg-black/40 p-3 border border-white/5 ${isSidebarCollapsed ? 'flex-col gap-2' : ''}`}>
            {!isSidebarCollapsed && (
              <div className="truncate pr-2">
                <span className="text-xs font-bold text-white block truncate">{profile?.full_name || 'Usuario'}</span>
                <span className="text-[10px] text-white/40 block truncate uppercase tracking-wider">{profile?.role || 'Profesional'}</span>
              </div>
            )}
            <button onClick={handleLogout} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer shrink-0">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-300/60 flex items-center justify-between px-6 md:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer">
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="font-outfit text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#468DFF]" />
              Programa de Capacitación Anual
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200">
              {tenant?.name || 'Mi Consultora'}
            </span>
            {tenant?.plan_id && (
              <span className="px-2.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-[#468DFF] text-[10px] font-semibold uppercase tracking-wider hidden sm:inline-block">
                PLAN {tenant.plan_id.toUpperCase()}
              </span>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#468DFF]" />
          </div>
        ) : (
          <div className="max-w-[95%] mx-auto w-full py-8 px-4 md:px-0 flex-1 flex flex-col min-h-0">
            
            {isFormOpen ? (
              // FORMULARIO DE ALTA Y EDICIÓN
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleExitForm}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors border border-slate-200 bg-white shadow-sm cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <h3 className="font-outfit text-base font-extrabold text-slate-900">
                      {editingId ? 'Editar Registro de Capacitación' : 'Registrar Nueva Capacitación'}
                    </h3>
                  </div>
                  <button onClick={handleExitForm} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveCapacitacion} className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
                  
                  {/* Sección 1: Cliente e Ubicación */}
                  <div className="space-y-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">Identificación del Cliente</span>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Cliente / Razón Social <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          required
                          value={empresaId}
                          onChange={(e) => {
                            setEmpresaId(e.target.value);
                            setEstablecimientoId('');
                          }}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          <option value="" disabled>Selecciona un cliente</option>
                          {empresas.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Establecimiento
                        </label>
                        <select
                          disabled={!empresaId}
                          value={establecimientoId}
                          onChange={(e) => setEstablecimientoId(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] cursor-pointer disabled:opacity-50"
                        >
                          <option value="">
                            {!empresaId ? 'Primero selecciona un cliente' : 'Selecciona un establecimiento (Opcional - Todos)'}
                          </option>
                          {filteredEstablecimientos.map((est) => (
                            <option key={est.id} value={est.id}>{est.denominacion}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Puesto / Sector afectado
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Personal de Planta / Operarios"
                          value={puesto}
                          onChange={(e) => setPuesto(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección 2: Detalle de la Capacitación */}
                  <div className="space-y-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">Detalle del Tema de Capacitación</span>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Tema de Capacitación <span className="text-[#468DFF]">*</span>
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsTemasDropdownOpen(!isTemasDropdownOpen)}
                            className="w-full text-left text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] cursor-pointer flex justify-between items-center shadow-sm"
                          >
                            <span className="truncate">
                              {selectedTemas.length === 0 
                                ? 'Selecciona los temas...' 
                                : selectedTemas.map(t => t.id === '__custom__' ? (temaCustom || 'Otro tema') : t.tema).join(', ')
                              }
                            </span>
                            <span className="text-slate-400 text-[10px]">▼</span>
                          </button>
                          
                          {isTemasDropdownOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-20 cursor-default" 
                                onClick={() => setIsTemasDropdownOpen(false)} 
                              />
                              <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-2 space-y-1 animate-fade-in">
                                <div className="relative mb-2 sticky top-0 bg-white pb-1">
                                  <input
                                    type="text"
                                    placeholder="Buscar tema..."
                                    value={searchTopicTerm}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setSearchTopicTerm(e.target.value)}
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#468DFF]"
                                  />
                                </div>
                                {filteredTemasList.map((topic) => {
                                  const isChecked = selectedTemas.some(t => t.id === topic.id);
                                  return (
                                    <label
                                      key={topic.id}
                                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none text-xs text-slate-700 transition-colors"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleTema(topic)}
                                        className="rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] h-3.5 w-3.5 cursor-pointer"
                                      />
                                      <span>{topic.tema}</span>
                                    </label>
                                  );
                                })}
                                
                                <div className="border-t border-slate-100 my-1 pt-1" />
                                
                                <label
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none text-xs text-slate-700 font-semibold transition-colors"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedTemas.some(t => t.id === '__custom__')}
                                    onChange={() => handleToggleTema({ id: '__custom__', tema: 'Otro tema (Especificar...)' })}
                                    className="rounded border-slate-300 text-[#468DFF] focus:ring-[#468DFF] h-3.5 w-3.5 cursor-pointer"
                                  />
                                  <span>Otro tema (Especificar...)</span>
                                </label>
                              </div>
                            </>
                          )}
                        </div>
                        {selectedTemas.some(t => t.id === '__custom__') && (
                          <input
                            type="text"
                            required
                            placeholder="Escribe el tema personalizado..."
                            value={temaCustom}
                            onChange={(e) => setTemaCustom(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2 mt-2 outline-none focus:border-[#468DFF]"
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Capacitador / Disertante <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          required
                          value={capacitador}
                          onChange={handleCapacitadorChange}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          <option value="" disabled>Selecciona el capacitador</option>
                          {miembrosList.map((member) => (
                            <option key={member.id} value={member.id}>{member.full_name}</option>
                          ))}
                          <option value="__custom__">Otro capacitador (Especificar...)</option>
                        </select>
                        {capacitador === '__custom__' && (
                          <input
                            type="text"
                            required
                            placeholder="Escribe el nombre del capacitador..."
                            value={capacitadorCustom}
                            onChange={(e) => setCapacitadorCustom(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2 mt-2 outline-none focus:border-[#468DFF]"
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Contenido Programado <span className="text-slate-400 font-normal">(Auto-rellenado y editable)</span>
                      </label>
                      <textarea
                        rows="4"
                        placeholder="Ingresa el desglose de contenidos de la capacitación..."
                        value={contenido}
                        onChange={(e) => setContenido(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] resize-none"
                      />
                    </div>
                  </div>

                  {/* Sección 3: Planificación y Progreso */}
                  <div className="space-y-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">Cronograma y Avance</span>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Fecha Inicio Planificada <span className="text-[#468DFF]">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={fechaInicioPlanificada}
                          onChange={(e) => setFechaInicioPlanificada(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Fecha Fin Planificada <span className="text-[#468DFF]">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={fechaFinPlanificada}
                          onChange={(e) => setFechaFinPlanificada(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF]"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                            Progreso de Cumplimiento
                          </label>
                          <span className="text-xs font-bold text-[#468DFF]">{progreso}%</span>
                        </div>
                        <div className="flex items-center gap-3 py-1">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={progreso}
                            onChange={(e) => setProgreso(Number(e.target.value))}
                            className="flex-1 accent-[#468DFF] h-2 bg-slate-200 rounded-lg cursor-pointer"
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={progreso}
                            onChange={(e) => {
                              let val = Number(e.target.value);
                              if (val > 100) val = 100;
                              if (val < 0) val = 0;
                              setProgreso(val);
                            }}
                            className="w-16 text-center text-xs bg-white border border-slate-300 rounded-xl py-1.5 outline-none focus:border-[#468DFF]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Observaciones y Notas</label>
                      <textarea
                        rows="3"
                        placeholder="Comentarios adicionales..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#468DFF] resize-none"
                      />
                    </div>
                  </div>

                  {/* Sección 4: Registros de capacitación */}
                  <div className="space-y-4">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">
                      Registros de capacitación
                    </span>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                      <div className="flex flex-wrap items-center gap-3 flex-1">
                        <label
                          htmlFor="multi-photo-upload"
                          className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs bg-white shadow-sm transition-all cursor-pointer"
                        >
                          <Upload className="h-4 w-4 text-slate-500" />
                          Seleccionar fotos
                          <input
                            id="multi-photo-upload"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleAddPhotos}
                            className="hidden"
                          />
                        </label>

                        <label
                          htmlFor="camera-photo-capture"
                          className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs bg-white shadow-sm transition-all cursor-pointer"
                        >
                          <Camera className="h-4 w-4 text-slate-500" />
                          Sacar foto (Cámara)
                          <input
                            id="camera-photo-capture"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleCapturePhoto}
                            className="hidden"
                          />
                        </label>
                        
                        <p className="text-[9px] text-slate-400 w-full mt-1">
                          Formatos soportados: JPG, PNG, GIF, WEBP. Tamaño máximo recomendado: 5 MB.
                        </p>
                      </div>
                    </div>

                    {/* Grid de previsualización */}
                    {fotosFiles.length === 0 ? (
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 italic text-xs bg-slate-50/50">
                        No hay fotos de registros cargadas.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
                        {fotosFiles.map((foto, idx) => (
                          <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video flex items-center justify-center shadow-sm">
                            <img src={foto.preview} alt={`Previsualización ${idx + 1}`} className="max-h-full max-w-full object-contain" />
                            
                            {/* Hover overlay with action buttons */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                              <a
                                href={foto.preview}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Ver en pantalla completa"
                                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                title="Eliminar"
                                className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botones del Formulario */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleExitForm}
                      className="py-3 px-6 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs bg-white shadow-sm transition-all cursor-pointer flex items-center gap-2"
                    >
                      Salir
                    </button>
                    <button
                      type="submit"
                      disabled={saveLoading}
                      className="py-3 px-8 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                    >
                      {saveLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        'Guardar'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // TABLA DE CAPACITACIONES Y FILTROS
              <div className="space-y-6 flex-1 flex flex-col min-h-0">
                
                {/* Panel de Filtros y Búsqueda */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                        <Search className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Buscar por tema, capacitador, puesto, observaciones..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-300 focus:border-[#468DFF] focus:ring-1 focus:ring-[#468DFF] rounded-xl py-3 pl-10 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none transition-all"
                      />
                    </div>
                    
                    <button
                      onClick={() => setIsFormOpen(true)}
                      className="py-3 px-5 rounded-xl bg-[#468DFF] hover:bg-[#0511F2] text-white font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-blue-500/15 cursor-pointer shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      Registrar Capacitación
                    </button>
                  </div>

                  {/* Selectores de Filtrado */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sliders className="h-3 w-3" />
                        Filtros de Búsqueda
                      </span>
                      {(filterEmpresa || filterEstablecimiento || filterEstado || filterText) && (
                        <button
                          onClick={() => {
                            setFilterEmpresa('');
                            setFilterEstablecimiento('');
                            setFilterEstado('');
                            setFilterText('');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Filtrar por Cliente</label>
                        <select
                          value={filterEmpresa}
                          onChange={(e) => {
                            setFilterEmpresa(e.target.value);
                            setFilterEstablecimiento('');
                          }}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          <option value="">Todos los clientes</option>
                          {empresas.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Filtrar por Establecimiento</label>
                        <select
                          disabled={!filterEmpresa}
                          value={filterEstablecimiento}
                          onChange={(e) => setFilterEstablecimiento(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-[#468DFF] cursor-pointer disabled:opacity-50"
                        >
                          <option value="">
                            {!filterEmpresa ? 'Selecciona un cliente primero' : 'Todos los establecimientos'}
                          </option>
                          {allEstablecimientos
                            .filter(est => est.empresa_id === filterEmpresa)
                            .map((est) => (
                              <option key={est.id} value={est.id}>{est.denominacion}</option>
                            ))
                          }
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Filtrar por Estado</label>
                        <select
                          value={filterEstado}
                          onChange={(e) => setFilterEstado(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-[#468DFF] cursor-pointer"
                        >
                          <option value="">Todos los estados</option>
                          <option value="Planificado">Planificado (0%)</option>
                          <option value="En curso">En curso (&gt; 0%)</option>
                          <option value="Completado">Completado (100%)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Listado / Tabla */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
                  <div className="overflow-auto flex-1">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 shadow-sm">
                        <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <th className="py-4 px-6 cursor-pointer hover:bg-slate-100 select-none transition-colors w-[20%]" onClick={() => handleSort('cliente')}>
                            <div className="flex items-center gap-1">
                              Cliente / Establecimiento
                              {sortField === 'cliente' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="py-4 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors w-[15%]" onClick={() => handleSort('puesto')}>
                            <div className="flex items-center gap-1">
                              Puesto
                              {sortField === 'puesto' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="py-4 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors w-[25%]" onClick={() => handleSort('tema')}>
                            <div className="flex items-center gap-1">
                              Tema de Capacitación
                              {sortField === 'tema' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="py-4 px-4 cursor-pointer hover:bg-slate-100 select-none transition-colors w-[15%]" onClick={() => handleSort('capacitador')}>
                            <div className="flex items-center gap-1">
                              Capacitador
                              {sortField === 'capacitador' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="py-4 px-4 text-center cursor-pointer hover:bg-slate-100 select-none transition-colors w-[12%]" onClick={() => handleSort('fecha_inicio_planificada')}>
                            <div className="flex items-center justify-center gap-1">
                              Fechas Programadas
                              {sortField === 'fecha_inicio_planificada' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="py-4 px-4 text-center cursor-pointer hover:bg-slate-100 select-none transition-colors w-[8%]" onClick={() => handleSort('progreso')}>
                            <div className="flex items-center justify-center gap-1">
                              Progreso / Estado
                              {sortField === 'progreso' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="py-4 px-6 text-right w-[5%]">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                        {sortedCapacitaciones.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-12 px-6 text-center text-slate-400 italic">
                              No se encontraron registros de capacitaciones programadas.
                            </td>
                          </tr>
                        ) : (
                          sortedCapacitaciones.map((cap) => {
                            const emp = empresas.find(e => e.id === cap.empresa_id);
                            const est = allEstablecimientos.find(t => t.id === cap.establecimiento_id);
                            const status = getProgressStatus(cap.progreso);

                            return (
                              <tr 
                                key={cap.id} 
                                onClick={() => handleEditClick(cap)}
                                className="hover:bg-slate-50 transition-colors cursor-pointer"
                              >
                                <td className="py-4 px-6">
                                  <span className="font-bold text-slate-800 block">{emp?.razon_social || 'Desconocido'}</span>
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {est?.denominacion || 'General / Todos'}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-slate-700 font-medium">
                                  <span className="block truncate max-w-[140px]" title={cap.puesto}>
                                    {cap.puesto || <span className="text-slate-400 italic">No especificado</span>}
                                  </span>
                                </td>
                                <td className="py-4 px-4">
                                  <span className="block font-semibold text-slate-800 truncate max-w-[240px]" title={cap.tema}>
                                    {cap.tema}
                                  </span>
                                  {cap.contenido && (
                                    <span className="text-[10px] text-slate-400 block truncate max-w-[240px] mt-0.5" title={cap.contenido}>
                                      {cap.contenido}
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-slate-700 font-medium">
                                  {cap.capacitador}
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <span className="text-[10px] text-slate-600 block font-mono">
                                    {formatDate(cap.fecha_inicio_planificada)} al
                                  </span>
                                  <span className="text-[10px] text-slate-600 block font-mono">
                                    {formatDate(cap.fecha_fin_planificada)}
                                  </span>
                                </td>
                                <td className="py-4 px-4 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${status.color}`}>
                                      {status.text} ({cap.progreso}%)
                                    </span>
                                    <div className="w-16 h-1.5 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
                                      <div className="bg-[#468DFF] h-full" style={{ width: `${cap.progreso}%` }} />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-4 px-6 text-right space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {cap.fotos_urls && cap.fotos_urls.length > 0 && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleViewFotosClick(cap); }}
                                      title="Ver Registros de Capacitación (Fotos)"
                                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors inline-block cursor-pointer"
                                    >
                                      <ImageIcon className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditClick(cap); }}
                                    title="Editar"
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors inline-block cursor-pointer"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(cap.id); }}
                                    title="Eliminar"
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-red-600 transition-colors inline-block cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* MODAL DE CONFIRMACIÓN */}
      {modalAlert.show && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-sm w-full space-y-4 text-center">
            <div className="mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center bg-amber-50 text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-outfit text-base font-extrabold text-slate-800">{modalAlert.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{modalAlert.message}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeAlert}
                className="flex-1 py-2 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer bg-white"
              >
                Cancelar
              </button>
              {modalAlert.onConfirm && (
                <button
                  type="button"
                  onClick={modalAlert.onConfirm}
                  className="flex-1 py-2 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/10 cursor-pointer"
                >
                  Confirmar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZACIÓN DE FOTOS DE REGISTRO */}
      {viewingFotosCap && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-w-2xl w-full space-y-4 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="font-outfit text-base font-extrabold text-slate-900">Registros de Capacitación</h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{viewingFotosCap.tema} - {viewingFotosCap.puesto || 'General'}</p>
              </div>
              <button 
                onClick={() => { setViewingFotosCap(null); setViewingFotosUrls([]); }} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {viewingFotosUrls.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 italic text-xs">
                  Cargando imágenes de registro...
                </div>
              ) : (
                viewingFotosUrls.map((url, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video flex items-center justify-center shadow-sm">
                    <img src={url} alt={`Registro ${i+1}`} className="max-h-full max-w-full object-contain" />
                    <a 
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-1.5"
                    >
                      <Eye className="h-4 w-4" />
                      Ampliar Imagen
                    </a>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setViewingFotosCap(null); setViewingFotosUrls([]); }}
                className="py-2 px-6 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors bg-white cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notificación Toast flotante */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg transition-all text-xs font-bold ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-600'
            : 'bg-emerald-50 border-emerald-200 text-emerald-600'
        }`}>
          <Check className="h-4 w-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

    </div>
  );
}
