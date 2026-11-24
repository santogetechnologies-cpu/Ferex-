import React, { useMemo, useState } from 'react';
import type { InvApp, InvPage } from '../../../data/workflows/types';
import { Canvas } from './Canvas';

interface MNode { id: string; label: string; kind: 'root' | 'group' | 'role' | 'screen' | 'button' | 'field' | 'link' | 'data' | 'fn' | 'leaf'; children: MNode[]; page?: string; note?: string }
const COL = 250, ROW = 28, NW = 224;

function build(app: InvApp): MNode {
  const groupOf = (p: InvPage) => p.layout?.replace('Layout', '') || 'Public';
  const layoutNames: Record<string, string> = { Admin: 'Admin desk', Student: 'Student portal', Staff: 'Staff / counselor desk', Rimi: 'Rimi console', Trade: 'Trade console', Digital: 'Digital console', DigitalPM: 'Project manager desk', Public: 'Public pages' };
  const screens = new Map<string, MNode[]>();
  app.pages.slice().sort((a, b) => (a.menuOrder ?? 999) - (b.menuOrder ?? 999)).forEach(p => {
    const n: MNode = { id: `s:${p.path}`, label: p.title || p.path, kind: 'screen', page: p.path, note: p.path, children: [] };
    if (p.buttons.length) n.children.push({ id: `${n.id}:b`, label: `Buttons (${p.buttons.length})`, kind: 'group', children: p.buttons.map((b, i) => ({ id: `${n.id}:b${i}`, label: b.text || '(icon)', kind: 'button', note: b.action, children: b.action ? [{ id: `${n.id}:b${i}:a`, label: `runs ${b.action}`, kind: 'leaf', children: [] }] : [] })) });
    if (p.fields.length) n.children.push({ id: `${n.id}:f`, label: `Fields and filters (${p.fields.length})`, kind: 'group', children: p.fields.map((f, i) => ({ id: `${n.id}:f${i}`, label: `${f.label} · ${f.type}`, kind: 'field', children: f.options.map((o, j) => ({ id: `${n.id}:f${i}:o${j}`, label: o, kind: 'leaf' as const, children: [] })) })) });
    if (p.links.length) n.children.push({ id: `${n.id}:l`, label: `Links (${p.links.length})`, kind: 'group', children: p.links.map((l, i) => ({ id: `${n.id}:l${i}`, label: `${l.text}${l.to ? ' → ' + l.to : ''}`, kind: 'link', children: [] })) });
    if (p.columns.length) n.children.push({ id: `${n.id}:c`, label: `Table columns (${p.columns.length})`, kind: 'group', children: p.columns.map((c, i) => ({ id: `${n.id}:c${i}`, label: c, kind: 'leaf', children: [] })) });
    const data = [...p.tables, ...p.rpcs.map(r => `${r}()`), ...p.functions.map(f => `fn ${f}`)];
    if (data.length) n.children.push({ id: `${n.id}:d`, label: `Data (${data.length})`, kind: 'group', children: data.map((d, i) => ({ id: `${n.id}:d${i}`, label: d, kind: 'data', children: [] })) });
    const g = groupOf(p); (screens.get(g) || screens.set(g, []).get(g)!).push(n);
  });
  const tables = new Map<string, string[]>(); const fns = new Map<string, string[]>();
  app.pages.forEach(p => { p.tables.forEach(t => (tables.get(t) || tables.set(t, []).get(t)!).push(p.title || p.path)); [...p.functions, ...p.rpcs].forEach(f => (fns.get(f) || fns.set(f, []).get(f)!).push(p.title || p.path)); });
  return {
    id: 'root', label: app.name, kind: 'root', children: [
      { id: 'roles', label: `Who uses it (${app.roles.length} roles)`, kind: 'group', children: app.roles.map(r => ({ id: `r:${r.role}`, label: `${r.role} · ${r.screens} screens`, kind: 'role', children: app.pages.filter(p => p.roles.includes(r.role)).map(p => ({ id: `r:${r.role}:${p.path}`, label: p.title || p.path, kind: 'leaf' as const, children: [] })) })) },
      { id: 'screens', label: `Screens (${app.pages.length})`, kind: 'group', children: [...screens.entries()].map(([g, list]) => ({ id: `g:${g}`, label: `${layoutNames[g] || g} (${list.length})`, kind: 'group' as const, children: list })) },
      { id: 'data', label: `Data it keeps (${tables.size} tables)`, kind: 'group', children: [...tables.entries()].sort().map(([t, used]) => ({ id: `t:${t}`, label: t, kind: 'data' as const, children: used.map((u, i) => ({ id: `t:${t}:${i}`, label: `used by ${u}`, kind: 'leaf' as const, children: [] })) })) },
      { id: 'fns', label: `Server functions and procedures (${fns.size})`, kind: 'group', children: [...fns.entries()].sort().map(([f, used]) => ({ id: `f:${f}`, label: f, kind: 'fn' as const, children: used.map((u, i) => ({ id: `f:${f}:${i}`, label: `called from ${u}`, kind: 'leaf' as const, children: [] })) })) },
    ],
  };
}

const TONE: Record<MNode['kind'], string> = { root: 'var(--wf-accent)', group: 'var(--wf-accent-soft)', role: 'var(--wf-end)', screen: 'var(--wf-node)', button: 'var(--wf-node)', field: 'var(--wf-sys)', link: 'var(--wf-node)', data: 'var(--wf-dec)', fn: 'var(--wf-sys)', leaf: 'var(--wf-lane)' };

