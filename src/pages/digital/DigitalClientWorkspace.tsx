import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getDigitalProjects } from '../../lib/api/digital';
import { commerceList } from '../../lib/api/digitalCommerce';
import { money, trackContract, type TermStatus } from '../../lib/digitalCommerce';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';
import { Card } from '../../components/Card';

const STATUS_STYLE: Record<TermStatus, string> = {
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Partially Paid': 'bg-blue-50 text-blue-700 border-blue-200',
  Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  'Due Soon': 'bg-amber-50 text-amber-700 border-amber-200',
  Upcoming: 'bg-slate-50 text-slate-600 border-slate-200',
};

export default function DigitalClientWorkspace() {
  const { profile, signOut } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    try {
      const [p, c, d] = await Promise.all([getDigitalProjects(), commerceList('digital_contracts'), commerceList('digital_financial_documents')]);
      setProjects(p); setContracts(c); setDocuments(d); setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  };
  useEffect(() => { void load(); }, []);

  const contractByProject = useMemo(() => new Map(contracts.map(c => [c.project_id, c])), [contracts]);

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Your Digital Projects</h1>
          <p className="text-sm font-semibold text-slate-500">{profile?.full_name}</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white cursor-pointer" onClick={() => void load()}>Refresh</button>
          <button className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white cursor-pointer" onClick={async () => { await signOut(); window.location.assign('/digital/login'); }}>Sign out</button>
        </div>
      </header>

      {error && <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm font-semibold text-rose-700">{error}</p>}
      {loaded && !projects.length && !error && <Card className="p-8 text-center text-sm font-semibold text-slate-500 border-dashed">No projects have been linked to your account yet.</Card>}

      {projects.map(p => {
        const c = contractByProject.get(p.id);
        const t = c ? trackContract(c.body) : null;
        const cur = c?.body.currency;
        return (
          <Card key={p.id} className="p-5 border border-slate-200/80 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-black">{p.title}</h2>
                <p className="text-xs font-semibold text-slate-500">{p.status} · {p.progress}% complete · deadline {p.deadline || 'to be agreed'}{p.assigned_staff_name ? ` · led by ${p.assigned_staff_name}` : ''}</p>
              </div>
              {t && <div className="text-right"><div className="text-sm font-black">{money(t.total, cur)}</div><div className="text-[11px] font-bold text-slate-500">{t.percent_paid}% paid</div></div>}
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-[#58051E] rounded-full" style={{ width: `${Math.min(100, p.progress || 0)}%` }} /></div>
            {p.scope && <p className="text-sm text-slate-600">{p.scope}</p>}

            {t && c && (
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">Agreed scope</h3>
                <ul className="text-sm space-y-0.5">{c.body.lines.map((l: any) => <li key={l.id} className="flex justify-between"><span>{l.title}</span><span className="font-semibold">{money(l.amount, cur)} <span className="text-xs text-slate-500">+ {l.tax_label} {l.tax_rate}%</span></span></li>)}</ul>
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-500 pt-2">Milestones & payments</h3>
                <div className="space-y-2">
                  {t.terms.map(term => (
                    <div key={term.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-bold">{term.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${STATUS_STYLE[term.status]}`}>{term.status}</span>
                      </div>
                      <div className="flex flex-wrap justify-between text-xs font-semibold text-slate-600 gap-2">
                        <span>Due {term.due_date}</span>
                        <span>Paid {money(term.received, cur)} of {money(term.amount, cur)}</span>
                        <span className="font-black">Balance {money(term.remaining, cur)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${term.status === 'Overdue' ? 'bg-rose-500' : term.status === 'Paid' ? 'bg-emerald-500' : 'bg-[#58051E]'}`} style={{ width: `${Math.min(100, term.percent_paid)}%` }} /></div>
                    </div>
                  ))}
                </div>
                {c.body.payment_instructions && <p className="text-xs font-semibold text-slate-600 whitespace-pre-wrap">Payment instructions: {c.body.payment_instructions}</p>}
                <p className="text-[11px] font-semibold text-slate-500">Part payments can be made against any milestone. Your agency records each payment when the funds arrive.</p>
              </div>
            )}

            {(p.deliverables || []).filter((d: any) => /^https?:\/\//.test(d.url)).length > 0 && (
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-500">Deliverables</h3>
                {(p.deliverables || []).filter((d: any) => /^https?:\/\//.test(d.url)).map((d: any) => (
                  <p key={d.id} className="text-sm"><a className="underline font-semibold" href={d.url} target="_blank" rel="noopener noreferrer">{d.title}</a> <span className="text-xs text-slate-500">· {d.status}</span></p>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {documents.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-black">Proposals, invoices & receipts</h2>
          {documents.map(d => (
            <details key={d.id} className="bg-white border border-slate-200 p-4 rounded-xl">
              <summary className="cursor-pointer text-sm font-bold">{d.kind} · {d.number} · {money(d.body.amount, d.body.currency)}</summary>
              <p className="text-sm mt-2">{d.body.project_title}{d.body.part?.label ? ` · ${d.body.part.label}` : ''}</p>
              {d.body.notes && <p className="text-sm text-slate-600">{d.body.notes}</p>}
              <p className="text-xs text-slate-500">{new Date(d.created_at).toLocaleDateString()}</p>
              <button className="underline text-xs font-bold cursor-pointer" onClick={() => window.print()}>Print / save PDF</button>
            </details>
          ))}
        </section>
      )}

      <ChangePasswordForm />
    </main>
  );
}
