import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';
import type { Flowchart, FlowNode, InvApp } from '../../../data/workflows/types';
import { Canvas } from './Canvas';
import { ScreenCard } from './ScreenCard';

const NW = 212, NH = 92, COLW = 254, LANEH = 156, LEFT = 172, TOP = 24;

const nodeBox = (n: FlowNode, laneIndex: number) => ({ x: LEFT + n.col * COLW, y: TOP + laneIndex * LANEH + (LANEH - NH) / 2, w: NW, h: NH });
const wrap = (text: string, max = 24) => { const words = text.split(' '); const lines: string[] = []; let cur = ''; for (const w of words) { if ((cur + ' ' + w).trim().length > max) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); } if (cur) lines.push(cur); return lines.slice(0, 3); };

/** Order the steps the way a person would walk them: by column, then lane, following the edges. */
function walkOrder(f: Flowchart): string[] {
  const seen = new Set<string>(); const order: string[] = [];
  const out = (id: string) => f.edges.filter(e => e.from === id).map(e => e.to);
  const start = f.nodes.find(n => n.kind === 'start')?.id || f.nodes[0]?.id;
  const visit = (id: string) => { if (seen.has(id)) return; seen.add(id); order.push(id); out(id).sort((a, b) => (f.nodes.find(n => n.id === a)!.col - f.nodes.find(n => n.id === b)!.col)).forEach(visit); };
  if (start) visit(start);
  f.nodes.forEach(n => { if (!seen.has(n.id)) order.push(n.id); });
  return order;
}

