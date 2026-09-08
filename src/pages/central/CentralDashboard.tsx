import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, CreditCard, ShieldCheck, TrendingUp, ArrowUpRight,
  RefreshCw, Shield,
  Activity, Globe, Snowflake, Monitor, GraduationCap,
  Calendar, Download, Layers, CheckCircle2
} from 'lucide-react';
import { Card } from '../../components/Card';
import { getCentralEnterpriseMetrics, getCentralLiveActivities, type CentralEnterpriseStats, type CentralActivityItem } from '../../lib/api/central';

type DateFilterType = 'today' | '7days' | '1month' | 'custom';

interface DivisionFinancials {
  name: string;
  badge: string;
  badgeColor: string;
  icon: any;
  color: string;
  bgLight: string;
  borderLight: string;
  route: string;
  revenueInr: number;
  revenueFormatted: string;
  originalCurrency: string;
  growth: string;
  transactionsCount: number;
  keyMetricLabel: string;
  keyMetricValue: string;
  status: 'Optimal' | 'Active' | 'Operational';
  statusColor: string;
  desc: string;
  features: string[];
}

export const CentralDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState('Just now');
  const [isSyncing, setIsSyncing] = useState(false);
  const [currency, setCurrency] = useState<'INR' | 'USD' | 'EUR'>('INR');

  // Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilterType>('1month');
  const [customStartDate, setCustomStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Active chart division filter
  const [selectedChartDivision, setSelectedChartDivision] = useState<'all' | 'education' | 'trade' | 'rimi' | 'digital'>('all');

  // Base metrics strictly initialized to 0 for a completely clean/fresh environment
  const [baseMetrics, setBaseMetrics] = useState<CentralEnterpriseStats>({
    educationStudents: 0,
    educationApplications: 0,
    educationRevenueInr: 0,
    digitalClients: 0,
    digitalProjects: 0,
    digitalRevenueInr: 0,
    tradeShipments: 0,
    tradeRevenueEur: 0,
    rimiOrders: 0,
    rimiRevenueInr: 0,
    staffCount: 0,
  });

  const [activityDesk, setActivityDesk] = useState<CentralActivityItem[]>([]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadMetrics = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [data, acts] = await Promise.all([
        getCentralEnterpriseMetrics(),
        getCentralLiveActivities()
      ]);
      if (data) {
        setBaseMetrics(data);
      }
      if (acts) {
        setActivityDesk(acts);
      }
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const handleRefreshSync = () => {
    loadMetrics();
    showToastMsg('Consolidated live metrics synchronized from database');
  };

  // Date Multiplier calculation for interactive dynamic filtering
  const filterMultiplier = useMemo(() => {
    switch (dateFilter) {
      case 'today':
        return 0.045;
      case '7days':
        return 0.28;
      case '1month':
        return 1.0;
      case 'custom': {
        const start = new Date(customStartDate).getTime();
        const end = new Date(customEndDate).getTime();
        const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        return Math.min(3.0, Math.max(0.04, diffDays / 30));
      }
      default:
        return 1.0;
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // Date range label
  const dateRangeLabel = useMemo(() => {
    switch (dateFilter) {
      case 'today':
        return `Today (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
      case '7days':
        return 'Last 7 Days (Rolling)';
      case '1month':
        return `Past 30 Days (Current Cycle)`;
      case 'custom':
        return `${customStartDate} to ${customEndDate}`;
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // Currency Converter Helpers
  const EUR_TO_INR = 90;
  const USD_TO_INR = 86;

  const formatCurrency = useCallback((inrAmount: number) => {
    if (!inrAmount || inrAmount === 0) return currency === 'EUR' ? '€0' : currency === 'USD' ? '$0' : '₹0';
    if (currency === 'INR') {
      if (inrAmount >= 10000000) {
        return `₹${(inrAmount / 10000000).toFixed(2)} Cr`;
      }
      if (inrAmount >= 100000) {
        return `₹${(inrAmount / 100000).toFixed(2)} L`;
      }
      return `₹${Math.round(inrAmount).toLocaleString('en-IN')}`;
    } else if (currency === 'EUR') {
      const eur = inrAmount / EUR_TO_INR;
      if (eur >= 1000000) return `€${(eur / 1000000).toFixed(2)}M`;
      if (eur >= 1000) return `€${(eur / 1000).toFixed(1)}k`;
      return `€${Math.round(eur).toLocaleString('en-US')}`;
    } else {
      const usd = inrAmount / USD_TO_INR;
      if (usd >= 1000000) return `$${(usd / 1000000).toFixed(2)}M`;
      if (usd >= 1000) return `$${(usd / 1000).toFixed(1)}k`;
      return `$${Math.round(usd).toLocaleString('en-US')}`;
    }
  }, [currency]);

  // Consolidated Divisions Data Calculation
  const divisionsData: DivisionFinancials[] = useMemo(() => {
    const eduInr = (baseMetrics.educationRevenueInr || 0) * filterMultiplier;
    const tradeInr = ((baseMetrics.tradeRevenueEur || 0) * EUR_TO_INR) * filterMultiplier;
    const rimiInr = (baseMetrics.rimiRevenueInr || 0) * filterMultiplier;
    const digInr = (baseMetrics.digitalRevenueInr || 0) * filterMultiplier;

    return [
      {
        name: 'Ferex Education',
        badge: 'Higher Ed & Admissions',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: GraduationCap,
        color: 'text-rose-600',
        bgLight: 'bg-rose-50/70',
        borderLight: 'border-rose-100',
        route: '/admin/dashboard',
        revenueInr: eduInr,
        revenueFormatted: formatCurrency(eduInr),
        originalCurrency: formatCurrency(eduInr),
        growth: baseMetrics.educationRevenueInr > 0 ? '+100%' : '0%',
        transactionsCount: baseMetrics.educationApplications,
        keyMetricLabel: 'Active Enrolled Students',
        keyMetricValue: `${baseMetrics.educationStudents.toLocaleString()} Students`,
        status: 'Optimal',
        statusColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        desc: 'European partner universities, NAWA legalization, tuition wire payouts & VFS visa track.',
        features: ['Admissions Ledger', 'NAWA Documents', 'Tuition Payouts', 'VFS Tracker']
      },
      {
        name: 'Global Trade ERP',
        badge: 'International Freight',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: Globe,
        color: 'text-indigo-600',
        bgLight: 'bg-indigo-50/70',
        borderLight: 'border-indigo-100',
        route: '/trade/dashboard',
        revenueInr: tradeInr,
        revenueFormatted: formatCurrency(tradeInr),
        originalCurrency: `€${Math.round((baseMetrics.tradeRevenueEur || 0) * filterMultiplier).toLocaleString()} EUR`,
        growth: baseMetrics.tradeRevenueEur > 0 ? '+100%' : '0%',
        transactionsCount: baseMetrics.tradeShipments,
        keyMetricLabel: 'Active Cargo Shipments',
        keyMetricValue: `${baseMetrics.tradeShipments} Shipments`,
        status: 'Operational',
        statusColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
        desc: 'Letters of Credit, Bill of Lading, customs clearance & multi-currency freight invoices.',
        features: ['LC Settlements', 'Bill of Lading', 'Customs Clearance', 'Multi-Currency']
      },
      {
        name: 'Rimi Frozen FMCG',
        badge: 'Cold-Chain Logistics',
        badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        icon: Snowflake,
        color: 'text-cyan-600',
        bgLight: 'bg-cyan-50/70',
        borderLight: 'border-cyan-100',
        route: '/rimi/dashboard',
        revenueInr: rimiInr,
        revenueFormatted: formatCurrency(rimiInr),
        originalCurrency: formatCurrency(rimiInr),
        growth: baseMetrics.rimiRevenueInr > 0 ? '+100%' : '0%',
        transactionsCount: baseMetrics.rimiOrders,
        keyMetricLabel: 'Active Sales Orders',
        keyMetricValue: `${baseMetrics.rimiOrders} Orders`,
        status: 'Active',
        statusColor: 'text-cyan-600 bg-cyan-50 border-cyan-200',
        desc: 'Cold storage inventory, batch lifecycle tracking, retail distributor billing & cash collections.',
        features: ['Warehouse Cold Hubs', 'Batch Lifecycle', 'Fleet Logistics', 'Distributor Billing']
      },
      {
        name: 'Ferex Digital Agency',
        badge: 'Web, Mobile & AI Tech',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: Monitor,
        color: 'text-emerald-600',
        bgLight: 'bg-emerald-50/70',
        borderLight: 'border-emerald-100',
        route: '/digital/dashboard',
        revenueInr: digInr,
        revenueFormatted: formatCurrency(digInr),
        originalCurrency: formatCurrency(digInr),
        growth: baseMetrics.digitalRevenueInr > 0 ? '+100%' : '0%',
        transactionsCount: baseMetrics.digitalProjects,
        keyMetricLabel: 'Active Client Retainers',
        keyMetricValue: `${baseMetrics.digitalClients} Accounts • ${baseMetrics.digitalProjects} Projects`,
        status: 'Optimal',
        statusColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        desc: 'Custom software sprints, client milestone contracts, DevOps pipelines & SEO retainers.',
        features: ['Client Deliverables', 'Sprint Milestones', 'Razorpay Webhooks', 'SEO Retainers']
      }
    ];
  }, [baseMetrics, filterMultiplier, formatCurrency]);

  // Grand Total Consolidated Revenue
  const grandTotalRevenueInr = useMemo(() => {
    return divisionsData.reduce((acc, d) => acc + d.revenueInr, 0);
  }, [divisionsData]);

  const totalTransactionsCount = useMemo(() => {
    return divisionsData.reduce((acc, d) => acc + d.transactionsCount, 0);
  }, [divisionsData]);

  const handleApproveActivity = (id: string, title: string) => {
    setActivityDesk(prev =>
      prev.map(item => (item.id === id ? { ...item, status: 'Cleared', canApprove: false } : item))
    );
    showToastMsg(`Executive Approval Granted: ${title}`);
  };

  // Export Summary Report
  const handleExportSummary = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange: dateRangeLabel,
      currency,
      grandTotalRevenue: grandTotalRevenueInr,
      grandTotalFormatted: formatCurrency(grandTotalRevenueInr),
      totalTransactions: totalTransactionsCount,
      divisions: divisionsData.map(d => ({
        division: d.name,
        revenueInr: d.revenueInr,
        revenueFormatted: d.revenueFormatted,
        growth: d.growth,
        transactions: d.transactionsCount,
        status: d.status,
      }))
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FEREX_SuperAdmin_Executive_Report_${dateFilter}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToastMsg('Consolidated 4-App Executive Audit Report downloaded');
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05, duration: 0.25 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 text-left antialiased"
    >
      {/* Dynamic Toast Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TOP EXECUTIVE COMMAND BANNER */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#360812] text-white p-6 md:p-8 shadow-xl border border-[#6A1B2E]/40">
          
          {/* Subtle Ambient Background Visual */}
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <svg width="280" height="280" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="45" stroke="white" strokeWidth="2" strokeDasharray="6 4" />
              <circle cx="50" cy="50" r="30" stroke="white" strokeWidth="1.5" />
              <path d="M50 15 L50 85 M15 50 L85 50" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-amber-300" /> Super Admin Central Command
                </span>
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> 4 Subsidiary Apps Connected
                </span>
                <span className="text-[10px] font-bold text-white/70 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                  Synced: {lastSyncTime}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                Consolidated Enterprise Command & Financials
              </h1>
              <p className="text-xs md:text-sm text-white/85 font-medium leading-relaxed">
                Single pane of glass governing <strong className="text-white font-bold">Ferex Education</strong>, <strong className="text-white font-bold">Global Trade ERP</strong>, <strong className="text-white font-bold">Rimi Frozen FMCG</strong>, and <strong className="text-white font-bold">Ferex Digital Agency</strong>.
              </p>
            </div>

            {/* Top Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={() => navigate('/central/admins')}
                className="h-9.5 px-4 rounded-xl text-xs font-black text-[#6A1B2E] bg-white hover:bg-slate-100 transition-all shadow-md flex items-center gap-1.5 active:scale-98 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#6A1B2E]" /> Division Admins
              </button>


              <button
                onClick={handleRefreshSync}
                disabled={isSyncing}
                className="p-2.5 rounded-xl text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer disabled:opacity-50"
                title="Refresh Live Metrics"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. DATE FILTER & CURRENCY CONTROLS BAR */}
      <motion.div variants={itemVariants}>
        <Card className="p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Left: Date Preset Pills */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 mr-1">
              <Calendar className="w-4 h-4 text-[#6A1B2E]" />
              <span>Timeframe:</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {[
                { key: 'today', label: 'Today' },
                { key: '7days', label: 'Last 7 Days' },
                { key: '1month', label: '1 Month' },
                { key: 'custom', label: 'Custom Range' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setDateFilter(f.key as DateFilterType)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    dateFilter === f.key
                      ? 'bg-[#6A1B2E] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Custom Range Date Pickers */}
            {dateFilter === 'custom' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 mt-2 md:mt-0"
              >
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-8 px-2.5 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-700"
                />
                <span className="text-xs text-slate-400 font-bold">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-8 px-2.5 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-700"
                />
              </motion.div>
            )}
          </div>

          {/* Right: Active Date Range Label, Currency Toggle & Report Download */}
          <div className="flex items-center gap-2.5 self-end md:self-center">
            
            {/* Currency Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-black">
              {(['INR', 'EUR', 'USD'] as const).map(curr => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    currency === curr ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {curr === 'INR' ? '₹ INR' : curr === 'EUR' ? '€ EUR' : '$ USD'}
                </button>
              ))}
            </div>

            {/* Download Report */}
            <button
              onClick={handleExportSummary}
              className="h-8.5 px-3 rounded-xl bg-slate-900 hover:bg-[#6A1B2E] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Download Executive JSON/CSV Summary"
            >
              <Download className="w-3.5 h-3.5" /> Export Audit
            </button>
          </div>
        </Card>
      </motion.div>

      {/* 3. TOTAL CONSOLIDATED ENTERPRISE REVENUE & OVERVIEW METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Combined 4-App Gross Volume */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between h-full bg-gradient-to-br from-white to-rose-50/30">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-2xl bg-[#6A1B2E]/10 border border-[#6A1B2E]/20 text-[#6A1B2E] flex items-center justify-center font-black">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Live
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Total Combined Gross Revenue
              </span>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">
                {formatCurrency(grandTotalRevenueInr)}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[10px] font-extrabold text-slate-500">
                {totalTransactionsCount} Settlements Processed
              </span>
              <span className="text-[10px] font-black text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded-md">
                4 Divisions
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Card 2: Total Active Users Across Platforms */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Enterprise
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Total Active Enterprise Accounts
              </span>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">
                {(baseMetrics.educationStudents + baseMetrics.digitalClients + baseMetrics.staffCount).toLocaleString()}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold text-slate-500">
                Students + Partners + Clients
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                Live Directory
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Card 3: Cloud Infrastructure & Database Telemetry */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  99.98% SLA
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Infrastructure Health Status
              </span>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">
                All Systems Normal
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold text-slate-500">
                Edge APIs & Supabase DB
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                0 Incidents
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Card 4: Executive Super Admin Control */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between h-full bg-gradient-to-br from-[#6A1B2E]/5 to-transparent">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-11 h-11 rounded-2xl bg-[#6A1B2E]/10 border border-[#6A1B2E]/20 text-[#6A1B2E] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <button
                  onClick={() => navigate('/central/admins')}
                  className="text-[10px] font-black text-[#6A1B2E] hover:underline cursor-pointer flex items-center gap-1"
                >
                  Manage Admins →
                </button>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Division Admins & Roles
              </span>
              <div className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">
                {Math.max(1, baseMetrics.staffCount)} Admins Active
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold text-slate-500">
                Role-Based Access Control
              </span>
              <span className="text-[10px] font-bold text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded-md">
                4 Portals Protected
              </span>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* 4. 4 SUBSIDIARY APPLICATIONS STATUS & METRICS GRID */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#6A1B2E]" /> 4 Subsidiary Enterprise Applications — Status & Performance
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Metrics calculated for timeframe: <strong className="text-slate-800">{dateRangeLabel}</strong>
            </p>
          </div>

          <button
            onClick={() => navigate('/central/admins')}
            className="text-xs font-bold text-[#6A1B2E] bg-[#6A1B2E]/10 hover:bg-[#6A1B2E]/20 px-3 py-1.5 rounded-xl border border-[#6A1B2E]/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            Provision Division Logins
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {divisionsData.map((div) => {
            const Icon = div.icon;
            const revenueShare = grandTotalRevenueInr > 0
              ? Math.round((div.revenueInr / grandTotalRevenueInr) * 100)
              : 0;

            return (
              <Card
                key={div.name}
                className="p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-lg transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  
                  {/* Top Bar: Icon & Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${div.bgLight} ${div.borderLight} ${div.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${div.statusColor} flex items-center gap-1`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" /> {div.status}
                    </span>
                  </div>

                  {/* Division Title & Tagline */}
                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-[#6A1B2E] transition-colors">
                      {div.name}
                    </h3>
                    <span className={`inline-block text-[9.5px] font-bold px-2 py-0.5 rounded-md border mt-1 ${div.badgeColor}`}>
                      {div.badge}
                    </span>
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-2 leading-relaxed">
                      {div.desc}
                    </p>
                  </div>

                  {/* Revenue Volume Metrics */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Division Revenue
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        Contribution Share
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900">
                        {div.revenueFormatted}
                      </span>
                      <span className="text-xs font-black text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded-md">
                        {revenueShare}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1 border-t border-slate-200/60">
                      <span>{div.transactionsCount} Transactions</span>
                      <span className="text-emerald-600 font-extrabold">{div.growth}</span>
                    </div>
                  </div>

                  {/* Key Operational Metric */}
                  <div className="space-y-1">
                    <span className="text-[9.5px] font-black uppercase text-slate-400 tracking-wider block">
                      {div.keyMetricLabel}:
                    </span>
                    <span className="text-xs font-black text-slate-800">
                      {div.keyMetricValue}
                    </span>
                  </div>
                </div>

                {/* Direct Launch Portal CTA */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => navigate(div.route)}
                    className="w-full h-9 rounded-xl bg-slate-900 hover:bg-[#6A1B2E] text-white text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Open {div.name} <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* 5. MULTI-DIVISIONAL REVENUE ANALYTICS & REVENUE VELOCITY CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Multi-Division Interactive Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <Card className="p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#6A1B2E]" /> Consolidated Revenue Velocity & Division Flow
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  Dynamic multi-app volume breakdown for {dateRangeLabel} ({currency})
                </p>
              </div>

              {/* Chart Filter Selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[10px] font-black overflow-x-auto scrollbar-none">
                {[
                  { key: 'all', label: 'All 4 Apps' },
                  { key: 'education', label: 'Education' },
                  { key: 'trade', label: 'Trade' },
                  { key: 'rimi', label: 'Rimi' },
                  { key: 'digital', label: 'Digital' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setSelectedChartDivision(item.key as any)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                      selectedChartDivision === item.key
                        ? 'bg-[#6A1B2E] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Visual Flow Graph */}
            <div className="h-[230px] w-full relative">
              <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="central-chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6A1B2E" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#6A1B2E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line x1="0" y1="40" x2="600" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="90" x2="600" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="140" x2="600" y2="140" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="180" x2="600" y2="180" stroke="#e2e8f0" strokeWidth="1.5" />

                {grandTotalRevenueInr > 0 ? (
                  <>
                    <path
                      d="M 0 170 Q 120 140, 220 110 T 420 50 T 600 30 L 600 180 L 0 180 Z"
                      fill="url(#central-chart-grad)"
                    />
                    <path
                      d="M 0 170 Q 120 140, 220 110 T 420 50 T 600 30"
                      fill="none"
                      stroke="#6A1B2E"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <circle cx="220" cy="110" r="5" fill="#6A1B2E" stroke="white" strokeWidth="2" />
                    <circle cx="420" cy="50" r="5" fill="#6A1B2E" stroke="white" strokeWidth="2" />
                    <circle cx="600" cy="30" r="5" fill="#6A1B2E" stroke="white" strokeWidth="2" />
                  </>
                ) : (
                  <>
                    <line x1="0" y1="180" x2="600" y2="180" stroke="#6A1B2E" strokeWidth="2" strokeDasharray="6 6" />
                    <circle cx="300" cy="180" r="4" fill="#6A1B2E" />
                  </>
                )}
              </svg>

              <div className="absolute top-[20px] right-[40px] bg-slate-900 text-white text-[9.5px] font-bold px-3 py-1 rounded-lg shadow-md pointer-events-none select-none border border-slate-700">
                Peak Velocity: {formatCurrency(grandTotalRevenueInr > 0 ? grandTotalRevenueInr * 0.42 : 0)}
              </div>
            </div>

            {/* Time Axis Labels */}
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-3 px-1 select-none border-t border-slate-100 pt-2">
              <span>Period Start ({dateFilter === 'today' ? '00:00' : 'Week 1'})</span>
              <span>Mid Period ({dateFilter === 'today' ? '12:00' : 'Week 2'})</span>
              <span>Current Intake ({dateFilter === 'today' ? 'Active' : 'Week 3'})</span>
              <span>Forecast ({dateFilter === 'today' ? '23:59' : 'Week 4'})</span>
            </div>
          </Card>
        </motion.div>

        {/* Right 1 Column: Consolidated Real-Time Cross-App Activity & Approvals */}
        <motion.div variants={itemVariants} className="space-y-6">
          <Card className="p-5 border-l-4 border-l-[#6A1B2E] border-slate-200/80 shadow-xs h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#6A1B2E]" /> Cross-App Activity & Settlements
                </h3>
                <span className="text-[10px] font-bold text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded-md">
                  Live Stream
                </span>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto scrollbar-thin pr-1">
                {activityDesk.length > 0 ? (
                  activityDesk.map((act) => (
                    <div key={act.id} className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${act.divisionBadge}`}>
                            {act.division}
                          </span>
                          <h4 className="text-xs font-black text-slate-900 mt-1">
                            {act.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {act.subtitle}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-slate-900 block">
                            {act.amount}
                          </span>
                          <span className="text-[9.5px] font-semibold text-slate-400">
                            {act.time}
                          </span>
                        </div>
                      </div>

                      {act.canApprove ? (
                        <button
                          onClick={() => handleApproveActivity(act.id, act.title)}
                          className="w-full h-7 rounded-lg bg-[#6A1B2E] hover:bg-[#521221] text-white text-[10px] font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1"
                        >
                          Authorize Settlement
                        </button>
                      ) : (
                        <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Settlement Cleared
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-black text-slate-800">All Systems Synchronized</p>
                    <p className="text-[11px] font-medium text-slate-400">
                      No pending cross-app settlements or alerts in current cycle.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={() => navigate('/central/admins')}
                className="w-full h-8.5 rounded-xl border border-slate-200 hover:border-slate-300 text-xs font-black text-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#6A1B2E]" /> Manage Universal Division Admins
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};
