import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, GraduationCap, Snowflake, Globe, Monitor, ArrowLeft, Workflow, Network, Database, Users, ListTree, ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/Kit';
import { BlockCap } from '../../components/CapLoader';
import type { AppKey, Inventory } from '../../data/workflows/types';
import { CURATED } from '../../data/workflows/curated';
import { FlowView } from './appWorkflows/FlowView';
import { DataFlowView } from './appWorkflows/DataFlowView';
import { MindMapView } from './appWorkflows/MindMapView';
import { RolesView, ScreensView, CoverageView } from './appWorkflows/RolesAndScreens';

type View = 'flows' | 'mind' | 'data' | 'roles' | 'screens' | 'coverage';
const VIEWS: { id: View; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'flows', label: 'Flowcharts', icon: <Workflow className="w-4 h-4" />, hint: 'Step by step, by role' },
  { id: 'mind', label: 'Mind map', icon: <Network className="w-4 h-4" />, hint: 'Every screen and button' },
  { id: 'data', label: 'Data flow', icon: <Database className="w-4 h-4" />, hint: 'Where data goes' },
  { id: 'roles', label: 'Roles', icon: <Users className="w-4 h-4" />, hint: 'Who can do what' },
  { id: 'screens', label: 'Screens & buttons', icon: <ListTree className="w-4 h-4" />, hint: 'Full inventory' },
  { id: 'coverage', label: 'Coverage', icon: <ShieldCheck className="w-4 h-4" />, hint: 'Nothing missed' },
];
const APPS: { key: AppKey; icon: React.ReactNode; tone: string }[] = [
  { key: 'education', icon: <GraduationCap className="w-6 h-6" />, tone: 'from-[#5A0122] to-[#68092A]' },
  { key: 'rimi', icon: <Snowflake className="w-6 h-6" />, tone: 'from-sky-700 to-cyan-500' },
  { key: 'trade', icon: <Globe className="w-6 h-6" />, tone: 'from-emerald-700 to-teal-500' },
  { key: 'digital', icon: <Monitor className="w-6 h-6" />, tone: 'from-indigo-700 to-violet-500' },
];

