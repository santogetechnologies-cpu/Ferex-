import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useUniversities } from '../hooks/useUniversities';
import { useDestinations } from '../hooks/useDestinations';
import { getApplications, isRealApplication } from '../lib/api/applications';
import { getStudents } from '../lib/api/students';
import { getJourneyStages } from '../lib/api/journey';
import { fetchStudentAgreement } from '../lib/api/agreement';
import { getEducationCountry, saveEducationCountry, listEducationPayments, recordEducationPayment, reviewEducationPayment } from '../lib/api/educationBilling';
import { educationFees, resolveEducationFee, feeBalance, feeIsDue, educationStages, money, cents, type EducationFee, type PaymentPart } from '../lib/educationBilling';
import { getGlobalPaymentGateways, generateUpiPaymentUri, generateQrCodeImageUrl, type GlobalPaymentGatewayConfig } from '../lib/api/paymentGateways';
import type { Application, JourneyStage, Payment, UserProfile } from '../lib/types';
import { EducationFeeEditor } from './EducationFeeEditor';
import { supabase } from '../lib/supabase';

const field = 'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white w-full';
const button = 'rounded-lg bg-[#58051E] text-white px-4 py-2 text-sm disabled:opacity-40';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function EducationBillingConsole({ admin = false }: { admin?: boolean }) {
  const { user, profile } = useAuth();
  const { config, ready: configReady } = useFeeConfig();
  const { universities } = useUniversities();
  const { destinations } = useDestinations();
  const [preferredCountry, setPreferredCountry] = useState('');
  const [tab, setTab] = useState<'billing' | 'settings'>('billing');
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
    setLoading(true); setError('');
    try {
      const [records, apps, studentList, gateways] = await Promise.all([
        listEducationPayments(admin ? undefined : user!.id), getApplications(admin ? undefined : user!.id),
        admin ? getStudents() : Promise.resolve([]), getGlobalPaymentGateways()
      ]);
      setPayments(records); setApplications(apps.filter(isRealApplication)); setStudents(studentList); setGateway(gateways);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [admin, user?.id]);
  useEffect(() => {
    void load();
    const refresh = () => { void load(); };
    window.addEventListener('ferex_payment_change', refresh);
    window.addEventListener('ferex_application_change', refresh);
    const channel = supabase.channel(`education-billing-${admin ? 'admin' : user?.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'payments', ...(admin ? {} : { filter: `student_id=eq.${user?.id}` }) }, refresh).subscribe();
    return () => { window.removeEventListener('ferex_payment_change', refresh); window.removeEventListener('ferex_application_change', refresh); void supabase.removeChannel(channel); };
  }, [load, admin, user?.id]);

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
    Promise.all([getJourneyStages(targetId), fetchStudentAgreement(targetId), getEducationCountry(targetId)]).then(([stored, agreement, destination]) => {
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
      setStages([...stored.filter(s => !completed.has(s.stage_number)), ...Array.from(completed).map(n => ({ id: `derived-${n}`, student_id: targetId, stage_number: n, stage_name: educationStages[n - 1], status: 'Completed' as const, completed_at: null, notes: '' }))]);
    }).catch(e => { if (!cancelled) setError(`Could not load workflow: ${(e as Error).message}`); });
    return () => { cancelled = true; };
  }, [targetId, application?.id, application?.status, config, payments]);

  const fees = educationFees(config).filter(f => f.enabled).map(f => resolveEducationFee(f, country));
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
    setActiveFee(fee); setTotal(amount); setParts([{ method: admin ? 'Bank Transfer' : 'UPI', amount, reference: '', date: today() }]);
    setBatchId(crypto.randomUUID()); setNotes(''); setMessage('');
  };
  const uri = activeFee && upiAvailable ? generateUpiPaymentUri({ upiId, merchantName: gateway?.divisions.education.customMerchantName || gateway?.upi.merchantName || 'Ferex', amount: total, transactionRef: batchId, transactionNote: activeFee.title }) : '';

  return <div className="space-y-6 text-left">
    <div className="flex flex-wrap justify-between items-center gap-3"><div><h1 className="text-xl font-bold">{admin ? 'Payment & Billing Control Console' : 'Payments & billing'}</h1><p className="text-sm text-slate-500 mt-1">{admin ? 'Configure education fees, record receipts and verify student UPI submissions.' : 'Your configured fees, direct university payments and payment history.'}</p></div><button onClick={load} disabled={loading} className="border rounded-lg px-4 py-2 text-sm">Refresh</button></div>
    {admin && <nav className="flex gap-3"><button className={tab === 'billing' ? button : 'px-4 py-2'} onClick={() => setTab('billing')}>Student billing & ledger</button><button className={tab === 'settings' ? button : 'px-4 py-2'} onClick={() => setTab('settings')}>Configure fees & workflow timing</button></nav>}
    {tab === 'settings' ? <EducationFeeEditor /> : <>
      {error && <p role="alert" className="bg-red-50 text-red-800 p-3 rounded-lg">{error}</p>}
      <p role="status" className="text-sm">{message}</p>
      {admin && <label className="block text-sm">Student<select className={field} value={studentId} onChange={e => { setStudentId(e.target.value); setAppId(''); }}><option value="">All students — ledger only</option>{students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>)}</select></label>}
      {targetId && studentApps.length > 0 && <label className="block text-sm">Selected university / country<select className={field} value={application?.id || ''} onChange={e => setAppId(e.target.value)}>{studentApps.map(a => <option key={a.id} value={a.id}>{a.university_name} — {universities.find(u => u.id === a.university_id)?.country || a.universities?.country || 'Country not set'}</option>)}</select></label>}
      {targetId && !university && <label className="block text-sm">Study destination<select className={field} value={preferredCountry} disabled={busy} onChange={async e => {
        setBusy(true); setError('');
        try { await saveEducationCountry(targetId, e.target.value); setPreferredCountry(e.target.value); }
        catch (e) { setError((e as Error).message); } finally { setBusy(false); }
      }}><option value="">Select a country</option>{countryOptions.map(c => <option key={c}>{c}</option>)}</select></label>}
      <div className="flex flex-wrap gap-4">{Object.entries(totals).map(([currency, sums]) => <div key={currency} className="border rounded-xl p-4 bg-white"><p className="text-xs text-slate-500">Recorded payments · {currency}</p><p className="font-bold">{money(sums.paid, currency)} verified</p><p className="text-sm">{money(sums.pending, currency)} awaiting verification</p></div>)}</div>
      {loading || !configReady ? <p>Loading billing records…</p> : targetId && !error && <>
        {!country && <p className="text-sm bg-amber-50 p-3 rounded-lg">Select a university to apply country-specific fees. Fees with country overrides remain unavailable until a destination is selected.</p>}
        <div className="grid md:grid-cols-2 gap-4">{fees.map(fee => {
          const balance = feeBalance(fee, studentPayments);
          const due = feeIsDue(fee, stages);
          const needsCountry = !country && Object.keys(fee.countryAmounts || {}).length > 0;
          return <article key={fee.id} className="border border-slate-200 rounded-xl bg-white p-5 space-y-3">
            <div className="flex justify-between gap-3"><h2 className="font-bold">{fee.title}</h2><strong>{money(fee.amount, fee.currency)}</strong></div>
            <p className="text-xs text-slate-500">{fee.timing === 'before' ? 'Before' : 'After'} {educationStages[fee.stage - 1]}{country ? ` · ${country}` : ''}</p>
            <p className="text-sm">{fee.description}</p>
            {fee.recipient === 'direct_third_party' ? <p className="text-sm font-semibold text-blue-800">Pay directly to the institution / authority. This amount is not collected by Ferex.</p> : <>
              <p className="text-sm">Verified: {money(balance.paid, fee.currency)} · Outstanding: {money(balance.remaining, fee.currency)}{balance.pending > 0 ? ` · In review: ${money(balance.pending, fee.currency)}` : ''}</p>
              {balance.paid > fee.amount && <p className="text-sm text-amber-800">Credit balance: {money(balance.paid - fee.amount, fee.currency)}. Contact finance for adjustment.</p>}
              {balance.payable > 0 && <button className={button} disabled={needsCountry || (!admin && (!due || !upiAvailable || fee.currency !== 'INR'))} onClick={() => openPayment(fee)}>{admin ? 'Record bank / cash / split payment' : 'Pay by UPI'}</button>}
              {!admin && !due && <p className="text-xs text-slate-500">Available {fee.timing} the configured workflow stage.</p>}
              {!admin && due && (!upiAvailable || fee.currency !== 'INR') && <p className="text-xs text-amber-800">{fee.currency !== 'INR' ? 'UPI requires INR. Ask finance to confirm the payable currency.' : 'UPI is not configured or is disabled. Contact education admin.'}</p>}
            </>}
          </article>;
        })}</div>
        <section className="p-5 rounded-xl border border-blue-200 bg-blue-50"><h2 className="font-bold">University fees — paid directly by the student</h2><p className="text-sm mt-2">Pay application fees and tuition only to the university's official account or payment portal. Ferex does not collect university fees or tuition installments.</p>{university && <p className="text-sm mt-2">{university.name} · Tuition reference: {application?.tuition_fee || university.tuition_range || 'Confirm with the university'}</p>}</section>
      </>}
      <section className="space-y-3"><h2 className="font-bold">Payment ledger</h2><input aria-label="Search payment ledger" className={field} placeholder="Search student, fee, reference or status" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b"><th className="p-2">Student / fee</th><th>Amount</th><th>Method / reference</th><th>Status</th><th>Actions</th></tr></thead><tbody>{ledger.map(p => <tr key={p.id} className="border-b"><td className="p-2"><div>{p.student_name}</div><strong>{p.title}</strong><details className="text-xs text-slate-500"><summary>Details</summary>{p.description}<p>{p.reviewer_notes}</p><p>{new Date(p.created_at).toLocaleString()}</p></details></td><td>{money(Number(p.amount), p.currency || 'INR')}</td><td>{p.payment_method}<div className="text-xs">{p.utr_number}</div></td><td>{p.status}</td><td>{admin && p.status === 'Pending Verification' && <div className="flex gap-2"><button disabled={busy} className="text-green-800" onClick={() => { setReview({ payment: p, approve: true }); setReviewNotes(''); }}>Verify</button><button disabled={busy} className="text-red-800" onClick={() => { setReview({ payment: p, approve: false }); setReviewNotes(''); }}>Reject</button></div>}</td></tr>)}</tbody></table></div>
        {!loading && !ledger.length && <p className="text-sm text-slate-500">No matching payments.</p>}
        {!admin && <div className="flex gap-4 text-sm underline"><Link to="/student/invoices">Invoices</Link><Link to="/student/receipts">Receipts</Link></div>}
      </section>
    </>}
    {activeFee && <div className="fixed inset-0 z-50 bg-slate-900/50 p-4 flex items-center justify-center"><section role="dialog" aria-modal="true" aria-label="Record education payment" className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-auto space-y-4">
      <h2 className="font-bold text-lg">{activeFee.title} · {studentName}</h2>
      <p className="text-sm">{admin ? 'Record confirmed receipts only. Add as many payment entries and methods as needed. All entries are saved together.' : 'Pay using your UPI app, then submit the transaction reference. Finance verifies receipt before marking this fee paid.'}</p>
      {admin ? <>
        <label className="text-sm block">Total received ({activeFee.currency})<input type="number" min="0.01" step="0.01" className={field} value={total} onChange={e => setTotal(Number(e.target.value))} /></label>
        {parts.map((part, i) => <div key={i} className="grid sm:grid-cols-5 gap-2 border rounded-lg p-3"><select aria-label={`Entry ${i + 1} method`} className={field} value={part.method} onChange={e => setParts(parts.map((p, n) => n === i ? { ...p, method: e.target.value as PaymentPart['method'] } : p))}>{['Bank Transfer', 'Cash', 'UPI', 'Cheque', 'Card'].map(m => <option key={m}>{m}</option>)}</select><input aria-label={`Entry ${i + 1} amount`} className={field} type="number" min="0.01" step="0.01" value={part.amount} onChange={e => setParts(parts.map((p, n) => n === i ? { ...p, amount: Number(e.target.value) } : p))} /><input aria-label={`Entry ${i + 1} reference`} className={field} placeholder="UTR / cash receipt" value={part.reference} onChange={e => setParts(parts.map((p, n) => n === i ? { ...p, reference: e.target.value } : p))} /><input aria-label={`Entry ${i + 1} date`} className={field} type="date" max={today()} value={part.date} onChange={e => setParts(parts.map((p, n) => n === i ? { ...p, date: e.target.value } : p))} /><button disabled={parts.length === 1 || busy} onClick={() => setParts(parts.filter((_, n) => n !== i))}>Remove</button></div>)}
        <button disabled={busy} className="border rounded-lg px-3 py-2 text-sm" onClick={() => setParts([...parts, { method: 'Cash', amount: Math.max(0, total - parts.reduce((sum, p) => sum + p.amount, 0)), reference: '', date: today() }])}>Add payment entry</button>
        <p className="text-sm">Allocated {money(parts.reduce((sum, p) => sum + p.amount, 0), activeFee.currency)} of {money(total, activeFee.currency)}</p>
        <textarea aria-label="Payment notes" className={field} placeholder="Notes / receiving bank / cashier" value={notes} onChange={e => setNotes(e.target.value)} />
      </> : <>
        <p className="font-bold">{money(total, 'INR')}</p>{uri && <><img alt="UPI payment QR code" src={generateQrCodeImageUrl(uri)} className="w-56 h-56" /><a href={uri} className="text-blue-800 underline">Open UPI app</a><p className="text-sm">Payee: {upiId}</p></>}
        <input aria-label="UPI transaction reference" className={field} placeholder="Enter UPI transaction reference" value={parts[0]?.reference || ''} onChange={e => setParts([{ ...parts[0], reference: e.target.value }])} />
      </>}
      <p role="status" className="text-sm text-red-800">{message}</p>
      <div className="flex justify-end gap-3"><button disabled={busy} onClick={() => { setActiveFee(null); setMessage(''); }}>Cancel</button><button disabled={busy} className={button} onClick={async () => {
        setBusy(true); setMessage('');
        try {
          const latest = await listEducationPayments(targetId);
          const currentFee = fees.find(f => f.id === activeFee.id);
          if (!currentFee || currentFee.recipient !== 'ferex' || cents(total) > cents(feeBalance(currentFee, latest.filter(p => !p.ref_no?.startsWith(`EDU-${batchId}-`))).payable)) throw new Error('The fee or balance changed. Close this window and refresh before recording payment.');
          if (!admin && (!upiAvailable || !feeIsDue(currentFee, stages))) throw new Error('This payment is not currently available.');
          await recordEducationPayment({ studentId: targetId, studentName, fee: currentFee, total, parts, notes, studentSubmission: !admin, batchId, applicationId: application?.id });
          setActiveFee(null); setMessage(admin ? 'Payment entries recorded successfully.' : 'UPI reference submitted. Awaiting finance verification.'); await load();
        } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
      }}>{busy ? 'Saving…' : admin ? 'Record payment entries' : 'Submit UPI reference'}</button></div>
    </section></div>}
    {review && <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-label="Review payment" className="bg-white rounded-xl p-6 max-w-lg w-full space-y-4"><h2 className="font-bold">{review.approve ? 'Verify received payment' : 'Reject payment reference'}</h2><p>{review.payment.student_name} · {money(Number(review.payment.amount), review.payment.currency || 'INR')} · {review.payment.utr_number}</p><textarea aria-label="Review notes" className={field} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Verification details or rejection reason" /><div className="flex justify-end gap-3"><button disabled={busy} onClick={() => setReview(null)}>Cancel</button><button className={button} disabled={busy || (!review.approve && !reviewNotes.trim())} onClick={async () => { setBusy(true); try { await reviewEducationPayment(review.payment.id, review.approve, reviewNotes); setReview(null); setMessage('Payment review saved.'); await load(); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } }}>Save review</button></div><p role="status">{message}</p></section></div>}
  </div>;
}
