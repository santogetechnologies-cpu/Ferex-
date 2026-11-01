import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Search, Plus, CheckCircle2, Download, Trash2, X, Printer,
  Receipt, Eye, FolderKanban, Building2, ChevronDown, ChevronUp, Clock, Filter,
  DollarSign, Shield, AlertCircle, ArrowUpRight, FileText, Check, Layers,
  Calendar, RefreshCw, User, Tag, Split
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getCentralizedBillings,
  getPaymentTransactions,
  recordPaymentTransaction,
  getBillingDocuments,
  issueCreditNote,
  type CentralizedProjectBilling,
  type PaymentPart,
  type ActualPaymentTransaction,
  type PaymentMethodEntry,
  type BillingDocument
} from '../../lib/api/digitalBilling';
import { useAuth } from '../../contexts/AuthContext';
import { useDigitalPermissions } from '../../hooks/usePermissions';

const PAYMENT_METHODS = [
  'UPI',
  'Bank Transfer',
  'Cash',
  'Cheque',
  'Credit/Debit Card',
  'Payment Gateway',
  'RTGS / NEFT',
  'Other'
] as const;

// ─── Receipt PDF Generator ──────────────────────────────────────────────────
function printReceiptPDF(receipt: BillingDocument, transaction?: ActualPaymentTransaction) {
  const methods = receipt.payment_methods || transaction?.payment_methods || [];
  const methodsHtml = methods.map((m, idx) => `
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:10px 8px;font-size:12px;color:#1e293b"><strong>${m.method}</strong></td>
      <td style="padding:10px 8px;font-size:12px;color:#64748b">${m.reference_no || 'N/A'}</td>
      <td style="padding:10px 8px;font-size:12px;color:#64748b">${m.date || receipt.issued_date}</td>
      <td style="padding:10px 8px;text-align:right;font-size:12px;font-weight:700;color:#059669">₹${Number(m.amount || 0).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${receipt.doc_type} — ${receipt.doc_number}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #1e293b; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
  .logo { font-size: 22px; font-weight: 800; color: #58051E; }
  .logo span { color: #94a3b8; font-size: 13px; font-weight: 500; display: block; margin-top: 2px; }
  .meta { text-align: right; }
  .doc-no { font-size: 20px; font-weight: 800; color: #0f172a; }
  .divider { height: 2px; background: linear-gradient(to right, #58051E, #f1f5f9); margin: 20px 0; }
  .label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #f8fafc; padding: 10px 8px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; border-bottom: 2px solid #e2e8f0; }
  .total-box { margin-top: 16px; padding: 14px 18px; background: #ecfdf5; border-radius: 8px; border: 1px solid #a7f3d0; display: flex; justify-content: space-between; align-items: center; }
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">FEREX DIGITAL ERP<br><span>Official Client Financial Services • ${receipt.doc_type}</span></div>
    <div class="meta">
      <div class="doc-no">${receipt.doc_number}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">Date: ${new Date(receipt.issued_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      <div style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:10px;font-weight:700;background:#d1fae5;color:#065f46;margin-top:6px">${receipt.status.toUpperCase()}</div>
    </div>
  </div>

  <div class="divider"></div>

  <div style="display:flex;justify-content:space-between;margin-bottom:24px">
    <div>
      <div class="label">Received From (Client)</div>
      <div style="font-size:16px;font-weight:800;color:#0f172a">${receipt.client_name}</div>
      <div style="font-size:12px;color:#64748b">Project: ${receipt.project_title}</div>
    </div>
    <div style="text-align:right">
      <div class="label">Payment Allocation</div>
      <div style="font-size:13px;font-weight:700;color:#0f172a">${receipt.payment_part_label}</div>
      <div style="font-size:12px;color:#64748b">Issued by: ${receipt.created_by || 'Accounts Desk'}</div>
    </div>
  </div>

  <div style="margin-bottom:24px">
    <div class="label">Payment Methods & Transaction Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Payment Method</th>
          <th>Reference / UTR / Cheque</th>
          <th>Date</th>
          <th style="text-align:right">Amount Settled</th>
        </tr>
      </thead>
      <tbody>
        ${methodsHtml}
      </tbody>
    </table>
    <div class="total-box">
      <div>
        <div style="font-size:11px;font-weight:700;color:#065f46;text-transform:uppercase">Total Actual Money Received</div>
        <div style="font-size:11px;color:#047857">${methods.length} payment method${methods.length !== 1 ? 's' : ''} applied</div>
      </div>
      <span style="font-size:20px;font-weight:800;color:#065f46">₹${Number(receipt.total_settled).toLocaleString('en-IN')}</span>
    </div>
  </div>

  ${receipt.balance_remaining !== undefined ? `
  <div style="padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:12px;font-weight:600;color:#64748b">Remaining Outstanding Balance on Project:</span>
    <span style="font-size:14px;font-weight:800;color:${receipt.balance_remaining > 0 ? '#b45309' : '#059669'}">
      ₹${Number(receipt.balance_remaining).toLocaleString('en-IN')}
    </span>
  </div>
  ` : ''}

  ${receipt.notes ? `
  <div style="padding:10px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px">
    <div class="label">Remarks / Notes</div>
    <p style="font-size:12px;color:#475569">${receipt.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <div>This is a computer-generated financial receipt issued by Ferex Digital ERP.</div>
    <div>Official Seal & Authorized Stamp</div>
  </div>
</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.onload = () => setTimeout(() => win.print(), 500);
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
export const DigitalPayments: React.FC = () => {
  const { profile } = useAuth();
  const { isAdmin } = useDigitalPermissions();

  const [billings, setBillings] = useState<CentralizedProjectBilling[]>([]);
  const [transactions, setTransactions] = useState<ActualPaymentTransaction[]>([]);
  const [documents, setDocuments] = useState<BillingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // View state
  const [activeTab, setActiveTab] = useState<'project_ledger' | 'all_transactions' | 'documents'>('project_ledger');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [expandedParts, setExpandedParts] = useState<Record<string, boolean>>({});

  // Filters
  const [search, setSearch] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState('All');

  // Record Payment Modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordingTarget, setRecordingTarget] = useState<{
    projectId: string;
    partId: string;
  }>({ projectId: '', partId: '' });

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [documentType, setDocumentType] = useState<'Payment Receipt' | 'Tax Invoice'>('Payment Receipt');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentMethodRows, setPaymentMethodRows] = useState<PaymentMethodEntry[]>([
    { id: '1', method: 'UPI', amount: 0, reference_no: '', date: new Date().toISOString().split('T')[0] }
  ]);

  // Document Detail Modal
  const [selectedDoc, setSelectedDoc] = useState<BillingDocument | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);

  // Credit Note Modal
  const [showCreditNoteModal, setShowCreditNoteModal] = useState(false);
  const [creditNoteForm, setCreditNoteForm] = useState({
    docNumber: '',
    projectId: '',
    amount: 0,
    reason: ''
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [bData, tData, dData] = await Promise.all([
        getCentralizedBillings(),
        getPaymentTransactions(),
        getBillingDocuments()
      ]);
      setBillings(bData || []);
      setTransactions(tData || []);
      setDocuments(dData || []);

      // Auto expand first project
      if (bData && bData.length > 0) {
        setExpandedProjects(prev => ({ [bData[0].id]: true, ...prev }));
        if (bData[0].payment_parts && bData[0].payment_parts.length > 0) {
          setExpandedParts(prev => ({ [bData[0].payment_parts[0].id]: true, ...prev }));
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    window.addEventListener('ferex_digital_payments_change', handleSync);
    window.addEventListener('ferex_digital_centralized_billing_change', handleSync);
    window.addEventListener('ferex_digital_projects_change', handleSync);

    return () => {
      window.removeEventListener('ferex_digital_payments_change', handleSync);
      window.removeEventListener('ferex_digital_centralized_billing_change', handleSync);
      window.removeEventListener('ferex_digital_projects_change', handleSync);
    };
  }, [loadData]);

  // Toggle helpers
  const toggleProjectExpand = (id: string) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const togglePartExpand = (id: string) => {
    setExpandedParts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Open record payment modal with preselection
  const openRecordPaymentModal = (projectId?: string, partId?: string) => {
    const defaultProjId = projectId || (billings[0]?.project_id || '');
    const matchedBilling = billings.find(b => b.project_id === defaultProjId) || billings[0];
    const defaultPartId = partId || (matchedBilling?.payment_parts[0]?.id || '');

    setRecordingTarget({
      projectId: defaultProjId,
      partId: defaultPartId
    });

    const targetPart = matchedBilling?.payment_parts.find(p => p.id === defaultPartId);
    const balance = targetPart ? (targetPart.remaining_balance ?? targetPart.configured_amount) : 0;

    setPaymentMethodRows([
      { id: '1', method: 'UPI', amount: balance > 0 ? balance : 0, reference_no: '', date: new Date().toISOString().split('T')[0] }
    ]);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setDocumentType('Payment Receipt');
    setPaymentNotes('');
    setShowRecordModal(true);
  };

  // Multi-method helpers
  const addMethodRow = () => {
    setPaymentMethodRows(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        method: 'Bank Transfer',
        amount: 0,
        reference_no: '',
        date: new Date().toISOString().split('T')[0]
      }
    ]);
  };

  const updateMethodRow = (id: string, updates: Partial<PaymentMethodEntry>) => {
    setPaymentMethodRows(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeMethodRow = (id: string) => {
    if (paymentMethodRows.length <= 1) return;
    setPaymentMethodRows(prev => prev.filter(m => m.id !== id));
  };

  const totalPaymentInModal = paymentMethodRows.reduce((sum, m) => sum + Number(m.amount || 0), 0);

  // Selected target details in modal
  const selectedModalBilling = billings.find(b => b.project_id === recordingTarget.projectId);
  const selectedModalPart = selectedModalBilling?.payment_parts.find(p => p.id === recordingTarget.partId);

  // Handle Recording Payment
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModalBilling || !selectedModalPart) {
      showToast('Please select a valid project and payment part');
      return;
    }

    if (totalPaymentInModal <= 0) {
      showToast('Payment amount must be greater than zero');
      return;
    }

    // Validate that each method has a valid amount
    for (const m of paymentMethodRows) {
      if (Number(m.amount) <= 0) {
        showToast(`Please specify a valid amount for ${m.method}`);
        return;
      }
    }

    try {
      const result = await recordPaymentTransaction({
        project_id: selectedModalBilling.project_id,
        project_title: selectedModalBilling.project_title,
        client_id: selectedModalBilling.client_id,
        client_name: selectedModalBilling.client_name,
        payment_part_id: selectedModalPart.id,
        payment_methods: paymentMethodRows,
        payment_date: paymentDate,
        recorded_by: profile?.full_name || profile?.email || 'Digital Accounts Lead',
        notes: paymentNotes,
        document_type: documentType
      });

      setShowRecordModal(false);
      showToast(`✅ Payment of ₹${totalPaymentInModal.toLocaleString('en-IN')} recorded. Receipt ${result.receipt.doc_number} generated.`);
      await loadData();
    } catch (err: any) {
      showToast(`Payment Error: ${err.message}`);
    }
  };

  // Handle Credit Note
  const handleCreditNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditNoteForm.amount || !creditNoteForm.reason.trim()) {
      showToast('Please provide an amount and documented reason');
      return;
    }
    try {
      const cn = await issueCreditNote({
        originalDocNumber: creditNoteForm.docNumber,
        projectId: creditNoteForm.projectId,
        amount: Number(creditNoteForm.amount),
        reason: creditNoteForm.reason.trim(),
        issuedBy: profile?.full_name || 'Digital Controller'
      });
      setShowCreditNoteModal(false);
      showToast(`Credit Note ${cn.doc_number} issued successfully`);
      await loadData();
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Filtered list of billings / projects
  const filteredBillings = billings.filter(b => {
    const matchSearch =
      b.client_name.toLowerCase().includes(search.toLowerCase()) ||
      b.project_title.toLowerCase().includes(search.toLowerCase()) ||
      b.invoice_no.toLowerCase().includes(search.toLowerCase());
    const matchProj = selectedProjectFilter === 'All' || b.project_id === selectedProjectFilter;
    const matchStatus = selectedStatusFilter === 'All' ||
      (selectedStatusFilter === 'Fully Paid' && b.payment_parts.every(p => p.status === 'paid')) ||
      (selectedStatusFilter === 'Partially Paid' && b.payment_parts.some(p => p.status === 'partially_paid' || p.status === 'paid') && !b.payment_parts.every(p => p.status === 'paid')) ||
      (selectedStatusFilter === 'Unpaid' && b.payment_parts.every(p => p.status === 'unpaid'));
    return matchSearch && matchProj && matchStatus;
  });

  // Filtered transactions for flat list view
  const filteredTransactions = transactions.filter(t => {
    const matchSearch =
      t.client_name.toLowerCase().includes(search.toLowerCase()) ||
      t.project_title.toLowerCase().includes(search.toLowerCase()) ||
      t.receipt_number.toLowerCase().includes(search.toLowerCase());
    const matchProj = selectedProjectFilter === 'All' || t.project_id === selectedProjectFilter;
    const matchMethod = selectedMethodFilter === 'All' || t.payment_methods.some(m => m.method === selectedMethodFilter);
    return matchSearch && matchProj && matchMethod;
  });

  // Overall Financial Stats across all projects
  const overallAgreed = billings.reduce((sum, b) => sum + b.total_agreed_amount, 0);
  const overallReceived = transactions.reduce((sum, t) => sum + t.total_amount, 0);
  const overallOutstanding = Math.max(0, overallAgreed - overallReceived);

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#58051E]/10 text-[#58051E]">
              <CreditCard className="w-5 h-5 text-[#58051E]" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Payment Ledger: Actual Payment Recording
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Milestone payment part settlement, multiple payment methods per transaction & automatic receipt generation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold shadow-sm"
            onClick={() => openRecordPaymentModal()}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Record Payment
          </Button>
        </div>
      </div>

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Agreed Project Value', value: `₹${overallAgreed.toLocaleString('en-IN')}`, icon: Shield, color: 'text-slate-800', bg: 'bg-slate-50' },
          { label: 'Actual Money Received to Date', value: `₹${overallReceived.toLocaleString('en-IN')}`, icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Total Outstanding Balance Due', value: `₹${overallOutstanding.toLocaleString('en-IN')}`, icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50' },
        ].map(stat => (
          <Card key={stat.label} className="p-4 border border-slate-200/70 shadow-xs flex items-center gap-3">
            <div className={`w-11 h-11 ${stat.bg} rounded-xl flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">{stat.label}</p>
              <p className={`text-base font-black ${stat.color}`}>{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Navigation Tabs & Filter Bar */}
      <div className="space-y-3">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('project_ledger')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'project_ledger'
                ? 'border-[#58051E] text-[#58051E]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" /> Project Milestone Ledger
          </button>
          <button
            onClick={() => setActiveTab('all_transactions')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'all_transactions'
                ? 'border-[#58051E] text-[#58051E]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> All Payment Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'documents'
                ? 'border-[#58051E] text-[#58051E]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Receipts & Tax Invoices ({documents.length})
          </button>
        </div>

        {/* Filter Controls */}
        <Card className="p-3 border border-slate-200/70 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by client, project, or receipt..."
              className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
            <select
              value={selectedProjectFilter}
              onChange={e => setSelectedProjectFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="All">All Projects</option>
              {billings.map(b => (
                <option key={b.project_id} value={b.project_id}>{b.project_title}</option>
              ))}
            </select>

            {activeTab === 'project_ledger' && (
              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="All">All Statuses</option>
                <option value="Fully Paid">Fully Paid</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            )}

            {activeTab === 'all_transactions' && (
              <select
                value={selectedMethodFilter}
                onChange={e => setSelectedMethodFilter(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="All">All Payment Methods</option>
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
          </div>
        </Card>
      </div>

      {/* ── TAB 1: PROJECT MILESTONE LEDGER VIEW (USER'S PRIMARY SPEC) ── */}
      {activeTab === 'project_ledger' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 flex justify-center"><div className="w-8 h-8 border-3 border-[#58051E] border-t-transparent rounded-full animate-spin" /></div>
          ) : filteredBillings.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2 border-slate-200">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">No project billing records found matching your filters.</p>
            </Card>
          ) : (
            filteredBillings.map(billing => {
              const projectTxs = transactions.filter(t => t.project_id === billing.project_id);
              const projectReceived = projectTxs.reduce((sum, t) => sum + t.total_amount, 0);
              const projectBalance = Math.max(0, billing.total_agreed_amount - projectReceived);
              const isFullySettled = projectReceived >= billing.total_agreed_amount;
              const isExpanded = !!expandedProjects[billing.id];

              return (
                <Card key={billing.id} className="p-5 border border-slate-200/70 shadow-xs hover:border-slate-300 transition-all">
                  {/* Overall Project Financial Summary */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-black text-[#58051E]">{billing.invoice_no}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isFullySettled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : projectReceived > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isFullySettled ? 'Fully Paid' : projectReceived > 0 ? 'Partially Paid' : 'Unpaid'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{billing.payment_split}-Part Milestone Schedule</span>
                      </div>
                      <h2 className="text-base font-black text-slate-900">{billing.project_title}</h2>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" /> {billing.client_name}
                      </p>
                    </div>

                    {/* Financial Metrics Strip */}
                    <div className="flex items-center gap-4 flex-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">Total Agreed</span>
                        <span className="text-sm font-black text-slate-900">₹{billing.total_agreed_amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-7 w-[1px] bg-slate-200" />
                      <div>
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">Total Received</span>
                        <span className="text-sm font-black text-emerald-700">₹{projectReceived.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-7 w-[1px] bg-slate-200" />
                      <div>
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">Outstanding</span>
                        <span className="text-sm font-black text-amber-700">₹{projectBalance.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold"
                        onClick={() => openRecordPaymentModal(billing.project_id)}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Record Payment
                      </Button>
                      <button
                        onClick={() => toggleProjectExpand(billing.id)}
                        className="p-2 text-slate-400 hover:text-slate-700 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* ── EXPANDABLE PAYMENT PARTS SECTIONS ── */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                        <span>Configured Payment Parts ({billing.payment_parts.length})</span>
                        <span>Actual Payments Recorded</span>
                      </div>

                      {billing.payment_parts.map(part => {
                        const partTxs = projectTxs.filter(t => t.payment_part_id === part.id);
                        const partReceived = partTxs.reduce((sum, t) => sum + t.total_amount, 0);
                        const partBalance = Math.max(0, part.configured_amount - partReceived);
                        const isPartPaid = partReceived >= part.configured_amount;
                        const isPartExpanded = expandedParts[part.id] !== false; // default open

                        return (
                          <div
                            key={part.id}
                            className={`rounded-xl border transition-all ${
                              isPartPaid
                                ? 'bg-emerald-50/20 border-emerald-200'
                                : partReceived > 0
                                ? 'bg-blue-50/20 border-blue-200'
                                : 'bg-slate-50/60 border-slate-200'
                            }`}
                          >
                            {/* Payment Part Section Header */}
                            <div className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => togglePartExpand(part.id)}
                                  className="p-1 rounded-lg hover:bg-slate-200/50 text-slate-500"
                                >
                                  {isPartExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-900">{part.label}</span>
                                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                                      isPartPaid
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : partReceived > 0
                                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                                        : 'bg-amber-100 text-amber-800 border-amber-300'
                                    }`}>
                                      {isPartPaid ? 'Fully Paid' : partReceived > 0 ? 'Partially Paid' : 'Unpaid'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    Milestone: {part.percentage}% • Due: {part.due_date || 'Project Milestone'}
                                  </p>
                                </div>
                              </div>

                              {/* Amount Breakdown for this part */}
                              <div className="flex items-center gap-4 text-xs font-semibold">
                                <div>
                                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Configured</span>
                                  <span className="font-extrabold text-slate-900">₹{part.configured_amount.toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Received</span>
                                  <span className="font-extrabold text-emerald-700">₹{partReceived.toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold uppercase text-slate-400 block">Remaining</span>
                                  <span className="font-extrabold text-amber-700">₹{partBalance.toLocaleString('en-IN')}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[10px] font-bold border-slate-300 hover:bg-white"
                                  onClick={() => openRecordPaymentModal(billing.project_id, part.id)}
                                >
                                  <Plus className="w-3 h-3 mr-1" /> Add Payment
                                </Button>
                              </div>
                            </div>

                            {/* Inside Section: Individual Payment Transactions */}
                            {isPartExpanded && (
                              <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-200/50">
                                {partTxs.length === 0 ? (
                                  <div className="py-3 px-4 bg-white/70 rounded-lg text-center text-xs text-slate-400 font-semibold border border-dashed border-slate-200">
                                    No payment transactions recorded for this part yet. Click "+ Add Payment" above to record funds.
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {partTxs.map((tx, idx) => (
                                      <div
                                        key={tx.id}
                                        className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-black text-slate-900">
                                              Transaction #{idx + 1}: ₹{tx.total_amount.toLocaleString('en-IN')}
                                            </span>
                                            <span className="text-[10px] font-bold text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                                              {tx.receipt_number}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-semibold">
                                              {new Date(tx.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                          </div>

                                          {/* Multiple Payment Methods Breakdown within this single transaction */}
                                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                                            {tx.payment_methods.map((method, mIdx) => (
                                              <span
                                                key={mIdx}
                                                className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1"
                                              >
                                                <Split className="w-2.5 h-2.5 text-slate-400" />
                                                <strong>{method.method}</strong>: ₹{Number(method.amount).toLocaleString('en-IN')}
                                                {method.reference_no && (
                                                  <span className="text-slate-400 font-normal">({method.reference_no})</span>
                                                )}
                                              </span>
                                            ))}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          <button
                                            onClick={() => {
                                              const doc = documents.find(d => d.transaction_id === tx.id || d.doc_number === tx.receipt_number);
                                              if (doc) printReceiptPDF(doc, tx);
                                              else printReceiptPDF({
                                                id: tx.id,
                                                doc_number: tx.receipt_number,
                                                doc_type: tx.document_type || 'Payment Receipt',
                                                project_id: tx.project_id,
                                                project_title: tx.project_title,
                                                client_id: tx.client_id,
                                                client_name: tx.client_name,
                                                payment_part_label: tx.payment_part_label,
                                                amount: tx.total_amount,
                                                tax_amount: 0,
                                                total_settled: tx.total_amount,
                                                payment_methods: tx.payment_methods,
                                                issued_date: tx.payment_date,
                                                status: 'Settled',
                                                balance_remaining: partBalance,
                                                created_at: tx.created_at
                                              }, tx);
                                            }}
                                            className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                                          >
                                            <Printer className="w-3.5 h-3.5" /> PDF Receipt
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB 2: FLAT ALL TRANSACTIONS LEDGER ── */}
      {activeTab === 'all_transactions' && (
        <Card className="border border-slate-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Receipt / ID</th>
                  <th className="p-3">Client & Project</th>
                  <th className="p-3">Payment Part</th>
                  <th className="p-3 text-right">Total Settled</th>
                  <th className="p-3">Payment Methods Breakdown</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                      No payment transactions recorded.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-black text-[#58051E]">{t.receipt_number}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{t.client_name}</div>
                        <div className="text-[11px] text-slate-400">{t.project_title}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">{t.payment_part_label}</td>
                      <td className="p-3 text-right font-black text-emerald-700">₹{t.total_amount.toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap">
                          {t.payment_methods.map((m, i) => (
                            <span key={i} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {m.method}: ₹{Number(m.amount).toLocaleString('en-IN')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">{t.payment_date}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            const doc = documents.find(d => d.transaction_id === t.id);
                            if (doc) printReceiptPDF(doc, t);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── TAB 3: DOCUMENTS ARCHIVE ── */}
      {activeTab === 'documents' && (
        <Card className="border border-slate-200/70 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Document #</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Client & Project</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold">
                      No receipts or tax invoices generated yet.
                    </td>
                  </tr>
                ) : (
                  documents.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-black text-[#58051E]">{d.doc_number}</td>
                      <td className="p-3">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                          d.doc_type === 'Tax Invoice' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          d.doc_type === 'Credit Note' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {d.doc_type}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{d.client_name}</div>
                        <div className="text-[11px] text-slate-400">{d.project_title}</div>
                      </td>
                      <td className="p-3 text-right font-black text-slate-900">₹{d.total_settled.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-slate-500">{d.issued_date}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-bold text-emerald-700">{d.status}</span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => printReceiptPDF(d)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="Print / Download PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {d.doc_type !== 'Credit Note' && (
                            <button
                              onClick={() => {
                                setCreditNoteForm({
                                  docNumber: d.doc_number,
                                  projectId: d.project_id,
                                  amount: d.total_settled,
                                  reason: ''
                                });
                                setShowCreditNoteModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50"
                              title="Issue Credit Note / Correction"
                            >
                              <Split className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── RECORD PAYMENT MODAL (SUPPORTS MULTIPLE METHODS IN ONE TRANSACTION) ── */}
      <AnimatePresence>
        {showRecordModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowRecordModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#58051E]" /> Record Client Payment
                </h3>
                <button onClick={() => setShowRecordModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
                {/* Project & Milestone Part Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Project *</label>
                    <select
                      required
                      value={recordingTarget.projectId}
                      onChange={e => {
                        const newPId = e.target.value;
                        const matched = billings.find(b => b.project_id === newPId);
                        const firstPart = matched?.payment_parts[0];
                        const newBalance = firstPart ? (firstPart.remaining_balance ?? firstPart.configured_amount) : 0;
                        setRecordingTarget({
                          projectId: newPId,
                          partId: firstPart?.id || ''
                        });
                        setPaymentMethodRows([{ id: '1', method: 'UPI', amount: newBalance > 0 ? newBalance : 0, reference_no: '', date: new Date().toISOString().split('T')[0] }]);
                      }}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    >
                      {billings.map(b => (
                        <option key={b.project_id} value={b.project_id}>{b.project_title} ({b.client_name})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Payment Part *</label>
                    <select
                      required
                      value={recordingTarget.partId}
                      onChange={e => {
                        const newPartId = e.target.value;
                        const part = selectedModalBilling?.payment_parts.find(p => p.id === newPartId);
                        const newBalance = part ? (part.remaining_balance ?? part.configured_amount) : 0;
                        setRecordingTarget(prev => ({ ...prev, partId: newPartId }));
                        setPaymentMethodRows([{ id: '1', method: 'UPI', amount: newBalance > 0 ? newBalance : 0, reference_no: '', date: new Date().toISOString().split('T')[0] }]);
                      }}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    >
                      {selectedModalBilling?.payment_parts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.label} (Remaining: ₹{(p.remaining_balance ?? p.configured_amount).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Target Part Context Card */}
                {selectedModalPart && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Milestone Target</span>
                        <span className="font-extrabold text-slate-800">{selectedModalPart.label}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Configured</span>
                        <span className="font-extrabold text-slate-900">₹{selectedModalPart.configured_amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Previously Received</span>
                        <span className="font-extrabold text-emerald-700">₹{(selectedModalPart.amount_received || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Remaining Due</span>
                        <span className="font-extrabold text-amber-700">₹{(selectedModalPart.remaining_balance ?? selectedModalPart.configured_amount).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    {/* Quick fill buttons */}
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Quick Fill:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const remaining = selectedModalPart.remaining_balance ?? selectedModalPart.configured_amount;
                          setPaymentMethodRows([{ ...paymentMethodRows[0], amount: remaining }]);
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"
                      >
                        Pay Full Remaining (₹{(selectedModalPart.remaining_balance ?? selectedModalPart.configured_amount).toLocaleString('en-IN')})
                      </button>
                      {(selectedModalPart.remaining_balance ?? selectedModalPart.configured_amount) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const half = Math.round((selectedModalPart.remaining_balance ?? selectedModalPart.configured_amount) / 2);
                            setPaymentMethodRows([{ ...paymentMethodRows[0], amount: half }]);
                          }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300"
                        >
                          Pay 50% of Remaining
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Date & Document Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Payment Date</label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={e => setPaymentDate(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Document to Issue</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDocumentType('Payment Receipt')}
                        className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${
                          documentType === 'Payment Receipt'
                            ? 'bg-[#58051E] text-white border-[#58051E]'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        Payment Receipt
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocumentType('Tax Invoice')}
                        className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${
                          documentType === 'Tax Invoice'
                            ? 'bg-[#58051E] text-white border-[#58051E]'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        Tax Invoice (GST)
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── MULTIPLE PAYMENT METHODS IN THIS TRANSACTION ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase block">
                        Payment Methods & Allocation *
                      </label>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Client can settle via multiple methods (e.g. ₹25k UPI + ₹25k Bank Transfer)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMethodRow}
                      className="text-[10px] font-bold h-7 border-slate-300"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Method
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {paymentMethodRows.map((row, idx) => (
                      <div key={row.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-2">
                        <div className="w-full sm:w-40">
                          <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Method</label>
                          <select
                            value={row.method}
                            onChange={e => updateMethodRow(row.id, { method: e.target.value as any })}
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                          >
                            {PAYMENT_METHODS.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>

                        <div className="w-full sm:w-36">
                          <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Amount (₹)</label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={row.amount || ''}
                            onChange={e => updateMethodRow(row.id, { amount: Number(e.target.value) })}
                            placeholder="Amount"
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700"
                          />
                        </div>

                        <div className="flex-1 w-full">
                          <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Reference / UTR / Cheque #</label>
                          <input
                            type="text"
                            value={row.reference_no || ''}
                            onChange={e => updateMethodRow(row.id, { reference_no: e.target.value })}
                            placeholder="e.g. UTR-HDFC9823 or UPI Ref"
                            className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                          />
                        </div>

                        {paymentMethodRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeMethodRow(row.id)}
                            className="mt-4 sm:mt-0 p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Total Validation Preview */}
                  <div className="mt-3 space-y-2">
                    <div className={`p-3 rounded-xl flex items-center justify-between border ${
                      selectedModalPart && totalPaymentInModal > (selectedModalPart.remaining_balance ?? selectedModalPart.configured_amount)
                        ? 'bg-red-50 border-red-200'
                        : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-emerald-800 block">Total Transaction Amount</span>
                        <span className="text-[11px] text-emerald-700 font-medium">
                          {paymentMethodRows.length} payment method{paymentMethodRows.length !== 1 ? 's' : ''} combined
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedModalPart && totalPaymentInModal < (selectedModalPart.remaining_balance ?? selectedModalPart.configured_amount) && totalPaymentInModal > 0 && (
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                            PARTIAL PAYMENT
                          </span>
                        )}
                        <span className="text-base font-black text-emerald-800">₹{totalPaymentInModal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    {selectedModalPart && totalPaymentInModal > (selectedModalPart.remaining_balance ?? selectedModalPart.configured_amount) && (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="font-semibold">
                          ⚠ Overpayment warning: Amount entered (₹{totalPaymentInModal.toLocaleString('en-IN')}) exceeds
                          remaining due (₹{(selectedModalPart.remaining_balance ?? selectedModalPart.configured_amount).toLocaleString('en-IN')}).
                          Excess of ₹{(totalPaymentInModal - (selectedModalPart.remaining_balance ?? selectedModalPart.configured_amount)).toLocaleString('en-IN')} will be logged — issue a Credit Note if needed.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Remarks / Transaction Notes</label>
                  <textarea
                    rows={2}
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                    placeholder="e.g. Paid in two tranches via RTGS & UPI as per billing schedule"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShowRecordModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs bg-[#58051E] hover:bg-[#430316]">
                    Confirm & Issue {documentType}
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── CREDIT NOTE MODAL ── */}
      <AnimatePresence>
        {showCreditNoteModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={() => setShowCreditNoteModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Split className="w-4 h-4 text-amber-600" /> Issue Credit Note / Correction
                </h3>
                <button onClick={() => setShowCreditNoteModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreditNoteSubmit} className="space-y-3">
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                  Issuing credit note against document <strong>{creditNoteForm.docNumber}</strong>.
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Correction / Refund Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={creditNoteForm.amount}
                    onChange={e => setCreditNoteForm({ ...creditNoteForm, amount: Number(e.target.value) })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Reason for Credit Note *</label>
                  <textarea
                    rows={3}
                    required
                    value={creditNoteForm.reason}
                    onChange={e => setCreditNoteForm({ ...creditNoteForm, reason: e.target.value })}
                    placeholder="e.g. Refund of overpayment or commercial discount adjusted"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setShowCreditNoteModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs bg-amber-600 hover:bg-amber-700 text-white">
                    Issue Credit Note
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
