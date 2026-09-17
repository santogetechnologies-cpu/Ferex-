import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Eye, CheckCircle2, X, CreditCard, Clock, Sparkles, AlertCircle,
  ExternalLink, Download, RefreshCw, TrendingUp, RotateCcw, FileText, Filter, Plus,
  Building2, GraduationCap, Layers, ArrowRight, CheckCircle, ShieldCheck
} from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import { useStudents } from '../../hooks/useStudents';
import { useUniversities } from '../../hooks/useUniversities';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { getApplications } from '../../lib/api/applications';
import { formatFeeEURandINR, parseFeeToINR } from '../Payments';
import type { Payment, Application } from '../../lib/types';
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
  const { universities } = useUniversities();
  const { config: feeConfig } = useFeeConfig();
  const [applications, setApplications] = useState<Application[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState({ totalCollected: 0, pendingDues: 0, failedCount: 0, refundTotal: 0, partialCount: 0 });
  const [loadingAll, setLoadingAll] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('All');
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeViewMode, setActiveViewMode] = useState<'milestones' | 'ledger'>('milestones');

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
  const [manualTitle, setManualTitle] = useState('Advanced Registration Fee');
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
      const [pays, st, apps] = await Promise.all([
        getAllPaymentsAdmin(),
        getPaymentStats(),
        getApplications().catch(() => [])
      ]);
      setAllPayments(pays || []);
      setStats(st || { totalCollected: 0, pendingDues: 0, failedCount: 0, refundTotal: 0, partialCount: 0 });
      setApplications(apps || []);
    } catch {
      setAllPayments(hookPayments);
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => { 
    fetchAll(); 
    const handleSync = () => fetchAll();
    window.addEventListener('ferex_payment_change', handleSync);
    window.addEventListener('ferex_students_change', handleSync);
    window.addEventListener('ferex_application_change', handleSync);
    return () => {
      window.removeEventListener('ferex_payment_change', handleSync);
      window.removeEventListener('ferex_students_change', handleSync);
      window.removeEventListener('ferex_application_change', handleSync);
    };
  }, []);

  const displayPayments = allPayments.length > 0 ? allPayments : hookPayments;

  const studentsWithMilestones = useMemo(() => {
    return students.map(st => {
      const sId = st.id;
      const sName = st.full_name || st.email?.split('@')[0] || 'Student';
      const studentApp = applications.find(a => a.student_id === sId);
      
      const studentUni = universities.find(u =>
        (studentApp?.university_id && u.id === studentApp.university_id) ||
        (studentApp?.university_name && u.name?.toLowerCase().trim() === studentApp.university_name?.toLowerCase().trim())
      );

      const uniName = studentUni?.name || studentApp?.university_name || 'Destination Not Selected';
      const uniCountry = studentUni?.country || studentApp?.universities?.country || (studentApp as any)?.country || 'Global';
      const courseName = studentApp?.course || studentApp?.program_name || 'Degree Program';
      const hasUni = Boolean(studentUni || studentApp?.university_name);

      // 1. Adv Registration
      const isAdvEnabled = feeConfig.advance_registration_fee_enabled !== false;
      const advAmount = Number(feeConfig.advance_registration_fee_amount || feeConfig.advance_registration_fee_inr || 1500);
      const advPay = displayPayments.find(p => p.student_id === sId && (p.stage_number === 1 || p.title?.toLowerCase().includes('registration') || p.payment_type?.toLowerCase().includes('registration') || p.title?.toLowerCase().includes('advance')));
      const isAdvPaid = advPay?.status === 'Paid' || advPay?.status === 'Verified';
      const isAdvPending = advPay?.status === 'Pending Verification' || advPay?.status === 'Pending';

      // 2. Agency Fee
      const rawAgencyFee = studentUni?.agency_fee || (feeConfig.agency_fee_amount ? (`₹${Number(feeConfig.agency_fee_amount).toLocaleString('en-IN')}`) : (feeConfig.default_agency_fee || '₹25,000'));
      const agencyAmount = parseFeeToINR(rawAgencyFee);
      const agencyPay = displayPayments.find(p => p.student_id === sId && (p.stage_number === 2 || (p.title?.toLowerCase().includes('agency') && !p.title?.toLowerCase().includes('tuition'))));
      const isAgencyPaid = agencyPay?.status === 'Paid' || agencyPay?.status === 'Verified';
      const isAgencyPending = agencyPay?.status === 'Pending Verification' || agencyPay?.status === 'Pending';

      // 3. VFS Fee
      const rawVfsFee = studentUni?.vfs_fee || feeConfig.default_vfs_fee || '₹15,000';
      const vfsAmount = parseFeeToINR(rawVfsFee);
      const vfsPay = displayPayments.find(p => p.student_id === sId && (p.stage_number === 3 || p.title?.toLowerCase().includes('vfs') || p.payment_type?.toLowerCase().includes('visa') || p.title?.toLowerCase().includes('consular')));
      const isVfsPaid = vfsPay?.status === 'Paid' || vfsPay?.status === 'Verified';
      const isVfsPending = vfsPay?.status === 'Pending Verification' || vfsPay?.status === 'Pending';

      // 4. University Tuition / Installments
      const isTuitionFeeEnabled = Boolean(studentUni?.tuition_fee_enabled);
      const isInstallmentsEnabled = Boolean(studentUni?.installments_enabled && studentUni?.installments && studentUni.installments.length > 0);
      const rawTuition = studentUni?.university_fee || studentUni?.tuition_range || '€3,500 / yr';
      const tuitionInr = parseFeeToINR(rawTuition);

      const milestones = isInstallmentsEnabled && studentUni?.installments ? studentUni.installments.map((inst, idx) => {
        const mTitle = inst.title || inst.name || `Tuition Installment #${idx + 1}`;
        const mDue = inst.due_stage || inst.due_trigger || 'Milestone Trigger';
        const mAmtInr = parseFeeToINR(inst.amount);
        const mPay = displayPayments.find(p => p.student_id === sId && ((p as any).installment_id === inst.id || p.title?.toLowerCase().includes(mTitle.toLowerCase()) || p.title?.toLowerCase().includes(`installment #${idx + 1}`)));
        const isPaid = mPay?.status === 'Paid' || mPay?.status === 'Verified';
        const isPending = mPay?.status === 'Pending Verification' || mPay?.status === 'Pending';
        return {
          id: inst.id || `inst-${idx + 1}`,
          title: mTitle,
          amountFormatted: typeof inst.amount === 'number' ? `€${inst.amount}` : (inst.amount || '€1,500'),
          amountInr: mAmtInr,
          due_stage: mDue,
          isPaid,
          isPending,
          paymentRecord: mPay
        };
      }) : [];

      const advTotalWithGst = Math.round(advAmount * 1.18);
      const agencyTotalWithGst = Math.round(agencyAmount * 1.18);

      const isSingleTuitionPaid = Boolean(displayPayments.find(p => p.student_id === sId && p.title?.toLowerCase().includes('tuition') && (p.status === 'Paid' || p.status === 'Verified')));

      const tuitionPaid = isInstallmentsEnabled
        ? milestones.filter(m => m.isPaid).reduce((sum, m) => sum + m.amountInr, 0)
        : (isSingleTuitionPaid ? tuitionInr : 0);

      const tuitionTotal = isInstallmentsEnabled
        ? milestones.reduce((sum, m) => sum + m.amountInr, 0)
        : (hasUni && isTuitionFeeEnabled ? tuitionInr : 0);

      const totalOutlay = (isAdvEnabled ? advTotalWithGst : 0) + (hasUni ? agencyTotalWithGst + vfsAmount + tuitionTotal : 0);
      const totalCollected = (isAdvPaid ? (Number(advPay?.amount) || advTotalWithGst) : 0) +
        (isAgencyPaid ? (Number(agencyPay?.amount) || agencyTotalWithGst) : 0) +
        (isVfsPaid ? (Number(vfsPay?.amount) || vfsAmount) : 0) +
        tuitionPaid;
      const totalPending = Math.max(0, totalOutlay - totalCollected);

      return {
        student: st,
        hasUni,
        uniName,
        uniCountry,
        courseName,
        studentUni,
        advAmount,
        advTotalWithGst,
        advPay,
        isAdvPaid,
        isAdvPending,
        isAdvEnabled,
        rawAgencyFee,
        agencyAmount,
        agencyTotalWithGst,
        agencyPay,
        isAgencyPaid,
        isAgencyPending,
        rawVfsFee,
        vfsAmount,
        vfsPay,
        isVfsPaid,
        isVfsPending,
        rawTuition,
        tuitionInr,
        isTuitionFeeEnabled,
        isInstallmentsEnabled,
        isSingleTuitionPaid,
        milestones,
        tuitionTotal,
        tuitionPaid,
        totalOutlay,
        totalCollected,
        totalPending,
      };
    });
  }, [students, applications, universities, displayPayments, feeConfig]);

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

      showToast(`Payment of INR ${verifyModalItem.amount.toLocaleString()} for ${verifyModalItem.student_name || 'Student'} verified. Tax Invoice & Receipt generated.`);
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
      showToast(`Refund of INR ${amt.toLocaleString()} issued successfully. Credit note PDF downloaded.`);
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

      showToast(`Payment of INR ${amt.toLocaleString()} recorded for ${manualStudentName}.`);
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
            <CreditCard className="w-5 h-5 text-[#58051E]" /> Payment & Billing Control Console
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Manually verify payments, record offline entries, issue refunds with credit notes, download invoices & receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#58051E] text-white text-xs font-bold rounded-xl hover:bg-[#430316] shadow-xs transition-all"
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

      {/* View Switcher Tabs: Student Milestones Matrix vs Full Ledger */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveViewMode('milestones')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeViewMode === 'milestones'
              ? 'bg-[#58051E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Student Fee Milestones & Outlays ({studentsWithMilestones.length})
        </button>
        <button
          onClick={() => setActiveViewMode('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeViewMode === 'ledger'
              ? 'bg-[#58051E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          All Transaction Ledger Records ({displayPayments.length})
        </button>
      </div>

      {/* VIEW 1: STUDENT FEE MILESTONES & OUTLAYS MATRIX */}
      {activeViewMode === 'milestones' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search student by name, email, target university, or country..."
                className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white"
              />
            </div>
            <div className="text-xs text-slate-500 font-bold shrink-0">
              Showing <span className="text-slate-900 font-black">{studentsWithMilestones.filter(s => !search || s.student.full_name?.toLowerCase().includes(search.toLowerCase()) || s.student.email?.toLowerCase().includes(search.toLowerCase()) || s.uniName.toLowerCase().includes(search.toLowerCase())).length}</span> Enrolled Students
            </div>
          </div>

          <div className="space-y-4">
            {studentsWithMilestones
              .filter(s => !search || s.student.full_name?.toLowerCase().includes(search.toLowerCase()) || s.student.email?.toLowerCase().includes(search.toLowerCase()) || s.uniName.toLowerCase().includes(search.toLowerCase()))
              .map(item => {
                const s = item.student;
                const sName = s.full_name || s.email?.split('@')[0] || 'Student';

                return (
                  <div key={s.id} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                    {/* Student & Destination Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#58051E]/10 text-[#58051E] font-black flex items-center justify-center text-sm uppercase">
                          {sName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-slate-900">{sName}</h3>
                            <span className="text-[10px] text-slate-400 font-mono font-medium">({s.email})</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1 text-xs font-bold text-slate-700">
                              <Building2 className="w-3.5 h-3.5 text-[#58051E]" />
                              {item.uniName}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-semibold text-slate-500">{item.uniCountry}</span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-semibold text-slate-500">{item.courseName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-auto">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          item.isInstallmentsEnabled ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : (item.hasUni && item.isTuitionFeeEnabled ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200')
                        }`}>
                          {item.isInstallmentsEnabled ? `Milestones Active (${item.milestones.length} Stages)` : (item.hasUni && item.isTuitionFeeEnabled ? 'Platform Tuition Enabled' : 'Direct University Payment')}
                        </span>
                        <button
                          onClick={() => {
                            setManualStudentId(s.id);
                            setManualStudentName(sName);
                            setManualTitle('Advanced Registration Fee');
                            setManualAmount(String(item.advTotalWithGst));
                            setShowManualModal(true);
                          }}
                          className="px-3 py-1.5 bg-[#58051E] text-white rounded-xl text-xs font-bold hover:bg-[#430316] flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Settle Fee
                        </button>
                      </div>
                    </div>

                    {/* Fee Milestones Breakdown Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* 1. Adv Registration */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400">Stage 01 • Intake Deposit</span>
                            {item.isAdvPaid ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9.5px] font-bold">Paid</span>
                            ) : item.isAdvPending ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[9.5px] font-bold animate-pulse">In Review</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[9.5px] font-bold">Due</span>
                            )}
                          </div>
                          <p className="text-xs font-black text-slate-900 mt-1">Advanced Registration Fee</p>
                          <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                            <p className="text-base font-black text-[#58051E]">₹{item.advAmount.toLocaleString('en-IN')}</p>
                            <span className="text-[9.5px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              +18% GST extra (₹{item.advTotalWithGst.toLocaleString('en-IN')})
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">CGST 9% (₹{Math.round(item.advAmount * 0.09).toLocaleString('en-IN')}) + SGST 9% (₹{Math.round(item.advAmount * 0.09).toLocaleString('en-IN')}) • SAC 9983</p>
                        </div>
                        {!item.isAdvPaid && (
                          <button
                            onClick={() => {
                              setManualStudentId(s.id);
                              setManualStudentName(sName);
                              setManualTitle('Advanced Registration Fee');
                              setManualAmount(String(item.advTotalWithGst));
                              setShowManualModal(true);
                            }}
                            className="w-full mt-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10.5px] font-bold text-slate-700 cursor-pointer"
                          >
                            + Record Stage 01
                          </button>
                        )}
                      </div>

                      {/* 2. Agency Fee */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400">Stage 02 • Agency Processing</span>
                            {item.isAgencyPaid ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9.5px] font-bold">Paid</span>
                            ) : item.isAgencyPending ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[9.5px] font-bold animate-pulse">In Review</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[9.5px] font-bold">Due</span>
                            )}
                          </div>
                          <p className="text-xs font-black text-slate-900 mt-1">Separate Agency Fee</p>
                          <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                            <p className="text-base font-black text-indigo-900">{formatFeeEURandINR(item.rawAgencyFee)}</p>
                            <span className="text-[9.5px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              +18% GST extra (₹{item.agencyTotalWithGst.toLocaleString('en-IN')})
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">CGST 9% (₹{Math.round(item.agencyAmount * 0.09).toLocaleString('en-IN')}) + SGST 9% (₹{Math.round(item.agencyAmount * 0.09).toLocaleString('en-IN')}) • SAC 9983</p>
                        </div>
                        {!item.isAgencyPaid && (
                          <button
                            onClick={() => {
                              setManualStudentId(s.id);
                              setManualStudentName(sName);
                              setManualTitle('Agency Processing Fee');
                              setManualAmount(String(item.agencyTotalWithGst));
                              setShowManualModal(true);
                            }}
                            className="w-full mt-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10.5px] font-bold text-slate-700 cursor-pointer"
                          >
                            + Record Stage 02
                          </button>
                        )}
                      </div>

                      {/* 3. VFS Gov Fee */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400">03. Embassy Filing</span>
                            {!item.hasUni ? (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9.5px] font-bold">Pending Uni</span>
                            ) : item.isVfsPaid ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9.5px] font-bold">Paid</span>
                            ) : item.isVfsPending ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[9.5px] font-bold animate-pulse">In Review</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[9.5px] font-bold">Due</span>
                            )}
                          </div>
                          <p className="text-xs font-black text-slate-900 mt-1">VFS / Visa Gov Fee</p>
                          {item.hasUni ? (
                            <>
                              <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                                <p className="text-base font-black text-emerald-800">{formatFeeEURandINR(item.rawVfsFee)}</p>
                                <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  0% GST (Govt Fee)
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Consular & Biometrics Filing</p>
                            </>
                          ) : (
                            <div className="mt-1">
                              <p className="text-xs font-bold text-slate-400">Not Applied</p>
                              <p className="text-[10px] text-slate-400 leading-tight">Applies after destination university selection.</p>
                            </div>
                          )}
                        </div>
                        {item.hasUni && !item.isVfsPaid && (
                          <button
                            onClick={() => {
                              setManualStudentId(s.id);
                              setManualStudentName(sName);
                              setManualTitle('VFS / Visa Gov Fee');
                              setManualAmount(String(item.vfsAmount));
                              setShowManualModal(true);
                            }}
                            className="w-full mt-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10.5px] font-bold text-slate-700 cursor-pointer"
                          >
                            + Record Stage 03
                          </button>
                        )}
                      </div>

                      {/* 4. University Tuition / Installments */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400">
                              04. Tuition Schedule
                            </span>
                            {!item.hasUni ? (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[9.5px] font-bold">Pending Uni</span>
                            ) : item.isInstallmentsEnabled ? (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[9.5px] font-bold">
                                {item.milestones.filter(m => m.isPaid).length}/{item.milestones.length} Paid
                              </span>
                            ) : item.isTuitionFeeEnabled ? (
                              item.isSingleTuitionPaid ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9.5px] font-bold">Settled</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[9.5px] font-bold">Due</span>
                              )
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[9.5px] font-bold">Direct to Uni</span>
                            )}
                          </div>
                          <p className="text-xs font-black text-slate-900 mt-1">
                            {item.isInstallmentsEnabled ? 'Tuition Installments & Schedule' : 'University Tuition'}
                          </p>
                          {item.hasUni ? (
                            <>
                              <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
                                <p className="text-base font-black text-slate-900">{formatFeeEURandINR(item.rawTuition)}</p>
                                <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  0% GST (Tuition)
                                </span>
                              </div>
                              {!item.isTuitionFeeEnabled && !item.isInstallmentsEnabled && (
                                <p className="text-[10px] text-slate-500 font-medium leading-tight mt-1">
                                  Direct University Payment. Does not reflect in platform dues until enabled.
                                </p>
                              )}
                            </>
                          ) : (
                            <div className="mt-1">
                              <p className="text-xs font-bold text-slate-400">Not Applied</p>
                              <p className="text-[10px] text-slate-400 leading-tight">Applies after destination university selection.</p>
                            </div>
                          )}
                        </div>

                        {item.hasUni && item.isInstallmentsEnabled && item.milestones.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {item.milestones.map((m, mIdx) => (
                              <div key={m.id} className="flex items-center justify-between text-[10.5px] bg-white p-1.5 rounded-lg border border-slate-200">
                                <span className="font-bold text-slate-700 truncate pr-1">#{mIdx + 1}: {m.title}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-mono font-bold text-slate-900">{m.amountFormatted}</span>
                                  {m.isPaid ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setManualStudentId(s.id);
                                        setManualStudentName(sName);
                                        setManualTitle(m.title);
                                        setManualAmount(String(m.amountInr));
                                        setShowManualModal(true);
                                      }}
                                      className="text-[9px] font-bold text-[#58051E] bg-[#58051E]/10 px-1.5 py-0.5 rounded hover:bg-[#58051E] hover:text-white cursor-pointer"
                                    >
                                      Record
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {item.hasUni && item.isTuitionFeeEnabled && !item.isInstallmentsEnabled && !item.isSingleTuitionPaid && (
                          <button
                            onClick={() => {
                              setManualStudentId(s.id);
                              setManualStudentName(sName);
                              setManualTitle('University Tuition Fee');
                              setManualAmount(String(item.tuitionInr));
                              setShowManualModal(true);
                            }}
                            className="w-full mt-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10.5px] font-bold text-slate-700 cursor-pointer"
                          >
                            + Record Stage 04
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Summary Outlay Strip */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-6">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Program Outlay</span>
                          <span className="font-black text-slate-900">₹{item.totalOutlay.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-600 block">Total Collected</span>
                          <span className="font-black text-emerald-700">₹{item.totalCollected.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-amber-600 block">Pending Due</span>
                          <span className="font-black text-amber-700">₹{item.totalPending.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <div className="text-[11px] font-medium text-slate-400">
                        Institutional deliverables & verification triggers verified
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* VIEW 2: ALL TRANSACTION LEDGER */}
      {activeViewMode === 'ledger' && (
      <>
      {/* Filters */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search student name, ID, UTR number, ref no, description..."
              className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]/40" />
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
                filterStatus === tab ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200/60'
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
                          <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#58051E]/10 text-[#58051E] border border-[#58051E]/20">
                            Journey Step {(p as any).milestone_step}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <p className="font-black text-slate-900">INR {Number(p.amount).toLocaleString('en-IN')}</p>
                        {(p as any).partial_amount != null && p.status === 'Partial' && (
                          <p className="text-[10px] text-blue-600 font-bold">Partial Paid: INR {Number((p as any).partial_amount).toLocaleString('en-IN')}</p>
                        )}
                        {isRefunded && (p as any).refund_amount > 0 && (
                          <p className="text-[10px] text-violet-600 font-bold">Refunded: INR {Number((p as any).refund_amount).toLocaleString('en-IN')}</p>
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
                                className="p-1.5 rounded-lg text-[#58051E] hover:bg-[#58051E]/10 border border-[#58051E]/20 transition-colors">
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
      </>
      )}

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
        {showManualModal && (() => {
          const selectedStudentData = studentsWithMilestones.find(s => s.student.id === manualStudentId);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowManualModal(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 z-10 text-left max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#58051E]/10 text-[#58051E] flex items-center justify-center font-black">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Record Payment & Settle Milestone</h3>
                      <p className="text-[10px] text-slate-400 font-semibold">Log cash voucher, cheque/DD, bank wire, or online payment</p>
                    </div>
                  </div>
                  <button onClick={() => setShowManualModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleManualPaymentSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Select Enrolled Student *</label>
                    <select
                      value={manualStudentId}
                      onChange={(e) => {
                        const sId = e.target.value;
                        setManualStudentId(sId);
                        const s = students.find(x => x.id === sId);
                        if (s) {
                          setManualStudentName(s.full_name || s.email);
                          const sm = studentsWithMilestones.find(x => x.student.id === sId);
                          if (sm) {
                            setManualTitle('Advanced Registration Fee');
                            setManualAmount(String(sm.advAmount));
                          }
                        }
                      }}
                      className="w-full h-9 px-3 mb-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Choose Existing Student --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name || s.email} ({s.email})
                        </option>
                      ))}
                    </select>
                    <input type="text" required value={manualStudentName} onChange={e => setManualStudentName(e.target.value)}
                      placeholder="e.g. Student Full Name"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]" />
                  </div>

                  {/* Dynamic Student Destination & Milestone Presets */}
                  {selectedStudentData && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#58051E]" /> {selectedStudentData.uniName}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">{selectedStudentData.uniCountry}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] font-black uppercase text-slate-400 block mb-1">Click to auto-populate fee stage:</span>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setManualTitle('Advanced Registration Fee');
                              setManualAmount(String(selectedStudentData.advAmount));
                            }}
                            className="px-2 py-1 bg-white hover:bg-[#58051E] hover:text-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-800 transition-colors"
                          >
                            01. Registration (₹{selectedStudentData.advAmount.toLocaleString('en-IN')})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setManualTitle('Agency Processing Fee');
                              setManualAmount(String(selectedStudentData.agencyAmount));
                            }}
                            className="px-2 py-1 bg-white hover:bg-[#58051E] hover:text-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-800 transition-colors"
                          >
                            02. Agency Fee ({formatFeeEURandINR(selectedStudentData.rawAgencyFee)})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setManualTitle('VFS / Visa Gov Fee');
                              setManualAmount(String(selectedStudentData.vfsAmount));
                            }}
                            className="px-2 py-1 bg-white hover:bg-[#58051E] hover:text-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-800 transition-colors"
                          >
                            03. VFS Fee ({formatFeeEURandINR(selectedStudentData.rawVfsFee)})
                          </button>
                          {selectedStudentData.isInstallmentsEnabled && selectedStudentData.milestones.map((m, idx) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setManualTitle(m.title);
                                setManualAmount(String(m.amountInr));
                              }}
                              className="px-2 py-1 bg-white hover:bg-[#58051E] hover:text-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-800 transition-colors"
                            >
                              04.{idx + 1} {m.title} ({m.amountFormatted})
                            </button>
                          ))}
                          {!selectedStudentData.isInstallmentsEnabled && (
                            <button
                              type="button"
                              onClick={() => {
                                setManualTitle(`University Tuition Fee - ${selectedStudentData.uniName}`);
                                setManualAmount(String(parseFeeToINR(selectedStudentData.rawTuition)));
                              }}
                              className="px-2 py-1 bg-white hover:bg-[#58051E] hover:text-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-800 transition-colors"
                            >
                              04. University Tuition ({formatFeeEURandINR(selectedStudentData.rawTuition)})
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Amount (INR) *</label>
                      <input type="number" required min={1} value={manualAmount} onChange={e => setManualAmount(e.target.value)}
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#58051E]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Payment Method *</label>
                      <select value={manualMethod} onChange={e => setManualMethod(e.target.value)}
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer">
                        <option value="Bank Wire Transfer (NEFT/RTGS/IMPS)">Bank Wire Transfer (NEFT/RTGS/IMPS)</option>
                        <option value="International SWIFT Wire (EUR/USD)">International SWIFT Wire (EUR/USD)</option>
                        <option value="Direct Net Banking / Debit Card">Direct Net Banking / Debit Card</option>
                        <option value="Cheque / Demand Draft (DD)">Cheque / Demand Draft (DD)</option>
                        <option value="Cash Payment (Counter Voucher)">Cash Payment (Counter Voucher)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Fee Description / Stage Title</label>
                    <input type="text" value={manualTitle} onChange={e => setManualTitle(e.target.value)}
                      placeholder="e.g. Advanced Registration Fee"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                        {manualMethod.includes('Cash') ? 'Voucher / Receipt Ref' : manualMethod.includes('Cheque') ? 'Cheque / DD No' : 'UTR / Wire Ref No'}
                      </label>
                      <input type="text" value={manualUtr} onChange={e => setManualUtr(e.target.value)}
                        placeholder={manualMethod.includes('Cash') ? 'e.g. CSH-VCH-8901' : manualMethod.includes('Cheque') ? 'e.g. CHQ-004812' : 'e.g. HDFC129038102'}
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Initial Status</label>
                      <select value={manualStatus} onChange={e => setManualStatus(e.target.value as any)}
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 focus:outline-none cursor-pointer">
                        <option value="Paid">Verified & Paid</option>
                        <option value="Pending">Pending Verification</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => setShowManualModal(false)}
                      className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
                    <button type="submit" disabled={isProcessing === 'manual'}
                      className="flex-1 h-9 bg-[#58051E] text-white text-xs font-black rounded-xl hover:bg-[#430316] shadow-sm cursor-pointer disabled:opacity-50">
                      {isProcessing === 'manual' ? 'Saving...' : 'Record Payment'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          );
        })()}
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
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]/40" />
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
