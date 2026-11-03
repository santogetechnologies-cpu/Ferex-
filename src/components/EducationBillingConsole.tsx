import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard, Banknote, Landmark, QrCode, Search,
  CheckCircle2, XCircle, AlertCircle, Clock, Eye, Download,
  Plus, RotateCcw, Sparkles, X, ChevronRight, FileText,
  DollarSign, TrendingUp, ShieldCheck, ArrowUpRight, GraduationCap,
  Layers, Check, ExternalLink, RefreshCw, Building2, Trash2,
  Sliders, Receipt, User, Globe, Coins, Calendar, ArrowRight,
  Tag, Percent, Award, UploadCloud
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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
  listDirectPayments, reviewDirectPayment, submitDirectPaymentProof,
  getStudentFeeOverrides, saveStudentFeeOverride,
  type DirectPaymentRecord, type StudentFeeOverride
} from '../lib/api/payments';
import {
  educationFees, resolveEducationFee, feeBalance, feeIsDue,
  educationStages, money, cents, type EducationFee, type PaymentPart
} from '../lib/educationBilling';
import {
  getGlobalPaymentGateways, generateUpiPaymentUri,
  generateQrCodeImageUrl, type GlobalPaymentGatewayConfig
} from '../lib/api/paymentGateways';
import type { Application, JourneyStage, Payment, UserProfile } from '../lib/types';
import { EducationFeeEditor } from './EducationFeeEditor';
import { supabase } from '../lib/supabase';

