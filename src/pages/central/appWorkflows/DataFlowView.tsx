import React, { useMemo, useState } from 'react';
import type { DataFlow, DfdNode, InvApp } from '../../../data/workflows/types';
import { Canvas } from './Canvas';
import { ScreenCard } from './ScreenCard';

const CW = 196, RH = 108, LEFT = 30, TOP = 30, NW = 156, NH = 62;
const pos = (n: DfdNode) => ({ x: LEFT + n.col * CW, y: TOP + n.row * RH, w: NW, h: NH });
const wrap = (t: string, max = 18) => { const out: string[] = []; let cur = ''; t.split(' ').forEach(w => { if ((cur + ' ' + w).trim().length > max) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) out.push(cur); return out.slice(0, 3); };

const LEGEND: { kind: DfdNode['kind']; text: string }[] = [
  { kind: 'actor', text: 'Person who uses the app' }, { kind: 'process', text: 'Something the app does' }, { kind: 'store', text: 'Where data is kept' }, { kind: 'external', text: 'Outside service' },
];

/** A data-flow diagram: who sends what to which process, and which stores it reads or writes. */
export const DataFlowView: React.FC<{ app: InvApp; dfd: DataFlow; onOpenScreen: (path: string) => void }> = ({ app, dfd, onOpenScreen }) => {
  const [selected, setSelected] = useState('');
  const [hover, setHover] = useState('');
  const byId = useMemo(() => new Map(dfd.nodes.map(n => [n.id, n])), [dfd]);
  const pages = useMemo(() => new Map(app.pages.map(p => [p.path, p])), [app]);
  const width = LEFT * 2 + (Math.max(...dfd.nodes.map(n => n.col)) + 1) * CW;
  const height = TOP * 2 + (Math.max(...dfd.nodes.map(n => n.row)) + 1) * RH;
  const active = hover || selected;
  const touches = (id: string) => !active || id === active || dfd.edges.some(e => (e.from === active && e.to === id) || (e.to === active && e.from === id));
  const sel = selected ? byId.get(selected) : undefined;

  const shape = (n: DfdNode, hot: boolean) => {
    const b = pos(n); const stroke = hot ? 'var(--wf-accent)' : 'var(--wf-node-b)'; const sw = hot ? 2.6 : 1.6;
    if (n.kind === 'actor') return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill="var(--wf-node)" stroke={stroke} strokeWidth={sw} />;
    if (n.kind === 'process') return <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={28} fill="var(--wf-accent-soft)" stroke={stroke} strokeWidth={sw} />;
    if (n.kind === 'store') return <g><rect x={b.x} y={b.y} width={b.w} height={b.h} fill="var(--wf-lane)" stroke={stroke} strokeWidth={sw} /><line x1={b.x + 14} y1={b.y} x2={b.x + 14} y2={b.y + b.h} stroke={stroke} strokeWidth={sw} /></g>;
    return <polygon points={`${b.x + 16},${b.y} ${b.x + b.w - 16},${b.y} ${b.x + b.w},${b.y + b.h / 2} ${b.x + b.w - 16},${b.y + b.h} ${b.x + 16},${b.y + b.h} ${b.x},${b.y + b.h / 2}`} fill="var(--wf-sys)" stroke={stroke} strokeWidth={sw} />;
  };

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_22rem] gap-4 items-start">
      <div className="space-y-2 min-w-0">
        <Canvas width={width} height={height} label="Data flow diagram" className="h-[34rem]">
          {dfd.edges.map((e, i) => {
            const a = byId.get(e.from)!, b = byId.get(e.to)!; const pa = pos(a), pb = pos(b);
            const goingRight = pb.x >= pa.x; const x1 = goingRight ? pa.x + pa.w : pa.x, x2 = goingRight ? pb.x : pb.x + pb.w, y1 = pa.y + pa.h / 2, y2 = pb.y + pb.h / 2;
            const sameCol = Math.abs(pa.x - pb.x) < 4;
            const d = sameCol ? `M${pa.x + pa.w / 2} ${pb.y > pa.y ? pa.y + pa.h : pa.y} L${pb.x + pb.w / 2} ${pb.y > pa.y ? pb.y : pb.y + pb.h}` : `M${x1} ${y1} C${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
            const hot = active && (e.from === active || e.to === active);
            const mx = sameCol ? pa.x + pa.w / 2 + 6 : (x1 + x2) / 2, my = sameCol ? (pa.y + pb.y + pa.h) / 2 : (y1 + y2) / 2 - 5;
            return (
              <g key={i} opacity={active && !hot ? 0.18 : 1}>
                <path d={d} fill="none" stroke={hot ? 'var(--wf-accent)' : 'var(--wf-edge)'} strokeWidth={hot ? 2.4 : 1.4} markerEnd={hot ? 'url(#wf-arrow-hot)' : 'url(#wf-arrow)'} />
                <text x={mx} y={my} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--wf-muted)" stroke="var(--wf-bg)" strokeWidth={3} paintOrder="stroke">{e.label}</text>
              </g>
            );
          })}
          {dfd.nodes.map(n => {
            const b = pos(n); const lines = wrap(n.label); const hot = n.id === selected || n.id === hover;
            return (
              <g key={n.id} data-node tabIndex={0} role="button" aria-label={`${n.label}. ${n.desc}`} opacity={touches(n.id) ? 1 : 0.25} className="cursor-pointer outline-none"
                onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover('')} onClick={() => setSelected(n.id === selected ? '' : n.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(n.id); } }}>
                {shape(n, hot)}
                <text x={b.x + b.w / 2 + (n.kind === 'store' ? 7 : 0)} y={b.y + b.h / 2 - (lines.length - 1) * 7 + 4} textAnchor="middle" fontSize={13.5} fontWeight={700} fill="var(--wf-text)">{lines.map((t, i) => <tspan key={i} x={b.x + b.w / 2 + (n.kind === 'store' ? 7 : 0)} dy={i ? 15 : 0}>{t}</tspan>)}</text>
              </g>
            );
          })}
        </Canvas>
        <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500">{LEGEND.map(l => <span key={l.kind}>{l.kind === 'actor' ? '▭' : l.kind === 'process' ? '⬭' : l.kind === 'store' ? '▯' : '⬡'} {l.text}</span>)}</div>
      </div>
      <aside className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3 xl:sticky xl:top-4 max-h-[44rem] overflow-y-auto" aria-live="polite">
        {!sel ? <div><p className="text-sm font-bold text-slate-900">How data moves</p><p className="text-xs text-slate-600 mt-1">Arrows show what is sent and where it is kept. Click a box to see what it is, the tables it holds and the screens that use it. Hover to light up its connections.</p></div> : (
          <>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#5A0122]">{sel.kind === 'actor' ? 'Person' : sel.kind === 'process' ? 'Process' : sel.kind === 'store' ? 'Data store' : 'Outside service'}</p>
            <p className="text-sm font-black text-slate-900">{sel.label}</p><p className="text-sm text-slate-700">{sel.desc}</p>
            {sel.tables?.length ? <p className="text-xs"><b className="text-slate-700">Tables:</b> {sel.tables.map(t => <code key={t} className="mx-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{t}</code>)}</p> : null}
            <div className="text-xs"><b className="text-slate-700">Sends to:</b> {dfd.edges.filter(e => e.from === sel.id).map(e => `${byId.get(e.to)?.label} (${e.label})`).join(', ') || 'nothing'}<br /><b className="text-slate-700">Receives from:</b> {dfd.edges.filter(e => e.to === sel.id).map(e => `${byId.get(e.from)?.label} (${e.label})`).join(', ') || 'nothing'}</div>
            {(sel.screens || []).map(p => { const pg = pages.get(p); return pg ? <ScreenCard key={p} page={pg} compact onOpen={() => onOpenScreen(p)} /> : null; })}
          </>
        )}
      </aside>
    </div>
  );
};