/** Every screen, button, field and table of the app as a branching map. Click a node to open or close its branch. */
export const MindMapView: React.FC<{ app: InvApp; query: string; onOpenScreen: (path: string) => void }> = ({ app, query, onOpenScreen }) => {
  const tree = useMemo(() => build(app), [app]);
  const [open, setOpen] = useState<Set<string>>(new Set(['root', 'roles', 'screens']));
  const q = query.trim().toLowerCase();

  // When searching, open every branch that leads to a match.
  const matchIds = useMemo(() => {
    const hits = new Set<string>(); const path: MNode[] = [];
    if (!q) return hits;
    const walk = (n: MNode) => { path.push(n); if (n.label.toLowerCase().includes(q) || (n.note || '').toLowerCase().includes(q)) hits.add(n.id); n.children.forEach(walk); path.pop(); };
    walk(tree); return hits;
  }, [tree, q]);
  const forcedOpen = useMemo(() => {
    const s = new Set<string>(); if (!q) return s;
    const walk = (n: MNode): boolean => { const child = n.children.map(walk).some(Boolean); if (child) s.add(n.id); return child || matchIds.has(n.id); };
    walk(tree); return s;
  }, [tree, matchIds, q]);
  const isOpen = (id: string) => open.has(id) || forcedOpen.has(id);

  const { nodes, edges, width, height, total } = useMemo(() => {
    const nodes: { n: MNode; x: number; y: number }[] = []; const edges: { x1: number; y1: number; x2: number; y2: number }[] = []; let row = 0; let total = 0;
    const walk = (n: MNode, depth: number): number => {
      total++;
      const kids = isOpen(n.id) ? n.children : [];
      let y: number;
      if (!kids.length) { y = row * ROW; row++; } else { const ys = kids.map(k => walk(k, depth + 1)); y = (ys[0] + ys[ys.length - 1]) / 2; kids.forEach((k, i) => { const ky = ys[i]; edges.push({ x1: depth * COL + NW, y1: y + ROW / 2, x2: (depth + 1) * COL, y2: ky + ROW / 2 }); }); }
      nodes.push({ n, x: depth * COL, y });
      return y;
    };
    walk(tree, 0);
    const maxDepth = Math.max(...nodes.map(p => p.x / COL));
    return { nodes, edges, total, width: (maxDepth + 1) * COL + 40, height: Math.max(row, 1) * ROW + 40 };
  }, [tree, open, forcedOpen]);

  const toggle = (n: MNode) => { if (n.page && !n.children.length) return; setOpen(prev => { const s = new Set(prev); s.has(n.id) ? s.delete(n.id) : s.add(n.id); return s; }); };
  const expandAll = () => { const s = new Set<string>(); const walk = (n: MNode, d: number) => { if (n.children.length && d < 3) s.add(n.id); n.children.forEach(c => walk(c, d + 1)); }; walk(tree, 0); setOpen(s); };
  const everything = () => { const s = new Set<string>(); const walk = (n: MNode) => { if (n.children.length) s.add(n.id); n.children.forEach(walk); }; walk(tree); setOpen(s); };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" onClick={() => setOpen(new Set(['root']))} className="h-8 px-3 rounded-full border border-slate-200 bg-white font-bold text-slate-700 cursor-pointer">Collapse</button>
        <button type="button" onClick={expandAll} className="h-8 px-3 rounded-full border border-slate-200 bg-white font-bold text-slate-700 cursor-pointer">Open three levels</button>
        <button type="button" onClick={everything} className="h-8 px-3 rounded-full border border-slate-200 bg-white font-bold text-slate-700 cursor-pointer">Open everything</button>
        <span className="text-slate-500">{nodes.length} nodes showing{q ? ` · ${matchIds.size} match "${query}"` : ''}. Click a screen to open it, or a branch to open or close it.</span>
      </div>
      <Canvas width={width} height={height} label={`Mind map of ${app.name}`} className="h-[40rem]">
        {edges.map((e, i) => <path key={i} d={`M${e.x1} ${e.y1} C${(e.x1 + e.x2) / 2} ${e.y1}, ${(e.x1 + e.x2) / 2} ${e.y2}, ${e.x2} ${e.y2}`} fill="none" stroke="var(--wf-edge)" strokeWidth={1.2} opacity={0.7} />)}
        {nodes.map(({ n, x, y }) => {
          const hit = matchIds.has(n.id); const branch = n.children.length > 0; const label = n.label.length > 34 ? n.label.slice(0, 33) + '…' : n.label;
          return (
            <g key={n.id} data-node tabIndex={0} role="button" aria-expanded={branch ? isOpen(n.id) : undefined} aria-label={n.label} className="cursor-pointer outline-none"
              onClick={() => { if (n.page) onOpenScreen(n.page); if (branch) toggle(n); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (branch) toggle(n); } }}>
              <title>{n.label}{n.note ? ` · ${n.note}` : ''}</title>
              <rect x={x} y={y + 2} width={NW} height={ROW - 5} rx={8} fill={TONE[n.kind]} stroke={hit ? 'var(--wf-accent)' : 'var(--wf-node-b)'} strokeWidth={hit ? 2.4 : 1} />
              <text x={x + 10} y={y + ROW / 2 + 4} fontSize={11.5} fontWeight={n.kind === 'root' || n.kind === 'group' || n.kind === 'screen' ? 800 : 600} fill={n.kind === 'root' ? '#fff' : 'var(--wf-text)'}>{label}</text>
              {branch && <text x={x + NW - 14} y={y + ROW / 2 + 4} fontSize={11} fontWeight={800} fill={n.kind === 'root' ? '#fff' : 'var(--wf-accent)'}>{isOpen(n.id) ? '−' : '+'}</text>}
            </g>
          );
        })}
      </Canvas>
    </div>
  );
};