/** Central > App Workflows: how each of the four apps works, as flowcharts, a mind map and a data-flow diagram, built from the app's own code. */
export const CentralAppWorkflows: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const appKey = (params.get('app') as AppKey) || null;
  const view = (params.get('view') as View) || 'flows';
  const flowId = params.get('flow') || '';
  const [inv, setInv] = useState<Inventory | null>(null);
  const [error, setError] = useState('');
  const [role, setRole] = useState('');
  const [query, setQuery] = useState('');
  const [screen, setScreen] = useState('');

  useEffect(() => { let live = true; import('../../data/workflows/inventory.generated.json').then(m => { if (live) setInv((m.default || m) as unknown as Inventory); }).catch(e => live && setError(e.message)); return () => { live = false; }; }, []);
  const set = (patch: Record<string, string | null>) => { const next = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k))); setParams(next, { replace: true }); };
  useEffect(() => { setRole(''); setQuery(''); setScreen(''); }, [appKey]);

  const app = inv && appKey ? inv.apps[appKey] : null;
  const curated = appKey ? CURATED[appKey] : null;
  const flow = curated?.flows.find(f => f.id === flowId) || curated?.flows[0];
  const openScreen = (path: string) => { setScreen(path); set({ view: 'screens' }); };

  if (error) return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">Could not load the app inventory: {error}</p>;
  if (!inv) return <BlockCap />;

  if (!appKey || !app || !curated) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader eyebrow="Ferex Central" title="App workflows" subtitle="How each app works: who uses it, every screen and button in the right order, and where the data goes." />
        <div className="grid sm:grid-cols-2 gap-4">
          {APPS.map(a => {
            const i = inv.apps[a.key]; const c = CURATED[a.key];
            return (
              <button key={a.key} type="button" onClick={() => set({ app: a.key, view: 'flows', flow: null })} className="group text-left rounded-3xl overflow-hidden border border-slate-200/80 bg-white hover:shadow-lg hover:-translate-y-0.5 transition cursor-pointer">
                <div className={`bg-gradient-to-br ${a.tone} text-white p-5 flex items-center gap-3`}><span className="grid place-items-center w-11 h-11 rounded-2xl bg-white/20">{a.icon}</span><div><p className="text-lg font-black leading-tight">{i.name}</p><p className="text-xs text-white/80">{c.flows.length} flowcharts · 1 data flow · 1 mind map</p></div></div>
                <div className="p-5 space-y-3"><p className="text-sm text-slate-600">{c.tagline}</p>
                  <div className="grid grid-cols-4 gap-2 text-center">{[[i.roles.length, 'roles'], [i.totals.screens, 'screens'], [i.totals.buttons, 'buttons'], [i.totals.tables, 'tables']].map(([v, l]) => <div key={l as string} className="rounded-xl bg-slate-50 py-2"><p className="text-base font-extrabold text-slate-900 tabular-nums">{v}</p><p className="text-[10px] font-semibold text-slate-500">{l}</p></div>)}</div>
                  <span className="text-xs font-bold text-[#5A0122] group-hover:underline">Open the workflows →</span></div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => set({ app: null, view: null, flow: null })} className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />All apps</button>
        <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="App">{APPS.map(a => <button key={a.key} type="button" role="tab" aria-selected={a.key === appKey} onClick={() => set({ app: a.key, flow: null })} className={`h-9 px-3 rounded-full text-xs font-bold border cursor-pointer ${a.key === appKey ? 'bg-[#5A0122] text-white border-[#5A0122]' : 'bg-white text-slate-600 border-slate-200'}`}>{inv.apps[a.key].name}</button>)}</div>
      </div>
      <PageHeader eyebrow="App workflows" title={app.name} subtitle={curated.tagline} />

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="View" className="flex gap-1 border-b border-slate-200 overflow-x-auto flex-1 min-w-[18rem]">
          {VIEWS.map(v => <button key={v.id} type="button" role="tab" aria-selected={view === v.id} onClick={() => set({ view: v.id })} title={v.hint} className={`px-3.5 py-2.5 text-sm font-bold whitespace-nowrap inline-flex items-center gap-1.5 border-b-2 -mb-px cursor-pointer ${view === v.id ? 'border-[#5A0122] text-[#5A0122]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{v.icon}{v.label}</button>)}
        </div>
        <div className="relative w-full sm:w-64"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Search this app" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search a button, field, table…" className="w-full h-10 pl-9 pr-3" /></div>
      </div>

      {(view === 'flows') && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Flowchart">{curated.flows.map(f => <button key={f.id} type="button" role="tab" aria-selected={flow?.id === f.id} onClick={() => set({ flow: f.id })} className={`h-9 px-3.5 rounded-full text-xs font-bold border cursor-pointer ${flow?.id === f.id ? 'bg-[#5A0122]/10 text-[#5A0122] border-[#5A0122]/30' : 'bg-white text-slate-600 border-slate-200 hover:border-[#5A0122]/30'}`}>{f.title}</button>)}</div>
            <label className="ml-auto inline-flex items-center gap-2 text-xs font-bold text-slate-600">Highlight a role
              <select aria-label="Highlight a role" value={role} onChange={e => setRole(e.target.value)} className="h-9 px-2 text-xs"><option value="">Everyone</option>{app.roles.map(r => <option key={r.role} value={r.role}>{r.role.replace(/_/g, ' ')}</option>)}</select>
            </label>
          </div>
          {flow && <p className="text-sm text-slate-600">{flow.summary}</p>}
          {flow && <FlowView key={flow.id} app={app} flow={flow} role={role} query={query} onOpenScreen={openScreen} />}
        </div>
      )}
      {view === 'mind' && <MindMapView app={app} query={query} onOpenScreen={openScreen} />}
      {view === 'data' && <DataFlowView app={app} dfd={curated.dfd} onOpenScreen={openScreen} />}
      {view === 'roles' && <RolesView app={app} curated={curated} role={role} setRole={setRole} onOpenScreen={openScreen} />}
      {view === 'screens' && <ScreensView app={app} curated={curated} query={query} selected={screen} setSelected={setScreen} />}
      {view === 'coverage' && <CoverageView app={app} curated={curated} onOpenScreen={openScreen} />}
    </div>
  );
};
export default CentralAppWorkflows;
