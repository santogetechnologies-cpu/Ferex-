import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FerexVectorMark } from '../components/Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
}

// Soft ribbons, dotted grids and a slowly turning globe. Always light, in the brand's wine and blush.
const Strand: React.FC<{ d: string; delay?: number; o?: number }> = ({ d, delay = 0, o = 0.7 }) => (
  <motion.path d={d} fill="none" stroke="url(#strand)" strokeWidth="1.1" opacity={o} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2.6, delay, ease: 'easeInOut' }} />
);

const Artwork: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_28%_40%,#FFFFFF_0%,#FDF1F5_45%,#F7DEE6_100%)]" />

    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMinYMid slice" className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="rbA" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stopColor="#A91E55" /><stop offset="0.45" stopColor="#C2305E" stopOpacity="0.85" /><stop offset="1" stopColor="#F2B7CB" stopOpacity="0" /></linearGradient>
        <linearGradient id="rbB" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stopColor="#E86A94" stopOpacity="0.7" /><stop offset="1" stopColor="#F9D3DF" stopOpacity="0" /></linearGradient>
        <linearGradient id="strand" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFD9B0" /><stop offset="1" stopColor="#FFD9B0" stopOpacity="0" /></linearGradient>
      </defs>
      {/* top-left ribbon */}
      <motion.g animate={{ x: [0, 16, 0], y: [0, 10, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}>
        <path d="M-60 330 C 160 250, 330 80, 560 -40 L 700 -40 C 520 70, 380 230, 200 330 C 120 372, 20 392, -60 400 Z" fill="url(#rbA)" />
        <path d="M-60 250 C 140 190, 300 40, 470 -40 L 540 -40 C 400 70, 250 190, 100 250 Z" fill="url(#rbB)" />
        <Strand d="M-60 330 C 160 250, 330 80, 560 -40" />
        <Strand d="M-60 300 C 150 230, 320 70, 520 -40" delay={0.3} o={0.5} />
        <Strand d="M-60 360 C 170 280, 350 100, 600 -40" delay={0.6} o={0.4} />
      </motion.g>
      {/* bottom-left ribbon */}
      <motion.g animate={{ x: [0, -14, 0], y: [0, -10, 0] }} transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}>
        <path d="M-60 640 C 200 700, 420 760, 660 960 L 860 960 C 600 800, 380 640, 120 580 C 40 562, -20 556, -60 560 Z" fill="url(#rbA)" />
        <path d="M-60 720 C 160 740, 330 800, 480 960 L 560 960 C 400 820, 240 740, 80 700 Z" fill="url(#rbB)" />
        <Strand d="M-60 640 C 200 700, 420 760, 660 960" delay={0.4} />
        <Strand d="M-60 680 C 190 730, 400 800, 600 960" delay={0.8} o={0.5} />
      </motion.g>
    </svg>

    {/* dotted grids */}
    <motion.div className="absolute top-8 left-8 w-28 h-28 hidden sm:block" style={{ backgroundImage: 'radial-gradient(#C2305E 1.4px, transparent 1.6px)', backgroundSize: '16px 16px' }} animate={{ opacity: [0.3, 0.65, 0.3] }} transition={{ duration: 6, repeat: Infinity }} />
    <motion.div className="absolute bottom-10 right-10 w-32 h-28 hidden lg:block" style={{ backgroundImage: 'radial-gradient(#C2305E 1.4px, transparent 1.6px)', backgroundSize: '16px 16px' }} animate={{ opacity: [0.6, 0.25, 0.6] }} transition={{ duration: 7, repeat: Infinity }} />

  </div>
);


