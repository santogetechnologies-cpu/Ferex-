import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp, DollarSign, PackageCheck, FolderArchive,
  CreditCard, ListTodo, LifeBuoy, Mail, ArrowRight,
  Ship, Clock, CheckCircle2, AlertCircle, RefreshCw,
  Building2, Users, ShieldCheck
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getCentralTradeSummary,
  TRADE_ORDER_STAGES,
  type TradeOrder,
  type TradeTask,
  type TradeTicket
} from '../../lib/api/trade';
import { useAuth } from '../../contexts/AuthContext';

export const TradeDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const userName = profile?.full_name || 'Trade Operations';
  const isAdmin = profile?.role === 'trade_admin' || profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'super_admin';

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCentralTradeSummary();
      setSummary(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    const handleUpdate = () => loadSummary();
    window.addEventListener('ferex_trade_orders_change', handleUpdate);
    window.addEventListener('ferex_trade_documents_change', handleUpdate);
    window.addEventListener('ferex_trade_tasks_change', handleUpdate);
    window.addEventListener('ferex_trade_tickets_change', handleUpdate);
    window.addEventListener('ferex_trade_payments_change', handleUpdate);

    return () => {
      window.removeEventListener('ferex_trade_orders_change', handleUpdate);
      window.removeEventListener('ferex_trade_documents_change', handleUpdate);
      window.removeEventListener('ferex_trade_tasks_change', handleUpdate);
      window.removeEventListener('ferex_trade_tickets_change', handleUpdate);
      window.removeEventListener('ferex_trade_payments_change', handleUpdate);
    };
  }, [loadSummary]);

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-[#450518] to-slate-900 rounded-3xl text-white shadow-xl">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-block mb-2">
            {isAdmin ? 'Trade Director Executive Cockpit' : 'Logistics Officer Operations Desk'}
          </span>
          <h1 className="text-xl font-black">Welcome back, {userName}</h1>
          <p className="text-xs text-slate-300 font-semibold mt-0.5">
            Real-time control over international 7-stage order lifecycles, compliance dossiers, payments, and client communications.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link to="/trade/shipments">
            <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100 font-black text-xs">
              <PackageCheck className="w-4 h-4 mr-1.5 text-[#58051E]" />
              Manage Orders
            </Button>
          </Link>
          <Link to="/trade/client-portal">
            <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10 font-bold text-xs">
              Preview Client Portal <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#58051E]" /> Loading operational KPIs...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Order Value */}
            <Card className="p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10.5px] font-black uppercase text-slate-400 block">Total Order Book</span>
                <span className="text-lg font-black text-slate-900">
                  ${Math.round(summary?.totalOrderValueUSD || 0).toLocaleString()} <span className="text-[10px] text-slate-400">USD</span>
                </span>
              </div>
            </Card>

            {/* Pending Payments */}
            <Card className="p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10.5px] font-black uppercase text-slate-400 block">Pending Balances</span>
                <span className="text-lg font-black text-slate-900">
                  ${Math.round(summary?.pendingPaymentsUSD || 0).toLocaleString()} <span className="text-[10px] text-slate-400">USD</span>
                </span>
              </div>
            </Card>

            {/* In Transit */}
            <Card className="p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Ship className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10.5px] font-black uppercase text-slate-400 block">Active In Transit</span>
                <span className="text-lg font-black text-slate-900">
                  {summary?.inTransitCount || 0} <span className="text-xs font-semibold text-slate-500">Shipments</span>
                </span>
              </div>
            </Card>

            {/* Pending Tasks & Tickets */}
            <Card className="p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center shrink-0">
                <ListTodo className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10.5px] font-black uppercase text-slate-400 block">Open Tasks & Tickets</span>
                <span className="text-lg font-black text-slate-900">
                  {(summary?.pendingTasksCount || 0) + (summary?.openTicketsCount || 0)} <span className="text-xs font-semibold text-slate-500">Actionable</span>
                </span>
              </div>
            </Card>
          </div>

          {/* 7-Stage Pipeline Visualizer */}
          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">Active Order Stage Distribution</h2>
              <Link to="/trade/shipments" className="text-xs font-bold text-[#58051E] hover:underline flex items-center gap-1">
                View All Orders <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
              {TRADE_ORDER_STAGES.map((stage) => {
                const count = summary?.orders?.filter((o: any) => o.stage === stage).length || 0;
                return (
                  <div key={stage} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-center">
                    <div className="text-[10px] font-black uppercase text-slate-500 truncate">{stage}</div>
                    <div className="text-base font-black text-slate-900 mt-1">{count}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Two-Column Work Queues: Assigned Tasks & Recent Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Urgent Tasks */}
            <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                  <ListTodo className="w-4 h-4 text-[#58051E]" /> Staff Task Queue
                </h3>
                <Link to="/trade/tasks" className="text-xs font-bold text-[#58051E] hover:underline">
                  All Tasks
                </Link>
              </div>

              <div className="space-y-2">
                {summary?.tasks?.slice(0, 4).map((t: TradeTask) => (
                  <div key={t.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-extrabold text-slate-900">{t.title}</div>
                      <div className="text-[10.5px] text-slate-500">
                        Assigned: <strong>{t.assigned_staff_name}</strong> • Due: {t.due_date}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Support Tickets */}
            <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-black uppercase text-slate-500 flex items-center gap-1.5">
                  <LifeBuoy className="w-4 h-4 text-[#58051E]" /> Manual Support Tickets
                </h3>
                <Link to="/trade/tickets" className="text-xs font-bold text-[#58051E] hover:underline">
                  All Tickets
                </Link>
              </div>

              <div className="space-y-2">
                {summary?.tickets?.slice(0, 4).map((tk: TradeTicket) => (
                  <div key={tk.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-[10px] text-slate-400">{tk.ticket_no} • {tk.channel}</div>
                      <div className="font-extrabold text-slate-900">{tk.subject}</div>
                      <div className="text-[10.5px] text-slate-500">{tk.client_name}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      tk.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {tk.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default TradeDashboard;
