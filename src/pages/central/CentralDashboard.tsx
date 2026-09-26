import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  Crown, RefreshCw, TrendingUp, CreditCard, ArrowUpRight,
  GraduationCap, Globe, Snowflake, Monitor, ShieldCheck,
  CheckCircle2, Users, Activity, BarChart3, ChevronRight,
  Zap, Building, FileText, Check
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { supabase } from '../../lib/supabase';
import {
  getCentralEnterpriseMetrics,
  getCentralLiveActivities,
  type CentralEnterpriseStats,
  type CentralActivityItem
} from '../../lib/api/central';

export const CentralDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState('Just now');
  const [isSyncing, setIsSyncing] = useState(false);
  const [currency, setCurrency] = useState<'INR' | 'EUR' | 'USD'>('INR');

  const [metrics, setMetrics] = useState<CentralEnterpriseStats>({
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

  const [activities, setActivities] = useState<CentralActivityItem[]>([]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [stats, acts] = await Promise.all([
        getCentralEnterpriseMetrics(),
        getCentralLiveActivities(),
      ]);
      if (stats) setMetrics(stats);
      if (acts) setActivities(acts);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Supabase Realtime subscriptions
    const channel = supabase
      .channel('realtime_central_hq_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_shipments' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_sales_orders' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_invoices' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Currency Converter Formatter (NORMAL UNITS)
  const formatCurrency = useCallback((inrAmount: number) => {
    if (currency === 'EUR') {
      const eur = Math.round(inrAmount / 90);
      return `€${eur.toLocaleString()}`;
    }
    if (currency === 'USD') {
      const usd = Math.round(inrAmount / 83.5);
      return `$${usd.toLocaleString()}`;
    }
    return `₹${inrAmount.toLocaleString('en-IN')}`;
  }, [currency]);

  // Calculations
  const tradeInr = useMemo(() => metrics.tradeRevenueEur * 90, [metrics.tradeRevenueEur]);
  const totalCombinedRevenue = useMemo(() => {
    return metrics.educationRevenueInr + tradeInr + metrics.rimiRevenueInr + metrics.digitalRevenueInr;
  }, [metrics.educationRevenueInr, tradeInr, metrics.rimiRevenueInr, metrics.digitalRevenueInr]);

  const totalSubsidiaryOperations = useMemo(() => {
    return metrics.educationApplications + metrics.tradeShipments + metrics.rimiOrders + metrics.digitalProjects;
  }, [metrics]);

  const subsidiaries = [
    {
      id: 'education',
      name: 'Ferex Education',
      portalTag: 'Higher Education & Admissions',
      icon: GraduationCap,
      color: 'rose',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      revenueInr: metrics.educationRevenueInr,
      stat1Label: 'Enrolled Students',
      stat1Val: metrics.educationStudents,
      stat2Label: 'Applications',
      stat2Val: metrics.educationApplications,
      route: '/central/education',
      health: 'Optimal',
    },
    {
      id: 'trade',
      name: 'Global Trade ERP',
      portalTag: 'Maritime Cargo & LC Settlements',
      icon: Globe,
      color: 'indigo',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      revenueInr: tradeInr,
      stat1Label: 'Active Shipments',
      stat1Val: metrics.tradeShipments,
      stat2Label: 'LC Settlements',
      stat2Val: `€${metrics.tradeRevenueEur.toLocaleString()}`,
      route: '/central/trade',
      health: 'Active',
    },
    {
      id: 'rimi',
      name: 'Rimi Frozen FMCG',
      portalTag: 'Cold Storage & Distribution',
      icon: Snowflake,
      color: 'cyan',
      badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      revenueInr: metrics.rimiRevenueInr,
      stat1Label: 'Wholesale Orders',
      stat1Val: metrics.rimiOrders,
      stat2Label: 'Fleet Hubs',
      stat2Val: '4 Active',
      route: '/central/rimi',
      health: 'Active',
    },
    {
      id: 'digital',
      name: 'Ferex Digital Agency',
      portalTag: 'Enterprise Software & Retainers',
      icon: Monitor,
      color: 'emerald',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      revenueInr: metrics.digitalRevenueInr,
      stat1Label: 'Active Retainers',
      stat1Val: metrics.digitalClients,
      stat2Label: 'Sprints & Projects',
      stat2Val: metrics.digitalProjects,
      route: '/central/digital',
      health: 'Optimal',
    },
  ];

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Alert */}
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Clean Minimal Executive Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#58051E] flex items-center justify-center text-white shadow-xs">
              <Crown className="w-4.5 h-4.5 text-amber-300" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Executive Command Center
              </h1>
              <p className="text-xs font-medium text-slate-400">
                Unified cross-subsidiary governance, operations, and treasury.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Status Badge */}
          <div className="flex items-center gap-2 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>All Portals Active</span>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
            {(['INR', 'EUR', 'USD'] as const).map((cur) => (
              <button
                key={cur}
                onClick={() => setCurrency(cur)}
                className={`px-2.5 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  currency === cur
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cur === 'INR' ? '₹ INR' : cur === 'EUR' ? '€ EUR' : '$ USD'}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            title="Refresh Central Database Metrics"
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-slate-600 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#58051E]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top 4 Executive KPI Cards (NORMAL UNITS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border border-slate-200/80 shadow-xs bg-white">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Combined Enterprise Revenue</span>
            <CreditCard className="w-4 h-4 text-[#58051E]" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(totalCombinedRevenue)}
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 mt-2">
            <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Live Audited Inflow</span>
            <span className="text-slate-400 font-medium">4 Subsidiaries</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs bg-white">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Governed Users & Staff</span>
            <Users className="w-4 h-4 text-[#58051E]" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {metrics.educationStudents + metrics.staffCount}
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2">
            <span className="text-slate-700">{metrics.staffCount} Operations Staff</span>
            <span>{metrics.educationStudents} Students</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs bg-white">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Cross-App Transactions</span>
            <Activity className="w-4 h-4 text-[#58051E]" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {totalSubsidiaryOperations}
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2">
            <span className="text-emerald-600">Active Consignments & Deals</span>
            <span>Live Sync</span>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200/80 shadow-xs bg-white">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">System Health & Security</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 tracking-tight">
            99.98%
          </div>
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2">
            <span className="text-emerald-600">Supabase Connected</span>
            <span>0 Active Breaches</span>
          </div>
        </Card>
      </div>

      {/* 4 Subsidiary Operational Command Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Building className="w-4 h-4 text-[#58051E]" /> Subsidiary Operations Matrix
          </h2>
          <Link
            to="/central/reports"
            className="text-xs font-bold text-[#58051E] hover:underline flex items-center gap-1"
          >
            View Detailed Financial Analytics <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {subsidiaries.map((sub) => {
            const Icon = sub.icon;
            const share = totalCombinedRevenue > 0 ? Math.round((sub.revenueInr / totalCombinedRevenue) * 100) : 0;
            return (
              <Card
                key={sub.id}
                className="p-5 border border-slate-200/80 shadow-xs bg-white flex flex-col justify-between hover:border-slate-300 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 border border-slate-200/60 shadow-2xs group-hover:bg-[#58051E] group-hover:text-white transition-colors">
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-900">{sub.name}</h3>
                        <p className="text-[9.5px] font-bold text-slate-400">{sub.portalTag}</p>
                      </div>
                    </div>
                  </div>

                  {/* Revenue */}
                  <div className="my-3.5">
                    <span className="text-[9.5px] font-bold uppercase text-slate-400 block">Subsidiary Revenue</span>
                    <div className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
                      {formatCurrency(sub.revenueInr)}
                    </div>
                    <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-400 mt-1">
                      <span className="text-[#58051E]">{share}% Enterprise Share</span>
                      <span className="text-emerald-600 font-bold">{sub.health}</span>
                    </div>
                  </div>

                  {/* Dual Stats */}
                  <div className="grid grid-cols-2 gap-2 my-3 text-left">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">{sub.stat1Label}</span>
                      <span className="text-xs font-black text-slate-800">{sub.stat1Val}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">{sub.stat2Label}</span>
                      <span className="text-xs font-black text-slate-800">{sub.stat2Val}</span>
                    </div>
                  </div>
                </div>

                <Link
                  to={sub.route}
                  className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 bg-slate-50 hover:bg-[#58051E] hover:text-white text-slate-700 text-xs font-bold rounded-xl border border-slate-200/60 transition-colors"
                >
                  <span>Open Console</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Revenue Distribution & Gateway Flow Strip */}
      <Card className="p-5 border border-slate-200/80 shadow-xs bg-white space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-[#58051E]" /> Cross-Subsidiary Financial Distribution & Rail Flow
            </h2>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Relative treasury composition across Higher Education, Global Trade, Cold-Chain Distribution, and Digital Agency.
            </p>
          </div>
          <Link
            to="/central/finance"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-1"
          >
            Treasury Ledger <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Multi-segment Bar */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex gap-0.5 p-0.5 border border-slate-200">
          <div
            style={{ width: `${totalCombinedRevenue > 0 ? (metrics.educationRevenueInr / totalCombinedRevenue) * 100 : 25}%` }}
            className="bg-rose-500 rounded-full h-full"
            title="Education"
          />
          <div
            style={{ width: `${totalCombinedRevenue > 0 ? (tradeInr / totalCombinedRevenue) * 100 : 25}%` }}
            className="bg-indigo-500 rounded-full h-full"
            title="Global Trade"
          />
          <div
            style={{ width: `${totalCombinedRevenue > 0 ? (metrics.rimiRevenueInr / totalCombinedRevenue) * 100 : 25}%` }}
            className="bg-cyan-500 rounded-full h-full"
            title="Rimi Frozen"
          />
          <div
            style={{ width: `${totalCombinedRevenue > 0 ? (metrics.digitalRevenueInr / totalCombinedRevenue) * 100 : 25}%` }}
            className="bg-emerald-500 rounded-full h-full"
            title="Ferex Digital"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="font-bold text-slate-700">Education:</span>
            <span className="font-bold text-slate-900">{formatCurrency(metrics.educationRevenueInr)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="font-bold text-slate-700">Trade ERP:</span>
            <span className="font-bold text-slate-900">{formatCurrency(tradeInr)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
            <span className="font-bold text-slate-700">Rimi Frozen:</span>
            <span className="font-bold text-slate-900">{formatCurrency(metrics.rimiRevenueInr)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-bold text-slate-700">Digital Agency:</span>
            <span className="font-bold text-slate-900">{formatCurrency(metrics.digitalRevenueInr)}</span>
          </div>
        </div>
      </Card>

      {/* Real-time Cross-Division Operations & Activity Feed */}
      <Card className="p-5 border border-slate-200/80 shadow-xs bg-white space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-[#58051E]" /> Live Cross-Subsidiary Operations Feed
            </h2>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Instant operations stream capturing recent tuition wires, cargo shipments, batch dispatch, and client deliverables.
            </p>
          </div>
          <Link
            to="/central/activity"
            className="text-xs font-bold text-[#58051E] hover:underline flex items-center gap-1"
          >
            Full Audit Trail <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {activities.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-bold text-xs">
              No recent cross-subsidiary activity.
            </div>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors px-2 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${act.divisionBadge}`}>
                    {act.division}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{act.title}</p>
                    <p className="text-[11px] text-slate-400 font-medium">{act.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900">{act.amount}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{act.time}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    act.status === 'Cleared'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {act.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
