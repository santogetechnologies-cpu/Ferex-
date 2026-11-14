import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavLink, useSearchParams } from 'react-router-dom';
import {
  Plus, RefreshCw, X, CheckCircle2, AlertTriangle, Clock, Receipt, FileText, Mail, PlusCircle, Pencil, Wallet, Printer, Undo2, Lock, ChevronDown, ChevronUp
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  commerceList, getCommerceSettings, saveContract, issueDocument, collectPayment, dispatchDigitalMail, refundPayment, amendContract, updateTerm
} from '../../lib/api/digitalCommerce';
import {
  defaultCommerceSettings, money, escapeHtml, trackContract, validateCommerce, formatTotals,
  type CommerceBody, type CommerceContract, type CommerceLine, type CommercePart, type TermStatus
} from '../../lib/digitalCommerce';
import { getDigitalProjects, getDigitalClients } from '../../lib/api/digital';
import { useDigitalPermissions } from '../../hooks/usePermissions';
import { supabase } from '../../lib/supabase';

type View = 'billing' | 'invoices' | 'payments' | 'emails';

const input = 'w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E] disabled:bg-slate-50 disabled:text-slate-400';
const label = 'block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 mb-1';
const today = () => new Date().toLocaleDateString('en-CA');
const uid = () => crypto.randomUUID();
const blank = (): CommerceBody => ({ project_id: '', project_title: '', client_name: '', client_email: '', country: '', currency: 'INR', lines: [], parts: [], notes: '' });

const STATUS_STYLE: Record<TermStatus, string> = {
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Partially Paid': 'bg-blue-50 text-blue-700 border-blue-200',
  Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  'Due Soon': 'bg-amber-50 text-amber-700 border-amber-200',
  Upcoming: 'bg-slate-50 text-slate-600 border-slate-200',
};

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
      <div className="fixed inset-0 bg-slate-900/50" onClick={onClose} />
      <div className={`relative w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 my-8 space-y-4`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: TermStatus }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${STATUS_STYLE[status]}`}>{status}</span>;
}

function Bar({ percent, status }: { percent: number; status?: TermStatus }) {
  const colour = status === 'Overdue' ? 'bg-rose-500' : status === 'Paid' ? 'bg-emerald-500' : 'bg-[#58051E]';
  return <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${colour}`} style={{ width: `${Math.min(100, percent)}%` }} /></div>;
}

/** Live preview of what a set of services and terms comes to, so the admin sees real amounts while typing. */
function preview(lines: CommerceLine[], parts: CommercePart[], currency: string) {
  let digits = 2;
  try { digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2; } catch { /* partial code while typing */ }
  const r = (v: number) => Math.round((v + Number.EPSILON) * 10 ** digits) / 10 ** digits;
  let subtotal = 0, tax = 0;
  for (const l of lines) { const base = r(Number(l.amount) || 0); subtotal += base; tax += r(base * (Number(l.tax_rate) || 0) / 100); }
  const total = r(subtotal + tax);
  const pct = parts.reduce((s, p) => s + (Number(p.percentage) || 0), 0);
  let allocated = 0;
  const amounts = parts.map((p, i) => { const a = i === parts.length - 1 ? r(total - allocated) : r(total * (Number(p.percentage) || 0) / 100); allocated += a; return a; });
  return { subtotal: r(subtotal), tax: r(tax), total, pct, amounts };
}

