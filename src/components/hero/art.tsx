import React from 'react';

// Every decorative layer of the hero is drawn here in SVG, on one shared 760 x 700 canvas, so each can be moved, scaled and animated on its own.
export const ART_W = 760;
export const ART_H = 700;

// Rounded rectangle with a different radius on each corner, for organic glass shapes.
const rr = (x: number, y: number, w: number, h: number, tl: number, tr: number, br: number, bl: number) =>
  `M${x + tl} ${y} H${x + w - tr} A${tr} ${tr} 0 0 1 ${x + w} ${y + tr} V${y + h - br} A${br} ${br} 0 0 1 ${x + w - br} ${y + h} H${x + bl} A${bl} ${bl} 0 0 1 ${x} ${y + h - bl} V${y + tl} A${tl} ${tl} 0 0 1 ${x + tl} ${y} Z`;

const Layer: React.FC<{ depth?: number; className?: string; children: React.ReactNode; label?: string }> = ({ depth = 0, className = '', children, label }) => (
  <svg viewBox={`0 0 ${ART_W} ${ART_H}`} className={`fx-layer ${className}`} style={{ ['--d' as any]: `${depth}px` }} aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label} preserveAspectRatio="xMidYMid meet">
    {children}
  </svg>
);

/* ── Soft light behind everything ─────────────────────────────── */
export const AmbientGlow: React.FC = () => (
  <Layer depth={-6}>
    <defs>
      <radialGradient id="fxg1" cx="58%" cy="42%" r="55%"><stop offset="0" stopColor="var(--fx-rose)" stopOpacity="0.55" /><stop offset="1" stopColor="var(--fx-rose)" stopOpacity="0" /></radialGradient>
      <radialGradient id="fxg2" cx="30%" cy="70%" r="45%"><stop offset="0" stopColor="var(--fx-accent)" stopOpacity="0.18" /><stop offset="1" stopColor="var(--fx-accent)" stopOpacity="0" /></radialGradient>
    </defs>
    <g className="fx-glow-pulse"><ellipse cx="470" cy="300" rx="330" ry="300" fill="url(#fxg1)" /><ellipse cx="190" cy="470" rx="220" ry="180" fill="url(#fxg2)" /></g>
  </Layer>
);

/* ── Architectural glass frames ───────────────────────────────── */
const Skyline: React.FC = () => (
  <g fill="none" stroke="var(--fx-line)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
    {/* domed cathedral */}
    <path d="M150 470 V400 M250 470 V400 M150 400 H250 M165 400 V470 M185 400 V470 M205 400 V470 M225 400 V470 M235 400 V470" />
    <path d="M150 400 C150 330 250 330 250 400" /><path d="M170 395 C170 345 230 345 230 395" />
    <path d="M200 338 V312 M192 320 H208 M200 312 L200 300" />
    <path d="M120 470 V430 L140 418 L160 430 V470 M240 470 V430 L260 418 L280 430 V470" />
    <path d="M110 470 H300" />
  </g>
);

export const GlassFrames: React.FC = () => (
  <Layer depth={14}>
    <defs>
      <linearGradient id="fxfa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--fx-frame-fill-1)" /><stop offset="0.6" stopColor="var(--fx-frame-fill-2)" /><stop offset="1" stopColor="var(--fx-frame-fill-1)" stopOpacity="0.5" /></linearGradient>
      <linearGradient id="fxfe" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--fx-frame-stroke)" /><stop offset="0.5" stopColor="var(--fx-frame-edge)" /><stop offset="1" stopColor="var(--fx-frame-stroke)" stopOpacity="0.7" /></linearGradient>
      <linearGradient id="fxsheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <clipPath id="fxclipB"><path d={rr(40, 200, 330, 300, 110, 50, 120, 70)} /></clipPath>
      <filter id="fxblur6" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14" /></filter>
    </defs>
    {/* soft shadow under the frames */}
    <path d={rr(215, 90, 480, 470, 150, 70, 160, 90)} fill="var(--fx-rb-shadow)" opacity="0.18" filter="url(#fxblur6)" transform="translate(0 26)" />
    {/* frame A: the large one behind the student */}
    <g className="fx-float-a" style={{ transformOrigin: '450px 320px' }}>
      <path d={rr(215, 90, 480, 470, 150, 70, 160, 90)} fill="url(#fxfa)" stroke="url(#fxfe)" strokeWidth="1.6" />
      <path d={rr(229, 104, 452, 442, 138, 58, 148, 78)} fill="none" stroke="var(--fx-frame-stroke)" strokeOpacity="0.45" strokeWidth="1" />
      <path d="M262 132 C330 96 470 92 560 118" fill="none" stroke="url(#fxsheen)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    </g>
    {/* frame B: smaller, left and lower, with a skyline inside */}
    <g className="fx-float-b" style={{ transformOrigin: '205px 350px' }}>
      <path d={rr(40, 200, 330, 300, 110, 50, 120, 70)} fill="url(#fxfa)" stroke="url(#fxfe)" strokeWidth="1.6" />
      <g clipPath="url(#fxclipB)"><Skyline /><path d="M40 470 C120 455 250 485 370 462 V520 H40Z" fill="var(--fx-rose)" opacity="0.14" /></g>
      <path d="M70 232 C110 208 200 200 280 216" fill="none" stroke="url(#fxsheen)" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
    </g>
    {/* frame C: a thin outline echoing the first */}
    <g className="fx-float-c" style={{ transformOrigin: '520px 300px' }}>
      <path d={rr(262, 56, 470, 470, 160, 80, 170, 100)} fill="none" stroke="var(--fx-frame-edge)" strokeWidth="1.1" strokeDasharray="2 7" strokeLinecap="round" opacity="0.8" />
    </g>
  </Layer>
);

