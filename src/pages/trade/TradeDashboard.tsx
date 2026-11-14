import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, PackageCheck, CreditCard, ListTodo, LifeBuoy, ArrowRight, Ship } from 'lucide-react';
import { Button } from '../../components/Button';
import { PageHeader, StatTile, Section, EmptyState, PageSkeleton, StatusPill } from '../../components/Kit';
import {
  getCentralTradeSummary,
  TRADE_ORDER_STAGES,
  type TradeOrder,
  type TradeTask,
  type TradeTicket
} from '../../lib/api/trade';
import { useAuth } from '../../contexts/AuthContext';

const EVENTS = ['ferex_trade_orders_change', 'ferex_trade_documents_change', 'ferex_trade_tasks_change', 'ferex_trade_tickets_change', 'ferex_trade_payments_change'];

export const TradeDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await getCentralTradeSummary());
      setError('');
    } catch (e: any) {
      setError(e.message || 'Could not load the dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
    const handleUpdate = () => void loadSummary();
    EVENTS.forEach(e => window.addEventListener(e, handleUpdate));
    return () => EVENTS.forEach(e => window.removeEventListener(e, handleUpdate));
  }, [loadSummary]);

  const first = (profile?.full_name || '').split(' ')[0];
  const orders: TradeOrder[] = summary?.orders || [];

  return (
    <div className="space-y-6 text-left antialiased">
      <PageHeader
        eyebrow="Global Trade"
        title={first ? `Welcome back, ${first}` : 'Welcome back'}
        subtitle="Orders, shipping documents, payments and your team's tasks in one place."
        actions={<>
          <Link to="/trade/shipments"><Button size="md"><PackageCheck className="w-4 h-4 mr-1.5" />Orders</Button></Link>
          <Link to="/trade/client-portal"><Button size="md" variant="outline">Client portal <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button></Link>
        </>}
      />

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

      {loading ? <PageSkeleton /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile label="Total order value" value={`$${Math.round(summary?.totalOrderValueUSD || 0).toLocaleString()}`} hint="All orders, in USD" icon={DollarSign} tone="green" to="/trade/shipments" />
            <StatTile label="Balance to collect" value={`$${Math.round(summary?.pendingPaymentsUSD || 0).toLocaleString()}`} hint="Unpaid across orders" icon={CreditCard} tone="amber" to="/trade/payments" />
            <StatTile label="In transit" value={summary?.inTransitCount || 0} hint="Shipments on the way" icon={Ship} tone="blue" to="/trade/shipments" />
            <StatTile label="Open work" value={(summary?.pendingTasksCount || 0) + (summary?.openTicketsCount || 0)} hint="Tasks and tickets" icon={ListTodo} tone="brand" to="/trade/tasks" />
          </div>

          <Section title="Orders by stage" hint="Where every active order stands" action={{ label: 'All orders', to: '/trade/shipments' }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {TRADE_ORDER_STAGES.map((stage) => {
                const count = orders.filter(o => o.stage === stage).length;
                return (
                  <div key={stage} className={`rounded-xl border p-3 ${count ? 'border-[#58051E]/20 bg-[#58051E]/[0.03]' : 'border-slate-200/80 bg-slate-50/60'}`}>
                    <div className="text-[11px] font-semibold text-slate-500 truncate">{stage}</div>
                    <div className="text-xl font-extrabold text-slate-900 mt-1 tabular-nums">{count}</div>
                  </div>
                );
              })}
            </div>
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Tasks" hint="Latest assigned work" action={{ label: 'All tasks', to: '/trade/tasks' }}>
              {(summary?.tasks || []).length === 0 ? <EmptyState icon={ListTodo} title="No tasks yet" hint="Tasks you assign to your team show up here." /> : (
                <ul className="divide-y divide-slate-100">
                  {summary.tasks.slice(0, 5).map((t: TradeTask) => (
                    <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{t.title}</p><p className="text-xs text-slate-500">{t.assigned_staff_name || 'Unassigned'}{t.due_date ? ` · due ${t.due_date}` : ''}</p></div>
                      <StatusPill tone={t.status === 'Completed' ? 'green' : 'amber'}>{t.status}</StatusPill>
                    </li>))}
                </ul>)}
            </Section>
            <Section title="Support tickets" hint="Latest requests from clients" action={{ label: 'All tickets', to: '/trade/tickets' }}>
              {(summary?.tickets || []).length === 0 ? <EmptyState icon={LifeBuoy} title="No tickets" hint="Client requests will appear here." /> : (
                <ul className="divide-y divide-slate-100">
                  {summary.tickets.slice(0, 5).map((tk: TradeTicket) => (
                    <li key={tk.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0"><p className="text-sm font-semibold text-slate-900 truncate">{tk.subject}</p><p className="text-xs text-slate-500">{tk.client_name} · {tk.ticket_no}</p></div>
                      <StatusPill tone={tk.status === 'Resolved' ? 'green' : 'blue'}>{tk.status}</StatusPill>
                    </li>))}
                </ul>)}
            </Section>
          </div>
        </>
      )}
    </div>
  );
};

export default TradeDashboard;
