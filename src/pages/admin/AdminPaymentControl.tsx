import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Banknote, Landmark, QrCode, Search, Filter,
  CheckCircle2, XCircle, AlertCircle, Clock, Eye, Download,
  Plus, RotateCcw, Sparkles, X, ChevronRight, FileText,
  DollarSign, TrendingUp, ShieldCheck, ArrowUpRight, GraduationCap,
  Layers, Check, ExternalLink, RefreshCw
} from 'lucide-react';
import {
  getAllPaymentsAdmin,
  getPaymentStats,
  verifyPayment,
  rejectPayment,
  issueRefund,
  createAndCompletePayment
} from '../../lib/api/payments';
import { getApplications } from '../../lib/api/applications';
import { useUniversities } from '../../hooks/useUniversities';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { parseFeeToINR, formatFeeEURandINR } from '../Payments';
import { CashPaymentModal } from '../../components/CashPaymentModal';
import { InvoiceModal, type InvoiceData } from '../../components/InvoiceModal';
import { getStudents } from '../../lib/api/students';
import type { UserProfile, Payment, Application } from '../../lib/types';

export const AdminPaymentControl: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const { universities } = useUniversities();
  const { config: feeConfig } = useFeeConfig();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCollected: 0, pendingDues: 0, failedCount: 0, refundTotal: 0, partialCount: 0 });

  // Mode Switcher: 'milestones' | 'ledger'
  const [activeViewMode, setActiveViewMode] = useState<'milestones' | 'ledger'>('milestones');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMethodFilter, setActiveMethodFilter] = useState<string>('All');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'cash' | 'methods'>('all');

  // Modals
  const [showCashModal, setShowCashModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<InvoiceData | null>(null);
  const [viewPaymentDetail, setViewPaymentDetail] = useState<Payment | null>(null);

  // Quick action verification
  const [verifyItem, setVerifyItem] = useState<Payment | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [rejectItem, setRejectItem] = useState<Payment | null>(null);
  const [rejectReason, setRejectReason] = useState('Invalid or unmatched UTR transaction reference number.');

  // Manual Bank Transfer Entry Form State
  const [bankStudentId, setBankStudentId] = useState('');
  const [bankAmount, setBankAmount] = useState('15000');
  const [bankStage, setBankStage] = useState<1 | 2 | 3 | 4>(1);
  const [bankUtr, setBankUtr] = useState('');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [bankDate, setBankDate] = useState(new Date().toISOString().split('T')[0]);

  const [toastMessage, setToastMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPays, st, stList, appList] = await Promise.all([
        getAllPaymentsAdmin(),
        getPaymentStats(),
        getStudents(),
        getApplications()
      ]);
      setPayments(allPays || []);
      setStats(st || { totalCollected: 0, pendingDues: 0, failedCount: 0, refundTotal: 0, partialCount: 0 });
      setStudents(stList || []);
      setApplications(appList || []);
    } catch (e) {
      console.error('Error loading payments control:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('ferex_payment_change', handleSync);
    window.addEventListener('ferex_students_change', handleSync);
    return () => {
      window.removeEventListener('ferex_payment_change', handleSync);
      window.removeEventListener('ferex_students_change', handleSync);
    };
  }, []);

  // Selected student university fee computation for Bank Wire Modal
  const selectedBankStudentApp = useMemo(() => {
    if (!bankStudentId) return null;
    return applications.find(a => a.student_id === bankStudentId) || null;
  }, [bankStudentId, applications]);

  const selectedBankStudentUni = useMemo(() => {
    if (!selectedBankStudentApp) return null;
    return universities.find(u =>
      (selectedBankStudentApp.university_id && u.id === selectedBankStudentApp.university_id) ||
      (selectedBankStudentApp.university_name && u.name?.toLowerCase().trim() === selectedBankStudentApp.university_name?.toLowerCase().trim())
    ) || null;
  }, [selectedBankStudentApp, universities]);

  // Stage fee defaults for Bank Wire Modal
  const dynamicBankStageAmounts = useMemo(() => {
    const adv = Number(feeConfig.advance_registration_fee_amount || feeConfig.advance_registration_fee_inr || 15000);
    const agencyRaw = selectedBankStudentUni?.agency_fee || feeConfig.default_agency_fee || '₹25,000';
    const agencyInr = parseFeeToINR(agencyRaw);
    const vfsRaw = selectedBankStudentUni?.vfs_fee || feeConfig.default_vfs_fee || '₹15,000';
    const vfsInr = parseFeeToINR(vfsRaw);
    const tuitionRaw = selectedBankStudentUni?.university_fee || selectedBankStudentUni?.tuition_range || '€3,500 / yr';
    const tuitionInr = parseFeeToINR(tuitionRaw);

    return {
      1: { inr: adv, raw: `₹${adv.toLocaleString('en-IN')}` },
      2: { inr: agencyInr, raw: agencyRaw },
      3: { inr: vfsInr, raw: vfsRaw },
      4: { inr: tuitionInr, raw: tuitionRaw }
    };
  }, [selectedBankStudentUni, feeConfig]);

  // When student or stage changes in bank modal, preset the amount
  const handleBankStudentChange = (stId: string) => {
    setBankStudentId(stId);
    if (!stId) return;
    const app = applications.find(a => a.student_id === stId);
    const uni = universities.find(u =>
      (app?.university_id && u.id === app.university_id) ||
      (app?.university_name && u.name?.toLowerCase().trim() === app.university_name?.toLowerCase().trim())
    );
    const adv = Number(feeConfig.advance_registration_fee_amount || feeConfig.advance_registration_fee_inr || 15000);
    const agencyInr = parseFeeToINR(uni?.agency_fee || feeConfig.default_agency_fee || '₹25,000');
    const vfsInr = parseFeeToINR(uni?.vfs_fee || feeConfig.default_vfs_fee || '₹15,000');
    const tuitionInr = parseFeeToINR(uni?.university_fee || uni?.tuition_range || '€3,500 / yr');

    const mappedAmt = bankStage === 1 ? adv : bankStage === 2 ? agencyInr : bankStage === 3 ? vfsInr : tuitionInr;
    setBankAmount(String(mappedAmt));
  };

  const handleBankStageSelect = (stageNum: 1 | 2 | 3 | 4) => {
    setBankStage(stageNum);
    const amt = dynamicBankStageAmounts[stageNum]?.inr || 15000;
    setBankAmount(String(amt));
  };

  // Student Fee Milestones & Outlays Matrix
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
      const advAmount = Number(feeConfig.advance_registration_fee_amount || feeConfig.advance_registration_fee_inr || 15000);
      const advPay = payments.find(p => p.student_id === sId && (p.stage_number === 1 || p.title?.toLowerCase().includes('registration') || p.payment_type?.toLowerCase().includes('registration') || p.title?.toLowerCase().includes('advance')));
      const isAdvPaid = advPay?.status === 'Paid' || advPay?.status === 'Verified';
      const isAdvPending = advPay?.status === 'Pending Verification' || advPay?.status === 'Pending';

      // 2. Agency Fee
      const rawAgencyFee = studentUni?.agency_fee || feeConfig.default_agency_fee || '₹25,000';
      const agencyAmount = parseFeeToINR(rawAgencyFee);
      const agencyPay = payments.find(p => p.student_id === sId && (p.stage_number === 2 || (p.title?.toLowerCase().includes('agency') && !p.title?.toLowerCase().includes('tuition'))));
      const isAgencyPaid = agencyPay?.status === 'Paid' || agencyPay?.status === 'Verified';
      const isAgencyPending = agencyPay?.status === 'Pending Verification' || agencyPay?.status === 'Pending';

      // 3. VFS Fee
      const rawVfsFee = studentUni?.vfs_fee || feeConfig.default_vfs_fee || '₹15,000';
      const vfsAmount = parseFeeToINR(rawVfsFee);
      const vfsPay = payments.find(p => p.student_id === sId && (p.stage_number === 3 || p.title?.toLowerCase().includes('vfs') || p.payment_type?.toLowerCase().includes('visa') || p.title?.toLowerCase().includes('consular')));
      const isVfsPaid = vfsPay?.status === 'Paid' || vfsPay?.status === 'Verified';
      const isVfsPending = vfsPay?.status === 'Pending Verification' || vfsPay?.status === 'Pending';

      // 4. University Tuition / Installments
      const isInstallmentsEnabled = Boolean(studentUni?.installments_enabled && studentUni?.installments && studentUni.installments.length > 0);
      const rawTuition = studentUni?.university_fee || studentUni?.tuition_range || '€3,500 / yr';
      const tuitionInr = parseFeeToINR(rawTuition);

      const milestones = isInstallmentsEnabled && studentUni?.installments ? studentUni.installments.map((inst, idx) => {
        const mTitle = inst.title || inst.name || `Tuition Installment #${idx + 1}`;
        const mDue = inst.due_stage || inst.due_trigger || 'Milestone Trigger';
        const mAmtInr = parseFeeToINR(inst.amount);
        const mPay = payments.find(p => p.student_id === sId && ((p as any).installment_id === inst.id || p.title?.toLowerCase().includes(mTitle.toLowerCase()) || p.title?.toLowerCase().includes(`installment #${idx + 1}`)));
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

      const singleTuitionPay = payments.find(p => p.student_id === sId && (p.stage_number === 4 || (p.title?.toLowerCase().includes('tuition') && !p.title?.toLowerCase().includes('agency'))));
      const isSingleTuitionPaid = singleTuitionPay?.status === 'Paid' || singleTuitionPay?.status === 'Verified';
      const isSingleTuitionPending = singleTuitionPay?.status === 'Pending Verification' || singleTuitionPay?.status === 'Pending';

      const totalExpected = (isAdvEnabled ? advAmount : 0) + agencyAmount + vfsAmount + tuitionInr;
      const totalPaid = (isAdvPaid ? (advPay?.amount || advAmount) : 0) +
        (isAgencyPaid ? (agencyPay?.amount || agencyAmount) : 0) +
        (isVfsPaid ? (vfsPay?.amount || vfsAmount) : 0) +
        (isInstallmentsEnabled
          ? milestones.filter(m => m.isPaid).reduce((sum, m) => sum + (m.paymentRecord?.amount || m.amountInr), 0)
          : (isSingleTuitionPaid ? (singleTuitionPay?.amount || tuitionInr) : 0));

      const totalPendingDues = Math.max(0, totalExpected - totalPaid);

      return {
        student: st,
        studentId: sId,
        studentName: sName,
        email: st.email,
        phone: st.phone,
        hasUni,
        uniName,
        uniCountry,
        courseName,
        studentUni,
        isAdvEnabled,
        advAmount,
        isAdvPaid,
        isAdvPending,
        advPay,
        rawAgencyFee,
        agencyAmount,
        isAgencyPaid,
        isAgencyPending,
        agencyPay,
        rawVfsFee,
        vfsAmount,
        isVfsPaid,
        isVfsPending,
        vfsPay,
        isInstallmentsEnabled,
        rawTuition,
        tuitionInr,
        milestones,
        isSingleTuitionPaid,
        isSingleTuitionPending,
        singleTuitionPay,
        totalExpected,
        totalPaid,
        totalPendingDues
      };
    }).filter(st => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return st.studentName.toLowerCase().includes(q) ||
        st.email.toLowerCase().includes(q) ||
        st.uniName.toLowerCase().includes(q) ||
        st.courseName.toLowerCase().includes(q);
    });
  }, [students, applications, universities, feeConfig, payments, searchQuery]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Metrics breakdown
  const todayStr = new Date().toISOString().split('T')[0];
  const totalToday = useMemo(() => {
    return payments
      .filter(p => (p.status === 'Paid' || p.status === 'Verified') && (p.created_at || '').startsWith(todayStr))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments, todayStr]);

  const pendingList = useMemo(() => {
    return payments.filter(p => p.status === 'Pending Verification' || p.status === 'Pending');
  }, [payments]);

  const rejectedList = useMemo(() => {
    return payments.filter(p => p.status === 'Rejected');
  }, [payments]);

  // Method Breakdown
  const methodStats = useMemo(() => {
    const res: Record<string, { count: number; total: number }> = {
      PhonePe: { count: 0, total: 0 },
      UPI: { count: 0, total: 0 },
      Cash: { count: 0, total: 0 },
      Bank: { count: 0, total: 0 },
    };

    payments.forEach(p => {
      const m = (p.payment_method || (p as any).method || '').toLowerCase();
      const isPaid = p.status === 'Paid' || p.status === 'Verified';
      const amt = Number(p.amount) || 0;

      if (m.includes('phonepe') || m.includes('stripe') || m.includes('card') || m.includes('online')) {
        res.PhonePe.count += 1;
        if (isPaid) res.PhonePe.total += amt;
      } else if (m.includes('upi') || m.includes('qr') || m.includes('gpay')) {
        res.UPI.count += 1;
        if (isPaid) res.UPI.total += amt;
      } else if (m.includes('cash')) {
        res.Cash.count += 1;
        if (isPaid) res.Cash.total += amt;
      } else {
        res.Bank.count += 1;
        if (isPaid) res.Bank.total += amt;
      }
    });

    return res;
  }, [payments]);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Tab filter
      if (activeTab === 'pending' && p.status !== 'Pending Verification' && p.status !== 'Pending') return false;
      if (activeTab === 'cash' && !(p.payment_method || '').toLowerCase().includes('cash')) return false;

      // Method Filter
      if (activeMethodFilter !== 'All') {
        const m = (p.payment_method || '').toLowerCase();
        if (activeMethodFilter === 'PhonePe' && !m.includes('phonepe') && !m.includes('stripe') && !m.includes('card') && !m.includes('online')) return false;
        if (activeMethodFilter === 'UPI' && !m.includes('upi') && !m.includes('qr')) return false;
        if (activeMethodFilter === 'Cash' && !m.includes('cash')) return false;
        if (activeMethodFilter === 'Bank' && !m.includes('bank') && !m.includes('wire') && !m.includes('neft')) return false;
      }

      // Status Filter
      if (activeStatusFilter !== 'All') {
        if (activeStatusFilter === 'Pending' && p.status !== 'Pending Verification' && p.status !== 'Pending') return false;
        if (activeStatusFilter === 'Paid' && p.status !== 'Paid' && p.status !== 'Verified') return false;
        if (activeStatusFilter === 'Rejected' && p.status !== 'Rejected') return false;
        if (activeStatusFilter === 'Refunded' && p.status !== 'Refunded') return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sName = (p.student_name || (p.users as any)?.full_name || '').toLowerCase();
        const sEmail = ((p.users as any)?.email || '').toLowerCase();
        const ref = (p.ref_no || p.utr_number || (p as any).transaction_id || p.id || '').toLowerCase();
        const title = (p.title || p.description || '').toLowerCase();

        return sName.includes(q) || sEmail.includes(q) || ref.includes(q) || title.includes(q);
      }

      return true;
    });
  }, [payments, activeTab, activeMethodFilter, activeStatusFilter, searchQuery]);

  // Handle Verify Payment
  const handleApprovePayment = async () => {
    if (!verifyItem) return;
    setIsProcessing(true);
    try {
      await verifyPayment(verifyItem.id, verifyNotes || 'Approved and verified by Admissions Administration.');
      showToast(`Payment of ₹${Number(verifyItem.amount).toLocaleString('en-IN')} approved successfully.`);
      setVerifyItem(null);
      setVerifyNotes('');
      loadData();
    } catch (e: any) {
      showToast(`Error: ${e.message || 'Verification failed'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Reject Payment
  const handleRejectPayment = async () => {
    if (!rejectItem) return;
    setIsProcessing(true);
    try {
      await rejectPayment(rejectItem.id, rejectReason);
      showToast(`Payment rejected: ${rejectReason}`);
      setRejectItem(null);
      loadData();
    } catch (e: any) {
      showToast(`Error: ${e.message || 'Rejection failed'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Manual Bank Wire Entry
  const handleBankWireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankStudentId) {
      showToast('Please select a student.');
      return;
    }
    const studentObj = students.find(s => s.id === bankStudentId);
    const numAmt = parseFloat(bankAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      showToast('Please enter a valid amount.');
      return;
    }

    setIsProcessing(true);
    try {
      const stageMeta = {
        1: { title: 'Advanced Registration Fee', type: 'Advanced Registration Fee' },
        2: { title: 'Agency Processing Fee', type: 'Agency Processing Fee' },
        3: { title: 'VFS / Visa Gov Fee', type: 'VFS / Visa Gov Fee' },
        4: { title: 'University Tuition Fee', type: 'Tuition Fee' },
      }[bankStage] || { title: 'Advanced Registration Fee', type: 'Advanced Registration Fee' };

      await createAndCompletePayment({
        student_id: bankStudentId,
        student_name: studentObj?.full_name || studentObj?.email?.split('@')[0] || 'Student',
        title: `${stageMeta.title} - Direct Bank Wire`,
        description: `Direct Bank Transfer via ${bankName}. UTR #${bankUtr || 'NEFT-' + Date.now().toString().slice(-6)} on ${bankDate}.`,
        amount: numAmt,
        currency: 'INR',
        payment_type: stageMeta.type,
        payment_method: 'Bank Wire Transfer',
        status: 'Paid',
        utr_number: bankUtr || `NEFT-${Date.now().toString().slice(-6)}`,
        verified_by: 'Admissions Finance Desk',
        verified_at: new Date().toISOString(),
        stage_number: bankStage
      } as any);

      showToast('Direct bank transfer verified & recorded successfully!');
      setShowBankModal(false);
      loadData();
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Action failed'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenTaxInvoice = (payment: Payment) => {
    const inv: InvoiceData = {
      invoice_no: payment.ref_no || `FRX-INV-${payment.id.slice(0, 6).toUpperCase()}`,
      student_name: payment.student_name || (payment.users as any)?.full_name || 'Enrolled Student',
      amount: Number(payment.amount),
      currency: payment.currency || 'INR',
      description: payment.title || payment.description || 'Overseas Higher Education Processing Fee',
      date: new Date(payment.created_at).toLocaleDateString(),
      payment_method: payment.payment_method || 'Official Gateway',
      utr_number: payment.utr_number || payment.ref_no || payment.id.slice(0, 8),
      place_of_supply: 'Kerala (32)',
      course_destination: 'Overseas Higher Education'
    };
    setViewInvoice(inv);
  };

  return (
    <div className="space-y-6 text-left relative min-h-[700px] pb-12">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-slate-700"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Payment & Billing Control Console
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Manage student PhonePe UPI verifications, online gateway settlements, cash receipts, and direct bank wires.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowBankModal(true)}
            className="px-3.5 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5 text-slate-500" />
            + Manual Bank Transfer
          </button>
          <button
            onClick={() => setShowCashModal(true)}
            className="px-4 py-2.5 bg-[#58051E] text-white hover:bg-[#430316] rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Banknote className="w-4 h-4" />
            + Record Cash Payment
          </button>
        </div>
      </div>

      {/* Top Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Received (All Time)</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ₹
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{stats.totalCollected.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            ₹{totalToday.toLocaleString('en-IN')} collected today
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Verifications</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600">
            {pendingList.length}
          </div>
          <button
            onClick={() => { setActiveTab('pending'); setActiveStatusFilter('Pending'); }}
            className="text-[11px] font-bold text-amber-700 hover:underline mt-1 block cursor-pointer"
          >
            Review pending queue &rarr;
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Rejected Transactions</span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-600">
            {rejectedList.length}
          </div>
          <div className="text-[11px] font-medium text-slate-400 mt-1">
            Flagged for invalid UTR / bounce
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Verified Count</span>
            <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {payments.filter(p => p.status === 'Paid' || p.status === 'Verified').length}
          </div>
          <div className="text-[11px] font-medium text-slate-400 mt-1">
            Receipted and invoiced
          </div>
        </div>
      </div>

      {/* Payment Method Channels Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => { setActiveMethodFilter('PhonePe'); setActiveTab('all'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeMethodFilter === 'PhonePe' ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <CreditCard className={`w-4 h-4 ${activeMethodFilter === 'PhonePe' ? 'text-white' : 'text-[#58051E]'}`} />
            <span className={`text-[10px] font-black uppercase ${activeMethodFilter === 'PhonePe' ? 'text-white/80' : 'text-slate-400'}`}>
              PhonePe UPI
            </span>
          </div>
          <p className="text-xs font-bold">₹{methodStats.PhonePe.total.toLocaleString('en-IN')}</p>
          <p className={`text-[10px] ${activeMethodFilter === 'PhonePe' ? 'text-white/70' : 'text-slate-400'}`}>
            {methodStats.PhonePe.count} Transactions
          </p>
        </div>

        <div
          onClick={() => { setActiveMethodFilter('UPI'); setActiveTab('all'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeMethodFilter === 'UPI' ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <QrCode className={`w-4 h-4 ${activeMethodFilter === 'UPI' ? 'text-white' : 'text-emerald-600'}`} />
            <span className={`text-[10px] font-black uppercase ${activeMethodFilter === 'UPI' ? 'text-white/80' : 'text-slate-400'}`}>
              UPI QR / ID
            </span>
          </div>
          <p className="text-xs font-bold">₹{methodStats.UPI.total.toLocaleString('en-IN')}</p>
          <p className={`text-[10px] ${activeMethodFilter === 'UPI' ? 'text-white/70' : 'text-slate-400'}`}>
            {methodStats.UPI.count} Submissions
          </p>
        </div>

        <div
          onClick={() => { setActiveMethodFilter('Cash'); setActiveTab('all'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeMethodFilter === 'Cash' ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <Banknote className={`w-4 h-4 ${activeMethodFilter === 'Cash' ? 'text-white' : 'text-amber-600'}`} />
            <span className={`text-[10px] font-black uppercase ${activeMethodFilter === 'Cash' ? 'text-white/80' : 'text-slate-400'}`}>
              Desk Cash
            </span>
          </div>
          <p className="text-xs font-bold">₹{methodStats.Cash.total.toLocaleString('en-IN')}</p>
          <p className={`text-[10px] ${activeMethodFilter === 'Cash' ? 'text-white/70' : 'text-slate-400'}`}>
            {methodStats.Cash.count} In-Person
          </p>
        </div>

        <div
          onClick={() => { setActiveMethodFilter('Bank'); setActiveTab('all'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeMethodFilter === 'Bank' ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <Landmark className={`w-4 h-4 ${activeMethodFilter === 'Bank' ? 'text-white' : 'text-blue-600'}`} />
            <span className={`text-[10px] font-black uppercase ${activeMethodFilter === 'Bank' ? 'text-white/80' : 'text-slate-400'}`}>
              Bank Wire
            </span>
          </div>
          <p className="text-xs font-bold">₹{methodStats.Bank.total.toLocaleString('en-IN')}</p>
          <p className={`text-[10px] ${activeMethodFilter === 'Bank' ? 'text-white/70' : 'text-slate-400'}`}>
            {methodStats.Bank.count} Direct Wires
          </p>
        </div>
      </div>

      {/* View Switcher: Milestones Matrix vs Full Ledger */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveViewMode('milestones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeViewMode === 'milestones'
              ? 'bg-[#58051E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Student Fee Milestones & Outlays ({studentsWithMilestones.length})
        </button>
        <button
          onClick={() => setActiveViewMode('ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeViewMode === 'ledger'
              ? 'bg-[#58051E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          All Transaction Ledger Records ({payments.length})
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
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search student by name, email, target university, or country..."
                className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white"
              />
            </div>
            <div className="text-xs text-slate-500 font-bold shrink-0">
              Showing <span className="text-slate-900 font-black">{studentsWithMilestones.length}</span> Enrolled Students
            </div>
          </div>

          <div className="space-y-4">
            {studentsWithMilestones.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No students match search</p>
                <p className="text-xs text-slate-500">Try searching with a different name, email or university.</p>
              </div>
            ) : (
              studentsWithMilestones.map(item => {
                const s = item.student;
                const sName = item.studentName;

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

                      <div className="flex items-center gap-2.5 self-end md:self-auto">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          item.isInstallmentsEnabled ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {item.isInstallmentsEnabled ? `Milestones Active (${item.milestones.length} Stages)` : 'Direct University Payment'}
                        </span>
                        <button
                          onClick={() => {
                            setBankStudentId(s.id);
                            setBankStage(1);
                            setBankAmount(String(item.advAmount));
                            setShowBankModal(true);
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
                          <p className="text-base font-black text-[#58051E]">₹{item.advAmount.toLocaleString('en-IN')}</p>
                        </div>
                        {!item.isAdvPaid && (
                          <button
                            onClick={() => {
                              setBankStudentId(s.id);
                              setBankStage(1);
                              setBankAmount(String(item.advAmount));
                              setShowBankModal(true);
                            }}
                            className="w-full mt-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10.5px] font-bold text-slate-700"
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
                          <p className="text-base font-black text-indigo-900">{formatFeeEURandINR(item.rawAgencyFee)}</p>
                        </div>
                        {!item.isAgencyPaid && (
                          <button
                            onClick={() => {
                              setBankStudentId(s.id);
                              setBankStage(2);
                              setBankAmount(String(item.agencyAmount));
                              setShowBankModal(true);
                            }}
                            className="w-full mt-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10.5px] font-bold text-slate-700"
                          >
                            + Record Stage 02
                          </button>
                        )}
                      </div>

                      {/* 3. VFS Gov Fee */}
                      <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-slate-400">Stage 03 • Embassy / VFS</span>
                            {item.isVfsPaid ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9.5px] font-bold">Paid</span>
                            ) : item.isVfsPending ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[9.5px] font-bold animate-pulse">In Review</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[9.5px] font-bold">Due</span>
                            )}
                          </div>
                          <p className="text-xs font-black text-slate-900 mt-1">VFS / Visa Gov Fee</p>
                          <p className="text-base font-black text-amber-900">{formatFeeEURandINR(item.rawVfsFee)}</p>
                        </div>
                        {!item.isVfsPaid && (
                          <button
                            onClick={() => {
                              setBankStudentId(s.id);
                              setBankStage(3);
                              setBankAmount(String(item.vfsAmount));
                              setShowBankModal(true);
                            }}
                            className="w-full mt-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10.5px] font-bold text-slate-700"
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
                              {item.isInstallmentsEnabled ? `Stage 04 • ${item.milestones.length} Milestones` : 'Stage 04 • Direct Tuition'}
                            </span>
                            {item.isInstallmentsEnabled ? (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[9.5px] font-bold">
                                {item.milestones.filter(m => m.isPaid).length}/{item.milestones.length} Paid
                              </span>
                            ) : item.isSingleTuitionPaid ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9.5px] font-bold">Direct Settled</span>
                            ) : item.isSingleTuitionPending ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[9.5px] font-bold animate-pulse">In Review</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[9.5px] font-bold">Direct Due</span>
                            )}
                          </div>
                          <p className="text-xs font-black text-slate-900 mt-1">University Tuition</p>
                          <p className="text-base font-black text-emerald-900">{formatFeeEURandINR(item.rawTuition)}</p>
                        </div>
                        {item.isInstallmentsEnabled ? (
                          <div className="space-y-1 mt-2">
                            {item.milestones.map((m, mIdx) => (
                              <div key={m.id} className="flex items-center justify-between text-[10px] bg-white p-1.5 rounded border border-slate-100">
                                <span className="font-semibold text-slate-700 truncate max-w-[110px]">{m.title}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{m.amountFormatted}</span>
                                  {m.isPaid ? (
                                    <span className="text-emerald-600 font-black">✓</span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setBankStudentId(s.id);
                                        setBankStage(4);
                                        setBankAmount(String(m.amountInr));
                                        setShowBankModal(true);
                                      }}
                                      className="text-blue-600 hover:underline font-bold"
                                    >
                                      Settle
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : !item.isSingleTuitionPaid && (
                          <button
                            onClick={() => {
                              setBankStudentId(s.id);
                              setBankStage(4);
                              setBankAmount(String(item.tuitionInr));
                              setShowBankModal(true);
                            }}
                            className="w-full mt-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10.5px] font-bold text-slate-700"
                          >
                            + Record Direct Tuition
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Summary Footer: Total Outlay vs Paid */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-4 text-slate-500 font-medium">
                        <span>Total Expected Outlay: <strong className="text-slate-900 font-black">₹{item.totalExpected.toLocaleString('en-IN')}</strong></span>
                        <span>•</span>
                        <span>Total Cleared: <strong className="text-emerald-700 font-black">₹{item.totalPaid.toLocaleString('en-IN')}</strong></span>
                      </div>
                      <div className="text-xs">
                        {item.totalPendingDues > 0 ? (
                          <span className="font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            Outstanding Balance: ₹{item.totalPendingDues.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> All Scheduled Stages Settled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: ALL TRANSACTION LEDGER RECORDS */}
      {activeViewMode === 'ledger' && (
        <div className="space-y-4">
          {/* Main Filter & Navigation Tabs */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
                <button
                  onClick={() => { setActiveTab('all'); setActiveMethodFilter('All'); setActiveStatusFilter('All'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'all' && activeMethodFilter === 'All'
                      ? 'bg-[#58051E] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Records ({payments.length})
                </button>
                <button
                  onClick={() => { setActiveTab('pending'); setActiveStatusFilter('Pending'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Pending Queue ({pendingList.length})
                </button>
                <button
                  onClick={() => { setActiveTab('cash'); setActiveMethodFilter('Cash'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'cash'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  Cash Entries ({methodStats.Cash.count})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={activeStatusFilter}
                  onChange={(e) => setActiveStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white"
                >
                  <option value="All">All Statuses</option>
                  <option value="Paid">Paid / Verified</option>
                  <option value="Pending">Pending Verification</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Refunded">Refunded</option>
                </select>

                <select
                  value={activeMethodFilter}
                  onChange={(e) => setActiveMethodFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white"
                >
                  <option value="All">All Gateways</option>
                  <option value="PhonePe">PhonePe UPI</option>
                  <option value="UPI">UPI QR / ID</option>
                  <option value="Cash">Cash Receipt</option>
                  <option value="Bank">Bank Wire</option>
                </select>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions by student name, email, UTR reference number, invoice..."
                className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-[#58051E]/20"
              />
            </div>
          </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-[#58051E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-500">Loading payment ledger...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No payment transactions found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No transactions match your active query. Record a cash payment or clear filters to view ledger.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Student & Contact</th>
                  <th className="py-3 px-4">Description / Stage</th>
                  <th className="py-3 px-4">UTR / Ref #</th>
                  <th className="py-3 px-4">Gateway Method</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => {
                  const sName = p.student_name || (p.users as any)?.full_name || 'Enrolled Student';
                  const sEmail = (p.users as any)?.email || 'student@ferex.com';
                  const isPending = p.status === 'Pending Verification' || p.status === 'Pending';
                  const isPaid = p.status === 'Paid' || p.status === 'Verified';
                  const isRejected = p.status === 'Rejected';
                  const isRefunded = p.status === 'Refunded';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 group-hover:text-[#58051E] transition-colors">
                          {sName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">{sEmail}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 line-clamp-1">{p.title || p.description || 'Installment Fee'}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {p.utr_number || p.ref_no || (p as any).transaction_id || p.id.slice(0, 8)}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                          {p.payment_method?.toLowerCase().includes('cash') ? (
                            <Banknote className="w-3.5 h-3.5 text-amber-600" />
                          ) : p.payment_method?.toLowerCase().includes('upi') ? (
                            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                          ) : p.payment_method?.toLowerCase().includes('bank') ? (
                            <Landmark className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5 text-[#58051E]" />
                          )}
                          {p.payment_method || 'Online Card'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-black text-slate-900 text-sm">
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : isPending
                              ? 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
                              : isRejected
                                ? 'bg-rose-50 text-rose-700 border border-rose-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}>
                          {isPaid ? 'PAID' : isPending ? 'VERIFICATION DUE' : isRejected ? 'REJECTED' : isRefunded ? 'REFUNDED' : p.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => setVerifyItem(p)}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Approve & Verify Payment"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Verify
                              </button>
                              <button
                                onClick={() => setRejectItem(p)}
                                className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Reject Invalid Submission"
                              >
                                <XCircle className="w-3 h-3" />
                                Reject
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenTaxInvoice(p)}
                                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="View GST Tax Invoice"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenTaxInvoice(p)}
                                className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Official Receipt"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )}

      {/* Cash Payment Modal */}
      <CashPaymentModal
        isOpen={showCashModal}
        onClose={() => setShowCashModal(false)}
        onSuccess={() => {
          showToast('Cash payment registered and receipt issued.');
          loadData();
        }}
      />

      {/* Manual Bank Wire Modal */}
      <AnimatePresence>
        {showBankModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">Record Direct Bank Wire / NEFT</h2>
                    <p className="text-[11px] font-medium text-slate-500">Official Bank Statement Clearance</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBankModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleBankWireSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Student *</label>
                  <select
                    required
                    value={bankStudentId}
                    onChange={(e) => handleBankStudentChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="">Choose student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name || s.email.split('@')[0]} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination & Active University Auto-detected info banner */}
                {bankStudentId && selectedBankStudentUni && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                        {selectedBankStudentUni.name}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                        {selectedBankStudentUni.country}
                      </span>
                    </div>
                  </div>
                )}

                {/* 4 Standardized Payment Stages matching Student Portal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Category / Stage *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { num: 1 as const, label: 'Advance Registration', sub: '01. Platform Intake', amt: dynamicBankStageAmounts[1] },
                      { num: 2 as const, label: 'Agency Processing', sub: '02. Admissions Support', amt: dynamicBankStageAmounts[2] },
                      { num: 3 as const, label: 'VFS / Visa Gov Fee', sub: '03. Embassy Filing', amt: dynamicBankStageAmounts[3] },
                      { num: 4 as const, label: 'University Tuition', sub: '04. Tuition Schedule', amt: dynamicBankStageAmounts[4] },
                    ].map(stage => (
                      <button
                        key={stage.num}
                        type="button"
                        onClick={() => handleBankStageSelect(stage.num)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          bankStage === stage.num
                            ? 'bg-[#58051E] text-white border-[#58051E] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-[10px] font-black uppercase tracking-wider opacity-80 mb-0.5">{stage.sub}</div>
                        <div className="text-xs font-bold truncate">{stage.label}</div>
                        <div className={`text-[10px] mt-0.5 font-bold ${bankStage === stage.num ? 'text-white/90' : 'text-slate-500'}`}>
                          {formatFeeEURandINR(stage.amt.raw)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Multiple Milestone Presets if University has Installments Enabled */}
                {selectedBankStudentUni?.installments_enabled && selectedBankStudentUni.installments && selectedBankStudentUni.installments.length > 0 && (
                  <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-1.5">
                    <span className="text-[10.5px] font-black uppercase text-blue-900">Configured Tuition Milestones:</span>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {selectedBankStudentUni.installments.map((inst, idx) => (
                        <button
                          key={inst.id || idx}
                          type="button"
                          onClick={() => {
                            setBankStage(4);
                            setBankAmount(String(parseFeeToINR(inst.amount)));
                          }}
                          className="px-2 py-1.5 bg-white hover:bg-blue-100 border border-blue-200 rounded-lg text-left text-[11px] font-bold text-slate-800 transition-colors"
                        >
                          <div className="truncate">{inst.title || `Installment #${idx + 1}`}</div>
                          <div className="text-[10px] text-blue-700 font-extrabold">{formatFeeEURandINR(inst.amount)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹ INR) *</label>
                    <input
                      type="number"
                      required
                      value={bankAmount}
                      onChange={(e) => setBankAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name *</label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Bank UTR / Ref Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC202609138472"
                      value={bankUtr}
                      onChange={(e) => setBankUtr(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Clearance Date *</label>
                    <input
                      type="date"
                      required
                      value={bankDate}
                      onChange={(e) => setBankDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowBankModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2 bg-[#58051E] text-white rounded-xl text-xs font-bold hover:bg-[#430316] transition-all disabled:opacity-50"
                  >
                    {isProcessing ? 'Verifying...' : 'Record & Verify'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Verify Modal */}
      <AnimatePresence>
        {verifyItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-left space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Verify & Clear Payment</h3>
                  <p className="text-xs text-slate-500">
                    Confirm receipt of ₹{Number(verifyItem.amount).toLocaleString('en-IN')} from {verifyItem.student_name || 'Student'}.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">UTR / Reference:</span>
                  <span className="font-mono font-bold text-slate-800">{verifyItem.utr_number || verifyItem.ref_no || verifyItem.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Payment Method:</span>
                  <span className="font-bold text-slate-800">{verifyItem.payment_method || 'UPI'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Verification Note (Optional)</label>
                <textarea
                  rows={2}
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="e.g. Bank statement verified. UTR matched."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => setVerifyItem(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprovePayment}
                  disabled={isProcessing}
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isProcessing ? 'Verifying...' : 'Approve & Release Unlock'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-left space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Reject Payment Submission</h3>
                  <p className="text-xs text-slate-500">
                    The student will be notified of the rejection and prompted to re-submit with a valid UTR.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection *</label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this payment could not be verified..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => setRejectItem(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectPayment}
                  disabled={isProcessing}
                  className="px-5 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Viewer Modal */}
      {viewInvoice && (
        <InvoiceModal
          isOpen={Boolean(viewInvoice)}
          onClose={() => setViewInvoice(null)}
          invoice={viewInvoice}
        />
      )}
    </div>
  );
};
