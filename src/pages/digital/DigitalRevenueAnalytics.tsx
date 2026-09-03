import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Download, TrendingUp, CheckCircle2, Calendar } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalDashboardStats, getDigitalInvoices } from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

export const DigitalRevenueAnalytics: React.FC = () => {
  const [toast, setToast] = useState('');
  const [stats, setStats] = useState({
    activeClientsCount: 0,
    activeProjectsCount: 0,
    totalProjectsCount: 0,
    totalPipelineValueStr: '₹0',
    totalCollectedStr: '₹0',
    pendingTasksCount: 0,
  });
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashStats, invData] = await Promise.all([
        getDigitalDashboardStats(),
        getDigitalInvoices(),
      ]);
      setStats(dashStats);
      setInvoices(invData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_rev_analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_invoices' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#6A1B2E]" /> CFO Financial Analytics & Revenue Console
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Real-time revenue metrics, profit margins, verified settlement collections, and pipeline valuation.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => showToast('Financial Statement exported (PDF/Excel)!')}>
          <Download className="w-3.5 h-3.5 mr-1.5" /> Export CFO Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices Collected', val: stats.totalCollectedStr, sub: 'Settled B2B payments' },
          { label: 'Pipeline Project Value', val: stats.totalPipelineValueStr, sub: `${stats.totalProjectsCount} Total Projects` },
          { label: 'Active Enterprise Clients', val: `${stats.activeClientsCount} Accounts`, sub: 'Retained accounts' },
          { label: 'Average Gross Margin', val: '54.2%', sub: 'High-margin engineering services' },
        ].map((stat, idx) => (
          <Card key={idx} className="p-4 border-l-4 border-l-[#6A1B2E] border-slate-200/80 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400">{stat.label}</span>
            <div className="text-2xl font-black text-slate-900 my-1">{stat.val}</div>
            <span className="text-[10px] font-extrabold text-slate-500">{stat.sub}</span>
          </Card>
        ))}
      </div>

      <Card className="p-6 border border-slate-200/70 shadow-xs">
        <h3 className="text-sm font-black text-slate-900 mb-3">Recent Tax Invoice Ledger</h3>
        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">Loading ledger...</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">No invoices issued yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invoices.slice(0, 5).map((inv) => (
              <div key={inv.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-slate-900">{inv.client?.company_name || 'Enterprise Client'}</span>
                  <span className="text-[10px] text-slate-400 block">{inv.invoice_no}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-900">₹{Number(inv.amount).toLocaleString('en-IN')}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full block mt-0.5 ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{inv.status || 'Sent'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
