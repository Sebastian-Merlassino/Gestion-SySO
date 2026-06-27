// src/app/[tenant-slug]/accidentes/page.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import DocumentUploadZone from '@/components/ui/DocumentUploadZone';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import {
  ShieldAlert,
  HelpCircle,
  AlertTriangle,
  Upload,
  X,
  Loader2,
  PlusCircle,
  Search,
  Sliders,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  Menu,
  Building,
  Users,
  Calendar,
  FileText,
  Eye,
  Download,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  ExternalLink,
  Clock,
  Activity
} from 'lucide-react';

// ── Constantes estáticas ────────────────────────────────────────────────────
const TIPO_OPTIONS = [
  'Accidente de trabajo',
  'Accidente in itinere',
  'Incidente',
  'Enfermedad profesional',
  'Rechazo',
  'Reingreso',
];

const GRAVEDAD_OPTIONS = ['Leve', 'Grave', 'Mortal'];

const GRAVEDAD_CONFIG = {
  Leve: {
    badge: 'bg-green-100 text-green-800 border-green-400 font-extrabold',
    dot: 'bg-green-500',
  },
  Grave: {
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-400 font-extrabold',
    dot: 'bg-yellow-500',
  },
  Mortal: {
    badge: 'bg-red-100 text-red-800 border-red-400 font-extrabold',
    dot: 'bg-red-500',
  },
};

const GRAVEDAD_GUIA = [
  {
    nivel: 'Leve',
    color: 'bg-green-100 border-green-400',
    dot: 'bg-green-500',
    criterio:
      'Lesiones que permiten retomar el trabajo tras la asistencia. No requieren períodos prolongados de recuperación. Generalmente con primeros auxilios o atención médica básica. Requieren menos de 10 días de baja laboral. No generan incapacidad permanente.',
    ejemplos: 'Cortes superficiales, contusiones menores, torceduras leves, dermatitis leve por contacto.',
  },
  {
    nivel: 'Grave',
    color: 'bg-yellow-100 border-yellow-400',
    dot: 'bg-yellow-500',
    criterio:
      'Lesiones que requieren tratamiento médico prolongado. Generan incapacidad laboral temporal (ILT). Requieren más de 10 días de baja laboral. Pueden dejar secuelas o generar incapacidad parcial permanente.',
    ejemplos: 'Fracturas, quemaduras de importancia, traumatismos severos, hipoacusia profesional, tendinitis crónica.',
  },
  {
    nivel: 'Mortal',
    color: 'bg-red-100 border-red-400',
    dot: 'bg-red-500',
    criterio:
      'Provocan el fallecimiento del trabajador. Pueden ser inmediatas o posteriores como consecuencia del accidente o enfermedad profesional.',
    ejemplos: '—',
  },
];

// PdfUploadZone removed in favor of reusable DocumentUploadZone component

// ── Helpers ─────────────────────────────────────────────────────────────────
function parseDateISOorDMY(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (parts[2].length !== 4) return null;
    return new Date(year, month, day);
  } else if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (parts[0].length !== 4) return null;
    return new Date(year, month, day);
  }
  return null;
}

