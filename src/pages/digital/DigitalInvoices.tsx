import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Search, Plus, Eye, X, CheckCircle2, Trash2, Printer,
  FolderKanban, Building2, CheckCircle, Clock
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getDigitalInvoices,
  updateDigitalInvoiceStatus,
  deleteDigitalInvoice,
  getDigitalClients,
  getDigitalProjects,
  createDigitalMultiProjectInvoice,
  getDigitalInvoiceItems,
  type MultiProjectInvoiceItem
} from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

export const DigitalInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');

  // Multi-Project Consolidated Invoice Form State
  const [newInvClient, setNewInvClient] = useState('');
  const [newInvNo, setNewInvNo] = useState(`INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`);
  const [newInvDueDate, setNewInvDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [newInvNotes, setNewInvNotes] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<MultiProjectInvoiceItem[]>([
    { projectId: '', projectTitle: 'Core Platform Architecture & UI', description: 'Sprint 1 & Sprint 2 deliverable milestones', amount: 150000 }
  ]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, clientData, projData] = await Promise.all([
        getDigitalInvoices(),
        getDigitalClients(),
        getDigitalProjects()
      ]);
      setClients(clientData || []);
      setAllProjects(projData || []);

      setInvoices(invData || []);
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

  // Set default client when modal opens
  useEffect(() => {
    if (clients.length > 0 && !newInvClient) {
      setNewInvClient(clients[0].id);
    }
  }, [clients, newInvClient]);

  // Add Item row to invoice
  const handleAddItem = () => {
    setInvoiceItems(prev => [
      ...prev,
      { projectId: '', projectTitle: 'Additional Module / Service Milestone', description: 'Detailed deliverable scope', amount: 50000 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (invoiceItems.length <= 1) return;
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof MultiProjectInvoiceItem, value: any) => {
    setInvoiceItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const totalInvoiceAmount = invoiceItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalTaxAmount = Math.round(totalInvoiceAmount * 0.18);
  const grandTotal = totalInvoiceAmount + totalTaxAmount;

  const handleAddMultiInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvClient || invoiceItems.length === 0) return;

    const selectedClientObj = clients.find(c => c.id === newInvClient);

    await createDigitalMultiProjectInvoice({
      client_id: newInvClient,
      client_name: selectedClientObj?.company_name || selectedClientObj?.name || 'Enterprise Client',
      invoice_no: newInvNo,
      due_date: newInvDueDate,
      items: invoiceItems,
      notes: newInvNotes
    });

    setShowAddModal(false);
    showToast(`Issued multi-project invoice ${newInvNo} (₹${grandTotal.toLocaleString('en-IN')})`);
    
    // Reset state
    setNewInvNo(`INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`);
    setNewInvDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setNewInvNotes('');
    setInvoiceItems([
      { projectId: '', projectTitle: 'Core Platform Architecture & UI', description: 'Sprint 1 & Sprint 2 deliverable milestones', amount: 150000 }
    ]);
    await loadData();
  };

  const handleTogglePaid = async (inv: any) => {
    const nextStatus = inv.status === 'Paid' ? 'Sent' : 'Paid';
    await updateDigitalInvoiceStatus(inv.id, nextStatus);
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: nextStatus } : i));
    showToast(`Invoice ${inv.invoice_no || inv.id} marked as ${nextStatus}`);
  };

  const handleDelete = async (id: string) => {
    await deleteDigitalInvoice(id);
    setInvoices(prev => prev.filter(i => i.id !== id));
    showToast('Invoice deleted successfully');
  };

  const filtered = invoices.filter(i => {
    return (i.invoice_no || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.client?.company_name || i.client?.name || '').toLowerCase().includes(search.toLowerCase());
  });

  // Client available projects for dropdown
  const clientAvailableProjects = allProjects.filter(p => p.client_id === newInvClient || p.client?.id === newInvClient);

  return (
    <div className="space-y-6 text-left antialiased max-w-7xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-rose-900/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#6A1B2E]" /> Agency B2B Invoicing & Multi-Project Ledgers
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Consolidated billing across multiple projects for single clients, GST breakdown, and payment reconciliations.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold shadow-md shadow-rose-950/10" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Issue Consolidated Invoice
        </Button>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 border border-slate-200/80 bg-white">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{invoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] font-semibold text-slate-500 mt-0.5 block">{invoices.length} Total Bills Generated</span>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payments Collected</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            ₹{invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (Number(i.amount) || 0), 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 mt-0.5 block flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> {invoices.filter(i => i.status === 'Paid').length} Paid Invoices
          </span>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Receivables</span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            ₹{invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + (Number(i.amount) || 0), 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] font-semibold text-amber-700 mt-0.5 block flex items-center gap-1">
            <Clock className="w-3 h-3" /> {invoices.filter(i => i.status !== 'Paid').length} Awaiting Settlement
          </span>
        </Card>
      </div>

      <Card className="p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, client company..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <span className="text-xs font-bold text-slate-400">{filtered.length} Invoices</span>
      </Card>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading invoice ledgers...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No invoices found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Generate a new consolidated multi-project invoice for your enterprise clients.
          </p>
          <Button size="sm" className="mt-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Issue Consolidated Invoice
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                  <th className="py-3.5 px-4">Invoice # & Client Account</th>
                  <th className="py-3.5 px-4">Taxable Fee (₹)</th>
                  <th className="py-3.5 px-4">GST (18%)</th>
                  <th className="py-3.5 px-4">Total Amount (₹)</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filtered.map((inv) => {
                  const items = inv.items || getDigitalInvoiceItems(inv.id);
                  const baseAmt = Number(inv.amount || 0);
                  const taxAmt = Number(inv.tax_amount || Math.round(baseAmt * 0.18));
                  const total = baseAmt + taxAmt;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#6A1B2E]" />
                          {inv.client?.company_name || inv.client?.name || 'Enterprise Client'}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono font-bold text-slate-400">{inv.invoice_no || inv.id}</span>
                          {items && items.length > 1 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              {items.length} Projects Consolidated
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">₹{baseAmt.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-500">₹{taxAmt.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-black text-[#6A1B2E]">₹{total.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-500">{inv.due_date || 'Net 15'}</td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleTogglePaid(inv)}
                          className={`px-3 py-1 rounded-full text-[10px] font-extrabold border cursor-pointer transition-all ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          {inv.status || 'Sent'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedInvoice({
                                ...inv,
                                items: inv.items || getDigitalInvoiceItems(inv.id)
                              });
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                            title="Inspect Detailed Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* ─── MODAL: ISSUE MULTI-PROJECT CONSOLIDATED INVOICE ─── */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#6A1B2E]" /> Multi-Project Single Client Billing
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    Consolidate multiple active sprints, designs, or apps into a single GST tax invoice.
                  </p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleAddMultiInvoice} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Client</label>
                    <select
                      value={newInvClient}
                      onChange={(e) => setNewInvClient(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Invoice Number</label>
                    <input
                      type="text"
                      required
                      value={newInvNo}
                      onChange={(e) => setNewInvNo(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Due Date</label>
                    <input
                      type="date"
                      required
                      value={newInvDueDate}
                      onChange={(e) => setNewInvDueDate(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Line Items List */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-[#6A1B2E]" /> Project Line Items & Milestones ({invoiceItems.length})
                    </span>
                    <Button type="button" size="sm" variant="outline" className="text-xs font-bold" onClick={handleAddItem}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Project Scope
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {invoiceItems.map((item, index) => (
                      <div key={index} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Item #{index + 1}</span>
                          {invoiceItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-slate-400 hover:text-red-600 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {clientAvailableProjects.length > 0 ? (
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Linked Client Project</label>
                              <select
                                value={item.projectId}
                                onChange={(e) => {
                                  const selectedProj = clientAvailableProjects.find(p => p.id === e.target.value);
                                  handleItemChange(index, 'projectId', e.target.value);
                                  if (selectedProj) handleItemChange(index, 'projectTitle', selectedProj.title);
                                }}
                                className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                              >
                                <option value="">Select Project / Custom Milestone</option>
                                {clientAvailableProjects.map(p => (
                                  <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Project Scope / Milestone</label>
                              <input
                                type="text"
                                required
                                value={item.projectTitle}
                                onChange={(e) => handleItemChange(index, 'projectTitle', e.target.value)}
                                placeholder="e.g. Next.js Web App Redesign"
                                className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Item Amount (INR ₹)</label>
                            <input
                              type="number"
                              required
                              value={item.amount}
                              onChange={(e) => handleItemChange(index, 'amount', Number(e.target.value))}
                              className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Deliverables description (e.g. Sprint 1 UX & Figma token library)"
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calculation Summary */}
                <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs space-y-1.5 font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Taxable Milestone Subtotal:</span>
                    <span className="font-bold text-slate-900">₹{totalInvoiceAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST + SGST (18%):</span>
                    <span className="font-bold text-slate-900">₹{totalTaxAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-black text-slate-900">
                    <span>Consolidated Total Payable:</span>
                    <span className="text-[#6A1B2E]">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Generate & Dispatch Bill</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── INVOICE VIEWER & PRINT MODAL ─── */}
      <AnimatePresence>
        {selectedInvoice && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setSelectedInvoice(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-black text-slate-900">Tax Invoice {selectedInvoice.invoice_no}</h3>
                  <span className="text-[10px] font-bold text-slate-400">Issued by Ferex Digital Agency Suite</span>
                </div>
                <button onClick={() => setSelectedInvoice(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-start">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{selectedInvoice.client?.company_name || selectedInvoice.client?.name || 'Enterprise Client'}</h4>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Due Date: {selectedInvoice.due_date || 'Net 15'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                    <div className={`font-black text-xs px-2.5 py-0.5 rounded-full border ${
                      selectedInvoice.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {selectedInvoice.status || 'Sent'}
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">Consolidated Project Breakdown</span>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {selectedInvoice.items.map((it: any, idx: number) => (
                        <div key={idx} className="p-2.5 flex justify-between items-center bg-white text-xs">
                          <div>
                            <div className="font-bold text-slate-900">{it.projectTitle || it.title}</div>
                            <div className="text-[10px] text-slate-500">{it.description}</div>
                          </div>
                          <span className="font-black text-slate-800">₹{Number(it.amount).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-1.5 text-slate-600 pt-2 border-t border-slate-100">
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
                    <Printer className="w-3.5 h-3.5 mr-1" /> Print Official PDF
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
