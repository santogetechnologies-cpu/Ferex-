import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Settings, Lock, Plus, Trash2, Save, Building2, Percent, Layers, ListChecks, ShieldCheck, X, Info } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { BlockCap } from '../../components/CapLoader';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtimeTable } from '../../hooks/useRealtimeTable';
import { getMasters, createMaster, deleteMaster } from '../../lib/api/masters';
import { getCommerceSettings, saveCommerceSettings } from '../../lib/api/digitalCommerce';
import { currencyDigits, defaultCommerceSettings, type CommerceSettings } from '../../lib/digitalCommerce';

const DIGITAL_ADMIN_ROLES = ['digital_admin', 'ferex_digital', 'digital', 'central', 'super_admin', 'superadmin'];
type Tab = 'agency' | 'taxes' | 'terms' | 'lists' | 'security';

const input = 'w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E] disabled:bg-slate-50';
const area = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]';
const label = 'block text-[11px] font-extrabold uppercase tracking-wide text-slate-500 mb-1';
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

// Lists an admin can customise. Project stages and task statuses are not here on purpose: the workflow and the database rely on them.
const LISTS: { type: string; title: string; hint: string }[] = [
  { type: 'service_categories', title: 'Service categories', hint: 'Offered when a project is created.' },
  { type: 'lead_categories', title: 'Lead categories', hint: 'Offered on the Leads page.' },
  { type: 'client_categories', title: 'Client categories', hint: 'Used to group clients.' },
  { type: 'deliverable_types', title: 'Deliverable types', hint: 'Offered when a deliverable is added.' },
  { type: 'tags', title: 'Tags', hint: 'Quick labels for clients and projects.' },
];

function ListEditor({ type, title, hint, onError, onDone }: { type: string; title: string; hint: string; onError: (m: string) => void; onDone: (m: string) => void }) {
  const [values, setValues] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { void getMasters('digital', type).then(setValues); }, [type]);
  useEffect(load, [load]);
  useRealtimeTable('digital_settings', load);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = draft.trim();
    if (!v) return;
    setBusy(true);
    try { setValues(await createMaster('digital', type, v)); setDraft(''); onDone(`${title}: added "${v}"`); }
    catch (err: any) { onError(err.message || 'Could not save'); } finally { setBusy(false); }
  };
  const remove = async (v: string) => {
    if (values.length <= 1) { onError('Keep at least one value in the list'); return; }
    setBusy(true);
    try { setValues(await deleteMaster('digital', type, v)); onDone(`${title}: removed "${v}"`); }
    catch (err: any) { onError(err.message || 'Could not save'); } finally { setBusy(false); }
  };

  return (
    <Card className="p-5 border border-slate-200/70 shadow-xs">
      <h3 className="text-sm font-black text-slate-900">{title}</h3>
      <p className="text-xs font-semibold text-slate-500 mb-3">{hint}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {values.map(v => (
          <span key={v} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
            {v}
            <button type="button" aria-label={`Remove ${v}`} disabled={busy} onClick={() => remove(v)} className="p-0.5 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer disabled:opacity-50"><X className="w-3.5 h-3.5" /></button>
          </span>
        ))}
      </div>
      <form onSubmit={add} className="flex gap-2">
        <input className={input} value={draft} maxLength={80} onChange={e => setDraft(e.target.value)} placeholder={`Add to ${title.toLowerCase()}`} aria-label={`Add to ${title}`} />
        <Button type="submit" size="sm" disabled={busy || !draft.trim()}><Plus className="w-4 h-4 mr-1" />Add</Button>
      </form>
    </Card>
  );
}

