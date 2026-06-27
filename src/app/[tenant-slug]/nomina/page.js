// src/app/[tenant-slug]/nomina/page.js
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { supabase } from '@/lib/supabase';
import { formatDate, formatAsDateInput, convertToDbDate } from '@/lib/utils';
import * as XLSX from 'xlsx';
import DocumentUploadZone from '@/components/ui/DocumentUploadZone';
import {
  PlusCircle,
  Search,
  Building,
  Users,
  X,
  Check,
  Loader2,
  Trash2,
  Edit,
  ArrowLeft,
  Upload,
  Sliders,
  ChevronDown,
  ChevronUp,
  Download,
  AlertTriangle,
  FolderOpen,
  Calendar,
  Layers,
  HelpCircle,
  Menu,
  MapPin
} from 'lucide-react';

export default function NominaPage({ params }) {
  const tenantSlug = params['tenant-slug'];

  // View state: isFormOpen = true shows the inline form, false shows the list
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modal alert state
  const [modalAlert, setModalAlert] = useState({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });
  const closeAlert = () => setModalAlert({ show: false, title: '', message: '', onConfirm: null, confirmText: 'Confirmar' });

  // Tenant and profile
  const [profile, setProfile] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('user-profile');
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [tenant, setTenant] = useState(null);

  // Data lists
  const [empresas, setEmpresas] = useState([]);
  const [allEstablecimientos, setAllEstablecimientos] = useState([]);
  const [personalList, setPersonalList] = useState([]);
  const [legajoFiles, setLegajoFiles] = useState([]);

  // Toast notification
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const triggerToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  // Main list filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState('');
  const [filterAnio, setFilterAnio] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState('nombre_apellido');
  const [sortOrder, setSortOrder] = useState('asc');

  // Form Header (Cabecera) Fields
  const [editingId, setEditingId] = useState(null);
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [fechaCarga, setFechaCarga] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  // Load modality: 'excel' or 'manual'
  const [loadType, setLoadType] = useState('excel');

  // Modality A: Manual multiline rows
  const [manualRows, setManualRows] = useState([
    { id: 'temp-1', nombre_apellido: '', cuil: '', fecha_alta: '', area_sector: '', puesto: '' }
  ]);

  // Modality B: Excel source & parsed rows
  const [uploadType, setUploadType] = useState('local'); // 'local', 'drive', 'legajo'
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedLegajoPath, setSelectedLegajoPath] = useState('');
  const [loadingLegajoFile, setLoadingLegajoFile] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);

  useEffect(() => {
    if (tenantSlug) {
      loadInitialData();
    }
  }, [tenantSlug]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      let prof = profile;
      if (!prof) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (p) {
            prof = p;
            setProfile(p);
            sessionStorage.setItem('user-profile', JSON.stringify(p));
          }
        }
      }

      if (!prof) {
        window.location.href = '/login';
        return;
      }

      if (prof.role === 'cliente') {
        setIsReadOnlyView(true);
      }

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

      // Fetch companies (empresas)
      let empresasQuery = supabase.from('empresas').select('id, razon_social, cuit').eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        empresasQuery = empresasQuery.eq('id', prof.empresa_id);
      }
      const { data: emps, error: empErr } = await empresasQuery.order('razon_social');
      if (empErr) throw empErr;
      setEmpresas(emps || []);

      // Fetch establishments
      let estsQuery = supabase.from('establecimientos').select('id, empresa_id, denominacion, direccion').eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        estsQuery = estsQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: ests, error: estErr } = await estsQuery.order('denominacion');
      if (estErr) throw estErr;
      setAllEstablecimientos(ests || []);

      // Fetch Excel/CSV files from Legajo Técnico
      let legajoQuery = supabase.from('legajo_tecnico').select('id, documento_nombre, documento_url, empresa_id, fecha').eq('tenant_id', ten.id);
      if (prof.role === 'cliente') {
        legajoQuery = legajoQuery.eq('empresa_id', prof.empresa_id);
      }
      const { data: legajos, error: legErr } = await legajoQuery.order('fecha', { ascending: false });
      if (!legErr && legajos) {
        const excelLegajos = legajos.filter(l => {
          const name = (l.documento_nombre || '').toLowerCase();
          const url = (l.documento_url || '').toLowerCase();
          return name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') ||
                 url.endsWith('.xlsx') || url.endsWith('.xls') || url.endsWith('.csv');
        });
        setLegajoFiles(excelLegajos);
      }

      // Fetch Payroll list
      await fetchPersonalList(ten.id, prof);

      setLoading(false);
    } catch (err) {
      console.error('Error cargando datos iniciales:', err);
      triggerToast('Error al conectar con la base de datos.', 'error');
      setIsDevMode(true);
      loadMockData();
    }
  };

  const fetchPersonalList = async (tId, prof) => {
    let query = supabase
      .from('nomina_personal')
      .select(`
        *,
        empresa:empresas(razon_social),
        establecimiento:establecimientos(denominacion)
      `)
      .eq('tenant_id', tId);

    if (prof.role === 'cliente') {
      query = query.eq('empresa_id', prof.empresa_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    setPersonalList(data || []);
  };

  const loadMockData = () => {
    setProfile({ full_name: 'Profesional de SySO (Mock)', role: 'admin' });
    setTenant({ id: 'mock-tenant', name: 'Consultora de Prueba', plan_id: 'free' });
    setEmpresas([
      { id: '1', razon_social: 'Empresa Test S.A.', cuit: '30711122233' },
      { id: '2', razon_social: 'Logística Norte SRL', cuit: '33722233344' }
    ]);
    setAllEstablecimientos([
      { id: '11', empresa_id: '1', denominacion: 'Planta Industrial Wilde', direccion: 'Las Flores 450' },
      { id: '12', empresa_id: '1', denominacion: 'Oficinas Puerto Madero', direccion: 'Juana Manso 900' },
      { id: '21', empresa_id: '2', denominacion: 'Depósito Pacheco', direccion: 'Ruta 9 Km 35' }
    ]);
    setPersonalList([
      {
        id: 'p1',
        nombre_apellido: 'Juan Pérez',
        cuil: '20304445556',
        fecha_alta: '2024-01-15',
        area_sector: 'Producción',
        puesto: 'Operario Calificado',
        fecha_carga: '2026-06-20',
        empresa_id: '1',
        establecimiento_id: '11',
        empresa: { razon_social: 'Empresa Test S.A.' },
        establecimiento: { denominacion: 'Planta Industrial Wilde' }
      },
      {
        id: 'p2',
        nombre_apellido: 'María González',
        cuil: '27325556667',
        fecha_alta: '2023-11-01',
        area_sector: 'Administración',
        puesto: 'Analista de Cuentas',
        fecha_carga: '2026-06-21',
        empresa_id: '1',
        establecimiento_id: '12',
        empresa: { razon_social: 'Empresa Test S.A.' },
        establecimiento: { denominacion: 'Oficinas Puerto Madero' }
      }
    ]);
    setLoading(false);
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('user-profile');
    }
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleSort = (field) => {
    const order = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(order);
  };

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

  const sectionPerms = getSectionPermissions(profile, 'nomina');
  const canCreate = sectionPerms.cargar;
  const canEditar = sectionPerms.editar;
  const canEliminar = sectionPerms.eliminar;
  const isFormDisabled = (editingId ? !canEditar : !canCreate) || isReadOnlyView;
  const canEdit = !isFormDisabled; // Maintain compatibility
  const canDelete = canEliminar;

  const resetForm = () => {
    setEditingId(null);
    setEmpresaId(profile?.role === 'cliente' ? (profile.empresa_id || '') : '');
    setEstablecimientoId('');
    const today = new Date();
    setFechaCarga(`${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`);
    setManualRows([{ id: 'temp-1', nombre_apellido: '', cuil: '', fecha_alta: '', area_sector: '', puesto: '' }]);
    setPreviewRows([]);
    setSelectedFileName('');
    setSelectedLegajoPath('');
  };

  const handleOpenCreateForm = () => {
    setIsReadOnlyView(false);
    resetForm();
    setLoadType('excel');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item) => {
    setEditingId(item.id);
    setEmpresaId(item.empresa_id || '');
    setEstablecimientoId(item.establecimiento_id || '');
    
    let altaDate = '';
    if (item.fecha_alta) {
      const parts = item.fecha_alta.split('-');
      altaDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    let cargaDate = '';
    if (item.fecha_carga) {
      cargaDate = formatDate(item.fecha_carga);
    } else {
      const today = new Date();
      cargaDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    }

    setFechaCarga(cargaDate);
    setManualRows([
      {
        id: item.id,
        nombre_apellido: item.nombre_apellido || '',
        cuil: item.cuil || '',
        fecha_alta: altaDate,
        area_sector: item.area_sector || '',
        puesto: item.puesto || ''
      }
    ]);
    setLoadType('manual');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

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

  // MANUAL MULTILINE ROWS ACTIONS
  const handleAddManualRow = () => {
    const newId = 'temp-' + Date.now();
    setManualRows(prev => [
      ...prev,
      { id: newId, nombre_apellido: '', cuil: '', fecha_alta: '', area_sector: '', puesto: '' }
    ]);
  };

  const handleRemoveManualRow = (id) => {
    setManualRows(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateManualRow = (id, field, value) => {
    setManualRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleLocalFileChange = (file) => {
    if (!file) return;
    setSelectedFileName(file.name);
    parseExcelFile(file);
  };

  const parseExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        processExcelRows(rows);
      } catch (err) {
        console.error(err);
        triggerToast('Error al leer el archivo Excel.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processExcelRows = (rows) => {
    if (!rows || rows.length === 0) {
      triggerToast('La planilla Excel no contiene filas de datos.', 'error');
      return;
    }

    const parsed = rows.map((row, idx) => {
      const getVal = (possibleNames) => {
        for (const name of possibleNames) {
          const key = Object.keys(row).find(k => k.trim().toLowerCase() === name.toLowerCase());
          if (key !== undefined) return row[key];
        }
        return undefined;
      };

      const nombreVal = getVal(['Nombre y Apellido', 'nombre_apellido', 'nombre', 'apellido', 'empleado']);
      const cuilVal = getVal(['C.U.I.L.', 'cuil', 'cuit', 'cuil/cuit', 'documento']);
      const fechaVal = getVal(['Fecha de alta', 'fecha_alta', 'fecha alta', 'alta']);
      const areaVal = getVal(['Área / Sector', 'area_sector', 'area', 'sector']);
      const puestoVal = getVal(['Puesto', 'puesto', 'cargo']);

      const errors = [];
      if (!nombreVal) {
        errors.push('Nombre y Apellido es requerido.');
      }

      const cleanCuil = String(cuilVal || '').replace(/[^0-9]/g, '');
      if (cleanCuil.length !== 11) {
        errors.push(`CUIL inválido ("${cuilVal || ''}"). Debe tener 11 dígitos.`);
      }

      let parsedDate = null;
      if (fechaVal) {
        if (fechaVal instanceof Date) {
          parsedDate = fechaVal;
        } else {
          const dStr = String(fechaVal).trim();
          const parts = dStr.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            if (d.getDate() === day && d.getMonth() === month && d.getFullYear() === year) {
              parsedDate = d;
            }
          }
          if (!parsedDate) {
            const d = new Date(dStr);
            if (!isNaN(d.getTime())) {
              parsedDate = d;
            }
          }
        }
      }
      if (!parsedDate) {
        errors.push(`Fecha de alta inválida ("${fechaVal || ''}"). Formato esperado: DD/MM/YYYY.`);
      }

      return {
        rowNum: idx + 2, // 1-based + header
        nombre_apellido: nombreVal || '',
        cuil: cleanCuil,
        fecha_alta: parsedDate ? parsedDate.toISOString().split('T')[0] : null,
        fecha_alta_display: parsedDate ? `${String(parsedDate.getDate()).padStart(2, '0')}/${String(parsedDate.getMonth() + 1).padStart(2, '0')}/${parsedDate.getFullYear()}` : '',
        area_sector: areaVal || '',
        puesto: puestoVal || '',
        errors
      };
    });

    setPreviewRows(parsed);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      ['Nombre y Apellido', 'C.U.I.L.', 'Fecha de alta', 'Área / Sector', 'Puesto']
    ];
    headers.push(['Carlos Gómez', '20123456789', '01/06/2026', 'Operaciones', 'Supervisor']);
    headers.push(['Ana Rodríguez', '27987654321', '15/06/2026', 'Administración', 'Analista']);

    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Empleados');
    XLSX.writeFile(wb, 'plantilla-nomina.xlsx');
    triggerToast('Plantilla Excel descargada.');
  };

  const handleDriveImport = async (link) => {
    if (!link) {
      triggerToast('Ingresa un enlace de Google Drive.', 'error');
      return;
    }
    const res = await fetch('/api/download-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: link, tenantId: tenant.id })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al descargar de Drive.');

    const binaryString = window.atob(data.fileBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const workbook = XLSX.read(bytes.buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    processExcelRows(rows);
    setSelectedFileName('Plantilla de Drive importada');
    triggerToast('Planilla de Drive descargada y analizada.', 'success');
  };

  const handleLegajoSelect = async (path) => {
    setSelectedLegajoPath(path);
    if (!path) return;
    setLoadingLegajoFile(true);
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(path, 3600);
      if (error) throw error;

      const response = await fetch(data.signedUrl);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);
      processExcelRows(rows);
      triggerToast('Planilla del Legajo Técnico analizada.');
    } catch (err) {
      console.error(err);
      triggerToast('Error al descargar archivo del Legajo Técnico.', 'error');
    } finally {
      setLoadingLegajoFile(false);
    }
  };

  // SAVE MAIN FORM (Inline Form submit)
  const handleSaveForm = async (e) => {
    e.preventDefault();

    if (!empresaId) {
      triggerToast('Debe seleccionar la Razón Social / Cliente.', 'error');
      return;
    }
    if (!establecimientoId) {
      triggerToast('Debe seleccionar el Establecimiento.', 'error');
      return;
    }
    if (!fechaCarga || fechaCarga.length < 10) {
      triggerToast('Debe ingresar una Fecha de Carga válida.', 'error');
      return;
    }

    const dbFechaCarga = convertToDbDate(fechaCarga);

    setSaving(true);
    let payload = [];

    if (loadType === 'manual') {
      // Validate manual rows
      const invalidRows = [];
      const formattedRows = manualRows.map((row, index) => {
        const rowNum = index + 1;
        if (!row.nombre_apellido.trim()) {
          invalidRows.push(`Fila ${rowNum}: Nombre y Apellido es requerido.`);
        }
        const cleanCuil = row.cuil.replace(/[^0-9]/g, '');
        if (cleanCuil.length !== 11) {
          invalidRows.push(`Fila ${rowNum}: CUIL debe tener exactamente 11 números.`);
        }
        const dbAltaDate = convertToDbDate(row.fecha_alta);
        if (dbAltaDate.length < 10) {
          invalidRows.push(`Fila ${rowNum}: Fecha de alta incorrecta.`);
        }

        return {
          tenant_id: tenant.id,
          empresa_id: empresaId,
          establecimiento_id: establecimientoId,
          nombre_apellido: row.nombre_apellido.trim(),
          cuil: cleanCuil,
          fecha_alta: dbAltaDate,
          area_sector: row.area_sector?.trim() || null,
          puesto: row.puesto?.trim() || null,
          fecha_carga: dbFechaCarga
        };
      });

      if (invalidRows.length > 0) {
        triggerToast(invalidRows[0], 'error');
        setSaving(false);
        return;
      }
      payload = formattedRows;

    } else {
      // Excel Load Type
      if (previewRows.length === 0) {
        triggerToast('No has cargado ninguna planilla Excel.', 'error');
        setSaving(false);
        return;
      }
      const errRows = previewRows.filter(r => r.errors.length > 0);
      if (errRows.length > 0) {
        triggerToast(`Corrige los errores de la planilla (Fila ${errRows[0].rowNum}).`, 'error');
        setSaving(false);
        return;
      }

      payload = previewRows.map(r => ({
        tenant_id: tenant.id,
        empresa_id: empresaId,
        establecimiento_id: establecimientoId,
        nombre_apellido: r.nombre_apellido.trim(),
        cuil: r.cuil,
        fecha_alta: r.fecha_alta,
        area_sector: r.area_sector?.trim() || null,
        puesto: r.puesto?.trim() || null,
        fecha_carga: dbFechaCarga
      }));
    }

    // Helper to perform the actual saving logic
    const executeSave = async (insertPayload, updatePayloads) => {
      setSaving(true);
      try {
        if (isDevMode) {
          const targetEmp = empresas.find(em => em.id === empresaId);
          const targetEst = allEstablecimientos.find(es => es.id === establecimientoId);

          let updatedList = [...personalList];

          // Apply updates
          updatePayloads.forEach(up => {
            updatedList = updatedList.map(item => {
              if (item.id === up.id) {
                return {
                  ...item,
                  ...up.data,
                  empresa: { razon_social: targetEmp ? targetEmp.razon_social : '' },
                  establecimiento: { denominacion: targetEst ? targetEst.denominacion : '' }
                };
              }
              return item;
            });
          });

          // Apply inserts
          const mockInserts = insertPayload.map((p, idx) => ({
            id: 'mock-' + idx + '-' + Date.now(),
            ...p,
            empresa: { razon_social: targetEmp ? targetEmp.razon_social : '' },
            establecimiento: { denominacion: targetEst ? targetEst.denominacion : '' }
          }));

          setPersonalList([...mockInserts, ...updatedList]);
          
          if (editingId) {
            triggerToast('Personal actualizado con éxito (Desarrollo).');
          } else {
            triggerToast(`Se guardaron los datos con éxito (${insertPayload.length} nuevos, ${updatePayloads.length} actualizados) (Desarrollo).`);
          }
          setSaving(false);
          handleCloseForm();
          return;
        }

        // Supabase updates
        for (const up of updatePayloads) {
          const { error } = await supabase
            .from('nomina_personal')
            .update(up.data)
            .eq('id', up.id);
          if (error) throw error;
        }

        // Supabase inserts
        if (insertPayload.length > 0) {
          const { error } = await supabase
            .from('nomina_personal')
            .insert(insertPayload);
          if (error) throw error;
        }

        if (editingId) {
          triggerToast('Personal actualizado con éxito.');
        } else {
          triggerToast('Personal guardado con éxito.');
        }
        await fetchPersonalList(tenant.id, profile);
        handleCloseForm();
      } catch (err) {
        console.error(err);
        triggerToast('Error al persistir en la base de datos.', 'error');
      } finally {
        setSaving(false);
      }
    };

    // 1. Check for duplicates in the database/mock-state for the selected company and year of fecha_carga
    let existingRecords = [];
    try {
      const yearStart = `${dbFechaCarga.substring(0, 4)}-01-01`;
      const yearEnd = `${dbFechaCarga.substring(0, 4)}-12-31`;

      if (isDevMode) {
        const yearOfCarga = dbFechaCarga.substring(0, 4);
        existingRecords = personalList.filter(p => {
          return p.empresa_id === empresaId && p.fecha_carga && p.fecha_carga.substring(0, 4) === yearOfCarga;
        });
      } else {
        const { data, error } = await supabase
          .from('nomina_personal')
          .select('id, nombre_apellido, cuil, fecha_carga')
          .eq('empresa_id', empresaId)
          .gte('fecha_carga', yearStart)
          .lte('fecha_carga', yearEnd);
        if (error) throw error;
        existingRecords = data || [];
      }
    } catch (err) {
      console.error('Error verificando duplicados:', err);
      triggerToast('Error al verificar duplicados en la nómina.', 'error');
      setSaving(false);
      return;
    }

    const duplicates = [];
    const inserts = [];
    const updates = [];

    payload.forEach(item => {
      const duplicate = existingRecords.find(rec => {
        if (editingId && rec.id === editingId) return false;
        const sameCuil = rec.cuil && item.cuil && rec.cuil.replace(/[^0-9]/g, '') === item.cuil.replace(/[^0-9]/g, '');
        const sameName = rec.nombre_apellido && item.nombre_apellido && 
          rec.nombre_apellido.trim().toLowerCase() === item.nombre_apellido.trim().toLowerCase();
        return sameCuil || sameName;
      });

      if (duplicate) {
        duplicates.push({ item, duplicate });
        updates.push({
          id: duplicate.id,
          data: {
            nombre_apellido: item.nombre_apellido,
            cuil: item.cuil,
            fecha_alta: item.fecha_alta,
            area_sector: item.area_sector,
            puesto: item.puesto,
            fecha_carga: item.fecha_carga
          }
        });
      } else {
        inserts.push(item);
      }
    });

    if (duplicates.length > 0) {
      if (editingId) {
        // If editing and found a duplicate conflict
        triggerToast('El nombre o CUIL ingresado ya existe para esta Razón Social en el año seleccionado.', 'error');
        setSaving(false);
        return;
      } else {
        // Ask the user to overwrite
        setSaving(false);
        setModalAlert({
          show: true,
          title: 'Registros Duplicados Detectados',
          message: `Se encontraron ${duplicates.length} empleado(s) con el mismo nombre o CUIL registrado en esta Razón Social en el año seleccionado. ¿Deseas sobreescribir la información de los registros repetidos con los nuevos datos?`,
          confirmText: 'Sobreescribir',
          onConfirm: async () => {
            closeAlert();
            await executeSave(inserts, updates);
          }
        });
        return;
      }
    }

    // If no duplicates, execute save directly
    await executeSave(inserts, updates);
  };

  const handleDeleteClick = (id) => {
    if (!canDelete) {
      triggerToast('No tienes permisos para eliminar registros.', 'error');
      return;
    }
    setModalAlert({
      show: true,
      title: '¿Eliminar de la Nómina?',
      message: 'Esta acción eliminará de forma permanente el registro del empleado seleccionado de la nómina y no se podrá deshacer.',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        if (isDevMode) {
          setPersonalList(prev => prev.filter(p => p.id !== id));
          triggerToast('Registro eliminado con éxito (Desarrollo).');
          handleCloseForm();
          closeAlert();
          return;
        }

        try {
          const { error } = await supabase
            .from('nomina_personal')
            .delete()
            .eq('id', id);
          if (error) throw error;
          triggerToast('Registro eliminado de la nómina.');
          await fetchPersonalList(tenant.id, profile);
          handleCloseForm();
        } catch (err) {
          console.error(err);
          triggerToast('Error al eliminar el registro.', 'error');
        } finally {
          closeAlert();
        }
      }
    });
  };

  // Años únicos disponibles en la nómina para el filtro
  const uniqueYears = Array.from(
    new Set(
      personalList
        .map(p => {
          if (!p.fecha_carga) return null;
          return p.fecha_carga.substring(0, 4);
        })
        .filter(Boolean)
    )
  ).sort((a, b) => b.localeCompare(a));

  // FILTERED & SORTED PERSONAL LIST
  const filteredPersonal = personalList
    .filter(p => {
      const q = searchQuery.toLowerCase();
      const matchSearch = (p.nombre_apellido || '').toLowerCase().includes(q) ||
                          (p.cuil || '').includes(q) ||
                          (p.area_sector || '').toLowerCase().includes(q) ||
                          (p.puesto || '').toLowerCase().includes(q);
      
      const matchEmp = !filterEmpresa || p.empresa_id === filterEmpresa;
      const matchEst = !filterEstablecimiento || p.establecimiento_id === filterEstablecimiento;
      
      let matchAnio = true;
      if (filterAnio) {
        matchAnio = p.fecha_carga && p.fecha_carga.substring(0, 4) === filterAnio;
      }

      return matchSearch && matchEmp && matchEst && matchAnio;
    })
    .sort((a, b) => {
      let valA = a[sortField] || '';
      let valB = b[sortField] || '';

      if (sortField === 'empresa') {
        valA = a.empresa?.razon_social || '';
        valB = b.empresa?.razon_social || '';
      } else if (sortField === 'establecimiento') {
        valA = a.establecimiento?.denominacion || '';
        valB = b.establecimiento?.denominacion || '';
      }

      if (typeof valA === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB, undefined, { sensitivity: 'base' })
          : valB.localeCompare(valA, undefined, { sensitivity: 'base' });
      }
      return sortOrder === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

  return (
    <div className="flex h-screen bg-[#D9D9D9] min-h-0">
      <Sidebar
        tenantSlug={tenantSlug}
        profile={profile}
        currentSection="nomina"
        isSidebarCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
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
            <Users className="h-5 w-5 text-[#468DFF] shrink-0" />
            <h1 className="font-outfit text-base md:text-lg font-bold text-slate-900 truncate leading-none">
              Nómina de Personal
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
          <div className="flex-grow flex flex-col items-center justify-center py-20 gap-2.5">
            <Loader2 className="h-8 w-8 text-[#468DFF] animate-spin" />
            <span className="text-xs font-bold text-slate-400">Cargando personal...</span>
          </div>
        ) : (
          <div className="p-6 md:p-8 space-y-6 max-w-[95%] mx-auto w-full">
            
            {isFormOpen ? (
              
              /* REDESIGNED INLINE FORM VIEW */
              <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col animate-fade-in">
                
                {/* Form Header */}
                <div className="h-16 px-4 md:px-6 bg-slate-50 border-b border-slate-150 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExitForm}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 cursor-pointer"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="font-outfit text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {editingId ? 'Editar Personal' : 'Cargar Personal'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleExitForm}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Fields */}
              <form onSubmit={handleSaveForm} className="p-6 space-y-6">
                <fieldset disabled={isReadOnlyView || !canEdit} className="space-y-6">
                
                {/* Cabecera de Lote */}
                <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5 space-y-4">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building className="h-4 w-4 text-[#468DFF]" />
                    Cabecera de la Nómina (Filtro por Establecimiento y Razón Social)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Razón Social */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">
                        Cliente / Razón Social <span className="text-[#468DFF]">*</span>
                      </label>
                      <select
                        required
                        value={empresaId}
                        onChange={(e) => {
                          setEmpresaId(e.target.value);
                          setEstablecimientoId('');
                        }}
                        disabled={profile?.role === 'cliente' || editingId !== null}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white text-slate-700 transition-all cursor-pointer font-semibold disabled:opacity-80 disabled:text-slate-400"
                      >
                        <option value="">Selecciona un cliente</option>
                        {empresas.map(e => (
                          <option key={e.id} value={e.id}>{e.razon_social}</option>
                        ))}
                      </select>
                    </div>

                    {/* Establecimiento */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">
                        Establecimiento <span className="text-[#468DFF]">*</span>
                      </label>
                      <select
                        required
                        value={establecimientoId}
                        onChange={(e) => setEstablecimientoId(e.target.value)}
                        disabled={!empresaId || editingId !== null}
                        className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white text-slate-700 transition-all cursor-pointer font-semibold disabled:opacity-50 disabled:text-slate-400"
                      >
                        <option value="">Selecciona un establecimiento</option>
                        {allEstablecimientos.filter(est => est.empresa_id === empresaId).map(e => (
                          <option key={e.id} value={e.id}>{e.denominacion}</option>
                        ))}
                      </select>
                    </div>

                    {/* Fecha de Carga */}
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1.5">
                        Fecha de Carga <span className="text-[#468DFF]">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="DD/MM/YYYY"
                          maxLength={10}
                          required
                          value={fechaCarga}
                          onChange={(e) => setFechaCarga(formatAsDateInput(e.target.value))}
                          disabled={editingId !== null}
                          className="w-full border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-white text-slate-700 transition-all font-mono disabled:opacity-80 disabled:text-slate-400"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-[#468DFF] flex items-center">
                          <Calendar className="h-4 w-4" />
                          <input
                            type="date"
                            disabled={editingId !== null}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                const parts = val.split('-');
                                if (parts.length === 3) {
                                  setFechaCarga(`${parts[2]}/${parts[1]}/${parts[0]}`);
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Modality Tabs */}
                {!editingId && (
                  <div className="flex gap-2 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => setLoadType('excel')}
                      className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                        loadType === 'excel'
                          ? 'border-[#468DFF] text-[#468DFF]'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Cargar por Planilla Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoadType('manual')}
                      className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                        loadType === 'manual'
                          ? 'border-[#468DFF] text-[#468DFF]'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Carga Manual de Personal
                    </button>
                  </div>
                )}

                {/* Modality Content */}
                {editingId || loadType === 'manual' ? (
                  
                  /* A: MANUAL MULTILINE INPUT */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold text-slate-700">Empleados a Ingresar</h4>
                      {!editingId && (
                        <button
                          type="button"
                          onClick={handleAddManualRow}
                          className="bg-[#468DFF]/10 text-[#468DFF] hover:bg-[#468DFF]/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          + Agregar más
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {manualRows.map((row, idx) => (
                        <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 border border-slate-200 rounded-xl bg-slate-50/20">
                          <div className="md:col-span-3">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre y Apellido *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ej: Carlos Gómez"
                              value={row.nombre_apellido}
                              onChange={(e) => handleUpdateManualRow(row.id, 'nombre_apellido', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#468DFF] bg-white transition-all"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CUIL *</label>
                            <input
                              type="text"
                              required
                              maxLength={11}
                              placeholder="11 dígitos sin guiones"
                              value={row.cuil}
                              onChange={(e) => handleUpdateManualRow(row.id, 'cuil', e.target.value.replace(/[^0-9]/g, ''))}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono tracking-wider focus:outline-none focus:border-[#468DFF] bg-white transition-all"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fecha de alta *</label>
                            <input
                              type="text"
                              required
                              placeholder="DD/MM/YYYY"
                              value={row.fecha_alta}
                              onChange={(e) => handleUpdateManualRow(row.id, 'fecha_alta', formatAsDateInput(e.target.value))}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#468DFF] bg-white transition-all"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Área / Sector</label>
                            <input
                              type="text"
                              placeholder="Ej: Producción"
                              value={row.area_sector}
                              onChange={(e) => handleUpdateManualRow(row.id, 'area_sector', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#468DFF] bg-white transition-all"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Puesto</label>
                            <input
                              type="text"
                              placeholder="Ej: Supervisor"
                              value={row.puesto}
                              onChange={(e) => handleUpdateManualRow(row.id, 'puesto', e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#468DFF] bg-white transition-all"
                            />
                          </div>
                          <div className="md:col-span-1 text-right">
                            {!editingId && manualRows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveManualRow(row.id)}
                                className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Eliminar fila"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  
                  /* B: EXCEL LOAD PIPELINE */
                  <div className="space-y-4">
                    
                    {/* Template download */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-slate-700">Descarga la plantilla de Excel oficial</h4>
                        <p className="text-[10px] text-slate-400 font-semibold">Completa los empleados e impórtalos de forma masiva en este establecimiento.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-[#468DFF] hover:text-[#468DFF] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-slate-600 shrink-0"
                      >
                        <Download className="h-4 w-4" />
                        <span>Descargar Plantilla</span>
                      </button>
                    </div>

                    <DocumentUploadZone
                      label="Planilla de Personal"
                      file={null}
                      fileName={selectedFileName}
                      onFileChange={handleLocalFileChange}
                      onDriveImport={handleDriveImport}
                      disabled={isFormDisabled}
                      accept=".xlsx,.xls"
                      onToast={triggerToast}
                      uploadType={uploadType}
                      setUploadType={(newType) => {
                        setUploadType(newType);
                        setPreviewRows([]);
                        setSelectedFileName('');
                        setSelectedLegajoPath('');
                      }}
                      showTabs={true}
                      tabs={[
                        { id: 'local', name: 'Archivo Local' },
                        { id: 'drive', name: 'Enlace Drive' },
                        { id: 'legajo', name: 'Desde Legajo Técnico' }
                      ]}
                    >
                      {uploadType === 'legajo' && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-600 block mb-1">Elegir planilla desde el Legajo Técnico</label>
                          {legajoFiles.length === 0 ? (
                            <div className="border border-slate-150 rounded-2xl p-6 text-center text-xs font-bold text-slate-400 bg-slate-50/30 flex flex-col items-center justify-center gap-2">
                              <FolderOpen className="h-8 w-8 text-slate-300" />
                              <span>No hay planillas Excel en el Legajo Técnico de este tenant.</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <select
                                value={selectedLegajoPath}
                                onChange={(e) => handleLegajoSelect(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all cursor-pointer font-semibold"
                              >
                                <option value="">-- Elige un archivo --</option>
                                {legajoFiles.map(file => (
                                  <option key={file.id} value={file.documento_url}>
                                    {file.documento_nombre} (Fecha: {formatDate(file.fecha)})
                                  </option>
                                ))}
                              </select>
                              {loadingLegajoFile && (
                                <div className="flex items-center gap-2 text-[10px] font-bold text-[#468DFF] animate-pulse pl-1">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Descargando y procesando archivo...</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </DocumentUploadZone>

                    {/* Excel rows preview */}
                    {previewRows.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-700">Preview del Excel ({previewRows.length} empleados)</h4>
                          {previewRows.filter(r => r.errors.length > 0).length > 0 && (
                            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                              {previewRows.filter(r => r.errors.length > 0).length} errores detectados
                            </span>
                          )}
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[30vh] overflow-y-auto">
                          <table className="w-full text-left border-collapse text-[11px] min-w-[800px]">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-150 font-bold text-slate-400 uppercase select-none">
                                <th className="px-4 py-2 text-center w-12">Fila</th>
                                <th className="px-4 py-2">Nombre y Apellido</th>
                                <th className="px-4 py-2">CUIL</th>
                                <th className="px-4 py-2">Alta</th>
                                <th className="px-4 py-2">Área / Sector</th>
                                <th className="px-4 py-2">Puesto</th>
                                <th className="px-4 py-2 text-right">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                              {previewRows.map((row, idx) => (
                                <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${row.errors.length > 0 ? 'bg-red-50/20' : ''}`}>
                                  <td className="px-4 py-2 text-center text-slate-400 font-bold">#{row.rowNum}</td>
                                  <td className="px-4 py-2">
                                    <span className={row.nombre_apellido ? 'text-slate-700' : 'text-red-500 font-bold'}>{row.nombre_apellido || '(Vacio)'}</span>
                                  </td>
                                  <td className="px-4 py-2 font-mono">
                                    <span className={row.cuil.length === 11 ? 'text-slate-700' : 'text-red-500 font-bold'}>{row.cuil || '(Vacio)'}</span>
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className={row.fecha_alta ? 'text-slate-700' : 'text-red-500 font-bold'}>{row.fecha_alta_display || '(Inválida)'}</span>
                                  </td>
                                  <td className="px-4 py-2 text-slate-400">{row.area_sector}</td>
                                  <td className="px-4 py-2 text-slate-400">{row.puesto}</td>
                                  <td className="px-4 py-2 text-right">
                                    {row.errors.length === 0 ? (
                                      <span className="text-green-600 flex items-center justify-end gap-1 font-bold">
                                        <Check className="h-3.5 w-3.5" /> Ok
                                      </span>
                                    ) : (
                                      <span className="text-red-500 flex items-center justify-end gap-1 font-bold hover:underline cursor-help group relative">
                                        <AlertTriangle className="h-3.5 w-3.5" /> Errores
                                        <div className="absolute right-0 bottom-6 bg-red-600 text-white rounded-lg p-2 shadow-xl text-[10px] w-64 max-w-xs text-left hidden group-hover:block z-50 leading-relaxed font-semibold">
                                          <ul className="list-disc list-inside">
                                            {row.errors.map((e, eIdx) => <li key={eIdx}>{e}</li>)}
                                          </ul>
                                        </div>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                )}

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
                            disabled={saving || (loadType === 'excel' && previewRows.length === 0) || (loadType === 'excel' && previewRows.filter(r => r.errors.length > 0).length > 0)}
                            className="px-5 py-2.5 bg-[#468DFF] hover:bg-[#0511F2] text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-[#468DFF]/10 disabled:opacity-50"
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
                      </>
                    )}
                  </div>
                </div>

              </form>
            </div>

          ) : (
            
            /* MAIN LIST VIEW */
            <>
              {/* Panel de Filtros y Búsqueda */}
              <div className="bg-white rounded-2xl border border-slate-150 p-3 shadow-sm space-y-3 shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="hidden md:block flex-1"></div>

                  <div className="flex flex-col md:flex-row md:items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-72">
                      <span className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none">
                        <Search className="h-3.5 w-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Buscar por nombre, CUIL, puesto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#468DFF] bg-slate-50/50 transition-all text-slate-700 placeholder-slate-400 font-semibold"
                      />
                    </div>
                    
                    {canCreate && (
                      <button
                        onClick={handleOpenCreateForm}
                        className="px-3.5 py-1.5 bg-[#468DFF] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-[#0511F2] transition-all cursor-pointer shadow-md shadow-[#468DFF]/10 shrink-0 w-full md:w-auto"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Cargar Personal
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
                    {(filterEmpresa || filterEstablecimiento || filterAnio) && (
                      <button
                        onClick={() => {
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

                  {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1 animate-fade-in">
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
                          <option value="">Todos los clientes</option>
                          {empresas.map(e => (
                            <option key={e.id} value={e.id}>{e.razon_social}</option>
                          ))}
                        </select>
                      </div>

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
                          {allEstablecimientos.filter(est => est.empresa_id === filterEmpresa).map(e => (
                            <option key={e.id} value={e.id}>{e.denominacion}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Filtrar por Año</label>
                        <select
                          value={filterAnio}
                          onChange={(e) => setFilterAnio(e.target.value)}
                          className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none focus:border-[#468DFF] text-xs w-full cursor-pointer font-semibold"
                        >
                          <option value="">Todos los años</option>
                          {uniqueYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Listado / Tabla */}
              <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden flex flex-col" style={{ height: showFilters ? 'calc(100vh - 310px)' : 'calc(100vh - 240px)' }}>
                {filteredPersonal.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center px-4 bg-slate-50/10 h-full">
                    <Users className="h-10 w-10 text-slate-350 mb-2 shrink-0" />
                    <p className="font-outfit text-sm text-slate-700 font-bold">No hay empleados registrados</p>
                    <p className="text-[11px] text-slate-400 font-normal mt-1">Registra un nuevo empleado para comenzar.</p>
                    {canCreate && (
                      <button
                        type="button"
                        onClick={handleOpenCreateForm}
                        className="mt-3 text-xs text-[#468DFF] hover:underline font-bold"
                      >
                        + Registrar el primero
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-auto flex-grow">
                    <table className="w-full text-left border-collapse min-w-[850px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
                          <th onClick={() => handleSort('empresa')} className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-150">
                            <div className="flex items-center gap-1">
                              Cliente / Establecimiento
                              {sortField === 'empresa' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th onClick={() => handleSort('nombre_apellido')} className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-150">
                            <div className="flex items-center gap-1">
                              Nombre y Apellido
                              {sortField === 'nombre_apellido' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-150">CUIL</th>
                          <th className="px-6 py-4 sticky top-0 z-10 bg-slate-50 border-b border-slate-150">Área / Puesto</th>
                          <th onClick={() => handleSort('fecha_alta')} className="px-6 py-4 cursor-pointer hover:text-slate-700 sticky top-0 z-10 bg-slate-50 border-b border-slate-150">
                            <div className="flex items-center gap-1">
                              Fechas
                              {sortField === 'fecha_alta' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                            </div>
                          </th>
                          <th className="px-6 py-4 text-right sticky top-0 z-10 bg-slate-50 border-b border-slate-150">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-normal text-slate-700">
                        {filteredPersonal.map((item) => (
                          <tr 
                            key={item.id} 
                            onClick={() => { setIsReadOnlyView(true); handleOpenEditForm(item); }}
                            className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4 font-semibold text-slate-900">
                              <span className="block">{item.empresa?.razon_social || '-'}</span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-normal">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {item.establecimiento?.denominacion || 'General / Sin Asignar'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-[#468DFF]">{item.nombre_apellido}</td>
                            <td className="px-6 py-4 font-mono tracking-wider text-slate-600">{item.cuil}</td>
                            <td className="px-6 py-4 text-slate-600 font-medium">
                              <span className="block">{item.area_sector || '-'}</span>
                              {item.puesto && <span className="text-[10px] text-slate-400 block font-normal mt-0.5">{item.puesto}</span>}
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-medium">
                              <span className="block">Alta: {formatDate(item.fecha_alta)}</span>
                              <span className="text-[10px] text-slate-400 block font-normal mt-0.5">Carga: {formatDate(item.fecha_carga)}</span>
                            </td>
                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {canEditar && (
                                  <button
                                    onClick={() => { setIsReadOnlyView(false); handleOpenEditForm(item); }}
                                    className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer bg-amber-50"
                                    title="Editar empleado"
                                  >
                                    <Edit className="h-4.5 w-4.5" />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteClick(item.id)}
                                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer bg-red-50"
                                    title="Eliminar empleado"
                                  >
                                    <Trash2 className="h-4.5 w-4.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
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
