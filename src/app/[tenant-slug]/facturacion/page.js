// src/app/[tenant-slug]/facturacion/page.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/providers/ToastProvider';
import AppPageHeader from '@/components/ui/AppPageHeader';
import AppButton from '@/components/ui/AppButton';
import AppLabel from '@/components/ui/AppLabel';
import AppEmptyState from '@/components/ui/AppEmptyState';
import AppTooltip from '@/components/ui/AppTooltip';
import AppLoadingSpinner from '@/components/ui/AppLoadingSpinner';
import AppSortIcon from '@/components/ui/AppSortIcon';
import AppConfirmDialog from '@/components/ui/AppConfirmDialog';
import AppDatePicker from '@/components/ui/AppDatePicker';
import {
  Receipt,
  PlusCircle,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  Trash2,
  Send,
  Sliders,
  Search,
  ArrowLeft,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Printer,
  Mail
} from 'lucide-react';
import * as XLSX from 'xlsx';
import AppSendModal from '@/components/ui/AppSendModal';

import ConfigWizard from './components/ConfigWizard';
import ConfiguracionArca from './components/ConfiguracionArca';
import NuevaFacturaForm from './components/NuevaFacturaForm';
import FacturacionMasiva from './components/FacturacionMasiva';
import SeguimientoFacturacion from './components/SeguimientoFacturacion';
import ReconciliacionPanel from './components/ReconciliacionPanel';
import FacturaDetalleModal from './components/FacturaDetalleModal';
import { generateFacturaPdf, getVoucherTypeDetails } from './utils/facturaPdfGenerator';

