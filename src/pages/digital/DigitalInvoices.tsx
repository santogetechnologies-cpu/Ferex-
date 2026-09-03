import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, Plus, Eye, X, CheckCircle2, Trash2, Printer } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalInvoices, createDigitalInvoice, updateDigitalInvoiceStatus, deleteDigitalInvoice, getDigitalClients } from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

export const DigitalInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  const [newInv, setNewInv] = useState({
    client_id: '',
    client_name: '',
    invoice_no: `INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`,
    amount: 350000,
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    status: 'Sent'
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, clientData] = await Promise.all([
        getDigitalInvoices(),
        getDigitalClients()
      ]);
      setClients(clientData);

      if (Array.isArray(invData) && invData.length > 0) {
        setInvoices(invData);
      } else {
        setInvoices([
          { id: '1', invoice_no: 'INV-DIG-8810', client: { company_name: 'Nexus FinTech Global' }, amount: 450000, tax_amount: 81000, status: 'Paid', due_date: '2026-09-15', issued_at: '2026-09-01' },
          { id: '2', invoice_no: 'INV-DIG-8811', client: { company_name: 'Starlight E-Commerce Brands' }, amount: 280000, tax_amount: 50400, status: 'Sent', due_date: '2026-09-20', issued_at: '2026-09-02' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_invoices')
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
      client_id: newInv.client_id || (clients.length > 0 ? clients[0].id : undefined),
      client_name: newInv.client_name || (clients.length > 0 ? clients[0].company_name : 'Nexus FinTech Global'),
      invoice_no: newInv.invoice_no,
      amount: Number(newInv.amount),
      due_date: newInv.due_date,
      status: newInv.status
    });
    setShowAddModal(false);
    showToast(`Invoice ${newInv.invoice_no} issued!`);
    setNewInv({ client_id: '', client_name: '', invoice_no: `INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`, amount: 350000, due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], status: 'Sent' });
    await loadData();
  };

  const handleTogglePaid = async (inv: any) => {
    const nextStatus = inv.status === 'Paid' ? 'Sent' : 'Paid';
    await updateDigitalInvoiceStatus(inv.id, nextStatus);
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: nextStatus } : i));
    showToast(`Invoice ${inv.invoice_no || inv.id} status updated to ${nextStatus}`);
  };

  const handleDelete = async (id: string) => {
    await deleteDigitalInvoice(id);
    setInvoices(prev => prev.filter(i => i.id !== id));
    showToast('Invoice deleted');
  };

  const filtered = invoices.filter(i => {
    return (i.invoice_no || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.client?.company_name || '').toLowerCase().includes(search.toLowerCase());
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
            <FileText className="w-5 h-5 text-[#6A1B2E]" /> Agency B2B Invoices & Financial Billing
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Retainer billing, GST tax invoices, due dates, and payment settlement confirmation.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Issue Tax Invoice
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice # or client..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">{filtered.length} Invoices</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading invoice records...</div>
      ) : (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                  <th className="py-3 px-4">Invoice # & Client</th>
                  <th className="py-3 px-4">Taxable Amount (₹)</th>
                  <th className="py-3 px-4">GST (18%)</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      <div>{inv.client?.company_name || 'Enterprise Client'}</div>
                      <span className="text-[10px] font-bold text-slate-400">{inv.invoice_no || inv.id}</span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900">₹{Number(inv.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-500">₹{Number(inv.tax_amount || Math.round((Number(inv.amount) || 0) * 0.18)).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-500">{inv.due_date || 'Net 15'}</td>
                    <td className="py-3.5 px-4">
                      <button onClick={() => handleTogglePaid(inv)} className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border cursor-pointer ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {inv.status || 'Sent'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedInvoice(inv)} className="p-1.5 text-slate-400 hover:text-slate-800 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(inv.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
                <h3 className="text-sm font-black text-slate-900">Issue Tax Invoice</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Invoice Number</label>
                  <input type="text" required value={newInv.invoice_no} onChange={(e) => setNewInv({ ...newInv, invoice_no: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Client</label>
                  {clients.length > 0 ? (
                    <select value={newInv.client_id} onChange={(e) => setNewInv({ ...newInv, client_id: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={newInv.client_name} onChange={(e) => setNewInv({ ...newInv, client_name: e.target.value })} placeholder="Nexus FinTech Global" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Amount (₹ INR)</label>
                    <input type="number" required value={newInv.amount} onChange={(e) => setNewInv({ ...newInv, amount: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Due Date</label>
                    <input type="date" value={newInv.due_date} onChange={(e) => setNewInv({ ...newInv, due_date: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Generate Invoice</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Invoice Viewer Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setSelectedInvoice(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Tax Invoice {selectedInvoice.invoice_no}</h3>
                <button onClick={() => setSelectedInvoice(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-slate-900">{selectedInvoice.client?.company_name || 'Enterprise Client'}</h4>
                    <span className="text-[10px] text-slate-500 block">Due Date: {selectedInvoice.due_date || 'Net 15'}</span>
                  </div>
                  <span className="font-black text-lg text-emerald-700">₹{Number(selectedInvoice.amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Base Digital Engineering Fee:</span>
                    <span className="font-bold text-slate-900">₹{Number(selectedInvoice.amount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>CGST + SGST (18%):</span>
                    <span className="font-bold text-slate-900">₹{Number(selectedInvoice.tax_amount || Math.round(selectedInvoice.amount * 0.18)).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-1 font-black text-slate-900 text-sm">
                    <span>Total Invoiced (INR):</span>
                    <span className="text-[#6A1B2E]">₹{(Number(selectedInvoice.amount) + Number(selectedInvoice.tax_amount || Math.round(selectedInvoice.amount * 0.18))).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => { window.print(); }}>
                    <Printer className="w-3.5 h-3.5 mr-1" /> Print Invoice
                  </Button>
                  <Button type="button" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => setSelectedInvoice(null)}>Close</Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
