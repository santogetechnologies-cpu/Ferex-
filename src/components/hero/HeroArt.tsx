import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const ease = [0.16, 1, 0.3, 1] as const;

// Moves the layers a few pixels with the pointer. Off for touch screens and for visitors who prefer reduced motion.
function useParallax(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(pointer: coarse)').matches) return;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const tick = () => { x += (tx - x) * 0.08; y += (ty - y) * 0.08; el.style.setProperty('--mx', x.toFixed(3)); el.style.setProperty('--my', y.toFixed(3)); raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.002 ? requestAnimationFrame(tick) : 0; };
    const move = (e: MouseEvent) => { const r = el.getBoundingClientRect(); tx = ((e.clientX - (r.left + r.width / 2)) / window.innerWidth) * 2; ty = ((e.clientY - (r.top + r.height / 2)) / window.innerHeight) * 2; if (!raf) raf = requestAnimationFrame(tick); };
    const leave = () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseleave', leave);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseleave', leave); cancelAnimationFrame(raf); };
  }, [ref]);
}

const useStill = () => {
  const [still, setStill] = useState(false);
  useEffect(() => { setStill(window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  return still;
};

// Two shapes per wave with the same structure, so the path can morph smoothly between them.
const W = {
  cream: ['M0 322 C 250 302, 450 232, 650 212 C 800 196, 920 140, 1000 88 V172 C 900 206, 780 262, 620 276 C 420 290, 220 330, 0 340 Z', 'M0 318 C 250 290, 450 244, 650 218 C 800 200, 920 154, 1000 100 V164 C 900 196, 780 272, 620 286 C 420 296, 220 326, 0 340 Z'],
  main: ['M0 340 C 200 336, 360 292, 540 278 C 740 262, 880 228, 1000 174 V340 Z', 'M0 340 C 200 330, 370 300, 540 288 C 740 270, 880 238, 1000 186 V340 Z'],
  rose: ['M0 340 C 250 318, 400 332, 600 316 C 800 300, 900 296, 1000 262 V340 Z', 'M0 340 C 250 326, 410 322, 600 322 C 800 308, 900 286, 1000 272 V340 Z'],
};
const Morph: React.FC<{ v: string[]; dur: string; still: boolean }> = ({ v, dur, still }) => still ? null : (
  <animate attributeName="d" dur={dur} repeatCount="indefinite" values={`${v[0]};${v[1]};${v[0]}`} calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" keyTimes="0;0.5;1" />
);

const Wave: React.FC<{ still: boolean }> = ({ still }) => (
  <svg viewBox="0 0 1000 340" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 w-full h-[44%]" aria-hidden>
    <defs>
      <linearGradient id="fxwC" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="var(--fx-rb-4)" stopOpacity="0" /><stop offset="0.35" stopColor="var(--fx-rb-4)" /><stop offset="1" stopColor="#FFFFFF" /></linearGradient>
      <linearGradient id="fxwM" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--fx-rb-3)" stopOpacity="0" /><stop offset="0.18" stopColor="var(--fx-rb-2)" /><stop offset="0.6" stopColor="var(--fx-rb-1)" /><stop offset="1" stopColor="var(--fx-rb-2)" /></linearGradient>
      <linearGradient id="fxwR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--fx-rb-2)" stopOpacity="0" /><stop offset="0.5" stopColor="var(--fx-rb-3)" stopOpacity="0.85" /><stop offset="1" stopColor="var(--fx-rb-2)" stopOpacity="0.9" /></linearGradient>
      <linearGradient id="fxwH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.7" /><stop offset="1" stopColor="#fff" stopOpacity="0.1" /></linearGradient>
      <path id="fxplanePath" d="M300 304 C 560 300, 780 262, 1000 190" />
    </defs>
    <path d={W.cream[0]} fill="url(#fxwC)" opacity="0.82"><Morph v={W.cream} dur="11s" still={still} /></path>
    <path d={W.rose[0]} fill="url(#fxwR)"><Morph v={W.rose} dur="9s" still={still} /></path>
    <path d={W.main[0]} fill="url(#fxwM)"><Morph v={W.main} dur="13s" still={still} /></path>
    <path d="M0 336 C 250 322, 420 292, 560 280 C 760 262, 880 232, 1000 180" fill="none" stroke="url(#fxwH)" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    <path d="M0 339 C 260 332, 440 312, 600 300 C 780 284, 900 268, 1000 232" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    <path d="M300 304 C 560 300, 780 262, 1000 190" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.2" strokeDasharray="2 7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    {!still && (
      <g>
        <svg x="-14" y="-14" width="28" height="28" viewBox="-22 -16 44 32" overflow="visible"><path fill="#fff" d="M14 0 L4 -3 L-4 -15 L-8 -15 L-4 -3 L-15 -3 L-19 -8 L-22 -8 L-20 0 L-22 8 L-19 8 L-15 3 L-4 3 L-8 15 L-4 15 L4 3 L14 0 Z" /></svg>
        <animateMotion dur="16s" repeatCount="indefinite" rotate="auto" keyPoints="0;1;1" keyTimes="0;0.9;1" calcMode="linear"><mpath href="#fxplanePath" /></animateMotion>
      </g>
    )}
  </svg>
);

const Particles: React.FC = () => (
  <>
    {[[8, 18, 3, 0], [22, 8, 2, 1.2], [55, 5, 2, 2.1], [38, 30, 2.4, 0.6], [14, 52, 2, 1.8], [60, 44, 2, 3], [30, 66, 2.4, 2.4]].map(([x, y, r, d], i) => (
      <i key={i} className="fx-particle absolute rounded-full" style={{ left: `${x}%`, top: `${y}%`, width: r * 2, height: r * 2, background: 'var(--fx-particle)', animationDelay: `${d}s` }} />
    ))}
  </>
);

export const HeroArt: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const still = useStill();
  useParallax(ref);
  return (
    <div ref={ref} className="fx-scene" role="img" aria-label="A student with her books in front of a European city, with the EU flag">
      {/* the city photograph, faded into the page on its left edge */}
      <motion.div className="fx-layer fx-bg" style={{ ['--d' as any]: '-6px' }} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.6, ease }}>
        <img src="/hero/europe-bg.webp" width={1672} height={941} alt="" className="fx-bgimg" draggable={false} fetchPriority="high" />
      </motion.div>

      {/* the animated EU flag, planted behind the student */}
      <motion.div className="fx-layer" style={{ ['--d' as any]: '24px' }} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1.2, delay: 0.9, ease }}>
        <div className="fx-flag">
          <img src="/hero/eu-flag.webp" width={343} height={332} alt="" className="block w-full h-auto" draggable={false} />
          <i className="fx-pole" aria-hidden />
        </div>
      </motion.div>

      {/* the student: the supplied transparent photograph, untouched */}
      <motion.div className="fx-layer" style={{ ['--d' as any]: '16px' }} initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.5, ease }}>
        <img src="/hero/student.webp" width={864} height={996} alt="A smiling student holding her books" className="fx-student" draggable={false} fetchPriority="high" />
      </motion.div>

      {/* waves in front of her, with a plane flying along them */}
      <motion.div className="fx-layer" style={{ ['--d' as any]: '-10px' }} initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.3, delay: 0.8, ease }}>
        <Wave still={still} />
      </motion.div>
      <div className="fx-layer pointer-events-none" style={{ ['--d' as any]: '30px' }}><Particles /></div>
    </div>
  );
};
