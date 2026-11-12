import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard, Banknote, Landmark, QrCode, Search,
  CheckCircle2, XCircle, AlertCircle, Clock, Eye, Download,
  Plus, RotateCcw, Sparkles, X, ChevronRight, FileText,
  DollarSign, TrendingUp, ShieldCheck, ArrowUpRight, GraduationCap,
  Layers, Check, ExternalLink, RefreshCw, Building2, Trash2,
  Receipt, Coins, Calendar, ArrowRight, Filter,
  Tag, Percent, Award, UploadCloud
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useActiveStudentScope } from '../hooks/useActiveStudentScope';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useUniversities } from '../hooks/useUniversities';
import { useDestinations } from '../hooks/useDestinations';
import { getApplications, isRealApplication } from '../lib/api/applications';
import { getStudents } from '../lib/api/students';
import { getJourneyStages } from '../lib/api/journey';
import { fetchStudentAgreement } from '../lib/api/agreement';
import {
  getEducationCountry, saveEducationCountry, listEducationPayments,
  recordEducationPayment, reviewEducationPayment
} from '../lib/api/educationBilling';
import {
  getStudentFeeOverrides,
  createReceiptPdfBlob,
  type StudentFeeOverride
} from '../lib/api/payments';
import {
  getCountryFeePackages, getStudentBillingAssignment, setStudentBillingFlow, money as pkgMoney,
  type CountryFeePackage, type StudentBillingAssignment
} from '../lib/api/feePackages';
import {
  studentFees, feeBalance, feeIsDue, resolveStudentPackage,
  educationStages, money, cents, type EducationFee, type PaymentPart
} from '../lib/educationBilling';
import {
  getGlobalPaymentGateways, generateUpiPaymentUri,
  generateQrCodeImageUrl, type GlobalPaymentGatewayConfig
} from '../lib/api/paymentGateways';
import type { Application, JourneyStage, Payment, UserProfile } from '../lib/types';
import { supabase } from '../lib/supabase';

