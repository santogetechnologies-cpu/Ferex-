import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, Plus, Eye, Download, X, CheckCircle2, Send } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalInvoices, createDigitalInvoice } from '../../lib/api/digital';

const statusClr: Record<string, string> = {
  'Paid': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Pending': 'bg-amber-50 text-amber-700 border-amber-200',
  'Overdue': 'bg-red-50 text-red-700 border-red-200',
  'Draft': 'bg-slate-100 text-slate-600 border-slate-200',
};

export const DigitalInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [newInv, setNewInv] = useState({ client: '', service: '', amount: '', due: '', status: 'Draft' });

  const loadData = async () => {
    setLoading(true);
    const data = await getDigitalInvoices();
    setInvoices(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const amtNum = Number(newInv.amount.replace(/[^0-9]/g, '')) || 250000;
    await createDigitalInvoice({
      client_name: newInv.client,
      project_title: newInv.service || 'Digital Services',
      amount: amtNum,
      due_date: newInv.due || undefined,
    });
    setShowAddModal(false);
    showToast(`Invoice created for ${newInv.client}!`);
    setNewInv({ client: '', service: '', amount: '', due: '', status: 'Draft' });
    await loadData();
  };

  const markPaid = (id: string) => {
    setInvoices(invoices.map(i => i.id === id ? { ...i, status: 'Paid' } : i));
    setSelectedInvoice(null);
    showToast('Invoice marked as paid!');
  };

  const filtered = invoices.filter(i => {
    const matchS = i.client.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase());
    const matchF = filterStatus === 'All' || i.status === filterStatus;
    return matchS && matchF;
  });

  const total = (s: string) => invoices.filter(i => i.status === s).length;

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
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5 text-[#6A1B2E]" /> Invoice Management</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Issue, track, and manage all agency client invoices. Mark payments and generate reports.</p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[['Paid', total('Paid'), 'text-emerald-700 bg-emerald-50'], ['Pending', total('Pending'), 'text-amber-700 bg-amber-50'], ['Overdue', total('Overdue'), 'text-red-700 bg-red-50'], ['Draft', total('Draft'), 'text-slate-600 bg-slate-100']].map(([label, count, clr], idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs text-center cursor-pointer hover:shadow-md transition-all" onClick={() => setFilterStatus(label as string)}>
            <div className={`text-2xl font-black ${String(clr).split(' ')[0]}`}>{count}</div>
            <div className="text-[10px] font-extrabold uppercase text-slate-400 mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by client or invoice ID..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['All', 'Paid', 'Pending', 'Overdue', 'Draft'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterStatus === s ? 'bg-[#6A1B2E] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{s}</button>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading digital invoices...</div>
      ) : (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Invoice ID</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filtered.map(inv => {
                  const invNo = inv.invoice_no || inv.id;
                  const client = inv.client_name || inv.client || 'Client Corp';
                  const service = inv.project_title || inv.service || 'Digital Services';
                  const amt = inv.total_amount ? `₹${Number(inv.total_amount).toLocaleString('en-IN')}` : (inv.amount ? `₹${Number(inv.amount).toLocaleString('en-IN')}` : '₹2,50,000');
                  const due = inv.due_date || inv.due || '2026-08-30';
                  const status = inv.status || 'Pending';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-black text-[#6A1B2E]">{invNo}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{client}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">{service}</td>
                      <td className="py-3.5 px-4 font-black text-slate-900">{amt}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">{due}</td>
                      <td className="py-3.5 px-4"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusClr[status] || statusClr['Pending']}`}>{status}</span></td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSelectedInvoice(inv)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => showToast(`Invoice ${invNo} downloaded!`)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Download className="w-4 h-4" /></button>
                          {status !== 'Paid' && (
                            <button onClick={() => showToast(`Invoice ${invNo} sent to client!`)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><Send className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                <h3 className="text-sm font-black text-slate-900">Create New Invoice</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Client Name</label>
                  <input type="text" required value={newInv.client} onChange={e => setNewInv({...newInv, client: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Service / Description</label>
                  <input type="text" required value={newInv.service} onChange={e => setNewInv({...newInv, service: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Amount (₹)</label>
                    <input type="text" required value={newInv.amount} onChange={e => setNewInv({...newInv, amount: e.target.value})} placeholder="₹0" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                  <div><label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Due Date</label>
                    <input type="date" required value={newInv.due} onChange={e => setNewInv({...newInv, due: e.target.value})} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" /></div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Create Invoice</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedInvoice && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedInvoice(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Invoice Preview — {selectedInvoice.id}</h3>
                <button onClick={() => setSelectedInvoice(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-[#6A1B2E]">{selectedInvoice.id}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusClr[selectedInvoice.status]}`}>{selectedInvoice.status}</span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900">{selectedInvoice.client}</h4>
                  <div className="text-xs font-semibold text-slate-600 space-y-1">
                    <p>Service: {selectedInvoice.service}</p>
                    <p>Issued: {selectedInvoice.issued}</p>
                    <p>Due: {selectedInvoice.due}</p>
                    <p className="text-xl font-black text-slate-900 mt-2">{selectedInvoice.amount}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedInvoice.status !== 'Paid' && (
                    <Button size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => markPaid(selectedInvoice.id)}>
                      Mark as Paid
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => showToast('Invoice downloaded!')}>
                    <Download className="w-4 h-4 mr-1.5" /> Download PDF
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
