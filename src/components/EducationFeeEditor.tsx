import { useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle2, AlertCircle, Save, RefreshCw } from 'lucide-react';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { educationFees, educationStages, type EducationFee } from '../lib/educationBilling';
import { GstField } from './GstField';
import { saveEducationFees } from '../lib/api/educationBilling';
import { getGlobalPaymentGateways, saveGlobalPaymentGateways } from '../lib/api/paymentGateways';
import { BlockCap, CapLoader } from './CapLoader';

const inputClass = 'w-full h-10 px-3';
const labelClass = 'block text-xs font-semibold text-slate-600 mb-1.5';

export function EducationFeeEditor() {
  const { config, ready } = useFeeConfig();
  const [fees, setFees] = useState<EducationFee[]>(() => educationFees(config));
  const [upiEnabled, setUpiEnabled] = useState(config.payment_gateways.phonepe_upi_enabled);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    if (!dirty) {
      setFees(educationFees(config));
      setUpiEnabled(config.payment_gateways.phonepe_upi_enabled);
      getGlobalPaymentGateways().then(g => setUpiEnabled(g.upi?.enabled !== false && g.divisions.education.allowUpi !== false)).catch(() => {});
    }
  }, [config, dirty]);

  const change = (id: string, values: Partial<EducationFee>) => {
    setDirty(true);
    setFees(current => current.map(f => f.id === id ? { ...f, ...values } : f));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      // Country amounts now live in Country fee plans; drop any old per-country overrides so they cannot apply silently.
      await saveEducationFees(fees.map(f => ({ ...f, countryAmounts: undefined })), upiEnabled);
      try {
        const currentGw = await getGlobalPaymentGateways();
        await saveGlobalPaymentGateways({
          ...currentGw,
          upi: { ...currentGw.upi, enabled: upiEnabled },
          divisions: {
            ...currentGw.divisions,
            education: {
              ...currentGw.divisions.education,
              allowUpi: upiEnabled,
            }
          }
        });
      } catch (gwErr) {
        console.warn('Could not sync global gateway configuration:', gwErr);
      }
      setDirty(false);
      setMessageType('success');
      setMessage('Fee configuration saved successfully.');
    } catch (e) {
      setMessageType('error');
      setMessage((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <BlockCap />;

  const registration = fees.find(f => f.id === 'registration');
  const flowFees = fees.filter(f => f.id !== 'registration');
  const add = (preset: Partial<EducationFee>) => {
    setDirty(true);
    setFees(cur => [...cur, { id: crypto.randomUUID(), title: 'New fee', enabled: true, amount: 0, currency: 'INR', tax_rate_percent: 18, recipient: 'ferex', timing: 'before', stage: 5, description: '', ...preset }]);
  };

  const card = (fee: EducationFee, isRegistration = false) => (
    <article key={fee.id} className={`rounded-2xl border bg-white p-5 space-y-4 ${fee.enabled ? 'border-slate-200/80' : 'border-slate-200/60 opacity-70'}`}>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={fee.enabled} onChange={e => change(fee.id, { enabled: e.target.checked })} aria-label={`${fee.title || 'Fee'} enabled`} />
          <span className="text-sm font-bold text-slate-900">{fee.title || 'Untitled fee'}</span>
          {!fee.enabled && <span className="text-xs font-medium text-slate-500">Off</span>}
        </label>
        {!isRegistration && (
          <button type="button" onClick={() => { setDirty(true); setFees(fees.filter(f => f.id !== fee.id)); }} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </button>
        )}
      </div>

      {!isRegistration && (
        <div role="group" aria-label="Who collects this fee" className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
          {([['ferex', 'Ferex collects it'], ['direct_third_party', 'Student pays it directly']] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => change(fee.id, { recipient: value, ...(value === 'direct_third_party' ? { is_direct_payment: true } : { is_direct_payment: false }) })} aria-pressed={fee.recipient === value}
              className={`px-3.5 h-8 rounded-[10px] text-xs font-semibold cursor-pointer ${fee.recipient === value ? 'bg-white text-[#5A0122] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={isRegistration ? '' : 'lg:col-span-2'}>
          <label className={labelClass}>Fee name</label>
          <input className={inputClass} value={fee.title} onChange={e => change(fee.id, { title: e.target.value })} placeholder="e.g. Legalization fee" />
        </div>
        {fee.recipient === 'ferex' ? (
          <>
            <div>
              <label className={labelClass}>Amount</label>
              <input type="number" min="0" step="0.01" aria-label="Common amount" className={inputClass} value={fee.amount} onChange={e => change(fee.id, { amount: Number(e.target.value) })} />
            </div>
            <div>
              <label className={labelClass}>Currency</label>
              <select className={inputClass} value={fee.currency} onChange={e => change(fee.id, { currency: e.target.value as EducationFee['currency'] })}>
                {['INR', 'EUR', 'USD', 'GBP', 'PLN'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <GstField value={fee.tax_rate_percent ?? 0} onChange={rate => change(fee.id, { tax_rate_percent: rate })} />
          </>
        ) : (
          <div className="lg:col-span-2">
            <label className={labelClass}>Paid to</label>
            <input className={inputClass} value={fee.direct_recipient_institution || ''} onChange={e => change(fee.id, { direct_recipient_institution: e.target.value })} placeholder="e.g. VFS Global, the embassy, the university" />
          </div>
        )}
        <div>
          <label className={labelClass}>Due</label>
          <select aria-label="Payable" className={inputClass} value={fee.timing} onChange={e => change(fee.id, { timing: e.target.value as EducationFee['timing'] })}>
            <option value="before">Before this step</option>
            <option value="after">After this step</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Step in the student journey</label>
          <select aria-label="Workflow stage" className={inputClass} value={fee.stage} onChange={e => change(fee.id, { stage: Number(e.target.value) })}>
            {educationStages.map((name, i) => <option key={name} value={i + 1}>{i + 1}. {name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Note shown to the student</label>
        <textarea rows={2} className="w-full p-3" value={fee.description} onChange={e => change(fee.id, { description: e.target.value })} placeholder={fee.recipient === 'ferex' ? 'Anything the student should know about this fee' : 'Where and how the student should pay it'} />
      </div>
      {fee.recipient === 'direct_third_party' && <p className="text-xs text-slate-500">The student sees the name and who to pay, never an amount, and nothing is collected by Ferex.</p>}
      {fee.currency !== 'INR' && fee.recipient === 'ferex' && (
        <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-800 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" /> UPI accepts INR only. Other currencies can be recorded by an administrator.</p>
      )}
    </article>
  );

  return (
    <section className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Fees</h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">Set what students pay. Every student pays the registration fee. After that, you confirm for each student either the normal flow or a country package.</p>
        </div>
        {dirty && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20 shrink-0"><span className="w-2 h-2 rounded-full bg-amber-500" /> Unsaved changes</span>}
      </div>

      <fieldset disabled={saving} className="space-y-8">
        <div className="space-y-3">
          <div><h3 className="text-base font-bold text-slate-900">1. Registration fee</h3><p className="text-sm text-slate-500">Applies to every student. It is the only fee a student sees until you confirm their payment plan.</p></div>
          {registration ? card(registration, true) : <button type="button" onClick={() => add({ id: 'registration', title: 'Advanced Registration Fee', stage: 3 })} className="h-10 px-4 rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-600 cursor-pointer">Add the registration fee</button>}
        </div>

        <div className="space-y-3">
          <div><h3 className="text-base font-bold text-slate-900">2. Normal flow fees</h3><p className="text-sm text-slate-500">The common fees for students you put on the normal flow. Add anything you need: legalization, visa support, agency, documents. Fees the student pays to the university or embassy are shown to them as a message, without an amount.</p></div>
          {flowFees.map(f => card(f))}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => add({ title: 'Legalization fee', stage: 5 })} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-[#5A0122]/40 hover:text-[#5A0122] inline-flex items-center gap-1.5 cursor-pointer"><Plus className="w-4 h-4" /> Legalization fee</button>
            <button type="button" onClick={() => add({ title: 'Visa support fee', stage: 9 })} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-[#5A0122]/40 hover:text-[#5A0122] inline-flex items-center gap-1.5 cursor-pointer"><Plus className="w-4 h-4" /> Visa support fee</button>
            <button type="button" onClick={() => add({ title: 'Visa fee', recipient: 'direct_third_party', is_direct_payment: true, direct_recipient_institution: 'the embassy or visa centre', stage: 9 })} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-[#5A0122]/40 hover:text-[#5A0122] inline-flex items-center gap-1.5 cursor-pointer"><Plus className="w-4 h-4" /> Visa fee (paid directly)</button>
            <button type="button" onClick={() => add({})} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-[#5A0122]/40 hover:text-[#5A0122] inline-flex items-center gap-1.5 cursor-pointer"><Plus className="w-4 h-4" /> Add another fee</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span>
              <span className="block text-sm font-bold text-slate-900">Let students pay by UPI</span>
              <span className="block text-xs text-slate-500 mt-0.5">Students pay by UPI and submit the reference. You verify it before it counts.</span>
            </span>
            <input type="checkbox" checked={upiEnabled} onChange={e => { setDirty(true); setUpiEnabled(e.target.checked); }} aria-label="Enable UPI" />
          </label>
        </div>
      </fieldset>

      {message && (
        <div role="status" className={`p-3.5 rounded-2xl text-sm font-semibold flex items-center gap-2 ${messageType === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : messageType === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-800 border border-slate-200'}`}>
          {messageType === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : messageType === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CapLoader size="sm" />}
          <span>{message}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <button type="button" disabled={saving || !dirty} onClick={handleSave} className="h-10 px-6 bg-[#5A0122] hover:bg-[#68092A] text-white rounded-xl text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50">
          {saving ? <><CapLoader size="sm" /><span>Saving…</span></> : <><Save className="w-3.5 h-3.5" /><span>Save fee configuration</span></>}
        </button>
      </div>
    </section>
  );
}
