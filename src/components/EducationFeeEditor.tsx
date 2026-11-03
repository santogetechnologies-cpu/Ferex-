import { useEffect, useState } from 'react';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { useDestinations } from '../hooks/useDestinations';
import { useUniversities } from '../hooks/useUniversities';
import { educationFees, educationStages, type EducationFee } from '../lib/educationBilling';
import { saveEducationFees } from '../lib/api/educationBilling';

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white';
export function EducationFeeEditor() {
  const { config } = useFeeConfig();
  const { destinations } = useDestinations();
  const { universities } = useUniversities();
  const [fees, setFees] = useState<EducationFee[]>(() => educationFees(config));
  const [upiEnabled, setUpiEnabled] = useState(config.payment_gateways.phonepe_upi_enabled);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const countries = Array.from(new Set([...destinations.map(d => d.name), ...universities.map(u => u.country)])).sort();
  useEffect(() => { if (!dirty) { setFees(educationFees(config)); setUpiEnabled(config.payment_gateways.phonepe_upi_enabled); } }, [config, dirty]);
  const change = (id: string, values: Partial<EducationFee>) => { setDirty(true); setFees(current => current.map(f => f.id === id ? { ...f, ...values } : f)); };
  return <section className="space-y-5">
    <div><h2 className="text-xl font-bold">Education fee configuration</h2><p className="text-sm text-slate-600 mt-2">Set fees and when they become payable, before or after any workflow stage. Changes apply to outstanding balances; recorded payments remain in the ledger. Amounts are final payable totals, including any applicable tax.</p></div>
    <p className="rounded-xl bg-blue-50 text-blue-900 p-4 text-sm">University application fees and tuition are always paid by the student directly to the university. They cannot be collected through Ferex.</p>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={upiEnabled} onChange={e => { setDirty(true); setUpiEnabled(e.target.checked); }} /> Enable student UPI payments for configured Ferex fees (gateway details are managed by central admin)</label>
    <fieldset disabled={saving} className="space-y-4">
      {fees.map(fee => <article key={fee.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex justify-between gap-3"><label className="flex gap-2 items-center font-semibold"><input type="checkbox" checked={fee.enabled} onChange={e => change(fee.id, { enabled: e.target.checked })} />{fee.title || 'New fee'}</label>
          {!['registration', 'agency', 'vfs'].includes(fee.id) && <button type="button" className="text-red-700 text-sm" onClick={() => { setDirty(true); setFees(fees.filter(f => f.id !== fee.id)); }}>Remove fee</button>}</div>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="text-xs">Fee name<input className={inputClass} value={fee.title} onChange={e => change(fee.id, { title: e.target.value })} /></label>
          <label className="text-xs">Common amount<input type="number" min="0" step="0.01" className={inputClass} value={fee.amount} onChange={e => change(fee.id, { amount: Number(e.target.value) })} /></label>
          <label className="text-xs">Currency<select className={inputClass} value={fee.currency} onChange={e => change(fee.id, { currency: e.target.value as EducationFee['currency'] })}>{['INR', 'EUR', 'USD'].map(c => <option key={c}>{c}</option>)}</select></label>
          <label className="text-xs">Tax included (%)<input className={inputClass} type="number" min="0" max="100" step="0.01" value={fee.tax_rate_percent ?? 0} onChange={e => change(fee.id, { tax_rate_percent: Number(e.target.value) })} /></label>
          <label className="text-xs">Payable<select aria-label="Payable" className={inputClass} value={fee.timing} onChange={e => change(fee.id, { timing: e.target.value as EducationFee['timing'] })}><option value="before">Before stage</option><option value="after">After stage</option></select></label>
          <label className="text-xs">Workflow stage<select aria-label="Workflow stage" className={inputClass} value={fee.stage} onChange={e => change(fee.id, { stage: Number(e.target.value) })}>{educationStages.map((name, i) => <option key={name} value={i + 1}>{i + 1}. {name}</option>)}</select></label>
          <label className="text-xs">Recipient<select className={inputClass} value={fee.recipient} onChange={e => change(fee.id, { recipient: e.target.value as EducationFee['recipient'] })}><option value="ferex">Ferex — student UPI / admin entry</option><option value="direct_third_party">Direct to institution / authority</option></select></label>
        </div>
        <label className="block text-xs">Student instructions<textarea className={inputClass} value={fee.description} onChange={e => change(fee.id, { description: e.target.value })} /></label>
        {fee.currency !== 'INR' && fee.recipient === 'ferex' && <p className="text-sm text-amber-800">UPI accepts INR only. This currency can be recorded by an admin; configure INR to offer student UPI.</p>}
        <div className="space-y-2"><h3 className="text-sm font-semibold">Country-specific amounts</h3><p className="text-xs text-slate-500">The common amount applies unless the student's selected country has an override. A zero override waives this fee.</p>
          {Object.entries(fee.countryAmounts || {}).map(([country, amount]) => <div key={country} className="flex items-center gap-3"><span className="text-sm flex-1">{country}</span><input aria-label={`${country} ${fee.title} amount`} type="number" min="0" step="0.01" className={`${inputClass} max-w-40`} value={amount} onChange={e => change(fee.id, { countryAmounts: { ...fee.countryAmounts, [country]: Number(e.target.value) } })} /><button className="text-red-700 text-xs" onClick={() => { const next = { ...fee.countryAmounts }; delete next[country]; change(fee.id, { countryAmounts: next }); }}>Remove override</button></div>)}
          <select aria-label={`Add country override for ${fee.title}`} className={inputClass} value="" onChange={e => { if (e.target.value) change(fee.id, { countryAmounts: { ...fee.countryAmounts, [e.target.value]: fee.amount } }); }}><option value="">Add country override…</option>{countries.filter(c => !(c in (fee.countryAmounts || {}))).map(c => <option key={c}>{c}</option>)}</select>
        </div>
      </article>)}
      <button className="rounded-lg border px-4 py-2 text-sm" onClick={() => { setDirty(true); setFees([...fees, { id: crypto.randomUUID(), title: 'Additional fee', enabled: true, amount: 0, currency: 'INR', recipient: 'ferex', timing: 'before', stage: 1, description: '' }]); }}>Add another fee</button>
    </fieldset>
    <p role="status" className="text-sm">{message}</p>
    <button disabled={saving || !dirty} className="rounded-xl bg-[#58051E] text-white px-5 py-3 disabled:opacity-50" onClick={async () => { setSaving(true); setMessage(''); try { await saveEducationFees(fees, upiEnabled); setDirty(false); setMessage('Fee configuration saved to the database.'); } catch (e) { setMessage((e as Error).message); } finally { setSaving(false); } }}>{saving ? 'Saving…' : 'Save fee configuration'}</button>
  </section>;
}