export default function FacturacionPage({ params }) {
  const tenantSlug = params['tenant-slug'];
  const globalToast = useToast();
  const configScrollRef = useRef(null);

  const handleScrollToSection = (sectionId = 'datos-fiscales-form') => {
    const targetId = typeof sectionId === 'string' ? sectionId : 'datos-fiscales-form';
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (configScrollRef.current) {
        configScrollRef.current.scrollTo({
          top: el.offsetTop - 20,
          behavior: 'smooth'
        });
      }
      const input = el.querySelector('input');
      if (input) {
        setTimeout(() => {
          input.focus();
          input.classList.add('ring-2', 'ring-[#468DFF]');
          setTimeout(() => input.classList.remove('ring-2', 'ring-[#468DFF]'), 2000);
        }, 300);
      }
    }
  };

  // Permisos granulares de edición
  const getSectionPermissions = (userProfile, sectionName) => {
    if (!userProfile) return { cargar: true, editar: true, eliminar: true };
    if (userProfile.role === 'admin') return { cargar: true, editar: true, eliminar: true };
    if (userProfile.role === 'cliente') return { cargar: false, editar: false, eliminar: false };
    const perm = userProfile.permisos?.[sectionName] || userProfile.permisos?.[sectionName.replace(/-/g, '_')];
    if (perm === true || perm === undefined) return { cargar: true, editar: true, eliminar: true };
    if (perm === false) return { cargar: false, editar: false, eliminar: false };
    return {
      cargar: perm.cargar === true,
      editar: perm.editar === true,
      eliminar: perm.eliminar === true
    };
  };

  // Estados estructurales
  const [profile, setProfile] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const sectionPerms = getSectionPermissions(profile, 'facturacion');
  const canCargar = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;

  // Sub-vistas: 'table' (lista principal), 'form' (nueva factura), 'masiva' (excel), 'config' (arca setup), 'reconciliacion', 'auditoria'
  const [currentView, setCurrentView] = useState('table');

  // Datos
  const [empresas, setEmpresas] = useState([]);
  const [config, setConfig] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Estados de carga de operaciones
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Filtros y búsqueda (SySO Compact Layout v2.0)
  const [filterText, setFilterText] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterFechaDesde, setFilterFechaDesde] = useState('');
  const [filterFechaHasta, setFilterFechaHasta] = useState('');
  const [filterPago, setFilterPago] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMobile, setShowExportMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowFilters(false);
    }
  }, []);

  // Ordenamiento
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Diálogo de confirmación para eliminar comprobante
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, facturaId: null, isAuthorized: false });

  // Modal de vista previa / detalle de comprobante al clickear fila
  const [selectedFacturaModal, setSelectedFacturaModal] = useState(null);

  // Estado de actualización de pago
  const [updatingPagoId, setUpdatingPagoId] = useState(null);

  // Modal y estados de despacho por Email y WhatsApp
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [sendTargetFactura, setSendTargetFactura] = useState(null);
  const [availableEmails, setAvailableEmails] = useState([]);
  const [manualEmail, setManualEmail] = useState('');
  const [mailLoading, setMailLoading] = useState(false);
  const [availablePhones, setAvailablePhones] = useState([]);
  const [manualPhone, setManualPhone] = useState('');
  const [whatsappLoading, setWhatsappLoading] = useState(false);

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

  // Cargar sesión y perfil
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('user-profile');
      if (cached) {
        setProfile(JSON.parse(cached));
      }
    }
    const loadSessionAndData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*, tenants(*)')
            .eq('id', session.user.id)
            .maybeSingle();

          if (prof) {
            setProfile(prof);
            setTenant(prof.tenants);
          }
        }
      } catch (err) {
        console.error('Error cargando perfil:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSessionAndData();
  }, []);

  // Cargar configuración de ARCA directamente desde Supabase
  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('tenant_arca_config')
        .select('*')
        .maybeSingle();

      if (!error && data) {
        setConfig({
          ...data,
          has_certificate: !!data.cert_storage_path,
          has_private_key: !!data.key_storage_path,
        });
      }
    } catch (err) {
      console.warn('Configuración ARCA aún no inicializada o tabla no creada:', err);
    }
  };

  // Cargar Facturas directamente desde Supabase
  const loadFacturas = async () => {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select('*, empresas(razon_social)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && Array.isArray(data)) {
        setFacturas(data);
      }
    } catch (err) {
      console.warn('Facturas no encontradas o tabla pendiente de migración:', err);
    }
  };

  // Cargar Logs de Auditoría
  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const { data, error } = await supabase
        .from('facturacion_audit_log')
        .select('*, profiles:performed_by(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && Array.isArray(data)) {
        setAuditLogs(data);
      }
    } catch (err) {
      console.warn('Error cargando auditoría:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Cargar Empresas clientes
  useEffect(() => {
    if (!profile?.tenant_id) return;
    const fetchEmpresas = async () => {
      try {
        const { data, error } = await supabase
          .from('empresas')
          .select('id, razon_social, nombre_comercial, cuit, contactos_correos, contactos_telefonos, contactos_facturacion')
          .eq('tenant_id', profile.tenant_id)
          .order('razon_social', { ascending: true });
        if (!error && data) setEmpresas(data);
      } catch (err) {
        console.warn('Error cargando empresas:', err);
      }
    };
    fetchEmpresas();
  }, [profile?.tenant_id]);

  useEffect(() => {
    loadConfig();
    loadFacturas();
  }, []);

  useEffect(() => {
    if (currentView === 'auditoria') {
      loadAuditLogs();
    }
  }, [currentView]);

  // Manejador: Guardar Configuración Fiscal
  const handleSaveConfig = async (payload) => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/facturacion/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        globalToast.toast('Configuración fiscal guardada correctamente.', 'success');
        loadConfig();
      } else {
        globalToast.toast(data.error || 'Error al guardar configuración.', 'error');
      }
    } catch (err) {
      globalToast.toast(`Error de red: ${err.message}`, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Manejador: Subir Certificados
  const handleUploadCertificates = async (formData) => {
    try {
      const res = await fetch('/api/facturacion/config', {
        method: 'PUT',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        globalToast.toast('Certificados digitales actualizados con éxito.', 'success');
        loadConfig();
      } else {
        globalToast.toast(data.error || 'Error al subir certificados.', 'error');
      }
    } catch (err) {
      globalToast.toast(`Error al subir archivos: ${err.message}`, 'error');
    }
  };

  // Manejador: Probar Conexión ARCA
  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch('/api/facturacion/consultar?action=status');
      const data = await res.json();
      if (res.ok && data.success) {
        globalToast.toast(
          `Conexión exitosa con ARCA (${data.environment}). Servidores operativos.`,
          'success'
        );
      } else {
        globalToast.toast(data.error || 'Error al comunicarse con ARCA.', 'error');
      }
    } catch (err) {
      globalToast.toast(`Fallo en prueba de conexión: ${err.message}`, 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  // Manejador: Emitir Factura Individual / Registrar Comprobante Interno
  const handleEmitirFactura = async (payload) => {
    setIsSubmittingInvoice(true);
    const isInterno = payload?.tipo_comprobante === 99;
    try {
      globalToast.toast(
        isInterno ? 'Registrando comprobante interno...' : 'Enviando solicitud a ARCA...',
        'info'
      );
      const res = await fetch('/api/facturacion/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (isInterno) {
          globalToast.toast(
            `¡Comprobante interno INT-${String(data.numero_comprobante || 1).padStart(8, '0')} registrado con éxito!`,
            'success'
          );
        } else {
          globalToast.toast(`¡Factura emitida exitosamente! CAE: ${data.cae}`, 'success');
        }
        loadFacturas();
        setCurrentView('table');
      } else {
        globalToast.toast(
          data.error || (isInterno ? 'Error al registrar comprobante interno.' : 'Error al emitir factura.'),
          'error'
        );
        loadFacturas();
      }
    } catch (err) {
      globalToast.toast(`Error de conexión: ${err.message}`, 'error');
      loadFacturas();
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // Manejador: Guardar Borrador
  const handleGuardarBorrador = async (payload) => {
    try {
      const res = await fetch('/api/facturacion/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        globalToast.toast('Borrador guardado correctamente.', 'success');
        loadFacturas();
        setCurrentView('table');
      } else {
        globalToast.toast(data.error || 'Error al guardar borrador.', 'error');
      }
    } catch (err) {
      globalToast.toast(`Error de red: ${err.message}`, 'error');
    }
  };

  // Manejador: Emitir Lote Masivo
  const handleEmitirLote = async (payload) => {
    setIsProcessingBatch(true);
    try {
      globalToast.toast('Procesando lote de facturas en ARCA...', 'info');
      const res = await fetch('/api/facturacion/emitir-masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        globalToast.toast(
          `Lote procesado: ${data.resumen?.exitosas || 0} autorizadas, ${data.resumen?.fallidas || 0} rechazadas.`,
          data.resumen?.fallidas > 0 ? 'warning' : 'success'
        );
        loadFacturas();
        return data;
      } else {
        globalToast.toast(data.error || 'Error en emisión masiva.', 'error');
        loadFacturas();
        return null;
      }
    } catch (err) {
      globalToast.toast(`Fallo en lote: ${err.message}`, 'error');
      loadFacturas();
      return null;
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Manejador: Reconciliación
  const handleReconciliar = async (facturaId = null) => {
    setIsReconciling(true);
    try {
      globalToast.toast('Consultando comprobantes en servidores de ARCA...', 'info');
      const res = await fetch('/api/facturacion/reconciliar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facturaId ? { factura_id: facturaId } : {}),
      });
      const data = await res.json();

      if (res.ok) {
        globalToast.toast(data.message || 'Reconciliación completada.', 'success');
        loadFacturas();
      } else {
        globalToast.toast(data.error || 'Error al reconciliar.', 'error');
      }
    } catch (err) {
      globalToast.toast(`Error de red en reconciliación: ${err.message}`, 'error');
    } finally {
      setIsReconciling(false);
    }
  };

  // Manejador: Reintentar Emisión
  const handleReintentar = async (facturaId) => {
    try {
      globalToast.toast('Reintentando emisión en ARCA...', 'info');
      const res = await fetch('/api/facturacion/reintentar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factura_id: facturaId }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        globalToast.toast(`¡Factura emitida exitosamente! CAE: ${data.cae}`, 'success');
        loadFacturas();
      } else {
        globalToast.toast(data.error || 'Error al reintentar emisión.', 'error');
        loadFacturas();
      }
    } catch (err) {
      globalToast.toast(`Error de red: ${err.message}`, 'error');
    }
  };

  // Manejador: Eliminar Factura / Comprobante
  const handleDeleteFactura = async (facturaId) => {
    if (!canEliminar) {
      globalToast.toast('No tienes permisos para eliminar comprobantes.', 'error');
      return;
    }
    try {
      const res = await fetch('/api/facturacion/eliminar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factura_id: facturaId }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        globalToast.toast(data.message || 'Comprobante eliminado correctamente.', 'success');
        setFacturas(prev => prev.filter(f => f.id !== facturaId));
        loadFacturas();
      } else {
        globalToast.toast(data.error || 'No se pudo eliminar el comprobante.', 'error');
      }
    } catch (err) {
      globalToast.toast(`Error de red: ${err.message}`, 'error');
    }
  };

  // Manejador: Imprimir Factura PDF
  const handlePrintPdf = async (factura) => {
    globalToast.toast('Preparando impresión de factura...', 'info');
    try {
      await generateFacturaPdf({ factura, config, tenant, profile, mode: 'print' });
    } catch (err) {
      console.error('Error al imprimir factura:', err);
      globalToast.toast('Error al imprimir: ' + (err.message || 'Fallo interno'), 'error');
    }
  };

  // Manejador: Abrir Diálogo de Envío (Email / WhatsApp)
  const handleOpenSendModal = (factura) => {
    setSendTargetFactura(factura);
    setManualEmail('');
    setManualPhone('');

    // Normalizar datos del receptor para búsqueda flexible
    const rawFacturaDoc = String(factura.receptor_doc_nro || '').replace(/[^0-9]/g, '');
    const rawFacturaRS = (factura.receptor_razon_social || '').trim().toLowerCase();

    // Buscar datos de contacto del cliente en la lista de empresas registradas
    const foundEmpresa = empresas.find(e => {
      if (factura.empresa_id && e.id === factura.empresa_id) return true;
      const cleanEmpCuit = String(e.cuit || '').replace(/[^0-9]/g, '');
      if (rawFacturaDoc && cleanEmpCuit && cleanEmpCuit === rawFacturaDoc) return true;
      const empRS = (e.razon_social || '').trim().toLowerCase();
      const empNC = (e.nombre_comercial || '').trim().toLowerCase();
      if (rawFacturaRS && (empRS === rawFacturaRS || empNC === rawFacturaRS)) return true;
      if (rawFacturaRS && empRS && (empRS.includes(rawFacturaRS) || rawFacturaRS.includes(empRS))) return true;
      if (rawFacturaRS && empNC && (empNC.includes(rawFacturaRS) || rawFacturaRS.includes(empNC))) return true;
      return false;
    });

    const emails = [];
    const phones = [];

    if (foundEmpresa) {
      // Helper robusto para parsear contactos (soporta Array nativo o JSON string)
      const parseContacts = (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
          } catch (e) {}
        }
        return [];
      };

      const facturacionList = parseContacts(foundEmpresa.contactos_facturacion);
      const correosList = parseContacts(foundEmpresa.contactos_correos);
      const telefonosList = parseContacts(foundEmpresa.contactos_telefonos);

      // 1. Correos de Facturación (prioritarios y seleccionados por defecto)
      facturacionList.forEach((c) => {
        const mailStr = (typeof c === 'object') ? (c.valor || c.correo || c.email || '') : String(c || '');
        const nameStr = (typeof c === 'object' && c.nombre) ? c.nombre : 'Facturación';
        const cargoStr = (typeof c === 'object' && c.cargo) ? c.cargo : '';
        const cleanMail = mailStr.trim();
        if (cleanMail && cleanMail.includes('@')) {
          const alreadyExists = emails.some(e => e.valor.toLowerCase() === cleanMail.toLowerCase());
          if (!alreadyExists) {
            emails.push({
              valor: cleanMail,
              descripcion: `[Facturación] ${nameStr}${cargoStr ? ` - ${cargoStr}` : ''} (${cleanMail})`,
              checked: true
            });
          }
        }
      });

      // 2. Correos Generales del Cliente (disponibles para selección)
      correosList.forEach((c) => {
        const mailStr = (typeof c === 'object') ? (c.valor || c.correo || c.email || '') : String(c || '');
        const nameStr = (typeof c === 'object' && c.nombre) ? c.nombre : 'Contacto';
        const cargoStr = (typeof c === 'object' && c.cargo) ? c.cargo : '';
        const cleanMail = mailStr.trim();
        if (cleanMail && cleanMail.includes('@')) {
          const alreadyExists = emails.some(e => e.valor.toLowerCase() === cleanMail.toLowerCase());
          if (!alreadyExists) {
            emails.push({
              valor: cleanMail,
              descripcion: `${nameStr}${cargoStr ? ` - ${cargoStr}` : ''} (${cleanMail})`,
              checked: emails.length === 0 // Marcado por defecto solo si no había correo específico de facturación
            });
          }
        }
      });

      // 3. Teléfonos (WhatsApp)
      telefonosList.forEach((t) => {
        const phoneStr = (typeof t === 'object') ? (t.valor || t.telefono || t.phone || '') : String(t || '');
        const nameStr = (typeof t === 'object' && t.nombre) ? t.nombre : 'Contacto';
        const cargoStr = (typeof t === 'object' && t.cargo) ? t.cargo : '';
        const cleanPhone = phoneStr.replace(/[^0-9]/g, '');
        if (cleanPhone && !phones.some(p => p.valor.replace(/[^0-9]/g, '') === cleanPhone)) {
          phones.push({
            valor: phoneStr.trim(),
            descripcion: `${nameStr}${cargoStr ? ` - ${cargoStr}` : ''} (${phoneStr.trim()})`,
            checked: phones.length === 0
          });
        }
      });
    }

    setAvailableEmails(emails);
    setAvailablePhones(phones);
    setIsSendModalOpen(true);
  };

  // Manejador: Despachar por Email
  const handleSendEmail = async (customMsg) => {
    if (!sendTargetFactura) return;
    const checked = availableEmails.filter(e => e.checked).map(e => e.valor);
    const manuals = manualEmail.split(',').map(e => e.trim()).filter(Boolean);
    const recipients = [...checked, ...manuals];

    if (recipients.length === 0) {
      globalToast.toast('Ingrese o seleccione al menos un destinatario.', 'error');
      return;
    }

    setMailLoading(true);
    try {
      // 1. Generar blob del PDF
      const pdfBlob = await generateFacturaPdf({
        factura: sendTargetFactura,
        config,
        tenant,
        profile,
        mode: 'blob',
      });

      if (!pdfBlob) throw new Error('No se pudo generar el documento PDF.');

      // 2. Subir a storage en bucket 'documents'
      const fileId = crypto.randomUUID();
      const filePath = `${profile?.id || 'anonymous'}/factura_${sendTargetFactura.id}_${fileId}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 3. Logo base64
      let logoBase64 = '';
      if (tenant?.logo_1_url) {
        try {
          logoBase64 = await fetch(tenant.logo_1_url).then(r => r.blob()).then(blob => new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          }));
        } catch (e) {}
      }

      // 4. Invocar API de despacho
      const { desc, letra } = getVoucherTypeDetails(sendTargetFactura.tipo_comprobante);
      const ptoVta = String(sendTargetFactura.punto_venta || config?.punto_venta || 1).padStart(5, '0');
      const compNro = sendTargetFactura.numero_comprobante ? String(sendTargetFactura.numero_comprobante).padStart(8, '0') : '-';

      // Extraer concepto / nombre del servicio facturado
      let serviceName = sendTargetFactura.descripcion || '';
      if (!serviceName && sendTargetFactura.items) {
        try {
          const parsed = typeof sendTargetFactura.items === 'string' ? JSON.parse(sendTargetFactura.items) : sendTargetFactura.items;
          if (Array.isArray(parsed) && parsed.length > 0) {
            const descs = parsed.map(i => i.descripcion?.trim()).filter(Boolean);
            if (descs.length > 0) {
              serviceName = descs.join(', ');
            }
          }
        } catch (e) {}
      }

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: recipients,
          filePath,
          customMessage: typeof customMsg === 'string' ? customMsg : undefined,
          companyName: sendTargetFactura.receptor_razon_social || 'Consumidor Final',
          date: formatDate(sendTargetFactura.fecha_emision),
          inspectorName: config?.razon_social || profile?.full_name || 'Gestión SySO',
          tenantLogoBase64: logoBase64 || null,
          tenantName: tenant?.name || config?.razon_social || 'Gestión SySO',
          tenantPrimaryColor: tenant?.primary_color || '#468DFF',
          documentType: `Factura Electrónica ${desc} (${letra}) ${ptoVta}-${compNro}`,
          serviceName: serviceName || undefined,
        }),
      });

      const resData = await res.json();
      if (!res.ok || resData.error) throw new Error(resData.error || 'Error al despachar el correo.');

      globalToast.toast('Factura enviada por correo electrónico con éxito.', 'success');
      setIsSendModalOpen(false);
    } catch (err) {
      console.error(err);
      globalToast.toast(err.message || 'Error al enviar por correo.', 'error');
    } finally {
      setMailLoading(false);
    }
  };

  // Manejador: Despachar por WhatsApp
  const handleSendWhatsApp = async (customMsg) => {
    if (!sendTargetFactura) return;
    const checked = availablePhones.filter(p => p.checked).map(p => p.valor);
    const manuals = manualPhone.split(',').map(p => p.trim()).filter(Boolean);
    const targetPhones = [...checked, ...manuals];

    if (targetPhones.length === 0) {
      globalToast.toast('Ingrese o seleccione un número de teléfono de destino.', 'error');
      return;
    }

    setWhatsappLoading(true);
    try {
      const pdfBlob = await generateFacturaPdf({
        factura: sendTargetFactura,
        config,
        tenant,
        profile,
        mode: 'blob',
      });

      if (!pdfBlob) throw new Error('No se pudo generar el documento PDF.');

      const fileId = crypto.randomUUID();
      const filePath = `${profile?.id || 'anonymous'}/factura_${sendTargetFactura.id}_${fileId}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 60 * 60 * 24 * 7);

      if (signedError) throw signedError;

      const downloadUrl = signedData?.signedUrl;
      const { desc, letra } = getVoucherTypeDetails(sendTargetFactura.tipo_comprobante);
      const ptoVta = String(sendTargetFactura.punto_venta || config?.punto_venta || 1).padStart(5, '0');
      const compNro = sendTargetFactura.numero_comprobante ? String(sendTargetFactura.numero_comprobante).padStart(8, '0') : '-';

      // Extraer concepto / nombre del servicio facturado
      let serviceName = sendTargetFactura.descripcion || '';
      if (!serviceName && sendTargetFactura.items) {
        try {
          const parsed = typeof sendTargetFactura.items === 'string' ? JSON.parse(sendTargetFactura.items) : sendTargetFactura.items;
          if (Array.isArray(parsed) && parsed.length > 0) {
            const descs = parsed.map(i => i.descripcion?.trim()).filter(Boolean);
            if (descs.length > 0) {
              serviceName = descs.join(', ');
            }
          }
        } catch (e) {}
      }

      const serviceText = serviceName ? ` correspondiente a *${serviceName}*` : '';
      const customNote = typeof customMsg === 'string' && customMsg.trim() ? `\n\n*Nota / Mensaje:* ${customMsg.trim()}` : '';
      const message = `Hola, adjuntamos la Factura Electrónica ${desc} (${letra}) N° ${ptoVta}-${compNro}${serviceText} emitida por ${config?.razon_social || tenant?.name || 'Gestión SySO'}.${customNote}\n\nPodés visualizar y descargar tu comprobante en el siguiente enlace:\n${downloadUrl}`;

      const cleanPhone = targetPhones[0].replace(/[^0-9]/g, '');
      const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');

      globalToast.toast('Enlace de WhatsApp generado con éxito.', 'success');
      setIsSendModalOpen(false);
    } catch (err) {
      console.error(err);
      globalToast.toast(err.message || 'Error al generar enlace de WhatsApp.', 'error');
    } finally {
      setWhatsappLoading(false);
    }
  };

  // Manejador: Actualizar Estado de Pago y Jurisdicción
  const handleUpdatePago = async (payload) => {
    setUpdatingPagoId(payload.factura_id);
    try {
      const res = await fetch('/api/facturacion/pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar el pago');
      }
      globalToast.toast('Estado de cobro actualizado correctamente.', 'success');

      setFacturas(prev => prev.map(f => {
        if (f.id === payload.factura_id) {
          return {
            ...f,
            observaciones_arca: data.pago,
          };
        }
        return f;
      }));

      setSelectedFacturaModal(prev => {
        if (prev && prev.id === payload.factura_id) {
          return {
            ...prev,
            observaciones_arca: data.pago,
          };
        }
        return prev;
      });
    } catch (err) {
      console.error('Error al actualizar pago:', err);
      globalToast.toast(err.message || 'Error al actualizar pago', 'error');
    } finally {
      setUpdatingPagoId(null);
    }
  };

  // Previsualizar y Descargar PDF
  const handleVerPdf = async (factura) => {
    globalToast.toast('Generando reporte PDF...', 'info');
    try {
      await generateFacturaPdf({ factura, config, tenant, profile, mode: 'preview' });
      globalToast.toast('Vista previa abierta.', 'success');
    } catch (err) {
      console.error('Error al generar PDF de factura:', err);
      globalToast.toast('Error al generar el reporte PDF: ' + (err.message || 'Fallo interno'), 'error');
    }
  };

  const handleDescargarPdf = async (factura) => {
    globalToast.toast('Generando reporte PDF...', 'info');
    try {
      await generateFacturaPdf({ factura, config, tenant, profile, mode: 'download' });
      globalToast.toast('PDF descargado exitosamente.', 'success');
    } catch (err) {
      console.error('Error al descargar PDF de factura:', err);
      globalToast.toast('Error al generar el reporte PDF: ' + (err.message || 'Fallo interno'), 'error');
    }
  };

  // Exportar Listado a Excel
  const handleExportExcel = () => {
    if (!sortedFacturas || sortedFacturas.length === 0) {
      globalToast.toast('No hay comprobantes para exportar.', 'error');
      return;
    }

    try {
      globalToast.toast('Generando reporte Excel de comprobantes...', 'info');
      const dataToExport = sortedFacturas.map(f => {
        const { desc, letra } = getVoucherTypeDetails(f.tipo_comprobante);
        const ptoVta = String(f.punto_venta || 1).padStart(5, '0');
        const compNro = f.numero_comprobante ? String(f.numero_comprobante).padStart(8, '0') : '--------';

        let obs = {};
        if (typeof f.observaciones_arca === 'object' && f.observaciones_arca !== null) {
          obs = f.observaciones_arca;
        } else if (typeof f.observaciones_arca === 'string') {
          try { obs = JSON.parse(f.observaciones_arca); } catch (e) {}
        }

        // Extraer descripción de ítem o concepto
        let itemDesc = f.descripcion;
        if (!itemDesc && f.items) {
          try {
            const parsed = typeof f.items === 'string' ? JSON.parse(f.items) : f.items;
            if (Array.isArray(parsed) && parsed.length > 0) {
              itemDesc = parsed.map(i => i.descripcion).filter(Boolean).join('; ');
            }
          } catch (e) {}
        }
        itemDesc = itemDesc || 'Servicios Profesionales';

        const estadoPago = obs.estado_pago || 'pendiente';
        const fechaPago = obs.fecha_pago ? formatDate(obs.fecha_pago) : '';
        const metodoPago = estadoPago === 'pagada' ? (obs.metodo_pago || 'Transferencia Bancaria') : '';
        const jurisdiccion = obs.jurisdiccion || 'CABA';

        let estadoFiscalDesc = 'Borrador';
        if (f.estado === 'autorizada') estadoFiscalDesc = 'Autorizada (CAE)';
        else if (f.estado === 'error_conexion') estadoFiscalDesc = 'Error de Conexión';
        else if (f.estado === 'rechazada') estadoFiscalDesc = 'Rechazada por ARCA';

        return {
          'Tipo Comprobante': `${desc} (${letra})`,
          'Punto de Venta': ptoVta,
          'N° Comprobante': compNro,
          'Comprobante Completo': `${letra} ${ptoVta}-${compNro}`,
          'Fecha Emisión': f.fecha_emision ? formatDate(f.fecha_emision) : '',
          'Cliente / Razón Social': f.receptor_razon_social || 'Consumidor Final',
          'CUIT / Documento': f.receptor_doc_nro || '-',
          'Condición IVA Receptor': f.receptor_condicion_iva || 'Consumidor Final',
          'Descripción / Concepto': itemDesc,
          'Período Desde': f.fecha_serv_desde ? formatDate(f.fecha_serv_desde) : '',
          'Período Hasta': f.fecha_serv_hasta ? formatDate(f.fecha_serv_hasta) : '',
          'Vto. para el Pago': f.fecha_vto_pago ? formatDate(f.fecha_vto_pago) : '',
          'CAE': f.cae || '-',
          'Vencimiento CAE': f.cae_vencimiento ? formatDate(f.cae_vencimiento) : '',
          'Estado Fiscal': estadoFiscalDesc,
          'Estado de Cobro': estadoPago === 'pagada' ? 'Pagada' : 'Pendiente',
          'Fecha de Pago': fechaPago,
          'Método de Pago': metodoPago,
          'Jurisdicción': jurisdiccion,
          'Importe Neto ($)': Number(f.imp_neto || 0),
          'Importe IVA ($)': Number(f.imp_iva || 0),
          'Importe Total ($)': Number(f.imp_total || 0),
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Comprobantes ARCA');
      const fileName = `Facturacion_ARCA_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      globalToast.toast('Planilla Excel descargada con éxito.', 'success');
    } catch (err) {
      console.error('Error al exportar comprobantes a Excel:', err);
      globalToast.toast('Error al exportar a Excel.', 'error');
    }
  };

  // Limpiar Filtros
  const handleClearFilters = () => {
    setFilterText('');
    setFilterEstado('all');
    setFilterTipo('all');
    setFilterEmpresa('');
    setFilterFechaDesde('');
    setFilterFechaHasta('');
    setFilterPago('all');
  };

  const hasActiveFilters = Boolean(filterText || filterEstado !== 'all' || filterTipo !== 'all' || filterEmpresa || filterFechaDesde || filterFechaHasta || filterPago !== 'all');

  // Filtrado de facturas
  const filteredFacturas = facturas.filter((f) => {
    if (filterText) {
      const q = filterText.toLowerCase();
      const matchDoc = String(f.receptor_doc_nro || '').toLowerCase().includes(q);
      const matchRazon = String(f.receptor_razon_social || '').toLowerCase().includes(q);
      const matchCae = String(f.cae || '').toLowerCase().includes(q);
      const matchComp = String(f.numero_comprobante || '').toLowerCase().includes(q);
      if (!matchDoc && !matchRazon && !matchCae && !matchComp) return false;
    }

    if (filterEstado !== 'all' && f.estado !== filterEstado) return false;
    if (filterTipo !== 'all' && f.tipo_comprobante !== parseInt(filterTipo)) return false;
    if (filterEmpresa && f.empresa_id !== filterEmpresa) return false;
    if (filterFechaDesde && f.fecha_emision < filterFechaDesde) return false;
    if (filterFechaHasta && f.fecha_emision > filterFechaHasta) return false;

    if (filterPago !== 'all') {
      const pStatus = getPagoStatus(f);
      if (pStatus !== filterPago) return false;
    }

    return true;
  });

  // Ordenamiento
  const sortedFacturas = [...filteredFacturas].sort((a, b) => {
    if (!sortField) return 0;
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'cliente') {
      valA = (a.receptor_razon_social || '').toLowerCase();
      valB = (b.receptor_razon_social || '').toLowerCase();
    } else if (sortField === 'total') {
      valA = Number(a.imp_total || 0);
      valB = Number(b.imp_total || 0);
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const facturasPendientes = facturas.filter(f => f.estado === 'error_conexion');

  const getPagoStatus = (factura) => {
    let obs = {};
    if (typeof factura.observaciones_arca === 'object' && factura.observaciones_arca !== null) {
      obs = factura.observaciones_arca;
    } else if (typeof factura.observaciones_arca === 'string') {
      try { obs = JSON.parse(factura.observaciones_arca); } catch (e) {}
    }
    return obs.estado_pago || 'pendiente';
  };

  const renderStatusBadge = (estado) => {
    switch (estado) {
      case 'autorizada':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" /> Autorizada (CAE)
          </span>
        );
      case 'borrador':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 w-fit">
            <Clock className="h-3 w-3" /> Borrador
          </span>
        );
      case 'error_conexion':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
            <AlertTriangle className="h-3 w-3" /> Error de Red
          </span>
        );
      case 'rechazada':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 w-fit">
            <AlertCircle className="h-3 w-3" /> Rechazada
          </span>
        );
      case 'pendiente':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#468DFF] border border-blue-200 flex items-center gap-1 w-fit">
            <RefreshCw className="h-3 w-3 animate-spin" /> Procesando
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600">
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-syso-bg text-slate-700 flex font-sans">
      {/* Sidebar Desktop & Mobile */}
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="facturacion"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AppPageHeader
          title="Facturación Electrónica ARCA"
          icon={Receipt}
          tenantName={tenant?.name || 'Gestión SySO'}
          planId={tenant?.plan_id}
          showPlanBadge={profile && profile.role !== 'cliente'}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          helpKey="facturacion"
        />

        {loading ? (
          <AppLoadingSpinner message="Cargando facturación..." />
        ) : (
          <div className="w-full flex-grow flex flex-col min-h-0 p-0 md:py-8 md:max-w-[95%] md:mx-auto md:px-0">
            
            {/* SUB-VISTA: NUEVA FACTURA / FORMULARIO INLINE */}
            {currentView === 'form' && (
              <div className="bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden flex flex-col h-full md:h-[calc(100vh-128px)] animate-fade-in w-full">
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentView('table')}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-base font-bold text-slate-900">
                      Emitir Nueva Factura Electrónica ARCA
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentView('table')}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-thin">
                  <NuevaFacturaForm
                    config={config}
                    empresas={empresas}
                    onEmitirFactura={handleEmitirFactura}
                    onGuardarBorrador={handleGuardarBorrador}
                    isSubmitting={isSubmittingInvoice}
                  />
                </div>
              </div>
            )}

            {/* SUB-VISTA: FACTURACIÓN MASIVA EXCEL */}
            {currentView === 'masiva' && (
              <div className="bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden flex flex-col h-full md:h-[calc(100vh-128px)] animate-fade-in w-full">
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentView('table')}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    {/* Tabs Segmentados (Estilo Checklist Personalizados) */}
                    <div className="flex bg-slate-200/70 p-1 rounded-lg border border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => setCurrentView('table')}
                        className="px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none bg-transparent text-slate-600 hover:text-slate-900"
                      >
                        Comprobantes
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('seguimiento')}
                        className="px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none bg-transparent text-slate-600 hover:text-slate-900"
                      >
                        Seguimiento
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('masiva')}
                        className="px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none bg-white text-[#468DFF] shadow-xs"
                      >
                        Masiva Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('config')}
                        className="px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none bg-transparent text-slate-600 hover:text-slate-900"
                      >
                        Configuración
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentView('table')}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-thin">
                  <FacturacionMasiva
                    config={config}
                    onEmitirLote={handleEmitirLote}
                    isProcessingBatch={isProcessingBatch}
                    onNavigateToComprobantes={() => setCurrentView('table')}
                  />
                </div>
              </div>
            )}

            {/* SUB-VISTA: CONFIGURACIÓN ARCA & WIZARD */}
            {currentView === 'config' && (
              <div className="bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden flex flex-col h-full md:h-[calc(100vh-128px)] animate-fade-in w-full">
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentView('table')}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    {/* Tabs Segmentados (Estilo Checklist Personalizados) */}
                    <div className="flex bg-slate-200/70 p-1 rounded-lg border border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => setCurrentView('table')}
                        className="px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none bg-transparent text-slate-600 hover:text-slate-900"
                      >
                        Comprobantes
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('seguimiento')}
                        className="px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none bg-transparent text-slate-600 hover:text-slate-900"
                      >
                        Seguimiento
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('masiva')}
                        className="px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none bg-transparent text-slate-600 hover:text-slate-900"
                      >
                        Masiva Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('config')}
                        className="px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none bg-white text-[#468DFF] shadow-xs"
                      >
                        Configuración
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentView('table')}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div ref={configScrollRef} className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-thin space-y-6">
                  {/* Wizard explicativo integrado en la cabecera de la configuración */}
                  <ConfigWizard
                    config={config}
                    onOpenConfigTab={handleScrollToSection}
                    onTestConnection={handleTestConnection}
                    testingConnection={testingConnection}
                  />

                  {/* Panel de Formulario Fiscal y Subida de Certificados */}
                  <ConfiguracionArca
                    config={config}
                    tenant={tenant}
                    profile={profile}
                    onSaveConfig={handleSaveConfig}
                    onUploadCertificates={handleUploadCertificates}
                    onTestConnection={handleTestConnection}
                    testingConnection={testingConnection}
                    savingConfig={savingConfig}
                  />
                </div>
              </div>
            )}

            {/* SUB-VISTA: RECONCILIACIÓN */}
            {currentView === 'reconciliacion' && (
              <div className="bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden flex flex-col h-full md:h-[calc(100vh-128px)] animate-fade-in w-full">
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentView('table')}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <span className="font-outfit text-base font-bold text-slate-900">
                      Reconciliación y Recuperación de Comprobantes ARCA
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentView('table')}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-thin">
                  <ReconciliacionPanel
                    facturasPendientes={facturasPendientes}
                    onReconciliarTodas={() => handleReconciliar(null)}
                    onReconciliarIndividual={(id) => handleReconciliar(id)}
                    isReconciling={isReconciling}
                  />
                </div>
              </div>
            )}

            {/* SUB-VISTA: SEGUIMIENTO DE FACTURACIÓN & COBRANZAS */}
            {currentView === 'seguimiento' && (
              <div className="bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-sm overflow-hidden flex flex-col h-full md:h-[calc(100vh-128px)] animate-fade-in w-full">
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentView('table')}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    {/* Tabs Segmentados (Estilo Checklist Personalizados) */}
                    <div className="flex bg-slate-200/70 p-1 rounded-lg border border-slate-200/50">
                      <button
                        type="button"
                        onClick={() => setCurrentView('table')}
                        className="px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none bg-transparent text-slate-600 hover:text-slate-900"
                      >
                        Comprobantes
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('seguimiento')}
                        className="px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none bg-white text-[#468DFF] shadow-xs"
                      >
                        Seguimiento
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('masiva')}
                        className="px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none bg-transparent text-slate-600 hover:text-slate-900"
                      >
                        Masiva Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('config')}
                        className="px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none bg-transparent text-slate-600 hover:text-slate-900"
                      >
                        Configuración
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentView('table')}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto flex-1 scrollbar-thin">
                  <SeguimientoFacturacion
                    facturas={facturas}
                    onUpdatePago={handleUpdatePago}
                    onOpenFacturaDetail={(f) => setSelectedFacturaModal(f)}
                    onVerPdf={handleVerPdf}
                    updatingPagoId={updatingPagoId}
                  />
                </div>
              </div>
            )}

            {/* VISTA PRINCIPAL: TABLA DE FACTURAS (SySO Compact Layout v2.0) */}
            {currentView === 'table' && (
              <div className="space-y-0 md:space-y-6 flex-grow flex flex-col min-h-0 w-full animate-fade-in">
                
                {/* PANEL DE FILTROS (SySO Compact Layout v2.0) */}
                <div className="bg-white border-y border-x-0 md:border md:border-slate-200 md:rounded-2xl px-3.5 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-3.5 shadow-sm space-y-2.5 shrink-0">
                  
                  {/* Fila Superior: Tabs Segmentados (Estilo Checklist) + Buscador */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    {/* Tabs Segmentados Estilo Checklist Personalizados */}
                    <div className="flex bg-slate-100/80 p-1 rounded-lg border border-slate-200/50 w-full sm:w-fit overflow-x-auto scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setCurrentView('table')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none whitespace-nowrap ${
                          currentView === 'table'
                            ? 'bg-white text-[#468DFF] shadow-xs'
                            : 'bg-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Comprobantes Emitidos
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('seguimiento')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none whitespace-nowrap ${
                          currentView === 'seguimiento'
                            ? 'bg-white text-[#468DFF] shadow-xs'
                            : 'bg-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Seguimiento
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('masiva')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none whitespace-nowrap ${
                          currentView === 'masiva'
                            ? 'bg-white text-[#468DFF] shadow-xs'
                            : 'bg-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Masiva Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('config')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer border-none whitespace-nowrap ${
                          currentView === 'config'
                            ? 'bg-white text-[#468DFF] shadow-xs'
                            : 'bg-transparent text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Configuración
                      </button>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                      {/* Botón Reconciliación (si hay pendientes) */}
                      {facturasPendientes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setCurrentView('reconciliacion')}
                          className="py-1 px-2.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Reconciliar ({facturasPendientes.length})</span>
                        </button>
                      )}

                      {/* Buscador */}
                      <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar por cliente, CUIT, N° o CAE..."
                          value={filterText}
                          onChange={(e) => setFilterText(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400 font-semibold"
                        />
                      </div>

                      {/* Botón Exportar Excel Estándar SySO */}
                      <AppButton
                        type="button"
                        variant="success"
                        size="sm"
                        onClick={handleExportExcel}
                        title="Descargar tabla completa de comprobantes en Excel"
                        className="shadow-xs shrink-0"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Exportar Excel</span>
                      </AppButton>
                    </div>
                  </div>

                  {/* Fila Inferior: Filtros de búsqueda + Botón Primario */}
                  <div className="pt-1.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between min-h-[28px]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowFilters(!showFilters)}
                          className="font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px] hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          <Sliders className="h-3 w-3" />
                          Filtros de búsqueda
                          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>

                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={handleClearFilters}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold cursor-pointer transition-all border border-slate-200"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>

                      {/* Botón Primario Estándar SySO */}
                      <AppButton
                        variant="filter-primary"
                        size="sm"
                        onClick={() => setCurrentView('form')}
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        <span>Emitir factura</span>
                      </AppButton>
                    </div>

                    {/* Desplegable de Filtros */}
                    {showFilters && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-1 animate-scaleUp items-start">
                        <div className="space-y-1">
                          <AppLabel size="sm">Estado Fiscal</AppLabel>
                          <select
                            value={filterEstado}
                            onChange={(e) => setFilterEstado(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-2.5 h-[32px] text-[11px] font-semibold text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer"
                          >
                            <option value="all">Todos los Estados</option>
                            <option value="autorizada">Autorizadas (CAE)</option>
                            <option value="borrador">Borradores</option>
                            <option value="error_conexion">Error de Conexión</option>
                            <option value="rechazada">Rechazadas</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <AppLabel size="sm">Estado de Cobro</AppLabel>
                          <select
                            value={filterPago}
                            onChange={(e) => setFilterPago(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-2.5 h-[32px] text-[11px] font-semibold text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer"
                          >
                            <option value="all">Todos los Cobros</option>
                            <option value="pagada">🟢 Cobradas / Pagadas</option>
                            <option value="pendiente">🟡 Pendientes de cobro</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <AppLabel size="sm">Tipo Comprobante</AppLabel>
                          <select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-2.5 h-[32px] text-[11px] font-semibold text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer"
                          >
                            <option value="all">Todos los Comprobantes</option>
                            <option value="11">Factura C</option>
                            <option value="1">Factura A</option>
                            <option value="6">Factura B</option>
                            <option value="99">Comprobante / Remito Interno (X)</option>
                            <option value="13">Nota de Crédito C</option>
                            <option value="3">Nota de Crédito A</option>
                            <option value="8">Nota de Crédito B</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <AppLabel size="sm">Cliente / Empresa</AppLabel>
                          <select
                            value={filterEmpresa}
                            onChange={(e) => setFilterEmpresa(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-2.5 h-[32px] text-[11px] font-semibold text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#468DFF] cursor-pointer truncate"
                          >
                            <option value="">Todos los Clientes...</option>
                            {empresas.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.razon_social}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <AppDatePicker
                            label="Fecha Desde"
                            value={filterFechaDesde}
                            onChange={(val) => {
                              const finalVal = typeof val === 'string' ? val : val?.target?.value || '';
                              setFilterFechaDesde(finalVal);
                            }}
                            mode="ymd"
                            placeholder="DD/MM/AAAA"
                            allowClear
                            className="h-[32px] py-1 px-2.5 text-[11px] font-semibold rounded-lg bg-white"
                          />
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
                    {sortedFacturas.length === 0 ? (
                      <AppEmptyState
                        title="No hay facturas registradas"
                        description="Emite una nueva factura individual o importa un lote desde Excel para comenzar."
                        actionButton={(
                          <AppButton
                            onClick={() => setCurrentView('form')}
                            variant="primary"
                            size="sm"
                            className="shadow-md shadow-[#468DFF]/10 flex items-center gap-1.5"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span>Emitir factura</span>
                          </AppButton>
                        )}
                      />
                    ) : (
                      <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                          <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                            <th className="px-5 py-3.5 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('tipo_comprobante')}>
                              <div className="flex items-center gap-1.5">
                                Comprobante
                                <AppSortIcon field="tipo_comprobante" sortField={sortField} sortOrder={sortOrder} />
                              </div>
                            </th>
                            <th className="px-5 py-3.5 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('fecha_emision')}>
                              <div className="flex items-center gap-1.5">
                                Fecha
                                <AppSortIcon field="fecha_emision" sortField={sortField} sortOrder={sortOrder} />
                              </div>
                            </th>
                            <th className="px-5 py-3.5 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('cliente')}>
                              <div className="flex items-center gap-1.5">
                                Cliente / Receptor
                                <AppSortIcon field="cliente" sortField={sortField} sortOrder={sortOrder} />
                              </div>
                            </th>
                            <th className="px-5 py-3.5 sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                              Descripción / Concepto
                            </th>
                            <th className="px-5 py-3.5 sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                              CAE / Fiscal
                            </th>
                            <th className="px-5 py-3.5 text-center sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                              Estado de Cobro
                            </th>
                            <th className="px-5 py-3.5 text-right cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-200" onClick={() => handleSort('total')}>
                              <div className="flex items-center justify-end gap-1.5">
                                Importe Total
                                <AppSortIcon field="total" sortField={sortField} sortOrder={sortOrder} />
                              </div>
                            </th>
                            <th className="px-5 py-3.5 text-right sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                          {sortedFacturas.map((f) => {
                            const { letra, desc } = getVoucherTypeDetails(f.tipo_comprobante);
                            const ptoVta = String(f.punto_venta || 1).padStart(5, '0');
                            const compNro = f.numero_comprobante ? String(f.numero_comprobante).padStart(8, '0') : '--------';

                            // Extraer descripción de ítem para vista rápida
                            let itemDesc = f.descripcion;
                            if (!itemDesc && f.items) {
                              try {
                                const parsed = typeof f.items === 'string' ? JSON.parse(f.items) : f.items;
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                  itemDesc = parsed[0]?.descripcion;
                                  if (parsed.length > 1) itemDesc += ` (+${parsed.length - 1} más)`;
                                }
                              } catch (e) {}
                            }
                            itemDesc = itemDesc || 'Servicios Profesionales';

                            return (
                              <tr 
                                key={f.id} 
                                onClick={() => setSelectedFacturaModal(f)}
                                className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                                title="Hacé clic para ver el detalle completo de este comprobante"
                              >
                                {/* Comprobante */}
                                <td className="px-5 py-3.5 font-semibold text-slate-900 font-mono">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-50 text-[#468DFF] border border-blue-100 group-hover:bg-[#468DFF] group-hover:text-white transition-colors">
                                      {letra}
                                    </span>
                                    <div>
                                      <span className="font-bold text-slate-900 block font-sans group-hover:text-[#468DFF] transition-colors">{desc}</span>
                                      <span className="text-[11px] text-slate-500 font-mono">
                                        {f.tipo_comprobante === 99 ? `INT-${compNro}` : `${ptoVta}-${compNro}`}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                {/* Fecha */}
                                <td className="px-5 py-3.5 font-semibold text-slate-600 whitespace-nowrap">
                                  {f.fecha_emision ? formatDate(f.fecha_emision) : '-'}
                                </td>

                                {/* Cliente */}
                                <td className="px-5 py-3.5 max-w-[180px] truncate">
                                  <span className="font-bold text-slate-900 block truncate">
                                    {f.receptor_razon_social || 'Consumidor Final'}
                                  </span>
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    CUIT/Doc: {f.receptor_doc_nro || '-'}
                                  </span>
                                </td>

                                {/* Descripción del Servicio / Concepto */}
                                <td className="px-5 py-3.5 max-w-[200px]">
                                  <span className="font-medium text-slate-800 block truncate" title={itemDesc}>
                                    {itemDesc}
                                  </span>
                                  {f.concepto === 2 && f.fecha_serv_desde && (
                                    <span className="text-[10px] text-slate-400 block font-mono">
                                      Período: {formatDate(f.fecha_serv_desde)} al {formatDate(f.fecha_serv_hasta)}
                                    </span>
                                  )}
                                </td>

                                {/* CAE / Fiscal */}
                                <td className="px-5 py-3.5">
                                  <div className="space-y-1">
                                    {f.tipo_comprobante === 99 ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#468DFF] border border-blue-200">
                                        🔵 Comprobante Interno
                                      </span>
                                    ) : (
                                      <>
                                        {renderStatusBadge(f.estado)}
                                        {f.cae && (
                                          <span className="text-[10px] font-mono text-slate-500 block">
                                            CAE: {f.cae}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>

                                {/* Estado de Cobro (Columna Dedicada e Interactiva) */}
                                <td className="px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                  {f.estado === 'autorizada' ? (
                                    <button
                                      type="button"
                                      disabled={updatingPagoId === f.id}
                                      onClick={() => {
                                        const currentStatus = getPagoStatus(f);
                                        const nextStatus = currentStatus === 'pagada' ? 'pendiente' : 'pagada';
                                        let currentObs = {};
                                        if (typeof f.observaciones_arca === 'object' && f.observaciones_arca !== null) {
                                          currentObs = f.observaciones_arca;
                                        } else if (typeof f.observaciones_arca === 'string') {
                                          try { currentObs = JSON.parse(f.observaciones_arca); } catch (e) {}
                                        }
                                        handleUpdatePago({
                                          factura_id: f.id,
                                          estado_pago: nextStatus,
                                          fecha_pago: nextStatus === 'pagada' ? (currentObs.fecha_pago || new Date().toISOString().split('T')[0]) : null,
                                          metodo_pago: currentObs.metodo_pago || 'transferencia',
                                          jurisdiccion: currentObs.jurisdiccion || 'CABA',
                                        });
                                      }}
                                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 mx-auto ${
                                        getPagoStatus(f) === 'pagada'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                          : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                      }`}
                                      title="Hacé clic para cambiar entre Cobrada y Pendiente"
                                    >
                                      {getPagoStatus(f) === 'pagada' ? (
                                        <>
                                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                          <span>Cobrada</span>
                                        </>
                                      ) : (
                                        <>
                                          <Clock className="h-3 w-3 text-amber-600" />
                                          <span>Pendiente</span>
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 text-[11px] italic">-</span>
                                  )}
                                </td>

                                {/* Total */}
                                <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                                  ${Number(f.imp_total || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>

                                {/* Acciones de tabla estándar */}
                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1.5 h-full">
                                    {f.estado === 'autorizada' && (
                                      <>
                                        <AppTooltip content="Visualizar PDF">
                                          <AppButton
                                            variant="document-table"
                                            size="icon"
                                            onClick={() => handleVerPdf(f)}
                                          >
                                            <FileText className="h-4.5 w-4.5" />
                                          </AppButton>
                                        </AppTooltip>

                                        <AppTooltip content="Descargar PDF">
                                          <AppButton
                                            variant="document-table"
                                            size="icon"
                                            onClick={() => handleDescargarPdf(f)}
                                          >
                                            <Download className="h-4.5 w-4.5" />
                                          </AppButton>
                                        </AppTooltip>

                                        <AppTooltip content="Imprimir factura">
                                          <AppButton
                                            variant="document-table"
                                            size="icon"
                                            onClick={() => handlePrintPdf(f)}
                                          >
                                            <Printer className="h-4.5 w-4.5" />
                                          </AppButton>
                                        </AppTooltip>

                                        <AppTooltip content="Enviar por correo o WhatsApp">
                                          <AppButton
                                            variant="document-table"
                                            size="icon"
                                            onClick={() => handleOpenSendModal(f)}
                                          >
                                            <Mail className="h-4.5 w-4.5" />
                                          </AppButton>
                                        </AppTooltip>
                                      </>
                                    )}

                                    {f.estado === 'error_conexion' && (
                                      <AppTooltip content="Consultar a ARCA si la factura fue autorizada">
                                        <AppButton
                                          variant="amber"
                                          size="xs"
                                          onClick={() => handleReconciliar(f.id)}
                                          disabled={isReconciling}
                                          className="flex items-center gap-1 font-bold"
                                        >
                                          <RefreshCw className="h-4 w-4" />
                                          <span>Verificar</span>
                                        </AppButton>
                                      </AppTooltip>
                                    )}

                                    {(f.estado === 'borrador' || f.estado === 'rechazada') && (
                                      <AppTooltip content="Emitir a ARCA">
                                        <AppButton
                                          variant="edit-table"
                                          size="icon"
                                          onClick={() => handleReintentar(f.id)}
                                        >
                                          <Send className="h-4.5 w-4.5" />
                                        </AppButton>
                                      </AppTooltip>
                                    )}

                                    {/* Botón Eliminar Comprobante */}
                                    <AppTooltip content={f.cae && f.tipo_comprobante !== 99 ? "Comprobante con CAE (Anular con Nota de Crédito)" : "Eliminar comprobante"}>
                                      <AppButton
                                        variant="delete-table"
                                        size="icon"
                                        onClick={() => {
                                          if (f.cae && f.tipo_comprobante !== 99) {
                                            globalToast.toast('Los comprobantes con CAE de ARCA no se pueden borrar por normativa fiscal. Para anularlo, emití una Nota de Crédito desde "+ Emitir factura".', 'warning');
                                            return;
                                          }
                                          setDeleteConfirm({
                                            show: true,
                                            facturaId: f.id,
                                            isInterno: f.tipo_comprobante === 99,
                                          });
                                        }}
                                      >
                                        <Trash2 className="h-4.5 w-4.5" />
                                      </AppButton>
                                    </AppTooltip>
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

      {/* Diálogo de Confirmación para Eliminar Factura */}
      <AppConfirmDialog
        open={deleteConfirm.show}
        onOpenChange={(open) => setDeleteConfirm(prev => ({ ...prev, show: open }))}
        title={deleteConfirm.isInterno ? "¿Eliminar Comprobante Interno?" : "¿Eliminar Comprobante?"}
        description={
          deleteConfirm.isInterno 
            ? "Esta acción eliminará el comprobante interno y su registro del sistema de forma permanente. No afectará a ARCA ya que es un comprobante administrativo no fiscal." 
            : "Esta acción eliminará este comprobante de la plataforma permanentemente."
        }
        type="destructive"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (deleteConfirm.facturaId) {
            handleDeleteFactura(deleteConfirm.facturaId);
          }
          setDeleteConfirm({ show: false, facturaId: null, isInterno: false });
        }}
      />

      {/* Diálogo Estándar de Envío por Email y WhatsApp */}
      <AppSendModal
        isOpen={isSendModalOpen && Boolean(sendTargetFactura)}
        onClose={() => setIsSendModalOpen(false)}
        title="Enviar Factura Electrónica (PDF)"
        subtitle={sendTargetFactura ? `${getVoucherTypeDetails(sendTargetFactura.tipo_comprobante).desc} — ${sendTargetFactura.receptor_razon_social || 'Cliente'}` : undefined}
        aiContext="Envío de Factura Electrónica ARCA y Comprobante Fiscal"
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

      {/* Modal de Detalle de Factura / Comprobante */}
      <FacturaDetalleModal
        factura={selectedFacturaModal}
        config={config}
        onClose={() => setSelectedFacturaModal(null)}
        onVerPdf={handleVerPdf}
        onDescargarPdf={handleDescargarPdf}
        onPrintPdf={handlePrintPdf}
        onOpenSendModal={handleOpenSendModal}
        onDeleteFactura={(id) => {
          if (selectedFacturaModal?.cae && selectedFacturaModal?.tipo_comprobante !== 99) {
            globalToast.toast('Los comprobantes con CAE de ARCA no se pueden borrar. Para anularlo emita una Nota de Crédito.', 'warning');
            return;
          }
          setDeleteConfirm({
            show: true,
            facturaId: id,
            isInterno: selectedFacturaModal?.tipo_comprobante === 99,
          });
        }}
        onReintentar={handleReintentar}
        onReconciliar={handleReconciliar}
        onUpdatePago={handleUpdatePago}
      />
    </div>
  );
}
