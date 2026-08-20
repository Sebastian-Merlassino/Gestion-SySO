// src/app/admin/page.js
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Search, 
  Filter, 
  RefreshCw, 
  Shield, 
  Gift, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Settings,
  Calendar,
  Percent,
  Tag,
  X
} from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

const MONTHS = [
  { value: 'all', label: 'Todo el año' },
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [data, setData] = useState({
    kpis: {
      totalTenants: 0,
      activeTenants: 0,
      totalUsers: 0,
      totalEmpresasClientes: 0,
      mrrEstimate: 0,
      monthlyRevenue: 0,
      totalApprovedPayments: 0,
      plansCount: { free: 0, basic_5: 0, standard_25: 0, libre: 0 },
    },
    tenants: [],
    payments: [],
    profiles: [],
  });

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'tenants' | 'payments' | 'pricing'
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filtros de fecha (Año y Mes)
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');

  // Modal de Gestión de Tenant
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingTenant, setSavingTenant] = useState(false);
  const [modalFeedback, setModalFeedback] = useState(null);

  // Estado para Gestión de Precios Globales (Tab 4)
  const [pricingPlans, setPricingPlans] = useState([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [priceForm, setPriceForm] = useState({});
  const [pricingFeedback, setPricingFeedback] = useState(null);
  const [confirmPriceModal, setConfirmPriceModal] = useState(null);
  const [executingPriceUpdate, setExecutingPriceUpdate] = useState(false);

  // Carga de datos de métricas
  const fetchMetrics = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const headers = {};
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.access_token) {
        headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
      }

      const res = await fetch('/api/admin/metrics', { headers });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Error al cargar métricas de SuperAdmin.');
      }

      setData(json);
    } catch (err) {
      console.error('[Admin Page Fetch Error]:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Carga de precios y planes dinámicos
  const fetchPricingPlans = async () => {
    setLoadingPricing(true);
    try {
      const headers = {};
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.access_token) {
        headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
      }

      const res = await fetch('/api/admin/prices', { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al cargar configuración de precios.');

      setPricingPlans(json.plans || []);

      // Inicializar form de precios si está vacío
      setPriceForm((prev) => {
        const nextForm = { ...prev };
        (json.plans || []).forEach((p) => {
          if (!nextForm[p.id]) {
            nextForm[p.id] = {
              newPrice: String(p.currentPrice),
              updateCheckouts: true,
              updateMP: false,
            };
          } else {
            // Mantener inputs del usuario si ya escribió algo
            nextForm[p.id] = {
              ...nextForm[p.id],
              currentPrice: p.currentPrice,
            };
          }
        });
        return nextForm;
      });
    } catch (err) {
      console.error('[Pricing Fetch Error]:', err);
    } finally {
      setLoadingPricing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchPricingPlans();
  }, []);

  // Extraer lista dinámica de años con datos
  const availableYears = useMemo(() => {
    const yearsSet = new Set([currentYear]);
    [...(data.payments || []), ...(data.tenants || []), ...(data.profiles || [])].forEach((item) => {
      if (item.created_at) {
        const y = new Date(item.created_at).getFullYear();
        if (!isNaN(y) && y >= 2020) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [data, currentYear]);

  // Helper para verificar si una fecha cae en el año/mes seleccionado
  const matchesPeriod = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const yMatch = selectedYear === 'all' || d.getFullYear() === Number(selectedYear);
    const mMatch = selectedMonth === 'all' || (d.getMonth() + 1) === Number(selectedMonth);
    return yMatch && mMatch;
  };

  // Métricas agregadas por período seleccionado
  const periodData = useMemo(() => {
    const isFiltered = selectedYear !== 'all' || selectedMonth !== 'all';
    
    // Pagos filtrados
    const paymentsInPeriod = (data.payments || []).filter(p => matchesPeriod(p.created_at));
    const approvedPayments = paymentsInPeriod.filter(p => p.status === 'approved');
    const revenueInPeriod = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Nuevas organizaciones creadas en el período
    const newTenantsInPeriod = (data.tenants || []).filter(t => matchesPeriod(t.created_at));

    // Nuevos usuarios creados en el período
    const newUsersInPeriod = (data.profiles || []).filter(u => matchesPeriod(u.created_at));

    // Texto descriptivo del período
    let periodLabel = 'Histórico Total';
    if (selectedYear !== 'all' && selectedMonth !== 'all') {
      const mName = MONTHS.find(m => m.value === String(selectedMonth))?.label || '';
      periodLabel = `${mName} ${selectedYear}`;
    } else if (selectedYear !== 'all') {
      periodLabel = `Año ${selectedYear}`;
    } else if (selectedMonth !== 'all') {
      const mName = MONTHS.find(m => m.value === String(selectedMonth))?.label || '';
      periodLabel = `${mName} (Todos los años)`;
    }

    return {
      isFiltered,
      periodLabel,
      paymentsInPeriod,
      approvedPaymentsCount: approvedPayments.length,
      revenueInPeriod,
      newTenantsCount: newTenantsInPeriod.length,
      newUsersCount: newUsersInPeriod.length,
    };
  }, [data, selectedYear, selectedMonth]);

  // Filtrado de tenants
  const filteredTenants = useMemo(() => {
    return (data.tenants || []).filter((t) => {
      const matchesSearch = 
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.owner_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.owner_name?.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesPlan = true;
      if (planFilter !== 'all') {
        if (planFilter === 'exempt') {
          matchesPlan = Boolean(t.is_exempt);
        } else if (planFilter === 'gift') {
          matchesPlan = Boolean(t.gift_plan_id && t.gift_ends_at && new Date(t.gift_ends_at) > new Date());
        } else {
          matchesPlan = !t.is_exempt && (t.plan_id === planFilter || (!t.plan_id && planFilter === 'free'));
        }
      }

      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesDate = matchesPeriod(t.created_at);

      return matchesSearch && matchesPlan && matchesStatus && matchesDate;
    });
  }, [data.tenants, searchQuery, planFilter, statusFilter, selectedYear, selectedMonth]);

  // Manejador para abrir modal de edición de tenant
  const handleOpenEditModal = (tenant) => {
    setSelectedTenant({
      ...tenant,
      edit_gift_plan: tenant.gift_plan_id || '',
      edit_gift_days: 30,
      edit_is_exempt: Boolean(tenant.is_exempt),
      edit_status: tenant.status || 'active',
      edit_discount_percentage: tenant.discount_percentage || 0,
      edit_discount_days: 30,
      edit_sync_mp: Boolean(tenant.preapproval_id),
    });
    setModalFeedback(null);
    setIsModalOpen(true);
  };

  // Guardar cambios del tenant en la API
  const handleSaveTenantChanges = async (e) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setSavingTenant(true);
    setModalFeedback(null);

    try {
      let giftEndsAt = selectedTenant.gift_ends_at;

      if (selectedTenant.edit_gift_plan) {
        const days = Number(selectedTenant.edit_gift_days) || 30;
        giftEndsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      } else {
        giftEndsAt = null;
      }

      let discountEndsAt = selectedTenant.discount_ends_at;
      const discountPct = Number(selectedTenant.edit_discount_percentage) || 0;
      if (discountPct > 0) {
        const dDays = Number(selectedTenant.edit_discount_days) || 30;
        discountEndsAt = new Date(Date.now() + dDays * 24 * 60 * 60 * 1000).toISOString();
      } else {
        discountEndsAt = null;
      }

      const payload = {
        is_exempt: selectedTenant.edit_is_exempt,
        status: selectedTenant.edit_status,
        gift_plan_id: selectedTenant.edit_gift_plan || null,
        gift_ends_at: giftEndsAt,
        discount_percentage: discountPct,
        discount_ends_at: discountEndsAt,
        sync_mp_subscription: Boolean(selectedTenant.edit_sync_mp),
      };

      const headers = { 'Content-Type': 'application/json' };
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.access_token) {
        headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
      }

      const res = await fetch(`/api/admin/tenants/${selectedTenant.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();

      if (!res.ok) {
        throw new Error(resJson.error || 'Error al actualizar el tenant.');
      }

      setModalFeedback({ type: 'success', text: 'Cambios aplicados exitosamente.' });
      setTimeout(() => {
        setIsModalOpen(false);
        fetchMetrics(true);
      }, 1000);
    } catch (err) {
      setModalFeedback({ type: 'error', text: err.message });
    } finally {
      setSavingTenant(false);
    }
  };

  // Ejecutar actualización masiva de precio de un plan
  const handleExecutePriceUpdate = async () => {
    if (!confirmPriceModal) return;
    setExecutingPriceUpdate(true);
    setPricingFeedback(null);

    try {
      const headers = { 'Content-Type': 'application/json' };
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.access_token) {
        headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
      }

      const res = await fetch('/api/admin/prices', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          planId: confirmPriceModal.planId,
          newPrice: Number(confirmPriceModal.newPrice),
          updateNewCheckouts: confirmPriceModal.updateCheckouts,
          updateExistingMercadoPago: confirmPriceModal.updateMP,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al ejecutar actualización de precios.');

      setPricingFeedback({
        type: 'success',
        message: json.message,
        results: json.results,
      });

      setConfirmPriceModal(null);
      await Promise.all([fetchPricingPlans(), fetchMetrics(true)]);
    } catch (err) {
      setPricingFeedback({
        type: 'error',
        message: err.message,
      });
    } finally {
      setExecutingPriceUpdate(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-center max-w-xl mx-auto my-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-red-900 dark:text-red-300">Acceso Restringido o Error</h2>
        <p className="text-sm text-red-700 dark:text-red-400 mt-2 mb-6">{error}</p>
        <button
          onClick={() => fetchMetrics()}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-all"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { kpis } = data;
  const paidTenantsCount = (kpis.plansCount.basic_5 || 0) + (kpis.plansCount.standard_25 || 0) + (kpis.plansCount.libre || 0);
  const conversionRate = kpis.totalTenants > 0 ? ((paidTenantsCount / kpis.totalTenants) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-8">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Panel de Control Global
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitoreo en tiempo real de organizaciones, planes, ingresos y usuarios del SaaS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchMetrics(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
            <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* Selector de Período (Año y Mes) & Presets */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Filtro de Período
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{periodData.periodLabel}</span>
              {periodData.isFiltered && (
                <button
                  onClick={() => { setSelectedYear('all'); setSelectedMonth('all'); }}
                  className="text-xs font-normal text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline cursor-pointer"
                >
                  (Ver Todo)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dropdowns y Presets */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Presets Rápidos */}
          <div className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl gap-1">
            <button
              onClick={() => { setSelectedYear(String(currentYear)); setSelectedMonth(String(currentMonth)); }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                selectedYear === String(currentYear) && selectedMonth === String(currentMonth)
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => { setSelectedYear(String(currentYear)); setSelectedMonth('all'); }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                selectedYear === String(currentYear) && selectedMonth === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Año Actual
            </button>
            <button
              onClick={() => { setSelectedYear('all'); setSelectedMonth('all'); }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                selectedYear === 'all' && selectedMonth === 'all'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Histórico
            </button>
          </div>

          {/* Selector de Mes */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            {MONTHS.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Selector de Año */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Todos los años</option>
            {availableYears.map(y => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* KPI 1: Cobros Mercado Pago del Período */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {periodData.isFiltered ? `Cobros MP (${periodData.periodLabel})` : 'Cobros del Mes (MP)'}
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              ${(periodData.isFiltered ? periodData.revenueInPeriod : kpis.monthlyRevenue).toLocaleString('es-AR')}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {periodData.isFiltered ? periodData.approvedPaymentsCount : kpis.totalApprovedPayments} transacciones aprobadas
          </p>
        </div>

        {/* KPI 2: MRR Estimado Recurrente */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              MRR Recurrente
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              ${kpis.mrrEstimate.toLocaleString('es-AR')}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">/mes</span>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {paidTenantsCount} suscripciones activas
          </p>
        </div>

        {/* KPI 3: Organizaciones / Nuevas en el período */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {periodData.isFiltered ? `Nuevas Consultoras (${periodData.periodLabel})` : 'Organizaciones'}
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {periodData.isFiltered ? periodData.newTenantsCount : kpis.totalTenants}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              {periodData.isFiltered ? `${kpis.totalTenants} total histórico` : `${kpis.activeTenants} activas`}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {kpis.totalEmpresasClientes} clientes gestionados en total
          </p>
        </div>

        {/* KPI 4: Usuarios Registrados */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {periodData.isFiltered ? `Nuevos Usuarios (${periodData.periodLabel})` : 'Usuarios Totales'}
            </span>
            <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {periodData.isFiltered ? periodData.newUsersCount : kpis.totalUsers}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              {periodData.isFiltered ? `${kpis.totalUsers} total acumulado` : `${conversionRate}% conversión`}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Admins, miembros y clientes
          </p>
        </div>

      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-slate-200 dark:border-slate-800 gap-1 sm:gap-6 pb-px scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-2 sm:px-0 text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Visión General y Planes
        </button>

        <button
          onClick={() => setActiveTab('tenants')}
          className={`pb-3 px-2 sm:px-0 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'tenants'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <span>Organizaciones (Tenants)</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {data.tenants.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-2 sm:px-0 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'payments'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <span>Historial Mercado Pago</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {data.payments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`pb-3 px-2 sm:px-0 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
            activeTab === 'pricing'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Gestión de Precios</span>
        </button>
      </div>

      {/* TAB 1: Visión General y Planes */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Distribución de Planes */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Distribución de Planes Comerciales
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Desglose de organizaciones según su plan actual contratado o asignado.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { id: 'free', name: 'Plan Gratis', count: kpis.plansCount.free || 0, color: 'bg-slate-500', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
                { id: 'basic_5', name: 'Plan Básico (Hasta 5 Clientes)', count: kpis.plansCount.basic_5 || 0, color: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
                { id: 'standard_25', name: 'Plan Estándar (Hasta 25 Clientes)', count: kpis.plansCount.standard_25 || 0, color: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
                { id: 'libre', name: 'Plan Full (Comercial / Suscripto)', count: kpis.plansCount.libre || 0, color: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
                { id: 'gift', name: 'Regalos / Bonificaciones Activas', count: kpis.plansCount.gift || 0, color: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
                { id: 'exempt', name: 'Cuentas Exentas (Demos / Plan Owner)', count: kpis.plansCount.exempt || 0, color: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
              ].map((plan) => {
                const percentage = kpis.totalTenants > 0 ? ((plan.count / kpis.totalTenants) * 100).toFixed(1) : 0;
                return (
                  <div key={plan.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {plan.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${plan.badge}`}>
                          {plan.count} empresas
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-12 text-right">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${plan.color} transition-all duration-500 rounded-full`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SaaS Health & Quick Actions */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Observabilidad y Salud
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Estado de las integraciones activas.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Sentry Error Tracker</p>
                    <p className="text-[11px] text-slate-500">Captura de bugs y replay</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Activo
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">PostHog Analytics</p>
                    <p className="text-[11px] text-slate-500">Métricas y grabaciones</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Activo
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Mercado Pago Webhooks</p>
                    <p className="text-[11px] text-slate-500">Acreditación automática</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Activo
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: Organizaciones (Tenants) */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          {/* Controls: Search and Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por empresa, slug o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todos los Planes</option>
                <option value="free">Plan Gratis</option>
                <option value="basic_5">Plan Básico</option>
                <option value="standard_25">Plan Estándar</option>
                <option value="libre">Plan Full (Comercial)</option>
                <option value="gift">Regalos / Bonificaciones</option>
                <option value="exempt">Cuentas Exentas (Demos)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Todos los Estados</option>
                <option value="active">Solo Activas</option>
                <option value="suspended">Suspendidas</option>
              </select>
            </div>
          </div>

          {/* Tenants Table */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Organización</th>
                    <th className="px-4 py-3.5">Dueño / Admin</th>
                    <th className="px-4 py-3.5">Plan Activo</th>
                    <th className="px-4 py-3.5">Vencimiento / Cortesía</th>
                    <th className="px-4 py-3.5 text-center">Usuarios</th>
                    <th className="px-4 py-3.5 text-center">Estado</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        No se encontraron organizaciones con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((t) => {
                      const effectivePlan = t.effective_plan || (t.is_exempt ? 'libre' : (t.plan_id || 'free'));
                      const hasGift = t.gift_plan_id && (!t.gift_ends_at || new Date(t.gift_ends_at) > new Date());

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                          {/* Tenant Info */}
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {t.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              /{t.slug}
                            </div>
                          </td>

                          {/* Owner info */}
                          <td className="px-4 py-3.5">
                            <div className="text-slate-900 dark:text-slate-200 font-medium">
                              {t.owner_name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {t.owner_email}
                            </div>
                          </td>

                          {/* Plan Badge */}
                          <td className="px-4 py-3.5">
                            {t.is_exempt ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <Sparkles className="w-3 h-3" />
                                Libre / Exento
                              </span>
                            ) : hasGift ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <Gift className="w-3 h-3" />
                                Cortesía ({t.gift_plan_id})
                              </span>
                            ) : effectivePlan === 'libre' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Plan Full
                              </span>
                            ) : effectivePlan === 'standard_25' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Plan 35000
                              </span>
                            ) : effectivePlan === 'basic_5' ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                Plan 25000
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                Gratis
                              </span>
                            )}

                            {/* Descuento Comercial Activo */}
                            {t.discount_percentage > 0 && t.discount_ends_at && new Date(t.discount_ends_at) > new Date() && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  <Percent className="w-2.5 h-2.5" />
                                  {t.discount_percentage}% OFF
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Vencimiento / Regalo */}
                          <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                            {t.is_exempt ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Ilimitado</span>
                            ) : hasGift ? (
                              <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium">
                                <Gift className="w-3.5 h-3.5" />
                                <span>Regalo ({t.gift_plan_id}) hasta {formatDate(t.gift_ends_at)}</span>
                              </div>
                            ) : t.plan_ends_at ? (
                              <div>Vence: {formatDate(t.plan_ends_at)}</div>
                            ) : (
                              <span className="text-slate-400">Sin vencimiento</span>
                            )}
                          </td>

                          {/* Users Count */}
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {t.users_count || 1}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 text-center">
                            {t.status === 'active' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Activa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                Suspendida
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleOpenEditModal(t)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-xs"
                            >
                              <Settings className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Gestionar</span>
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

      {/* TAB 3: Historial Mercado Pago */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                Mostrando transacciones de: <span className="font-bold text-indigo-600 dark:text-indigo-400">{periodData.periodLabel}</span>
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
              <span>Aprobados: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{periodData.approvedPaymentsCount}</strong></span>
              <span>Total período: <strong className="text-slate-900 dark:text-white font-bold">${periodData.revenueInPeriod.toLocaleString('es-AR')}</strong></span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">ID Transacción</th>
                    <th className="px-4 py-3.5">Organización</th>
                    <th className="px-4 py-3.5">Fecha</th>
                    <th className="px-4 py-3.5">Monto</th>
                    <th className="px-4 py-3.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {periodData.paymentsInPeriod.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No se registraron transacciones de Mercado Pago en {periodData.periodLabel}.
                      </td>
                    </tr>
                  ) : (
                    periodData.paymentsInPeriod.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {p.payment_id}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-white">
                          {p.tenant_name}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500">
                          {new Date(p.created_at).toLocaleString('es-AR')}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                          ${Number(p.amount || 0).toLocaleString('es-AR')}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {p.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Aprobado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                              <XCircle className="w-3.5 h-3.5" />
                              {p.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Gestión de Precios Globales */}
      {activeTab === 'pricing' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Header informativo del Tab */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-500" />
                <span>Gestor de Precios Comerciales y Débitos de Mercado Pago</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Modifica las tarifas base del SaaS para nuevas contrataciones o actualiza masivamente el monto de las suscripciones automáticas de Mercado Pago de los clientes ya suscriptos.
              </p>
            </div>

            <button
              onClick={fetchPricingPlans}
              disabled={loadingPricing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPricing ? 'animate-spin text-indigo-500' : ''}`} />
              <span>{loadingPricing ? 'Cargando...' : 'Recargar Precios'}</span>
            </button>
          </div>

          {/* Feedback / Reporte de actualización */}
          {pricingFeedback && (
            <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
              pricingFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {pricingFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                  <span>{pricingFeedback.message}</span>
                </div>
                <button
                  onClick={() => setPricingFeedback(null)}
                  className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {pricingFeedback.results && pricingFeedback.results.mpAttemptedCount > 0 && (
                <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 space-y-1">
                  <p className="font-semibold">
                    Reporte de Mercado Pago: {pricingFeedback.results.mpSuccessCount} exitosos de {pricingFeedback.results.mpAttemptedCount} suscriptores procesados.
                  </p>
                  {pricingFeedback.results.details && pricingFeedback.results.details.length > 0 && (
                    <div className="max-h-32 overflow-y-auto space-y-1 mt-1 font-mono text-[11px]">
                      {pricingFeedback.results.details.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className={d.status === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                            {d.status === 'success' ? '✓' : '✗'} {d.tenantName}: {d.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tarjetas de Planes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => {
              const form = priceForm[plan.id] || {
                newPrice: String(plan.currentPrice),
                updateCheckouts: true,
                updateMP: false,
              };

              const parsedNewPrice = Number(form.newPrice) || 0;
              const hasPriceChanged = parsedNewPrice !== plan.currentPrice;

              return (
                <div
                  key={plan.id}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden group"
                >
                  <div className="space-y-4">
                    {/* Header del Plan */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                          ID: {plan.id}
                        </span>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                          {plan.name}
                        </h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                        ${plan.currentPrice.toLocaleString('es-AR')} /mes
                      </span>
                    </div>

                    {/* Estadísticas de Suscriptores */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px]">En este Plan</span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {plan.totalTenants} consultoras
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Débito Mercado Pago</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {plan.mpSubscribersCount} activas
                        </span>
                      </div>
                    </div>

                    {/* Configurar Nuevo Precio */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                        Nuevo Precio Mensual (ARS)
                      </label>
                      
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-sm font-bold">
                          $
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="500"
                          value={form.newPrice}
                          onChange={(e) => {
                            setPriceForm({
                              ...priceForm,
                              [plan.id]: {
                                ...form,
                                newPrice: e.target.value,
                              },
                            });
                          }}
                          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-base focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          placeholder="Ej: 55000"
                        />
                      </div>

                      {/* Botones de incremento rápido */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {[10, 15, 20, 25, 30].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              const calculated = Math.round(plan.currentPrice * (1 + pct / 100));
                              setPriceForm({
                                ...priceForm,
                                [plan.id]: {
                                  ...form,
                                  newPrice: String(calculated),
                                },
                              });
                            }}
                            className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          >
                            +{pct}%
                          </button>
                        ))}
                        {hasPriceChanged && (
                          <button
                            type="button"
                            onClick={() => {
                              setPriceForm({
                                ...priceForm,
                                [plan.id]: {
                                  ...form,
                                  newPrice: String(plan.currentPrice),
                                },
                              });
                            }}
                            className="px-2 py-0.5 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-600 underline cursor-pointer"
                          >
                            Restablecer
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Checkboxes de Alcance */}
                    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.updateCheckouts}
                          onChange={(e) => {
                            setPriceForm({
                              ...priceForm,
                              [plan.id]: {
                                ...form,
                                updateCheckouts: e.target.checked,
                              },
                            });
                          }}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            Aplicar a Nuevas Contrataciones
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Cualquier usuario que compre o suba a este plan pagará el nuevo valor.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.updateMP}
                          onChange={(e) => {
                            setPriceForm({
                              ...priceForm,
                              [plan.id]: {
                                ...form,
                                updateMP: e.target.checked,
                              },
                            });
                          }}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span>Actualizar Débitos en Mercado Pago</span>
                            {plan.mpSubscribersCount > 0 && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                {plan.mpSubscribersCount} activas
                              </span>
                            )}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Llama a la API de Mercado Pago para cambiar el débito automático recurrente.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Botón de Actualización */}
                  <div className="pt-3">
                    <button
                      type="button"
                      disabled={parsedNewPrice <= 0 || (!form.updateCheckouts && !form.updateMP)}
                      onClick={() => {
                        setConfirmPriceModal({
                          isOpen: true,
                          planId: plan.id,
                          planName: plan.name,
                          currentPrice: plan.currentPrice,
                          newPrice: parsedNewPrice,
                          updateCheckouts: form.updateCheckouts,
                          updateMP: form.updateMP,
                          mpCount: plan.mpSubscribersCount,
                        });
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Actualizar {plan.name}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Gestión de Tenant */}
      {isModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Gestionar {selectedTenant.name}
                </h3>
                <p className="text-xs text-slate-500">ID: {selectedTenant.id}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveTenantChanges} className="p-6 space-y-5 overflow-y-auto flex-1">
              
              {modalFeedback && (
                <div className={`p-3 rounded-xl text-xs font-medium ${
                  modalFeedback.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                    : 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}>
                  {modalFeedback.text}
                </div>
              )}

              {/* Exención Global */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Cuenta Exenta (Plan Libre Ilimitado)
                  </label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Otorga acceso total sin requerir pago ni suscripción de Mercado Pago.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={selectedTenant.edit_is_exempt}
                  onChange={(e) => setSelectedTenant({ ...selectedTenant, edit_is_exempt: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>

              {/* Bonificación / Plan de Regalo */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-purple-500" />
                  Bonificación / Regalo de Días
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Plan de Regalo</label>
                    <select
                      value={selectedTenant.edit_gift_plan}
                      onChange={(e) => setSelectedTenant({ ...selectedTenant, edit_gift_plan: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Sin regalo activo</option>
                      <option value="basic_5">Plan 25000</option>
                      <option value="standard_25">Plan 35000</option>
                      <option value="libre">Plan Libre</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Días a Otorgar</label>
                    <select
                      value={selectedTenant.edit_gift_days}
                      disabled={!selectedTenant.edit_gift_plan}
                      onChange={(e) => setSelectedTenant({ ...selectedTenant, edit_gift_days: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-50"
                    >
                      <option value="7">7 Días</option>
                      <option value="15">15 Días</option>
                      <option value="30">30 Días (1 Mes)</option>
                      <option value="60">60 Días (2 Meses)</option>
                      <option value="90">90 Días (3 Meses)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Descuentos Comerciales en Mercado Pago */}
              <div className="space-y-3 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                <label className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Descuento Comercial en Mercado Pago
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Aplica un descuento porcentual automático cuando el usuario paga mediante Mercado Pago.
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Porcentaje</label>
                    <select
                      value={selectedTenant.edit_discount_percentage}
                      onChange={(e) => setSelectedTenant({ ...selectedTenant, edit_discount_percentage: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      <option value="0">Sin descuento (0%)</option>
                      <option value="10">10% de Descuento</option>
                      <option value="15">15% de Descuento</option>
                      <option value="20">20% de Descuento</option>
                      <option value="25">25% de Descuento</option>
                      <option value="30">30% de Descuento</option>
                      <option value="50">50% de Descuento</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Vigencia del Descuento</label>
                    <select
                      value={selectedTenant.edit_discount_days}
                      disabled={!Number(selectedTenant.edit_discount_percentage)}
                      onChange={(e) => setSelectedTenant({ ...selectedTenant, edit_discount_days: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-50"
                    >
                      <option value="15">15 Días</option>
                      <option value="30">30 Días (1 Mes)</option>
                      <option value="60">60 Días (2 Meses)</option>
                      <option value="90">90 Días (3 Meses)</option>
                      <option value="180">180 Días (6 Meses)</option>
                      <option value="365">365 Días (1 Año)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sincronización con Mercado Pago (si tiene suscripción activa) */}
              {selectedTenant.preapproval_id && (
                <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Suscripción en Mercado Pago
                    </label>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-100/70 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                      ID: {selectedTenant.preapproval_id.slice(0, 14)}...
                    </span>
                  </div>
                  <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={selectedTenant.edit_sync_mp}
                      onChange={(e) => setSelectedTenant({ ...selectedTenant, edit_sync_mp: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                        Actualizar cuota de débito en Mercado Pago al guardar
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Si quitas o modificas el descuento, la API de Mercado Pago actualizará inmediatamente el importe de débito automático de esta consultora.
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* Estado de la cuenta */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Estado de la Organización
                </label>
                <select
                  value={selectedTenant.edit_status}
                  onChange={(e) => setSelectedTenant({ ...selectedTenant, edit_status: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="active">Activa (Acceso Normal)</option>
                  <option value="suspended">Suspendida (Bloqueo de Acceso)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTenant}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {savingTenant ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Actualización de Precios */}
      {confirmPriceModal && confirmPriceModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Confirmar Actualización de Precios
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Plan: <strong className="text-slate-800 dark:text-slate-200">{confirmPriceModal.planName}</strong>
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Precio Actual:</span>
                  <span className="line-through text-slate-600 dark:text-slate-400 font-semibold">
                    ${confirmPriceModal.currentPrice.toLocaleString('es-AR')}
                  </span>
                </div>
                <div className="flex items-center justify-between font-bold text-sm">
                  <span className="text-slate-800 dark:text-slate-200">Nuevo Precio:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-base">
                    ${confirmPriceModal.newPrice.toLocaleString('es-AR')} /mes
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="font-semibold text-slate-800 dark:text-slate-200">Acciones que se ejecutarán:</div>
                <ul className="space-y-1.5 list-disc list-inside">
                  {confirmPriceModal.updateCheckouts && (
                    <li>Se actualizará la base de datos para todas las <strong>futuras contrataciones</strong>.</li>
                  )}
                  {confirmPriceModal.updateMP && (
                    <li className="text-amber-700 dark:text-amber-400 font-medium">
                      Se modificará el débito automático en <strong>Mercado Pago para {confirmPriceModal.mpCount} suscriptores activos</strong>.
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={executingPriceUpdate}
                  onClick={() => setConfirmPriceModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={executingPriceUpdate}
                  onClick={handleExecutePriceUpdate}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {executingPriceUpdate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Ejecutando en Mercado Pago...</span>
                    </>
                  ) : (
                    <span>Confirmar y Ejecutar</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