// An open book resting between two laurel branches, drawn with gradients and shading so it reads as an object, not an icon.
const Branch: React.FC<{ side: 1 | -1 }> = ({ side }) => {
  // a cubic stem hugging the outside of the book; leaves sit alternately either side of it, following its tangent
  const P = [[100 + side * 72, 114], [100 + side * 112, 104], [100 + side * 116, 44], [100 + side * 74, 8]];
  const pt = (t: number) => {
    const u = 1 - t;
    const x = u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0];
    const y = u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1];
    const dx = 3 * u * u * (P[1][0] - P[0][0]) + 6 * u * t * (P[2][0] - P[1][0]) + 3 * t * t * (P[3][0] - P[2][0]);
    const dy = 3 * u * u * (P[1][1] - P[0][1]) + 6 * u * t * (P[2][1] - P[1][1]) + 3 * t * t * (P[3][1] - P[2][1]);
    return { x, y, a: (Math.atan2(dy, dx) * 180) / Math.PI };
  };
  const n = 8;
  const leaves = Array.from({ length: n }, (_, i) => {
    const t = 0.1 + (i / (n - 1)) * 0.86;
    const q = pt(t);
    const out = i % 2 === 0 ? 38 : -38;
    return { ...q, rot: q.a + out, sc: 0.95 - 0.35 * t };
  });
  const tip = pt(1);
  return (
    <g>
      <path d={`M${P[0][0]} ${P[0][1]} C ${P[1][0]} ${P[1][1]}, ${P[2][0]} ${P[2][1]}, ${P[3][0]} ${P[3][1]}`} fill="none" stroke="url(#bkLeaf)" strokeWidth="1.6" strokeLinecap="round" />
      {leaves.map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.rot}) scale(${l.sc})`}>
          <path d="M0 0 C 5 -6, 15 -6, 22 0 C 15 6, 5 6, 0 0 Z" fill="url(#bkLeaf)" />
          <path d="M1 0 H20" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.7" />
        </g>
      ))}
      <g transform={`translate(${tip.x} ${tip.y}) rotate(${tip.a}) scale(0.7)`}><path d="M0 0 C 5 -6, 15 -6, 22 0 C 15 6, 5 6, 0 0 Z" fill="url(#bkLeaf)" /></g>
    </g>
  );
};
const BookEmblem: React.FC = () => (
  <motion.svg viewBox="-40 0 280 130" className="w-72 h-auto mx-auto overflow-visible" aria-hidden animate={{ y: [0, -4, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
    <defs>
      <linearGradient id="bkLeaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F0CB8A" /><stop offset="0.55" stopColor="#D49B52" /><stop offset="1" stopColor="#A9702F" /></linearGradient>
      <linearGradient id="bkPageL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#F4ECE2" /><stop offset="0.7" stopColor="#FFFFFF" /><stop offset="1" stopColor="#E6DACB" /></linearGradient>
      <linearGradient id="bkPageR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stopColor="#F4ECE2" /><stop offset="0.7" stopColor="#FFFFFF" /><stop offset="1" stopColor="#E6DACB" /></linearGradient>
      <linearGradient id="bkCover" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8E1C52" /><stop offset="1" stopColor="#4A0220" /></linearGradient>
      <filter id="bkBlur" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="4" /></filter>
    </defs>
    <ellipse cx="100" cy="118" rx="62" ry="6" fill="#58051E" opacity="0.28" filter="url(#bkBlur)" />
    <Branch side={-1} /><Branch side={1} />
    {/* cover, seen as a thin edge under the pages */}
    <path d="M100 100 C 78 88, 46 86, 22 92 L 22 98 C 48 92, 78 94, 100 107 C 122 94, 152 92, 178 98 L 178 92 C 154 86, 122 88, 100 100 Z" fill="url(#bkCover)" />
    {/* stacked page edges */}
    <path d="M24 90 C 48 84, 78 86, 100 99 L 100 104 C 78 91, 48 89, 24 95 Z" fill="#E9DFD2" />
    <path d="M176 90 C 152 84, 122 86, 100 99 L 100 104 C 122 91, 152 89, 176 95 Z" fill="#E9DFD2" />
    {/* the open pages */}
    <path d="M100 98 C 78 84, 46 82, 22 88 L 22 36 C 46 30, 78 32, 100 46 Z" fill="url(#bkPageL)" stroke="#B9A892" strokeWidth="0.8" />
    <path d="M100 98 C 122 84, 154 82, 178 88 L 178 36 C 154 30, 122 32, 100 46 Z" fill="url(#bkPageR)" stroke="#B9A892" strokeWidth="0.8" />
    {/* printed lines */}
    <g stroke="#9C8F80" strokeOpacity="0.55" strokeWidth="0.9" strokeLinecap="round" fill="none">
      {[0, 1, 2, 3, 4, 5].map(i => <path key={`l${i}`} d={`M32 ${46 + i * 6.2} C 52 ${41 + i * 6.2}, 76 ${43 + i * 6.2}, 92 ${54 + i * 6.2}`} />)}
      {[0, 1, 2, 3, 4, 5].map(i => <path key={`r${i}`} d={`M168 ${46 + i * 6.2} C 148 ${41 + i * 6.2}, 124 ${43 + i * 6.2}, 108 ${54 + i * 6.2}`} />)}
    </g>
    {/* gutter shading and soft light on the pages */}
    <path d="M100 46 V98" stroke="#7A6A58" strokeOpacity="0.5" strokeWidth="1.4" />
    <path d="M94 50 C 96 62, 96 80, 94 94 L 100 98 L 100 46 Z" fill="#000" opacity="0.07" />
    <path d="M106 50 C 104 62, 104 80, 106 94 L 100 98 L 100 46 Z" fill="#000" opacity="0.07" />
    <path d="M28 40 C 50 35, 74 37, 94 49" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.2" />
    {/* ribbon bookmark */}
    <path d="M114 52 L 114 108 L 118 103 L 122 108 L 122 56 Z" fill="#9B1F57" opacity="0.92" />
  </motion.svg>
);

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  // Sign-in is always light, whatever theme the portals use.
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
    return () => { if (wasDark) { root.classList.add('dark'); root.style.colorScheme = 'dark'; } };
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col lg:flex-row bg-[#FCF3F6] antialiased font-sans text-slate-800 overflow-x-hidden">
      <Artwork />

      {/* Brand side */}
      <div className="relative z-10 lg:w-[46%] flex items-center justify-center px-6 pt-6 pb-2 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col items-center text-center">
          <div className="flex items-center gap-3 sm:gap-4">
            <motion.span animate={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 5, repeat: Infinity, repeatDelay: 3 }} className="drop-shadow-[0_10px_14px_rgba(87,2,41,0.25)] origin-center scale-[0.85] sm:scale-100 lg:scale-[1.5] mr-1 lg:mr-5"><FerexVectorMark color="#6B0F36" size="xl" /></motion.span>
            <span className="flex flex-col items-start leading-none">
              <span className="font-serif font-black tracking-wide text-[#6B0F36] text-4xl sm:text-5xl lg:text-6xl">FEREX</span>
              <span className="mt-2 text-sm sm:text-base lg:text-xl font-semibold tracking-[0.5em] text-[#3a2430]">EDUCATION</span>
            </span>
          </div>
          <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.6, duration: 0.7 }} className="hidden lg:block mt-8 h-[3px] w-16 rounded-full bg-[#8C1D4F]" />
          <p className="hidden lg:block mt-8 text-sm font-bold tracking-[0.28em] text-[#3a2430]">EDUCATION <span className="text-[#8C1D4F]">·</span> TRADE <span className="text-[#8C1D4F]">·</span> FROZEN FOODS <span className="text-[#8C1D4F]">·</span> DIGITAL</p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8 }} className="hidden lg:block mt-6"><BookEmblem /></motion.div>
        </motion.div>
      </div>

      {/* Card side */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 pb-8 pt-2 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[36rem] rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white/90 shadow-[0_30px_80px_-30px_rgba(107,15,54,0.45),inset_0_1px_0_rgba(255,255,255,0.9)] p-6 sm:p-9 text-left">
          <span aria-hidden className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-60" style={{ background: 'linear-gradient(120deg, rgba(194,48,94,0.0), rgba(255,255,255,0.9), rgba(194,48,94,0.0))' }} />
          <div className="relative">{children}</div>
        </motion.div>
      </div>
    </div>
  );
};
