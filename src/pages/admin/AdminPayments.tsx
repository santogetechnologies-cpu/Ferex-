import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Eye, CheckCircle2, X, CreditCard, Clock, Sparkles, AlertCircle,
  ExternalLink, Download, RefreshCw, TrendingUp, RotateCcw, FileText, Filter, Plus
} from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import { useStudents } from '../../hooks/useStudents';
import type { Payment } from '../../lib/types';
import {
  getAllPaymentsAdmin, getPaymentStats, issueRefund, verifyPayment, rejectPayment,
  createValidInvoicePdfBlob, createReceiptPdfBlob, createCreditNotePdfBlob,
  createAndCompletePayment
} from '../../lib/api/payments';
import { InvoiceModal, type InvoiceData } from '../../components/InvoiceModal';

type FilterStatus = 'All' | 'Pending Verification' | 'Paid' | 'Rejected' | 'Refunded' | 'Partial';
type FilterType = 'All' | 'Service Charge' | 'Application Fee' | 'Visa Fee' | 'Counseling Fee' | 'Installment Fee';

export const AdminPayments: React.FC = () => {
  const { payments: hookPayments, loading } = usePayments();
  const { students } = useStudents();
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState({ totalCollected: 0, pendingDues: 0, failedCount: 0, refundTotal: 0, partialCount: 0 });
  const [loadingAll, setLoadingAll] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('All');
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals state
  const [viewTaxInvoice, setViewTaxInvoice] = useState<InvoiceData | null>(null);
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [verifyModalItem, setVerifyModalItem] = useState<Payment | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [rejectPaymentItem, setRejectPaymentItem] = useState<Payment | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [refundPaymentItem, setRefundPaymentItem] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Manual payment entry modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualStudentId, setManualStudentId] = useState('');
  const [manualTitle, setManualTitle] = useState('1st Installment Fee');
  const [manualAmount, setManualAmount] = useState('15000');
  const [manualType] = useState('Installment Fee');
  const [manualMethod, setManualMethod] = useState('Bank Wire Transfer');
  const [manualUtr, setManualUtr] = useState('');
  const [manualStatus, setManualStatus] = useState<'Paid' | 'Pending'>('Paid');

  const [toast, setToast] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const fetchAll = async () => {
    setLoadingAll(true);
    try {
      const [pays, st] = await Promise.all([getAllPaymentsAdmin(), getPaymentStats()]);
      setAllPayments(pays);
      setStats(st);
    } catch {
      setAllPayments(hookPayments);
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const displayPayments = allPayments.length > 0 ? allPayments : hookPayments;

  const filtered = displayPayments.filter(p => {
    const statusMatch =
      filterStatus === 'All' ||
      (filterStatus === 'Pending Verification' && (p.status === 'Pending Verification' || p.status === 'Pending')) ||
      (filterStatus === 'Paid' && (p.status === 'Paid' || p.status === 'Verified')) ||
      (filterStatus === 'Rejected' && p.status === 'Rejected') ||
      (filterStatus === 'Refunded' && p.status === 'Refunded') ||
      (filterStatus === 'Partial' && p.status === 'Partial');

    const typeMatch = filterType === 'All' || String(p.payment_type || '').toLowerCase().includes(filterType.toLowerCase());

    const sName = String(p.student_name || (p.users as any)?.full_name || '').toLowerCase();
    const refMatch = String(p.ref_no || p.utr_number || (p as any).transaction_id || p.id).toLowerCase();
    const titleMatch = String(p.title || p.description || '').toLowerCase();
    const searchMatch = !search || sName.includes(search.toLowerCase()) || refMatch.includes(search.toLowerCase()) || titleMatch.includes(search.toLowerCase());

    const dateMatch = (() => {
      if (!dateFrom && !dateTo) return true;
      const d = new Date(p.created_at).getTime();
      if (dateFrom && d < new Date(dateFrom).getTime()) return false;
      if (dateTo && d > new Date(dateTo + 'T23:59:59').getTime()) return false;
      return true;
    })();

    return statusMatch && typeMatch && searchMatch && dateMatch;
  });

  const pendingCount = displayPayments.filter(p => p.status === 'Pending Verification' || p.status === 'Pending').length;
  const paidCount = displayPayments.filter(p => p.status === 'Paid' || p.status === 'Verified').length;
  const rejectedCount = displayPayments.filter(p => p.status === 'Rejected').length;
  const refundedCount = displayPayments.filter(p => p.status === 'Refunded').length;

  // Manual status change handler for inline select
  const handleStatusChangeInline = async (p: Payment, newStatus: string) => {
    if (newStatus === 'Refunded') {
      setRefundPaymentItem(p);
      setRefundAmount(String(p.amount));
      setRefundReason('Manual refund processed by admin');
      return;
    }
    if (newStatus === 'Rejected') {
      setRejectPaymentItem(p);
      setRejectionNotes('');
      return;
    }

    try {
      setIsProcessing(p.id);
      if (newStatus === 'Paid' || newStatus === 'Verified') {
        await verifyPayment(p.id, 'Manually Verified by Admin');
      } else {
        const { supabase } = await import('../../lib/supabase');
        await supabase.from('payments').update({ status: newStatus }).eq('id', p.id);
      }

      setAllPayments(prev => prev.map(x => x.id === p.id ? { ...x, status: newStatus as any } : x));
      showToast(`Updated status of payment ${p.ref_no || p.id.slice(0,6)} to "${newStatus}".`);
      fetchAll();
    } catch (err: any) {
      showToast(`Error updating status: ${err.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  // Manual Verify submit
  const handleConfirmVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModalItem) return;

    try {
      setIsProcessing(verifyModalItem.id);
      await verifyPayment(verifyModalItem.id, verifyNotes || 'Verified & Approved manually by Admin');

      setAllPayments(prev => prev.map(x => x.id === verifyModalItem.id ? { ...x, status: 'Paid' as const, reviewer_notes: verifyNotes } : x));
      if (viewPayment?.id === verifyModalItem.id) setViewPayment(null);
      setVerifyModalItem(null);
      setVerifyNotes('');

      showToast(`🎉 Payment of INR ${verifyModalItem.amount.toLocaleString()} for ${verifyModalItem.student_name || 'Student'} verified! Tax Invoice & Receipt generated.`);
      fetchAll();
    } catch (err: any) {
      showToast(`Error verifying payment: ${err.message || 'Verification failed'}`);
    } finally {
      setIsProcessing(null);
    }
  };

  // Rejection Submit
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectPaymentItem || !rejectionNotes.trim()) { showToast('Please provide a rejection reason.'); return; }
    try {
      setIsProcessing(rejectPaymentItem.id);
      await rejectPayment(rejectPaymentItem.id, rejectionNotes.trim());
      setAllPayments(prev => prev.map(x => x.id === rejectPaymentItem.id ? { ...x, status: 'Rejected' as const } : x));
      setRejectPaymentItem(null); setRejectionNotes('');
      if (viewPayment?.id === rejectPaymentItem.id) setViewPayment(null);
      showToast('Payment rejected. Student notified to re-upload proof.');
      fetchAll();
    } catch (err: any) { showToast(`Error: ${err.message}`); } finally { setIsProcessing(null); }
  };

  // Refund Submit
  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundPaymentItem) return;
    const amt = parseFloat(refundAmount);
    if (!amt || amt <= 0 || !refundReason.trim()) { showToast('Enter a valid refund amount and reason.'); return; }
    try {
      setIsProcessing(refundPaymentItem.id);
      const creditNote = await issueRefund(refundPaymentItem.id, amt, refundReason.trim());

      setAllPayments(prev => prev.map(x => x.id === refundPaymentItem.id ? {
        ...x,
        status: 'Refunded' as const,
        refund_amount: amt,
        refund_reason: refundReason,
        credit_note_no: creditNote?.credit_note_no
      } : x));

      if (creditNote) {
        const blob = createCreditNotePdfBlob({
          credit_note_no: creditNote.credit_note_no,
          student_name: refundPaymentItem.student_name,
          original_amount: refundPaymentItem.amount,
          refund_amount: amt,
          reason: refundReason,
          issued_at: creditNote.issued_at,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${creditNote.credit_note_no}.pdf`; a.click();
        URL.revokeObjectURL(url);
      }

      setRefundPaymentItem(null); setRefundAmount(''); setRefundReason('');
      if (viewPayment?.id === refundPaymentItem.id) setViewPayment(null);
      showToast(`🎉 Refund of INR ${amt.toLocaleString()} issued successfully! Credit note PDF downloaded.`);
      fetchAll();
    } catch (err: any) { showToast(`Error issuing refund: ${err.message}`); } finally { setIsProcessing(null); }
  };

  // Manual Offline Payment Submit
  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentName.trim() || !manualAmount) {
      showToast('Student name and amount are required.');
      return;
    }

    try {
      setIsProcessing('manual');
      const amt = parseFloat(manualAmount);
      const created = await createAndCompletePayment({
        student_name: manualStudentName.trim(),
        student_id: manualStudentId.trim() || undefined,
        title: manualTitle.trim(),
        amount: amt,
        payment_type: manualType,
        payment_method: manualMethod,
      });

      if (manualStatus === 'Paid') {
        await verifyPayment(created.id, `Offline payment recorded by Admin via ${manualMethod}. UTR: ${manualUtr || 'N/A'}`);
      }

      showToast(`🎉 Payment of INR ${amt.toLocaleString()} recorded for ${manualStudentName}!`);
      setShowManualModal(false);
      setManualStudentName('');
      setManualStudentId('');
      setManualUtr('');
      fetchAll();
    } catch (err: any) {
      showToast(`Error recording manual payment: ${err.message}`);
    } finally {
      setIsProcessing(null);
    }
  };

  const downloadInvoice = (p: Payment) => {
    const blob = createValidInvoicePdfBlob({
      invoice_no: p.ref_no, student_name: p.student_name, amount: p.amount,
      currency: p.currency || 'INR', title: p.title || p.description,
      payment_type: p.payment_type, payment_method: p.payment_method,
      utr_number: p.utr_number || (p as any).transaction_id, paid_at: p.paid_at || p.created_at,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Invoice-${p.ref_no || p.id.slice(0, 8)}.pdf`; a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded Invoice PDF for ${p.student_name || 'Student'}`);
  };

  const downloadReceipt = (p: Payment) => {
    const blob = createReceiptPdfBlob({
      receipt_no: `REC-${p.ref_no || p.id.slice(0, 8)}`, student_name: p.student_name,
      amount: p.amount, currency: p.currency || 'INR', payment_method: p.payment_method,
      description: p.title || p.description, issued_at: p.paid_at || p.created_at,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Receipt-${p.ref_no || p.id.slice(0, 8)}.pdf`; a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded Receipt PDF for ${p.student_name || 'Student'}`);
  };

  const exportCsv = () => {
    const headers = ['Student Name','Student ID','Business','Amount (INR)','Type','Method','Transaction ID / UTR','Status','Milestone Step','Date','Ref No'];
    const rows = filtered.map(p => [
      p.student_name || '', p.student_id || '', (p as any).business || 'FEREX EU Admissions',
      p.amount, p.payment_type || '', p.payment_method || '',
      (p as any).transaction_id || p.utr_number || p.ref_no || '',
      p.status, (p as any).milestone_step || '',
      new Date(p.created_at).toLocaleDateString('en-IN'), p.ref_no || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(String).map(v => `"${v.replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `FEREX-Payments-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      'Paid': 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black',
      'Verified': 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black',
      'Pending Verification': 'bg-amber-50 text-amber-800 border-amber-300 font-bold animate-pulse',
      'Pending': 'bg-amber-50 text-amber-800 border-amber-300 font-bold animate-pulse',
      'Rejected': 'bg-red-50 text-red-700 border-red-200 font-bold',
      'Refunded': 'bg-violet-50 text-violet-700 border-violet-200 font-black',
      'Partial': 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
      'Overdue': 'bg-orange-50 text-orange-700 border-orange-200 font-bold',
      'Cancelled': 'bg-slate-100 text-slate-500 border-slate-200 font-bold',
    };
    return map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-6 relative text-left">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#6A1B2E]" /> Payment & Billing Control Console
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Manually verify payments, record offline entries, issue refunds with credit notes, download invoices & receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" /> Record Payment
          </button>
          <button onClick={fetchAll} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 shadow-xs">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Collected', value: `INR ${stats.totalCollected.toLocaleString('en-IN')}`, Icon: TrendingUp, c: 'emerald' },
          { label: 'Pending Dues', value: `INR ${stats.pendingDues.toLocaleString('en-IN')}`, Icon: Clock, c: 'amber' },
          { label: 'Failed / Rejected', value: String(stats.failedCount), Icon: AlertCircle, c: 'red' },
          { label: 'Total Refunded', value: `INR ${stats.refundTotal.toLocaleString('en-IN')}`, Icon: RotateCcw, c: 'violet' },
          { label: 'Partial Payments', value: String(stats.partialCount), Icon: FileText, c: 'blue' },
        ].map(s => (
          <div key={s.label} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-3xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-slate-400">{s.label}</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <s.Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-base font-black text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search student name, ID, UTR number, ref no, description..."
              className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none" />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-red-400 hover:text-red-600 font-bold">Clear</button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['All','Pending Verification','Paid','Rejected','Refunded','Partial'] as FilterStatus[]).map(tab => (
            <button key={tab} onClick={() => setFilterStatus(tab)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border ${
                filterStatus === tab ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200/60'
              }`}>
              {tab === 'All' ? `All Payments (${displayPayments.length})` :
               tab === 'Pending Verification' ? `Pending (${pendingCount})` :
               tab === 'Paid' ? `Verified (${paidCount})` :
               tab === 'Rejected' ? `Rejected (${rejectedCount})` :
               tab === 'Refunded' ? `Refunded (${refundedCount})` : tab}
            </button>
          ))}
          <select value={filterType} onChange={e => setFilterType(e.target.value as FilterType)}
            className="ml-auto h-8 px-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none">
            <option value="All">All Payment Types</option>
            <option value="Service Charge">Service Charge</option>
            <option value="Application Fee">Application Fee</option>
            <option value="Visa Fee">Visa Fee</option>
            <option value="Counseling Fee">Counseling Fee</option>
            <option value="Installment Fee">Installment Fee</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {(loading || loadingAll) ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">Loading financial records from database...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-extrabold text-slate-700">No Payment Records Match</p>
            <p className="text-[11px] text-slate-400">Try adjusting your search or status filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-[9.5px] uppercase font-extrabold text-slate-400 tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">Student</th>
                  <th className="p-3.5">Payment Details</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5">Transaction ID / UTR</th>
                  <th className="p-3.5">Status & Change</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filtered.map(p => {
                  const isPending = p.status === 'Pending Verification' || p.status === 'Pending';
                  const isPaid = p.status === 'Paid' || p.status === 'Verified';
                  const isRefunded = p.status === 'Refunded';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 pl-5">
                        <p className="font-extrabold text-slate-900">{p.student_name || (p.users as any)?.full_name || 'Student'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{p.student_id?.slice(0, 14) || '—'}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{(p as any).business || 'FEREX EU Admissions'}</p>
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900">{p.title || p.description || 'Installment Fee'}</p>
                        <p className="text-[10px] text-slate-400">{p.payment_type || 'Installment'}</p>
                        {(p as any).milestone_step && (
                          <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#6A1B2E]/10 text-[#6A1B2E] border border-[#6A1B2E]/20">
                            Journey Step {(p as any).milestone_step}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <p className="font-black text-slate-900">INR {Number(p.amount).toLocaleString('en-IN')}</p>
                        {(p as any).partial_amount != null && p.status === 'Partial' && (
                          <p className="text-[10px] text-blue-600 font-bold">Partial Paid: INR {Number((p as any).partial_amount).toLocaleString('en-IN')}</p>
                        )}
                        {((p as any).refund_amount != null || isRefunded) && (
                          <p className="text-[10px] text-violet-600 font-bold">Refunded: INR {Number((p as any).refund_amount || p.amount).toLocaleString('en-IN')}</p>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold border border-slate-200">
                          {p.payment_method || 'UPI / Wire'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] font-bold text-slate-800">
                        {(p as any).transaction_id || p.utr_number || p.ref_no || p.id.slice(0, 10)}
                      </td>

                      {/* Status Dropdown selector for direct manual change */}
                      <td className="p-3.5">
                        <select
                          value={p.status === 'Verified' ? 'Paid' : p.status}
                          disabled={isProcessing === p.id}
                          onChange={(e) => handleStatusChangeInline(p, e.target.value)}
                          className={`h-8 px-2 rounded-lg text-[11px] font-extrabold border cursor-pointer focus:outline-none ${statusBadge(p.status)}`}
                        >
                          <option value="Pending">Pending Verification</option>
                          <option value="Paid">Paid (Verified)</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Refunded">Refunded (Issue Credit Note)</option>
                          <option value="Partial">Partial Payment</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </td>

                      <td className="p-3.5 text-[10px] text-slate-500">
                        {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>

                      {/* Action buttons */}
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setViewPayment(p)} title="View Detail Drawer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {p.receipt_url && (
                            <a
                              href={p.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              title="View Student Uploaded Payment Proof Receipt"
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-indigo-100 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Manual Verify button */}
                          {isPending && (
                            <button
                              onClick={() => {
                                setVerifyModalItem(p);
                                setVerifyNotes(`Verified & approved by Admin on ${new Date().toLocaleDateString('en-IN')}`);
                              }}
                              disabled={isProcessing === p.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-3xs flex items-center gap-1 transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verify
                            </button>
                          )}

                          {/* Invoice PDF download */}
                          {isPaid && (
                            <>
                              <button onClick={() => setViewTaxInvoice({
                                invoice_no: (p as any).ref_no || `FE/2026-27/${p.id.slice(0, 4)}`,
                                student_name: (p as any).student_name || 'Student',
                                amount: Number(p.amount),
                                currency: 'INR',
                                description: p.title || p.description || 'Registration Fee – Overseas Education Consultancy Services (Study in Poland)',
                                date: p.paid_at || p.created_at,
                                payment_method: p.payment_method || 'Bank Transfer / UPI',
                                utr_number: p.utr_number || (p as any).transaction_id,
                                sac_code: '9992',
                                place_of_supply: 'Kerala'
                              })} title="View Official Tax Invoice Model"
                                className="p-1.5 rounded-lg text-[#50001D] hover:bg-[#50001D]/10 border border-[#50001D]/20 transition-colors">
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => downloadReceipt(p)} title="Download Payment Receipt PDF"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-100 transition-colors">
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setRefundPaymentItem(p);
                                  setRefundAmount(String(p.amount));
                                  setRefundReason('');
                                }}
                                title="Issue Refund & Credit Note PDF"
                                className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 border border-violet-100 transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* Rejection action */}
                          {isPending && (
                            <button
                              onClick={() => { setRejectPaymentItem(p); setRejectionNotes(''); }}
                              disabled={isProcessing === p.id}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 rounded-lg text-[11px] flex items-center gap-0.5 transition-all"
                            >
                              <X className="w-3 h-3" /> Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/40">
              <p className="text-[11px] font-semibold text-slate-400">{filtered.length} total payment records shown</p>
              <p className="text-[11px] font-black text-slate-700">
                Filtered Total: INR {filtered.reduce((s, p) => s + (Number(p.amount) || 0), 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 1. MANUAL PAYMENT VERIFICATION MODAL */}
      <AnimatePresence>
        {verifyModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setVerifyModalItem(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Manually Verify Payment</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">{verifyModalItem.ref_no || verifyModalItem.id}</p>
                  </div>
                </div>
                <button onClick={() => setVerifyModalItem(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleConfirmVerify} className="space-y-4">
                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-xs space-y-1.5">
                  <div className="flex justify-between"><span className="text-slate-500 font-semibold">Student Name:</span><span className="font-extrabold text-slate-900">{verifyModalItem.student_name || 'Student'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-semibold">Payment Type:</span><span className="font-extrabold text-slate-900">{verifyModalItem.title || verifyModalItem.payment_type}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-semibold">Amount Received:</span><span className="font-black text-emerald-800 text-sm">INR {Number(verifyModalItem.amount).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-semibold">Transaction / UTR:</span><span className="font-mono font-bold text-slate-900">{(verifyModalItem as any).transaction_id || verifyModalItem.utr_number || 'N/A'}</span></div>
                </div>

                {verifyModalItem.receipt_url && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <img src={verifyModalItem.receipt_url} alt="Receipt Proof" className="max-h-36 mx-auto object-contain rounded-lg mb-1" />
                    <a href={verifyModalItem.receipt_url} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1">
                      View Full Resolution Proof <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                    Admin Verification Notes / Audit Remarks
                  </label>
                  <textarea
                    rows={3}
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    placeholder="Enter audit remarks (e.g. Bank statement verified on 14 Aug)..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setVerifyModalItem(null)}
                    className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={isProcessing === verifyModalItem.id}
                    className="flex-1 h-9 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-4 h-4" /> Confirm Verification
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. RECORD MANUAL / OFFLINE PAYMENT MODAL */}
      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowManualModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-black">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Record Offline / Manual Payment</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Log bank wire, cash, or offline fee clearance</p>
                  </div>
                </div>
                <button onClick={() => setShowManualModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleManualPaymentSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Select Enrolled Student or Enter Name *</label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const s = students.find(x => x.id === e.target.value);
                        if (s) {
                          setManualStudentId(s.id);
                          setManualStudentName(s.full_name || s.email);
                        }
                      }
                    }}
                    className="w-full h-9 px-3 mb-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  >
                    <option value="">-- Choose Existing Student (Optional) --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name || s.email} ({s.email})
                      </option>
                    ))}
                  </select>
                  <input type="text" required value={manualStudentName} onChange={e => setManualStudentName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Amount (INR) *</label>
                    <input type="number" required min={1} value={manualAmount} onChange={e => setManualAmount(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Payment Method</label>
                    <select value={manualMethod} onChange={e => setManualMethod(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none">
                      <option value="Bank Wire Transfer">Bank Wire Transfer</option>
                      <option value="UPI / GPay / PhonePe">UPI / GPay / PhonePe</option>
                      <option value="Cash Deposit">Cash Deposit</option>
                      <option value="Credit / Debit Card">Credit / Debit Card</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Fee Description / Title</label>
                  <input type="text" value={manualTitle} onChange={e => setManualTitle(e.target.value)}
                    placeholder="e.g. 1st Installment Fee Clearance"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Transaction / UTR No</label>
                    <input type="text" value={manualUtr} onChange={e => setManualUtr(e.target.value)}
                      placeholder="e.g. HDFC129038102"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Initial Status</label>
                    <select value={manualStatus} onChange={e => setManualStatus(e.target.value as any)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none">
                      <option value="Paid">Verified & Paid</option>
                      <option value="Pending">Pending Verification</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setShowManualModal(false)}
                    className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={isProcessing === 'manual'}
                    className="flex-1 h-9 bg-[#6A1B2E] text-white text-xs font-black rounded-xl hover:bg-[#521221] shadow-sm">
                    {isProcessing === 'manual' ? 'Saving...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. REJECT PAYMENT MODAL */}
      <AnimatePresence>
        {rejectPaymentItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setRejectPaymentItem(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-black text-slate-900">Reject Payment Verification</h3>
                <button onClick={() => setRejectPaymentItem(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleRejectSubmit} className="space-y-4">
                <p className="text-xs font-semibold text-slate-500">
                  Rejecting INR <span className="font-black text-slate-900">{Number(rejectPaymentItem.amount).toLocaleString('en-IN')}</span> for {rejectPaymentItem.student_name || 'Student'}.
                </p>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Rejection Reason *</label>
                  <textarea required rows={3} value={rejectionNotes} onChange={e => setRejectionNotes(e.target.value)}
                    placeholder="e.g. UTR reference not found in bank statement. Please re-upload valid payment proof."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40" />
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setRejectPaymentItem(null)}
                    className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="flex-1 h-9 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700">Confirm Rejection</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. ISSUE REFUND & CREDIT NOTE MODAL */}
      <AnimatePresence>
        {refundPaymentItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setRefundPaymentItem(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-violet-600" /> Issue Refund & Credit Note
                </h3>
                <button onClick={() => setRefundPaymentItem(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleRefundSubmit} className="space-y-4">
                <p className="text-xs font-semibold text-slate-500">
                  Original: <span className="font-black text-slate-900">INR {Number(refundPaymentItem.amount).toLocaleString('en-IN')}</span> — {refundPaymentItem.student_name}
                </p>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Refund Amount (INR) *</label>
                  <input type="number" required min={1} max={refundPaymentItem.amount} step="0.01"
                    value={refundAmount} onChange={e => setRefundAmount(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Refund Reason *</label>
                  <textarea required rows={3} value={refundReason} onChange={e => setRefundReason(e.target.value)}
                    placeholder="e.g. Admission application withdrawn before processing. Full refund issued."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-violet-400" />
                </div>
                <div className="p-3 bg-violet-50 rounded-xl border border-violet-200 text-xs font-semibold text-violet-800">
                  A branded Credit Note PDF will be auto-generated and downloaded upon confirmation. Status will change to <span className="font-bold">Refunded</span>.
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setRefundPaymentItem(null)}
                    className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                  <button type="submit" disabled={!!isProcessing}
                    className="flex-1 h-9 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 flex items-center justify-center gap-1 shadow-sm">
                    <RotateCcw className="w-3.5 h-3.5" /> Confirm & Issue Refund
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. VIEW DETAIL DRAWER */}
      <AnimatePresence>
        {viewPayment && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50" onClick={() => setViewPayment(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[520px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100 text-left">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Payment Audit Detail</h3>
                  <p className="text-xs font-semibold text-slate-400">{viewPayment.title || viewPayment.description}</p>
                </div>
                <button onClick={() => setViewPayment(null)} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ['Student Name', viewPayment.student_name || '—'],
                    ['Business', (viewPayment as any).business || 'FEREX EU Admissions'],
                    ['Amount', `INR ${Number(viewPayment.amount).toLocaleString('en-IN')}`],
                    ['Currency', viewPayment.currency || 'INR'],
                    ['Payment Type', viewPayment.payment_type || '—'],
                    ['Method', viewPayment.payment_method || '—'],
                    ['Transaction ID', (viewPayment as any).transaction_id || viewPayment.utr_number || '—'],
                    ['Ref No', viewPayment.ref_no || '—'],
                    ['Milestone Step', (viewPayment as any).milestone_step ? `Step ${(viewPayment as any).milestone_step}` : '—'],
                    ['Current Status', viewPayment.status],
                    ['Created Date', new Date(viewPayment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
                    ['Student ID', viewPayment.student_id?.slice(0, 16) || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-[9.5px] font-extrabold uppercase text-slate-400 mb-0.5">{k}</p>
                      <p className="font-bold text-slate-900 break-all text-xs">{v}</p>
                    </div>
                  ))}
                </div>
                {viewPayment.receipt_url && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 text-center p-4">
                    <img src={viewPayment.receipt_url} alt="Receipt Proof" className="max-h-52 mx-auto object-contain rounded-lg" />
                    <a href={viewPayment.receipt_url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline mt-2">
                      Open Uploaded Proof <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {viewPayment.reviewer_notes && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900">
                    <p className="text-[9.5px] font-extrabold uppercase text-amber-700 mb-1">Admin Audit Notes</p>
                    {viewPayment.reviewer_notes}
                  </div>
                )}
                {((viewPayment as any).credit_note_no || viewPayment.status === 'Refunded') && (
                  <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs font-semibold text-violet-900">
                    <p className="text-[9.5px] font-extrabold uppercase text-violet-700 mb-1">Credit Note Summary</p>
                    {(viewPayment as any).credit_note_no || 'CN-ISSUED'} — Refunded INR {Number((viewPayment as any).refund_amount || viewPayment.amount).toLocaleString('en-IN')}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 grid grid-cols-2 gap-2">
                {(viewPayment.status === 'Pending Verification' || viewPayment.status === 'Pending') && (
                  <>
                    <button
                      onClick={() => {
                        setVerifyModalItem(viewPayment);
                        setVerifyNotes(`Verified & approved by Admin on ${new Date().toLocaleDateString('en-IN')}`);
                      }}
                      className="h-9 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Verify Payment
                    </button>
                    <button onClick={() => { setRejectPaymentItem(viewPayment); setRejectionNotes(''); }}
                      className="h-9 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 flex items-center justify-center gap-1">
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </>
                )}
                {(viewPayment.status === 'Paid' || viewPayment.status === 'Verified') && (
                  <>
                    <button onClick={() => downloadInvoice(viewPayment)}
                      className="h-9 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 flex items-center justify-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Tax Invoice PDF
                    </button>
                    <button onClick={() => downloadReceipt(viewPayment)}
                      className="h-9 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1">
                      <Download className="w-3.5 h-3.5" /> Receipt PDF
                    </button>
                    <button onClick={() => { setRefundPaymentItem(viewPayment); setRefundAmount(String(viewPayment.amount)); setRefundReason(''); setViewPayment(null); }}
                      className="h-9 col-span-2 bg-violet-600 text-white text-xs font-bold rounded-xl hover:bg-violet-700 flex items-center justify-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5" /> Issue Refund & Credit Note PDF
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Official Tax Invoice Modal */}
      <InvoiceModal
        isOpen={Boolean(viewTaxInvoice)}
        onClose={() => setViewTaxInvoice(null)}
        invoice={viewTaxInvoice}
      />
    </div>
  );
};