export function DigitalCommerce({ view = 'billing' }: { view?: View }) {
  const { isAdmin } = useDigitalPermissions();
  const [params] = useSearchParams();
  const focusProject = params.get('project') || '';

  const [contracts, setContracts] = useState<CommerceContract[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [settings, setSettings] = useState(defaultCommerceSettings);
  const [documents, setDocuments] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [mail, setMail] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState<'All' | 'Overdue' | 'Partially Paid' | 'Paid' | 'Not started'>('All');
  const [search, setSearch] = useState('');
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});

  // Dialogs
  const [config, setConfig] = useState<{ mode: 'new' | 'edit'; contract?: CommerceContract; body: CommerceBody } | null>(null);
  const [scope, setScope] = useState<{ contract: CommerceContract; lines: CommerceLine[]; parts: CommercePart[]; reason: string } | null>(null);
  const [termEdit, setTermEdit] = useState<{ contract: CommerceContract; part: CommercePart; label: string; due: string; reason: string } | null>(null);
  const [pay, setPay] = useState<{ contract: string; part: string; amount: string; method: string; reference: string; date: string; key: string } | null>(null);
  const [refund, setRefund] = useState<{ collection: string; amount: string; reason: string; key: string } | null>(null);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 5000); };

  const load = useCallback(async () => {
    try {
      const [c, p, cl, s, d, t, r, m] = await Promise.all([
        commerceList('digital_contracts'), getDigitalProjects(), getDigitalClients(), getCommerceSettings(),
        commerceList('digital_financial_documents'), commerceList('digital_collections'), commerceList('digital_refunds'), commerceList('digital_mail_outbox'),
      ]);
      setContracts(c); setProjects(p); setClients(cl); setSettings(s); setDocuments(d); setCollections(t); setRefunds(r); setMail(m); setLoaded(true);
    } catch (e: any) {
      say(`Could not load billing: ${e.message}`);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
    const channel = supabase.channel('digital_billing_live');
    for (const table of ['digital_contracts', 'digital_collections', 'digital_financial_documents', 'digital_refunds', 'digital_mail_outbox']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => void load());
    }
    channel.subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, isAdmin]);

  const run = async (fn: () => Promise<unknown>, success?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await load();
      window.dispatchEvent(new Event('ferex_digital_commerce_change'));
      if (success) say(success);
    } catch (e: any) {
      say(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const projectById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
  const tracked = useMemo(
    () => contracts.filter(c => projectById.has(c.project_id)).map(c => ({ c, t: trackContract(c.body) })),
    [contracts, projectById]
  );

  const totals = useMemo(() => {
    const sum = (pick: (x: typeof tracked[number]) => number) => {
      const out: Record<string, number> = {};
      for (const x of tracked) out[x.c.body.currency] = (out[x.c.body.currency] || 0) + pick(x);
      return out;
    };
    return { total: sum(x => x.t.total), received: sum(x => x.t.received), outstanding: sum(x => x.t.outstanding), overdue: sum(x => x.t.overdue_amount), overdueCount: tracked.reduce((s, x) => s + x.t.overdue_count, 0) };
  }, [tracked]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tracked
      .filter(({ c, t }) => {
        if (focusProject && c.project_id !== focusProject) return false;
        const state = t.total > 0 && t.received >= t.total ? 'Paid' : t.overdue_count > 0 ? 'Overdue' : t.received > 0 ? 'Partially Paid' : 'Not started';
        if (filter !== 'All' && state !== filter) return false;
        return !q || `${c.body.project_title} ${c.body.client_name}`.toLowerCase().includes(q);
      })
      .sort((a, b) => b.t.overdue_amount - a.t.overdue_amount || a.c.body.project_title.localeCompare(b.c.body.project_title));
  }, [tracked, filter, search, focusProject]);

  const withoutContract = useMemo(() => projects.filter(p => !contracts.some(c => c.project_id === p.id)), [projects, contracts]);
  const locked = (c: CommerceContract) => documents.some(d => d.contract_id === c.id);

  const deliver = async () => {
    try {
      const r = await dispatchDigitalMail();
      say(`Email: ${r.sent || 0} sent, ${r.failed || 0} failed. Check Email Delivery Logs.`);
    } catch (e: any) { say(e.message); }
  };

  const print = (doc: any) => {
    const w = window.open('', '_blank');
    if (!w) { say('Allow pop-ups to print the document'); return; }
    const b = doc.body, fmt = (n: number) => escapeHtml(money(Number(n || 0), b.currency));
    w.document.write(`<!doctype html><html><head><title>${escapeHtml(doc.number)}</title><style>body{font:14px system-ui;padding:40px;max-width:900px;margin:auto}table{width:100%;border-collapse:collapse}td,th{padding:12px;border-bottom:1px solid #ddd;text-align:left}h1{color:#58051e}@media print{button{display:none}}</style></head><body><h1>${escapeHtml(b.agency_name || settings.agency_name)}</h1><p>${escapeHtml(b.agency_address || '')}<br>${escapeHtml(b.agency_tax_number || '')}</p><h2>${escapeHtml(doc.kind)} ${escapeHtml(doc.number)}</h2><p>${escapeHtml(b.client_name)} · ${escapeHtml(b.client_email)} · ${escapeHtml(b.country)}<br>${escapeHtml(b.project_title)}</p><table><tr><th>Service</th><th>Net</th><th>Tax</th></tr>${(b.document_lines || b.lines).map((l: any) => `<tr><td>${escapeHtml(l.title)}</td><td>${fmt(l.amount)}</td><td>${escapeHtml(l.tax_label)} ${l.tax_rate}% · ${fmt(l.tax_amount)}</td></tr>`).join('')}</table><p>Contract reference total (tax included): <strong>${fmt(b.total)}</strong></p><h3>${escapeHtml(b.part?.label || 'Payment schedule')}</h3><p>${escapeHtml(b.part?.due_date || '')}</p><p>${doc.kind === 'Receipt' ? 'Amount received' : doc.kind === 'Credit Note' ? 'Credit' : 'Amount due'}: <strong>${fmt(b.amount)}</strong></p>${b.balance !== undefined ? `<p>Term balance: ${fmt(b.balance)}</p>` : ''}<p>${escapeHtml(b.notes)}</p><p>${escapeHtml(b.payment_instructions)}</p><button onclick="window.print()">Print / Save PDF</button></body></html>`);
    w.document.close();
  };

  if (!isAdmin) return <p role="alert" className="p-6 text-sm font-semibold text-slate-600">Digital billing is restricted to Digital administrators.</p>;

  const titles: Record<View, string> = { billing: 'Billing & Milestones', invoices: 'Invoices & Documents', payments: 'Payments Ledger', emails: 'Email Delivery Logs' };

  // ── Configuration (new contract) ──
  const openNew = () => setConfig({ mode: 'new', body: { ...blank(), currency: settings.default_currency } });
  const setBody = (body: CommerceBody) => setConfig(c => (c ? { ...c, body } : c));

  const submitConfig = () => {
    if (!config) return;
    const { mode, contract, body } = config;
    void run(async () => {
      await saveContract({ ...body, ...{ agency_name: settings.agency_name, agency_address: settings.address, agency_tax_number: settings.tax_number, payment_instructions: settings.payment_instructions || '' } } as CommerceBody, mode === 'edit' ? contract : undefined);
      setConfig(null);
    }, mode === 'new' ? 'Billing configured. Record payments against any term as they arrive.' : 'Billing updated.');
  };

  const applyTemplate = (id: string) => {
    const t = settings.terms.find(x => x.id === id);
    if (!t || !config) return;
    const lines = config.body.lines;
    setBody({
      ...config.body,
      parts: t.parts.map(p => ({ id: uid(), label: p.label, percentage: p.percentage, due_date: new Date(Date.now() + p.days * 86400000).toLocaleDateString('en-CA'), service_ids: lines.map(l => l.id) })),
    });
  };

  const addLine = (body: CommerceBody, setter: (b: CommerceBody) => void) => {
    const tax = settings.taxes.find(t => t.country === body.country) || settings.taxes.find(t => t.country === '*');
    setter({ ...body, lines: [...body.lines, { id: uid(), title: '', amount: 0, tax_rate: tax?.rate || 0, tax_label: tax?.label || 'No tax' }] });
  };

  // ── Rendering helpers ──
  // Plain render functions (not components), so inputs keep focus while typing.
  const renderLines = ({ body, setter, disabled }: { body: CommerceBody; setter: (b: CommerceBody) => void; disabled?: boolean }) => (
    <div className="space-y-2">
      {body.lines.map((l, i) => (
        <div key={l.id} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-12 sm:col-span-5"><label className={label}>Service</label>
            <input className={input} list="commerce-services" required value={l.title} disabled={disabled} onChange={e => setter({ ...body, lines: body.lines.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} /></div>
          <div className="col-span-6 sm:col-span-3"><label className={label}>Net amount ({body.currency || '—'})</label>
            <input className={input} type="number" required min="0" step="any" value={l.amount || ''} disabled={disabled} onChange={e => setter({ ...body, lines: body.lines.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)) })} /></div>
          <div className="col-span-6 sm:col-span-3"><label className={label}>Tax</label>
            <select className={input} disabled={disabled} value={settings.taxes.find(t => t.label === l.tax_label && t.rate === l.tax_rate)?.id || ''}
              onChange={e => { const t = settings.taxes.find(x => x.id === e.target.value); if (t) setter({ ...body, lines: body.lines.map((x, j) => (j === i ? { ...x, tax_rate: t.rate, tax_label: t.label } : x)) }); }}>
              <option value="">{l.tax_label} {l.tax_rate}%</option>
              {settings.taxes.map(t => <option key={t.id} value={t.id}>{t.label} ({t.rate}%)</option>)}
            </select></div>
          <div className="col-span-12 sm:col-span-1 text-right">
            {!disabled && <button type="button" className="text-rose-600 text-[11px] font-bold cursor-pointer" onClick={() => setter({ ...body, lines: body.lines.filter(x => x.id !== l.id), parts: body.parts.map(p => ({ ...p, service_ids: p.service_ids.filter(id => id !== l.id) })) })}>Remove</button>}
          </div>
        </div>
      ))}
      <datalist id="commerce-services">{settings.services.map(s => <option key={s.id} value={s.name} />)}</datalist>
      {!disabled && <Button type="button" variant="outline" size="sm" className="text-xs font-bold" onClick={() => addLine(body, setter)}><Plus className="w-3.5 h-3.5 mr-1" /> Add service</Button>}
    </div>
  );

  const renderTerms = ({ body, setter, amounts }: { body: CommerceBody; setter: (b: CommerceBody) => void; amounts: number[] }) => (
    <div className="space-y-3">
      {body.parts.map((p, i) => (
        <div key={p.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50/60 space-y-2">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 sm:col-span-4"><label className={label}>Milestone / term name</label>
              <input className={input} required value={p.label} onChange={e => setter({ ...body, parts: body.parts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} /></div>
            <div className="col-span-4 sm:col-span-2"><label className={label}>Share %</label>
              <input className={input} type="number" required min="0.001" max="100" step="any" value={p.percentage || ''} onChange={e => setter({ ...body, parts: body.parts.map((x, j) => (j === i ? { ...x, percentage: Number(e.target.value) } : x)) })} /></div>
            <div className="col-span-8 sm:col-span-3"><label className={label}>Due date</label>
              <input className={input} type="date" required value={p.due_date} onChange={e => setter({ ...body, parts: body.parts.map((x, j) => (j === i ? { ...x, due_date: e.target.value } : x)) })} /></div>
            <div className="col-span-8 sm:col-span-2"><label className={label}>Amount</label>
              <div className="h-9 flex items-center text-xs font-black text-[#58051E]">{money(amounts[i] || 0, body.currency.length === 3 ? body.currency : 'INR')}</div></div>
            <div className="col-span-4 sm:col-span-1 text-right"><button type="button" className="text-rose-600 text-[11px] font-bold cursor-pointer" onClick={() => setter({ ...body, parts: body.parts.filter(x => x.id !== p.id) })}>Remove</button></div>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="text-[10px] font-extrabold uppercase text-slate-500">Covers:</span>
            {body.lines.map(l => (
              <label key={l.id} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                <input type="checkbox" checked={p.service_ids.includes(l.id)}
                  onChange={e => setter({ ...body, parts: body.parts.map((x, j) => (j === i ? { ...x, service_ids: e.target.checked ? [...x.service_ids, l.id] : x.service_ids.filter(id => id !== l.id) } : x)) })} />
                {l.title || 'Unnamed service'}
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="text-xs font-bold" onClick={() => setter({ ...body, parts: [...body.parts, { id: uid(), label: '', percentage: 0, due_date: today(), service_ids: body.lines.map(l => l.id) }] })}><Plus className="w-3.5 h-3.5 mr-1" /> Add milestone / payment term</Button>
        {body.parts.length > 0 && (
          <Button type="button" variant="outline" size="sm" className="text-xs font-bold" onClick={() => {
            const others = body.parts.slice(0, -1).reduce((s, p) => s + (Number(p.percentage) || 0), 0);
            setter({ ...body, parts: body.parts.map((x, j) => (j === body.parts.length - 1 ? { ...x, percentage: Math.round((100 - others) * 1000) / 1000 } : x)) });
          }}>Make the last term the balance</Button>
        )}
      </div>
    </div>
  );

  const prev = config ? preview(config.body.lines, config.body.parts, config.body.currency) : null;
  const scopePrev = scope ? preview(scope.lines, scope.parts, scope.contract.body.currency) : null;

  return (
    <div className="space-y-5 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">{titles[view]}</h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">Custom milestones, partial payments and extra scope, tracked per project.</p>
        </div>
        <Button size="sm" variant="outline" className="text-xs font-bold" disabled={busy} onClick={() => run(load)}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
      </div>

      <nav className="flex flex-wrap gap-2">
        {([['/digital/billing', 'Billing & Milestones'], ['/digital/invoices', 'Invoices'], ['/digital/payments', 'Payments'], ['/digital/emails', 'Email logs'], ['/digital/settings', 'Tax & term settings']] as const).map(([to, text]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `px-3 py-1.5 rounded-xl text-xs font-bold border ${isActive ? 'bg-[#58051E] text-white border-[#58051E]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{text}</NavLink>
        ))}
      </nav>

      {!loaded && <p className="text-xs font-semibold text-slate-500">Loading billing…</p>}

      {loaded && (view === 'billing' || view === 'payments') && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3.5 border border-slate-200/80"><div className={label}>Contracted</div><div className="text-sm font-black text-slate-900">{formatTotals(totals.total)}</div></Card>
          <Card className="p-3.5 border border-emerald-200/80 bg-emerald-50/40"><div className={label}>Collected</div><div className="text-sm font-black text-emerald-800">{formatTotals(totals.received)}</div></Card>
          <Card className="p-3.5 border border-blue-200/80 bg-blue-50/40"><div className={label}>Outstanding</div><div className="text-sm font-black text-blue-900">{formatTotals(totals.outstanding)}</div></Card>
          <Card className={`p-3.5 border ${totals.overdueCount ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200/80'}`}><div className={label}>Overdue ({totals.overdueCount} term{totals.overdueCount === 1 ? '' : 's'})</div><div className={`text-sm font-black ${totals.overdueCount ? 'text-rose-700' : 'text-slate-900'}`}>{formatTotals(totals.overdue)}</div></Card>
        </div>
      )}

      {/* ───────── Billing & Milestones ───────── */}
      {loaded && view === 'billing' && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" disabled={busy || withoutContract.length === 0} onClick={openNew} title={withoutContract.length === 0 ? 'Every project already has billing configured' : undefined}>
              <Plus className="w-4 h-4 mr-1" /> Configure project billing {withoutContract.length > 0 && `(${withoutContract.length} waiting)`}
            </Button>
            <input className={`${input} max-w-xs`} placeholder="Search project or client…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className={`${input} max-w-[11rem]`} value={filter} onChange={e => setFilter(e.target.value as any)}>
              {['All', 'Overdue', 'Partially Paid', 'Paid', 'Not started'].map(f => <option key={f}>{f}</option>)}
            </select>
            {focusProject && <NavLink to="/digital/billing" className="text-xs font-bold underline">Show all projects</NavLink>}
          </div>

          {visible.length === 0 && <Card className="p-8 text-center text-xs font-semibold text-slate-500 border-dashed">{contracts.length === 0 ? 'No billing configured yet. Choose "Configure project billing" to set the services, milestones and payment terms for a project.' : 'No contracts match this view.'}</Card>}

          {visible.map(({ c, t }) => {
            const open = openCards[c.id] ?? (t.overdue_count > 0 || visible.length <= 3);
            const lock = locked(c);
            return (
              <Card key={c.id} className="p-5 border border-slate-200/80 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-slate-900">{c.body.project_title}</h2>
                    <p className="text-[11px] font-semibold text-slate-500">{c.body.client_name} · {c.body.country} · {c.body.client_email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900">{money(t.total, c.body.currency)}</div>
                    <div className="text-[10px] font-bold text-slate-500">incl. {money(Number(c.body.tax || 0), c.body.currency)} tax · revision {c.revision}</div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600">
                    <span>Collected {money(t.received, c.body.currency)} ({t.percent_paid}%)</span>
                    <span>Outstanding {money(t.outstanding, c.body.currency)}{t.overdue_count > 0 && <span className="text-rose-600"> · {money(t.overdue_amount, c.body.currency)} overdue</span>}</span>
                  </div>
                  <Bar percent={t.percent_paid} status={t.overdue_count ? 'Overdue' : t.percent_paid >= 100 ? 'Paid' : undefined} />
                </div>

                <button type="button" className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer" onClick={() => setOpenCards(o => ({ ...o, [c.id]: !open }))}>
                  {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} Milestones & payment terms ({t.terms.length})
                </button>

                {open && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] font-extrabold uppercase text-slate-400 border-b border-slate-100">
                        <tr><th className="py-2 pr-3">Milestone / term</th><th className="py-2 pr-3">Due</th><th className="py-2 pr-3 text-right">Amount</th><th className="py-2 pr-3 text-right">Received</th><th className="py-2 pr-3 text-right">Remaining</th><th className="py-2 pr-3">Status</th><th className="py-2 text-right">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {t.terms.map(term => {
                          const part = c.body.parts.find(p => p.id === term.id)!;
                          return (
                            <tr key={term.id}>
                              <td className="py-2.5 pr-3"><div className="font-bold text-slate-900">{term.label}</div><div className="w-28 mt-1"><Bar percent={term.percent_paid} status={term.status} /></div></td>
                              <td className="py-2.5 pr-3 whitespace-nowrap">{term.due_date}{term.status === 'Overdue' && <div className="text-[10px] text-rose-600 font-bold">{Math.abs(term.days_to_due)} day(s) late</div>}{term.status === 'Due Soon' && <div className="text-[10px] text-amber-600 font-bold">in {term.days_to_due} day(s)</div>}</td>
                              <td className="py-2.5 pr-3 text-right whitespace-nowrap">{money(term.amount, c.body.currency)}</td>
                              <td className="py-2.5 pr-3 text-right whitespace-nowrap text-emerald-700">{money(term.received, c.body.currency)}</td>
                              <td className="py-2.5 pr-3 text-right whitespace-nowrap font-black">{money(term.remaining, c.body.currency)}</td>
                              <td className="py-2.5 pr-3"><StatusChip status={term.status} /></td>
                              <td className="py-2.5 text-right whitespace-nowrap space-x-1">
                                {term.remaining > 0 && <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-[11px] font-bold h-7" disabled={busy} onClick={() => setPay({ contract: c.id, part: term.id, amount: String(term.remaining), method: 'Bank Transfer', reference: '', date: today(), key: uid() })}><Wallet className="w-3 h-3 mr-1" /> Record payment</Button>}
                                <Button size="sm" variant="outline" className="text-[11px] font-bold h-7" disabled={busy} onClick={() => setTermEdit({ contract: c, part, label: part.label, due: part.due_date, reason: '' })}><Pencil className="w-3 h-3 mr-1" /> Edit</Button>
                                <Button size="sm" variant="outline" className="text-[11px] font-bold h-7" disabled={busy} onClick={() => run(async () => { const d = await issueDocument(c.id, 'Invoice', term.id); print(d); })}><FileText className="w-3 h-3 mr-1" /> Invoice</Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <Button size="sm" variant="outline" className="text-xs font-bold" disabled={busy} onClick={() => setScope({ contract: c, lines: [], parts: [], reason: '' })}><PlusCircle className="w-3.5 h-3.5 mr-1" /> Add extra scope</Button>
                  {!lock && <Button size="sm" variant="outline" className="text-xs font-bold" disabled={busy} onClick={() => setConfig({ mode: 'edit', contract: c, body: JSON.parse(JSON.stringify(c.body)) })}><Pencil className="w-3.5 h-3.5 mr-1" /> Edit configuration</Button>}
                  {lock && <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500"><Lock className="w-3 h-3" /> Invoiced: change it by adding extra scope or editing a term.</span>}
                  <Button size="sm" variant="outline" className="text-xs font-bold" disabled={busy} onClick={() => run(async () => { const d = await issueDocument(c.id, 'Proposal'); print(d); })}><FileText className="w-3.5 h-3.5 mr-1" /> Proposal</Button>
                </div>
              </Card>
            );
          })}
        </>
      )}

      {/* ───────── Payments ───────── */}
      {loaded && view === 'payments' && (
        <>
          <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" disabled={busy || contracts.length === 0} onClick={() => setPay({ contract: '', part: '', amount: '', method: 'Bank Transfer', reference: '', date: today(), key: uid() })}><Plus className="w-4 h-4 mr-1" /> Record payment</Button>
          {collections.length === 0 && <Card className="p-8 text-center text-xs font-semibold text-slate-500 border-dashed">No payments recorded yet.</Card>}
          {collections.length > 0 && (
            <Card className="p-0 overflow-hidden border border-slate-200/80">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Project</th><th className="p-3">Milestone / term</th><th className="p-3 text-right">Amount</th><th className="p-3">Method</th><th className="p-3">Reference</th><th className="p-3 text-right">Refunded</th><th className="p-3" /></tr></thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {collections.map(t => {
                      const c = contracts.find(x => x.id === t.contract_id); const cur = c?.body.currency || 'INR';
                      const refunded = refunds.filter(r => r.collection_id === t.id).reduce((s, r) => s + Number(r.amount), 0);
                      return (
                        <tr key={t.id}>
                          <td className="p-3 whitespace-nowrap">{t.payment_date}</td>
                          <td className="p-3">{c?.body.project_title}<div className="text-[10px] text-slate-400">{c?.body.client_name}</div></td>
                          <td className="p-3">{c?.body.parts.find(p => p.id === t.part_id)?.label || '—'}</td>
                          <td className="p-3 text-right font-black">{money(Number(t.amount), cur)}</td>
                          <td className="p-3">{t.method}</td>
                          <td className="p-3">{t.reference || '—'}</td>
                          <td className="p-3 text-right">{refunded > 0 ? <span className="text-rose-600">{money(refunded, cur)}</span> : '—'}</td>
                          <td className="p-3 text-right">{refunded < Number(t.amount) && <button type="button" className="text-[11px] font-bold text-slate-600 underline cursor-pointer" onClick={() => setRefund({ collection: t.id, amount: '', reason: '', key: uid() })}>Refund</button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ───────── Invoices & documents ───────── */}
      {loaded && view === 'invoices' && (
        <>
          {documents.length === 0 && <Card className="p-8 text-center text-xs font-semibold text-slate-500 border-dashed">No documents yet. Issue an invoice from a milestone, or record a payment to generate its receipt.</Card>}
          {documents.map(d => (
            <Card key={d.id} className="p-4 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black text-slate-900 flex items-center gap-2">{d.kind === 'Receipt' ? <Receipt className="w-4 h-4 text-emerald-600" /> : d.kind === 'Credit Note' ? <Undo2 className="w-4 h-4 text-rose-600" /> : <FileText className="w-4 h-4 text-[#58051E]" />} {d.kind} · {d.number}</div>
                <p className="text-[11px] font-semibold text-slate-500">{d.body.client_name} · {d.body.project_title}{d.body.part?.label ? ` · ${d.body.part.label}` : ''} · {money(Number(d.body.amount || 0), d.body.currency)}</p>
              </div>
              <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => print(d)}><Printer className="w-3.5 h-3.5 mr-1" /> Print / PDF</Button>
            </Card>
          ))}
        </>
      )}

      {/* ───────── Email logs ───────── */}
      {loaded && view === 'emails' && (
        <>
          <p className="text-xs font-semibold text-slate-500">"Sent" means the provider accepted the email. Delivery needs provider confirmation.</p>
          <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" disabled={busy} onClick={() => run(deliver)}><Mail className="w-3.5 h-3.5 mr-1" /> Retry queued / failed delivery</Button>
          {mail.length === 0 && <Card className="p-8 text-center text-xs font-semibold text-slate-500 border-dashed">No emails queued yet.</Card>}
          {mail.map(m => (
            <Card key={m.id} className="p-3 border border-slate-200/80 text-xs font-semibold text-slate-700 flex flex-wrap justify-between gap-2">
              <span>{m.recipient}</span>
              <span className={m.status === 'Failed' ? 'text-rose-600 font-black' : m.status === 'Sent' ? 'text-emerald-700 font-black' : 'text-amber-700 font-black'}>{m.status}{m.error ? ` · ${m.error}` : ''}</span>
            </Card>
          ))}
        </>
      )}

      {/* ───────── Configure billing ───────── */}
      {config && prev && (
        <Modal wide title={config.mode === 'new' ? 'Configure project billing' : 'Edit billing configuration'} onClose={() => setConfig(null)}>
          <form className="space-y-5" onSubmit={e => { e.preventDefault(); submitConfig(); }}>
            <div className="grid md:grid-cols-2 gap-3">
              <div><label className={label}>Project *</label>
                <select className={input} required value={config.body.project_id} disabled={config.mode === 'edit'} onChange={e => {
                  const p = projects.find(x => x.id === e.target.value); const cl = clients.find(x => x.id === p?.client_id);
                  setBody({ ...config.body, project_id: p?.id || '', project_title: p?.title || '', client_name: cl?.company_name || p?.client_name || '', client_email: cl?.email || '', country: p?.country || cl?.country || config.body.country, currency: p?.currency || config.body.currency });
                }}>
                  <option value="">Select project…</option>
                  {(config.mode === 'edit' ? projects : withoutContract).map(p => <option key={p.id} value={p.id}>{p.title} · {p.client_name}</option>)}
                </select></div>
              <div><label className={label}>Client billing email *</label><input className={input} type="email" required value={config.body.client_email} onChange={e => setBody({ ...config.body, client_email: e.target.value })} /></div>
              <div><label className={label}>Country (2-letter code, e.g. IN, US, AE) *</label><input className={input} required minLength={2} maxLength={2} value={config.body.country} onChange={e => setBody({ ...config.body, country: e.target.value.toUpperCase() })} /></div>
              <div><label className={label}>Currency (3-letter code) *</label><input className={input} required minLength={3} maxLength={3} value={config.body.currency} onChange={e => setBody({ ...config.body, currency: e.target.value.toUpperCase() })} /></div>
            </div>

            <div><h4 className="text-xs font-black uppercase text-slate-700 mb-2">Services & tax</h4>{renderLines({ body: config.body, setter: setBody })}</div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h4 className="text-xs font-black uppercase text-slate-700">Milestones & payment terms</h4>
                <select className={`${input} max-w-xs`} defaultValue="" onChange={e => applyTemplate(e.target.value)}>
                  <option value="">Start from a template…</option>
                  {settings.terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mb-2">Each term is a share of the total (tax included). Add as many milestones as you need; payments can be recorded in parts against any of them.</p>
              {renderTerms({ body: config.body, setter: setBody, amounts: prev.amounts })}
            </div>

            <div className={`p-3 rounded-xl border text-xs font-bold flex flex-wrap justify-between gap-2 ${Math.abs(prev.pct - 100) < 0.0001 && prev.total > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <span>Subtotal {money(prev.subtotal, config.body.currency.length === 3 ? config.body.currency : 'INR')} + tax {money(prev.tax, config.body.currency.length === 3 ? config.body.currency : 'INR')} = <strong>{money(prev.total, config.body.currency.length === 3 ? config.body.currency : 'INR')}</strong></span>
              <span>Terms add up to {Math.round(prev.pct * 1000) / 1000}% {Math.abs(prev.pct - 100) >= 0.0001 && '(must be 100%)'}</span>
            </div>

            <div><label className={label}>Proposal notes</label><textarea className={`${input} h-20 py-2`} value={config.body.notes} onChange={e => setBody({ ...config.body, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setConfig(null)}>Cancel</Button>
              <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] font-bold" disabled={busy}>{busy ? 'Saving…' : 'Save configuration'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ───────── Add extra scope ───────── */}
      {scope && scopePrev && (
        <Modal wide title={`Add extra scope — ${scope.contract.body.project_title}`} onClose={() => setScope(null)}>
          <form className="space-y-5" onSubmit={e => {
            e.preventDefault();
            const body: CommerceBody = { ...scope.contract.body, lines: scope.lines, parts: scope.parts, notes: scope.reason };
            void run(async () => {
              validateCommerce(body);
              await amendContract(scope.contract, body);
              setScope(null);
            }, 'Extra scope added. Its payment terms are now on the milestone list.');
          }}>
            <p className="text-xs font-semibold text-slate-600">Current contract {money(Number(scope.contract.body.total || 0), scope.contract.body.currency)}. Existing milestones and payments stay as they are; the new services get their own payment terms (which must add up to 100% of the extra amount).</p>
            <div><h4 className="text-xs font-black uppercase text-slate-700 mb-2">New services</h4>
              {renderLines({ body: { ...scope.contract.body, lines: scope.lines, parts: scope.parts }, setter: b => setScope({ ...scope, lines: b.lines, parts: b.parts }) })}</div>
            <div><h4 className="text-xs font-black uppercase text-slate-700 mb-2">Payment terms for the extra scope</h4>
              {renderTerms({ body: { ...scope.contract.body, lines: scope.lines, parts: scope.parts }, setter: b => setScope({ ...scope, parts: b.parts }), amounts: scopePrev.amounts })}</div>
            <div className={`p-3 rounded-xl border text-xs font-bold flex flex-wrap justify-between gap-2 ${Math.abs(scopePrev.pct - 100) < 0.0001 && scopePrev.total > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <span>Extra {money(scopePrev.total, scope.contract.body.currency)} → new contract total <strong>{money(Number(scope.contract.body.total || 0) + scopePrev.total, scope.contract.body.currency)}</strong></span>
              <span>Terms add up to {Math.round(scopePrev.pct * 1000) / 1000}%</span>
            </div>
            <div><label className={label}>Reason for the change *</label><textarea className={`${input} h-20 py-2`} required minLength={3} value={scope.reason} onChange={e => setScope({ ...scope, reason: e.target.value })} placeholder="e.g. Client requested an SEO package" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setScope(null)}>Cancel</Button>
              <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] font-bold" disabled={busy}>{busy ? 'Saving…' : 'Add scope'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ───────── Edit a term ───────── */}
      {termEdit && (
        <Modal title={`Edit milestone — ${termEdit.part.label}`} onClose={() => setTermEdit(null)}>
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); void run(async () => { await updateTerm(termEdit.contract, termEdit.part.id, termEdit.label, termEdit.due, termEdit.reason); setTermEdit(null); }, 'Milestone updated.'); }}>
            <p className="text-[11px] font-semibold text-slate-500">You can rename a milestone or move its due date. Amounts change only by adding extra scope or refunding a payment.</p>
            <div><label className={label}>Name</label><input className={input} required value={termEdit.label} onChange={e => setTermEdit({ ...termEdit, label: e.target.value })} /></div>
            <div><label className={label}>Due date</label><input className={input} type="date" required value={termEdit.due} onChange={e => setTermEdit({ ...termEdit, due: e.target.value })} /></div>
            <div><label className={label}>Reason *</label><input className={input} required minLength={3} value={termEdit.reason} onChange={e => setTermEdit({ ...termEdit, reason: e.target.value })} placeholder="e.g. Client asked for a later date" /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setTermEdit(null)}>Cancel</Button><Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] font-bold" disabled={busy}>Save</Button></div>
          </form>
        </Modal>
      )}

      {/* ───────── Record payment ───────── */}
      {pay && (() => {
        const c = contracts.find(x => x.id === pay.contract); const p = c?.body.parts.find(x => x.id === pay.part);
        const remaining = p ? Math.max(0, Number(p.amount || 0) - Number(p.received || 0)) : 0; const amt = Number(pay.amount) || 0;
        const k = (patch: Partial<typeof pay>) => setPay({ ...pay, ...patch, key: uid() });
        return (
          <Modal title="Record payment" onClose={() => setPay(null)}>
            <form className="space-y-3" onSubmit={e => {
              e.preventDefault();
              void run(async () => {
                await collectPayment(pay.contract, pay.part, amt, pay.method, pay.reference, pay.date, pay.key);
                setPay(null);
                try { await dispatchDigitalMail(); } catch { /* the receipt is saved; retry from Email Delivery Logs */ }
              }, amt >= remaining ? 'Payment recorded. This milestone is fully paid and the receipt is queued.' : 'Part payment recorded. The remaining balance stays on this milestone.');
            }}>
              <div><label className={label}>Project *</label>
                <select className={input} required value={pay.contract} onChange={e => k({ contract: e.target.value, part: '', amount: '' })}>
                  <option value="">Select project…</option>
                  {contracts.filter(x => projectById.has(x.project_id)).map(x => <option key={x.id} value={x.id}>{x.body.project_title} · {x.body.client_name}</option>)}
                </select></div>
              <div><label className={label}>Milestone / payment term *</label>
                <select className={input} required value={pay.part} onChange={e => { const t = c?.body.parts.find(x => x.id === e.target.value); k({ part: e.target.value, amount: t ? String(Math.max(0, Number(t.amount || 0) - Number(t.received || 0))) : '' }); }}>
                  <option value="">Select milestone…</option>
                  {c?.body.parts.map(x => <option key={x.id} value={x.id} disabled={Number(x.amount || 0) - Number(x.received || 0) <= 0}>{x.label} — {money(Math.max(0, Number(x.amount || 0) - Number(x.received || 0)), c.body.currency)} remaining</option>)}
                </select></div>
              <div><label className={label}>Amount received ({c?.body.currency || 'contract currency'}) *</label>
                <input className={input} type="number" required min="0.001" step="any" max={p ? remaining : undefined} value={pay.amount} onChange={e => k({ amount: e.target.value })} />
                {p && <p className="text-[11px] font-semibold text-slate-500 mt-1">Milestone balance {money(remaining, c!.body.currency)}. Entering less records a part payment; after this payment {money(Math.max(0, remaining - amt), c!.body.currency)} will remain.</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={label}>Method</label><select className={input} value={pay.method} onChange={e => k({ method: e.target.value })}>{['Bank Transfer', 'Card', 'Cash', 'UPI', 'Cheque', 'Other'].map(x => <option key={x}>{x}</option>)}</select></div>
                <div><label className={label}>Date</label><input className={input} type="date" required max={today()} value={pay.date} onChange={e => k({ date: e.target.value })} /></div>
              </div>
              <div><label className={label}>Bank / transaction reference</label><input className={input} value={pay.reference} onChange={e => k({ reference: e.target.value })} /></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setPay(null)}>Cancel</Button><Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] font-bold" disabled={busy || !pay.part}>{busy ? 'Saving…' : 'Record payment'}</Button></div>
            </form>
          </Modal>
        );
      })()}

      {/* ───────── Refund ───────── */}
      {refund && (
        <Modal title="Refund / credit note" onClose={() => setRefund(null)}>
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); void run(async () => { await refundPayment(refund.collection, Number(refund.amount), refund.reason, refund.key); setRefund(null); await deliver(); }, 'Refund recorded and credit note queued.'); }}>
            <p className="text-[11px] font-semibold text-slate-500">Record this only after the money has been returned. It reduces the milestone's received amount and queues a credit note.</p>
            <div><label className={label}>Refund amount *</label><input className={input} type="number" required min="0.001" step="any" value={refund.amount} onChange={e => setRefund({ ...refund, amount: e.target.value, key: uid() })} /></div>
            <div><label className={label}>Reason *</label><textarea className={`${input} h-20 py-2`} required minLength={3} value={refund.reason} onChange={e => setRefund({ ...refund, reason: e.target.value, key: uid() })} /></div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setRefund(null)}>Cancel</Button><Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] font-bold" disabled={busy}>Record refund</Button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
