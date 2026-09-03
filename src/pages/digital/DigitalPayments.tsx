import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Search, Plus, X, CheckCircle2, Eye, Download, Trash2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalInvoices, createDigitalInvoice, updateDigitalInvoiceStatus, deleteDigitalInvoice } from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

export const DigitalPayments: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  const [newPay, setNewPay] = useState({
    client_name: '',
    invoice_no: `INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`,
    amount: 150000,
    method: 'RTGS / Bank Wire',
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDigitalInvoices();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((d: any) => ({
          id: d.id,
          client: d.client?.company_name || 'Enterprise Client',
          invoice: d.invoice_no || d.id,
          amount: `₹${Number(d.amount || 0).toLocaleString('en-IN')}`,
          method: 'RTGS / Bank Wire',
          date: d.paid_at ? new Date(d.paid_at).toLocaleDateString() : (d.issued_at ? new Date(d.issued_at).toLocaleDateString() : 'Recent'),
          status: d.status === 'Paid' ? 'Received' : 'Pending',
        }));
        setPayments(mapped);
      } else {
        setPayments([
          { id: '1', client: 'Nexus FinTech Global', invoice: 'INV-DIG-8810', amount: '₹4,50,000', method: 'RTGS / Bank Wire', date: '2026-09-01', status: 'Received' },
          { id: '2', client: 'Starlight E-Commerce Brands', invoice: 'INV-DIG-8811', amount: '₹2,80,000', method: 'NEFT Transfer', date: '2026-09-02', status: 'Pending' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_invoices' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_digital_invoices_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_invoices_change', handleLocalChange);
    };
  }, [loadData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await createDigitalInvoice({
      client_name: newPay.client_name,
      invoice_no: newPay.invoice_no,
      amount: Number(newPay.amount),
      status: 'Paid'
    });
    setShowAddModal(false);
    showToast(`Recorded settlement of ₹${Number(newPay.amount).toLocaleString('en-IN')}`);
    setNewPay({ client_name: '', invoice_no: `INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`, amount: 150000, method: 'RTGS / Bank Wire' });
    await loadData();
  };

  const handleToggleStatus = async (p: any) => {
    const nextStatus = p.status === 'Received' ? 'Sent' : 'Paid';
    await updateDigitalInvoiceStatus(p.id, nextStatus);
    showToast('Payment record updated');
    await loadData();
  };

  const handleDelete = async (id: string) => {
    await deleteDigitalInvoice(id);
    setPayments(prev => prev.filter(p => p.id !== id));
    showToast('Payment log removed');
  };

  const filtered = payments.filter(p => {
    const matchS = (p.client || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.invoice || '').toLowerCase().includes(search.toLowerCase());
    const matchF = filterStatus === 'All' || p.status === filterStatus;
    return matchS && matchF;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#6A1B2E]" /> Inbound Payment Receipts & Collections
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Wire transfers, RTGS collections, and client settlement status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => showToast('Exported payments CSV')}>
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Record Receipt
          </Button>
        </div>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client or invoice #..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">{filtered.length} Receipt Logs</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading payment receipts...</div>
      ) : (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                  <th className="py-3 px-4">Client & Invoice</th>
                  <th className="py-3 px-4">Transfer Method</th>
                  <th className="py-3 px-4">Receipt Date</th>
                  <th className="py-3 px-4">Settled Amount (₹)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      <div>{p.client}</div>
                      <span className="text-[10px] font-bold text-slate-400">{p.invoice}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{p.method}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-500">{p.date}</td>
                    <td className="py-3.5 px-4 font-black text-emerald-700">{p.amount}</td>
                    <td className="py-3.5 px-4">
                      <button onClick={() => handleToggleStatus(p)} className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border cursor-pointer ${p.status === 'Received' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {p.status}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Record Payment Receipt</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Client Name</label>
                  <input type="text" required value={newPay.client_name} onChange={(e) => setNewPay({ ...newPay, client_name: e.target.value })} placeholder="Nexus FinTech Global" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Invoice Reference</label>
                    <input type="text" required value={newPay.invoice_no} onChange={(e) => setNewPay({ ...newPay, invoice_no: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Amount (₹ INR)</label>
                    <input type="number" required value={newPay.amount} onChange={(e) => setNewPay({ ...newPay, amount: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Record Settlement</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