const fieldClass = 'w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20 focus:border-[#58051E] transition-all';
const primaryBtn = 'h-9.5 px-4 bg-[#58051E] hover:bg-[#430316] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#58051E]/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50';
const secondaryBtn = 'h-9.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function EducationBillingConsole({ admin = false }: { admin?: boolean }) {
  const { user, profile } = useAuth();
  const { activeStudentId } = useActiveStudentScope();
  const { config, ready: configReady } = useFeeConfig();
  const { universities } = useUniversities();
  const { destinations } = useDestinations();
  const [preferredCountry, setPreferredCountry] = useState('');
  const [feeOverrides, setFeeOverrides] = useState<Record<string, StudentFeeOverride>>({});
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [studentId, setStudentId] = useState('');
  const targetId = admin ? studentId : activeStudentId;
  const [applications, setApplications] = useState<Application[]>([]);
  const [appId, setAppId] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stages, setStages] = useState<JourneyStage[]>([]);
  const [gateway, setGateway] = useState<GlobalPaymentGatewayConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending' | 'Failed' | 'Partially Paid' | 'Refunded'>('All');
  const [methodFilter, setMethodFilter] = useState<'All' | 'Cash' | 'UPI' | 'Direct Bank Transfer'>('All');
  const [dateFilter, setDateFilter] = useState<'All' | 'Today' | 'This Week' | 'This Month' | 'Custom'>('All');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [viewPayment, setViewPayment] = useState<Payment | null>(null);
  const [activeFee, setActiveFee] = useState<EducationFee | null>(null);
  const [parts, setParts] = useState<PaymentPart[]>([]);
  const [total, setTotal] = useState(0);
  const [notes, setNotes] = useState('');
  const [batchId, setBatchId] = useState('');
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<{ payment: Payment; approve: boolean } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [lastReceiptData, setLastReceiptData] = useState<{
    ref_no: string;
    student_name: string;
    amount: number;
    currency: string;
    payment_method: string;
    title: string;
    paid_at: string;
  } | null>(null);

  // Country Fee Package Flow State
  const [studentAssignment, setStudentAssignment] = useState<StudentBillingAssignment | null>(null);
  const [activePackage, setActivePackage] = useState<CountryFeePackage | null>(null);
  const [allPackages, setAllPackages] = useState<CountryFeePackage[]>([]);

  const load = useCallback(async () => {
    if (!admin && !targetId) return;
    setLoading(true);
    setError('');
    try {
      const [records, apps, studentList, gateways] = await Promise.all([
        listEducationPayments(admin ? undefined : targetId),
        getApplications(admin ? undefined : targetId),
        admin ? getStudents() : Promise.resolve([]),
        getGlobalPaymentGateways(),
      ]);
      setPayments(records);
      setApplications(apps.filter(isRealApplication));
      setStudents(studentList);
      setGateway(gateways);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [admin, targetId]);

  useEffect(() => {
    void load();
    const refresh = () => { void load(); };
    window.addEventListener('ferex_payment_change', refresh);
    window.addEventListener('ferex_application_change', refresh);
    const channel = supabase.channel(`education-billing-${admin ? 'admin' : targetId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
        ...(admin ? {} : { filter: `student_id=eq.${targetId}` })
      }, refresh)
      .subscribe();
    return () => {
      window.removeEventListener('ferex_payment_change', refresh);
      window.removeEventListener('ferex_application_change', refresh);
      void supabase.removeChannel(channel);
    };
  }, [load, admin, targetId]);

  useEffect(() => {
    if (targetId) {
      getStudentFeeOverrides(targetId).then(setFeeOverrides).catch(() => {});
    } else {
      setFeeOverrides({});
    }
  }, [targetId]);

  const studentApps = applications.filter(a => a.student_id === targetId);
  const application = studentApps.find(a => a.id === appId) || studentApps[0];
  const university = universities.find(u => u.id === application?.university_id) || application?.universities;
  const country = university?.country || preferredCountry;

  // The plan for the student's country applies automatically unless the admin pinned a plan or chose standard fees.
  useEffect(() => {
    if (!targetId) { setStudentAssignment(null); setActivePackage(null); return; }
    let cancelled = false;
    const refresh = () => Promise.all([getStudentBillingAssignment(targetId), getCountryFeePackages()]).then(([assign, pkgs]) => {
      if (cancelled) return;
      setStudentAssignment(assign);
      setAllPackages(pkgs);
      setActivePackage(resolveStudentPackage(assign, pkgs, country));
    }).catch(() => {});
    refresh();
    window.addEventListener('ferex_student_billing_flow_change', refresh);
    window.addEventListener('ferex_fee_packages_change', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('ferex_student_billing_flow_change', refresh);
      window.removeEventListener('ferex_fee_packages_change', refresh);
    };
  }, [targetId, country]);
  const countryOptions = Array.from(new Set([...destinations.map(d => d.name), ...universities.map(u => u.country)])).sort();
  const studentPayments = payments.filter(p => p.student_id === targetId);
  const studentName = admin ? students.find(s => s.id === targetId)?.full_name || 'Student' : profile?.full_name || 'Student';

  useEffect(() => {
    let cancelled = false;
    setStages([]);
    setPreferredCountry('');
    if (!targetId) return;
    Promise.all([
      getJourneyStages(targetId),
      fetchStudentAgreement(targetId),
      getEducationCountry(targetId)
    ]).then(([stored, agreement, destination]) => {
      if (cancelled) return;
      setPreferredCountry(destination);
      const completed = new Set(stored.filter(s => s.status === 'Completed').map(s => s.stage_number));
      completed.add(1);
      if (agreement?.status === 'Signed') completed.add(2);
      const registration = studentFees(config, destination || country, { pkg: activePackage, overrides: feeOverrides }).find(f => f.id === 'registration');
      if (!registration || feeBalance(registration, studentPayments).remaining === 0) completed.add(3);
      if (application && application.status !== 'Draft') completed.add(6);
      if (application?.offer_letter_url || ['Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Enrolled'].includes(application?.status || '')) completed.add(7);
      if (application?.final_acceptance_url) completed.add(8);
      if (['Visa Processing', 'Visa Approved', 'Enrolled'].includes(application?.status || '')) completed.add(9);
      if (['Visa Approved', 'Enrolled'].includes(application?.status || '')) completed.add(10);
      if (application?.status === 'Enrolled') completed.add(12);
      setStages([
        ...stored.filter(s => !completed.has(s.stage_number)),
        ...Array.from(completed).map(n => ({
          id: `derived-${n}`,
          student_id: targetId,
          stage_number: n,
          stage_name: educationStages[n - 1],
          status: 'Completed' as const,
          completed_at: null,
          notes: ''
        }))
      ]);
    }).catch(e => {
      if (!cancelled) setError(`Could not load workflow: ${(e as Error).message}`);
    });
    return () => { cancelled = true; };
  }, [targetId, application?.id, application?.status, config, payments]);

  const fees = studentFees(config, country, { pkg: activePackage, overrides: feeOverrides });

  const totals = useMemo(() => {
    const result: Record<string, { paid: number; pending: number }> = {};
    for (const p of payments.filter(p => !targetId || p.student_id === targetId)) {
      const currency = p.currency || 'INR';
      result[currency] ||= { paid: 0, pending: 0 };
      if (['Paid', 'Verified'].includes(p.status)) result[currency].paid += Number(p.amount);
      if (p.status === 'Pending Verification') result[currency].pending += Number(p.amount);
    }
    return result;
  }, [payments, targetId]);

  // Per-currency position across the fees Ferex collects: what is due, verified, in review and still to pay.
  const feeSummary = useMemo(() => {
    const out: Record<string, { due: number; paid: number; pending: number; remaining: number }> = {};
    for (const fee of fees.filter(f => f.recipient === 'ferex')) {
      const b = feeBalance(fee, studentPayments);
      const row = out[fee.currency] ||= { due: 0, paid: 0, pending: 0, remaining: 0 };
      row.due += fee.amount; row.paid += b.paid; row.pending += b.pending; row.remaining += b.remaining;
    }
    return out;
  }, [fees, studentPayments]);

  const studentMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'All') count++;
    if (methodFilter !== 'All') count++;
    if (dateFilter !== 'All') count++;
    return count;
  }, [statusFilter, methodFilter, dateFilter]);

  const clearFilters = () => {
    setStatusFilter('All');
    setMethodFilter('All');
    setDateFilter('All');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const normalizeStatus = (status?: string): 'Paid' | 'Pending' | 'Failed' | 'Partially Paid' | 'Refunded' => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'paid' || s === 'verified') return 'Paid';
    if (s === 'pending' || s === 'pending verification' || s.includes('pending')) return 'Pending';
    if (s === 'failed' || s === 'rejected' || s === 'cancelled') return 'Failed';
    if (s === 'partially paid' || s === 'partial') return 'Partially Paid';
    if (s === 'refunded' || s === 'refund') return 'Refunded';
    return 'Pending';
  };

  const normalizeMethod = (method?: string): string => {
    const m = (method || '').toLowerCase().trim();
    if (m === 'cash') return 'Cash';
    if (m === 'upi' || m.includes('upi') || m.includes('phonepe')) return 'UPI';
    if (m.includes('bank') || m.includes('transfer') || m === 'net_banking' || m === 'wire' || m === 'swift') return 'Direct Bank Transfer';
    return method || 'Direct Bank Transfer';
  };

  const renderStatusBadge = (status?: string) => {
    const norm = normalizeStatus(status);
    switch (norm) {
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Paid</span>
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Pending</span>
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Failed</span>
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
            <TrendingUp className="w-3 h-3 text-blue-600" />
            <span>Partially Paid</span>
          </span>
        );
      case 'Refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
            <RotateCcw className="w-3 h-3 text-purple-600" />
            <span>Refunded</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  const isWithinDateRange = useCallback((itemDateStr: string | null | undefined): boolean => {
    if (dateFilter === 'All') return true;
    if (!itemDateStr) return false;
    const d = new Date(itemDateStr);
    if (isNaN(d.getTime())) return false;

    const now = new Date();
    if (dateFilter === 'Today') {
      return d.toDateString() === now.toDateString();
    }
    if (dateFilter === 'This Week') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= oneWeekAgo && d <= now;
    }
    if (dateFilter === 'This Month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return d >= startOfMonth && d <= now;
    }
    if (dateFilter === 'Custom') {
      if (customStartDate) {
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        if (d < start) return false;
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    }
    return true;
  }, [dateFilter, customStartDate, customEndDate]);

  const ledger = useMemo(() => {
    const searchLower = search.toLowerCase().trim();

    return payments
      .filter(p => {
        if (targetId && p.student_id !== targetId) return false;

        if (statusFilter !== 'All') {
          const norm = normalizeStatus(p.status);
          if (norm !== statusFilter) return false;
        }

        if (methodFilter !== 'All') {
          const normMethod = normalizeMethod(p.payment_method);
          if (normMethod !== methodFilter) return false;
        }

        const paymentDate = p.created_at || p.paid_at;
        if (!isWithinDateRange(paymentDate)) return false;

        if (searchLower) {
          const student = studentMap.get(p.student_id);
          const studentName = (p.student_name || student?.full_name || profile?.full_name || '').toLowerCase();
          const studentEmail = (student?.email || (p as any).student_email || (p as any).users?.email || profile?.email || '').toLowerCase();
          const title = (p.title || '').toLowerCase();
          const desc = (p.description || '').toLowerCase();
          const utr = (p.utr_number || '').toLowerCase();
          const txId = (p.transaction_id || '').toLowerCase();
          const refNo = (p.ref_no || '').toLowerCase();
          const status = (p.status || '').toLowerCase();
          const normStatus = normalizeStatus(p.status).toLowerCase();
          const method = (p.payment_method || '').toLowerCase();
          const normMethod = normalizeMethod(p.payment_method).toLowerCase();

          const matches =
            studentName.includes(searchLower) ||
            studentEmail.includes(searchLower) ||
            title.includes(searchLower) ||
            desc.includes(searchLower) ||
            utr.includes(searchLower) ||
            txId.includes(searchLower) ||
            refNo.includes(searchLower) ||
            status.includes(searchLower) ||
            normStatus.includes(searchLower) ||
            method.includes(searchLower) ||
            normMethod.includes(searchLower);

          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.created_at || a.paid_at || 0).getTime();
        const timeB = new Date(b.created_at || b.paid_at || 0).getTime();
        return timeB - timeA;
      });
  }, [payments, targetId, statusFilter, methodFilter, isWithinDateRange, search, studentMap, profile]);
  const upiId = gateway?.divisions.education.customUpiId || gateway?.upi.upiId || 'ferex.payments@icici';
  const upiAvailable = !!(config.payment_gateways.phonepe_upi_enabled && (gateway?.upi?.enabled ?? true));

  const openPayment = (fee: EducationFee) => {
    const amount = feeBalance(fee, studentPayments).payable;
    setActiveFee(fee);
    setTotal(amount);
    setParts([{ method: admin ? 'Bank Transfer' : 'UPI', amount, reference: '', date: today() }]);
    setBatchId(crypto.randomUUID());
    setNotes('');
    setMessage('');
  };

  const uri = activeFee && upiAvailable ? generateUpiPaymentUri({
    upiId,
    merchantName: gateway?.divisions.education.customMerchantName || gateway?.upi.merchantName || 'FEREX HIGHER EDUCATION',
    amount: total,
    transactionRef: batchId,
    transactionNote: activeFee.title
  }) : '';

  const handleDownloadReceipt = (payment: any) => {
    const student = studentMap.get(payment.student_id);
    const blob = createReceiptPdfBlob({
      receipt_no: payment.ref_no || `REC-${payment.id?.slice(0, 8)}`,
      student_name: payment.student_name || student?.full_name || studentName,
      amount: Number(payment.amount) || 0,
      currency: payment.currency || 'INR',
      payment_method: normalizeMethod(payment.payment_method) || 'UPI',
      description: payment.title || payment.description || 'Education Payment',
      issued_at: payment.paid_at || payment.created_at || new Date().toISOString(),
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${payment.ref_no || 'receipt'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-[#58051E]" />
              {admin ? 'Payment History' : 'Payments & billing'}
            </h1>
            <span className="text-[10px] font-extrabold bg-[#58051E]/10 text-[#58051E] px-2.5 py-0.5 rounded-full border border-[#58051E]/20">
              {admin ? 'Finance Authority' : 'Student Ledger'}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {admin
              ? 'Record confirmed student payments (Cash, UPI, Direct Bank Transfer) with automated receipts, and configure education fees.'
              : 'Pay your education fees directly by UPI with a receipt after finance verification.'}
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 h-9.5 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div role="status" className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
          {lastReceiptData && (
            <button
              type="button"
              onClick={() => handleDownloadReceipt(lastReceiptData)}
              className="px-3 py-1 bg-[#58051E] hover:bg-[#430316] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>Download PDF Receipt</span>
            </button>
          )}
        </div>
      )}

      {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {Object.entries(totals).map(([currency, sums]) => (
              <div
                key={currency}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Recorded Payments • {currency}
                  </span>
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 tracking-tight">
                  {money(sums.paid, currency)}
                  <span className="text-xs font-bold text-emerald-600 ml-1.5 font-sans">verified</span>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>{money(sums.pending, currency)} awaiting verification</span>
                </p>
              </div>
            ))}
          </div>

          {loading || !configReady ? (
            <div className="p-8 text-center text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#58051E]" />
              <span>Loading billing records…</span>
            </div>
          ) : targetId && !error && (
            <>
              {!country && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Select a university to apply country-specific fees. Fees with country overrides remain unavailable until a destination is selected.
                  </span>
                </div>
              )}

              {/* Package Flow View (When Assigned to Country Fee Package) */}
              {activePackage && (
                <div className="p-5 bg-gradient-to-br from-[#58051E]/5 via-white to-indigo-50/30 border-2 border-[#58051E]/20 rounded-3xl space-y-5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-[#58051E] text-white rounded-lg">
                          <Coins className="w-4 h-4" />
                        </span>
                        <h2 className="text-base font-black text-slate-900 tracking-tight">
                          {activePackage.name}
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#58051E]/10 text-[#58051E] border border-[#58051E]/20">
                          Assigned Package
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {activePackage.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-black text-[#58051E]">
                        {pkgMoney(activePackage.total_amount, activePackage.currency)}
                      </div>
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                        All-Inclusive Package Fee
                      </span>
                    </div>
                  </div>

                  {/* Covered Inclusions Checklist */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Services & Deliverables Covered Under This Package
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activePackage.covered_services.map(svc => (
                        <div
                          key={svc.id}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs font-semibold ${
                            svc.is_included
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                              : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                          }`}
                        >
                          {svc.is_included ? (
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-bold">{svc.title}</p>
                            {svc.description && <p className="text-[10.5px] opacity-80 mt-0.5">{svc.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Package Installments */}
                  {activePackage.installments.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" /> Payment Installment Schedule
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activePackage.installments.map((inst, idx) => (
                          <div key={inst.id} className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-[#58051E] uppercase tracking-wider">
                                Installment {idx + 1}
                              </span>
                              <span className="text-sm font-black text-slate-900">
                                {pkgMoney(inst.amount, activePackage.currency)}
                              </span>
                            </div>
                            <p className="text-xs font-extrabold text-slate-800">{inst.title}</p>
                            <p className="text-[11px] text-slate-500 font-semibold">
                              {inst.due_description || `${inst.timing === 'before' ? 'Before' : 'After'} Stage ${inst.stage_trigger}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activePackage.terms_note && (
                    <p className="text-[11px] text-slate-500 italic bg-white/70 p-3 rounded-xl border border-slate-200/60">
                      <strong>Terms:</strong> {activePackage.terms_note}
                    </p>
                  )}
                </div>
              )}

              {/* Payment position */}
              {Object.entries(feeSummary).map(([currency, row]) => (
                <section key={currency} aria-label={`Payment summary ${currency}`} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ['Total fees', row.due, 'text-slate-900'],
                    ['Paid & verified', row.paid, 'text-emerald-700'],
                    ['In review', row.pending, 'text-amber-700'],
                    ['Balance to pay', row.remaining, row.remaining > 0 ? 'text-[#58051E]' : 'text-emerald-700'],
                  ].map(([label, value, tone]) => (
                    <div key={label as string} className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">{label as string}</p>
                      <p className={`text-lg font-black ${tone}`}>{money(value as number, currency)}</p>
                    </div>
                  ))}
                </section>
              ))}

              {/* Configured Fee Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-[#58051E]" /> Fee Schedule & Milestones
                  </h2>
                  <span className="text-[11px] font-bold text-slate-500">
                    {fees.length} Active {fees.length === 1 ? 'Milestone' : 'Milestones'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fees.map(fee => {
                    const balance = feeBalance(fee, studentPayments);
                    const needsCountry = !country && Object.keys(fee.countryAmounts || {}).length > 0;
                    const isThirdParty = fee.recipient === 'direct_third_party';
                    const percentPaid = fee.amount > 0 ? Math.min(100, Math.round((balance.paid / fee.amount) * 100)) : 100;

                    return (
                      <article
                        key={fee.id}
                        className="border border-slate-200/90 rounded-2xl bg-white p-5 space-y-4 shadow-xs relative flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-black text-sm text-slate-900">{fee.title}</h3>
                              {!isThirdParty && (() => {
                                const state = balance.remaining === 0 ? ['Paid in full', 'bg-emerald-50 text-emerald-700 border-emerald-200']
                                  : balance.pending > 0 && balance.payable === 0 ? ['Awaiting verification', 'bg-amber-50 text-amber-800 border-amber-200']
                                  : balance.paid > 0 || balance.pending > 0 ? ['Partially paid', 'bg-blue-50 text-blue-800 border-blue-200']
                                  : ['Unpaid', 'bg-slate-100 text-slate-600 border-slate-200'];
                                return <span className={`inline-block mt-1 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border ${state[1]}`}>{state[0]}</span>;
                              })()}
                              <p className="text-[11px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{fee.timing === 'before' ? 'Before' : 'After'} {educationStages[fee.stage - 1]}{country ? ` • ${country}` : ''}</span>
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {fee.original_amount !== undefined && (
                                <span className="block text-[11px] font-bold text-slate-400 line-through">{money(fee.original_amount, fee.currency)}</span>
                              )}
                              <span className="text-base font-black text-[#58051E]">
                                {money(fee.amount, fee.currency)}
                              </span>
                              {fee.original_amount !== undefined && (
                                <span className="block mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                  {fee.discount_percent ? `${fee.discount_percent}% discount` : 'Discount applied'}
                                </span>
                              )}
                              {fee.package_id && (
                                <span className="block mt-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[#58051E]">Package fee</span>
                              )}
                            </div>
                          </div>

                          {fee.description && (
                            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                              {fee.description}
                            </p>
                          )}

                          {isThirdParty ? (
                            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-1">
                              <div className="flex items-start gap-2">
                                <Building2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                                <p className="text-xs font-semibold text-blue-900">
                                  Pay directly to the university or embassy. Ferex does not collect university tuition or government fees.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {/* Balance Breakdown */}
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-emerald-700">Verified: {money(balance.paid, fee.currency)}</span>
                                <span className="text-slate-700">Outstanding: {money(balance.remaining, fee.currency)}</span>
                              </div>

                              {/* Progress Bar */}
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                                  style={{ width: `${percentPaid}%` }}
                                />
                              </div>

                              {balance.pending > 0 && (
                                <p className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>In review: {money(balance.pending, fee.currency)}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Action */}
                        {!isThirdParty && balance.payable > 0 && (
                          <div className="pt-3 border-t border-slate-100">
                            <button
                              className={primaryBtn}
                              disabled={needsCountry}
                              onClick={() => openPayment(fee)}
                            >
                              {admin ? (
                                <>
                                  <CreditCard className="w-4 h-4" />
                                  <span>Collect fee (full, partial or split)</span>
                                </>
                              ) : (
                                <>
                                  <QrCode className="w-4 h-4" />
                                  <span>Pay by UPI</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                {/* Direct University Tuition Notice */}
                <section className="p-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 space-y-1">
                  <h2 className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-blue-700" /> University fees — paid directly by the student
                  </h2>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    Pay application fees and tuition only to the university's official account or payment portal. Ferex does not collect university fees or tuition installments.
                  </p>
                  {university && (
                    <p className="text-xs font-bold text-blue-900 pt-1">
                      {university.name} • Tuition reference: {application?.tuition_fee || university.tuition_range || 'Confirm with the university'}
                    </p>
                  )}
                </section>
              </div>
            </>
          )}

          {/* Payment Ledger */}
          <section className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#58051E]" /> Payment Ledger
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Persisted audit transactions, bank UTR references, split allocations, and cleared status.
                </p>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    aria-label="Search payment ledger"
                    className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
                    placeholder="Search student, fee, ref or status"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Button & Popover */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowFilterDropdown(prev => !prev)}
                    className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeFilterCount > 0
                        ? 'bg-[#58051E] text-white border-[#58051E] shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    title="Filter payments"
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>Filter</span>
                    {activeFilterCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-white text-[#58051E] text-[10px] font-black flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* Filter Dropdown Popover */}
                  {showFilterDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setShowFilterDropdown(false)}
                      />
                      <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 p-4 space-y-3.5">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                            <Filter className="w-3.5 h-3.5 text-[#58051E]" /> Filter Payments
                          </div>
                          {activeFilterCount > 0 && (
                            <button
                              type="button"
                              onClick={clearFilters}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                            >
                              Reset all
                            </button>
                          )}
                        </div>

                        {/* Status Filter */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                            Payment Status
                          </label>
                          <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value as any)}
                            className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
                          >
                            <option value="All">All Statuses</option>
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="Failed">Failed</option>
                            <option value="Partially Paid">Partially Paid</option>
                            <option value="Refunded">Refunded</option>
                          </select>
                        </div>

                        {/* Method Filter */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                            Payment Method
                          </label>
                          <select
                            value={methodFilter}
                            onChange={e => setMethodFilter(e.target.value as any)}
                            className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
                          >
                            <option value="All">All Methods</option>
                            <option value="Cash">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                          </select>
                        </div>

                        {/* Date Filter */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                            Payment Date
                          </label>
                          <select
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value as any)}
                            className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
                          >
                            <option value="All">All Time</option>
                            <option value="Today">Today</option>
                            <option value="This Week">This Week</option>
                            <option value="This Month">This Month</option>
                            <option value="Custom">Custom Date Range</option>
                          </select>
                        </div>

                        {/* Custom Date Pickers */}
                        {dateFilter === 'Custom' && (
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">From</label>
                              <input
                                type="date"
                                value={customStartDate}
                                onChange={e => setCustomStartDate(e.target.value)}
                                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">To</label>
                              <input
                                type="date"
                                value={customEndDate}
                                onChange={e => setCustomEndDate(e.target.value)}
                                className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 focus:outline-none"
                              />
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500">
                            {ledger.length} {ledger.length === 1 ? 'record' : 'records'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowFilterDropdown(false)}
                            className="px-3 py-1 bg-[#58051E] hover:bg-[#430316] text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Active Filters Bar */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500">Active filters:</span>
                {statusFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#58051E]/10 text-[#58051E]">
                    Status: {statusFilter}
                    <button type="button" onClick={() => setStatusFilter('All')} className="hover:opacity-70 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {methodFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#58051E]/10 text-[#58051E]">
                    Method: {methodFilter}
                    <button type="button" onClick={() => setMethodFilter('All')} className="hover:opacity-70 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                {dateFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#58051E]/10 text-[#58051E]">
                    Date: {dateFilter === 'Custom' ? `${customStartDate || '...'} to ${customEndDate || '...'}` : dateFilter}
                    <button type="button" onClick={() => { setDateFilter('All'); setCustomStartDate(''); setCustomEndDate(''); }} className="hover:opacity-70 cursor-pointer"><X className="w-3 h-3" /></button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline ml-1 cursor-pointer"
                >
                  Reset all
                </button>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Fee / Payment Description</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Transaction Reference</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledger.map(p => {
                    const student = studentMap.get(p.student_id);
                    const sName = p.student_name || student?.full_name || (profile?.full_name ?? 'Student');
                    const sEmail = student?.email || (p as any).student_email || (profile?.email ?? '—');
                    const normStatus = normalizeStatus(p.status);
                    const isPaid = normStatus === 'Paid';
                    const isPending = normStatus === 'Pending';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* 1. Student Name */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 leading-snug">{sName}</div>
                          <div className="text-[11px] text-slate-500 font-medium truncate max-w-[180px]">{sEmail}</div>
                        </td>

                        {/* 2. Fee / Payment Description */}
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-[#58051E] leading-snug">{p.title || 'Education Fee'}</div>
                          {p.description && (
                            <div className="text-[11px] text-slate-500 truncate max-w-[200px]" title={p.description}>
                              {p.description}
                            </div>
                          )}
                        </td>

                        {/* 3. Amount */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-black text-slate-900 text-sm">
                            ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* 4. Payment Date */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium text-[11px]">
                          <div>
                            {new Date(p.created_at || p.paid_at || Date.now()).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(p.created_at || p.paid_at || Date.now()).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                        </td>

                        {/* 5. Payment Method */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {normalizeMethod(p.payment_method)}
                          </span>
                        </td>

                        {/* 6. Transaction Reference */}
                        <td className="py-3 px-4">
                          {p.utr_number || p.transaction_id || p.ref_no ? (
                            <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 select-all break-all">
                              {p.utr_number || p.transaction_id || p.ref_no}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* 7. Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderStatusBadge(p.status)}
                        </td>

                        {/* 8. Actions */}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewPayment(p)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="View details & receipt"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>View</span>
                            </button>

                            {isPaid && (
                              <button
                                type="button"
                                onClick={() => handleDownloadReceipt(p)}
                                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                title="Download PDF Receipt"
                              >
                                <Download className="w-3 h-3 text-slate-500" />
                              </button>
                            )}

                            {admin && isPending && (
                              <>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    setReview({ payment: p, approve: true });
                                    setReviewNotes('');
                                  }}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Verify payment"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    setReview({ payment: p, approve: false });
                                    setReviewNotes('');
                                  }}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Reject payment"
                                >
                                  <X className="w-3 h-3" />
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

              {!loading && !ledger.length && (
                <div className="p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No payment records found</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    {search || activeFilterCount > 0
                      ? 'No transactions matched your search or filter criteria. Try adjusting or clearing your filters.'
                      : 'No payment transactions recorded in the system yet.'}
                  </p>
                  {(search || activeFilterCount > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        clearFilters();
                      }}
                      className="mt-1 text-xs font-bold text-[#58051E] hover:underline cursor-pointer"
                    >
                      Clear search & filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {!admin && (
              <div className="flex items-center gap-4 text-xs font-bold pt-2">
                <Link to="/student/invoices" className="text-[#58051E] hover:underline flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> View Invoices
                </Link>
                <Link to="/student/receipts" className="text-[#58051E] hover:underline flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5" /> View Receipts
                </Link>
              </div>
            )}
          </section>

      {/* Record Payment Modal */}
      {activeFee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Record education payment"
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-4 text-left"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  {activeFee.title} • {studentName}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {admin
                    ? 'Record payment directly for this student. Enter any amount up to the balance for a partial payment, and add split entries (Cash, UPI, Card, Cheque, Bank Transfer) as needed.'
                    : 'Pay any amount up to the balance by UPI. Finance verifies your UTR and issues the receipt.'}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => { setActiveFee(null); setMessage(''); }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {admin ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                    Total received ({activeFee.currency})
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={fieldClass}
                    value={total}
                    onChange={e => setTotal(Number(e.target.value))}
                  />
                </div>

                {/* Multi-entry Split Rows */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    Payment Entries
                  </label>
                  {parts.map((part, i) => (
                    <div key={i} className="grid sm:grid-cols-5 gap-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                      <div>
                        <select
                          aria-label={`Entry ${i + 1} method`}
                          className={fieldClass}
                          value={part.method}
                          onChange={e => setParts(parts.map((p, n) => n === i ? { ...p, method: e.target.value as PaymentPart['method'] } : p))}
                        >
                          {['Bank Transfer', 'Cash', 'UPI', 'Card', 'Cheque'].map(m => (
                            <option key={m} value={m}>{m === 'Bank Transfer' ? 'Direct Bank Transfer' : m}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          aria-label={`Entry ${i + 1} amount`}
                          className={fieldClass}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={part.amount}
                          onChange={e => setParts(parts.map((p, n) => n === i ? { ...p, amount: Number(e.target.value) } : p))}
                        />
                      </div>

                      <div>
                        <input
                          aria-label={`Entry ${i + 1} reference`}
                          className={fieldClass}
                          placeholder="UTR / cash receipt"
                          value={part.reference}
                          onChange={e => setParts(parts.map((p, n) => n === i ? { ...p, reference: e.target.value } : p))}
                        />
                      </div>

                      <div>
                        <input
                          aria-label={`Entry ${i + 1} date`}
                          className={fieldClass}
                          type="date"
                          max={today()}
                          value={part.date}
                          onChange={e => setParts(parts.map((p, n) => n === i ? { ...p, date: e.target.value } : p))}
                        />
                      </div>

                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          disabled={parts.length === 1 || busy}
                          onClick={() => setParts(parts.filter((_, n) => n !== i))}
                          className="h-10 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    disabled={busy}
                    className="flex items-center gap-1.5 h-9 px-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    onClick={() => setParts([...parts, {
                      method: 'Cash',
                      amount: Math.max(0, total - parts.reduce((sum, p) => sum + p.amount, 0)),
                      reference: '',
                      date: today()
                    }])}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add payment entry</span>
                  </button>

                  <span className="text-xs font-bold text-slate-700">
                    Allocated {money(parts.reduce((sum, p) => sum + p.amount, 0), activeFee.currency)} of {money(total, activeFee.currency)}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                    Payment Notes / Reference
                  </label>
                  <textarea
                    aria-label="Payment notes"
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
                    placeholder="Notes / receiving bank / cashier..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="max-w-xs mx-auto text-left">
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                    Amount to pay now ({activeFee.currency}) — pay in full or in part
                  </label>
                  <input
                    aria-label="Amount to pay"
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={fieldClass}
                    value={total}
                    onChange={e => {
                      const amount = Number(e.target.value);
                      setTotal(amount);
                      setParts(current => [{ ...current[0], amount }]);
                    }}
                  />
                  <div className="flex gap-2 mt-2">
                    {[1, 0.5].map(fraction => {
                      const full = feeBalance(activeFee, studentPayments).payable;
                      const value = Math.round(full * fraction * 100) / 100;
                      return (
                        <button
                          key={fraction}
                          type="button"
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
                          onClick={() => { setTotal(value); setParts(current => [{ ...current[0], amount: value }]); }}
                        >
                          {fraction === 1 ? `Full balance (${money(full, activeFee.currency)})` : '50%'}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-2">
                    Pay with Google Pay, PhonePe, Paytm or any UPI app by scanning the QR below, then enter the UTR.
                  </p>
                </div>

                {uri && (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      alt="UPI payment QR code"
                      src={generateQrCodeImageUrl(uri)}
                      className="w-44 h-44 rounded-2xl border border-slate-200 shadow-md"
                    />
                    <a
                      href={uri}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open UPI app</span>
                    </a>
                    <p className="text-xs font-semibold text-slate-500">Payee UPI ID: {upiId}</p>
                  </div>
                )}

                <div className="text-left">
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                    UPI Transaction Reference / UTR
                  </label>
                  <input
                    aria-label="UPI transaction reference"
                    className={fieldClass}
                    placeholder="Enter UPI transaction reference (12 digits)"
                    value={parts[0]?.reference || ''}
                    onChange={e => setParts([{ ...parts[0], reference: e.target.value }])}
                  />
                </div>
              </div>
            )}

            {message && (
              <p role="status" className="text-xs font-bold text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200">
                {message}
              </p>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={busy}
                onClick={() => { setActiveFee(null); setMessage(''); }}
                className={secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                className={primaryBtn}
                onClick={async () => {
                  setBusy(true);
                  setMessage('');
                  try {
                    const latest = await listEducationPayments(targetId);
                    const currentFee = fees.find(f => f.id === activeFee.id);
                    if (!currentFee || currentFee.recipient !== 'ferex' || cents(total) > cents(feeBalance(currentFee, latest.filter(p => !p.ref_no?.startsWith(`EDU-${batchId}-`))).payable)) {
                      throw new Error('The fee or balance changed. Close this window and refresh before recording payment.');
                    }
                    await recordEducationPayment({
                      studentId: targetId,
                      studentName,
                      fee: currentFee,
                      total,
                      parts,
                      notes,
                      studentSubmission: !admin,
                      batchId,
                      applicationId: application?.id
                    });
                    const receiptInfo = {
                      ref_no: `EDU-${batchId}-1`,
                      student_name: studentName,
                      amount: total,
                      currency: currentFee.currency,
                      payment_method: parts.map(p => p.method).join(' + '),
                      title: currentFee.title,
                      paid_at: new Date().toISOString(),
                    };
                    setLastReceiptData(receiptInfo);
                    setActiveFee(null);
                    setMessage(admin ? 'Payment recorded successfully as Paid! Receipt email sent to student.' : 'UPI reference submitted. Verified and recorded.');
                    window.dispatchEvent(new Event('ferex_payment_change'));
                    await load();
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <span>{admin ? 'Record payment entries' : 'Submit UPI reference'}</span>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Review Verification Modal */}
      {review && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Review payment"
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 max-w-lg w-full space-y-4 text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                {review.approve ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Verify received payment</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>Reject payment reference</span>
                  </>
                )}
              </h2>
              <button
                type="button"
                disabled={busy}
                onClick={() => setReview(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-900">{review.payment.student_name}</div>
              <div className="text-sm font-black text-[#58051E]">
                {money(Number(review.payment.amount), review.payment.currency || 'INR')}
              </div>
              <div className="text-xs font-mono text-slate-600">UTR: {review.payment.utr_number}</div>
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                Reviewer Notes
              </label>
              <textarea
                aria-label="Review notes"
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
                value={reviewNotes}
                onChange={e => setReviewNotes(e.target.value)}
                placeholder="Verification details or rejection reason..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={busy}
                onClick={() => setReview(null)}
                className={secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                className={primaryBtn}
                disabled={busy || (!review.approve && !reviewNotes.trim())}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await reviewEducationPayment(review.payment.id, review.approve, reviewNotes);
                    setReview(null);
                    setMessage('Payment review saved.');
                    await load();
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Saving…' : 'Save review'}
              </button>
            </div>

            {message && <p role="status" className="text-xs font-bold text-slate-600">{message}</p>}
          </section>
        </div>
      )}

      {/* View Payment Details & Receipt Modal */}
      {viewPayment && (() => {
        const student = studentMap.get(viewPayment.student_id);
        const sName = viewPayment.student_name || student?.full_name || (profile?.full_name ?? 'Student');
        const sEmail = student?.email || (viewPayment as any).student_email || (profile?.email ?? '—');
        const normStatus = normalizeStatus(viewPayment.status);
        const isPaid = normStatus === 'Paid';
        const isPending = normStatus === 'Pending';

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs p-4 flex items-center justify-center">
            <section
              role="dialog"
              aria-modal="true"
              aria-label="Payment Details"
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#58051E]/10 flex items-center justify-center text-[#58051E]">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">Payment Details</h2>
                    <p className="text-xs text-slate-500 font-medium font-mono">Ref: {viewPayment.ref_no || viewPayment.id}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewPayment(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Summary */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Student Profile</div>
                <div className="text-sm font-bold text-slate-900">{sName}</div>
                <div className="text-xs text-slate-500">{sEmail}</div>
              </div>

              {/* Payment Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase">Amount</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    ₹{Number(viewPayment.amount || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">Currency: {viewPayment.currency || 'INR'}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase">Status</div>
                  <div className="mt-1">
                    {renderStatusBadge(viewPayment.status)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase">Payment Method</div>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {normalizeMethod(viewPayment.payment_method)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase">Transaction Reference</div>
                  <div className="text-xs font-mono font-bold text-slate-800 mt-1 select-all break-all">
                    {viewPayment.utr_number || viewPayment.transaction_id || viewPayment.ref_no || '—'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase">Fee Description</div>
                  <div className="text-xs font-bold text-[#58051E] mt-0.5">{viewPayment.title || 'Education Fee'}</div>
                  {viewPayment.description && (
                    <div className="text-xs text-slate-600 mt-1 leading-relaxed">{viewPayment.description}</div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase">Payment Timestamp</div>
                  <div className="text-xs font-medium text-slate-700 mt-0.5">
                    {new Date(viewPayment.created_at || viewPayment.paid_at || Date.now()).toLocaleString('en-IN', {
                      dateStyle: 'full',
                      timeStyle: 'medium',
                    })}
                  </div>
                </div>

                {viewPayment.reviewer_notes && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl col-span-2">
                    <div className="text-[10px] font-extrabold text-amber-800 uppercase">Reviewer / Admin Notes</div>
                    <div className="text-xs text-amber-900 mt-0.5">{viewPayment.reviewer_notes}</div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                <button
                  type="button"
                  onClick={() => setViewPayment(null)}
                  className={secondaryBtn}
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  {admin && isPending && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const p = viewPayment;
                          setViewPayment(null);
                          setReview({ payment: p, approve: false });
                          setReviewNotes('');
                        }}
                        className="h-9 px-3 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const p = viewPayment;
                          setViewPayment(null);
                          setReview({ payment: p, approve: true });
                          setReviewNotes('');
                        }}
                        className="h-9 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Verify
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDownloadReceipt(viewPayment)}
                    className="h-9 px-4 bg-[#58051E] hover:bg-[#430316] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Receipt
                  </button>
                </div>
              </div>
            </section>
          </div>
        );
      })()}
    </div>
  );
}