const fieldClass = 'w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#58051E]/20 focus:border-[#58051E] transition-all';
const primaryBtn = 'h-9.5 px-4 bg-[#58051E] hover:bg-[#430316] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#58051E]/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50';
const secondaryBtn = 'h-9.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function EducationBillingConsole({ admin = false }: { admin?: boolean }) {
  const { user, profile } = useAuth();
  const { config, ready: configReady } = useFeeConfig();
  const { universities } = useUniversities();
  const { destinations } = useDestinations();
  const [preferredCountry, setPreferredCountry] = useState('');
  const [tab, setTab] = useState<'billing' | 'direct' | 'settings'>('billing');
  const [directPayments, setDirectPayments] = useState<DirectPaymentRecord[]>([]);
  const [feeOverrides, setFeeOverrides] = useState<Record<string, StudentFeeOverride>>({});
  const [discountModalFee, setDiscountModalFee] = useState<EducationFee | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('Merit Scholarship');
  const [directReview, setDirectReview] = useState<{ record: DirectPaymentRecord; approve: boolean } | null>(null);
  const [directReviewNotes, setDirectReviewNotes] = useState('');
  const [directUploadFee, setDirectUploadFee] = useState<EducationFee | null>(null);
  const [directInstitution, setDirectInstitution] = useState('');
  const [directAmount, setDirectAmount] = useState<number>(0);
  const [directCurrency, setDirectCurrency] = useState('EUR');
  const [directTxRef, setDirectTxRef] = useState('');
  const [directDate, setDirectDate] = useState(today());
  const [directReceiptUrl, setDirectReceiptUrl] = useState('');
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [studentId, setStudentId] = useState('');
  const targetId = admin ? studentId : user?.id || '';
  const [applications, setApplications] = useState<Application[]>([]);
  const [appId, setAppId] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stages, setStages] = useState<JourneyStage[]>([]);
  const [gateway, setGateway] = useState<GlobalPaymentGatewayConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeFee, setActiveFee] = useState<EducationFee | null>(null);
  const [parts, setParts] = useState<PaymentPart[]>([]);
  const [total, setTotal] = useState(0);
  const [notes, setNotes] = useState('');
  const [batchId, setBatchId] = useState('');
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<{ payment: Payment; approve: boolean } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const load = useCallback(async () => {
    if (!admin && !user?.id) return;
    setLoading(true);
    setError('');
    try {
      const [records, apps, studentList, gateways, directList] = await Promise.all([
        listEducationPayments(admin ? undefined : user!.id),
        getApplications(admin ? undefined : user!.id),
        admin ? getStudents() : Promise.resolve([]),
        getGlobalPaymentGateways(),
        listDirectPayments(admin ? undefined : user!.id)
      ]);
      setPayments(records);
      setApplications(apps.filter(isRealApplication));
      setStudents(studentList);
      setGateway(gateways);
      setDirectPayments(directList);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [admin, user?.id]);

  useEffect(() => {
    void load();
    const refresh = () => { void load(); };
    window.addEventListener('ferex_payment_change', refresh);
    window.addEventListener('ferex_application_change', refresh);
    window.addEventListener('ferex_direct_payment_change', refresh);
    const channel = supabase.channel(`education-billing-${admin ? 'admin' : user?.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments',
        ...(admin ? {} : { filter: `student_id=eq.${user?.id}` })
      }, refresh)
      .subscribe();
    return () => {
      window.removeEventListener('ferex_payment_change', refresh);
      window.removeEventListener('ferex_application_change', refresh);
      window.removeEventListener('ferex_direct_payment_change', refresh);
      void supabase.removeChannel(channel);
    };
  }, [load, admin, user?.id]);

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
      const registration = educationFees(config).find(f => f.id === 'registration');
      if (!registration?.enabled || feeBalance(registration, studentPayments).remaining === 0) completed.add(3);
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

  const fees = educationFees(config).filter(f => f.enabled).map(f => resolveEducationFee(f, country, feeOverrides));

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

  const ledger = payments.filter(p => (!targetId || p.student_id === targetId) && `${p.student_name} ${p.title} ${p.utr_number} ${p.status}`.toLowerCase().includes(search.toLowerCase()));
  const upiId = gateway?.divisions.education.customUpiId || gateway?.upi.upiId || '';
  const upiAvailable = !!(config.payment_gateways.phonepe_upi_enabled && gateway?.upi.enabled && gateway?.divisions.education.allowUpi && upiId);

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
    merchantName: gateway?.divisions.education.customMerchantName || gateway?.upi.merchantName || 'Ferex',
    amount: total,
    transactionRef: batchId,
    transactionNote: activeFee.title
  }) : '';

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-[#58051E]" />
              {admin ? 'Payment & Billing Control Console' : 'Payments & billing'}
            </h1>
            <span className="text-[10px] font-extrabold bg-[#58051E]/10 text-[#58051E] px-2.5 py-0.5 rounded-full border border-[#58051E]/20">
              {admin ? 'Finance Authority' : 'Student Ledger'}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {admin
              ? 'Configure education fees, record split/bank/cash receipts and audit student UPI submissions in real-time.'
              : 'Your configured milestone fees, direct university payments, and transaction history.'}
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

      {/* Admin Tabs */}
      {admin && (
        <nav className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60 max-w-fit">
          <button
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              tab === 'billing'
                ? 'bg-white text-[#58051E] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setTab('billing')}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Student billing & ledger</span>
          </button>
          <button
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              tab === 'direct'
                ? 'bg-white text-[#58051E] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setTab('direct')}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Direct University & VFS Proofs</span>
            {directPayments.filter(p => p.verification_status === 'Pending Verification').length > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center">
                {directPayments.filter(p => p.verification_status === 'Pending Verification').length}
              </span>
            )}
          </button>
          <button
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              tab === 'settings'
                ? 'bg-white text-[#58051E] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setTab('settings')}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure fees & workflow timing</span>
          </button>
        </nav>
      )}

      {tab === 'settings' ? (
        <EducationFeeEditor />
      ) : tab === 'direct' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#58051E]" /> Direct University & Government (VFS) Receipts
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Audit wire transfer, Flywire, and consulate appointment fee proofs submitted by students for direct third-party payments.
              </p>
            </div>
            <button
              onClick={() => {
                setDirectUploadFee(fees.find(f => f.recipient === 'direct_third_party') || fees[0]);
                setDirectInstitution(university?.name || country || 'Institution Account');
                setDirectAmount(0);
                setDirectCurrency('EUR');
              }}
              className={primaryBtn}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Direct Proof</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {directPayments.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400">
                No direct payment receipts submitted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Recipient Institution</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Transaction / SWIFT Ref</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Receipt</th>
                      <th className="py-3 px-4">Status</th>
                      {admin && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {directPayments.map((dp) => (
                      <tr key={dp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{dp.student_name}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                            {dp.fee_category.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{dp.institution_name}</td>
                        <td className="py-3 px-4 font-black text-[#58051E]">
                          {money(Number(dp.amount_paid), dp.currency)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{dp.transaction_ref}</td>
                        <td className="py-3 px-4 text-slate-500">{dp.payment_date}</td>
                        <td className="py-3 px-4">
                          {dp.receipt_url ? (
                            <a
                              href={dp.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#58051E] font-bold hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            dp.verification_status === 'Verified'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : dp.verification_status === 'Rejected'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {dp.verification_status}
                          </span>
                        </td>
                        {admin && (
                          <td className="py-3 px-4 text-right">
                            {dp.verification_status === 'Pending Verification' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setDirectReview({ record: dp, approve: true })}
                                  className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                                  title="Verify direct payment"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDirectReview({ record: dp, approve: false })}
                                  className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                                  title="Reject"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-semibold">{dp.reviewer_notes || 'Reviewed'}</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Alerts */}
          {error && (
            <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <p role="status" className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{message}</span>
            </p>
          )}

          {/* Student & Destination Context Selector (Admin) */}
          {admin && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#58051E]" /> Student
                </label>
                <select
                  aria-label="Student"
                  className={fieldClass}
                  value={studentId}
                  onChange={e => { setStudentId(e.target.value); setAppId(''); }}
                >
                  <option value="">All students — ledger only</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              {targetId && studentApps.length > 0 && (
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#58051E]" /> Selected university / country
                  </label>
                  <select
                    className={fieldClass}
                    value={application?.id || ''}
                    onChange={e => setAppId(e.target.value)}
                  >
                    {studentApps.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.university_name} — {universities.find(u => u.id === a.university_id)?.country || a.universities?.country || 'Country not set'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetId && !university && (
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#58051E]" /> Study destination
                  </label>
                  <select
                    className={fieldClass}
                    value={preferredCountry}
                    disabled={busy}
                    onChange={async e => {
                      setBusy(true);
                      setError('');
                      try {
                        await saveEducationCountry(targetId, e.target.value);
                        setPreferredCountry(e.target.value);
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <option value="">Select a country</option>
                    {countryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
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
                    const due = feeIsDue(fee, stages);
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
                              <p className="text-[11px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{fee.timing === 'before' ? 'Before' : 'After'} {educationStages[fee.stage - 1]}{country ? ` • ${country}` : ''}</span>
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-base font-black text-[#58051E]">
                                {money(fee.amount, fee.currency)}
                              </span>
                            </div>
                          </div>

                          {fee.description && (
                            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                              {fee.description}
                            </p>
                          )}

                          {feeOverrides[fee.id] && feeOverrides[fee.id].discount_amount > 0 && (
                            <div className="flex items-center gap-1.5 p-2 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-800">
                              <Percent className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Discount: -{money(feeOverrides[fee.id].discount_amount, fee.currency)} ({feeOverrides[fee.id].discount_reason})</span>
                            </div>
                          )}

                          {isThirdParty ? (
                            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2">
                              <div className="flex items-start gap-2">
                                <Building2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                                <p className="text-xs font-semibold text-blue-900">
                                  Pay directly to the institution / authority. This amount is not collected by Ferex.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setDirectUploadFee(fee);
                                  setDirectInstitution(university?.name || country || 'Institution Account');
                                  setDirectAmount(fee.amount);
                                  setDirectCurrency(fee.currency);
                                }}
                                className="w-full h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>Upload Direct Wire / Receipt Proof</span>
                              </button>
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

                              {balance.paid > fee.amount && (
                                <p className="text-xs font-bold text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                  Credit balance: {money(balance.paid - fee.amount, fee.currency)}. Contact finance for adjustment.
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Admin Discount Action */}
                        {admin && targetId && (
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => {
                                setDiscountModalFee(fee);
                                setDiscountAmount(feeOverrides[fee.id]?.discount_amount || 0);
                                setDiscountReason(feeOverrides[fee.id]?.discount_reason || 'Merit Scholarship');
                              }}
                              className="text-[11px] font-bold text-[#58051E] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Tag className="w-3 h-3" />
                              <span>{feeOverrides[fee.id] ? 'Edit Scholarship / Discount' : 'Apply Scholarship / Discount'}</span>
                            </button>
                          </div>
                        )}

                        {/* Card Action */}
                        {!isThirdParty && balance.payable > 0 && (
                          <div className="pt-3 border-t border-slate-100">
                            <button
                              className={primaryBtn}
                              disabled={needsCountry || (!admin && (!due || !upiAvailable || fee.currency !== 'INR'))}
                              onClick={() => openPayment(fee)}
                            >
                              {admin ? (
                                <>
                                  <CreditCard className="w-4 h-4" />
                                  <span>Record bank / cash / split payment</span>
                                </>
                              ) : (
                                <>
                                  <QrCode className="w-4 h-4" />
                                  <span>Pay by UPI</span>
                                </>
                              )}
                            </button>
                            {!admin && !due && (
                              <p className="text-[11px] text-slate-500 mt-1.5 italic">
                                Available {fee.timing} the configured workflow stage.
                              </p>
                            )}
                            {!admin && due && (!upiAvailable || fee.currency !== 'INR') && (
                              <p className="text-[11px] text-amber-700 font-semibold mt-1.5">
                                {fee.currency !== 'INR'
                                  ? 'UPI requires INR. Ask finance to confirm the payable currency.'
                                  : 'UPI is not configured or is disabled. Contact education admin.'}
                              </p>
                            )}
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
                  Persisted audit transactions, bank UTR references, split allocations, and approval states.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  aria-label="Search payment ledger"
                  className="w-full h-9 pl-9 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
                  placeholder="Search student, fee, reference or status"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Student / Fee</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Method / Reference</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledger.map(p => {
                    const isVerified = ['Paid', 'Verified'].includes(p.status);
                    const isPending = p.status === 'Pending Verification';
                    const isRejected = p.status === 'Rejected';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{p.student_name}</div>
                          <div className="text-xs font-extrabold text-[#58051E] mt-0.5">{p.title}</div>
                          <details className="text-[11px] text-slate-500 mt-1 cursor-pointer">
                            <summary className="hover:text-slate-800">Details</summary>
                            <div className="p-2 bg-slate-50 rounded-lg mt-1 space-y-1 text-slate-600 border border-slate-100">
                              {p.description && <p>{p.description}</p>}
                              {p.reviewer_notes && <p className="italic font-medium text-slate-700">Notes: {p.reviewer_notes}</p>}
                              <p className="text-[10px] text-slate-400 font-mono">{new Date(p.created_at).toLocaleString()}</p>
                            </div>
                          </details>
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-black text-slate-900 text-sm">
                            {money(Number(p.amount), p.currency || 'INR')}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                            {p.payment_method}
                          </div>
                          {p.utr_number && (
                            <div className="font-mono text-[11px] text-slate-600 mt-1">
                              {p.utr_number}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> {p.status}
                            </span>
                          ) : isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> {p.status}
                            </span>
                          ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3" /> {p.status}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                              {p.status}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {admin && isPending && (
                            <div className="flex items-center gap-2">
                              <button
                                disabled={busy}
                                onClick={() => {
                                  setReview({ payment: p, approve: true });
                                  setReviewNotes('');
                                }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Check className="w-3 h-3" /> Verify
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => {
                                  setReview({ payment: p, approve: false });
                                  setReviewNotes('');
                                }}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <X className="w-3 h-3" /> Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {!loading && !ledger.length && (
                <div className="p-8 text-center text-xs font-bold text-slate-400">
                  No matching payments found.
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
        </>
      )}

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
                    ? 'Record confirmed receipts. Add split payment entries and methods as needed.'
                    : 'Pay via UPI, then submit your transaction UTR reference number.'}
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
                          {['Bank Transfer', 'Cash', 'UPI', 'Cheque', 'Card'].map(m => (
                            <option key={m} value={m}>{m}</option>
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
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 inline-block">
                  <span className="text-2xl font-black text-[#58051E]">
                    {money(total, 'INR')}
                  </span>
                </div>

                {uri && (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      alt="UPI payment QR code"
                      src={generateQrCodeImageUrl(uri)}
                      className="w-52 h-52 rounded-2xl border border-slate-200 shadow-md"
                    />
                    <a
                      href={uri}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#58051E] text-white text-xs font-bold rounded-xl hover:bg-[#430316] transition-all"
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
                    if (!admin && (!upiAvailable || !feeIsDue(currentFee, stages))) {
                      throw new Error('This payment is not currently available.');
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
                    setActiveFee(null);
                    setMessage(admin ? 'Payment entries recorded successfully.' : 'UPI reference submitted. Awaiting finance verification.');
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

      {/* Direct Review Modal */}
      {directReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Review direct payment"
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 max-w-lg w-full space-y-4 text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                {directReview.approve ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Verify direct payment proof</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-600" />
                    <span>Reject direct payment proof</span>
                  </>
                )}
              </h2>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDirectReview(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-900">{directReview.record.student_name}</div>
              <div className="text-sm font-black text-[#58051E]">
                {money(Number(directReview.record.amount_paid), directReview.record.currency || 'EUR')} • {directReview.record.institution_name}
              </div>
              <div className="text-xs font-mono text-slate-600">Ref: {directReview.record.transaction_ref}</div>
              {directReview.record.receipt_url && (
                <div className="pt-1">
                  <a href={directReview.record.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold hover:underline inline-flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> View Uploaded Receipt
                  </a>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                Reviewer Notes / Verification Reference
              </label>
              <textarea
                aria-label="Review notes"
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
                value={directReviewNotes}
                onChange={e => setDirectReviewNotes(e.target.value)}
                placeholder="Confirmation code or reason..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDirectReview(null)}
                className={secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                className={primaryBtn}
                disabled={busy || (!directReview.approve && !directReviewNotes.trim())}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await reviewDirectPayment(directReview.record.id, directReview.approve, directReviewNotes);
                    setDirectReview(null);
                    setDirectReviewNotes('');
                    setMessage('Direct payment status updated.');
                    await load();
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Saving…' : 'Save Status'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Discount / Scholarship Modal */}
      {discountModalFee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Student Discount and Scholarship"
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 max-w-lg w-full space-y-4 text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#58051E]" />
                  <span>Apply Student Discount / Scholarship</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {discountModalFee.title} for {studentName}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDiscountModalFee(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Standard Fee:</span>
              <span className="text-sm font-black text-slate-900">{money(discountModalFee.amount, discountModalFee.currency)}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  Discount / Scholarship Amount ({discountModalFee.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  max={discountModalFee.amount}
                  value={discountAmount || ''}
                  onChange={e => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                  className={fieldClass}
                  placeholder="e.g. 5000"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  Reason / Grant Program
                </label>
                <input
                  type="text"
                  value={discountReason}
                  onChange={e => setDiscountReason(e.target.value)}
                  className={fieldClass}
                  placeholder="e.g. Merit Scholarship, Early Bird Concession, Referral"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs font-bold text-emerald-900">
                <span>Net Payable by Student:</span>
                <span className="text-sm font-black">
                  {money(Math.max(0, discountModalFee.amount - (discountAmount || 0)), discountModalFee.currency)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {feeOverrides[discountModalFee.id] ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await saveStudentFeeOverride({
                        student_id: targetId,
                        fee_id: discountModalFee.id,
                        custom_amount: discountModalFee.amount,
                        discount_amount: 0,
                        discount_reason: '',
                        currency: discountModalFee.currency
                      });
                      const updated = await getStudentFeeOverrides(targetId);
                      setFeeOverrides(updated);
                      setDiscountModalFee(null);
                      setMessage('Discount override removed.');
                    } catch (e) {
                      setMessage((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Remove Discount
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDiscountModalFee(null)}
                  className={secondaryBtn}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={primaryBtn}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const finalCustom = Math.max(0, discountModalFee.amount - discountAmount);
                      await saveStudentFeeOverride({
                        student_id: targetId,
                        fee_id: discountModalFee.id,
                        custom_amount: finalCustom,
                        discount_amount: discountAmount,
                        discount_reason: discountReason.trim() || 'Discount Grant',
                        currency: discountModalFee.currency
                      });
                      const updated = await getStudentFeeOverrides(targetId);
                      setFeeOverrides(updated);
                      setDiscountModalFee(null);
                      setMessage('Discount applied to student invoice.');
                    } catch (e) {
                      setMessage((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? 'Saving…' : 'Apply Discount'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Direct Payment Proof Upload Modal */}
      {directUploadFee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Direct payment upload"
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 max-w-lg w-full space-y-4 text-left"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#58051E]" />
                  <span>Upload Direct Payment Proof</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Receipt for University Tuition, Flywire, or Embassy / VFS Fee
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDirectUploadFee(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  Recipient Institution / Authority Name
                </label>
                <input
                  type="text"
                  className={fieldClass}
                  placeholder="e.g. Warsaw University of Technology or VFS Global Poland"
                  value={directInstitution}
                  onChange={e => setDirectInstitution(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                    Amount Paid
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={fieldClass}
                    value={directAmount || ''}
                    onChange={e => setDirectAmount(Number(e.target.value))}
                    placeholder="e.g. 15000"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                    Currency
                  </label>
                  <select
                    className={fieldClass}
                    value={directCurrency}
                    onChange={e => setDirectCurrency(e.target.value)}
                  >
                    <option value="PLN">PLN (Polish Złoty)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                    SWIFT / Flywire / UTR Ref
                  </label>
                  <input
                    type="text"
                    className={fieldClass}
                    placeholder="e.g. SWIFT-8832910"
                    value={directTxRef}
                    onChange={e => setDirectTxRef(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    className={fieldClass}
                    value={directDate}
                    onChange={e => setDirectDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  Receipt Document URL / Proof Link
                </label>
                <input
                  type="url"
                  className={fieldClass}
                  placeholder="https://... receipt PDF or screenshot image"
                  value={directReceiptUrl}
                  onChange={e => setDirectReceiptUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDirectUploadFee(null)}
                className={secondaryBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                className={primaryBtn}
                disabled={busy || !directInstitution.trim() || !directAmount || !directTxRef.trim()}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await submitDirectPaymentProof({
                      studentId: targetId,
                      studentName,
                      feeCategory: (directUploadFee.id === 'visa-fee' ? 'vfs_visa_fee' : 'university_tuition') as any,
                      institutionName: directInstitution.trim(),
                      amountPaid: directAmount,
                      currency: directCurrency,
                      transactionRef: directTxRef.trim(),
                      paymentDate: directDate,
                      receiptUrl: directReceiptUrl.trim()
                    });
                    setDirectUploadFee(null);
                    setMessage('Direct payment proof submitted successfully.');
                    await load();
                  } catch (e) {
                    setMessage((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? 'Submitting…' : 'Submit Direct Proof'}
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
    </div>
  );
}
