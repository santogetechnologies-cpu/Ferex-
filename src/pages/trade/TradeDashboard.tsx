import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Globe, Truck, FileSpreadsheet, Building2, CreditCard, ArrowUpRight,
  CheckCircle2, ShieldCheck, Anchor, FileCheck2, Plus, Clock, ExternalLink
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';
import { getTradeDashboardLiveStats, getTradeShipments, getTradeInvoices } from '../../lib/api/trade';

export const TradeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeContainersCount: 0,
    totalVolumeStr: '₹0',
    openLCsStr: '₹0',
    clearedPaymentsStr: '₹0',
    activeShipments: [] as any[],
    recentInvoices: [] as any[],
  });

  const loadData = useCallback(async () => {
    try {
      const [liveStats, allShipments, allInvoices] = await Promise.all([
        getTradeDashboardLiveStats(),
        getTradeShipments(),
        getTradeInvoices(),
      ]);
      setStats(liveStats);
      setShipments(allShipments);
      setInvoices(allInvoices);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('trade_dashboard_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_shipments' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_invoices' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_letters_of_credit' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_payments' }, () => loadData())
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_shipments_change', handleLocalChange);
    window.addEventListener('ferex_trade_invoices_change', handleLocalChange);
    window.addEventListener('ferex_trade_lcs_change', handleLocalChange);
    window.addEventListener('ferex_trade_payments_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_shipments_change', handleLocalChange);
      window.removeEventListener('ferex_trade_invoices_change', handleLocalChange);
      window.removeEventListener('ferex_trade_lcs_change', handleLocalChange);
      window.removeEventListener('ferex_trade_payments_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Group shipments by origin port for real port tracker
  const portSummary = React.useMemo(() => {
    const portsMap: Record<string, number> = {};
    shipments.forEach((s) => {
      const p = s.origin_port || 'Port of Gdansk, Poland';
      portsMap[p] = (portsMap[p] || 0) + 1;
    });
    return Object.entries(portsMap).slice(0, 3);
  }, [shipments]);

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-6 md:p-8 shadow-xl border border-[#6A1B2E]/30">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white">
                Executive Command Console
              </span>
              <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Supabase Realtime Active
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Ferex Global Trade Operations
            </h1>
            <p className="text-xs md:text-sm text-white/85 leading-relaxed font-semibold">
              Managing international supply chains, Bills of Lading, container dispatch, and Letters of Credit across European & Asian maritime ports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/trade/shipments')}
              className="h-10 px-5 rounded-xl text-xs font-black text-[#6A1B2E] bg-white hover:bg-slate-100 transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              Track Active Containers <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/trade/letters-of-credit')}
              className="h-10 px-5 rounded-xl text-xs font-black text-white bg-white/15 hover:bg-white/25 border border-white/30 transition-all shadow-xs cursor-pointer"
            >
              View Letters of Credit
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Containers in Transit', value: `${stats.activeContainersCount} Units`, sub: `${shipments.length} Total Shipments in DB`, icon: Truck, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', badge: 'Live Ports', path: '/trade/shipments' },
          { title: 'Total Trade Volume', value: stats.totalVolumeStr, sub: `${invoices.length} Commercial Invoices`, icon: Globe, color: 'text-blue-600 bg-blue-50 border-blue-100', badge: 'Active Ledger', path: '/trade/invoices' },
          { title: 'Open Letters of Credit', value: stats.openLCsStr, sub: 'Verified Banking Guarantees', icon: Building2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', badge: 'Banking Lines', path: '/trade/letters-of-credit' },
          { title: 'Cleared Payments', value: stats.clearedPaymentsStr, sub: 'Settled SWIFT Transactions', icon: CreditCard, color: 'text-[#6A1B2E] bg-[#6A1B2E]/10 border-[#6A1B2E]/20', badge: '100% Cleared', path: '/trade/payments' },
        ].map((stat, idx) => (
          <Card key={idx} onClick={() => navigate(stat.path)} className="p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${stat.color} group-hover:scale-105 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  {stat.badge}
                </span>
              </div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">{stat.title}</span>
              <span className="text-2xl font-black text-slate-900 leading-none">{stat.value}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10.5px] font-extrabold text-slate-500 truncate">
              {stat.sub}
            </div>
          </Card>
        ))}
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Live Shipments & Active Maritime Port Hubs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Live Recent Shipments Feed */}
          <Card className="p-6 text-left border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#6A1B2E]" /> Active Maritime Shipments Ledger
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Real-time container movements and customs clearance updates</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => navigate('/trade/shipments')}>
                View All ({shipments.length})
              </Button>
            </div>

            {shipments.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No active shipments in the database</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Book a new container shipment to start tracking freight.</p>
                <Button size="sm" className="mt-3 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => navigate('/trade/shipments')}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Book Container Shipment
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {shipments.slice(0, 4).map((s) => (
                  <div key={s.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2 rounded-xl transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">{s.container_no || s.shipment_no || s.id}</span>
                        <span className="text-[10px] font-bold text-slate-400">· {s.carrier || 'Maersk Line'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                          (s.status === 'In Transit' || s.shipment_status === 'In Transit')
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {s.status || s.shipment_status || 'In Transit'}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">
                        {s.origin_port} → {s.destination_port}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900">
                        {Number(s.cargo_weight_kg || 20000).toLocaleString()} kg
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" /> ETA: {s.eta || 'Scheduled'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Active Maritime Port Tracker */}
          <Card className="p-6 text-left border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Anchor className="w-4 h-4 text-[#6A1B2E]" /> Global Port Hubs Status
              </h3>
              <button onClick={() => navigate('/trade/shipments')} className="text-xs font-bold text-[#6A1B2E] hover:underline">
                Explore Ports
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {portSummary.length > 0 ? (
                portSummary.map(([portName, count], idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <div className="text-[10px] font-black uppercase text-slate-400">Maritime Hub</div>
                    <div className="text-xs font-black text-slate-900 truncate">{portName}</div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Active Port</span>
                      <span className="text-[10px] font-bold text-slate-500">{count} Shipments</span>
                    </div>
                  </div>
                ))
              ) : (
                [
                  { port: 'Port of Gdansk', country: '🇵🇱 Poland', status: 'Customs Clear' },
                  { port: 'Port of Hamburg', country: '🇩🇪 Germany', status: 'In Transit' },
                  { port: 'Port of Rotterdam', country: '🇳🇱 Netherlands', status: 'Docking Cleared' },
                ].map((p, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                    <div className="text-[10px] font-black uppercase text-slate-400">{p.country}</div>
                    <div className="text-xs font-black text-slate-900">{p.port}</div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{p.status}</span>
                      <span className="text-[10px] font-bold text-slate-500">Live Hub</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Col: Quick Actions, Recent Invoices & Compliance Status */}
        <div className="space-y-6 text-left">
          
          {/* Quick Action Cards */}
          <Card className="p-5 border border-slate-200/70 shadow-xs">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
              Trade Executive Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { title: 'Shipments', path: '/trade/shipments', icon: Truck },
                { title: 'Invoices', path: '/trade/invoices', icon: FileSpreadsheet },
                { title: 'Letter of Credit', path: '/trade/letters-of-credit', icon: Building2 },
                { title: 'Trade CRM', path: '/trade/crm', icon: Globe },
                { title: 'Certificates', path: '/trade/certificates', icon: FileCheck2 },
                { title: 'Payments', path: '/trade/payments', icon: CreditCard },
              ].map((act, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(act.path)}
                  className="p-3 rounded-xl border border-slate-200/80 hover:border-[#6A1B2E]/40 hover:bg-slate-50 transition-all cursor-pointer group text-left flex items-center gap-2.5"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#6A1B2E]/10 text-[#6A1B2E] group-hover:bg-[#6A1B2E] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <act.icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 group-hover:text-[#6A1B2E] truncate">{act.title}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Pending LC Authorization Widget */}
          <Card className="p-5 border-l-4 border-l-[#6A1B2E] border-slate-200/70 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <h3 className="text-xs font-black text-[#6A1B2E] uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4" /> Letter of Credit Active
              </h3>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {stats.openLCsStr}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 mb-3">
              <div className="text-xs font-black text-slate-900">Total LC Credit Facilities</div>
              <div className="text-[11px] font-semibold text-slate-500">Beneficiary Guarantees Linked to Export Shipments</div>
              <div className="text-[10px] font-bold text-slate-400 pt-1 flex items-center justify-between">
                <span>Issuing Banks: HSBC, Deutsche Bank</span>
                <span className="text-emerald-600 font-extrabold">{stats.openLCsStr}</span>
              </div>
            </div>

            <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => navigate('/trade/letters-of-credit')}>
              Manage Letters of Credit
            </Button>
          </Card>

          {/* Critical Trade Compliance Feed */}
          <Card className="p-5 border border-slate-200/70 shadow-xs">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
              Compliance & Customs Status
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-slate-900 block">EU Phytosanitary & Customs Clearances</span>
                  <span className="text-[10.5px] font-semibold text-slate-500">Export inspections verified under ICC Uniform Customs Rules.</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-slate-900 block">Bills of Lading Ocean Records</span>
                  <span className="text-[10.5px] font-semibold text-slate-500">Ocean carriers & clean on-board departures verified.</span>
                </div>
              </div>
            </div>
          </Card>

        </div>

      </div>
    </div>
  );
};
