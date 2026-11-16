import React, { useState } from 'react';
import { ChevronDown, ChevronRight, MousePointerClick, TextCursorInput, Link2, Database, Server, Users, Columns3 } from 'lucide-react';
import type { InvPage } from '../../../data/workflows/types';

const Chip: React.FC<{ children: React.ReactNode; tone?: string }> = ({ children, tone = 'bg-slate-100 text-slate-700' }) => <code className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${tone}`}>{children}</code>;

const Group: React.FC<{ icon: React.ReactNode; title: string; count: number; open?: boolean; children: React.ReactNode }> = ({ icon, title, count, open = false, children }) => {
  const [on, setOn] = useState(open);
  if (!count) return null;
  return (
    <div className="border-t border-slate-100 pt-2">
      <button type="button" onClick={() => setOn(v => !v)} aria-expanded={on} className="w-full flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">{on ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}{icon}{title}<span className="ml-auto text-slate-400 tabular-nums">{count}</span></button>
      {on && <div className="mt-1.5 text-xs">{children}</div>}
    </div>
  );
};

/** Everything on one screen: its roles, every button with the function it runs, every field, link, column and the data behind it. */
export const ScreenCard: React.FC<{ page: InvPage; compact?: boolean; onOpen?: () => void }> = ({ page, compact = false, onOpen }) => (
  <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2" aria-label={`Screen ${page.title}`}>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0"><p className="text-sm font-black text-slate-900 truncate">{page.title}</p><p className="text-[11px] font-mono text-slate-500 truncate">{page.path}</p></div>
      {onOpen && <button type="button" onClick={onOpen} className="shrink-0 text-[11px] font-bold text-[#58051E] underline cursor-pointer">All details</button>}
    </div>
    {!compact && page.headings.length > 0 && <p className="text-xs text-slate-600">Sections: {page.headings.filter(h => !/[{$]/.test(h)).slice(0, 12).join(' · ')}</p>}
    <Group icon={<Users className="w-3.5 h-3.5 text-[#58051E]" />} title="Who can open it" count={page.roles.length} open={!compact}>{page.roles.map(r => <Chip key={r} tone="bg-[#58051E]/10 text-[#58051E]">{r}</Chip>)} </Group>
    <Group icon={<MousePointerClick className="w-3.5 h-3.5 text-[#58051E]" />} title="Buttons and what they do" count={page.buttons.length} open={!compact}>
      <ul className="space-y-1">{page.buttons.map((b, i) => <li key={i} className="flex flex-wrap gap-x-2 items-baseline"><span className="font-semibold text-slate-800">{b.text || '(icon)'}</span>{b.action && <span className="text-slate-500">→ <code className="text-[11px]">{b.action}</code></span>}</li>)}</ul>
    </Group>
    <Group icon={<TextCursorInput className="w-3.5 h-3.5 text-[#58051E]" />} title="Fields and filters" count={page.fields.length}>
      <ul className="space-y-1">{page.fields.map((f, i) => <li key={i}><span className="font-semibold text-slate-800">{f.label}</span> <span className="text-slate-500">({f.type})</span>{f.options.length > 0 && <span className="block text-slate-500">Options: {f.options.join(', ')}</span>}</li>)}</ul>
    </Group>
    <Group icon={<Link2 className="w-3.5 h-3.5 text-[#58051E]" />} title="Links" count={page.links.length}>
      <ul className="space-y-1">{page.links.map((l, i) => <li key={i}><span className="font-semibold text-slate-800">{l.text}</span> {l.to && <span className="text-slate-500">→ <code className="text-[11px]">{l.to}</code></span>}</li>)}</ul>
    </Group>
    <Group icon={<Columns3 className="w-3.5 h-3.5 text-[#58051E]" />} title="Table columns" count={page.columns.length}><p className="text-slate-600">{page.columns.join(' · ')}</p></Group>
    <Group icon={<Database className="w-3.5 h-3.5 text-[#58051E]" />} title="Data it reads and writes" count={page.tables.length + page.rpcs.length}>
      <p className="space-x-1">{page.tables.map(t => <Chip key={t}>{t}</Chip>)}{page.rpcs.map(t => <Chip key={t} tone="bg-amber-50 text-amber-800">{t}()</Chip>)}</p>
    </Group>
    <Group icon={<Server className="w-3.5 h-3.5 text-[#58051E]" />} title="Server functions" count={page.functions.length}><p className="space-x-1">{page.functions.map(t => <Chip key={t} tone="bg-indigo-50 text-indigo-700">{t}</Chip>)}</p></Group>
    {!compact && <p className="text-[10px] text-slate-400 break-all">Source: {page.sources.join(', ')}</p>}
  </section>
);
