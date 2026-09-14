import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Banknote, Landmark, QrCode, Search, Filter,
  CheckCircle2, XCircle, AlertCircle, Clock, Eye, Download,
  Plus, RotateCcw, Sparkles, X, ChevronRight, FileText,
  DollarSign, TrendingUp, ShieldCheck, ArrowUpRight
} from 'lucide-react';
import {
  getAllPaymentsAdmin,
  getPaymentStats,
  verifyPayment,
  rejectPayment,
  issueRefund,
  createAndCompletePayment
} from '../../lib/api/payments';
import { CashPaymentModal } from '../../components/CashPaymentModal';
import { InvoiceModal, type InvoiceData } from '../../components/InvoiceModal';
import { getStudents } from '../../lib/api/students';
import type { UserProfile, Payment } from '../../lib/types';

export const AdminPaymentControl: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCollected: 0, pendingDues: 0, failedCount: 0, refundTotal: 0, partialCount: 0 });

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
  const [bankStage, setBankStage] = useState<1 | 2 | 3>(1);
  const [bankUtr, setBankUtr] = useState('');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [bankDate, setBankDate] = useState(new Date().toISOString().split('T')[0]);

  const [toastMessage, setToastMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPays, st, stList] = await Promise.all([
        getAllPaymentsAdmin(),
        getPaymentStats(),
        getStudents()
      ]);
      setPayments(allPays || []);
      setStats(st || { totalCollected: 0, pendingDues: 0, failedCount: 0, refundTotal: 0, partialCount: 0 });
      setStudents(stList || []);
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
    return () => window.removeEventListener('ferex_payment_change', handleSync);
  }, []);

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
      const stageLabel = bankStage === 1 ? '1st Installment (Advance Fee)' : bankStage === 2 ? '2nd Installment (Tuition Deposit)' : '3rd Installment (Visa Clearance)';
      await createAndCompletePayment({
        student_id: bankStudentId,
        student_name: studentObj?.full_name || studentObj?.email?.split('@')[0] || 'Student',
        title: `${stageLabel} - Direct Bank Wire`,
        description: `Direct Bank Transfer via ${bankName}. UTR #${bankUtr || 'NEFT-' + Date.now().toString().slice(-6)} on ${bankDate}.`,
        amount: numAmt,
        currency: 'INR',
        payment_type: 'Installment Fee',
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
                    onChange={(e) => setBankStudentId(e.target.value)}
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
