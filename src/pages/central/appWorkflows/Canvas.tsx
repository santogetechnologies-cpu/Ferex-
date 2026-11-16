import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

/** Colours for every diagram, light and dark, so the SVG follows the app theme. */
export const DIAGRAM_CSS = `
.wf{--wf-bg:#FBF9FA;--wf-grid:#EADDE2;--wf-node:#FFFFFF;--wf-node-b:#D9C3CC;--wf-text:#2A1520;--wf-muted:#7B6670;--wf-accent:#58051E;--wf-accent-soft:#F6E7EC;--wf-lane:#F4EEF0;--wf-lane-b:#E6D8DD;--wf-edge:#9A7E89;--wf-sys:#EEF2FF;--wf-sys-b:#B6C1F2;--wf-dec:#FFF7E6;--wf-dec-b:#E8C27A;--wf-end:#E9F7EF;--wf-end-b:#8CCBA5}
.dark .wf{--wf-bg:#161013;--wf-grid:#2A1E24;--wf-node:#241A1F;--wf-node-b:#4A3640;--wf-text:#F5E9EE;--wf-muted:#B39AA5;--wf-accent:#F2B1D0;--wf-accent-soft:#3A2230;--wf-lane:#1D1519;--wf-lane-b:#36272F;--wf-edge:#B08A9A;--wf-sys:#1C2140;--wf-sys-b:#4B5BA8;--wf-dec:#3A2D14;--wf-dec-b:#9A7326;--wf-end:#14301F;--wf-end-b:#2F7A4C}
`;

/** A pan-and-zoom surface for diagrams: drag to move, wheel or buttons to zoom, Fit to see everything. */
export const Canvas: React.FC<{ width: number; height: number; children: React.ReactNode; label: string; className?: string }> = ({ width, height, children, label, className = '' }) => {
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null);

  // "Fit" shows the whole diagram; the opening view stays readable (at least 70% size) and starts at the top left, so long flows are panned, not squinted at.
  const fit = useCallback((readable = false) => {
    const el = box.current; if (!el) return;
    const kFit = Math.min(1.1, Math.max(0.2, Math.min(el.clientWidth / width, el.clientHeight / height) * 0.96));
    const k = readable ? Math.max(kFit, 0.7) : kFit;
    const tooWide = width * k > el.clientWidth + 4;
    setView({ k, x: tooWide ? 14 : (el.clientWidth - width * k) / 2, y: Math.max(8, Math.min(14, (el.clientHeight - height * k) / 2)) });
  }, [width, height]);
  const opened = useRef(false);
  useEffect(() => { opened.current = false; }, [width, height]);
  useEffect(() => { const el = box.current; if (!el) return; const place = () => { if (!opened.current) { fit(true); opened.current = true; } }; place(); const ro = new ResizeObserver(place); ro.observe(el); return () => ro.disconnect(); }, [fit]);

  const zoomAt = (factor: number, cx?: number, cy?: number) => setView(v => {
    const el = box.current; const px = cx ?? (el ? el.clientWidth / 2 : 0); const py = cy ?? (el ? el.clientHeight / 2 : 0);
    const k = Math.min(2.5, Math.max(0.2, v.k * factor)); const r = k / v.k;
    return { k, x: px - (px - v.x) * r, y: py - (py - v.y) * r };
  });

  return (
    <div className={`wf relative rounded-2xl border border-slate-200/80 overflow-hidden ${className}`} style={{ background: 'var(--wf-bg)' }}>
      <style>{DIAGRAM_CSS}</style>
      <div
        ref={box} role="img" aria-label={label} tabIndex={0}
        className="w-full h-full min-h-[22rem] cursor-grab active:cursor-grabbing touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-[#58051E]/40"
        onWheel={e => { if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) { e.preventDefault(); const r = box.current!.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.1 : 0.9, e.clientX - r.left, e.clientY - r.top); } }}
        onPointerDown={e => { if ((e.target as HTMLElement).closest('[data-node]')) return; drag.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={e => { const d = drag.current; if (d) setView(v => ({ ...v, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy })); }}
        onPointerUp={() => { drag.current = null; }}
        onKeyDown={e => { if (e.key === '+' || e.key === '=') zoomAt(1.15); if (e.key === '-') zoomAt(0.87); if (e.key === '0') fit(false); if (e.key === 'ArrowLeft') setView(v => ({ ...v, x: v.x + 40 })); if (e.key === 'ArrowRight') setView(v => ({ ...v, x: v.x - 40 })); if (e.key === 'ArrowUp') setView(v => ({ ...v, y: v.y + 40 })); if (e.key === 'ArrowDown') setView(v => ({ ...v, y: v.y - 40 })); }}
      >
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <pattern id="wf-dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="var(--wf-grid)" /></pattern>
            <marker id="wf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--wf-edge)" /></marker>
            <marker id="wf-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--wf-accent)" /></marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#wf-dots)" />
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>{children}</g>
        </svg>
      </div>
      <div className="absolute right-3 top-3 flex flex-col gap-1.5">
        {[{ t: 'Zoom in', i: <ZoomIn className="w-4 h-4" />, f: () => zoomAt(1.2) }, { t: 'Zoom out', i: <ZoomOut className="w-4 h-4" />, f: () => zoomAt(0.83) }, { t: 'Fit to screen', i: <Maximize2 className="w-4 h-4" />, f: () => fit(false) }].map(b => (
          <button key={b.t} type="button" aria-label={b.t} title={b.t} onClick={b.f} className="w-8 h-8 grid place-items-center rounded-lg border border-slate-200 bg-white/90 text-slate-700 hover:bg-white cursor-pointer shadow-xs">{b.i}</button>
        ))}
      </div>
      <p className="absolute left-3 bottom-2 text-[10px] font-semibold" style={{ color: 'var(--wf-muted)' }}>Drag to move · scroll to zoom · click a box for details</p>
    </div>
  );
};
