import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Calculator, ChevronRight, Landmark, ShieldCheck } from 'lucide-react';
import { HeroArt } from './HeroArt';
import './hero.css';

const ease = [0.16, 1, 0.3, 1] as const;
const rise = (delay: number) => ({ initial: { opacity: 0, y: 26 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay, ease } });

const EuMark: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
    <circle cx="20" cy="20" r="20" fill="#1D3C98" />
    {Array.from({ length: 12 }).map((_, i) => { const a = (i / 12) * Math.PI * 2; return <circle key={i} cx={20 + 11 * Math.cos(a)} cy={20 + 11 * Math.sin(a)} r="1.7" fill="#F6C453" />; })}
  </svg>
);

const Stat: React.FC<{ icon: React.ReactNode; value: string; label: string; delay: number }> = ({ icon, value, label, delay }) => (
  <motion.div {...rise(delay)} className="flex items-center gap-3 min-w-0">
    <span className="shrink-0 text-[var(--fx-accent)]">{icon}</span>
    <div className="min-w-0"><div className="fx-stat-num text-2xl sm:text-[1.7rem] leading-none">{value}</div><div className="mt-1 text-xs sm:text-[0.8rem] fx-muted leading-tight">{label}</div></div>
  </motion.div>
);

export const LandingHero: React.FC<{ onApply: () => void; onCalculate: () => void; onBadge: () => void }> = ({ onApply, onCalculate, onBadge }) => (
  <section className="fx fx-hero" aria-labelledby="fx-hero-title">
    <div className="relative mx-auto max-w-[88rem] px-4 sm:px-8 pt-8 pb-16 lg:pt-10 lg:pb-20 grid lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] gap-8 lg:gap-6 items-center">
      {/* Words */}
      <div className="relative z-10 max-w-[48rem] mx-auto lg:mx-0 text-center lg:text-left">
        <motion.button type="button" onClick={onBadge} className="fx-badge" {...rise(0.25)}>
          <EuMark /> Europe Study Pathway <ChevronRight className="w-4 h-4 text-[var(--fx-accent)]" />
        </motion.button>

        <h1 id="fx-hero-title" className="fx-title fx-h1 mt-6">
          <span className="block whitespace-nowrap">
            <motion.span className="inline-block" {...rise(0.4)}>Study in&nbsp;</motion.span>
            <motion.span className="inline-block fx-em" {...rise(0.5)}>Europe</motion.span>
            <motion.span className="inline-block" {...rise(0.6)}>&nbsp;with</motion.span>
          </span>
          <motion.span className="block whitespace-nowrap" {...rise(0.7)}>Expert <span className="fx-em">Admission</span> &amp;</motion.span>
          <motion.span className="block whitespace-nowrap relative w-fit mx-auto lg:mx-0" {...rise(0.8)}>
            Visa Support
            <svg aria-hidden viewBox="0 0 220 24" className="absolute left-full top-[62%] ml-2 w-24 sm:w-36 hidden sm:block overflow-visible">
              <motion.path d="M2 20 C 50 4, 130 2, 218 8" fill="none" stroke="url(#fxuline)" strokeWidth="2.4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 1.3, ease }} />
              <defs><linearGradient id="fxuline" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--fx-accent)" /><stop offset="1" stopColor="var(--fx-accent)" stopOpacity="0" /></linearGradient></defs>
            </svg>
          </motion.span>
        </h1>

        <motion.p className="mt-6 text-base sm:text-lg leading-[1.65] fx-muted max-w-[38rem] mx-auto lg:mx-0" {...rise(0.95)}>
          Direct university applications across <strong className="font-bold" style={{ color: 'var(--fx-text)' }}>Poland, Germany, Czechia, Italy, Spain &amp; France</strong>. End-to-end government academic apostille, university wire verification, and 1-on-1 consular visa mock interviews.
        </motion.p>

        <motion.div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3.5" {...rise(1.1)}>
          <button type="button" onClick={onApply} className="fx-btn fx-btn-primary h-14 px-8 text-base">Apply for Intake 2026–27<ArrowRight className="w-5 h-5" /></button>
          <button type="button" onClick={onCalculate} className="fx-btn fx-btn-ghost h-14 px-7 text-base"><Calculator className="w-[18px] h-[18px] text-[var(--fx-accent)]" />Calculate Total Cost</button>
        </motion.div>

        <div className="mt-10 flex items-stretch justify-center lg:justify-start gap-4 sm:gap-7">
          <Stat delay={1.35} icon={<Landmark className="w-8 h-8" strokeWidth={1.4} />} value="45+" label="Partner EU Universities" />
          <span className="fx-sep" aria-hidden />
          <Stat delay={1.45} icon={<ShieldCheck className="w-8 h-8" strokeWidth={1.4} />} value="100%" label="Govt & MEA Legalized" />
          <span className="fx-sep hidden min-[420px]:block" aria-hidden />
          <Stat delay={1.55} icon={<EuMark size={30} />} value="27" label="Schengen Nations" />
        </div>
      </div>

      {/* Artwork */}
      <div className="relative">
        <HeroArt />
      </div>
    </div>
  </section>
);
