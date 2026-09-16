import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Search, Plus, CheckCircle2, Download, Trash2, X, Printer,
  Receipt, Eye, FolderKanban, Building2, ChevronLeft, ChevronRight, CheckCircle, Clock, Filter
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getDigitalInvoices,
  createDigitalInvoice,
  updateDigitalInvoiceStatus,
  deleteDigitalInvoice,
  getDigitalProjects,
  getDigitalClients
} from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDigitalPermissions } from '../../hooks/usePermissions';

export const DigitalPayments: React.FC = () => {
  const { profile } = useAuth();
  const { isAdmin, isStaff, isCentral, canDelete } = useDigitalPermissions();

  const [payments, setPayments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [toast, setToast] = useState('');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [newPay, setNewPay] = useState({
    client_id: '',
    client_name: '',
    project_id: '',
    invoice_no: `INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`,
    amount: 150000,
    payment_type: 'Advance' as 'Advance' | 'Milestone' | 'Full',
    method: 'RTGS / Bank Wire',
    notes: ''
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, projData, clientData] = await Promise.all([
        getDigitalInvoices(),
        getDigitalProjects(),
        getDigitalClients()
      ]);

      setProjects(projData || []);
      setClients(clientData || []);

      if (Array.isArray(invData) && invData.length > 0) {
        const mapped = invData.map((d: any) => {
          const matchedProj = (projData || []).find((p: any) => p.id === d.project_id) || d.project;
          // Detect payment type from note or custom attribute
          let pType: 'Advance' | 'Milestone' | 'Full' = d.payment_type || 'Milestone';
          if (!d.payment_type && d.notes) {
            if (d.notes.toLowerCase().includes('advance')) pType = 'Advance';
            else if (d.notes.toLowerCase().includes('full')) pType = 'Full';
          }

          const baseAmt = Number(d.amount || 0);
          const taxAmt = Number(d.tax_amount || Math.round(baseAmt * 0.18));
          const totalSettled = baseAmt + taxAmt;

          return {
            id: d.id,
            client_id: d.client_id,
            client: d.client?.company_name || d.client?.name || 'Enterprise Client',
            project_id: d.project_id || matchedProj?.id,
            project_title: matchedProj?.title || d.project?.title || 'Consolidated Scope',
            invoice: d.invoice_no || d.id,
            payment_type: pType,
            amountRaw: baseAmt,
            amount: `₹${baseAmt.toLocaleString('en-IN')}`,
            taxAmountRaw: taxAmt,
            taxAmount: `₹${taxAmt.toLocaleString('en-IN')}`,
            totalSettled: `₹${totalSettled.toLocaleString('en-IN')}`,
            method: d.method || 'RTGS / Bank Wire',
            date: d.paid_at ? new Date(d.paid_at).toLocaleDateString() : (d.issued_at ? new Date(d.issued_at).toLocaleDateString() : 'Recent'),
            status: d.status === 'Paid' ? 'Received' : 'Pending',
            notes: d.notes || ''
          };
        });
        setPayments(mapped);
      } else {
        setPayments([]);
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
    window.addEventListener('ferex_digital_projects_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_invoices_change', handleLocalChange);
      window.removeEventListener('ferex_digital_projects_change', handleLocalChange);
    };
  }, [loadData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin && !isCentral) return;

    const matchedClient = clients.find(c => c.id === newPay.client_id) || clients[0];
    const clientName = matchedClient ? (matchedClient.company_name || matchedClient.name) : newPay.client_name;

    await createDigitalInvoice({
      client_id: newPay.client_id || matchedClient?.id,
      client_name: clientName,
      project_id: newPay.project_id || undefined,
      invoice_no: newPay.invoice_no,
      amount: Number(newPay.amount),
      status: 'Paid',
      notes: `Settled via ${newPay.method} • Payment Type: ${newPay.payment_type}. ${newPay.notes || ''}`
    });

    setShowAddModal(false);
    showToast(`Recorded settlement of ₹${Number(newPay.amount).toLocaleString('en-IN')}`);
    setNewPay({
      client_id: '',
      client_name: '',
      project_id: '',
      invoice_no: `INV-DIG-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: 150000,
      payment_type: 'Advance',
      method: 'RTGS / Bank Wire',
      notes: ''
    });
    await loadData();
  };

  const handleToggleStatus = async (p: any) => {
    if (!isAdmin && !isCentral) return;
    try {
      const nextStatus = p.status === 'Received' ? 'Sent' : 'Paid';
      await updateDigitalInvoiceStatus(p.id, nextStatus);
      showToast('Payment record updated');
      await loadData();
    } catch (err: any) {
      showToast(`Error updating payment status: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    try {
      await deleteDigitalInvoice(id);
      setPayments(prev => prev.filter(p => p.id !== id));
      showToast('Payment log removed');
    } catch (err: any) {
      showToast(`Error deleting payment: ${err.message || 'Unknown error'}`);
    }
  };

  const handleExportCSV = () => {
    if (!isAdmin && !isCentral) return;
    const headers = ['Client,Project,Payment Type,Invoice No,Method,Settled Date,Base Amount,Status\n'];
    const rows = filtered.map(p => `"${p.client}","${p.project_title}","${p.payment_type}","${p.invoice}","${p.method}","${p.date}","${p.amount}","${p.status}"\n`);
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ferex_Digital_Payments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Exported payments CSV successfully');
  };

  // Staff Isolation: Determine assigned project IDs
  const myName = (profile?.full_name || '').toLowerCase();
  const myEmail = (profile?.email || '').toLowerCase();
  const myAssignedProjectIds = new Set(
    projects
      .filter(p => {
        const staffId = p.assigned_staff_id || '';
        const staffName = (p.assigned_staff_name || '').toLowerCase();
        return staffId === profile?.id ||
          (myName && staffName.includes(myName)) ||
          (myEmail && (staffName.includes(myEmail.split('@')[0]) || staffName.includes('pm')));
      })
      .map(p => p.id)
  );

  const filtered = payments.filter(p => {
    const matchSearch =
      (p.client || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.project_title || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.invoice || '').toLowerCase().includes(search.toLowerCase());

    const matchProject = projectFilter === 'All' || p.project_id === projectFilter;
    const matchType = typeFilter === 'All' || p.payment_type === typeFilter;

    // Staff confidentiality: Staff only see payments linked to their assigned projects
    if (isStaff) {
      if (!p.project_id || !myAssignedProjectIds.has(p.project_id)) {
        return false;
      }
    }

    return matchSearch && matchProject && matchType;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const clientProjects = projects.filter(p => !newPay.client_id || p.client_id === newPay.client_id);

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#58051E]" />
            {isStaff ? 'My Project Payment Milestones & Receipts' : 'Inbound Payment Receipts & Collections'}
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {isStaff
              ? 'Settlements, milestone payouts, and verified wire transfers for your assigned client projects.'
              : 'Ferex Digital ERP • Wire transfers, RTGS collections, Advance / Milestone / Full settlements, and downloadable tax receipts.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(isAdmin || isCentral) && (
            <>
              <Button size="sm" variant="outline" className="text-xs font-bold border-slate-200" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-1.5 text-[#58051E]" /> Export CSV
              </Button>
              <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> Record Receipt
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter & Control Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search client, project, or invoice #..."
              className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => { setProjectFilter(e.target.value); setCurrentPage(1); }}
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="All">All Projects</option>
              {(isStaff ? projects.filter(p => myAssignedProjectIds.has(p.id)) : projects).map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>

            {/* Payment Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="All">All Payment Types</option>
              <option value="Advance">Advance Payout</option>
              <option value="Milestone">Milestone Payout</option>
              <option value="Full">Full Settlement</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-slate-400 pt-1 border-t border-slate-100">
          <span>{filtered.length} Receipt Logs available</span>
          <span className="text-[11px] text-slate-500 font-semibold">Project-linked financial verification</span>
        </div>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading payment receipts...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">
            {isStaff ? 'No payment milestones found for your assigned projects.' : 'No receipts matched your search or filters.'}
          </p>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                    <th className="py-3 px-4">Client & Invoice</th>
                    <th className="py-3 px-4">Linked Project</th>
                    <th className="py-3 px-4">Payment Type</th>
                    <th className="py-3 px-4">Transfer Method</th>
                    <th className="py-3 px-4">Receipt Date</th>
                    <th className="py-3 px-4">Settled Amount (₹)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {paginated.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        <div>{p.client}</div>
                        <span className="text-[10px] font-bold text-slate-400 font-mono">{p.invoice}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <FolderKanban className="w-3.5 h-3.5 text-[#58051E] shrink-0" />
                          <span className="truncate max-w-xs">{p.project_title}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                          p.payment_type === 'Advance'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : p.payment_type === 'Milestone'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {p.payment_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-600">{p.method}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-500">{p.date}</td>
                      <td className="py-3.5 px-4 font-black text-emerald-700">{p.amount}</td>
                      <td className="py-3.5 px-4">
                        {(isAdmin || isCentral) ? (
                          <button onClick={() => handleToggleStatus(p)} className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border cursor-pointer ${p.status === 'Received' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {p.status}
                          </button>
                        ) : (
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${p.status === 'Received' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {p.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setSelectedReceipt(p)} className="p-1.5 text-[#58051E] hover:bg-[#58051E]/10 rounded-lg" title="View & Download Bill Receipt">
                            <Eye className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button onClick={() => handleDelete(p.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-500 pt-2">
            <div className="flex items-center gap-2">
              <span>Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} receipts</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="h-8 px-3 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <span className="px-2 font-mono text-slate-700">Page {currentPage} of {totalPages}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="h-8 px-3 text-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (isAdmin || isCentral) && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Record Project Payment Receipt</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Client *</label>
                  <select
                    required
                    value={newPay.client_id}
                    onChange={(e) => setNewPay({ ...newPay, client_id: e.target.value, project_id: '' })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Linked Project *</label>
                  <select
                    required
                    value={newPay.project_id}
                    onChange={(e) => setNewPay({ ...newPay, project_id: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="">-- Select Project --</option>
                    {clientProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Type</label>
                    <select
                      value={newPay.payment_type}
                      onChange={(e) => setNewPay({ ...newPay, payment_type: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="Advance">Advance</option>
                      <option value="Milestone">Milestone</option>
                      <option value="Full">Full</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Settlement Method</label>
                    <select
                      value={newPay.method}
                      onChange={(e) => setNewPay({ ...newPay, method: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="RTGS / Bank Wire">RTGS / Bank Wire</option>
                      <option value="UPI / Online">UPI / Online</option>
                      <option value="Stripe Gateway">Stripe Gateway</option>
                      <option value="Cheque / Draft">Cheque / Draft</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Invoice Reference</label>
                    <input type="text" required value={newPay.invoice_no} onChange={(e) => setNewPay({ ...newPay, invoice_no: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Base Amount (₹ INR)</label>
                    <input type="number" required value={newPay.amount} onChange={(e) => setNewPay({ ...newPay, amount: Number(e.target.value) })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Settlement Notes</label>
                  <textarea
                    rows={2}
                    value={newPay.notes}
                    onChange={(e) => setNewPay({ ...newPay, notes: e.target.value })}
                    placeholder="Milestone verification or transaction ref number..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Record Settlement</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Receipt Voucher Modal */}
      <AnimatePresence>
        {selectedReceipt && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setSelectedReceipt(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Official Payment Settlement Receipt</h3>
                    <p className="text-[11px] font-semibold text-slate-500">FEREX DIGITAL PRIVATE LIMITED</p>
                  </div>
                </div>
                <button onClick={() => setSelectedReceipt(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl space-y-3 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Received From</span>
                    <span className="font-black text-slate-900 text-sm">{selectedReceipt.client}</span>
                    <span className="text-slate-500 block text-[11px] mt-0.5 font-bold">Project: {selectedReceipt.project_title}</span>
                    <span className="text-slate-400 block text-[10px] font-mono">Invoice Ref: {selectedReceipt.invoice}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Receipt Date</span>
                    <span className="font-bold text-slate-700">{selectedReceipt.date}</span>
                    <div className="mt-1 flex items-center justify-end gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-100 text-purple-800">
                        {selectedReceipt.payment_type}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                        Verified
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>Base Digital Milestone Fee:</span>
                    <span className="font-bold text-slate-900">{selectedReceipt.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (CGST + SGST @ 18%):</span>
                    <span className="font-bold text-slate-900">{selectedReceipt.taxAmount}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-200/80 font-black text-slate-900 text-sm">
                    <span>Total Amount Settled (INR):</span>
                    <span className="text-emerald-700">{selectedReceipt.totalSettled}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5 mr-1" /> Print / Save PDF
                </Button>
                <Button type="button" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]" onClick={() => setSelectedReceipt(null)}>Close</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
