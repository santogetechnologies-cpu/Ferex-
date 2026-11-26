import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GraduationCap, Snowflake, Globe, Monitor, ArrowLeft } from 'lucide-react';
import { PageHeader } from '../../components/Kit';
import { BlockCap } from '../../components/CapLoader';
import type { AppKey, Inventory } from '../../data/workflows/types';
import { CURATED } from '../../data/workflows/curated';
import { GUIDE } from '../../data/workflows/guide';
import { GuideView } from './appWorkflows/GuideView';

const APPS: { key: AppKey; icon: React.ReactNode; tone: string }[] = [
  { key: 'education', icon: <GraduationCap className="w-6 h-6" />, tone: 'from-[#5A0122] to-[#68092A]' },
  { key: 'rimi', icon: <Snowflake className="w-6 h-6" />, tone: 'from-sky-700 to-cyan-500' },
  { key: 'trade', icon: <Globe className="w-6 h-6" />, tone: 'from-emerald-700 to-teal-500' },
  { key: 'digital', icon: <Monitor className="w-6 h-6" />, tone: 'from-indigo-700 to-violet-500' },
];

/** Central > App Workflows: one operating guide per app, so a client can run the software by reading it: roles, routines, journeys, every menu, customisation and data flow. */
export const CentralAppWorkflows: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const appKey = (params.get('app') as AppKey) || null;
  const [inv, setInv] = useState<Inventory | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { let live = true; import('../../data/workflows/inventory.generated.json').then(m => { if (live) setInv((m.default || m) as unknown as Inventory); }).catch(e => live && setError(e.message)); return () => { live = false; }; }, []);
  const pick = (key: AppKey | null) => { const next = new URLSearchParams(params); if (key) next.set('app', key); else next.delete('app'); next.delete('view'); next.delete('flow'); setParams(next, { replace: false }); };

  const app = inv && appKey ? inv.apps[appKey] : null;
  const curated = appKey ? CURATED[appKey] : null;

  if (error) return <p role="alert" className="rounded-xl border border-[#5A0122]/30 bg-white px-4 py-3 text-sm font-semibold text-[#5A0122]">Could not load the app guide: {error}</p>;
  if (!inv) return <BlockCap />;

  if (!appKey || !app || !curated) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader eyebrow="Ferex Central" title="App workflows" subtitle="An operating guide for each app: who does what, every menu and button, what you can customise and where the data goes." />
        <div className="grid sm:grid-cols-2 gap-4">
          {APPS.map(a => {
            const i = inv.apps[a.key]; const c = CURATED[a.key];
            return (
              <button key={a.key} type="button" onClick={() => pick(a.key)} className="group text-left rounded-3xl overflow-hidden border border-slate-200/80 bg-white hover:shadow-lg transition cursor-pointer">
                <div className={`bg-gradient-to-br ${a.tone} text-white p-5 flex items-center gap-3`}><span className="grid place-items-center w-11 h-11 rounded-2xl bg-white/20">{a.icon}</span><div><p className="text-lg font-black leading-tight">{i.name}</p><p className="text-xs text-white/80">Operating guide</p></div></div>
                <div className="p-5 space-y-3"><p className="text-sm text-slate-600">{c.tagline}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">{[[i.roles.length, 'roles'], [i.totals.screens, 'screens'], [i.totals.buttons, 'buttons']].map(([v, l]) => <div key={l as string} className="rounded-xl bg-slate-50 py-2"><p className="text-lg font-extrabold tabular-nums text-slate-900">{v}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{l}</p></div>)}</div>
                  <span className="text-xs font-bold text-[#5A0122] group-hover:underline">Open the guide →</span></div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button type="button" onClick={() => pick(null)} className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />All apps</button>
        <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="App">{APPS.map(a => <button key={a.key} type="button" role="tab" aria-selected={a.key === appKey} onClick={() => pick(a.key)} className={`h-9 px-3.5 rounded-full text-xs font-bold border cursor-pointer ${a.key === appKey ? 'bg-gradient-to-r from-[#5A0122] to-[#68092A] text-white border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:border-[#5A0122]'}`}>{inv.apps[a.key].name}</button>)}</div>
      </div>
      <PageHeader eyebrow="Operating guide" title={app.name} subtitle={curated.tagline} />
      <GuideView key={appKey} app={app} curated={curated} guide={GUIDE[appKey]} />
    </div>
  );
};
export default CentralAppWorkflows;
