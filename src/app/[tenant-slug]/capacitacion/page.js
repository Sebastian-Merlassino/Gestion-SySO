// src/app/[tenant-slug]/capacitacion/page.js
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import ImageUploadZone from '@/components/ui/ImageUploadZone';
import DocumentUploadZone from '@/components/ui/DocumentUploadZone';
import AITextHelper from '@/components/ui/AITextHelper';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  PlusCircle, 
  Search, 
  Building, 
  Users, 
  AlertTriangle, 
  Printer, 
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
  Eye,
  ChevronDown,
  ChevronUp,
  Folder,
  FileText,
  ExternalLink
} from 'lucide-react';

export default function CapacitacionPage({ params }) {
  const tenantSlug = params['tenant-slug'];

  // Estados estructurales
  const [profile, setProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('user-profile');
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [tenant, setTenant] = useState(null);
  const [adminContact, setAdminContact] = useState({ email: 'info@gestionsyso.com', phone: '1159969956 / 1132296691' });
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);

  // Permisos granulares de edición
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

  const sectionPerms = getSectionPermissions(profile, 'capacitacion');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;
  const isFormDisabled = (editingId ? !canEditar : !canCargar) || isReadOnlyView;
  const canEdit = !isFormDisabled; // Maintain compatibility

  // Datos principales del programa de capacitaciones
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [temasList, setTemasList] = useState([]);
  const [miembrosList, setMiembrosList] = useState([]);

  // Estados del CRUD / Vista Formulario
  const [isFormOpen, setIsFormOpen] = useState(false);

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
  const [pdfFiles, setPdfFiles] = useState([]); // array de { file: File | null, fileName: string, path: string, url: string }
  const [viewingFotosCap, setViewingFotosCap] = useState(null); // capacitación para el modal de ver fotos
  const [viewingFotosUrls, setViewingFotosUrls] = useState([]); // urls firmadas para el modal de ver fotos

  // Estados para Carga desde Legajo Técnico
  const [uploadType, setUploadType] = useState('local'); // 'local', 'drive' or 'legajo'
  const [legajoDocuments, setLegajoDocuments] = useState([]);
  const [selectedLegajoDocUrl, setSelectedLegajoDocUrl] = useState('');
  const [loadingLegajoDocs, setLoadingLegajoDocs] = useState(false);

  // Filtros
  const [filterText, setFilterText] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMobile, setShowExportMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowFilters(false);
    }
  }, []);

  // Ordenamiento
  const [sortField, setSortField] = useState('fecha_inicio_planificada');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modales y Feedback
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
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

  // Auto-filtrar por cliente si la sesión iniciada es de rol 'cliente'
  useEffect(() => {
    if (profile && profile.role === 'cliente' && profile.empresa_id) {
      setFilterEmpresa(profile.empresa_id);
    }
  }, [profile]);

  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const closeAlert = () => setModalAlert({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });

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
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('user-profile', JSON.stringify(prof));
      }
      if (prof.role === 'cliente') {
        setIsReadOnlyView(true);
      }

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

      // Cargar Perfil del Administrador del Tenant
      const { data: adminProf } = await supabase
        .from('profiles')
        .select('email, phone')
        .eq('tenant_id', ten.id)
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      if (adminProf) {
        setAdminContact({
          email: adminProf.email || 'info@gestionsyso.com',
          phone: adminProf.phone || '1159969956 / 1132296691'
        });
      }

      // 3. Clientes
      let empresasQuery = supabase
        .from('empresas')
        .select('id, razon_social')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        empresasQuery = empresasQuery.eq('id', prof.empresa_id);
      }
      const { data: emps, error: empErr } = await empresasQuery.order('razon_social');
      if (empErr) throw empErr;
      setEmpresas(emps || []);

      // 4. Establecimientos
      let estsQuery = supabase
        .from('establecimientos')
        .select('id, empresa_id, denominacion')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        estsQuery = estsQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: ests, error: estErr } = await estsQuery.order('denominacion');
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
      let capQuery = supabase
        .from('programa_capacitacion')
        .select('*')
        .eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        capQuery = capQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: capData, error: capErr } = await capQuery.order('created_at', { ascending: false });
      if (capErr) throw capErr;

      // Recopilar paths de Supabase para firmar en lote (en una sola llamada de red)
      const pathsToSign = [];
      (capData || []).forEach(cap => {
        if (cap.fotos_urls && cap.fotos_urls.length > 0) {
          cap.fotos_urls.forEach(fpath => {
            if (fpath && fpath !== 'N/A' && fpath !== '') {
              if (!fpath.startsWith('http://') && !fpath.startsWith('https://')) {
                pathsToSign.push(fpath);
              }
            }
          });
        }
      });

      // Deduplicar paths
      const uniquePaths = Array.from(new Set(pathsToSign));

      let signedUrlsMap = {};
      if (uniquePaths.length > 0) {
        try {
          const { data: signedData, error: signErr } = await supabase.storage
            .from('documents')
            .createSignedUrls(uniquePaths, 3600);
          if (!signErr && signedData) {
            signedData.forEach(item => {
              if (item.signedUrl) {
                signedUrlsMap[item.path] = item.signedUrl;
              }
            });
          }
        } catch (e) {
          console.error('Error al firmar URLs de capacitación en lote:', e);
        }
      }

      // Resuelve URLs firmadas para las múltiples fotos de registro
      const resolvedCapacitaciones = (capData || []).map((cap) => {
        let signedUrls = [];
        if (cap.fotos_urls && cap.fotos_urls.length > 0) {
          const validUrls = cap.fotos_urls.filter(fpath => fpath && fpath !== 'N/A' && fpath !== '');
          signedUrls = validUrls.map((fpath) => {
            if (fpath.startsWith('http://') || fpath.startsWith('https://')) {
              return fpath;
            }
            return signedUrlsMap[fpath] || '';
          });
        }
        return {
          ...cap,
          fotos_preview_urls: signedUrls.filter(Boolean)
        };
      });
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
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'admin' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Prueba', plan_id: 'free' });
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

  const getBase64ImageFromUrl = async (imageUrl) => {
    if (!imageUrl) return '';
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error(`Invalid content type: ${blob.type}`);
      }
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result), false);
        reader.addEventListener('error', () => reject(new Error('FileReader error')), false);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error('Error fetching image to base64:', e);
      return '';
    }
  };

  const resizeImage = (base64Str, maxWidth = 400, maxHeight = 400) => {
    return new Promise((resolve) => {
      if (!base64Str || !base64Str.startsWith('data:image/')) {
        resolve('');
        return;
      }
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const handleExportPdfReport = async (shouldPrint = false) => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
        compress: true
      });

      let logoBase64 = '';
      try {
        if (tenant && tenant.logo_1_url) {
          logoBase64 = await getBase64ImageFromUrl(tenant.logo_1_url);
        }
      } catch (e) {
        console.error('Error loading logo:', e);
      }
      if (!logoBase64) {
        try {
          logoBase64 = await getBase64ImageFromUrl('/brand/logo-primary.png');
        } catch (e) {
          console.error('Error loading default logo:', e);
        }
      }
      if (logoBase64) {
        logoBase64 = await resizeImage(logoBase64, 200, 200);
      }

      // Construir indicador de filtros activos
      const filterParts = [];
      if (filterEmpresa) {
        const emp = empresas.find(e => e.id === filterEmpresa);
        if (emp) filterParts.push(`Cliente: ${emp.razon_social}`);
      }
      if (filterEstablecimiento) {
        const est = allEstablecimientos.find(e => e.id === filterEstablecimiento);
        if (est) filterParts.push(`Establecimiento: ${est.denominacion}`);
      }
      if (filterEstado) {
        filterParts.push(`Estado: ${filterEstado}`);
      }
      const filterString = filterParts.join(' | ');

      const showEmpresaCol = profile?.role !== 'cliente' && !filterEmpresa;
      const showEstablecimientoCol = !filterEstablecimiento;

      const drawHeader = (d) => {
        if (logoBase64 && logoBase64.startsWith('data:image/')) {
          try {
            d.addImage(logoBase64, 'PNG', 40, 15, 100, 50);
          } catch (e) {
            console.error('Error drawing logo:', e);
          }
        }
        d.setFont('helvetica', 'bold');
        d.setFontSize(14);
        d.setTextColor(13, 13, 13);
        d.text('Programa Anual de Capacitación', 801, 35, { align: 'right' });

        if (filterString) {
          d.setFont('helvetica', 'normal');
          d.setFontSize(8);
          d.setTextColor(100, 100, 100);
          d.text(filterString, 801, 55, { align: 'right' });
        }

        d.setDrawColor(217, 217, 217);
        d.setLineWidth(1);
        d.line(40, 70, 801, 70);
      };

      const headersRow = [];
      if (showEmpresaCol) headersRow.push('Cliente');
      if (showEstablecimientoCol) headersRow.push('Establecimiento');
      headersRow.push('Puesto', 'Tema de Capacitación', 'Capacitador', 'Inicio Planif.', 'Fin Planif.', 'Estado', 'Progreso');
      const headers = [headersRow];
      
      const body = sortedCapacitaciones.map(cap => {
        const emp = empresas.find(e => e.id === cap.empresa_id);
        const est = allEstablecimientos.find(e => e.id === cap.establecimiento_id);
        const status = getProgressStatus(cap.progreso);
        
        const rowData = [];
        if (showEmpresaCol) rowData.push(emp ? emp.razon_social : 'N/A');
        if (showEstablecimientoCol) rowData.push(est ? est.denominacion : 'N/A');
        rowData.push(
          cap.puesto || 'N/A',
          cap.tema || 'N/A',
          cap.capacitador || 'N/A',
          formatDate(cap.fecha_inicio_planificada) || 'N/A',
          formatDate(cap.fecha_fin_planificada) || 'N/A',
          status.text,
          `${cap.progreso || 0}%`
        );
        return rowData;
      });

      const columnsDef = [];
      if (showEmpresaCol) columnsDef.push({ key: 'cliente', ratio: 1.25 });
      if (showEstablecimientoCol) columnsDef.push({ key: 'establecimiento', ratio: 1.25 });
      columnsDef.push(
        { key: 'puesto', ratio: 1.25 },
        { key: 'tema', ratio: 2.2 },
        { key: 'capacitador', ratio: 1.25 },
        { key: 'fecha_inicio', ratio: 0.85 },
        { key: 'fecha_fin', ratio: 0.85 },
        { key: 'estado', ratio: 0.85 },
        { key: 'progreso', ratio: 0.7 }
      );

      const totalRatio = columnsDef.reduce((acc, col) => acc + col.ratio, 0);
      const colStyles = {};
      columnsDef.forEach((col, idx) => {
        colStyles[idx] = { cellWidth: (col.ratio / totalRatio) * 761.89 };
      });

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 90,
        margin: { top: 90, bottom: 65, left: 40, right: 40 },
        theme: 'striped',
        headStyles: { fillColor: [68, 114, 196], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7, textColor: [50, 50, 50] },
        columnStyles: colStyles,
        didDrawPage: function(data) {
          drawHeader(doc);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          
          doc.setDrawColor(217, 217, 217);
          doc.setLineWidth(1);
          doc.line(40, 545, 801, 545);
          
          const companyName = tenant?.name || 'Gestión SySO';
          const phoneVal = profile?.role === 'miembro' ? (profile?.phone || '') : adminContact.phone;
          const emailVal = profile?.role === 'miembro' ? (profile?.email || '') : adminContact.email;
          const footerText = `${companyName} - Tel: ${phoneVal} - Email: ${emailVal}`;
          doc.text(footerText, 420.94, 560, { align: 'center' });
          
          doc.text(`Página ${data.pageNumber}`, 801, 560, { align: 'right' });
        }
      });

      if (shouldPrint) {
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
      } else {
        doc.save(`Programa_Capacitaciones_${new Date().getFullYear()}.pdf`);
      }
    } catch (e) {
      console.error('Error generating PDF:', e);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user-profile');
    }
    window.location.href = '/login';
  };

  // Filtrar los establecimientos dependientes del cliente elegido en el formulario
  const filteredEstablecimientos = allEstablecimientos.filter(
    (est) => est.empresa_id === empresaId
  );

  const loadLegajoDocuments = async (empId, estId) => {
    if (!empId) {
      setLegajoDocuments([]);
      return;
    }
    setLoadingLegajoDocs(true);
    try {
      if (isDevMode) {
        const mockDocs = [
          {
            id: 'mock-legajo-1',
            empresa_id: 'mock-empresa-1',
            establecimiento_id: 'mock-est-1',
            documento_nombre: 'Relevamiento General de Riesgos Laborales',
            documento_url: 'mock-pdf-url',
            fecha: '2026-06-10'
          },
          {
            id: 'mock-legajo-2',
            empresa_id: 'mock-empresa-1',
            establecimiento_id: 'mock-est-1',
            documento_nombre: 'Estudio de Ruido Ocupacional',
            documento_url: 'mock-pdf-url',
            fecha: '2026-06-12'
          },
          {
            id: 'mock-legajo-3',
            empresa_id: 'mock-empresa-1',
            establecimiento_id: null,
            documento_nombre: 'Plan de Capacitación Anual General',
            documento_url: 'mock-pdf-url',
            fecha: '2026-06-01'
          }
        ];
        const filtered = mockDocs.filter(d => 
          d.empresa_id === empId && 
          (!estId || d.establecimiento_id === estId || d.establecimiento_id === null)
        );
        setLegajoDocuments(filtered);
      } else {
        const { data, error } = await supabase
          .from('legajo_tecnico')
          .select('id, documento_nombre, documento_url, fecha, establecimiento_id')
          .eq('empresa_id', empId)
          .order('fecha', { ascending: false });
        
        if (error) throw error;
        const filtered = (data || []).filter(d => 
          !estId || d.establecimiento_id === estId || d.establecimiento_id === null
        );
        setLegajoDocuments(filtered);
      }
    } catch (err) {
      console.error('Error al cargar documentos del legajo:', err);
      triggerToast('Error al cargar documentos del legajo técnico.', 'error');
    } finally {
      setLoadingLegajoDocs(false);
    }
  };

  useEffect(() => {
    if (isFormOpen && empresaId && uploadType === 'legajo') {
      loadLegajoDocuments(empresaId, establecimientoId);
    }
  }, [isFormOpen, empresaId, establecimientoId, uploadType]);

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
    if (isReadOnlyView) {
      handleCloseForm();
      return;
    }
    setModalAlert({
      show: true,
      title: 'Salir sin guardar',
      message: '¿Estás seguro de que deseas salir del formulario? Perderás todos los cambios cargados que no se hayan guardado.',
      confirmText: 'Confirmar',
      onConfirm: () => {
        closeAlert();
        handleCloseForm();
      }
    });
  };

  const handleSidebarNavigation = (e, path) => {
    if (isFormOpen) {
      if (isReadOnlyView) {
        if (path.endsWith('/capacitacion')) {
          handleCloseForm();
        } else {
          window.location.href = path;
        }
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
          if (path.endsWith('/capacitacion')) {
            handleCloseForm();
          } else {
            window.location.href = path;
          }
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
    setPdfFiles([]);
    setUploadType('local');
    setLegajoDocuments([]);
    setSelectedLegajoDocUrl('');
    setLoadingLegajoDocs(false);
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
      const finalFotosUrls = [];

      // 1. Subir fotos
      for (const foto of fotosFiles) {
        if (foto.file) {
          const uploadedPath = await uploadFotoToStorage(foto.file, finalFotosUrls.length);
          finalFotosUrls.push(uploadedPath);
        } else if (foto.path) {
          finalFotosUrls.push(foto.path);
        }
      }

      // 2. Subir PDFs locales / Guardar enlaces de Drive
      for (const doc of pdfFiles) {
        if (doc.file) {
          const uploadedPath = await uploadFotoToStorage(doc.file, finalFotosUrls.length);
          finalFotosUrls.push(uploadedPath);
        } else if (doc.path) {
          finalFotosUrls.push(doc.path);
        } else if (doc.url) {
          finalFotosUrls.push(doc.url);
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
        fecha_inicio_planificada: convertToDbDate(fechaInicioPlanificada) || null,
        fecha_fin_planificada: convertToDbDate(fechaFinPlanificada) || null,
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
    setFechaInicioPlanificada(formatDate(cap.fecha_inicio_planificada) || '');
    setFechaFinPlanificada(formatDate(cap.fecha_fin_planificada) || '');
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

    // Vincular Fotos y PDFs
    if (cap.fotos_urls && cap.fotos_urls.length > 0) {
      const loadedFotos = [];
      const loadedPdfs = [];
      cap.fotos_urls.forEach((fpath, idx) => {
        const previewUrl = cap.fotos_preview_urls?.[idx] || '';
        const isPdf = fpath.toLowerCase().endsWith('.pdf') || fpath.includes('pdf') || fpath.includes('drive.google.com');
        if (isPdf) {
          loadedPdfs.push({
            file: null,
            fileName: fpath.includes('drive.google.com') ? 'Enlace Google Drive' : fpath.split('/').pop(),
            path: fpath,
            url: fpath.startsWith('http') ? fpath : previewUrl
          });
        } else {
          loadedFotos.push({ file: null, preview: previewUrl || '/brand/logo-primary.png', path: fpath });
        }
      });
      setFotosFiles(loadedFotos);
      setPdfFiles(loadedPdfs);
    } else {
      setFotosFiles([]);
      setPdfFiles([]);
    }

    setIsFormOpen(true);
  };

  // Preparar eliminación
  const handleDeleteClick = (id) => {
    setModalAlert({
      show: true,
      title: '¿Eliminar registro?',
      message: 'Esta acción eliminará de forma permanente el registro de capacitación y no se podrá deshacer.',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          if (isDevMode) {
            setCapacitaciones(capacitaciones.filter(c => c.id !== id));
            triggerToast('Capacitación eliminada exitosamente (Mock).');
            handleCloseForm();
          } else {
            const { error } = await supabase
              .from('programa_capacitacion')
              .delete()
              .eq('id', id);
            if (error) throw error;
            triggerToast('Capacitación eliminada exitosamente.');
            handleCloseForm();
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
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="capacitacion"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden cursor-pointer shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>
            <GraduationCap className="h-5 w-5 text-[#468DFF] shrink-0" />
            <h1 className="font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none">
              Programa de Capacitación Anual
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
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#468DFF]" />
          </div>
        ) : (
          <div className="max-w-[95%] mx-auto w-full py-8 px-4 md:px-0 flex-1 flex flex-col min-h-0">
            
            {isFormOpen ? (
              // FORMULARIO DE ALTA Y EDICIÓN
              <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
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
                      {editingId ? 'Editar Registro de Capacitación' : 'Registrar Nueva Capacitación'}
                    </span>
                  </div>
                  <button type="button" onClick={handleExitForm} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveCapacitacion} className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin">
                  <fieldset disabled={!canEdit} className="space-y-6">
                  
                  {/* Sección 1: Cliente e Ubicación */}
                  <div className="space-y-4">
                    <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#468DFF]" />
                      Identificación del Cliente
                    </span>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Cliente / Razón Social <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          required
                          value={empresaId}
                          onChange={(e) => {
                            setEmpresaId(e.target.value);
                            setEstablecimientoId('');
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer"
                        >
                          <option value="" disabled>Selecciona un cliente</option>
                          {empresas.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Establecimiento
                        </label>
                        <select
                          disabled={!empresaId}
                          value={establecimientoId}
                          onChange={(e) => setEstablecimientoId(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer disabled:opacity-50"
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
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Puesto / Sector afectado
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Personal de Planta / Operarios"
                          value={puesto}
                          onChange={(e) => setPuesto(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección 2: Detalle de la Capacitación */}
                  <div className="space-y-4">
                    <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-[#468DFF]" />
                      Detalle del Tema de Capacitación
                    </span>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1 relative">
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Tema de Capacitación <span className="text-[#468DFF]">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsTemasDropdownOpen(!isTemasDropdownOpen)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-left flex justify-between items-center cursor-pointer shadow-sm text-slate-700 font-medium"
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
                              <div className="absolute z-30 mt-1 w-full bg-white border border-slate-150 rounded-xl shadow-xl max-h-60 overflow-y-auto p-2 space-y-1 animate-fade-in">
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
                                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none text-xs text-slate-700 transition-colors font-medium"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleTema(topic)}
                                        className="rounded border-slate-350 text-[#468DFF] focus:ring-[#468DFF] h-3.5 w-3.5 cursor-pointer"
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
                                    className="rounded border-slate-350 text-[#468DFF] focus:ring-[#468DFF] h-3.5 w-3.5 cursor-pointer"
                                  />
                                  <span>Otro tema (Especificar...)</span>
                                </label>
                              </div>
                            </>
                          )}
                        {selectedTemas.some(t => t.id === '__custom__') && (
                          <input
                            type="text"
                            required
                            placeholder="Escribe el tema personalizado..."
                            value={temaCustom}
                            onChange={(e) => setTemaCustom(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 mt-2 transition-all"
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Capacitador / Disertante <span className="text-[#468DFF]">*</span>
                        </label>
                        <select
                          required
                          value={capacitador}
                          onChange={handleCapacitadorChange}
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer font-medium"
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
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 mt-2 transition-all"
                          />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        Contenido Programado <span className="text-slate-400 font-normal">(Auto-rellenado y editable)</span>
                      </label>
                      <textarea
                        rows="4"
                        placeholder="Ingresa el desglose de contenidos de la capacitación..."
                        value={contenido}
                        onChange={(e) => setContenido(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Sección 3: Planificación y Progreso */}
                  <div className="space-y-4">
                    <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#468DFF]" />
                      Cronograma y Avance
                    </span>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Fecha Inicio Planificada <span className="text-[#468DFF]">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                            value={fechaInicioPlanificada}
                            onChange={(e) => setFechaInicioPlanificada(formatAsDateInput(e.target.value))}
                            className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 font-mono"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                            <Calendar className="h-4 w-4" />
                            <input
                              type="date"
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  const parts = val.split('-');
                                  if (parts.length === 3) {
                                    setFechaInicioPlanificada(`${parts[2]}/${parts[1]}/${parts[0]}`);
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          Fecha Fin Planificada <span className="text-[#468DFF]">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="DD/MM/YYYY"
                            maxLength={10}
                            value={fechaFinPlanificada}
                            onChange={(e) => setFechaFinPlanificada(formatAsDateInput(e.target.value))}
                            className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 font-mono"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                            <Calendar className="h-4 w-4" />
                            <input
                              type="date"
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  const parts = val.split('-');
                                  if (parts.length === 3) {
                                    setFechaFinPlanificada(`${parts[2]}/${parts[1]}/${parts[0]}`);
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-xs font-bold text-slate-600 block">
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
                            className="w-16 text-center border border-slate-200 rounded-xl px-2 py-1 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2 min-h-[28px] mb-1">
                        <label className="text-xs font-bold text-slate-600 block mb-0">Observaciones y Notas</label>
                        <AITextHelper
                          value={observaciones}
                          onChange={setObservaciones}
                          context="Observaciones y notas sobre la capacitación dictada y el desempeño de los asistentes"
                          disabled={isReadOnlyView}
                        />
                      </div>
                      <textarea
                        rows="3"
                        placeholder="Comentarios adicionales..."
                        value={observaciones}
                        onChange={(e) => setObservaciones(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all resize-none text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Sección 4: Registros de capacitación */}
                  <div className="space-y-6">
                    <span className="font-outfit text-sm font-bold text-slate-800 border-b border-slate-100 pb-1.5 uppercase tracking-wider flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-[#468DFF]" />
                      Registros de capacitación
                    </span>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Subsección Fotos */}
                      <div className="flex flex-col h-full w-full space-y-2">
                        <label className="block text-xs font-bold text-slate-600">Imágenes</label>
                        <div className="flex-1 flex flex-col justify-center">
                          <ImageUploadZone
                            multiple={true}
                            images={fotosFiles}
                            onAddPhotos={(validFiles) => {
                              const newPhotos = validFiles.map(file => ({
                                file,
                                preview: URL.createObjectURL(file),
                                path: ''
                              }));
                              setFotosFiles(prev => [...prev, ...newPhotos]);
                            }}
                            onRemovePhoto={(index) => {
                              setFotosFiles(prev => {
                                const target = prev[index];
                                if (target && target.preview && target.preview.startsWith('blob:')) {
                                  URL.revokeObjectURL(target.preview);
                                }
                                  return prev.filter((_, idx) => idx !== index);
                              });
                            }}
                            disabled={!canEdit}
                            maxSizeMB={5}
                            onToast={triggerToast}
                          />
                        </div>
                      </div>

                      {/* Subsección Documentos PDF, Enlaces Drive y Legajo */}
                      <div className="flex flex-col h-full w-full space-y-2">
                        <DocumentUploadZone
                          label="Documentos"
                          file={null}
                          fileName=""
                          onFileChange={(file) => {
                            setPdfFiles(prev => [...prev, {
                              file,
                              fileName: file.name,
                              path: '',
                              url: URL.createObjectURL(file)
                            }]);
                          }}
                          onDriveImportSuccess={(filePath) => {
                            setPdfFiles(prev => [...prev, {
                              file: null,
                              fileName: 'Enlace Google Drive',
                              path: filePath,
                              url: filePath
                            }]);
                          }}
                          disabled={!canEdit}
                          tenantId={tenant?.id}
                          onToast={triggerToast}
                          uploadType={uploadType}
                          setUploadType={(type) => {
                            setUploadType(type);
                            setSelectedLegajoDocUrl('');
                          }}
                          showTabs={true}
                          tabs={[
                            { id: 'local', name: 'Archivo Local' },
                            { id: 'drive', name: 'Enlace Drive' },
                            { id: 'legajo', name: 'Legajo Técnico' }
                          ]}
                          minHeightClass="min-h-[148px] flex flex-col justify-center"
                          borderless={false}
                        >
                          {uploadType === 'legajo' && (
                            <div className="space-y-2">
                              {!empresaId ? (
                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl p-3 font-semibold">
                                  ⚠️ Debes seleccionar un Cliente / Razón Social para listar los documentos del legajo técnico.
                                </p>
                              ) : loadingLegajoDocs ? (
                                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                                  <Loader2 className="h-4 w-4 animate-spin text-[#468DFF] shrink-0" />
                                  Cargando documentos del legajo...
                                </div>
                              ) : legajoDocuments.length === 0 ? (
                                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3 italic">
                                  No se encontraron documentos en el legajo técnico para este cliente.
                                </p>
                              ) : (
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <select
                                    value={selectedLegajoDocUrl}
                                    onChange={(e) => setSelectedLegajoDocUrl(e.target.value)}
                                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#468DFF] bg-white text-slate-700 font-semibold"
                                  >
                                    <option value="">-- Selecciona del legajo --</option>
                                    {legajoDocuments.map(doc => (
                                      <option key={doc.id} value={doc.documento_url}>
                                        {doc.documento_nombre} ({formatDate(doc.fecha)})
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!selectedLegajoDocUrl) {
                                        triggerToast('Selecciona un documento primero.', 'error');
                                        return;
                                      }
                                      const matchedDoc = legajoDocuments.find(d => d.documento_url === selectedLegajoDocUrl);
                                      const docName = matchedDoc ? matchedDoc.documento_nombre : 'Documento Legajo Técnico';

                                      if (pdfFiles.some(f => f.path === selectedLegajoDocUrl || f.url === selectedLegajoDocUrl)) {
                                        triggerToast('Este documento ya se encuentra adjunto.', 'error');
                                        return;
                                      }

                                      setPdfFiles(prev => [...prev, {
                                        file: null,
                                        fileName: `${docName} (Legajo)`,
                                        path: selectedLegajoDocUrl,
                                        url: selectedLegajoDocUrl
                                      }]);
                                      triggerToast('Documento del legajo técnico agregado.');
                                      setSelectedLegajoDocUrl('');
                                    }}
                                    className="px-3 py-2 bg-[#468DFF] text-white rounded-xl text-xs font-semibold hover:bg-[#0511F2] transition-colors cursor-pointer shrink-0"
                                  >
                                    + Agregar
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </DocumentUploadZone>

                        {/* Lista de PDFs / Links cargados */}
                        {pdfFiles.length > 0 && (
                          <div className="pt-2">
                            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                              {pdfFiles.map((doc, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs p-2 bg-white rounded-xl border border-slate-150 shadow-sm animate-scaleUp">
                                  <div className="flex items-center gap-2 truncate flex-1 pr-2">
                                    <FileText className="h-4 w-4 text-[#468DFF] shrink-0" />
                                    <span className="font-semibold text-slate-700 truncate" title={doc.fileName}>{doc.fileName}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {doc.url && (
                                      <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-[#468DFF] hover:bg-blue-50 hover:border-blue-150 transition-all duration-300 flex items-center justify-center cursor-pointer"
                                        title="Ver documento"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPdfFiles(prev => {
                                            const target = prev[idx];
                                            if (target && target.url && target.url.startsWith('blob:')) {
                                              URL.revokeObjectURL(target.url);
                                            }
                                            return prev.filter((_, i) => i !== idx);
                                          });
                                        }}
                                        className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-150 transition-all duration-300 flex items-center justify-center cursor-pointer"
                                        title="Quitar"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
                              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-red-600/10"
                            >
                              Eliminar
                            </button>
                          )}
                          {canEdit && (
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
              // TABLA DE CAPACITACIONES Y FILTROS
              <div className="space-y-6 flex-1 flex flex-col min-h-0">
                
                {/* Panel de Filtros y Búsqueda */}
                <div className="bg-white border border-slate-150 rounded-2xl p-3 shadow-sm space-y-3 shrink-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    {/* Espaciador para empujar el buscador y botón a la derecha en desktop */}
                    <div className="hidden md:block flex-1"></div>

                    {/* Buscador, exportaciones y flecha agrupados */}
                    <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                      <div className="flex items-center gap-2 w-full md:w-64">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none">
                            <Search className="h-4 w-4" />
                          </span>
                          <input
                            type="text"
                            placeholder="Buscar por tema, capacitador, puesto, observaciones..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                          />
                        </div>
                        {/* Botón de flecha para colapsar/expandir exportaciones en móvil */}
                        <button
                          type="button"
                          onClick={() => setShowExportMobile(!showExportMobile)}
                          className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex items-center justify-center shrink-0 h-[29px] w-[29px] md:hidden"
                          title={showExportMobile ? "Ocultar botones de exportación" : "Mostrar botones de exportación"}
                        >
                          {showExportMobile ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>

                      <div className={`items-center gap-1.5 w-full md:w-auto shrink-0 justify-end ${showExportMobile ? 'flex' : 'hidden md:flex'}`}>
                        <button
                          type="button"
                          onClick={() => handleExportPdfReport(false)}
                          className="py-1.5 px-3 rounded-xl border border-[#468DFF] text-xs font-bold bg-white text-[#468DFF] hover:bg-[#468DFF] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0 flex-1 md:flex-initial justify-center"
                          title="Descargar listado en formato PDF"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Descargar PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportPdfReport(true)}
                          className="py-1.5 px-3 rounded-xl border border-[#468DFF] text-xs font-bold bg-white text-[#468DFF] hover:bg-[#468DFF] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shrink-0 flex-1 md:flex-initial justify-center"
                          title="Imprimir listado completo"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Imprimir
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Selectores de Filtrado */}
                  <div className="pt-1.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between min-h-[28px]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowFilters(!showFilters)}
                          className="font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px] hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          <Sliders className="h-3 w-3" />
                          Filtros de Búsqueda
                          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {(filterEmpresa || filterEstablecimiento || filterEstado || filterText) && (
                          <button
                            onClick={() => {
                              setFilterEmpresa('');
                              setFilterEstablecimiento('');
                              setFilterEstado('');
                              setFilterText('');
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>

                      {canCargar && (
                        <button
                          onClick={() => { setIsReadOnlyView(false); setIsFormOpen(true); }}
                          className="px-3 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-lg shadow-[#468DFF]/10 shrink-0"
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                          Registrar Capacitación
                        </button>
                      )}
                    </div>
                    
                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1 animate-fade-in">
                        {/* Selector Cliente */}
                        {profile?.role !== 'cliente' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Cliente</label>
                            <select
                              value={filterEmpresa}
                              onChange={(e) => {
                                setFilterEmpresa(e.target.value);
                                setFilterEstablecimiento('');
                              }}
                              className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs cursor-pointer w-full"
                            >
                              <option value="">Todos los clientes</option>
                              {empresas.map((emp) => (
                                <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Selector Establecimiento */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Establecimiento</label>
                          <select
                            disabled={!filterEmpresa}
                            value={filterEstablecimiento}
                            onChange={(e) => setFilterEstablecimiento(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs cursor-pointer w-full disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400"
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

                        {/* Selector Estado */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Estado</label>
                          <select
                            value={filterEstado}
                            onChange={(e) => setFilterEstado(e.target.value)}
                            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs cursor-pointer w-full"
                          >
                            <option value="">Todos los estados</option>
                            <option value="Planificado">Planificado (0%)</option>
                            <option value="En curso">En curso (&gt; 0%)</option>
                            <option value="Completado">Completado (100%)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Listado / Tabla */}
                <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ height: showFilters ? 'calc(100vh - 310px)' : 'calc(100vh - 240px)' }}>
                  <div className="overflow-auto flex-grow">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider">
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[20%] sticky top-0 z-10 bg-slate-50 border-b border-slate-150" onClick={() => handleSort('cliente')}>
                            <div className="flex items-center gap-1">
                              Cliente / Establecimiento
                              {sortField === 'cliente' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[15%] sticky top-0 z-10 bg-slate-50 border-b border-slate-150" onClick={() => handleSort('puesto')}>
                            <div className="flex items-center gap-1">
                              Puesto
                              {sortField === 'puesto' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[25%] sticky top-0 z-10 bg-slate-50 border-b border-slate-150" onClick={() => handleSort('tema')}>
                            <div className="flex items-center gap-1">
                              Tema de Capacitación
                              {sortField === 'tema' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="px-6 py-4 cursor-pointer hover:text-slate-700 select-none transition-colors w-[15%] sticky top-0 z-10 bg-slate-50 border-b border-slate-150" onClick={() => handleSort('capacitador')}>
                            <div className="flex items-center gap-1">
                              Capacitador
                              {sortField === 'capacitador' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-center cursor-pointer hover:text-slate-700 select-none transition-colors w-[12%] sticky top-0 z-10 bg-slate-50 border-b border-slate-150" onClick={() => handleSort('fecha_inicio_planificada')}>
                            <div className="flex items-center justify-center gap-1">
                              Fechas Programadas
                              {sortField === 'fecha_inicio_planificada' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-center cursor-pointer hover:text-slate-700 select-none transition-colors w-[8%] sticky top-0 z-10 bg-slate-50 border-b border-slate-150" onClick={() => handleSort('progreso')}>
                            <div className="flex items-center justify-center gap-1">
                              Progreso / Estado
                              {sortField === 'progreso' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          {(canEditar || canEliminar || profile?.role === 'cliente') && <th className="px-6 py-4 text-right w-[5%] sticky top-0 z-10 bg-slate-50 border-b border-slate-150">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                        {sortedCapacitaciones.length === 0 ? (
                          <tr>
                            <td colSpan={(canEditar || canEliminar || profile?.role === 'cliente') ? 7 : 6} className="text-center py-20 text-slate-400 font-bold bg-slate-50/10">
                              <GraduationCap className="h-10 w-10 mx-auto mb-2 text-slate-350 shrink-0" />
                              <p className="font-outfit text-sm text-slate-700">No hay capacitaciones registradas</p>
                              <p className="text-[11px] text-slate-400 font-normal mt-1">Registra una nueva capacitación para comenzar.</p>
                              {canCargar && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsReadOnlyView(false);
                                    setEditingId(null);
                                    handleCloseForm();
                                    setTimeout(() => setIsFormOpen(true), 0);
                                  }}
                                  className="mt-3 text-xs text-[#468DFF] hover:underline font-bold block mx-auto"
                                >
                                  + Registrar la primera
                                </button>
                              )}
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
                                onClick={() => { setIsReadOnlyView(true); handleEditClick(cap); }}
                                className="hover:bg-slate-50/50 cursor-pointer"
                              >
                                <td className="px-6 py-4">
                                  <span className="font-semibold text-slate-900 block">{emp?.razon_social || 'Desconocido'}</span>
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-normal">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {est?.denominacion || 'General / Todos'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-600">
                                  <span className="block truncate max-w-[140px]" title={cap.puesto}>
                                    {cap.puesto || <span className="text-slate-400 italic font-normal">No especificado</span>}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="block font-semibold text-slate-900 truncate max-w-[240px]" title={cap.tema}>
                                    {cap.tema}
                                  </span>
                                  {cap.contenido && (
                                    <span className="text-[10px] text-slate-400 block truncate max-w-[240px] mt-0.5 font-normal" title={cap.contenido}>
                                      {cap.contenido}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-600">
                                  {cap.capacitador}
                                </td>
                                <td className="px-6 py-4 text-center text-slate-500 font-mono text-[10px]">
                                  <span className="block font-medium">
                                    {formatDate(cap.fecha_inicio_planificada)} al
                                  </span>
                                  <span className="block font-medium">
                                    {formatDate(cap.fecha_fin_planificada)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${status.color}`}>
                                      {status.text} ({cap.progreso}%)
                                    </span>
                                    <div className="w-16 h-1.5 bg-slate-100 border border-slate-150 rounded-full overflow-hidden">
                                      <div className="bg-[#468DFF] h-full" style={{ width: `${cap.progreso}%` }} />
                                    </div>
                                  </div>
                                </td>
                                {(canEditar || canEliminar || profile?.role === 'cliente') && (
                                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-2">
                                      {cap.fotos_urls && cap.fotos_urls.length > 0 && (
                                        <button
                                          onClick={() => handleViewFotosClick(cap)}
                                          title="Ver Registros de Capacitación (Fotos)"
                                          className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-colors inline-flex items-center justify-center shadow-sm"
                                        >
                                          <ImageIcon className="h-4.5 w-4.5" />
                                        </button>
                                      )}
                                      {canEditar ? (
                                        <button
                                          onClick={() => { setIsReadOnlyView(false); handleEditClick(cap); }}
                                          title="Editar"
                                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-all cursor-pointer inline-flex items-center"
                                        >
                                          <Edit className="h-4.5 w-4.5" />
                                        </button>
                                      ) : (
                                        <button
                                          onClick={() => { setIsReadOnlyView(true); handleEditClick(cap); }}
                                          title="Ver Detalle"
                                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer inline-flex items-center"
                                        >
                                          <Eye className="h-4.5 w-4.5" />
                                        </button>
                                      )}
                                      {canEliminar && (
                                        <button
                                          onClick={() => handleDeleteClick(cap.id)}
                                          title="Eliminar"
                                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all cursor-pointer inline-flex items-center"
                                        >
                                          <Trash2 className="h-4.5 w-4.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                )}
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
                  Cargando registros...
                </div>
              ) : (
                viewingFotosUrls.map((url, i) => {
                  const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf') || url.includes('/documents/');
                  const isDrive = url.toLowerCase().includes('drive.google.com') || (url.startsWith('http') && !isPdf && !url.match(/\.(jpeg|jpg|gif|png|webp)/i));

                  if (isPdf) {
                    return (
                      <div key={i} className="relative group rounded-xl border border-slate-200 bg-white p-4 flex flex-col items-center justify-center text-center shadow-sm aspect-video gap-2">
                        <FileText className="h-10 w-10 text-red-500" />
                        <span className="text-xs font-bold text-slate-700">Documento PDF Adjunto</span>
                        <a 
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 py-1 px-3 bg-[#468DFF]/15 hover:bg-[#468DFF]/25 text-[#468DFF] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Abrir PDF
                        </a>
                      </div>
                    );
                  }

                  if (isDrive) {
                    return (
                      <div key={i} className="relative group rounded-xl border border-slate-200 bg-white p-4 flex flex-col items-center justify-center text-center shadow-sm aspect-video gap-2">
                        <ExternalLink className="h-10 w-10 text-[#468DFF]" />
                        <span className="text-xs font-bold text-slate-700">Google Drive Compartido</span>
                        <a 
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 py-1 px-3 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                           Ir a Drive
                        </a>
                      </div>
                    );
                  }

                  return (
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
                  );
                })
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
