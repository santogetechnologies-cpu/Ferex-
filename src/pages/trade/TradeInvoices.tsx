import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, Search, Download, Eye, Plus, X, CheckCircle2, Trash2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradeInvoices, createTradeInvoice, updateTradeInvoiceStatus, deleteTradeInvoice, getTradeCRMContacts } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradeInvoices: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInv, setSelectedInv] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toast, setToast] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [crmPartners, setCrmPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [data, partners] = await Promise.all([
        getTradeInvoices(),
        getTradeCRMContacts().catch(() => [])
      ]);
      if (Array.isArray(partners)) {
        setCrmPartners(partners);
      }
      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => ({
          id: d.invoice_no || d.id,
          rawId: d.id,
          buyer: d.buyer_name,
          incoterms: d.incoterms || 'FOB',
          rawAmount: Number(d.amount),
          amount: `₹${Number(d.amount).toLocaleString('en-IN')}`,
          dueDate: d.due_date || '2026-09-28',
          issueDate: d.issue_date || '2026-09-01',
          paymentTerms: d.payment_terms || 'Letter of Credit (LC) at Sight',
          status: d.status || d.payment_status || 'Issued',
          statusBadge: (d.status === 'Paid' || d.payment_status === 'Paid')
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : (d.status === 'Cancelled')
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-amber-50 text-amber-700 border-amber-200',
        }));
        setInvoices(formatted);
      } else {
        setInvoices([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_trade_invoices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_invoices' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_invoices_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_invoices_change', handleLocalChange);
    };
  }, [loadData]);

  const initialInv = {
    buyer: '',
    incoterms: 'CIF Rotterdam',
    amount: '',
    dueDate: '',
    paymentTerms: 'Letter of Credit (LC) at Sight'
  };

  const [newInv, setNewInv] = useState(initialInv);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInv.buyer) return;
    const numAmount = parseFloat(newInv.amount.replace(/[^0-9.]/g, '')) || 0;
    const created = await createTradeInvoice({
      buyer_name: newInv.buyer,
      incoterms: newInv.incoterms,
      amount: numAmount,
      currency: 'INR',
      due_date: newInv.dueDate,
      payment_terms: newInv.paymentTerms,
    });
    setShowCreateModal(false);
    showToastMsg(`Created Trade Invoice ${created.invoice_no || created.id}`);
    setNewInv(initialInv);
    await loadData();
  };

  const handleStatusChange = async (id: string, rawId: string, newStatus: string) => {
    try {
      await updateTradeInvoiceStatus(rawId || id, newStatus);
      showToastMsg(`Invoice status updated to ${newStatus}`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error updating invoice status: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteInvoice = async (id: string, rawId?: string) => {
    try {
      await deleteTradeInvoice(rawId || id);
      setInvoices(prev => prev.filter(i => i.id !== id && i.rawId !== rawId));
      showToastMsg(`Removed invoice record ${id}`);
    } catch (err: any) {
      showToastMsg(`Error deleting invoice: ${err.message || 'Unknown error'}`);
    }
  };

  const filteredInvoices = invoices.filter(i =>
    (i.buyer || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#58051E]" /> Commercial Invoices & Export Billing
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Trade Console • International commercial invoice generation, customs tax codes, and export billing.
          </p>
        </div>
        <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold cursor-pointer" onClick={() => { setNewInv(initialInv); setShowCreateModal(true); }}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Commercial Invoice
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search buyer or invoice ID..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredInvoices.length} Invoices Listed</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading commercial invoices from database...</div>
      ) : filteredInvoices.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No commercial invoices found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No invoices match your search query.' : 'There are no active invoices recorded in Supabase. Create your first invoice below.'}
          </p>
          <Button size="sm" className="mt-4 bg-[#58051E] hover:bg-[#430316] text-xs font-bold cursor-pointer" onClick={() => { setNewInv(initialInv); setShowCreateModal(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Create Commercial Invoice
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                  <th className="py-3 px-4">Invoice # & Buyer</th>
                  <th className="py-3 px-4">Incoterms</th>
                  <th className="py-3 px-4">Invoice Amount</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      <div>{inv.buyer}</div>
                      <span className="text-[10px] font-bold text-slate-400">{inv.id}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{inv.incoterms}</td>
                    <td className="py-3.5 px-4 font-black text-slate-900">{inv.amount}</td>
                    <td className="py-3.5 px-4 text-[11px] font-bold text-slate-600">{inv.paymentTerms}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv.id, inv.rawId, e.target.value)}
                        className={`text-[10px] font-extrabold rounded-full px-2.5 py-1 border cursor-pointer ${
                          inv.status === 'Paid & Settled'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : inv.status === 'Pending Payment'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        <option value="Paid & Settled">Paid & Settled</option>
                        <option value="Pending Payment">Pending Payment</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Overdue">Overdue</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setSelectedInv(inv)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" title="Inspect Invoice">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteInvoice(inv.id, inv.rawId)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer" title="Delete Invoice">
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

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Create Commercial Trade Invoice</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateInvoice} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Buyer / Consignee Name</label>
                  <input
                    type="text"
                    required
                    list="crm-invoice-buyers"
                    value={newInv.buyer}
                    onChange={(e) => setNewInv({ ...newInv, buyer: e.target.value })}
                    placeholder="e.g. Baltic Grain Sp. z o.o. or Warsaw Global Logistics"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                  <datalist id="crm-invoice-buyers">
                    {crmPartners.map((p) => (
                      <option key={p.id} value={p.company_name || p.name}>
                        {p.category ? `${p.company_name || p.name} (${p.category} - ${p.country || 'Europe'})` : p.company_name || p.name}
                      </option>
                    ))}
                    <option value="Baltic Grain Sp. z o.o." />
                    <option value="Rotterdam Agri Importers B.V." />
                    <option value="Hamburg Maritime Trade GmbH" />
                  </datalist>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Incoterms</label>
                    <select value={newInv.incoterms} onChange={(e) => setNewInv({ ...newInv, incoterms: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]">
                      <option value="FOB Gdansk">FOB Gdansk</option>
                      <option value="CIF Rotterdam">CIF Rotterdam</option>
                      <option value="DDP Antwerp">DDP Antwerp</option>
                      <option value="CFR Hamburg">CFR Hamburg</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Invoice Value (₹ INR)</label>
                    <input type="text" required value={newInv.amount} onChange={(e) => setNewInv({ ...newInv, amount: e.target.value })} placeholder="e.g. 4250000" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Terms</label>
                    <input type="text" value={newInv.paymentTerms} onChange={(e) => setNewInv({ ...newInv, paymentTerms: e.target.value })} placeholder="e.g. LC at Sight" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Due Date</label>
                    <input type="date" value={newInv.dueDate} onChange={(e) => setNewInv({ ...newInv, dueDate: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]" />
                  </div>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold cursor-pointer" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316] cursor-pointer">Generate Invoice</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Invoice Drawer Preview */}
      <AnimatePresence>
        {selectedInv && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedInv(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Commercial Invoice Document</h3>
                <button onClick={() => setSelectedInv(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-black text-[#58051E] uppercase">{selectedInv.id}</span>
                  <h4 className="text-base font-black text-slate-900">{selectedInv.buyer}</h4>
                  <p className="text-xs font-semibold text-slate-500">Incoterms: {selectedInv.incoterms} · Due: {selectedInv.dueDate}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Payable Amount</span>
                  <div className="text-xl font-black text-slate-900">{selectedInv.amount}</div>
                  <div className="text-[11px] font-semibold text-slate-500 pt-1">Terms: {selectedInv.paymentTerms}</div>
                </div>

                <div className="space-y-2 pt-2">
                  <Button size="sm" className="w-full text-xs font-bold bg-[#58051E] hover:bg-[#430316] cursor-pointer" onClick={() => window.print()}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Print / Save Commercial Invoice PDF
                  </Button>
                  <Button size="sm" variant="outline" className="w-full text-xs font-bold" onClick={() => setSelectedInv(null)}>
                    Close Inspector
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
