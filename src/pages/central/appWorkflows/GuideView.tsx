import React, { useMemo, useState } from 'react';
import { BookOpen, Users, Route, LayoutList, Settings2, Database, HelpCircle, Printer, Search, ChevronDown, LogIn, ListChecks, CircleDot, GitBranch } from 'lucide-react';
import type { AppCurated, InvApp, InvPage, Flowchart } from '../../../data/workflows/types';
import type { GuideApp } from '../../../data/workflows/guide';
import { DataFlowView } from './DataFlowView';

const pretty = (r: string) => r.replace(/_/g, ' ');
const uniq = <T,>(a: T[]) => [...new Set(a)];
const NAV: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'start', label: 'Start here', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'roles', label: 'Roles', icon: <Users className="w-4 h-4" /> },
  { id: 'routines', label: 'Daily routines', icon: <ListChecks className="w-4 h-4" /> },
  { id: 'journeys', label: 'Journeys', icon: <Route className="w-4 h-4" /> },
  { id: 'features', label: 'Every menu & feature', icon: <LayoutList className="w-4 h-4" /> },
  { id: 'custom', label: 'Settings & customisation', icon: <Settings2 className="w-4 h-4" /> },
  { id: 'data', label: 'Data flow', icon: <Database className="w-4 h-4" /> },
  { id: 'faq', label: 'Questions', icon: <HelpCircle className="w-4 h-4" /> },
];

