// src/app/[tenant-slug]/protocolos/iluminacion/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';
import AppPageHeader from '@/components/ui/AppPageHeader';
import AppButton from '@/components/ui/AppButton';
import AppInput from '@/components/ui/AppInput';
import AppSelect from '@/components/ui/AppSelect';
import AppCard from '@/components/ui/AppCard';
import AppEmptyState from '@/components/ui/AppEmptyState';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import { generateLightingProtocolPdf } from './utils/pdfGenerator';
import { 
  PlusCircle, 
  Search, 
  Building, 
  X, 
  Loader2, 
  Trash2, 
  Edit, 
  Eye, 
  Printer, 
  FileText, 
  Mail, 
  Copy, 
  Sliders, 
  ChevronUp, 
  ChevronDown,
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function ProtocolosIluminacionPage({ params }) {
  const tenantSlug = params['tenant-slug'];
  const globalToast = useToast();

  // Tenant / Profile structural state
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);

  // Lookups and main list
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [protocolos, setProtocolos] = useState([]);

  // Filters state
  const [filterText, setFilterText] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [filterResultado, setFilterResultado] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState('fecha_medicion');
  const [sortOrder, setSortOrder] = useState('desc');

  // Deletion Modal
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });

  // Email Modal State
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailTarget, setMailTarget] = useState(null);
  const [availableEmails, setAvailableEmails] = useState([]);
  const [manualEmail, setManualEmail] = useState('');
  const [mailLoading, setMailLoading] = useState(false);

  // Permissions
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

  const sectionPerms = getSectionPermissions(profile, 'protocolo_iluminacion');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;

  // Toggle Sidebar
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

  // Load Real Data
  const loadRealData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      // 1. Get profile
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (pErr) throw pErr;
      setProfile(prof);

      // 2. Get tenant
      const { data: ten, error: tErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', tenantSlug)
        .single();
      if (tErr || !ten) {
        window.location.href = '/login';
        return;
      }
      setTenant(ten);

      // 3. Query Lookups
      const { data: empsData } = await supabase
        .from('empresas')
        .select('id, razon_social, cuit, contactos_correos')
        .eq('tenant_id', ten.id)
        .order('razon_social');
      setEmpresas(empsData || []);

      const { data: estsData } = await supabase
        .from('establecimientos')
        .select('id, empresa_id, denominacion, sectores')
        .eq('tenant_id', ten.id)
        .order('denominacion');
      setAllEstablecimientos(estsData || []);

      // 4. Query Protocols
      const { data: protosData, error: prErr } = await supabase
        .from('protocolos_iluminacion')
        .select('*')
        .eq('tenant_id', ten.id)
        .order('fecha_medicion', { ascending: false });
      if (prErr) throw prErr;
      setProtocolos(protosData || []);

      setLoading(false);
    } catch (err) {
      console.error('Error al inicializar listado:', err);
      globalToast.toast('Error de conexión con la base de datos.', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRealData();
  }, [tenantSlug]);

  const loadProtocols = async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from('protocolos_iluminacion')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('fecha_medicion', { ascending: false });
    setProtocolos(data || []);
  };

  // Duplicate Protocol
  const handleDuplicate = async (proto) => {
    try {
      globalToast.toast('Duplicando protocolo...', 'info');
      const { data: { user } } = await supabase.auth.getUser();

      const { data: newProto, error: insErr } = await supabase
        .from('protocolos_iluminacion')
        .insert({
          tenant_id: proto.tenant_id,
          user_id: user?.id || proto.user_id,
          organization_id: proto.organization_id,
          razon_social_id: proto.razon_social_id,
          establecimiento_id: proto.establecimiento_id,
          razon_social_text: proto.razon_social_text + ' - Copia',
          cuit_text: proto.cuit_text,
          establecimiento_text: proto.establecimiento_text,
          direccion_text: proto.direccion_text,
          provincia_text: proto.provincia_text,
          localidad_text: proto.localidad_text,
          cp_text: proto.cp_text,
          horarios_turnos_text: proto.horarios_turnos_text,
          instrumento_marca_modelo_serie: proto.instrumento_marca_modelo_serie,
          fecha_calibracion: proto.fecha_calibracion,
          metodologia_utilizada: proto.metodologia_utilizada,
          fecha_medicion: proto.fecha_medicion,
          hora_inicio: proto.hora_inicio,
          hora_finalizacion: proto.hora_finalizacion,
          condiciones_atmosfericas: proto.condiciones_atmosfericas,
          documentacion_adjunta: proto.documentacion_adjunta,
          observaciones: proto.observaciones,
          conclusiones: proto.conclusiones,
          recomendaciones: proto.recomendaciones,
          resultado_general: proto.resultado_general,
          estado: 'borrador',
          created_by: user?.id,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insErr) throw insErr;

      // Duplicate Points and measurements
      const { data: origPoints } = await supabase
        .from('protocolos_iluminacion_puntos')
        .select('*, mediciones:protocolos_iluminacion_mediciones(*)')
        .eq('protocolo_id', proto.id);

      for (const pt of (origPoints || [])) {
        const { data: newPt } = await supabase
          .from('protocolos_iluminacion_puntos')
          .insert({
            protocolo_id: newProto.id,
            orden: pt.orden,
            punto_muestreo: pt.punto_muestreo,
            sector_id: pt.sector_id,
            sector_text: pt.sector_text,
            largo_m: pt.largo_m,
            ancho_m: pt.ancho_m,
            altura_m: pt.altura_m,
            puesto_id: pt.puesto_id,
            puesto_text: pt.puesto_text,
            tipo_iluminacion: pt.tipo_iluminacion,
            tipo_fuente_luminica: pt.tipo_fuente_luminica,
            iluminacion: pt.iluminacion,
            indice_local: pt.indice_local,
            indice_local_corregido: pt.indice_local_corregido,
            numero_minimo_puntos_medicion: pt.numero_minimo_puntos_medicion,
            cantidad_mediciones_cargadas: pt.cantidad_mediciones_cargadas,
            iluminancia_media: pt.iluminancia_media,
            iluminancia_minima: pt.iluminancia_minima,
            uniformidad_requerida: pt.uniformidad_requerida,
            valor_uniformidad_iluminancia: pt.valor_uniformidad_iluminancia,
            valor_medido_lux: pt.valor_medido_lux,
            valor_requerido_legal_lux: pt.valor_requerido_legal_lux,
            verificacion_uniformidad: pt.verificacion_uniformidad,
            verificacion_legal: pt.verificacion_legal,
            resultado_punto: pt.resultado_punto,
            observaciones_punto: pt.observaciones_punto
          })
          .select('id')
          .single();

        const medsPayload = (pt.mediciones || []).map(m => ({
          punto_id: newPt.id,
          orden: m.orden,
          valor_lux: m.valor_lux
        }));

        if (medsPayload.length > 0) {
          await supabase
            .from('protocolos_iluminacion_mediciones')
            .insert(medsPayload);
        }
      }

      // Clone attachments references
      const { data: origAdj } = await supabase
        .from('protocolos_iluminacion_adjuntos')
        .select('*')
        .eq('protocolo_id', proto.id);

      const adjPayload = (origAdj || []).map(ad => ({
        protocolo_id: newProto.id,
        tipo: ad.tipo,
        nombre_archivo: ad.nombre_archivo,
        storage_path: ad.storage_path,
        public_url: ad.public_url,
        created_by: user?.id
      }));

      if (adjPayload.length > 0) {
        await supabase
          .from('protocolos_iluminacion_adjuntos')
          .insert(adjPayload);
      }

      globalToast.toast('Protocolo duplicado correctamente en modo borrador.', 'success');
      await loadProtocols();
    } catch (err) {
      console.error(err);
      globalToast.toast('Error al duplicar el protocolo.', 'error');
    }
  };

  // Delete Protocol
  const executeDelete = async () => {
    const id = deleteConfirm.id;
    if (!id) return;
    try {
      globalToast.toast('Eliminando protocolo...', 'info');
      const { error } = await supabase
        .from('protocolos_iluminacion')
        .delete()
        .eq('id', id);
      if (error) throw error;
      globalToast.toast('Protocolo eliminado permanentemente.', 'success');
      setDeleteConfirm({ show: false, id: null });
      await loadProtocols();
    } catch (err) {
      console.error(err);
      globalToast.toast('Error al eliminar el protocolo.', 'error');
    }
  };

  // Export PDF Report Download/Print
  const handleExportPdf = async (protoItem, shouldPrint = false) => {
    try {
      globalToast.toast('Generando reporte PDF...', 'info');
      const { data: pts } = await supabase
        .from('protocolos_iluminacion_puntos')
        .select('*, mediciones:protocolos_iluminacion_mediciones(*)')
        .eq('protocolo_id', protoItem.id)
        .order('orden');

      const { data: adjs } = await supabase
        .from('protocolos_iluminacion_adjuntos')
        .select('*')
        .eq('protocolo_id', protoItem.id);

      const doc = await generateLightingProtocolPdf(protoItem, tenant, empresas, allEstablecimientos, pts || [], adjs || [], isDevMode);
      if (shouldPrint) {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
      } else {
        doc.save(`Protocolo_Iluminacion_${protoItem.razon_social_text.replace(/\s+/g, '_')}_${protoItem.fecha_medicion}.pdf`);
        globalToast.toast('PDF descargado con éxito.', 'success');
      }
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      globalToast.toast('No se pudo generar el reporte PDF.', 'error');
    }
  };

  // Trigger Email Modal
  const openEmailModal = (protoItem) => {
    setMailTarget(protoItem);
    const emp = empresas.find(e => e.id === protoItem.razon_social_id);
    const emails = emp?.contactos_correos || [];
    setAvailableEmails(emails.map(c => ({ descripcion: `${c.contacto || 'Contacto'}: ${c.valor}`, valor: c.valor, checked: false })));
    setManualEmail('');
    setIsMailModalOpen(true);
  };

  const handleSendEmail = async () => {
    const checked = availableEmails.filter(e => e.checked).map(e => e.valor);
    const manuals = manualEmail.split(',').map(e => e.trim()).filter(Boolean);
    const recipients = [...checked, ...manuals];

    if (recipients.length === 0) {
      globalToast.toast('Ingrese o seleccione al menos un destinatario.', 'error');
      return;
    }

    setMailLoading(true);
    try {
      // 1. Generate PDF
      const { data: pts } = await supabase
        .from('protocolos_iluminacion_puntos')
        .select('*, mediciones:protocolos_iluminacion_mediciones(*)')
        .eq('protocolo_id', mailTarget.id)
        .order('orden');
      
      const { data: adjs } = await supabase
        .from('protocolos_iluminacion_adjuntos')
        .select('*')
        .eq('protocolo_id', mailTarget.id);

      const doc = await generateLightingProtocolPdf(mailTarget, tenant, empresas, allEstablecimientos, pts || [], adjs || [], isDevMode);
      const pdfBlob = doc.output('blob');

      // 2. Upload PDF to temp storage in the 'documents' bucket (send-email route hardcoded bucket)
      const fileId = crypto.randomUUID();
      const filePath = `${profile?.id || 'anonymous'}/iluminacion_${mailTarget.id}_${fileId}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // 3. Retrieve Tenant Logo
      let logoBase64 = '';
      if (tenant?.logo_1_url) {
        try {
          logoBase64 = await fetch(tenant.logo_1_url).then(r => r.blob()).then(blob => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          }));
        } catch (e) {
          console.warn('Error loading logo for email:', e);
        }
      }

      // 4. Send email api call
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: recipients,
          filePath,
          companyName: mailTarget.razon_social_text,
          establishmentName: mailTarget.establecimiento_text,
          date: formatDate(mailTarget.fecha_medicion),
          inspectorName: profile?.full_name || 'Técnico SySO',
          tenantLogoBase64: logoBase64 || null,
          tenantName: tenant?.name || 'Gestión SySO',
          documentType: 'protocolo_iluminacion'
        })
      });

      const resData = await res.json();
      if (!res.ok || resData.error) throw new Error(resData.error || 'Error del servidor.');

      globalToast.toast('Protocolo de Iluminación enviado por correo con éxito.', 'success');
      setIsMailModalOpen(false);
    } catch (err) {
      console.error(err);
      globalToast.toast(err.message || 'Error al enviar el correo.', 'error');
    } finally {
      setMailLoading(false);
    }
  };

  // Filtering Logic
  const filteredProtocolos = protocolos.filter(pr => {
    const searchString = `${pr.razon_social_text || ''} ${pr.establecimiento_text || ''} ${pr.instrumento_marca_modelo_serie || ''}`.toLowerCase();
    const matchesSearch = searchString.includes(filterText.toLowerCase());
    const matchesEmpresa = !filterEmpresa || pr.razon_social_id === filterEmpresa;
    const matchesEstablecimiento = !filterEstablecimiento || pr.establecimiento_id === filterEstablecimiento;
    const matchesResultado = !filterResultado || pr.resultado_general === filterResultado;
    const matchesEstado = !filterEstado || pr.estado === filterEstado;

    let matchesFecha = true;
    if (filterFechaDesde) {
      matchesFecha = matchesFecha && pr.fecha_medicion >= filterFechaDesde;
    }
    if (filterFechaHasta) {
      matchesFecha = matchesFecha && pr.fecha_medicion <= filterFechaHasta;
    }

    return matchesSearch && matchesEmpresa && matchesEstablecimiento && matchesResultado && matchesEstado && matchesFecha;
  });

  const sortedProtocolos = [...filteredProtocolos].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0D0D0D]/5">
        <Sidebar collapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
        <main className="flex-1 flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 text-[#468DFF] animate-spin" />
          <span className="ml-3 text-slate-500 font-semibold text-sm">Cargando mediciones de iluminación...</span>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]/5 text-slate-800">
      <Sidebar collapsed={isSidebarCollapsed} onToggle={toggleSidebar} />

      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-x-hidden">
        <AppPageHeader
          title="Protocolo de Iluminación"
          description="Gestione los protocolos e informes de medición de iluminancia laboral SRT 84/12."
          breadcrumbs={[
            { label: 'Inicio', href: `/${tenantSlug}` },
            { label: 'Protocolo de Iluminación', active: true }
          ]}
        />

        {/* CONTENEDOR 1: BUSCADOR Y BOTÓN ACCIÓN */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm space-y-3 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Buscar por cliente, establecimiento, luxómetro..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="py-2 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer transition-all"
              >
                <Sliders className="h-4 w-4" />
                Filtros
                {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {canCargar && (
                <Link href={`/${tenantSlug}/protocolos/iluminacion/nuevo`} className="inline-flex">
                  <AppButton className="text-xs py-2 px-4 shadow-lg shadow-[#468DFF]/15">
                    <PlusCircle className="h-4 w-4 mr-1.5" />
                    Nuevo Protocolo
                  </AppButton>
                </Link>
              )}
            </div>
          </div>

          {/* FILTROS AVANZADOS COLLAPSIBLE */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 animate-fade-in">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Cliente</label>
                <AppSelect
                  value={filterEmpresa}
                  onChange={(e) => {
                    setFilterEmpresa(e.target.value);
                    setFilterEstablecimiento('');
                  }}
                >
                  <option value="">Todos los clientes</option>
                  {empresas.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                  ))}
                </AppSelect>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Establecimiento</label>
                <AppSelect
                  disabled={!filterEmpresa}
                  value={filterEstablecimiento}
                  onChange={(e) => setFilterEstablecimiento(e.target.value)}
                >
                  <option value="">{!filterEmpresa ? 'Seleccione cliente...' : 'Todos los establecimientos'}</option>
                  {allEstablecimientos.filter(est => est.empresa_id === filterEmpresa).map(est => (
                    <option key={est.id} value={est.id}>{est.denominacion}</option>
                  ))}
                </AppSelect>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Resultado General</label>
                <AppSelect
                  value={filterResultado}
                  onChange={(e) => setFilterResultado(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="Cumple">Cumple</option>
                  <option value="No cumple">No cumple</option>
                  <option value="Parcial">Parcial</option>
                  <option value="Sin evaluar">Sin evaluar</option>
                </AppSelect>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Estado</label>
                <AppSelect
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="borrador">Borrador</option>
                  <option value="completado">Completado</option>
                  <option value="anulado">Anulado</option>
                </AppSelect>
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fecha de Medición (Desde)</label>
                <AppInput
                  type="date"
                  value={filterFechaDesde}
                  onChange={(e) => setFilterFechaDesde(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fecha de Medición (Hasta)</label>
                <AppInput
                  type="date"
                  value={filterFechaHasta}
                  onChange={(e) => setFilterFechaHasta(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* LISTADO DE PROTOCOLOS */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[300px]">
          {sortedProtocolos.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center p-12 text-center gap-3 h-full">
              <AlertCircle className="h-10 w-10 text-slate-350" />
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-slate-800">No se encontraron protocolos de iluminación</p>
                <p className="text-xs text-slate-400 font-medium">Registra un nuevo informe o ajusta los filtros de búsqueda.</p>
              </div>
              {canCargar && (
                <Link href={`/${tenantSlug}/protocolos/iluminacion/nuevo`} className="mt-2">
                  <AppButton className="text-xs">
                    Crear primer protocolo
                  </AppButton>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="px-6 py-4 cursor-pointer hover:text-slate-700" onClick={() => toggleSort('razon_social_text')}>
                      Cliente / Establecimiento
                      {sortField === 'razon_social_text' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:text-slate-700" onClick={() => toggleSort('instrumento_marca_modelo_serie')}>
                      Luxómetro
                      {sortField === 'instrumento_marca_modelo_serie' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                    <th className="px-6 py-4 cursor-pointer hover:text-slate-700" onClick={() => toggleSort('fecha_medicion')}>
                      Fecha Medición
                      {sortField === 'fecha_medicion' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                    <th className="px-6 py-4 text-center">Resultado</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                  {sortedProtocolos.map((row) => {
                    let resultBadge = 'bg-slate-100 text-slate-600 border-slate-200';
                    if (row.resultado_general === 'Cumple') resultBadge = 'bg-[#00B050]/15 text-[#00B050] border-[#00B050]/30';
                    if (row.resultado_general === 'No cumple') resultBadge = 'bg-[#FF0000]/15 text-[#FF0000] border-[#FF0000]/30';
                    if (row.resultado_general === 'Parcial') resultBadge = 'bg-[#FF9900]/15 text-[#FF9900] border-[#FF9900]/30';

                    let stateBadge = 'bg-slate-100 text-slate-500 border-slate-200';
                    if (row.estado === 'completado') stateBadge = 'bg-blue-50 text-[#468DFF] border-blue-150';
                    if (row.estado === 'anulado') stateBadge = 'bg-red-50 text-red-500 border-red-150';

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-800 block text-xs leading-none mb-1.5">{row.razon_social_text}</span>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Building className="h-3 w-3 shrink-0" />
                            {row.establecimiento_text}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 max-w-[180px] truncate" title={row.instrumento_marca_modelo_serie}>
                          {row.instrumento_marca_modelo_serie || '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium">
                          {row.fecha_medicion ? formatDate(row.fecha_medicion) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase ${resultBadge}`}>
                            {row.resultado_general}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase ${stateBadge}`}>
                            {row.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link href={`/${tenantSlug}/protocolos/iluminacion/${row.id}`} title="Ver Detalles">
                              <button className="p-1.5 rounded-lg bg-blue-50 text-[#468DFF] hover:bg-blue-100 hover:text-[#0511F2] transition-all cursor-pointer inline-flex items-center">
                                <Eye className="h-4.5 w-4.5" />
                              </button>
                            </Link>

                            {canEditar && row.estado !== 'anulado' && (
                              <Link href={`/${tenantSlug}/protocolos/iluminacion/${row.id}/editar`} title="Editar">
                                <button className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-500 transition-all cursor-pointer inline-flex items-center">
                                  <Edit className="h-4.5 w-4.5" />
                                </button>
                              </Link>
                            )}

                            <button
                              type="button"
                              onClick={() => handleExportPdf(row, false)}
                              title="Descargar PDF"
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all cursor-pointer inline-flex items-center"
                            >
                              <FileText className="h-4.5 w-4.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExportPdf(row, true)}
                              title="Imprimir"
                              className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer inline-flex items-center"
                            >
                              <Printer className="h-4.5 w-4.5" />
                            </button>

                            {canEditar && (
                              <button
                                type="button"
                                onClick={() => openEmailModal(row)}
                                title="Enviar por Correo"
                                className="p-1.5 rounded-lg bg-[#468DFF]/10 text-[#468DFF] hover:bg-[#468DFF]/20 transition-all cursor-pointer inline-flex items-center"
                              >
                                <Mail className="h-4.5 w-4.5" />
                              </button>
                            )}

                            {canEditar && (
                              <button
                                type="button"
                                onClick={() => handleDuplicate(row)}
                                title="Duplicar borrador"
                                className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer inline-flex items-center"
                              >
                                <Copy className="h-4.5 w-4.5" />
                              </button>
                            )}

                            {canEliminar && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm({ show: true, id: row.id })}
                                title="Eliminar registro"
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-all cursor-pointer inline-flex items-center"
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
            </div>
          )}
        </div>
      </main>

      {/* MODAL ENVIAR CORREO */}
      {isMailModalOpen && mailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsMailModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full z-10 shadow-2xl relative space-y-4 animate-scale-up">
            
            <div className="flex justify-between items-center">
              <h4 className="font-outfit text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Mail className="h-4.5 w-4.5 text-[#468DFF]" />
                Enviar Protocolo por Correo
              </h4>
              <button onClick={() => setIsMailModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer border border-slate-200">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Seleccione los contactos cargados de la Razón Social o ingrese emails manualmente para despachar el informe en formato PDF.
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block">Correos de la Razón Social:</label>
                {availableEmails.length === 0 ? (
                  <p className="text-xs text-slate-400 italic font-semibold">Sin contactos registrados.</p>
                ) : (
                  <div className="bg-slate-50 p-3 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1.5">
                    {availableEmails.map((e, idx) => (
                      <label key={idx} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/50 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={e.checked}
                          onChange={() => {
                            setAvailableEmails(prev => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item));
                          }}
                          className="accent-[#468DFF] h-4 w-4"
                        />
                        {e.descripcion}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Correos Manuales (separados por comas):</label>
                <textarea
                  rows="2"
                  placeholder="ejemplo1@correo.com, ejemplo2@correo.com..."
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsMailModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-650 text-xs font-bold rounded-xl hover:bg-slate-100 cursor-pointer transition-all active:scale-98"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={mailLoading}
                onClick={handleSendEmail}
                className="px-4 py-2 bg-[#468DFF] text-white text-xs font-bold rounded-xl hover:bg-[#0511F2] cursor-pointer transition-all active:scale-98 shadow-md shadow-[#468DFF]/10 disabled:opacity-50 flex items-center gap-1.5"
              >
                {mailLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Correo'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <AppConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(open) => !open && setDeleteConfirm({ show: false, id: null })}
        type="destructive"
        title="Eliminar Protocolo"
        description="¿Está seguro de que desea eliminar permanentemente este protocolo de iluminación y todos sus puntos de muestreo y mediciones asociados? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        onConfirm={executeDelete}
      />
    </div>
  );
}
