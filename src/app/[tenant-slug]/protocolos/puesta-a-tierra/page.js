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
import AppLabel from '@/components/ui/AppLabel';
import AppEmptyState from '@/components/ui/AppEmptyState';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import AppSendModal from '@/components/ui/AppSendModal';
import ProtocoloForm from './components/ProtocoloForm';
import AppUnsavedChangesDialog from '@/components/ui/AppUnsavedChangesDialog';
import AppFormNavigator from '@/components/ui/AppFormNavigator';
import AppSortIcon from '@/components/ui/AppSortIcon';
import AppSkeleton from '@/components/ui/AppSkeleton';
import AppTooltip from '@/components/ui/AppTooltip';
import AppLoadingSpinner from '@/components/ui/AppLoadingSpinner';
import { generatePuestaATierraPdf } from './utils/pdfGenerator';
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
  Download,
  Copy, 
  Sliders, 
  ChevronUp, 
  ChevronDown,
  Info,
  Calendar,
  AlertCircle,
  Zap,
  MessageCircle,
  Send
} from 'lucide-react';

export default function ProtocolosPuestaATierraPage({ params }) {
  const tenantSlug = params['tenant-slug'];
  const router = useRouter();
  const searchParams = useSearchParams();
  const globalToast = useToast();

  // Structural state
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Form Mode
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

  // Main collections
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [protocolos, setProtocolos] = useState([]);

  // Filters
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

  // Email / WhatsApp Modal State (Diálogo Unificado con Tabs)
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailTarget, setMailTarget] = useState(null);
  const [availableEmails, setAvailableEmails] = useState([]);
  const [manualEmail, setManualEmail] = useState('');
  const [mailLoading, setMailLoading] = useState(false);
  const [availablePhones, setAvailablePhones] = useState([]);
  const [manualPhone, setManualPhone] = useState('');
  const [activeTab, setActiveTab] = useState('email');
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  // Section permissions
  const getSectionPermissions = (userProfile, sectionName) => {
    if (!userProfile) return { cargar: true, editar: true, eliminar: true };
    if (userProfile.role === 'cliente') return { cargar: false, editar: false, eliminar: false };
    if (userProfile.role === 'admin' || userProfile.role === 'owner') return { cargar: true, editar: true, eliminar: true };
    const perm = userProfile.permisos?.[sectionName] || userProfile.permisos?.['protocolo_ruido'];
    if (perm === true || perm === undefined) return { cargar: true, editar: true, eliminar: true };
    if (perm === false) return { cargar: false, editar: false, eliminar: false };
    return {
      cargar: perm.cargar === true,
      editar: perm.editar === true,
      eliminar: perm.eliminar === true
    };
  };

  const sectionPerms = getSectionPermissions(profile, 'protocolo_puesta_a_tierra');
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

  // Carga Inicial de Datos (Corregida la consulta de ordenamiento de establecimientos)
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      // 1. Cargar Perfil
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profData) setProfile(profData);

      // 2. Cargar Tenant
      const { data: tenData } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', tenantSlug)
        .single();

      if (!tenData) {
        window.location.href = '/login';
        return;
      }
      setTenant(tenData);

      // 3. Cargar Empresas / Clientes
      const { data: empData } = await supabase
        .from('empresas')
        .select('id, razon_social, cuit, contactos_correos, contactos_telefonos')
        .eq('tenant_id', tenData.id)
        .order('razon_social', { ascending: true });
      if (empData) setEmpresas(empData);

      // 4. Cargar Establecimientos (Denominación, Dirección, Provincia, Localidad, CP, etc.)
      const { data: estData } = await supabase
        .from('establecimientos')
        .select('*')
        .eq('tenant_id', tenData.id)
        .order('denominacion', { ascending: true });
      if (estData) setAllEstablecimientos(estData);

      // 5. Cargar Protocolos de Puesta a Tierra
      const { data: protoData, error: protoErr } = await supabase
        .from('protocolos_puesta_a_tierra')
        .select('*')
        .eq('tenant_id', tenData.id)
        .is('deleted_at', null)
        .order('fecha_medicion', { ascending: false });

      if (!protoErr && protoData) {
        setProtocolos(protoData);
      }
    } catch (err) {
      console.error('Error al cargar protocolos de puesta a tierra:', err);
      globalToast.toast('Error de conexión con la base de datos.', 'error');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejo de URL Query Params para SPA Navigation
  useEffect(() => {
    if (!loading) {
      const qId = searchParams.get('id') || searchParams.get('edit') || searchParams.get('view');
      const qAction = searchParams.get('action');
      if (qId) {
        setEditingId(qId);
        setFormMode(searchParams.get('view') ? 'view' : 'edit');
      } else if (qAction === 'nuevo') {
        setEditingId(null);
        setFormMode('create');
      } else {
        setEditingId(null);
        setFormMode('list');
      }
    }
  }, [loading, searchParams]);

  // Cargar lista actualizada de protocolos
  const loadProtocolsList = async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from('protocolos_puesta_a_tierra')
      .select('*')
      .eq('tenant_id', tenant.id)
      .is('deleted_at', null)
      .order('fecha_medicion', { ascending: false });
    setProtocolos(data || []);
  };

  // Duplicar Protocolo
  const handleDuplicate = async (proto) => {
    try {
      globalToast.toast('Duplicando protocolo...', 'info');
      const { data: { user } } = await supabase.auth.getUser();

      const { data: newProto, error: insErr } = await supabase
        .from('protocolos_puesta_a_tierra')
        .insert({
          tenant_id: proto.tenant_id,
          user_id: user?.id || proto.user_id,
          organization_id: proto.organization_id,
          razon_social_id: proto.razon_social_id,
          establecimiento_id: proto.establecimiento_id,
          razon_social_text: proto.razon_social_text ? proto.razon_social_text + ' - Copia' : 'Copia',
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
          documentacion_adjunta: proto.documentacion_adjunta,
          informacion_adicional: proto.informacion_adicional,
          observaciones: proto.observaciones,
          conclusiones: proto.conclusiones,
          recomendaciones: proto.recomendaciones,
          resultado_general: proto.resultado_general,
          profesional_nombre: proto.profesional_nombre,
          profesional_matricula: proto.profesional_matricula,
          firma_tipo: proto.firma_tipo,
          firma_profesional: proto.firma_profesional,
          estado: 'borrador',
          created_by: user?.id,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insErr) throw insErr;

      // Duplicar Puntos
      const { data: pts } = await supabase
        .from('protocolos_puesta_a_tierra_puntos')
        .select('*')
        .eq('protocolo_id', proto.id);

      if (pts && pts.length > 0) {
        const ptsPayload = pts.map(p => ({
          protocolo_id: newProto.id,
          orden: p.orden,
          toma_tierra_num: p.toma_tierra_num,
          sector: p.sector,
          condicion_terreno: p.condicion_terreno,
          uso_puesta_a_tierra: p.uso_puesta_a_tierra,
          esquema_conexion: p.esquema_conexion,
          valor_medido_ohm: p.valor_medido_ohm,
          cumple_ohm: p.cumple_ohm,
          continuidad_permanente: p.continuidad_permanente,
          capacidad_carga: p.capacidad_carga,
          dispositivo_proteccion: p.dispositivo_proteccion,
          desconexion_automatica: p.desconexion_automatica,
          observaciones_punto: p.observaciones_punto
        }));

        await supabase.from('protocolos_puesta_a_tierra_puntos').insert(ptsPayload);
      }

      globalToast.toast('Protocolo duplicado como borrador con éxito.', 'success');
      loadProtocolsList();
    } catch (err) {
      console.error('Error duplicando protocolo:', err);
      globalToast.toast('Error al duplicar el protocolo.', 'error');
    }
  };

  // Eliminar Protocolo
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;
    try {
      const { error } = await supabase
        .from('protocolos_puesta_a_tierra')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;

      globalToast.toast('Protocolo eliminado permanentemente.', 'success');
      setDeleteConfirm({ show: false, id: null });
      loadProtocolsList();
    } catch (err) {
      console.error('Error al eliminar protocolo:', err);
      globalToast.toast('Error al eliminar el protocolo.', 'error');
    }
  };

  // Exportar / Previsualizar / Imprimir PDF Reporte
  const handleExportPdf = async (protoItem, mode = 'download') => {
    let targetWindow = null;
    if (mode === 'print') {
      targetWindow = window.open('', '_blank');
      if (targetWindow) {
        targetWindow.document.write(`
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
    } else if (mode === 'preview') {
      targetWindow = window.open('', '_blank');
    }

    try {
      globalToast.toast('Generando reporte PDF...', 'info');

      // Traer puntos y adjuntos actualizados del protocolo
      const { data: pts } = await supabase
        .from('protocolos_puesta_a_tierra_puntos')
        .select('*')
        .eq('protocolo_id', protoItem.id)
        .order('orden');

      const { data: adjs } = await supabase
        .from('protocolos_puesta_a_tierra_adjuntos')
        .select('*')
        .eq('protocolo_id', protoItem.id);

      const pdfDoc = await generatePuestaATierraPdf(
        protoItem,
        tenant,
        empresas,
        allEstablecimientos,
        pts || [],
        adjs || [],
        isDevMode,
        profile
      );

      if (!pdfDoc) throw new Error('No se pudo generar el reporte PDF.');

      if (mode === 'print') {
        printPdfDocument(pdfDoc, targetWindow, `Protocolo Puesta a Tierra - ${protoItem.razon_social_text || 'Reporte'}`);
        globalToast.toast('Ventana de impresión abierta.', 'success');
      } else if (mode === 'preview') {
        const blob = pdfDoc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        if (targetWindow) {
          targetWindow.location.href = blobUrl;
        } else {
          window.open(blobUrl, '_blank');
        }
        globalToast.toast('Vista previa abierta.', 'success');
      } else {
        pdfDoc.save(`Protocolo_Puesta_A_Tierra_${(protoItem.razon_social_text || 'Cliente').replace(/\s+/g, '_')}_${protoItem.fecha_medicion || '2026'}.pdf`);
        globalToast.toast('PDF descargado con éxito.', 'success');
      }
    } catch (err) {
      if (targetWindow && !targetWindow.closed) {
        targetWindow.close();
      }
      console.error('Error al exportar PDF:', err);
      globalToast.toast('No se pudo generar el reporte PDF.', 'error');
    }
  };

  // Abrir Modal de Envío (Email / WhatsApp)
  const openEmailModal = (protoItem) => {
    setMailTarget(protoItem);
    const emp = empresas.find(e => e.id === protoItem.razon_social_id || e.id === protoItem.empresa_id);
    
    // Correos
    const emails = [];
    if (emp && Array.isArray(emp.contactos_correos)) {
      emp.contactos_correos.forEach((c) => {
        const mailStr = (typeof c === 'object') ? (c.valor || c.correo || c.email || '') : String(c || '');
        const nameStr = (typeof c === 'object' && c.nombre) ? c.nombre : 'Contacto';
        const cargoStr = (typeof c === 'object' && c.cargo) ? c.cargo : '';
        if (mailStr && mailStr.includes('@')) {
          emails.push({
            valor: mailStr.trim(),
            descripcion: `${nameStr}${cargoStr ? ` - ${cargoStr}` : ''} (${mailStr.trim()})`,
            checked: emails.length === 0
          });
        }
      });
    }
    setAvailableEmails(emails);
    setManualEmail('');

    // Teléfonos
    const phones = [];
    if (emp && Array.isArray(emp.contactos_telefonos)) {
      emp.contactos_telefonos.forEach((t) => {
        const phoneStr = (typeof t === 'object') ? (t.valor || t.telefono || t.phone || '') : String(t || '');
        const nameStr = (typeof t === 'object' && t.nombre) ? t.nombre : 'Contacto';
        const cargoStr = (typeof t === 'object' && t.cargo) ? t.cargo : '';
        const cleanPhone = phoneStr.replace(/[^0-9]/g, '');
        if (cleanPhone) {
          phones.push({
            valor: phoneStr.trim(),
            descripcion: `${nameStr}${cargoStr ? ` - ${cargoStr}` : ''} (${phoneStr.trim()})`,
            checked: phones.length === 0
          });
        }
      });
    }
    setAvailablePhones(phones);
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
      let targetPhone = checkedPhones.length > 0 ? checkedPhones[0] : manualVal;
      let cleanPhone = targetPhone.replace(/[^0-9]/g, '');

      const { data: pts } = await supabase
        .from('protocolos_puesta_a_tierra_puntos')
        .select('*')
        .eq('protocolo_id', mailTarget.id)
        .order('orden');
      
      const { data: adjs } = await supabase
        .from('protocolos_puesta_a_tierra_adjuntos')
        .select('*')
        .eq('protocolo_id', mailTarget.id);

      const doc = await generatePuestaATierraPdf(mailTarget, tenant, empresas, allEstablecimientos, pts || [], adjs || [], isDevMode, profile);
      const pdfBlob = doc.output('blob');

      const fileId = crypto.randomUUID();
      const filePath = `${profile?.id || 'anonymous'}/puesta_a_tierra_${mailTarget.id}_${fileId}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });

      if (uploadError) throw new Error(`Error al subir el reporte a Storage: ${uploadError.message}`);

      const { data: signData, error: signError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 604800);

      if (signError || !signData?.signedUrl) throw new Error('No se pudo generar el enlace seguro de descarga.');

      const emp = empresas.find(e => e.id === mailTarget.razon_social_id);
      const est = allEstablecimientos.find(e => e.id === mailTarget.establecimiento_id);
      const empName = emp ? emp.razon_social : mailTarget.razon_social_text || 'Cliente';
      const estName = est ? est.denominacion : mailTarget.establecimiento_text || 'Establecimiento';
      const tName = tenant?.name || tenant?.razon_social || 'Gestión SySO';

      const customNote = typeof customMsg === 'string' && customMsg.trim() ? `\n\n*Nota / Mensaje:* ${customMsg.trim()}` : '';
      const textMessage = `Estimado cliente de *${empName}* (Establecimiento: *${estName}*),\n\nLe adjuntamos el *Protocolo de Puesta a Tierra (Res. SRT 900/15)* del día *${formatDate(mailTarget.fecha_medicion)}* generado por el profesional *${mailTarget.profesional_nombre || 'Técnico SySO'}* de *${tName}*.${customNote}\n\nPuede ver y descargar el documento PDF ingresando al siguiente enlace seguro:\n${signData.signedUrl}`;
      const encodedMsg = encodeURIComponent(textMessage);

      const waUrl = cleanPhone
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
        : `https://api.whatsapp.com/send?text=${encodedMsg}`;

      window.open(waUrl, '_blank');
      globalToast.toast('Redirigiendo a WhatsApp...', 'success');
      setIsMailModalOpen(false);
    } catch (e) {
      console.error(e);
      globalToast.toast(e.message || 'Error al enviar por WhatsApp.', 'error');
    } finally {
      setWhatsappLoading(false);
    }
  };

  // Enviar por Correo Electrónico
  const handleSendEmail = async (customMsg) => {
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
        .from('protocolos_puesta_a_tierra_puntos')
        .select('*')
        .eq('protocolo_id', mailTarget.id)
        .order('orden');
      
      const { data: adjs } = await supabase
        .from('protocolos_puesta_a_tierra_adjuntos')
        .select('*')
        .eq('protocolo_id', mailTarget.id);

      const doc = await generatePuestaATierraPdf(mailTarget, tenant, empresas, allEstablecimientos, pts || [], adjs || [], isDevMode, profile);
      const pdfBlob = doc.output('blob');

      const fileId = crypto.randomUUID();
      const filePath = `${profile?.id || 'anonymous'}/puesta_a_tierra_${mailTarget.id}_${fileId}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });

      if (uploadError) throw new Error(`Error al subir archivo temporal: ${uploadError.message}`);

      const emp = empresas.find(e => e.id === mailTarget.razon_social_id);
      const est = allEstablecimientos.find(e => e.id === mailTarget.establecimiento_id);

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: recipients,
          filePath: filePath,
          customMessage: typeof customMsg === 'string' ? customMsg : undefined,
          companyName: emp ? emp.razon_social : mailTarget.razon_social_text || 'Cliente',
          establishmentName: est ? est.denominacion : mailTarget.establecimiento_text || 'Establecimiento',
          date: formatDate(mailTarget.fecha_medicion),
          inspectorName: mailTarget.profesional_nombre || profile?.full_name || 'Profesional SySO',
          tenantLogoBase64: tenant?.logo_1_url || null,
          tenantName: tenant?.name || tenant?.razon_social || 'Gestión SySO',
          tenantPrimaryColor: tenant?.primary_color || '#468DFF',
          documentType: 'protocolo_puesta_a_tierra'
        })
      });

      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.error || 'Error al enviar el correo.');

      globalToast.toast('Protocolo enviado exitosamente por correo electrónico.', 'success');
      setIsMailModalOpen(false);
    } catch (err) {
      console.error(err);
      globalToast.toast(err.message || 'Error al enviar el correo.', 'error');
    } finally {
      setMailLoading(false);
    }
  };

  // Filtrado y Ordenamiento
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
          currentSection="protocolo-puesta-a-tierra"
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          handleLogout={handleLogout}
          onNavigate={handleSidebarNavigation}
        />
        <main className="flex-grow flex flex-col min-w-0 overflow-y-auto">
          <AppPageHeader
            title="Protocolo de Puesta a Tierra"
            icon={Zap}
            tenantName={tenant?.name || 'Gestión SySO'}
            planId={tenant?.plan_id}
            showPlanBadge={profile && profile.role !== 'cliente'}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
          <AppLoadingSpinner message="Cargando protocolo de puesta a tierra..." />
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="protocolo-puesta-a-tierra"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        onNavigate={handleSidebarNavigation}
      />

      <main className="flex-grow flex flex-col min-w-0 overflow-y-auto">
        <AppPageHeader
          title="Protocolo de Puesta a Tierra"
          icon={Zap}
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
              initialEmpresas={empresas}
              initialEstablecimientos={allEstablecimientos}
              editingId={editingId}
              mode={formMode === 'create' ? 'create' : formMode === 'edit' ? 'edit' : 'view'}
              onClose={() => {
                setFormMode('list');
                setEditingId(null);
                setIsFormDirty(false);
                router.replace(`/${tenantSlug}/protocolos/puesta-a-tierra`);
              }}
              onSaveSuccess={() => {
                setFormMode('list');
                setEditingId(null);
                setIsFormDirty(false);
                loadProtocolsList();
                router.replace(`/${tenantSlug}/protocolos/puesta-a-tierra`);
              }}
              onEdit={() => setFormMode('edit')}
              onDirtyChange={setIsFormDirty}
              onExportPdf={() => {
                const proto = protocolos.find(p => p.id === editingId);
                if (proto) handleExportPdf(proto, 'download');
              }}
              onPrintPdf={() => {
                const proto = protocolos.find(p => p.id === editingId);
                if (proto) handleExportPdf(proto, 'print');
              }}
              onSendPdf={() => {
                const proto = protocolos.find(p => p.id === editingId);
                if (proto) openEmailModal(proto);
              }}
            />
          ) : (
            <div className="space-y-0 md:space-y-6 flex-grow flex flex-col min-h-0">

              {/* BUSCADOR Y BOTÓN NUEVO (SySO Compact Layout v2.0) */}
              <div className="bg-white border-y border-x-0 md:border md:border-slate-200 md:rounded-2xl px-3.5 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-3.5 shadow-sm space-y-2.5 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                  <div className="hidden md:block flex-1"></div>

                  <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar por cliente, establecimiento..."
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Filtros de Búsqueda Colapsables */}
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
                        variant="filter-primary"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setFormMode('create');
                          router.replace(`/${tenantSlug}/protocolos/puesta-a-tierra?action=nuevo`);
                        }}
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Nuevo protocolo</span>
                      </AppButton>
                    )}
                  </div>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 animate-fade-in">
                    <div className="space-y-1 col-span-1">
                      <AppLabel size="sm">Filtrar por cliente</AppLabel>
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
                      <AppLabel size="sm">Establecimiento</AppLabel>
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
                      <AppLabel size="sm">Año</AppLabel>
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

              {/* LISTADO DE PROTOCOLOS COMPACT LAYOUT V2.0 */}
              <div 
                className={`bg-white border-y border-x-0 md:border md:border-slate-200 md:rounded-2xl shadow-sm overflow-hidden flex flex-col flex-grow min-h-0 md:flex-initial transition-all duration-300 ease-in-out ${showFilters ? 'md:h-[calc(100vh-280px)]' : 'md:h-[calc(100vh-240px)]'}`}
              >
                {sortedProtocolos.length === 0 ? (
                  <AppEmptyState
                    title="No se encontraron protocolos de puesta a tierra"
                    description="Registra un nuevo protocolo de medición para verificar el estado de las jabalinas y disyuntores."
                    actionButton={canCargar && (
                      <AppButton
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setFormMode('create');
                          router.replace(`/${tenantSlug}/protocolos/puesta-a-tierra?action=nuevo`);
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
                          <th onClick={() => toggleSort('instrumento_marca_modelo_serie')} className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 w-[25%]">
                            <div className="flex items-center gap-1.5">
                              Telurímetro
                              <AppSortIcon field="instrumento_marca_modelo_serie" sortField={sortField} sortOrder={sortOrder} />
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
                          const resVal = row.resultado_general || (row.cumple === false ? 'No cumple' : row.cumple === true ? 'Cumple' : 'Borrador');
                          let resultBadge = 'bg-slate-100 text-slate-600 border-slate-200';
                          if (resVal === 'Cumple' || resVal === 'CUMPLE') resultBadge = 'bg-[#00B050]/15 text-[#00B050] border-[#00B050]/30';
                          if (resVal === 'No cumple' || resVal === 'NO CUMPLE') resultBadge = 'bg-[#FF0000]/15 text-[#FF0000] border-[#FF0000]/30';
                          if (resVal === 'Parcial' || resVal === 'PARCIAL') resultBadge = 'bg-[#FF9900]/15 text-[#FF9900] border-[#FF9900]/30';

                          let stateBadge = 'bg-slate-100 text-slate-500 border-slate-200';
                          if (row.estado === 'completado' || row.estado === 'finalizado') stateBadge = 'bg-blue-50 text-[#468DFF] border-blue-150';
                          if (row.estado === 'anulado') stateBadge = 'bg-red-50 text-red-500 border-red-150';

                          return (
                            <tr 
                              key={row.id} 
                              onClick={() => {
                                setEditingId(row.id);
                                setFormMode('view');
                                router.replace(`/${tenantSlug}/protocolos/puesta-a-tierra?view=${row.id}`);
                              }}
                              className="hover:bg-slate-100 cursor-pointer transition-colors"
                            >
                              <td className="px-6 py-4">
                                <span className="font-bold text-slate-800 block text-xs leading-none mb-1.5">{row.razon_social_text || 'Sin Razón Social'}</span>
                                <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                  <Building className="h-3 w-3 shrink-0" />
                                  {row.establecimiento_text || 'Establecimiento no especificado'}
                                </span>
                              </td>

                              <td className="px-6 py-4 text-slate-500 max-w-[180px] truncate" title={row.instrumento_marca_modelo_serie}>
                                {row.instrumento_marca_modelo_serie || 'Telurímetro Digital'}
                              </td>

                              <td className="px-6 py-4 text-slate-500 font-medium">
                                {row.fecha_medicion ? formatDate(row.fecha_medicion) : '-'}
                              </td>

                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase ${resultBadge}`}>
                                  {resVal}
                                </span>
                              </td>

                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border uppercase ${stateBadge}`}>
                                  {row.estado === 'completado' || row.estado === 'finalizado' ? 'Finalizado' : row.estado === 'anulado' ? 'Anulado' : 'Borrador'}
                                </span>
                              </td>

                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                  {profile?.role === 'cliente' && (
                                    <AppTooltip content="Ver detalle">
                                      <AppButton
                                        variant="ghost-table"
                                        size="icon"
                                        onClick={() => {
                                          setEditingId(row.id);
                                          setFormMode('view');
                                          router.replace(`/${tenantSlug}/protocolos/puesta-a-tierra?view=${row.id}`);
                                        }}
                                      >
                                        <Eye className="h-4.5 w-4.5" />
                                      </AppButton>
                                    </AppTooltip>
                                  )}

                                   <AppTooltip content="Visualizar PDF">
                                     <AppButton
                                       variant="document-table"
                                       size="icon"
                                       onClick={() => handleExportPdf(row, 'preview')}
                                     >
                                       <FileText className="h-4.5 w-4.5" />
                                     </AppButton>
                                   </AppTooltip>

                                   <AppTooltip content="Imprimir">
                                     <AppButton
                                       variant="document-table"
                                       size="icon"
                                       onClick={() => handleExportPdf(row, 'print')}
                                     >
                                       <Printer className="h-4.5 w-4.5" />
                                     </AppButton>
                                   </AppTooltip>

                                   <AppTooltip content="Descargar PDF">
                                     <AppButton
                                       variant="document-table"
                                       size="icon"
                                       onClick={() => handleExportPdf(row, 'download')}
                                     >
                                       <Download className="h-4.5 w-4.5" />
                                     </AppButton>
                                   </AppTooltip>

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

                                  {profile?.role !== 'cliente' && canCargar && (
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

                                  {profile?.role !== 'cliente' && canEditar && row.estado !== 'anulado' && (
                                    <AppTooltip content="Editar protocolo">
                                      <AppButton
                                        variant="edit-table"
                                        size="icon"
                                        onClick={() => {
                                          setEditingId(row.id);
                                          setFormMode('edit');
                                          router.replace(`/${tenantSlug}/protocolos/puesta-a-tierra?edit=${row.id}`);
                                        }}
                                      >
                                        <Edit className="h-4.5 w-4.5" />
                                      </AppButton>
                                    </AppTooltip>
                                  )}

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

      {/* Diálogo Confirmar Eliminación */}
      <AppConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(open) => !open && setDeleteConfirm({ show: false, id: null })}
        type="destructive"
        title="Eliminar Protocolo"
        description="¿Está seguro de que desea eliminar permanentemente este protocolo de puesta a tierra y todos sus puntos de muestreo y mediciones asociados? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ show: false, id: null })}
      />

      {/* Diálogo Cambios No Guardados */}
      <AppUnsavedChangesDialog
        open={unsavedDialogOpen}
        onConfirm={handleConfirmLeave}
        onCancel={() => setUnsavedDialogOpen(false)}
      />

      {/* DIÁLOGO ESTÁNDAR: ENVÍO DE REPORTE (EMAIL / WHATSAPP) */}
      <AppSendModal
        isOpen={isMailModalOpen && Boolean(mailTarget)}
        onClose={() => setIsMailModalOpen(false)}
        title="Enviar Protocolo (PDF)"
        subtitle={mailTarget ? `${empresas.find(e => e.id === mailTarget.razon_social_id)?.razon_social || 'Cliente'} — ${formatDate(mailTarget.fecha_medicion)}` : undefined}
        aiContext="Envío de Protocolo Oficial de Medición de Puesta a Tierra y Continuidad (Res. SRT 900/15)"
        availableEmails={availableEmails}
        setAvailableEmails={setAvailableEmails}
        manualEmail={manualEmail}
        setManualEmail={setManualEmail}
        onSendEmail={handleSendEmail}
        isEmailLoading={mailLoading}
        availablePhones={availablePhones}
        setAvailablePhones={setAvailablePhones}
        manualPhone={manualPhone}
        setManualPhone={setManualPhone}
        onSendWhatsApp={handleSendWhatsApp}
        isWhatsappLoading={whatsappLoading}
      />

      {/* Navegador Lateral de registros (Anterior / Siguiente) */}
      <AppFormNavigator
        activeList={sortedProtocolos}
        currentId={editingId}
        onNavigate={(newRecord) => {
          setIsFormDirty(false);
          setEditingId(newRecord.id);
          if (formMode === 'edit') {
            setFormMode('edit');
            router.replace(`/${tenantSlug}/protocolos/puesta-a-tierra?edit=${newRecord.id}`);
          } else {
            setFormMode('view');
            router.replace(`/${tenantSlug}/protocolos/puesta-a-tierra?view=${newRecord.id}`);
          }
        }}
        hasUnsavedChanges={isFormDirty}
        isFormOpen={formMode === 'view' || formMode === 'edit'}
      />
    </div>
  );
}