export const FlowView: React.FC<{ app: InvApp; flow: Flowchart; role: string; query: string; onOpenScreen: (path: string) => void }> = ({ app, flow, role, query, onOpenScreen }) => {
  const [selected, setSelected] = useState<string>('');
  const [hover, setHover] = useState<string>('');
  const [step, setStep] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const order = useMemo(() => walkOrder(flow), [flow]);
  const pages = useMemo(() => new Map(app.pages.map(p => [p.path, p])), [app]);
  useEffect(() => { setSelected(''); setStep(-1); setPlaying(false); }, [flow.id]);
  useEffect(() => { if (!playing) return; const t = setInterval(() => setStep(s => { if (s + 1 >= order.length) { setPlaying(false); return s; } return s + 1; }), 1700); return () => clearInterval(t); }, [playing, order.length]);
  const walking = step >= 0;
  const current = walking ? order[step] : '';
  useEffect(() => { if (walking) setSelected(order[step]); }, [step, walking, order]);

  const laneIndex = useMemo(() => new Map(flow.lanes.map((l, i) => [l.id, i])), [flow]);
  const boxes = useMemo(() => new Map(flow.nodes.map(n => [n.id, nodeBox(n, laneIndex.get(n.lane) ?? 0)])), [flow, laneIndex]);
  const width = LEFT + (Math.max(...flow.nodes.map(n => n.col)) + 1) * COLW + 20;
  const height = TOP + flow.lanes.length * LANEH + 20;

  const q = query.trim().toLowerCase();
  const matches = (n: FlowNode) => {
    if (!q) return false;
    const hay = `${n.label} ${n.desc} ${(n.tables || []).join(' ')} ${(n.functions || []).join(' ')} ${(n.screens || []).map(p => { const pg = pages.get(p); return pg ? `${p} ${pg.title} ${pg.buttons.map(b => b.text).join(' ')} ${pg.fields.map(f => f.label).join(' ')}` : p; }).join(' ')}`.toLowerCase();
    return hay.includes(q);
  };
  const inRole = (n: FlowNode) => !role || flow.lanes.find(l => l.id === n.lane)?.roles.includes(role) || false;
  const active = hover || selected;
  const linked = (id: string) => !active || id === active || flow.edges.some(e => (e.from === active && e.to === id) || (e.to === active && e.from === id));
  const sel = flow.nodes.find(n => n.id === selected);

  const edgePath = (from: FlowNode, to: FlowNode) => {
    const a = boxes.get(from.id)!, b = boxes.get(to.id)!;
    if (to.col > from.col) { const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2, mx = (x1 + x2) / 2; return { d: `M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`, lx: mx, ly: (y1 + y2) / 2 - 6 }; }
    if (to.col === from.col) { const down = b.y > a.y; const x = a.x + a.w / 2; const y1 = down ? a.y + a.h : a.y; const y2 = down ? b.y : b.y + b.h; return { d: `M${x} ${y1} L${x} ${y2}`, lx: x + 8, ly: (y1 + y2) / 2 }; }
    const x1 = a.x + a.w / 2, y1 = a.y + a.h, x2 = b.x + b.w / 2, y2 = b.y + b.h, dip = Math.max(y1, y2) + 46;
    return { d: `M${x1} ${y1} C${x1} ${dip}, ${x2} ${dip}, ${x2} ${y2}`, lx: (x1 + x2) / 2, ly: dip - 6 };
  };

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_22rem] gap-4 items-start">
      <div className="space-y-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => { if (!walking) setStep(0); setPlaying(p => !p); }} className="h-8 px-3 rounded-full bg-[#5A0122] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer">{playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}{playing ? 'Pause' : walking ? 'Resume' : 'Walk through'}</button>
          <button type="button" aria-label="Previous step" disabled={!walking || step <= 0} onClick={() => { setPlaying(false); setStep(s => Math.max(0, s - 1)); }} className="w-8 h-8 grid place-items-center rounded-full border border-slate-200 bg-white disabled:opacity-40 cursor-pointer"><SkipBack className="w-3.5 h-3.5" /></button>
          <button type="button" aria-label="Next step" disabled={walking && step >= order.length - 1} onClick={() => { setPlaying(false); setStep(s => Math.min(order.length - 1, s + 1)); }} className="w-8 h-8 grid place-items-center rounded-full border border-slate-200 bg-white disabled:opacity-40 cursor-pointer"><SkipForward className="w-3.5 h-3.5" /></button>
          {walking && <><span className="text-xs font-bold text-slate-600">Step {step + 1} of {order.length}</span><button type="button" onClick={() => { setStep(-1); setPlaying(false); setSelected(''); }} className="text-xs font-semibold text-slate-500 underline cursor-pointer">Stop</button></>}
          <span className="ml-auto text-xs text-slate-500">{flow.nodes.length} steps · {flow.edges.length} connections</span>
        </div>
        <Canvas width={width} height={height} label={`Flowchart: ${flow.title}`} className="h-[34rem]">
          {flow.lanes.map((l, i) => (
            <g key={l.id}>
              <rect x={0} y={TOP + i * LANEH} width={width} height={LANEH} fill="var(--wf-lane)" stroke="var(--wf-lane-b)" opacity={i % 2 ? 0.55 : 0.9} />
              <rect x={0} y={TOP + i * LANEH} width={LEFT - 14} height={LANEH} fill="var(--wf-accent-soft)" stroke="var(--wf-lane-b)" />
              <text x={12} y={TOP + i * LANEH + LANEH / 2 - 4} fontSize={13} fontWeight={800} fill="var(--wf-accent)">{wrap(l.label, 16).map((t, j) => <tspan key={j} x={12} dy={j ? 16 : 0}>{t}</tspan>)}</text>
            </g>
          ))}
          {flow.edges.map((e, i) => {
            const from = flow.nodes.find(n => n.id === e.from)!, to = flow.nodes.find(n => n.id === e.to)!;
            const p = edgePath(from, to); const hot = (active && (e.from === active || e.to === active)) || (walking && e.from === current);
            return (
              <g key={i} opacity={active && !hot ? 0.25 : 1}>
                <path d={p.d} fill="none" stroke={hot ? 'var(--wf-accent)' : 'var(--wf-edge)'} strokeWidth={hot ? 2.4 : 1.6} markerEnd={hot ? 'url(#wf-arrow-hot)' : 'url(#wf-arrow)'} strokeDasharray={walking && e.from === current ? '6 4' : undefined}>
                  {walking && e.from === current && <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.8s" repeatCount="indefinite" />}
                </path>
                {e.label && <g><rect x={p.lx - 22} y={p.ly - 11} width={44} height={16} rx={8} fill="var(--wf-bg)" stroke="var(--wf-lane-b)" /><text x={p.lx} y={p.ly + 1} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--wf-muted)">{e.label}</text></g>}
              </g>
            );
          })}
          {flow.nodes.map(n => {
            const b = boxes.get(n.id)!; const dim = (role && !inRole(n)) || !linked(n.id) || (q && !matches(n)); const isSel = n.id === selected; const isCur = n.id === current;
            const fill = n.kind === 'system' ? 'var(--wf-sys)' : n.kind === 'decision' ? 'var(--wf-dec)' : n.kind === 'end' ? 'var(--wf-end)' : 'var(--wf-node)';
            const stroke = isSel || isCur ? 'var(--wf-accent)' : n.kind === 'system' ? 'var(--wf-sys-b)' : n.kind === 'decision' ? 'var(--wf-dec-b)' : n.kind === 'end' ? 'var(--wf-end-b)' : 'var(--wf-node-b)';
            const lines = wrap(n.label, n.kind === 'decision' ? 18 : 24);
            const hit = q && matches(n);
            return (
              <g key={n.id} data-node tabIndex={0} role="button" aria-label={`${n.label}. ${n.desc}`} opacity={dim ? 0.28 : 1} className="cursor-pointer outline-none"
                onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover('')} onClick={() => { setSelected(n.id === selected ? '' : n.id); setPlaying(false); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(n.id); } }}>
                {n.kind === 'decision'
                  ? <polygon points={`${b.x + b.w / 2},${b.y - 4} ${b.x + b.w + 6},${b.y + b.h / 2} ${b.x + b.w / 2},${b.y + b.h + 4} ${b.x - 6},${b.y + b.h / 2}`} fill={fill} stroke={stroke} strokeWidth={isSel || isCur ? 2.6 : 1.6} />
                  : <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={n.kind === 'start' || n.kind === 'end' ? 40 : 14} fill={fill} stroke={stroke} strokeWidth={isSel || isCur ? 2.6 : 1.6} />}
                {hit && <rect x={b.x - 5} y={b.y - 5} width={b.w + 10} height={b.h + 10} rx={18} fill="none" stroke="var(--wf-accent)" strokeDasharray="4 3" strokeWidth={1.6} />}
                {isCur && <rect x={b.x - 6} y={b.y - 6} width={b.w + 12} height={b.h + 12} rx={20} fill="none" stroke="var(--wf-accent)" strokeWidth={2}><animate attributeName="opacity" values="1;0.2;1" dur="1.4s" repeatCount="indefinite" /></rect>}
                <text x={b.x + b.w / 2} y={b.y + b.h / 2 - (lines.length - 1) * 9 + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--wf-text)">{lines.map((t, i) => <tspan key={i} x={b.x + b.w / 2} dy={i ? 17 : 0}>{t}</tspan>)}</text>
                {(n.screens?.length || 0) > 0 && <g><circle cx={b.x + b.w - 8} cy={b.y + 8} r={9} fill="var(--wf-accent)" /><text x={b.x + b.w - 8} y={b.y + 12} textAnchor="middle" fontSize={10} fontWeight={800} fill="#fff">{n.screens!.length}</text></g>}
              </g>
            );
          })}
        </Canvas>
        <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500">
          <span>▭ step</span><span>◇ decision</span><span className="text-indigo-600">▭ system action</span><span className="text-emerald-600">⬭ end</span><span>● number = screens used in the step</span>
        </div>
      </div>

      <aside className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3 xl:sticky xl:top-4 max-h-[44rem] overflow-y-auto" aria-live="polite">
        {!sel ? (
          <div><p className="text-sm font-bold text-slate-900">{flow.title}</p><p className="text-xs text-slate-600 mt-1">{flow.summary}</p><p className="text-xs text-slate-500 mt-3">Click any box to see what happens in that step, who does it, and every button and field on the screens involved.</p></div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-wide text-[#5A0122]">{flow.lanes.find(l => l.id === sel.lane)?.label}</p><p className="text-sm font-black text-slate-900">{sel.label}</p></div><button type="button" aria-label="Close details" onClick={() => setSelected('')} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button></div>
            <p className="text-sm text-slate-700">{sel.desc}</p>
            {(sel.tables?.length || sel.functions?.length) ? (
              <div className="text-xs space-y-1">
                {sel.tables?.length ? <p><b className="text-slate-700">Data:</b> {sel.tables.map(t => <code key={t} className="mx-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{t}</code>)}</p> : null}
                {sel.functions?.length ? <p><b className="text-slate-700">Server functions:</b> {sel.functions.map(t => <code key={t} className="mx-0.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">{t}</code>)}</p> : null}
              </div>
            ) : null}
            {(sel.screens || []).map(path => { const pg = pages.get(path); return pg ? <ScreenCard key={path} page={pg} compact onOpen={() => onOpenScreen(path)} /> : null; })}
            {!sel.screens?.length && <p className="text-xs text-slate-500">This step is done by the system, with no screen of its own.</p>}
          </>
        )}
      </aside>
    </div>
  );
};
