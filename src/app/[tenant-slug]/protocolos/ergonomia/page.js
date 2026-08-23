// src/app/[tenant-slug]/protocolos/ergonomia/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import ProtocoloForm from './components/ProtocoloForm';
import AppFormNavigator from '@/components/ui/AppFormNavigator';
import AppUnsavedChangesDialog from '@/components/ui/AppUnsavedChangesDialog';
import AppSortIcon from '@/components/ui/AppSortIcon';
import AppSkeleton from '@/components/ui/AppSkeleton';
import AppTooltip from '@/components/ui/AppTooltip';
import AppLoadingSpinner from '@/components/ui/AppLoadingSpinner';
import { generateErgonomyProtocolPdf } from './utils/pdfGenerator';
import { printPdfDocument } from '@/lib/pdf/pdfPrintHelper';
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
  AlertCircle,
  PersonStanding,
  MessageCircle,
  Send
} from 'lucide-react';

export default function ProtocolosErgonomiaPage({ params }) {
  const tenantSlug = params['tenant-slug'];
  const router = useRouter();
  const searchParams = useSearchParams();
  const globalToast = useToast();

  // Tenant / Profile structural state
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Estados reactivos SPA para formulario/detalle local
  const [formMode, setFormMode] = useState('list'); // 'list' | 'create' | 'edit' | 'view'
  const [editingId, setEditingId] = useState(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleSidebarNavigation = (e, path) => {
    setIsMobileMenuOpen(false);
    if (isFormDirty) {
      e.preventDefault();
      setPendingRoute(path);
      setUnsavedDialogOpen(true);
    }
  };

  const handleConfirmLeave = () => {
    setUnsavedDialogOpen(false);
    setIsFormDirty(false);
    if (pendingRoute) {
      router.push(pendingRoute);
    }
  };

  // Lookups and main list
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [protocolos, setProtocolos] = useState([]);

  // Filters state
  const [filterText, setFilterText] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [filterAnio, setFilterAnio] = useState('');
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
  const [availablePhones, setAvailablePhones] = useState([]);
  const [manualPhone, setManualPhone] = useState('');
  const [activeTab, setActiveTab] = useState('email');
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  // Permissions
  const getSectionPermissions = (userProfile, sectionName) => {
    if (!userProfile) return { cargar: true, editar: true, eliminar: true };
    if (userProfile.role === 'cliente') return { cargar: false, editar: false, eliminar: false };
    if (userProfile.role === 'admin') return { cargar: true, editar: true, eliminar: true };
    const perm = userProfile.permisos?.[sectionName] || userProfile.permisos?.['protocolo_ergonomia'];
    if (perm === true || perm === undefined) return { cargar: true, editar: true, eliminar: true };
    if (perm === false) return { cargar: false, editar: false, eliminar: false };
    return {
      cargar: perm.cargar === true,
      editar: perm.editar === true,
      eliminar: perm.eliminar === true
    };
  };

  const sectionPerms = getSectionPermissions(profile, 'protocolo_ergonomia');
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
        .select('id, razon_social, cuit, contactos_correos, contactos_telefonos')
        .eq('tenant_id', ten.id)
        .order('razon_social');
      setEmpresas(empsData || []);

      const { data: estsData } = await supabase
        .from('establecimientos')
        .select('*')
        .eq('tenant_id', ten.id)
        .order('denominacion');
      setAllEstablecimientos(estsData || []);

      // 4. Query Protocols
      const { data: protosData, error: prErr } = await supabase
        .from('protocolos_ergonomia')
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

  useEffect(() => {
    if (!loading) {
      const qId = searchParams.get('id');
      const qAction = searchParams.get('action');
      if (qId) {
        setEditingId(qId);
        setFormMode(qAction === 'editar' ? 'edit' : 'view');
      } else if (qAction === 'nuevo') {
        setEditingId(null);
        setFormMode('create');
      } else {
        setEditingId(null);
        setFormMode('list');
      }
    }
  }, [loading, searchParams]);

  const loadProtocols = async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from('protocolos_ergonomia')
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
        .from('protocolos_ergonomia')
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
          ciiu_text: proto.ciiu_text,
          observaciones: proto.observaciones,
          resultado_general: proto.resultado_general,
          profesional_nombre: proto.profesional_nombre,
          profesional_matricula: proto.profesional_matricula,
          firma_tipo: proto.firma_tipo,
          firma_profesional: proto.firma_profesional,
          firma_empleador: proto.firma_empleador,
          empleador_nombre: proto.empleador_nombre,
          firma_medicina: proto.firma_medicina,
          medicina_nombre: proto.medicina_nombre,
          medicina_matricula: proto.medicina_matricula,
          estado: 'borrador',
          created_by: user?.id,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insErr) throw insErr;

      // Duplicate Points (Ergonomía specific fields)
      const { data: origPoints } = await supabase
        .from('protocolos_ergonomia_puntos')
        .select('*')
        .eq('protocolo_id', proto.id);

      for (const pt of (origPoints || [])) {
        await supabase
          .from('protocolos_ergonomia_puntos')
          .insert({
            protocolo_id: newProto.id,
            orden: pt.orden,
            punto_muestreo: pt.punto_muestreo,
            sector_id: pt.sector_id,
            sector_text: pt.sector_text,
            puesto_id: pt.puesto_id,
            puesto_text: pt.puesto_text,
            cantidad_expuestos: pt.cantidad_expuestos,
            tarea_desempenada: pt.tarea_desempenada,
            procedimiento_escrito: pt.procedimiento_escrito,
            capacitacion: pt.capacitacion,
            nombres_trabajadores: pt.nombres_trabajadores,
            manifestacion_temprana: pt.manifestacion_temprana,
            ubicacion_sintoma: pt.ubicacion_sintoma,
            tareas: pt.tareas,
            tiempos_exposicion: pt.tiempos_exposicion,
            f_levantamiento_identificado: pt.f_levantamiento_identificado,
            f_levantamiento_requiere_eval: pt.f_levantamiento_requiere_eval,
            f_empuje_arrastre_identificado: pt.f_empuje_arrastre_identificado,
            f_empuje_arrastre_requiere_eval: pt.f_empuje_arrastre_requiere_eval,
            f_transporte_identificado: pt.f_transporte_identificado,
            f_transporte_requiere_eval: pt.f_transporte_requiere_eval,
            f_bipedestacion_identificado: pt.f_bipedestacion_identificado,
            f_bipedestacion_requiere_eval: pt.f_bipedestacion_requiere_eval,
            f_mov_repetitivos_identificado: pt.f_mov_repetitivos_identificado,
            f_mov_repetitivos_requiere_eval: pt.f_mov_repetitivos_requiere_eval,
            f_posturas_forzadas_identificado: pt.f_posturas_forzadas_identificado,
            f_posturas_forzadas_requiere_eval: pt.f_posturas_forzadas_requiere_eval,
            f_vibraciones_identificado: pt.f_vibraciones_identificado,
            f_vibraciones_requiere_eval: pt.f_vibraciones_requiere_eval,
            f_confort_termico_identificado: pt.f_confort_termico_identificado,
            f_confort_termico_requiere_eval: pt.f_confort_termico_requiere_eval,
            nivel_de_riesgo: pt.nivel_de_riesgo,
            resultado_punto: pt.resultado_punto,
            observaciones_punto: pt.observaciones_punto
          });
      }

      // Clone attachments references
      const { data: origAdj } = await supabase
        .from('protocolos_ergonomia_adjuntos')
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
          .from('protocolos_ergonomia_adjuntos')
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
        .from('protocolos_ergonomia')
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
    let printWindow = null;
    if (shouldPrint) {
      printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Imprimiendo Protocolo...</title>
              <style>
                body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #475569; }
                .loader { text-align: center; }
                .spinner { width: 36px; height: 36px; border: 3px solid #cbd5e1; border-top-color: #468DFF; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
                @keyframes spin { to { transform: rotate(360deg); } }
              </style>
            </head>
            <body>
              <div class="loader">
                <div class="spinner"></div>
                <p style="font-weight: 600; margin: 0;">Generando vista de impresión...</p>
              </div>
            </body>
          </html>
        `);
      }
    }

    try {
      globalToast.toast('Generando reporte PDF...', 'info');
      const { data: pts } = await supabase
        .from('protocolos_ergonomia_puntos')
        .select('*')
        .eq('protocolo_id', protoItem.id)
        .order('orden');

      const { data: adjs } = await supabase
        .from('protocolos_ergonomia_adjuntos')
        .select('*')
        .eq('protocolo_id', protoItem.id);

      const doc = await generateErgonomyProtocolPdf(protoItem, tenant, empresas, allEstablecimientos, pts || [], adjs || [], isDevMode, profile);
      if (!doc) throw new Error('No se pudo generar el reporte PDF.');

      if (shouldPrint) {
        printPdfDocument(doc, printWindow, `Protocolo de Ergonomía - ${protoItem.razon_social_text || 'Reporte'}`);
        globalToast.toast('Ventana de impresión abierta.', 'success');
      } else {
        const safeName = (protoItem.razon_social_text || 'Ergonomia').replace(/\s+/g, '_');
        const safeDate = protoItem.fecha_medicion || 'reciente';
        doc.save(`Protocolo_Ergonomia_${safeName}_${safeDate}.pdf`);
        globalToast.toast('PDF descargado con éxito.', 'success');
      }
    } catch (err) {
      if (printWindow && !printWindow.closed) {
        printWindow.close();
      }
      console.error('Error al exportar PDF:', err);
      globalToast.toast('No se pudo generar el reporte PDF.', 'error');
    }
  };

  // Trigger Email Modal
  const openEmailModal = (protoItem) => {
    setMailTarget(protoItem);
    const emp = empresas.find(e => e.id === protoItem.razon_social_id);
    
    // Correos
    const emails = emp?.contactos_correos || [];
    setAvailableEmails(emails.map(c => ({ descripcion: `${c.contacto || 'Contacto'}: ${c.valor}`, valor: c.valor, checked: false })));
    setManualEmail('');

    // Teléfonos
    const phones = emp?.contactos_telefonos || [];
    setAvailablePhones(phones.map(c => ({ descripcion: `${c.contacto || 'Contacto'}: ${c.valor}`, valor: c.valor, checked: false })));
    setManualPhone('');

    setActiveTab('email');
    setIsMailModalOpen(true);
  };

  // Enviar por WhatsApp
  const handleSendWhatsApp = async () => {
    setWhatsappLoading(true);
    try {
      const checkedPhones = availablePhones.filter(p => p.checked).map(p => p.valor);
      const manualVal = manualPhone.trim();
      
      let targetPhone = '';
      if (checkedPhones.length > 0) {
        targetPhone = checkedPhones[0];
      } else if (manualVal) {
        targetPhone = manualVal;
      }
      
      let cleanPhone = targetPhone.replace(/[^0-9]/g, '');
      
      const { data: pts } = await supabase
        .from('protocolos_ergonomia_puntos')
        .select('*, mediciones:protocolos_ergonomia_mediciones(*)')
        .eq('protocolo_id', mailTarget.id)
        .order('orden');
      
      const { data: adjs } = await supabase
        .from('protocolos_ergonomia_adjuntos')
        .select('*')
        .eq('protocolo_id', mailTarget.id);

      const doc = await generateErgonomyProtocolPdf(mailTarget, tenant, empresas, allEstablecimientos, pts || [], adjs || [], isDevMode, profile);
      if (!doc) throw new Error('No se pudo generar el reporte PDF.');
      const pdfBlob = doc.output('blob');
      
      const fileId = crypto.randomUUID();
      const filePath = `${profile?.id || 'anonymous'}/ergonomia_${mailTarget.id}_${fileId}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Error al subir el reporte a Storage: ${uploadError.message}`);
      }

      const { data: signData, error: signError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 604800);
      
      if (signError || !signData?.signedUrl) {
        throw new Error(`Error al generar enlace seguro de descarga: ${signError?.message || 'Enlace nulo'}`);
      }

      const pdfUrl = signData.signedUrl;
      const emp = empresas.find(e => e.id === mailTarget.razon_social_id);
      const est = allEstablecimientos.find(e => e.id === mailTarget.establecimiento_id);
      const empName = emp ? emp.razon_social : 'N/A';
      const estName = est ? est.denominacion : 'N/A';

      const tName = tenant ? (tenant.razon_social || tenant.nombre || 'Gestión SySO') : 'Gestión SySO';
      const textMessage = `Estimado cliente de *${empName}* (Establecimiento: *${estName}*),\n\nLe adjuntamos el *Protocolo de Ergonomía* del día *${formatDate(mailTarget.fecha_medicion)}* generado por el profesional *${mailTarget.profesional_nombre || 'Técnico SySO'}* de *${tName}*.\n\nPuede ver y descargar el documento PDF ingresando al siguiente enlace seguro:\n${pdfUrl}`;
      
      const encodedMsg = encodeURIComponent(textMessage);
      
      let waUrl = '';
      if (cleanPhone) {
        waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`;
      } else {
        waUrl = `https://api.whatsapp.com/send?text=${encodedMsg}`;
      }
      
      window.open(waUrl, '_blank');
      globalToast.toast('Redirigiendo a WhatsApp...', 'success');
      setIsMailModalOpen(false);
    } catch (e) {
      console.error(e);
      globalToast.toast(e.message || 'Error al intentar enviar por WhatsApp.', 'error');
    } finally {
      setWhatsappLoading(false);
    }
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
      const { data: pts } = await supabase
        .from('protocolos_ergonomia_puntos')
        .select('*, mediciones:protocolos_ergonomia_mediciones(*)')
        .eq('protocolo_id', mailTarget.id)
        .order('orden');
      
      const { data: adjs } = await supabase
        .from('protocolos_ergonomia_adjuntos')
        .select('*')
        .eq('protocolo_id', mailTarget.id);

      const doc = await generateErgonomyProtocolPdf(mailTarget, tenant, empresas, allEstablecimientos, pts || [], adjs || [], isDevMode, profile);
      const pdfBlob = doc.output('blob');

      const fileId = crypto.randomUUID();
      const filePath = `${profile?.id || 'anonymous'}/ergonomia_${mailTarget.id}_${fileId}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Error al subir el archivo temporal a Storage: ${uploadError.message}`);
      }

      const emp = empresas.find(e => e.id === mailTarget.razon_social_id);
      const est = allEstablecimientos.find(e => e.id === mailTarget.establecimiento_id);

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: recipients,
          filePath: filePath,
          companyName: emp ? emp.razon_social : mailTarget.razon_social_text || 'Cliente',
          establishmentName: est ? est.denominacion : mailTarget.establecimiento_text || 'Establecimiento',
          date: formatDate(mailTarget.fecha_medicion),
          inspectorName: mailTarget.profesional_nombre || profile?.full_name || 'Profesional SySO',
          tenantLogoBase64: tenant?.logo_1_url || null,
          tenantName: tenant?.name || tenant?.razon_social || 'Gestión SySO',
          documentType: 'protocolo_ergonomia'
        })
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.error || 'Error al enviar el correo electrónico.');
      }

      globalToast.toast('Protocolo enviado exitosamente por correo electrónico.', 'success');
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
    const matchesAnio = !filterAnio || (pr.fecha_medicion && new Date(pr.fecha_medicion).getFullYear().toString() === filterAnio);

    return matchesSearch && matchesEmpresa && matchesEstablecimiento && matchesAnio;
  });

  const añosDisponibles = Array.from(
    new Set(
      protocolos
        .map(p => p.fecha_medicion ? new Date(p.fecha_medicion).getFullYear().toString() : null)
        .filter(Boolean)
    )
  ).sort((a, b) => b - a);

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
      <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
        <Sidebar
          tenantSlug={tenantSlug}
          profile={profile}
          currentSection="protocolo-ergonomia"
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          handleLogout={handleLogout}
          onNavigate={handleSidebarNavigation}
        />
        <main className="flex-grow flex flex-col min-w-0 overflow-y-auto">
          <AppPageHeader
            title="Protocolo de Ergonomía"
            icon={PersonStanding}
            tenantName={tenant?.name || 'Gestión SySO'}
            planId={tenant?.plan_id}
            showPlanBadge={profile && profile.role !== 'cliente'}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
          <AppLoadingSpinner message="Cargando protocolo de ergonomía..." />
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="protocolo-ergonomia"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      <main className="flex-grow flex flex-col min-w-0 overflow-y-auto">
        <AppPageHeader
          title="Protocolo de Ergonomía"
          icon={PersonStanding}
          tenantName={tenant?.name || 'Cargando...'}
          planId={tenant?.plan_id}
          showPlanBadge={profile && profile.role !== 'cliente'}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        <div className="w-full flex-grow flex flex-col min-h-0 p-0 md:py-8 md:max-w-[95%] md:mx-auto md:px-0">
          {formMode !== 'list' ? (
            <ProtocoloForm
              tenantSlug={tenantSlug}
              profile={profile}
              tenant={tenant}
              editingId={editingId}
              mode={formMode === 'create' ? 'create' : formMode === 'edit' ? 'edit' : 'view'}
              onClose={() => {
                setFormMode('list');
                setEditingId(null);
                setIsFormDirty(false);
                router.replace(`/${tenantSlug}/protocolos/ergonomia`);
              }}
              onSaveSuccess={() => {
                setFormMode('list');
                setEditingId(null);
                setIsFormDirty(false);
                loadProtocols();
                router.replace(`/${tenantSlug}/protocolos/ergonomia`);
              }}
              onEdit={() => setFormMode('edit')}
              onDirtyChange={setIsFormDirty}
              onExportPdf={() => {
                const proto = protocolos.find(p => p.id === editingId);
                if (proto) handleExportPdf(proto, false);
              }}
              onSendPdf={() => {
                const proto = protocolos.find(p => p.id === editingId);
                if (proto) openEmailModal(proto);
              }}
            />
          ) : (
            <div className="space-y-0 md:space-y-6 flex-grow flex flex-col min-h-0">

            {/* CONTENEDOR 1: BUSCADOR Y BOTÓN ACCIÓN (SySO Compact Layout) */}
            <div className="bg-white border-y border-x-0 md:border md:border-slate-200 md:rounded-2xl px-3.5 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-3.5 shadow-sm space-y-2.5 shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                <div className="hidden md:block flex-1"></div>

                <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar por cliente, establecimiento, sonómetro..."
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Filtros avanzados colapsables */}
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

                    {(filterText || filterEmpresa || filterEstablecimiento || filterAnio) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterText('');
                          setFilterEmpresa('');
                          setFilterEstablecimiento('');
                          setFilterAnio('');
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>

                  {canCargar && (
                    <AppButton
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setEditingId(null);
                        setFormMode('create');
                        router.replace(`/${tenantSlug}/protocolos/ergonomia?action=nuevo`);
                      }}
                      className="shrink-0"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Nuevo protocolo</span>
                    </AppButton>
                  )}
                </div>
              </div>

              {/* FILTROS AVANZADOS COLLAPSIBLE */}
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 animate-fade-in">
                  <div className="space-y-1 col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Filtrar por Cliente</label>
                    <select
                      value={filterEmpresa}
                      onChange={(e) => {
                        setFilterEmpresa(e.target.value);
                        setFilterEstablecimiento('');
                      }}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer"
                    >
                      <option value="">Todos los clientes</option>
                      {empresas.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Establecimiento</label>
                    <select
                      disabled={!filterEmpresa}
                      value={filterEstablecimiento}
                      onChange={(e) => setFilterEstablecimiento(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                    >
                      <option value="">{!filterEmpresa ? 'Seleccione cliente...' : 'Todos los establecimientos'}</option>
                      {allEstablecimientos.filter(est => est.empresa_id === filterEmpresa).map(est => (
                        <option key={est.id} value={est.id}>{est.denominacion}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Año</label>
                    <select
                      value={filterAnio}
                      onChange={(e) => setFilterAnio(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer"
                    >
                      <option value="">Todos los años</option>
                      {añosDisponibles.map(anio => (
                        <option key={anio} value={anio}>{anio}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* LISTADO DE PROTOCOLOS (SySO Compact Layout) */}
            <div 
              className={`bg-white border-y border-x-0 md:border md:border-slate-200 md:rounded-2xl shadow-sm overflow-hidden flex flex-col flex-grow min-h-0 md:flex-initial transition-all duration-300 ease-in-out ${showFilters ? 'md:h-[calc(100vh-280px)]' : 'md:h-[calc(100vh-240px)]'}`}
            >
          {sortedProtocolos.length === 0 ? (
            <AppEmptyState
              title="No se encontraron protocolos de ergonomía"
              description="Registra un nuevo informe o ajusta los filtros de búsqueda."
              actionButton={canCargar && (
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingId(null);
                    setFormMode('create');
                    router.replace(`/${tenantSlug}/protocolos/ergonomia?action=nuevo`);
                  }}
                  className="shadow-md shadow-[#468DFF]/10 flex items-center gap-1.5"
                >
                  Crear primer protocolo
                </AppButton>
              )}
            />
          ) : (
            <div className="overflow-auto flex-grow scrollbar-thin">
              <table className="w-full border-collapse text-left text-xs min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                    <th onClick={() => toggleSort('razon_social_text')} className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 w-[35%]">
                      <div className="flex items-center gap-1.5">
                        Cliente / Establecimiento
                        <AppSortIcon field="razon_social_text" sortField={sortField} sortOrder={sortOrder} />
                      </div>
                    </th>
                    <th onClick={() => toggleSort('profesional_nombre')} className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 w-[25%]">
                      <div className="flex items-center gap-1.5">
                        Profesional SySO
                        <AppSortIcon field="profesional_nombre" sortField={sortField} sortOrder={sortOrder} />
                      </div>
                    </th>
                    <th onClick={() => toggleSort('fecha_medicion')} className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 w-[15%]">
                      <div className="flex items-center gap-1.5">
                        Fecha Medición
                        <AppSortIcon field="fecha_medicion" sortField={sortField} sortOrder={sortOrder} />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-center w-[10%]">Resultado</th>
                    <th className="px-6 py-4 text-center w-[10%]">Estado</th>
                    <th className="px-6 py-4 text-center w-[5%]">Acciones</th>
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
                      <tr 
                        key={row.id} 
                        onClick={() => {
                          setEditingId(row.id);
                          setFormMode('view');
                          router.replace(`/${tenantSlug}/protocolos/ergonomia?id=${row.id}`);
                        }}
                        className="hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-800 block text-xs leading-none mb-1.5">{row.razon_social_text}</span>
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Building className="h-3 w-3 shrink-0" />
                            {row.establecimiento_text}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 max-w-[180px] truncate" title={row.profesional_nombre}>
                          {row.profesional_nombre || '-'}
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
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {/* Ver Detalles (solo Cliente) */}
                            {profile?.role === 'cliente' && (
                              <AppTooltip content="Ver detalle">
                                <AppButton
                                  variant="ghost-table"
                                  size="icon"
                                  onClick={() => {
                                    setEditingId(row.id);
                                    setFormMode('view');
                                    router.replace(`/${tenantSlug}/protocolos/ergonomia?id=${row.id}`);
                                  }}
                                >
                                  <Eye className="h-4.5 w-4.5" />
                                </AppButton>
                              </AppTooltip>
                            )}

                            {/* Descargar PDF */}
                            <AppTooltip content="Descargar PDF">
                              <AppButton
                                variant="document-table"
                                size="icon"
                                onClick={() => handleExportPdf(row, false)}
                              >
                                <FileText className="h-4.5 w-4.5" />
                              </AppButton>
                            </AppTooltip>

                            {/* Imprimir */}
                            <AppTooltip content="Imprimir">
                              <AppButton
                                variant="document-table"
                                size="icon"
                                onClick={() => handleExportPdf(row, true)}
                              >
                                <Printer className="h-4.5 w-4.5" />
                              </AppButton>
                            </AppTooltip>

                            {/* Enviar por Correo / WhatsApp (solo no-cliente) */}
                            {profile?.role !== 'cliente' && canEditar && (
                              <AppTooltip content="Enviar por correo o WhatsApp">
                                <AppButton
                                  variant="document-table"
                                  size="icon"
                                  onClick={() => openEmailModal(row)}
                                >
                                  <Mail className="h-4.5 w-4.5" />
                                </AppButton>
                              </AppTooltip>
                            )}

                            {/* Duplicar Borrador (solo no-cliente) */}
                            {profile?.role !== 'cliente' && canEditar && (
                              <AppTooltip content="Duplicar borrador">
                                <AppButton
                                  variant="document-table"
                                  size="icon"
                                  onClick={() => handleDuplicate(row)}
                                >
                                  <Copy className="h-4.5 w-4.5" />
                                </AppButton>
                              </AppTooltip>
                            )}

                            {/* Editar (solo no-cliente) */}
                            {profile?.role !== 'cliente' && canEditar && row.estado !== 'anulado' && (
                              <AppTooltip content="Editar protocolo">
                                <AppButton
                                  variant="edit-table"
                                  size="icon"
                                  onClick={() => {
                                    setEditingId(row.id);
                                    setFormMode('edit');
                                    router.replace(`/${tenantSlug}/protocolos/ergonomia?id=${row.id}&action=editar`);
                                  }}
                                >
                                  <Edit className="h-4.5 w-4.5" />
                                </AppButton>
                              </AppTooltip>
                            )}

                            {/* Eliminar (solo no-cliente) */}
                            {profile?.role !== 'cliente' && canEliminar && (
                              <AppTooltip content="Eliminar protocolo">
                                <AppButton
                                  variant="delete-table"
                                  size="icon"
                                  onClick={() => setDeleteConfirm({ show: true, id: row.id })}
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </AppButton>
                              </AppTooltip>
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
        </div>
          )}
        </div>
      </main>

      {/* MODAL DE ENVÍO DE REPORTE (CORREO / WHATSAPP) */}
      {isMailModalOpen && mailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsMailModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" />
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full z-10 shadow-2xl relative space-y-4 animate-scale-up">
            
            <div className="flex justify-between items-center">
              <h4 className="font-outfit text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Send className="h-4.5 w-4.5 text-[#468DFF]" />
                Enviar Protocolo (PDF)
              </h4>
              <button onClick={() => setIsMailModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer border border-slate-200">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Pestañas (Tabs) */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('email')}
                className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'email'
                    ? 'border-[#468DFF] text-[#468DFF]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                Correo Electrónico
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('whatsapp')}
                className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'whatsapp'
                    ? 'border-[#468DFF] text-[#468DFF]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </button>
            </div>

            {activeTab === 'email' ? (
              // PESTAÑA: CORREO ELECTRÓNICO
              <div className="space-y-4">
                <p className="text-[11px] text-slate-500 font-medium">
                  Seleccione los contactos cargados de la Razón Social o ingrese correos electrónicos manualmente (separados por comas) para enviar el protocolo en PDF.
                </p>

                <div className="space-y-3">
                  {/* Contactos de la Razón Social */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 block">Correos de la Razón Social:</label>
                    {availableEmails.length === 0 ? (
                      <p className="text-xs text-slate-400 italic font-semibold">No hay contactos registrados para esta empresa.</p>
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

                  {/* Ingreso manual */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Correos Manuales:</label>
                    <textarea
                      rows="2"
                      placeholder="ejemplo1@correo.com, ejemplo2@correo.com..."
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 resize-none font-medium"
                    />
                  </div>
                </div>

                {/* Acciones Correo */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsMailModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 cursor-pointer transition-all active:scale-98"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={mailLoading}
                    onClick={handleSendEmail}
                    className="px-4 py-2 bg-[#468DFF] hover:bg-[#0511F2] text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-[#468DFF]/10 disabled:opacity-50 active:scale-98"
                  >
                    {mailLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="h-3.5 w-3.5" />
                        Enviar Correo
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              // PESTAÑA: WHATSAPP
              <div className="space-y-4">
                <p className="text-[11px] text-slate-500 font-medium">
                  Seleccione un contacto registrado o ingrese un número manualmente para compartir el protocolo. Se subirá el documento temporalmente a la nube de forma segura.
                </p>

                <div className="space-y-3">
                  {/* Contactos de la empresa */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 block">Teléfonos de la Razón Social:</label>
                    {availablePhones.length === 0 ? (
                      <p className="text-xs text-slate-400 italic font-semibold">No hay contactos con teléfono registrados.</p>
                    ) : (
                      <div className="bg-slate-50 p-3 border border-slate-200 rounded-xl max-h-36 overflow-y-auto space-y-1.5">
                        {availablePhones.map((p, idx) => (
                          <label key={idx} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/50 py-1 rounded">
                            <input
                              type="checkbox"
                              checked={p.checked}
                              onChange={() => {
                                setAvailablePhones(prev => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : { ...item, checked: false }));
                              }}
                              className="accent-[#468DFF] h-4 w-4"
                            />
                            {p.descripcion}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ingreso manual */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-600">Número Manual (ej: 5491159969956):</label>
                    <input
                      type="text"
                      placeholder="Código de país + área + número (sin espacios ni guiones)"
                      value={manualPhone}
                      onChange={(e) => setManualPhone(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 font-medium"
                    />
                  </div>
                </div>

                {/* Acciones WhatsApp */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsMailModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 cursor-pointer transition-all active:scale-98"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={whatsappLoading}
                    onClick={handleSendWhatsApp}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-green-500/10 disabled:opacity-50 active:scale-98"
                  >
                    {whatsappLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-3.5 w-3.5" />
                        Enviar por WhatsApp
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      <AppConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(open) => !open && setDeleteConfirm({ show: false, id: null })}
        type="destructive"
        title="Eliminar Protocolo"
        description="¿Está seguro de que desea eliminar permanentemente este protocolo de ergonomía y todos sus puntos de muestreo y mediciones asociados? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        onConfirm={executeDelete}
      />

      {/* Navegador Lateral de registros (Anterior / Siguiente) */}
      <AppFormNavigator
        activeList={sortedProtocolos}
        currentId={editingId}
        onNavigate={(newRecord) => {
          setIsFormDirty(false);
          setEditingId(newRecord.id);
          setFormMode('view');
          router.replace(`/${tenantSlug}/protocolos/ergonomia?id=${newRecord.id}`);
        }}
        hasUnsavedChanges={isFormDirty}
        isFormOpen={formMode === 'view' || formMode === 'edit'}
      />

      {/* Diálogo de cambios sin guardar para salida por Sidebar */}
      <AppUnsavedChangesDialog
        open={unsavedDialogOpen}
        onOpenChange={setUnsavedDialogOpen}
        onLeave={handleConfirmLeave}
        title="Cambios sin guardar"
        description="Tenés cambios sin guardar. Si abandonás esta sección ahora, perderás las modificaciones realizadas."
        leaveText="Abandonar sin guardar"
        stayText="Quedarse aquí"
      />
    </div>
  );
}