/* ── European Union inspired flag ribbon ──────────────────────── */
const star = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) { const a = (-90 + i * 36) * Math.PI / 180; const rad = i % 2 ? r * 0.4 : r; pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`); }
  return pts.join(' ');
};
export const EuRibbon: React.FC = () => (
  <Layer depth={22}>
    <defs>
      <linearGradient id="fxeu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--fx-eu-3)" /><stop offset="0.35" stopColor="var(--fx-eu-1)" /><stop offset="1" stopColor="var(--fx-eu-2)" /></linearGradient>
      <linearGradient id="fxeuh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.28" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
    </defs>
    <g transform="translate(70 26) scale(0.9)"><g className="fx-wave">
      <path d="M520 -20 C575 38 650 6 760 64 V232 C672 182 596 222 548 150 C520 108 506 50 520 -20 Z" fill="url(#fxeu)" />
      <path d="M528 4 C585 52 654 26 760 84" fill="none" stroke="url(#fxeuh)" strokeWidth="3" opacity="0.9" />
      <path d="M548 150 C596 222 672 182 760 232 V250 C668 206 592 246 538 168 Z" fill="var(--fx-eu-2)" opacity="0.7" />
      {Array.from({ length: 12 }).map((_, i) => { const a = (i / 12) * Math.PI * 2; return <polygon key={i} points={star(652 + 54 * Math.cos(a), 118 + 46 * Math.sin(a), 6.2)} fill="var(--fx-star)" />; })}
    </g></g>
  </Layer>
);

/* ── Silk ribbon: a burgundy and champagne ribbon through the lower part ── */
const RibbonDefs: React.FC = () => (
  <defs>
    <linearGradient id="fxrA" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--fx-rb-1)" /><stop offset="0.35" stopColor="var(--fx-rb-2)" /><stop offset="0.7" stopColor="var(--fx-rb-3)" /><stop offset="1" stopColor="var(--fx-rb-4)" /></linearGradient>
    <linearGradient id="fxrB" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="var(--fx-rb-4)" /><stop offset="0.5" stopColor="var(--fx-rb-3)" /><stop offset="1" stopColor="var(--fx-rb-2)" /></linearGradient>
    <linearGradient id="fxrC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.55" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
    <filter id="fxrblur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="10" /></filter>
  </defs>
);
const RibbonFade: React.FC = () => (
  <>
    <linearGradient id="fxfadeG" gradientUnits="userSpaceOnUse" x1="-30" y1="0" x2="820" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.2" stopColor="#fff" stopOpacity="1" /><stop offset="0.86" stopColor="#fff" stopOpacity="1" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
    <mask id="fxfade" maskUnits="userSpaceOnUse" x="-40" y="-40" width="880" height="800"><rect x="-40" y="-40" width="880" height="800" fill="url(#fxfadeG)" /></mask>
  </>
);
export const SilkRibbonBack: React.FC = () => (
  <Layer depth={8}>
    <RibbonDefs /><defs><RibbonFade /></defs>
    <g mask="url(#fxfade)"><g className="fx-ribbon-drift">
      <path d="M-30 560 C 120 480 280 440 420 440 C 560 440 660 380 800 340 V384 C 668 424 574 498 424 496 C 290 494 140 540 -30 612 Z" fill="url(#fxrA)" opacity="0.92" />
      <path d="M-30 560 C 120 480 280 440 420 440 C 560 440 660 380 800 340" fill="none" stroke="url(#fxrC)" strokeWidth="2.4" strokeLinecap="round" />
    </g></g>
  </Layer>
);
export const SilkRibbonFront: React.FC = () => (
  <Layer depth={-10}>
    <RibbonDefs /><defs><RibbonFade /></defs>
    <path d="M-20 650 C 120 604 250 634 380 628 C 520 622 650 548 800 526 V626 C 650 654 520 732 380 728 C 250 732 120 704 -20 750 Z" fill="var(--fx-rb-shadow)" opacity="0.3" filter="url(#fxrblur)" />
    <g mask="url(#fxfade)"><g className="fx-ribbon-drift">
      <path d="M-20 612 C 120 566 250 596 380 590 C 520 584 650 506 800 484 V584 C 650 612 520 690 380 686 C 250 690 120 662 -20 708 Z" fill="url(#fxrA)" />
      <path d="M380 590 C 430 586 470 570 520 548 L 540 640 C 480 676 430 690 380 686 Z" fill="url(#fxrB)" opacity="0.95" />
      <path d="M-20 600 C 120 554 250 584 380 578 C 520 572 650 494 800 472 V494 C 650 516 520 594 380 600 C 250 606 120 576 -20 622 Z" fill="var(--fx-frame-fill-1)" stroke="var(--fx-frame-stroke)" strokeOpacity="0.8" strokeWidth="1.2" />
      <path d="M-20 628 C 120 582 250 612 380 606 C 520 600 650 522 800 500" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M-20 676 C 120 640 250 672 380 664 C 520 656 650 590 800 560" fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.2" strokeLinecap="round" />
    </g></g>
  </Layer>
);

/* ── Landmarks drawn as fine lines along the ribbon ───────────── */
export const Landmarks: React.FC = () => (
  <Layer depth={-14}>
    <g fill="none" stroke="var(--fx-lm)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ mixBlendMode: 'normal' }}>
      {/* Colosseum */}
      <g transform="translate(512 630) scale(0.92)">
        <path d="M0 -4 C0 -32 90 -32 90 -4" /><path d="M-4 0 C-4 -36 94 -36 94 0" opacity="0.6" />
        {[8, 22, 36, 50, 64, 78].map(x => <path key={x} d={`M${x} -6 V-18 A4 6 0 0 1 ${x + 8} -18 V-6`} />)}
        {[14, 29, 44, 59, 74].map(x => <path key={x} d={`M${x} -20 V-28 A3 4 0 0 1 ${x + 6} -28 V-20`} opacity="0.8" />)}
      </g>
      {/* gothic cathedral */}
      <g transform="translate(614 604) scale(0.78)">
        <path d="M0 6 V-30 L6 -50 L12 -30 V6 M24 6 V-40 L30 -66 L36 -40 V6 M12 -30 H24 M-6 6 H42" /><path d="M16 6 V-14 A5 8 0 0 1 22 -14 V6" />
      </g>
      {/* classical university hall */}
      <g transform="translate(664 594) scale(0.78)">
        <path d="M0 8 V-18 M10 8 V-18 M20 8 V-18 M30 8 V-18 M-4 -18 H34 L15 -34 Z M-6 8 H36" />
      </g>
      {/* Eiffel Tower */}
      <g transform="translate(708 590) scale(0.6)">
        <path d="M18 -86 L10 -30 L4 6 M18 -86 L26 -30 L32 6 M10 -30 H26 M7 -12 H29 M13 -52 H23 M4 6 C12 -12 24 -12 32 6 M18 -86 V-100" />
      </g>
    </g>
  </Layer>
);

/* ── Aircraft and its flight trail ────────────────────────────── */
export const FlightPath: React.FC = () => (
  <Layer depth={30}>
    <defs>
      <linearGradient id="fxtrail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--fx-accent)" stopOpacity="0" /><stop offset="1" stopColor="var(--fx-accent)" stopOpacity="0.75" /></linearGradient>
    </defs>
    <path id="fxflight" d="M20 214 C 150 128 300 64 470 70" fill="none" stroke="url(#fxtrail)" strokeWidth="1.4" strokeDasharray="3 7" strokeLinecap="round" />
    <path d="M30 238 C 160 156 304 96 440 96" fill="none" stroke="url(#fxtrail)" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
    <g fill="var(--fx-text)" opacity="0.92">
      <g>
        <path d="M14 0 L4 -3 L-4 -15 L-8 -15 L-4 -3 L-15 -3 L-19 -8 L-22 -8 L-20 0 L-22 8 L-19 8 L-15 3 L-4 3 L-8 15 L-4 15 L4 3 L14 0 Z" transform="scale(1.15)" />
        <animateMotion dur="46s" repeatCount="indefinite" rotate="auto" keyPoints="0;1;1" keyTimes="0;0.86;1" calcMode="linear"><mpath href="#fxflight" /></animateMotion>
      </g>
    </g>
  </Layer>
);

/* ── Floating light particles ─────────────────────────────────── */
const P = [[120, 120, 3, 0], [210, 60, 2, 1.2], [330, 40, 2.4, 2.1], [610, 36, 2, 0.6], [720, 300, 2.6, 1.8], [90, 330, 2.2, 3], [170, 560, 3, 2.4], [690, 520, 2.4, 0.9], [420, 20, 1.8, 3.4], [50, 220, 1.8, 1.5], [730, 420, 2, 2.7], [250, 640, 2, 0.3]];
export const Particles: React.FC = () => (
  <Layer depth={40}>
    {P.map(([x, y, r, d], i) => <circle key={i} className="fx-particle" cx={x} cy={y} r={r} fill="var(--fx-particle)" style={{ animationDelay: `${d}s` }} />)}
  </Layer>
);
