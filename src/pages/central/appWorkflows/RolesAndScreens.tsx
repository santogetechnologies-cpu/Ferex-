import React, { useMemo, useState } from 'react';
import { Search, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AppCurated, InvApp } from '../../../data/workflows/types';
import { ScreenCard } from './ScreenCard';

const pretty = (r: string) => r.replace(/_/g, ' ');

/** Who can do what: pick a role to see every screen it can open and the flows it takes part in. */
export const RolesView: React.FC<{ app: InvApp; curated: AppCurated; role: string; setRole: (r: string) => void; onOpenScreen: (path: string) => void }> = ({ app, curated, role, setRole, onOpenScreen }) => {
  const pages = role ? app.pages.filter(p => p.roles.includes(role)) : [];
  const groups = useMemo(() => { const m = new Map<string, typeof pages>(); pages.forEach(p => { const g = p.layout?.replace('Layout', '') || 'Public'; (m.get(g) || m.set(g, []).get(g)!).push(p); }); return [...m.entries()]; }, [pages]);
  const flows = role ? curated.flows.filter(f => f.lanes.some(l => l.roles.includes(role))) : [];
  return (
    <div className="grid lg:grid-cols-[18rem_minmax(0,1fr)] gap-4 items-start">
      <ul className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100 overflow-hidden" aria-label="Roles">
        {app.roles.map(r => (
          <li key={r.role}>
            <button type="button" aria-pressed={role === r.role} onClick={() => setRole(role === r.role ? '' : r.role)} className={`w-full text-left px-4 py-3 cursor-pointer hover:bg-slate-50 ${role === r.role ? 'bg-[#58051E]/[0.05]' : ''}`}>
              <span className="flex items-center justify-between gap-2"><span className="text-sm font-bold text-slate-900 capitalize">{pretty(r.role)}</span><span className="text-[11px] font-bold text-slate-500 tabular-nums">{r.screens} screens</span></span>
              <span className="block text-xs text-slate-500 mt-0.5">{curated.roleNotes[r.role] || 'Access defined by the app\'s routes.'}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="space-y-4 min-w-0">
        {!role ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"><Users className="w-6 h-6 mx-auto mb-2 text-slate-400" />Pick a role to see everything it can open. The same role also lights up its lane in the flowcharts.</div> : (
          <>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4"><p className="text-sm font-black text-slate-900 capitalize">{pretty(role)}</p><p className="text-xs text-slate-600 mt-1">{curated.roleNotes[role] || ''}</p>{flows.length > 0 && <p className="text-xs text-slate-500 mt-2">Takes part in: {flows.map(f => f.title).join(' · ')}</p>}</div>
            {groups.map(([g, list]) => (
              <section key={g} className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-2">{g} ({list.length})</h3>
                <ul className="grid sm:grid-cols-2 gap-1.5">{list.map(p => <li key={p.path}><button type="button" onClick={() => onOpenScreen(p.path)} className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 hover:border-[#58051E]/40 cursor-pointer"><span className="block text-sm font-semibold text-slate-900">{p.title}</span><span className="block text-[11px] font-mono text-slate-500 truncate">{p.path} · {p.buttons.length} buttons</span></button></li>)}</ul>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

/** Every screen, searchable by anything on it: a button label, a field, a table, a function name. */
export const ScreensView: React.FC<{ app: InvApp; curated: AppCurated; query: string; selected: string; setSelected: (p: string) => void }> = ({ app, curated, query, selected, setSelected }) => {
  const [local, setLocal] = useState('');
  const q = (query || local).trim().toLowerCase();
  const usedIn = useMemo(() => { const m = new Map<string, string[]>(); curated.flows.forEach(f => f.nodes.forEach(n => (n.screens || []).forEach(p => { const l = m.get(p) || []; if (!l.includes(f.title)) l.push(f.title); m.set(p, l); }))); curated.dfd.nodes.forEach(n => (n.screens || []).forEach(p => { const l = m.get(p) || []; if (!l.includes('Data flow diagram')) l.push('Data flow diagram'); m.set(p, l); })); return m; }, [curated]);
  const list = app.pages.filter(p => !q || `${p.title} ${p.path} ${p.headings.join(' ')} ${p.buttons.map(b => b.text + ' ' + b.action).join(' ')} ${p.fields.map(f => f.label + ' ' + f.options.join(' ')).join(' ')} ${p.tables.join(' ')} ${p.rpcs.join(' ')} ${p.functions.join(' ')} ${p.columns.join(' ')}`.toLowerCase().includes(q));
  const page = app.pages.find(p => p.path === selected) || list[0];
  const aliases = app.redirects.filter(r => page && r.to === page.path);
  return (
    <div className="grid lg:grid-cols-[19rem_minmax(0,1fr)] gap-4 items-start">
      <div className="space-y-2">
        {!query && <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Search screens" value={local} onChange={e => setLocal(e.target.value)} placeholder="Find a button, field, table…" className="w-full h-10 pl-9 pr-3" /></div>}
        <ul className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100 max-h-[42rem] overflow-y-auto" aria-label="Screens">
          {list.length === 0 && <li className="p-6 text-center text-sm text-slate-500">Nothing matches "{q}".</li>}
          {list.map(p => <li key={p.path}><button type="button" aria-current={page?.path === p.path} onClick={() => setSelected(p.path)} className={`w-full text-left px-3.5 py-2.5 cursor-pointer hover:bg-slate-50 ${page?.path === p.path ? 'bg-[#58051E]/[0.05]' : ''}`}><span className="block text-sm font-semibold text-slate-900">{p.title}</span><span className="block text-[11px] font-mono text-slate-500 truncate">{p.path}</span><span className="block text-[11px] text-slate-500">{p.buttons.length} buttons · {p.fields.length} fields</span></button></li>)}
        </ul>
      </div>
      <div className="min-w-0 space-y-3">
        {page ? (
          <>
            <ScreenCard page={page} />
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1.5">
              <p className="flex items-center gap-1.5 font-bold text-slate-700">{usedIn.has(page.path) ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}{usedIn.has(page.path) ? 'Shown in:' : 'Not placed in a diagram step yet; it appears here and in the mind map.'}</p>
              {usedIn.get(page.path)?.map(t => <p key={t} className="text-slate-600">• {t}</p>)}
              {page.menu && <p className="text-slate-600">Menu entry: <b>{page.menu}</b> ({page.layout})</p>}
              {Object.keys(page.props).length > 0 && <p className="text-slate-600">Opens with: {Object.entries(page.props).map(([k, v]) => `${k} = ${v}`).join(', ')}</p>}
              {aliases.length > 0 && <p className="text-slate-600">Other addresses that lead here: {aliases.map(a => a.from).join(', ')}</p>}
            </div>
          </>
        ) : <p className="text-sm text-slate-500">Choose a screen.</p>}
      </div>
    </div>
  );
};

export const CoverageView: React.FC<{ app: InvApp; curated: AppCurated; onOpenScreen: (path: string) => void }> = ({ app, curated, onOpenScreen }) => {
  const placed = new Set<string>();
  curated.flows.forEach(f => f.nodes.forEach(n => (n.screens || []).forEach(p => placed.add(p)))); curated.dfd.nodes.forEach(n => (n.screens || []).forEach(p => placed.add(p)));
  const unplaced = app.pages.filter(p => !placed.has(p.path));
  const t = app.totals;
  const stat = (v: number, l: string) => <div className="rounded-2xl border border-slate-200/80 bg-white p-4"><p className="text-2xl font-extrabold tabular-nums text-slate-900">{v}</p><p className="text-xs font-semibold text-slate-500">{l}</p></div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{stat(t.screens, 'Screens')}{stat(t.buttons, 'Buttons')}{stat(t.fields, 'Fields and filters')}{stat(t.tables, 'Data tables')}{stat(app.roles.length, 'Roles')}</div>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2">
        <p className="text-sm font-black text-slate-900">Nothing is left out</p>
        <p className="text-xs text-slate-600">The screens, buttons, fields and tables above are read from the app's own code each time this page is built, so a new button appears here without anyone drawing it. {placed.size} of {app.pages.length} screens are also placed as steps in a flowchart or the data flow diagram; the other {unplaced.length} are listed below and are always in the mind map and the screen explorer.</p>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-600" style={{ width: `${Math.round((placed.size / Math.max(1, app.pages.length)) * 100)}%` }} /></div>
      </div>
      {unplaced.length > 0 && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-2">Screens not placed in a flowchart step ({unplaced.length})</h3>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">{unplaced.map(p => <li key={p.path}><button type="button" onClick={() => onOpenScreen(p.path)} className="w-full text-left rounded-lg border border-slate-200 px-3 py-2 hover:border-[#58051E]/40 cursor-pointer"><span className="block text-sm font-semibold text-slate-900">{p.title}</span><span className="block text-[11px] font-mono text-slate-500 truncate">{p.path}</span></button></li>)}</ul>
        </section>
      )}
    </div>
  );
};
