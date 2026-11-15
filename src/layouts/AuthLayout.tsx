import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
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

    {/* globe with an orbiting dot */}
    <svg viewBox="0 0 300 300" className="absolute top-[6%] right-[1%] w-[19rem] h-[19rem] opacity-60 hidden lg:block">
      <g fill="none" stroke="#D88AA6" strokeWidth="0.9">
        <circle cx="150" cy="150" r="110" />
        {[30, 60, 90].map(r => <ellipse key={r} cx="150" cy="150" rx={r * 1.22} ry="110" />)}
        {[-60, -30, 0, 30, 60].map(y => <ellipse key={y} cx="150" cy={150 + y * 1.6} rx={Math.sqrt(110 * 110 - (y * 1.6) ** 2)} ry="9" />)}
      </g>
      <motion.g style={{ transformOrigin: '150px 150px' }} animate={{ rotate: 360 }} transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}>
        <ellipse cx="150" cy="150" rx="140" ry="58" fill="none" stroke="#C2305E" strokeWidth="1.2" transform="rotate(-24 150 150)" />
        <circle cx="290" cy="150" r="5" fill="#B0194F" transform="rotate(-24 150 150)" />
      </motion.g>
    </svg>
  </div>
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
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, duration: 0.6 }} className="hidden lg:flex mt-8 items-center gap-2 text-[#8C1D4F]">
            <svg viewBox="0 0 40 60" className="w-8 h-12" fill="#D9A27A" aria-hidden>{[8, 20, 32, 44].map((y, i) => <ellipse key={y} cx={i % 2 ? 24 : 14} cy={y} rx="6" ry="3" transform={`rotate(${i % 2 ? 30 : -30} ${i % 2 ? 24 : 14} ${y})`} />)}</svg>
            <BookOpen className="w-14 h-14" strokeWidth={1.3} />
            <svg viewBox="0 0 40 60" className="w-8 h-12 -scale-x-100" fill="#D9A27A" aria-hidden>{[8, 20, 32, 44].map((y, i) => <ellipse key={y} cx={i % 2 ? 24 : 14} cy={y} rx="6" ry="3" transform={`rotate(${i % 2 ? 30 : -30} ${i % 2 ? 24 : 14} ${y})`} />)}</svg>
          </motion.div>
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