function calcDiasBaja(fechaSiniestro, fechaAlta) {
  const d1 = parseDateISOorDMY(fechaSiniestro);
  const d2 = parseDateISOorDMY(fechaAlta);
  if (!d1 || !d2) return null;
  const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

// ── Componente principal ────────────────────────────────────────────────────
export default function AccidentesPage({ params }) {
  const tenantSlug = params['tenant-slug'];

  // ── Estados estructurales ─────────────────────────────────────────────────
  const [profile, setProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('user-profile');
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [tenant, setTenant] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);

  // ── Catálogos desde Supabase ──────────────────────────────────────────────
  const [formasAccidente, setFormasAccidente] = useState([]);
  const [descripcionesLesion, setDescripcionesLesion] = useState([]);
  const [zonasCuerpo, setZonasCuerpo] = useState([]);
  const [agentesMateriales, setAgentesMateriales] = useState([]);

  // ── Lista principal ───────────────────────────────────────────────────────
  const [accidentes, setAccidentes] = useState([]);

  // ── Estado de formulario ──────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Campos del formulario
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [areaSector, setAreaSector] = useState('');
  const [puestoOperacion, setPuestoOperacion] = useState('');
  const [nombreApellido, setNombreApellido] = useState('');
  const [cuil, setCuil] = useState('');
  const [fechaSiniestro, setFechaSiniestro] = useState('');
  const [hora, setHora] = useState('');
  const [fechaDenuncia, setFechaDenuncia] = useState('');
  const [nroSiniestro, setNroSiniestro] = useState('');
  const [tipo, setTipo] = useState('');
  const [gravedad, setGravedad] = useState('');
  const [descripcionHechos, setDescripcionHechos] = useState('');
  const [formaAccidenteId, setFormaAccidenteId] = useState('');
  const [descripcionLesionId, setDescripcionLesionId] = useState('');
  const [zonaCuerpoId, setZonaCuerpoId] = useState('');
  const [agenteMaterialId, setAgenteMaterialId] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [fechaAltaRechazo, setFechaAltaRechazo] = useState('');
  const [diasBaja, setDiasBaja] = useState(null);
  const [observaciones, setObservaciones] = useState('');

  // ── Archivos PDF — Denuncia ───────────────────────────────────────────────
  const [denunciaFile, setDenunciaFile] = useState(null);
  const [denunciaFileName, setDenunciaFileName] = useState('');
  const [denunciaUrl, setDenunciaUrl] = useState('');

  // ── Archivos PDF — Informe Investigación ─────────────────────────────────
  const [informeFile, setInformeFile] = useState(null);
  const [informeFileName, setInformeFileName] = useState('');
  const [informeUrl, setInformeUrl] = useState('');

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [filterText, setFilterText] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterGravedad, setFilterGravedad] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Ordenamiento ──────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState('fecha_siniestro');
  const [sortOrder, setSortOrder] = useState('desc');

  // ── UI/Modales ────────────────────────────────────────────────────────────
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  const [saveLoading, setSaveLoading] = useState(false);
  const [showGravedadGuide, setShowGravedadGuide] = useState(false);

  // ── Permisos ──────────────────────────────────────────────────────────────
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
      eliminar: perm.eliminar === true,
    };
  };

  const sectionPerms = getSectionPermissions(profile, 'accidentes');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;
  const isFormDisabled = (editingId ? !canEditar : !canCargar) || isReadOnlyView;

  // ── Sidebar collapse ──────────────────────────────────────────────────────
  useEffect(() => {
    const collapsed = localStorage.getItem('sidebar-collapsed');
    if (collapsed === 'true') setIsSidebarCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    const newVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(newVal);
    localStorage.setItem('sidebar-collapsed', String(newVal));
  };

  // ── Cálculo automático de días de baja ───────────────────────────────────
  useEffect(() => {
    const d = calcDiasBaja(fechaSiniestro, fechaAltaRechazo);
    setDiasBaja(d);
  }, [fechaSiniestro, fechaAltaRechazo]);

  // ── Carga de datos ────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsDevMode(true);
        loadMockData();
      } else {
        await loadRealData();
      }
    };
    init();
  }, []);

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const closeAlert = () =>
    setModalAlert({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });

  const loadRealData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      const { data: prof, error: pErr } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (pErr) throw pErr;
      setProfile(prof);
      if (typeof window !== 'undefined') sessionStorage.setItem('user-profile', JSON.stringify(prof));
      if (prof.role === 'cliente') setIsReadOnlyView(true);

      const { data: ten, error: tErr } = await supabase.from('tenants').select('*').eq('slug', tenantSlug).single();
      if (tErr || !ten) { window.location.href = '/login'; return; }

      // Verificar acceso multi-tenant
      let hasAccess = prof.tenant_id === ten.id;
      if (!hasAccess) {
        const { data: member } = await supabase
          .from('miembros_equipo')
          .select('id, tiene_acceso')
          .eq('tenant_id', ten.id)
          .eq('profile_id', user.id)
          .maybeSingle();
        if (member && member.tiene_acceso) hasAccess = true;
      }
      if (!hasAccess) { window.location.href = '/login'; return; }
      setTenant(ten);

      // Empresas
      let empQ = supabase.from('empresas').select('id, razon_social').eq('tenant_id', ten.id);
      if (prof.role === 'cliente') empQ = empQ.eq('id', prof.empresa_id);
      const { data: emps } = await empQ.order('razon_social');
      setEmpresas(emps || []);

      // Establecimientos
      let estQ = supabase.from('establecimientos').select('id, empresa_id, denominacion').eq('tenant_id', ten.id);
      if (prof.role === 'cliente') estQ = estQ.eq('empresa_id', prof.empresa_id);
      const { data: ests } = await estQ.order('denominacion');
      setAllEstablecimientos(ests || []);

      // Catálogos (lectura pública)
      const [
        { data: formas },
        { data: descLesion },
        { data: zonas },
        { data: agentes },
      ] = await Promise.all([
        supabase.from('formas_accidente').select('id, nombre').order('nombre'),
        supabase.from('descripciones_lesion').select('id, nombre').order('nombre'),
        supabase.from('zonas_cuerpo_afectadas').select('id, nombre').order('nombre'),
        supabase.from('agentes_materiales_asociados').select('id, nombre').order('nombre'),
      ]);
      setFormasAccidente(formas || []);
      setDescripcionesLesion(descLesion || []);
      setZonasCuerpo(zonas || []);
      setAgentesMateriales(agentes || []);

      // Accidentes
      let accQ = supabase.from('accidentes').select('*').eq('tenant_id', ten.id);
      if (prof.role === 'cliente') accQ = accQ.eq('empresa_id', prof.empresa_id);
      const { data: accs, error: accErr } = await accQ.order('created_at', { ascending: false });
      if (accErr) throw accErr;

      // Firmar URLs en lote
      const pathsToSign = [];
      (accs || []).forEach(a => {
        [a.denuncia_accidente_url, a.informe_investigacion_url].forEach(url => {
          if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
            pathsToSign.push(url);
          }
        });
      });

      let signedMap = {};
      if (pathsToSign.length > 0) {
        try {
          const { data: signed } = await supabase.storage.from('documents').createSignedUrls(pathsToSign, 3600);
          (signed || []).forEach(s => { if (s.signedUrl) signedMap[s.path] = s.signedUrl; });
        } catch (e) {
          console.error('Error firmando URLs:', e);
        }
      }

      const resolveUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        return signedMap[url] || '';
      };

      const resolved = (accs || []).map(a => ({
        ...a,
        denuncia_signed_url: resolveUrl(a.denuncia_accidente_url),
        informe_signed_url: resolveUrl(a.informe_investigacion_url),
      }));

      setAccidentes(resolved);
      setLoading(false);
    } catch (err) {
      console.error('Error cargando accidentes:', err);
      triggerToast('Error al conectar con la base de datos.', 'error');
      setIsDevMode(true);
      loadMockData();
    }
  };

  const loadMockData = () => {
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'admin' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Prueba', plan_id: 'basic_5' });
    setEmpresas([
      { id: 'mock-emp-1', razon_social: 'Acme Argentina S.A.' },
      { id: 'mock-emp-2', razon_social: 'Logística Norte SRL' },
    ]);
    setAllEstablecimientos([
      { id: 'mock-est-1', empresa_id: 'mock-emp-1', denominacion: 'Planta Industrial Pilar' },
      { id: 'mock-est-2', empresa_id: 'mock-emp-1', denominacion: 'Oficinas Belgrano' },
      { id: 'mock-est-3', empresa_id: 'mock-emp-2', denominacion: 'Depósito Pacheco' },
    ]);
    setFormasAccidente([{ id: 'f1', nombre: 'Caída de personas a distinto nivel' }, { id: 'f2', nombre: 'Golpe por objeto en movimiento' }]);
    setDescripcionesLesion([{ id: 'd1', nombre: 'Fractura' }, { id: 'd2', nombre: 'Contusión' }]);
    setZonasCuerpo([{ id: 'z1', nombre: 'Mano' }, { id: 'z2', nombre: 'Pie' }]);
    setAgentesMateriales([{ id: 'a1', nombre: 'Herramienta de mano' }, { id: 'a2', nombre: 'Máquina' }]);
    setAccidentes([
      {
        id: 'mock-acc-1',
        empresa_id: 'mock-emp-1',
        establecimiento_id: 'mock-est-1',
        nombre_apellido: 'Carlos García',
        cuil: '20304445556',
        fecha_siniestro: '2026-06-01',
        tipo: 'Accidente de trabajo',
        gravedad: 'Leve',
        dias_baja: 5,
        denuncia_accidente_url: '',
        informe_investigacion_url: '',
        denuncia_signed_url: '',
        informe_signed_url: '',
      },
    ]);
    setLoading(false);
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') sessionStorage.removeItem('user-profile');
    window.location.href = '/login';
  };

  // ── Establecimientos filtrados por empresa ────────────────────────────────
  const filteredEstabs = allEstablecimientos.filter(e => e.empresa_id === empresaId);
  const filterEstabs = allEstablecimientos.filter(e => !filterEmpresa || e.empresa_id === filterEmpresa);

  // ── Ordenamiento ──────────────────────────────────────────────────────────
  const handleSort = (field) => {
    setSortOrder(prev => (sortField === field && prev === 'asc' ? 'desc' : 'asc'));
    setSortField(field);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30 inline ml-1" />;
    return sortOrder === 'asc'
      ? <ChevronUp className="h-3 w-3 opacity-70 inline ml-1" />
      : <ChevronDown className="h-3 w-3 opacity-70 inline ml-1" />;
  };

  // ── Filtrado + Ordenamiento de lista ──────────────────────────────────────
  const filteredAccidentes = accidentes
    .filter(a => {
      const textMatch = !filterText || [a.nombre_apellido, a.nro_siniestro, a.diagnostico, a.descripcion_hechos]
        .some(v => (v || '').toLowerCase().includes(filterText.toLowerCase()));
      const empMatch = !filterEmpresa || a.empresa_id === filterEmpresa;
      const estMatch = !filterEstablecimiento || a.establecimiento_id === filterEstablecimiento;
      const fechaMatch = !filterFecha || (a.fecha_siniestro || '').includes(filterFecha);
      const tipoMatch = !filterTipo || a.tipo === filterTipo;
      const gravMatch = !filterGravedad || a.gravedad === filterGravedad;
      return textMatch && empMatch && estMatch && fechaMatch && tipoMatch && gravMatch;
    })
    .sort((a, b) => {
      let va = a[sortField] || '';
      let vb = b[sortField] || '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortOrder === 'asc' ? -1 : 1;
      if (va > vb) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // ── Helpers de lookups ────────────────────────────────────────────────────
  const getEmpresaNombre = (id) => empresas.find(e => e.id === id)?.razon_social || '—';
  const getEstabNombre = (id) => allEstablecimientos.find(e => e.id === id)?.denominacion || '—';
  const getFormaName = (id) => formasAccidente.find(f => f.id === id)?.nombre || '—';
  const getDescLesionName = (id) => descripcionesLesion.find(d => d.id === id)?.nombre || '—';
  const getZonaName = (id) => zonasCuerpo.find(z => z.id === id)?.nombre || '—';
  const getAgenteName = (id) => agentesMateriales.find(a => a.id === id)?.nombre || '—';

  // ── Manejo de archivos PDF ────────────────────────────────────────────────
  const handleDenunciaFileChange = (file) => {
    setDenunciaFile(file);
    setDenunciaFileName(file ? file.name : '');
  };

  const handleInformeFileChange = (file) => {
    setInformeFile(file);
    setInformeFileName(file ? file.name : '');
  };

  // Subir PDF a storage
  const uploadPdf = async (file, prefix) => {
    if (isDevMode) return `mock-path/${prefix}_${Date.now()}.pdf`;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autorizado');
    const filePath = `${user.id}/${prefix}_${Date.now()}.pdf`;
    const { error } = await supabase.storage.from('documents').upload(filePath, file, {
      cacheControl: '3600', upsert: true, contentType: 'application/pdf',
    });
    if (error) throw error;
    return filePath;
  };

  // Ver PDF
  const handleViewPdf = async (url) => {
    if (!url) return;
    if (url.startsWith('http://') || url.startsWith('https://')) { window.open(url, '_blank'); return; }
    if (isDevMode) { triggerToast('Vista previa no disponible en modo desarrollo.', 'info'); return; }
    try {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(url, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch { triggerToast('Error al abrir el PDF.', 'error'); }
  };

  // ── Guardar accidente ─────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();

    if (!empresaId) { triggerToast('La Razón Social es obligatoria.', 'error'); return; }
    if (!establecimientoId) { triggerToast('El Establecimiento es obligatorio.', 'error'); return; }
    if (!nombreApellido.trim()) { triggerToast('El nombre y apellido del accidentado es obligatorio.', 'error'); return; }
    if (!tipo) { triggerToast('El Tipo es obligatorio.', 'error'); return; }
    if (!gravedad) { triggerToast('La Gravedad es obligatoria.', 'error'); return; }

    setSaveLoading(true);
    try {
      // Subir archivos si corresponde
      let finalDenunciaUrl = denunciaUrl;
      let finalInformeUrl = informeUrl;

      if (denunciaFile) finalDenunciaUrl = await uploadPdf(denunciaFile, 'denuncia');
      if (informeFile) finalInformeUrl = await uploadPdf(informeFile, 'informe');

      const payload = {
        tenant_id: isDevMode ? 'mock-tenant' : tenant.id,
        empresa_id: empresaId,
        establecimiento_id: establecimientoId,
        area_sector: areaSector.trim() || null,
        puesto_operacion: puestoOperacion.trim() || null,
        nombre_apellido: nombreApellido.trim(),
        cuil: cuil.replace(/[^0-9]/g, '') || null,
        fecha_siniestro: convertToDbDate(fechaSiniestro) || null,
        hora: hora || null,
        fecha_denuncia: convertToDbDate(fechaDenuncia) || null,
        nro_siniestro: nroSiniestro.trim() || null,
        tipo,
        gravedad,
        descripcion_hechos: descripcionHechos.trim() || null,
        forma_accidente_id: formaAccidenteId || null,
        descripcion_lesion_id: descripcionLesionId || null,
        zona_cuerpo_id: zonaCuerpoId || null,
        agente_material_id: agenteMaterialId || null,
        diagnostico: diagnostico.trim() || null,
        fecha_alta_rechazo: convertToDbDate(fechaAltaRechazo) || null,
        dias_baja: diasBaja,
        denuncia_accidente_url: finalDenunciaUrl || null,
        informe_investigacion_url: finalInformeUrl || null,
        observaciones: observaciones.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (isDevMode) {
        if (editingId) {
          setAccidentes(prev => prev.map(a => a.id === editingId ? { ...a, ...payload } : a));
          triggerToast('Accidente actualizado (Mock).');
        } else {
          setAccidentes(prev => [{ id: 'mock-' + Date.now(), ...payload, created_at: new Date().toISOString() }, ...prev]);
          triggerToast('Accidente registrado (Mock).');
        }
      } else {
        if (editingId) {
          const { error } = await supabase.from('accidentes').update(payload).eq('id', editingId);
          if (error) throw error;
          triggerToast('Accidente actualizado exitosamente.');
        } else {
          const { error } = await supabase.from('accidentes').insert([{ ...payload, created_at: new Date().toISOString() }]);
          if (error) throw error;
          triggerToast('Accidente registrado exitosamente.');
        }
        await loadRealData();
      }

      handleCloseForm();
    } catch (err) {
      console.error('Error al guardar accidente:', err);
      triggerToast(err.message || 'Error al guardar.', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // ── Editar ────────────────────────────────────────────────────────────────
  const handleEditClick = (acc, readOnly = false) => {
    setIsReadOnlyView(readOnly || profile?.role === 'cliente');
    setEditingId(acc.id);
    setEmpresaId(acc.empresa_id || '');
    setEstablecimientoId(acc.establecimiento_id || '');
    setAreaSector(acc.area_sector || '');
    setPuestoOperacion(acc.puesto_operacion || '');
    setNombreApellido(acc.nombre_apellido || '');
    setCuil(acc.cuil || '');
    setFechaSiniestro(formatDate(acc.fecha_siniestro) || '');
    setHora(acc.hora || '');
    setFechaDenuncia(formatDate(acc.fecha_denuncia) || '');
    setNroSiniestro(acc.nro_siniestro || '');
    setTipo(acc.tipo || '');
    setGravedad(acc.gravedad || '');
    setDescripcionHechos(acc.descripcion_hechos || '');
    setFormaAccidenteId(acc.forma_accidente_id || '');
    setDescripcionLesionId(acc.descripcion_lesion_id || '');
    setZonaCuerpoId(acc.zona_cuerpo_id || '');
    setAgenteMaterialId(acc.agente_material_id || '');
    setDiagnostico(acc.diagnostico || '');
    setFechaAltaRechazo(formatDate(acc.fecha_alta_rechazo) || '');
    setObservaciones(acc.observaciones || '');
    // Archivos
    setDenunciaUrl(acc.denuncia_accidente_url || '');
    setDenunciaFile(null);
    setDenunciaFileName(acc.denuncia_accidente_url ? 'Archivo existente' : '');
    setInformeUrl(acc.informe_investigacion_url || '');
    setInformeFile(null);
    setInformeFileName(acc.informe_investigacion_url ? 'Archivo existente' : '');
    setIsFormOpen(true);
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const handleDeleteClick = (id) => {
    setModalAlert({
      show: true,
      title: '¿Eliminar Accidente?',
      message: 'Esta acción eliminará de forma permanente el registro del accidente seleccionado y no se podrá deshacer.',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          if (isDevMode) {
            setAccidentes(prev => prev.filter(a => a.id !== id));
            triggerToast('Accidente eliminado (Mock).');
          } else {
            const { error } = await supabase.from('accidentes').delete().eq('id', id);
            if (error) throw error;
            triggerToast('Accidente eliminado exitosamente.');
            await loadRealData();
          }
          handleCloseForm();
        } catch (err) {
          triggerToast('No tienes permisos para realizar esta acción.', 'error');
        } finally {
          closeAlert();
        }
      },
    });
  };

  // ── Cierre de formulario ──────────────────────────────────────────────────
  const handleExitForm = () => {
    if (isReadOnlyView) { handleCloseForm(); return; }
    setModalAlert({
      show: true,
      title: 'Salir sin guardar',
      message: '¿Estás seguro de que deseas salir del formulario? Perderás los cambios no guardados.',
      confirmText: 'Confirmar',
      onConfirm: () => { closeAlert(); handleCloseForm(); },
    });
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setIsReadOnlyView(profile?.role === 'cliente' ? true : false);
    // Reset form
    setEmpresaId(''); setEstablecimientoId(''); setAreaSector(''); setPuestoOperacion('');
    setNombreApellido(''); setCuil(''); setFechaSiniestro(''); setHora(''); setFechaDenuncia('');
    setNroSiniestro(''); setTipo(''); setGravedad(''); setDescripcionHechos('');
    setFormaAccidenteId(''); setDescripcionLesionId(''); setZonaCuerpoId(''); setAgenteMaterialId('');
    setDiagnostico(''); setFechaAltaRechazo(''); setDiasBaja(null); setObservaciones('');
    setDenunciaFile(null); setDenunciaFileName(''); setDenunciaUrl('');
    setInformeFile(null); setInformeFileName(''); setInformeUrl('');
  };

  // ── Navegación del sidebar ────────────────────────────────────────────────
  const handleSidebarNavigation = (e, path) => {
    if (!isFormOpen) return;
    if (isReadOnlyView) {
      if (path.endsWith('/accidentes')) { handleCloseForm(); } else { window.location.href = path; }
      return;
    }
    e.preventDefault();
    setModalAlert({
      show: true,
      title: 'Salir sin guardar',
      message: '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.',
      confirmText: 'Confirmar',
      onConfirm: () => {
        closeAlert();
        if (path.endsWith('/accidentes')) { handleCloseForm(); } else { window.location.href = path; }
      },
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#D9D9D9] overflow-hidden font-sans text-slate-700">
      {/* ── Sidebar ── */}
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="accidentes"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      {/* ── Main Container ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* ── Header Estático ── */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <ShieldAlert className="h-5 w-5 text-[#468DFF] shrink-0" />
            <h1 className="font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none">
              Registro y Seguimiento de Accidentes
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-slate-500 bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-150 hidden sm:inline-block">
              {tenant?.name || 'Cargando...'}
            </span>
            <span className={`px-2.5 py-1.5 rounded-lg bg-[#468DFF]/15 border border-[#468DFF]/25 text-[#468DFF] text-[10px] font-bold uppercase tracking-wider ${(!profile || profile.role === 'cliente') ? 'hidden' : ''}`} suppressHydrationWarning>
              {tenant?.plan_id ? (tenant.plan_id.toLowerCase() === 'libre' ? 'Plan Libre' : tenant.plan_id.toLowerCase().startsWith('standard') ? 'Plan Standard' : tenant.plan_id.toLowerCase().startsWith('basic') ? 'Plan Basic' : `Plan ${tenant.plan_id}`) : 'Plan Pro'}
            </span>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#468DFF] mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Cargando accidentes...</p>
            </div>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6 max-w-[95%] mx-auto w-full">
            
            {isFormOpen ? (
              /* ────────── VISTA FORMULARIO UNIFICADO ────────── */
              <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col animate-fade-in">
                
                {/* Encabezado del Formulario */}
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={handleExitForm}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-base font-bold text-slate-900">
                      {editingId
                        ? isReadOnlyView ? 'Detalle de Accidente' : 'Editar Registro de Accidente'
                        : 'Registrar Nuevo Accidente'}
                    </span>
                  </div>
                  <button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                  <fieldset disabled={isFormDisabled} className="space-y-6">

                    {/* SECCIÓN 1: Datos del Siniestro */}
                    <div className="space-y-4">
                      <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-[#468DFF]" />
                        Datos del Siniestro
                      </span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {/* Razón Social */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Razón Social <span className="text-red-500">*</span></label>
                          <select
                            value={empresaId}
                            onChange={e => { setEmpresaId(e.target.value); setEstablecimientoId(''); }}
                            required
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50"
                          >
                            <option value="">Seleccioná una empresa</option>
                            {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.razon_social}</option>)}
                          </select>
                        </div>

                        {/* Establecimiento */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Establecimiento <span className="text-red-500">*</span></label>
                          <select
                            value={establecimientoId}
                            onChange={e => setEstablecimientoId(e.target.value)}
                            required
                            disabled={!empresaId}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50"
                          >
                            <option value="">Seleccioná un establecimiento</option>
                            {filteredEstabs.map(est => <option key={est.id} value={est.id}>{est.denominacion}</option>)}
                          </select>
                        </div>

                        {/* Área / Sector */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Área / Sector</label>
                          <input
                            type="text"
                            value={areaSector}
                            onChange={e => setAreaSector(e.target.value)}
                            placeholder="Ej.: Producción"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>

                        {/* Puesto / Operación */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Puesto / Operación</label>
                          <input
                            type="text"
                            value={puestoOperacion}
                            onChange={e => setPuestoOperacion(e.target.value)}
                            placeholder="Ej.: Operario de línea"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>

                        {/* Apellido y nombre del accidentado */}
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Apellido y nombre del accidentado <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={nombreApellido}
                            onChange={e => setNombreApellido(e.target.value)}
                            required
                            placeholder="Ej.: Pérez, Juan Carlos"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>

                        {/* CUIL */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">CUIL <span className="text-[10px] font-normal text-slate-400">(11 dígitos sin guiones)</span></label>
                          <input
                            type="text"
                            value={cuil}
                            onChange={e => {
                              const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                              setCuil(v);
                            }}
                            maxLength={11}
                            placeholder="20304445556"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50 font-mono"
                          />
                        </div>

                        {/* Fecha siniestro */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Fecha siniestro / reingreso</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="DD/MM/YYYY"
                              maxLength={10}
                              value={fechaSiniestro}
                              onChange={e => setFechaSiniestro(formatAsDateInput(e.target.value))}
                              disabled={isFormDisabled}
                              className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50 font-mono"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                              <Calendar className="h-4 w-4" />
                              <input
                                type="date"
                                disabled={isFormDisabled}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val) {
                                    const parts = val.split('-');
                                    if (parts.length === 3) {
                                      setFechaSiniestro(`${parts[2]}/${parts[1]}/${parts[0]}`);
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Hora */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Hora</label>
                          <input
                            type="time"
                            value={hora}
                            onChange={e => setHora(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50 font-mono"
                          />
                        </div>

                        {/* Fecha de denuncia */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Fecha de denuncia</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="DD/MM/YYYY"
                              maxLength={10}
                              value={fechaDenuncia}
                              onChange={e => setFechaDenuncia(formatAsDateInput(e.target.value))}
                              disabled={isFormDisabled}
                              className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50 font-mono"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                              <Calendar className="h-4 w-4" />
                              <input
                                type="date"
                                disabled={isFormDisabled}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val) {
                                    const parts = val.split('-');
                                    if (parts.length === 3) {
                                      setFechaDenuncia(`${parts[2]}/${parts[1]}/${parts[0]}`);
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* N° de siniestro */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">N° de siniestro <span className="text-[10px] font-normal text-slate-400">(ART)</span></label>
                          <input
                            type="text"
                            value={nroSiniestro}
                            onChange={e => setNroSiniestro(e.target.value)}
                            placeholder="Número de denuncia ART"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>

                        {/* Tipo */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Tipo <span className="text-red-500">*</span></label>
                          <select
                            value={tipo}
                            onChange={e => setTipo(e.target.value)}
                            required
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50 text-slate-700"
                          >
                            <option value="">Seleccioná el tipo</option>
                            {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>

                        {/* Gravedad + Pictograma */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                            Gravedad <span className="text-red-500">*</span>
                            <span
                              role="button"
                              onClick={() => setShowGravedadGuide(true)}
                              className="text-slate-400 hover:text-[#468DFF] transition-colors cursor-pointer inline-flex items-center"
                              title="Ver guía de clasificación de gravedad"
                            >
                              <HelpCircle className="h-3.5 w-3.5" />
                            </span>
                          </label>
                          <select
                            value={gravedad}
                            onChange={e => setGravedad(e.target.value)}
                            required
                            className={`w-full border rounded-xl px-3.5 py-2 text-sm font-bold focus:outline-none transition-colors disabled:opacity-70
                              ${gravedad === 'Leve' ? 'border-green-400 bg-green-100 text-green-800 focus:border-green-500' : ''}
                              ${gravedad === 'Grave' ? 'border-yellow-400 bg-yellow-100 text-yellow-800 focus:border-yellow-500' : ''}
                              ${gravedad === 'Mortal' ? 'border-red-400 bg-red-100 text-red-800 focus:border-red-500' : ''}
                              ${!gravedad ? 'border-slate-300 bg-slate-50 text-slate-700 focus:border-[#468DFF]' : ''}
                            `}
                          >
                            <option value="">Seleccioná la gravedad</option>
                            {GRAVEDAD_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN 2: Descripción e Investigación */}
                    <div className="space-y-4">
                      <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#468DFF]" />
                        Descripción e Investigación
                      </span>
                      
                      <div className="space-y-4">
                        {/* Descripción de los hechos */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Descripción de los hechos</label>
                          <textarea
                            value={descripcionHechos}
                            onChange={e => setDescripcionHechos(e.target.value)}
                            rows={3}
                            placeholder="Describí cómo ocurrió el accidente..."
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-y disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Forma de accidente */}
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Forma de accidente</label>
                            <select
                              value={formaAccidenteId}
                              onChange={e => setFormaAccidenteId(e.target.value)}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50 text-slate-700"
                            >
                              <option value="">Seleccioná...</option>
                              {formasAccidente.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                            </select>
                          </div>

                          {/* Descripción de la lesión */}
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Descripción de la lesión</label>
                            <select
                              value={descripcionLesionId}
                              onChange={e => setDescripcionLesionId(e.target.value)}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50 text-slate-700"
                            >
                              <option value="">Seleccioná...</option>
                              {descripcionesLesion.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                            </select>
                          </div>

                          {/* Zona del cuerpo afectada */}
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Zona del cuerpo afectada</label>
                            <select
                              value={zonaCuerpoId}
                              onChange={e => setZonaCuerpoId(e.target.value)}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50 text-slate-700"
                            >
                              <option value="">Seleccioná...</option>
                              {zonasCuerpo.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                            </select>
                          </div>

                          {/* Agente material asociado */}
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Agente material asociado</label>
                            <select
                              value={agenteMaterialId}
                              onChange={e => setAgenteMaterialId(e.target.value)}
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50 disabled:bg-slate-50/50 text-slate-700"
                            >
                              <option value="">Seleccioná...</option>
                              {agentesMateriales.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Diagnóstico */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Diagnóstico</label>
                          <input
                            type="text"
                            value={diagnostico}
                            onChange={e => setDiagnostico(e.target.value)}
                            placeholder="Diagnóstico médico"
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN 3: Alta / Seguimiento */}
                    <div className="space-y-4">
                      <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                        <Activity className="h-4 w-4 text-[#468DFF]" />
                        Alta / Seguimiento
                      </span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Fecha de alta / rechazo */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Fecha de alta / rechazo</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="DD/MM/YYYY"
                              maxLength={10}
                              value={fechaAltaRechazo}
                              onChange={e => setFechaAltaRechazo(formatAsDateInput(e.target.value))}
                              disabled={isFormDisabled}
                              className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all disabled:opacity-70 disabled:bg-slate-50/50 font-mono"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                              <Calendar className="h-4 w-4" />
                              <input
                                type="date"
                                disabled={isFormDisabled}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val) {
                                    const parts = val.split('-');
                                    if (parts.length === 3) {
                                      setFechaAltaRechazo(`${parts[2]}/${parts[1]}/${parts[0]}`);
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Días de baja (calculado) */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Días de baja
                            <span className="ml-1 text-[10px] font-normal text-slate-400">(calculado automático)</span>
                          </label>
                          <div className={`w-full border rounded-xl px-3.5 py-2 text-sm font-semibold flex items-center gap-2 transition-all
                            ${diasBaja !== null ? 'bg-blue-50/50 border-blue-200 text-blue-700' : 'bg-slate-50/50 border-slate-200 text-slate-400'}`}>
                            <Clock className="h-4 w-4" />
                            {diasBaja !== null ? `${diasBaja} día${diasBaja !== 1 ? 's' : ''}` : '—'}
                          </div>
                        </div>

                        {/* Observaciones */}
                        <div className="md:col-span-3">
                          <label className="block text-xs font-bold text-slate-600 mb-1.5">Observaciones</label>
                          <textarea
                            value={observaciones}
                            onChange={e => setObservaciones(e.target.value)}
                            rows={2}
                            placeholder="Observaciones adicionales..."
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-700 focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-y disabled:opacity-70 disabled:bg-slate-50/50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN 4: Documentos */}
                    <div className="space-y-4">
                      <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                        <Upload className="h-4 w-4 text-[#468DFF]" />
                        Documentos
                      </span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Denuncia de accidente */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">Denuncia de accidente</label>
                          <DocumentUploadZone
                            label="Denuncia de accidente"
                            file={denunciaFile}
                            fileName={denunciaFileName}
                            url={denunciaUrl}
                            signedUrl={editingId ? accidentes.find(a => a.id === editingId)?.denuncia_signed_url : ''}
                            onFileChange={handleDenunciaFileChange}
                            onDriveImportSuccess={(filePath) => {
                              setDenunciaUrl(filePath);
                              setDenunciaFileName('Archivo de Drive importado');
                            }}
                            onViewPdf={handleViewPdf}
                            disabled={isFormDisabled}
                            tenantId={tenant?.id}
                            onToast={triggerToast}
                          />
                        </div>

                        {/* Informe de investigación */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">Informe de investigación de accidente</label>
                          <DocumentUploadZone
                            label="Informe de investigación"
                            file={informeFile}
                            fileName={informeFileName}
                            url={informeUrl}
                            signedUrl={editingId ? accidentes.find(a => a.id === editingId)?.informe_signed_url : ''}
                            onFileChange={handleInformeFileChange}
                            onDriveImportSuccess={(filePath) => {
                              setInformeUrl(filePath);
                              setInformeFileName('Archivo de Drive importado');
                            }}
                            onViewPdf={handleViewPdf}
                            disabled={isFormDisabled}
                            tenantId={tenant?.id}
                            onToast={triggerToast}
                          />
                        </div>
                      </div>
                    </div>

                  </fieldset>

                  {/* Botones del Formulario */}
                  <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleExitForm}
                      className="px-5 py-2.5 bg-[#FFFFFF] text-[#468DFF] border border-[#468DFF] rounded-xl text-sm font-bold hover:bg-[#468DFF] hover:text-[#FFFFFF] hover:border-[#FFFFFF] transition-all active:scale-[0.98] cursor-pointer"
                    >
                      Salir
                    </button>
                    <div className="flex items-center gap-3">
                      {isReadOnlyView ? (
                        canEditar && (
                          <button
                            type="button"
                            onClick={() => setIsReadOnlyView(false)}
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-amber-500/10"
                          >
                            Editar
                          </button>
                        )
                      ) : (
                        <>
                          {editingId && canEliminar && (
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(editingId)}
                              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-red-600/10 animate-fade-in"
                            >
                              Eliminar
                            </button>
                          )}
                          {!isFormDisabled && (
                            <button
                              type="submit"
                              disabled={saveLoading}
                              className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#468DFF]/10 disabled:opacity-50"
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
                          )}
                        </>
                      )}
                    </div>
                  </div>

                </form>
              </div>
            ) : (
              /* ────────── LISTADO (BÚSQUEDA, FILTROS Y TABLA) ────────── */
              <div className="space-y-6">

                {/* Panel de Filtros y Búsqueda */}
                <div className="bg-white rounded-2xl border border-slate-150 p-3 shadow-sm space-y-3 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Espaciador para empujar el buscador y botón a la derecha en desktop */}
                    <div className="hidden md:block flex-1"></div>

                    {/* Buscador y Botón agrupados */}
                    <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                      <div className="relative w-full md:w-72">
                        <span className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none">
                          <Search className="h-3.5 w-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder="Buscar por accidentado, N° siniestro, diagnóstico..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400 font-semibold"
                        />
                      </div>
                      
                      {canCargar && (
                        <button
                          onClick={() => {
                            setIsReadOnlyView(false);
                            setEditingId(null);
                            handleCloseForm();
                            setTimeout(() => setIsFormOpen(true), 0);
                          }}
                          className="px-3.5 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0 w-full md:w-auto font-sans"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Nuevo Accidente
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Selectores de Filtrado */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between min-h-[28px]">
                      <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        className="font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px] hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        <Sliders className="h-3 w-3" />
                        Filtros de Búsqueda
                        {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      {(filterEmpresa || filterEstablecimiento || filterFecha || filterTipo || filterGravedad) && (
                        <button
                          onClick={() => {
                            setFilterEmpresa('');
                            setFilterEstablecimiento('');
                            setFilterFecha('');
                            setFilterTipo('');
                            setFilterGravedad('');
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                    
                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-1 animate-fade-in">
                        {/* Selector Cliente */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Cliente</label>
                          <select
                            value={filterEmpresa}
                            onChange={(e) => {
                              setFilterEmpresa(e.target.value);
                              setFilterEstablecimiento('');
                            }}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todas las empresas</option>
                            {empresas.map((emp) => (
                              <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                            ))}
                          </select>
                        </div>

                        {/* Selector Establecimiento */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Establecimiento</label>
                          <select
                            disabled={!filterEmpresa}
                            value={filterEstablecimiento}
                            onChange={(e) => setFilterEstablecimiento(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer disabled:bg-slate-50 disabled:text-slate-400"
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

                        {/* Selector Año */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Año</label>
                          <input
                            type="text"
                            value={filterFecha}
                            onChange={(e) => setFilterFecha(e.target.value)}
                            placeholder="Año (ej: 2026)"
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          />
                        </div>

                        {/* Selector Tipo */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Tipo</label>
                          <select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Todos los tipos</option>
                            {TIPO_OPTIONS.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>

                        {/* Selector Gravedad */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Gravedad</label>
                          <select
                            value={filterGravedad}
                            onChange={(e) => setFilterGravedad(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer"
                          >
                            <option value="">Toda gravedad</option>
                            {GRAVEDAD_OPTIONS.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Listado / Tabla */}
                <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col" style={{ height: showFilters ? 'calc(100vh - 310px)' : 'calc(100vh - 240px)' }}>
                  <div className="overflow-auto font-sans flex-grow h-full">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                          <th
                            className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-150 whitespace-nowrap"
                            onClick={() => handleSort('empresa_id')}
                          >
                            <div className="flex items-center gap-1">
                              Empresa / Establecimiento <SortIcon field="empresa_id" />
                            </div>
                          </th>
                          <th
                            className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-150 whitespace-nowrap"
                            onClick={() => handleSort('nombre_apellido')}
                          >
                            <div className="flex items-center gap-1">
                              Accidentado <SortIcon field="nombre_apellido" />
                            </div>
                          </th>
                          <th
                            className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-150 whitespace-nowrap"
                            onClick={() => handleSort('fecha_siniestro')}
                          >
                            <div className="flex items-center gap-1">
                              Fecha siniestro <SortIcon field="fecha_siniestro" />
                            </div>
                          </th>
                          <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-150 whitespace-nowrap">
                            Tipo
                          </th>
                          <th
                            className="px-6 py-4 cursor-pointer hover:text-slate-700 transition-colors sticky top-0 z-10 bg-slate-50 border-b border-slate-150 whitespace-nowrap"
                            onClick={() => handleSort('gravedad')}
                          >
                            <div className="flex items-center gap-1">
                              Gravedad <SortIcon field="gravedad" />
                            </div>
                          </th>
                          <th className="px-6 py-4 text-center sticky top-0 z-10 bg-slate-50 border-b border-slate-150 whitespace-nowrap">
                            Días de baja
                          </th>
                          <th className="px-6 py-4 text-center sticky top-0 z-10 bg-slate-50 border-b border-slate-150 whitespace-nowrap">
                            Docs.
                          </th>
                          <th className="px-6 py-4 text-center sticky top-0 z-10 bg-slate-50 border-b border-slate-150 whitespace-nowrap">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                        {filteredAccidentes.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-20 text-slate-400 font-bold bg-slate-50/10">
                              <ShieldAlert className="h-10 w-10 mx-auto mb-2 text-slate-350 shrink-0" />
                              <p className="font-outfit text-sm text-slate-700">No hay accidentes registrados</p>
                              <p className="text-[11px] text-slate-400 font-normal mt-1">Registra un nuevo accidente para comenzar.</p>
                              {canCargar && (
                                <button
                                  onClick={() => {
                                    setIsReadOnlyView(false);
                                    setEditingId(null);
                                    handleCloseForm();
                                    setTimeout(() => setIsFormOpen(true), 0);
                                  }}
                                  className="mt-3 text-xs text-[#468DFF] hover:underline font-bold"
                                >
                                  + Registrar el primero
                                </button>
                              )}
                            </td>
                          </tr>
                        ) : (
                          filteredAccidentes.map(acc => {
                            const grav = GRAVEDAD_CONFIG[acc.gravedad] || {};
                            return (
                              <tr
                                key={acc.id}
                                className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                onClick={() => handleEditClick(acc, true)}
                              >
                                <td className="px-6 py-4 font-semibold text-slate-900">
                                  <span className="block">{getEmpresaNombre(acc.empresa_id)}</span>
                                  <span className="text-[10px] text-slate-400 font-normal block mt-0.5">{getEstabNombre(acc.establecimiento_id)}</span>
                                </td>
                                <td className="px-6 py-4 font-bold text-[#468DFF]">
                                  <span className="block">{acc.nombre_apellido}</span>
                                  {acc.cuil && <span className="text-slate-400 text-[10px] font-mono font-normal">CUIL: {acc.cuil}</span>}
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-semibold whitespace-nowrap">
                                  {formatDate(acc.fecha_siniestro) || '—'}
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-medium">
                                  {acc.tipo || '—'}
                                </td>
                                <td className="px-6 py-4">
                                  {acc.gravedad ? (
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${grav.badge}`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${grav.dot}`} />
                                      {acc.gravedad}
                                    </span>
                                  ) : '—'}
                                </td>
                                <td className="px-6 py-4 text-center font-bold">
                                  {(() => {
                                    const computedDias = (acc.dias_baja !== null && acc.dias_baja !== undefined)
                                      ? acc.dias_baja
                                      : calcDiasBaja(acc.fecha_siniestro, acc.fecha_alta_rechazo);
                                    return computedDias !== null && computedDias !== undefined ? (
                                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                        {computedDias}d
                                      </span>
                                    ) : '—';
                                  })()}
                                </td>
                                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1">
                                    {acc.denuncia_signed_url && (
                                      <button
                                        onClick={e => { e.stopPropagation(); handleViewPdf(acc.denuncia_signed_url); }}
                                        title="Ver denuncia de accidente"
                                        className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors inline-flex items-center justify-center shadow-sm"
                                      >
                                        <FileText className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                    {acc.informe_signed_url && (
                                      <button
                                        onClick={e => { e.stopPropagation(); handleViewPdf(acc.informe_signed_url); }}
                                        title="Ver informe de investigación"
                                        className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors inline-flex items-center justify-center shadow-sm"
                                      >
                                        <FileText className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                    {!acc.denuncia_signed_url && !acc.informe_signed_url && (
                                      <span className="text-slate-350 text-[10px] font-semibold">—</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1.5">
                                    {canEditar && (
                                      <button
                                        onClick={e => { e.stopPropagation(); handleEditClick(acc, false); }}
                                        title="Editar accidente"
                                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors bg-amber-50"
                                      >
                                        <Edit className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                    {canEliminar && (
                                      <button
                                        onClick={e => { e.stopPropagation(); handleDeleteClick(acc.id); }}
                                        title="Eliminar accidente"
                                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors bg-red-50"
                                      >
                                        <Trash2 className="h-4.5 w-4.5" />
                                      </button>
                                    )}
                                  </div>
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

      {/* ── Toast Flotante ── */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg transition-all text-xs font-bold animate-fade-in
          ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-600' : ''}
          ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : ''}
          ${toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-600' : ''}
        `}>
          {toast.type === 'success' && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
          {toast.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />}
          {toast.type === 'info' && <Check className="h-4 w-4 text-blue-500 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Modal Confirmación ── */}
      {modalAlert.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-xl max-w-sm w-full animate-scale-up space-y-4 text-center">
            <div className="mx-auto p-3 rounded-full w-12 h-12 flex items-center justify-center bg-amber-50 text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-outfit text-base font-bold text-slate-800">{modalAlert.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{modalAlert.message}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeAlert}
                className="flex-1 py-2.5 border border-slate-350 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer"
              >
                Cancelar
              </button>
              {modalAlert.onConfirm && (
                <button
                  type="button"
                  onClick={modalAlert.onConfirm}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
                >
                  {modalAlert.confirmText || 'Confirmar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Guía de Gravedad ── */}
      {showGravedadGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full mx-4 animate-scaleUp overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-[#468DFF]" />
                <h3 className="font-outfit font-bold text-slate-900">Guía de clasificación de gravedad</h3>
              </div>
              <button
                onClick={() => setShowGravedadGuide(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {GRAVEDAD_GUIA.map(g => (
                <div key={g.nivel} className={`rounded-xl border p-4 ${g.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`h-3 w-3 rounded-full ${g.dot}`} />
                    <span className="font-outfit font-bold text-slate-800">{g.nivel}</span>
                  </div>
                  <p className="text-sm text-slate-700 mb-1 leading-relaxed">{g.criterio}</p>
                  <p className="text-xs text-slate-500"><strong>Ejemplos:</strong> {g.ejemplos}</p>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowGravedadGuide(false)}
                className="px-5 py-2 text-sm font-semibold text-white bg-[#468DFF] rounded-xl hover:bg-[#0511F2] transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