export const DigitalSettings: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = DIGITAL_ADMIN_ROLES.includes(profile?.role || '');
  const [tab, setTab] = useState<Tab>('agency');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<CommerceSettings>(defaultCommerceSettings);
  const [draft, setDraft] = useState<CommerceSettings>(defaultCommerceSettings);

  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const savedRef = useRef(saved);
  const draftRef = useRef(draft);
  savedRef.current = saved; draftRef.current = draft;
  // Loads the saved settings; edits in progress are kept unless nothing was changed yet.
  const load = useCallback(async () => {
    try {
      const s = await getCommerceSettings();
      const untouched = JSON.stringify(draftRef.current) === JSON.stringify(savedRef.current);
      setSaved(s); if (untouched) setDraft(s); setError('');
    } catch (e: any) { setError(e.message || 'Could not load settings'); } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);
  useRealtimeTable('digital_commerce_settings', load);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center"><Lock className="w-8 h-8 text-amber-500" /></div>
        <div className="space-y-2">
          <h2 className="text-lg font-black text-slate-900">Settings Access Restricted</h2>
          <p className="text-sm font-semibold text-slate-500 max-w-sm">Settings are only accessible to Administrators.</p>
        </div>
      </div>
    );
  }

  const set = (patch: Partial<CommerceSettings>) => setDraft(d => ({ ...d, ...patch }));
  const save = async () => {
    setSaving(true); setError('');
    try {
      const clean: CommerceSettings = {
        ...draft,
        agency_name: draft.agency_name.trim(), address: draft.address.trim(), tax_number: draft.tax_number.trim(),
        payment_instructions: (draft.payment_instructions || '').trim(), default_currency: draft.default_currency.trim().toUpperCase(),
        taxes: draft.taxes.map(t => ({ ...t, label: t.label.trim(), country: t.country.trim().toUpperCase() || '*' })),
        services: draft.services.map(s => ({ ...s, name: s.name.trim() })).filter(s => s.name),
        terms: draft.terms.map(t => ({ ...t, name: t.name.trim() })),
      };
      currencyDigits(clean.default_currency);
      if (clean.terms.some(t => !t.name)) throw new Error('Name every payment term template');
      if (new Set(clean.taxes.map(t => `${t.label.toLowerCase()}|${t.country}`)).size !== clean.taxes.length) throw new Error('Two tax rules share the same name and country');
      await saveCommerceSettings(clean);
      setSaved(clean); setDraft(clean); flash('Settings saved. New invoices, proposals and receipts use them.');
    } catch (e: any) { setError(e.message || 'Could not save settings'); } finally { setSaving(false); }
  };

  const tabs: { id: Tab; text: string; icon: React.ReactNode }[] = [
    { id: 'agency', text: 'Agency & invoices', icon: <Building2 className="w-4 h-4" /> },
    { id: 'taxes', text: 'Taxes', icon: <Percent className="w-4 h-4" /> },
    { id: 'terms', text: 'Services & payment terms', icon: <Layers className="w-4 h-4" /> },
    { id: 'lists', text: 'Lists', icon: <ListChecks className="w-4 h-4" /> },
    { id: 'security', text: 'Security', icon: <ShieldCheck className="w-4 h-4" /> },
  ];
  const billingTab = tab === 'agency' || tab === 'taxes' || tab === 'terms';

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2"><Settings className="w-5 h-5 text-[#58051E]" /> Settings</h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">Agency details, taxes, payment terms and lists used across Ferex Digital.</p>
      </div>

      <div role="tablist" className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 h-9 px-4 rounded-full text-xs font-extrabold border cursor-pointer transition-colors ${tab === t.id ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-white text-slate-600 border-slate-200 hover:border-[#58051E]/40'}`}>
            {t.icon}{t.text}
          </button>
        ))}
      </div>

      {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">{error}</div>}
      {loading && billingTab ? <BlockCap /> : null}

      {!loading && tab === 'agency' && (
        <Card className="p-6 border border-slate-200/70 shadow-xs max-w-3xl space-y-4">
          <p className="text-xs font-semibold text-slate-500 flex gap-2"><Info className="w-4 h-4 shrink-0 text-slate-400" />These details are printed on every proposal, invoice, receipt and credit note.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className={label} htmlFor="ds-name">Agency name</label><input id="ds-name" className={input} value={draft.agency_name} onChange={e => set({ agency_name: e.target.value })} /></div>
            <div><label className={label} htmlFor="ds-tax">Tax registration number</label><input id="ds-tax" className={input} value={draft.tax_number} onChange={e => set({ tax_number: e.target.value })} placeholder="GSTIN, VAT ID or similar" /></div>
          </div>
          <div><label className={label} htmlFor="ds-addr">Registered address</label><textarea id="ds-addr" rows={3} className={area} value={draft.address} onChange={e => set({ address: e.target.value })} /></div>
          <div><label className={label} htmlFor="ds-pay">Payment instructions</label><textarea id="ds-pay" rows={3} className={area} value={draft.payment_instructions || ''} onChange={e => set({ payment_instructions: e.target.value })} placeholder="Bank name, account number, IFSC or SWIFT, UPI ID" /></div>
          <div className="max-w-[12rem]"><label className={label} htmlFor="ds-cur">Default currency</label><input id="ds-cur" className={input} maxLength={3} value={draft.default_currency} onChange={e => set({ default_currency: e.target.value.toUpperCase() })} placeholder="INR" /></div>
          {(!draft.address.trim() || !draft.tax_number.trim() || !(draft.payment_instructions || '').trim()) && (
            <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">Add your address, tax number and payment instructions so invoices are complete.</p>
          )}
        </Card>
      )}

      {!loading && tab === 'taxes' && (
        <Card className="p-6 border border-slate-200/70 shadow-xs max-w-3xl space-y-3">
          <p className="text-xs font-semibold text-slate-500">A rule is picked automatically by the client country. Use * for every other country.</p>
          {draft.taxes.map((t, i) => (
            <div key={t.id} className="grid grid-cols-[1fr_5.5rem_5.5rem_auto] gap-2 items-end">
              <div><label className={label}>Name</label><input aria-label="Tax name" className={input} value={t.label} onChange={e => set({ taxes: draft.taxes.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} /></div>
              <div><label className={label}>Rate %</label><input aria-label="Tax rate" type="number" min={0} max={100} step="0.01" className={input} value={t.rate} onChange={e => set({ taxes: draft.taxes.map((x, j) => j === i ? { ...x, rate: Number(e.target.value) } : x) })} /></div>
              <div><label className={label}>Country</label><input aria-label="Tax country" className={input} maxLength={2} value={t.country} onChange={e => set({ taxes: draft.taxes.map((x, j) => j === i ? { ...x, country: e.target.value.toUpperCase() } : x) })} placeholder="IN or *" /></div>
              <button type="button" aria-label="Remove tax rule" disabled={draft.taxes.length <= 1} onClick={() => set({ taxes: draft.taxes.filter((_, j) => j !== i) })} className="h-10 w-10 grid place-items-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => set({ taxes: [...draft.taxes, { id: uid('tax'), label: 'Tax', rate: 0, country: '*' }] })}><Plus className="w-4 h-4 mr-1" />Add tax rule</Button>
            {!draft.taxes.some(t => t.country === 'IN' && t.rate === 18) && <Button size="sm" variant="outline" onClick={() => set({ taxes: [...draft.taxes, { id: uid('gst'), label: 'GST', rate: 18, country: 'IN' }] })}>Add GST 18% (India)</Button>}
          </div>
        </Card>
      )}

      {!loading && tab === 'terms' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900">Services</h3>
            <p className="text-xs font-semibold text-slate-500">Suggested when you build a project's billing.</p>
            {draft.services.map((s, i) => (
              <div key={s.id} className="flex gap-2">
                <input aria-label="Service name" className={input} value={s.name} onChange={e => set({ services: draft.services.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} />
                <button type="button" aria-label="Remove service" onClick={() => set({ services: draft.services.filter((_, j) => j !== i) })} className="h-10 w-10 shrink-0 grid place-items-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => set({ services: [...draft.services, { id: uid('svc'), name: '' }] })}><Plus className="w-4 h-4 mr-1" />Add service</Button>
          </Card>

          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900">Payment term templates</h3>
            <p className="text-xs font-semibold text-slate-500">Ready-made milestone splits. Percentages must total 100. Days are counted from the project start.</p>
            {draft.terms.map((t, ti) => {
              const total = t.parts.reduce((s, p) => s + (Number(p.percentage) || 0), 0);
              const upd = (parts: typeof t.parts) => set({ terms: draft.terms.map((x, j) => j === ti ? { ...x, parts } : x) });
              return (
                <div key={t.id} className="rounded-2xl border border-slate-200 p-4 space-y-2">
                  <div className="flex gap-2">
                    <input aria-label="Template name" className={input} value={t.name} onChange={e => set({ terms: draft.terms.map((x, j) => j === ti ? { ...x, name: e.target.value } : x) })} />
                    <button type="button" aria-label="Remove template" disabled={draft.terms.length <= 1} onClick={() => set({ terms: draft.terms.filter((_, j) => j !== ti) })} className="h-10 w-10 shrink-0 grid place-items-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  {t.parts.map((p, pi) => (
                    <div key={pi} className="grid grid-cols-[1fr_4.5rem_4.5rem_auto] gap-2">
                      <input aria-label="Milestone name" className={input} value={p.label} onChange={e => upd(t.parts.map((x, j) => j === pi ? { ...x, label: e.target.value } : x))} placeholder="Milestone" />
                      <input aria-label="Percentage" type="number" min={1} max={100} className={input} value={p.percentage} onChange={e => upd(t.parts.map((x, j) => j === pi ? { ...x, percentage: Number(e.target.value) } : x))} />
                      <input aria-label="Due after days" type="number" min={0} className={input} value={p.days} onChange={e => upd(t.parts.map((x, j) => j === pi ? { ...x, days: Number(e.target.value) } : x))} />
                      <button type="button" aria-label="Remove milestone" disabled={t.parts.length <= 1} onClick={() => upd(t.parts.filter((_, j) => j !== pi))} className="h-10 w-9 grid place-items-center rounded-xl text-slate-400 hover:text-rose-600 disabled:opacity-40 cursor-pointer"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <Button size="xs" variant="ghost" onClick={() => upd([...t.parts, { label: '', percentage: 0, days: 0, service_ids: [] }])}><Plus className="w-3.5 h-3.5 mr-1" />Add milestone</Button>
                    <span className={`text-xs font-extrabold ${Math.abs(total - 100) < 0.000001 ? 'text-emerald-600' : 'text-rose-600'}`}>Total {total}%</span>
                  </div>
                </div>
              );
            })}
            <Button size="sm" variant="outline" onClick={() => set({ terms: [...draft.terms, { id: uid('term'), name: 'New template', parts: [{ label: 'Advance', percentage: 50, days: 0, service_ids: [] }, { label: 'Delivery', percentage: 50, days: 30, service_ids: [] }] }] })}><Plus className="w-4 h-4 mr-1" />Add template</Button>
          </Card>
        </div>
      )}

      {tab === 'lists' && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">{LISTS.map(l => <ListEditor key={l.type} {...l} onError={setError} onDone={m => { setError(''); flash(m); }} />)}</div>
          <p className="text-xs font-semibold text-slate-500 flex gap-2"><Info className="w-4 h-4 shrink-0 text-slate-400" />Project stages (Briefing → Closed) and task statuses are fixed, because reports, approvals and billing depend on them.</p>
        </div>
      )}

      {tab === 'security' && (
        <Card className="p-6 border border-slate-200/70 shadow-xs max-w-2xl">
          <ChangePasswordForm title="Digital Admin Password" subtitle="Update your administrator credentials for FEREX Digital" variant="plain" />
        </Card>
      )}

      {billingTab && !loading && (
        <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur px-4 py-3 shadow-lg max-w-3xl">
          <span className="text-xs font-bold text-slate-500">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" disabled={!dirty || saving} onClick={() => { setDraft(saved); setError(''); }}>Discard</Button>
            <Button size="sm" disabled={!dirty || saving} isLoading={saving} onClick={save}><Save className="w-4 h-4 mr-1" />Save settings</Button>
          </div>
        </div>
      )}
    </div>
  );
};