const Section: React.FC<{ id: string; icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode }> = ({ id, icon, title, hint, children }) => (
  <section id={`guide-${id}`} className="scroll-mt-24 space-y-3">
    <div className="flex items-center gap-2.5"><span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-[#5A0122] to-[#68092A] text-white">{icon}</span>
      <div><h2 className="text-base font-black text-slate-900 tracking-tight">{title}</h2>{hint && <p className="text-xs text-slate-500">{hint}</p>}</div></div>
    {children}
  </section>
);
const Chip: React.FC<{ children: React.ReactNode; soft?: boolean }> = ({ children, soft }) => <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${soft ? 'bg-slate-100 text-slate-700' : 'bg-[#5A0122]/10 text-[#5A0122]'}`}>{children}</span>;
const Steps: React.FC<{ steps: string[] }> = ({ steps }) => (
  <ol className="space-y-2">{steps.map((s, i) => <li key={i} className="flex gap-2.5 text-sm text-slate-700"><span className="shrink-0 grid place-items-center w-5 h-5 mt-0.5 rounded-full bg-[#5A0122] text-white text-[10px] font-bold">{i + 1}</span><span>{s}</span></li>)}</ol>
);

/** Removes template markers and placeholder text so only words a person would recognise are shown. */
const clean = (t: string): string => {
  const x = String(t || '').replace(/\(\s*\{[^}]*\}\s*\)/g, '').replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();
  if (!x || x.length > 44) return '';
  if (/https?:|www\.|@|e\.g\.|^\(?dropdown\)?$|\.{3}$|…$|^[\d.,%₹€$+\-\s()]+$|^\(icon\)$/i.test(x)) return '';
  if (/^[A-Z]{2,5}$/.test(x) || /^\(.*\)$/.test(x) || /^\d/.test(x) || /\/ ?(yr|mo)\b/i.test(x)) return '';
  return x;
};

/** Plain-language steps for one screen, built from what is really on it. */
function stepsFor(p: InvPage, menuName: string): string[] {
  const btn = uniq(p.buttons.map(b => clean(b.text)).filter(Boolean));
  const starts = btn.filter(t => /^(\+\s*)?(add|new|create|record|schedule|upload|invite|assign|send|import|log|apply|book|dispatch|generate|issue|start|request|register)\b/i.test(t));
  const isFilter = (l: string) => /search|filter|status|date|^from|^to$|show|sort|category|country|type|period|range|all /i.test(l);
  const fields = uniq(p.fields.map(f => clean(f.label)).filter(Boolean));
  const filters = fields.filter(isFilter), form = fields.filter(l => !isFilter(l));
  const columns = uniq(p.columns.map(clean).filter(Boolean));
  const steps = [`Open “${menuName}” from the left menu.`];
  if (columns.length) steps.push(`The list shows: ${columns.slice(0, 10).join(', ')}.`);
  if (filters.length) steps.push(`Narrow it down with: ${filters.slice(0, 8).join(', ')}.`);
  if (starts.length) steps.push(`To add or create something, click: ${starts.slice(0, 6).map(t => `“${t.replace(/^\+\s*/, '')}”`).join(', ')}.`);
  if (form.length) steps.push(`The forms and boxes on this screen ask for: ${form.slice(0, 14).join(', ')}${form.length > 14 ? ' and more' : ''}. Fill them in and save.`);
  const rest = btn.filter(t => !starts.includes(t));
  if (rest.length) steps.push(`Other actions: ${rest.slice(0, 12).join(', ')}${rest.length > 12 ? ' and more (see the full list below)' : ''}.`);
  return steps;
}

const FeatureCard: React.FC<{ page: InvPage; name: string; note: string }> = ({ page, name, note }) => {
  const [open, setOpen] = useState(false);
  const steps = useMemo(() => stepsFor(page, name), [page, name]);
  const btn = uniq(page.buttons.map(b => clean(b.text)).filter(Boolean));
  const fields = page.fields.map(f => ({ label: clean(f.label), options: f.options.map(clean).filter(Boolean) })).filter(f => f.label);
  return (
    <article id={`screen-${page.path}`} className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3 scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0"><h4 className="text-sm font-black text-slate-900">{name}</h4><p className="text-[11px] font-mono text-slate-400 truncate">{page.path}</p></div>
        <div className="flex flex-wrap gap-1 justify-end">{page.roles.slice(0, 8).map(r => <Chip key={r}>{pretty(r)}</Chip>)}{page.roles.length > 8 && <Chip soft>+{page.roles.length - 8}</Chip>}</div>
      </div>
      <p className="text-sm text-slate-600">{note}</p>
      <Steps steps={steps} />
      {(fields.length > 0 || btn.length > 0) && (
        <div>
          <button type="button" aria-expanded={open} onClick={() => setOpen(v => !v)} className="inline-flex items-center gap-1 text-xs font-bold text-[#5A0122] cursor-pointer"><ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />{open ? 'Hide' : 'Show'} every button, option and field ({btn.length + fields.length})</button>
          {open && (
            <div className="mt-2 grid md:grid-cols-2 gap-3 text-xs">
              {btn.length > 0 && <div><p className="font-extrabold text-slate-700 mb-1">Buttons</p><div className="flex flex-wrap gap-1">{btn.map(b => <Chip key={b} soft>{b}</Chip>)}</div></div>}
              {fields.length > 0 && <div><p className="font-extrabold text-slate-700 mb-1">Fields and the choices you can pick</p>
                <ul className="space-y-1">{fields.map((f, i) => <li key={i}><span className="font-semibold text-slate-800">{f.label}</span>{f.options.length > 0 && <span className="text-slate-500"> — {f.options.slice(0, 12).join(', ')}{f.options.length > 12 ? '…' : ''}</span>}</li>)}</ul></div>}
            </div>
          )}
        </div>
      )}
    </article>
  );
};

const Journey: React.FC<{ flow: Flowchart }> = ({ flow }) => {
  const lane = (id: string) => flow.lanes.find(l => l.id === id)?.label || id;
  const nodes = [...flow.nodes].sort((a, b) => a.col - b.col || flow.lanes.findIndex(l => l.id === a.lane) - flow.lanes.findIndex(l => l.id === b.lane));
  const label = (id: string) => flow.nodes.find(n => n.id === id)?.label || id;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3">
      <div><h4 className="text-sm font-black text-slate-900">{flow.title}</h4><p className="text-xs text-slate-600">{flow.summary}</p></div>
      <ol className="relative border-l-2 border-[#5A0122]/20 ml-2.5 space-y-3">
        {nodes.map((n, i) => {
          const out = flow.edges.filter(e => e.from === n.id);
          return (
            <li key={n.id} className="pl-5 relative">
              <span className={`absolute -left-[0.62rem] top-1 grid place-items-center w-5 h-5 rounded-full text-[10px] font-bold text-white ${n.kind === 'decision' ? 'bg-slate-700' : n.kind === 'system' ? 'bg-slate-400' : 'bg-[#5A0122]'}`}>{i + 1}</span>
              <div className="flex flex-wrap items-center gap-1.5"><p className="text-sm font-bold text-slate-900">{n.label}</p><Chip soft>{lane(n.lane)}</Chip>{n.kind === 'decision' && <Chip>Decision</Chip>}{n.kind === 'system' && <Chip soft>Automatic</Chip>}</div>
              <p className="text-xs text-slate-600 mt-0.5">{n.desc}</p>
              {out.length > 1 && <p className="text-xs text-slate-500 mt-1 flex items-start gap-1"><GitBranch className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{out.map(e => `${e.label ? `${e.label}: ` : ''}${label(e.to)}`).join('  ·  ')}</span></p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

/**
 * One page a new client can operate the software from: who does what, each person's daily routine, the journeys, every menu with
 * how to use it, what can be customised, how data moves and the questions people ask. Screens, buttons and fields come from the app's code.
 */
export const GuideView: React.FC<{ app: InvApp; curated: AppCurated; guide: GuideApp }> = ({ app, curated, guide }) => {
  const [menuTab, setMenuTab] = useState(0);
  const [q, setQ] = useState('');
  const pages = useMemo(() => new Map(app.pages.map(p => [p.path, p])), [app]);
  const menus = useMemo(() => app.menus.map(m => ({ layout: m.layout, label: m.layout.replace('Layout', '').replace(/([A-Z])/g, ' $1').trim(), items: m.items.filter(i => i.path && i.path !== '/' && !/sign out/i.test(i.name) && pages.has(i.path)).filter((i, k, a) => a.findIndex(x => x.path === i.path) === k) })).filter(m => m.items.length), [app, pages]);
  const roleMenus = useMemo(() => { const out = new Map<string, string[]>(); app.roles.forEach(r => { const list = app.pages.filter(p => p.roles.includes(r.role) && p.menu).sort((a, b) => (a.menuOrder ?? 0) - (b.menuOrder ?? 0)).map(p => p.menu!); out.set(r.role, uniq(list)); }); return out; }, [app]);
  const go = (id: string) => document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const openScreen = (path: string) => { const k = menus.findIndex(m => m.items.some(i => i.path === path)); if (k >= 0) setMenuTab(k); setTimeout(() => document.getElementById(`screen-${path}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120); };
  const cur = menus[Math.min(menuTab, menus.length - 1)];
  const items = (cur?.items || []).filter(i => { const p = pages.get(i.path)!; const t = q.trim().toLowerCase(); return !t || `${i.name} ${guide.menuNotes[i.name] || ''} ${p.buttons.map(b => b.text).join(' ')} ${p.fields.map(f => f.label).join(' ')} ${p.columns.join(' ')}`.toLowerCase().includes(t); });

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-white/95 backdrop-blur border-b border-slate-200 flex flex-wrap items-center gap-1.5 print:hidden" aria-label="Guide sections">
        {NAV.map(n => <button key={n.id} type="button" onClick={() => go(n.id)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-[#5A0122] hover:text-[#5A0122] cursor-pointer">{n.icon}{n.label}</button>)}
        <button type="button" onClick={() => window.print()} className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-gradient-to-r from-[#5A0122] to-[#68092A] text-white text-xs font-bold cursor-pointer"><Printer className="w-3.5 h-3.5" />Print / Save as PDF</button>
      </div>

      <Section id="start" icon={<BookOpen className="w-4 h-4" />} title="Start here" hint={curated.tagline}>
        <div className="grid md:grid-cols-[1fr_20rem] gap-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2"><p className="flex items-center gap-1.5 text-sm font-black text-slate-900"><LogIn className="w-4 h-4 text-[#5A0122]" />Signing in</p><Steps steps={guide.signIn} /></div>
          <div className="grid grid-cols-2 gap-3">{[[app.roles.length, 'roles'], [app.totals.screens, 'screens'], [menus.reduce((s, m) => s + m.items.length, 0), 'menu entries'], [app.totals.buttons, 'buttons and options']].map(([v, l]) => <div key={l as string} className="rounded-2xl border border-slate-200/80 bg-white p-4"><p className="text-2xl font-extrabold tabular-nums text-[#5A0122]">{v}</p><p className="text-xs font-semibold text-slate-500">{l}</p></div>)}</div>
        </div>
      </Section>

      <Section id="roles" icon={<Users className="w-4 h-4" />} title="Roles: who does what" hint="Each person sees only the menus for their role.">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {app.roles.map(r => (
            <div key={r.role} className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between gap-2"><p className="text-sm font-black text-slate-900 capitalize">{pretty(r.role)}</p><Chip soft>{r.screens} screens</Chip></div>
              <p className="text-xs text-slate-600">{curated.roleNotes[r.role] || 'Access is defined by the screens listed below.'}</p>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Menu this role sees</p>
              <div className="flex flex-wrap gap-1">{(roleMenus.get(r.role) || []).map(m => <Chip key={m} soft>{m}</Chip>)}{!(roleMenus.get(r.role) || []).length && <span className="text-xs text-slate-400">Portal screens without a menu entry</span>}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="routines" icon={<ListChecks className="w-4 h-4" />} title="Daily routines" hint="What each person does, in order.">
        <div className="grid lg:grid-cols-2 gap-3">{guide.routines.map(r => <div key={r.title} className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2.5"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black text-slate-900">{r.title}</p><Chip>{r.who}</Chip></div><Steps steps={r.steps} /></div>)}</div>
      </Section>

      <Section id="journeys" icon={<Route className="w-4 h-4" />} title="Journeys" hint="A whole process from start to finish, with who is responsible for each step.">
        <div className="grid xl:grid-cols-2 gap-3">{curated.flows.map(f => <Journey key={f.id} flow={f} />)}</div>
      </Section>

      <Section id="features" icon={<LayoutList className="w-4 h-4" />} title="Every menu and feature" hint="Open a menu, then read how to use each screen. Expand a card to see every button, option and field.">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="Menu area">{menus.map((m, i) => <button key={m.layout} type="button" role="tab" aria-selected={i === menuTab} onClick={() => setMenuTab(i)} className={`h-8 px-3.5 rounded-full text-xs font-bold border cursor-pointer ${i === menuTab ? 'bg-[#5A0122] text-white border-[#5A0122]' : 'bg-white text-slate-600 border-slate-200'}`}>{m.label} menu ({m.items.length})</button>)}</div>
          <div className="relative w-full sm:w-72 ml-auto print:hidden"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Search the features" value={q} onChange={e => setQ(e.target.value)} placeholder="Search a button, field or word…" className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold" /></div>
        </div>
        <div className="grid xl:grid-cols-2 gap-3">
          {items.map(i => <FeatureCard key={i.path} page={pages.get(i.path)!} name={i.name} note={guide.menuNotes[i.name] || `Opens “${pages.get(i.path)!.title}”.`} />)}
          {!items.length && <p className="text-sm text-slate-500">Nothing matches “{q}”.</p>}
        </div>
      </Section>

      <Section id="custom" icon={<Settings2 className="w-4 h-4" />} title="Settings and customisation" hint="Everything you can change without a developer, and where.">
        <div className="grid md:grid-cols-2 gap-3">{guide.customization.map(c => <div key={c.title} className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-2"><p className="text-sm font-black text-slate-900">{c.title}</p><Chip>{c.where}</Chip><ul className="space-y-1.5 pt-1">{c.what.map((w, i) => <li key={i} className="flex gap-2 text-sm text-slate-700"><CircleDot className="w-3.5 h-3.5 mt-1 shrink-0 text-[#5A0122]" /><span>{w}</span></li>)}</ul></div>)}</div>
      </Section>

      <Section id="data" icon={<Database className="w-4 h-4" />} title="Data flow" hint="Who sends what, which process handles it and where it is kept. Click a box for details.">
        <DataFlowView app={app} dfd={curated.dfd} onOpenScreen={openScreen} />
      </Section>

      <Section id="faq" icon={<HelpCircle className="w-4 h-4" />} title="Common questions">
        <div className="space-y-2">{guide.faq.map(f => <details key={f.q} open className="rounded-2xl border border-slate-200/80 bg-white p-4"><summary className="text-sm font-bold text-slate-900 cursor-pointer">{f.q}</summary><p className="text-sm text-slate-600 mt-1.5">{f.a}</p></details>)}</div>
      </Section>
    </div>
  );
};
