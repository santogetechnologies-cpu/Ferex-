import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AmbientGlow, GlassFrames, EuRibbon, SilkRibbonBack, SilkRibbonFront, Landmarks, FlightPath, Particles } from './art';

const ease = [0.16, 1, 0.3, 1] as const;
const Reveal: React.FC<{ delay: number; from?: 'up' | 'scale' | 'fade' | 'right'; children: React.ReactNode; className?: string }> = ({ delay, from = 'fade', children, className = 'absolute inset-0' }) => (
  <motion.div className={className}
    initial={{ opacity: 0, y: from === 'up' ? 60 : 0, scale: from === 'scale' ? 0.9 : 1, x: from === 'right' ? 60 : 0 }}
    animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
    transition={{ duration: 1.1, delay, ease }}>
    {children}
  </motion.div>
);

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

export const HeroArt: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  useParallax(ref);
  return (
    <div ref={ref} className="fx-art" aria-label="A student with her books in front of European landmarks" role="img">
      <Reveal delay={0.35} from="fade"><AmbientGlow /></Reveal>
      <Reveal delay={0.9} from="fade"><SilkRibbonBack /></Reveal>
      <Reveal delay={0.7} from="scale"><GlassFrames /></Reveal>
      <Reveal delay={1.1} from="right"><EuRibbon /></Reveal>
      <Reveal delay={1.3} from="fade"><FlightPath /></Reveal>

      {/* The student: the supplied transparent photograph, untouched. */}
      <motion.div className="absolute" style={{ left: '35%', bottom: '13.5%', width: '56%' }}
        initial={{ opacity: 0, y: 70 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.55, ease }}>
        <div className="fx-layer !relative !h-auto" style={{ ['--d' as any]: '18px' }}>
          <img src="/hero/student.webp" width={864} height={996} alt="A smiling student holding her books" className="fx-student block w-full h-auto" draggable={false} fetchPriority="high" />
        </div>
      </motion.div>

      <Reveal delay={1.0} from="up"><SilkRibbonFront /></Reveal>
      <Reveal delay={1.5} from="fade"><Landmarks /></Reveal>
      <Reveal delay={1.6} from="fade"><Particles /></Reveal>
    </div>
  );
};
