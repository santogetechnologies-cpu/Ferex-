import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  User, Mail, GraduationCap, MapPin, CalendarDays, ChevronDown, ArrowRight, ShieldCheck, FileCheck2, BookOpenCheck, Headphones, Check,
} from 'lucide-react';
import { FerexVectorMark } from '../components/Logo';
import { getLeadFormConfig, createEducationLead, type LeadFormConfig, DEFAULT_LEAD_FORM_CONFIG } from '../lib/api/educationLeads';
import { useDestinations } from '../hooks/useDestinations';
import { sortByFeatured } from '../lib/api/destinations';
import { CountryFlag } from '../components/CountryFlag';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import { CapLoader } from '../components/CapLoader';

const FALLBACK_COUNTRIES = ['Poland', 'United Kingdom', 'Germany', 'Italy', 'Spain', 'France'];
const MAX_BUBBLES = 12;
const COURSES = ['Medicine (MBBS / MD)', 'Engineering', 'Computer Science / IT', 'Business / MBA', 'Nursing & Health', 'Other'];
const INTAKES = ['February / March 2027', 'September / October 2027', 'Not sure yet'];
const CODES = [
  { code: '+91', label: '+91' }, { code: '+971', label: '+971' }, { code: '+966', label: '+966' }, { code: '+44', label: '+44' },
  { code: '+49', label: '+49' }, { code: '+48', label: '+48' }, { code: '+1', label: '+1' }, { code: '+373', label: '+373' }, { code: '+39', label: '+39' },
];

const rise: Variants = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } };
const stagger = (gap = 0.08, delay = 0): Variants => ({ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } });

// The page is always light, like the brand artwork, whatever theme the portal uses.
function useForceLight() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
    return () => { if (wasDark) { root.classList.add('dark'); root.style.colorScheme = 'dark'; } };
  }, []);
}

const Swoosh: React.FC<{ className?: string; flip?: boolean }> = ({ className = '', flip }) => (
  <svg viewBox="0 0 400 200" preserveAspectRatio="none" className={className} style={flip ? { transform: 'scaleY(-1)' } : undefined} aria-hidden>
    <defs>
      <linearGradient id={`sw${flip ? 'b' : 't'}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#68092A" /><stop offset="1" stopColor="#5A0122" /></linearGradient>
    </defs>
    <motion.path d="M400 0 L400 150 C330 150 250 110 200 60 C170 30 120 10 90 0 Z" fill={`url(#sw${flip ? 'b' : 't'})`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
    <motion.path d="M90 0 C120 10 170 30 200 60 C250 110 330 150 400 150" fill="none" stroke="#E6B566" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 0.3, ease: 'easeInOut' }} />
    <motion.path d="M60 0 C100 14 160 36 190 74 C240 130 320 170 400 168" fill="none" stroke="#68092A" strokeOpacity="0.25" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, delay: 0.5, ease: 'easeInOut' }} />
  </svg>
);

const FlagBubble: React.FC<{ name: string; active: boolean; size?: 'md' | 'lg'; compact?: boolean; onClick: () => void; index: number }> = ({ name, active, size = 'md', compact, onClick, index }) => {
  const dim = compact ? 'w-11 h-11' : size === 'lg' ? 'w-[4.25rem] h-[4.25rem]' : 'w-16 h-16';
  return (
    <motion.button type="button" onClick={onClick} aria-pressed={active} aria-label={name}
      initial={{ opacity: 0, y: 18, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.5 + index * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -5 }} whileTap={{ scale: 0.94 }} className="group flex flex-col items-center gap-2 cursor-pointer outline-none">
      <span className={`relative ${dim} rounded-full overflow-hidden shadow-[0_10px_26px_-12px_rgba(87,2,41,0.55)] transition-transform duration-300 group-hover:scale-105 group-focus-visible:ring-4 ring-[#68092A]/30`}>
        {/* animated border: a coloured ring that keeps circling the flag */}
        <span aria-hidden className="absolute -inset-[60%] lead-ring" style={{ background: active ? 'conic-gradient(from 0deg,#68092A,#E6B566,#68092A,#E3BFCB,#68092A)' : 'conic-gradient(from 0deg,#E3BFCB,#C9A0B3,#E6B566,#E3BFCB)' }} />
        <span className="absolute inset-[3px] rounded-full bg-white overflow-hidden"><CountryFlag name={name} className="w-full h-full rounded-full" /></span>
        {active && <motion.span layoutId="flag-check" className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full bg-[#68092A] text-white flex items-center justify-center ring-2 ring-white"><Check className="w-3 h-3" strokeWidth={3} /></motion.span>}
      </span>
      <span className={`font-semibold leading-tight text-center ${compact ? 'text-[10px] max-w-[3.6rem]' : 'text-[13px] max-w-[5.5rem]'} transition-colors ${active ? 'text-[#68092A]' : 'text-slate-700'}`}>{name}</span>
    </motion.button>
  );
};

const Field: React.FC<{ icon: React.ReactNode; label: string; required?: boolean; filled: boolean; select?: boolean; children: React.ReactNode; leading?: React.ReactNode }> = ({ icon, label, required, filled, select, children, leading }) => (
  <motion.div variants={rise} className="group relative flex items-center h-12 sm:h-[3.4rem] rounded-full bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 focus-within:border-[#68092A] focus-within:shadow-[0_0_0_4px_rgba(140,29,79,0.10),0_8px_24px_-12px_rgba(87,2,41,0.35)] hover:border-slate-300">
    <span className="pl-4 sm:pl-5 pr-2.5 sm:pr-3 text-[#4a0b24] shrink-0 transition-transform duration-300 group-focus-within:scale-110 group-focus-within:text-[#68092A]">{icon}</span>
    {leading}
    <span className="relative flex-1 h-full min-w-0">
      {children}
      <span aria-hidden className={`pointer-events-none absolute inset-y-0 left-0 right-8 flex items-center text-[13.5px] sm:text-base text-slate-600 transition-opacity duration-200 ${filled ? 'opacity-0' : 'opacity-100'}`}>
        <span className="truncate">{label}{required && <span className="text-[#C01048] font-bold"> *</span>}</span>
      </span>
    </span>
    {select && <ChevronDown className="absolute right-5 w-5 h-5 text-slate-700 pointer-events-none transition-transform duration-300 group-focus-within:rotate-180" />}
  </motion.div>
);


// A styled dropdown instead of the browser's own select list, which is oversized and unbranded on phones.
// The list is drawn on the page body so no parent can clip it, and it opens upwards when there is no room below.
const Picker: React.FC<{ label: string; value: string; options: string[]; onChange: (v: string) => void; flags?: boolean; compact?: boolean }> = ({ label, value, options, onChange, flags, compact }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; max: number }>({ left: 0, width: 0, max: 240 });
  const [hot, setHot] = useState(-1);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const place = () => {
    const r = btn.current?.getBoundingClientRect(); if (!r) return;
    const below = window.innerHeight - r.bottom - 12, above = r.top - 12, up = below < 200 && above > below;
    const width = compact ? Math.max(r.width, 120) : r.width;
    setPos({ left: Math.min(r.left, window.innerWidth - width - 8), width, max: Math.max(120, Math.min(260, up ? above : below)), ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }) });
  };
  const toggle = () => { if (!open) { place(); setHot(Math.max(0, options.indexOf(value))); } setOpen(o => !o); };
  const pick = (v: string) => { onChange(v); setOpen(false); btn.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent | TouchEvent) => { const t = e.target as Node; if (!btn.current?.contains(t) && !list.current?.contains(t)) setOpen(false); };
    const close = (e: Event) => { if (!list.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away); document.addEventListener('touchstart', away);
    window.addEventListener('resize', close); window.addEventListener('scroll', close, true);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('touchstart', away); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); };
  }, [open]);
  useEffect(() => { if (open) list.current?.querySelector<HTMLElement>(`[data-i="${hot}"]`)?.scrollIntoView({ block: 'nearest' }); }, [hot, open]);

  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!open) { toggle(); return; } setHot(h => Math.min(options.length - 1, Math.max(0, h + (e.key === 'ArrowDown' ? 1 : -1)))); }
    if ((e.key === 'Enter' || e.key === ' ') && open && hot >= 0) { e.preventDefault(); pick(options[hot]); }
  };

  return (
    <>
      <button ref={btn} type="button" role="combobox" aria-label={label} aria-expanded={open} aria-haspopup="listbox" onClick={toggle} onKeyDown={key}
        className={compact ? 'h-9 px-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-800 cursor-pointer shrink-0 outline-none' : 'absolute inset-0 w-full h-full text-left flex items-center pr-9 text-[14px] sm:text-base text-slate-900 outline-none cursor-pointer'}>
        {flags && value && <span className="w-5 h-5 rounded-full overflow-hidden mr-2 shrink-0 ring-1 ring-slate-200"><CountryFlag name={value} className="w-full h-full" /></span>}
        <span className="truncate">{value}</span>
        {compact && <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && createPortal(
        <motion.ul ref={list} role="listbox" aria-label={label} initial={{ opacity: 0, y: pos.bottom !== undefined ? 6 : -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.16 }}
          style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.max, zIndex: 1000 }}
          className="overflow-y-auto overscroll-contain rounded-2xl bg-white border border-[#E9D3DC] shadow-[0_24px_50px_-18px_rgba(87,2,41,0.45)] p-1.5 font-sans">
          {options.map((o, i) => (
            <li key={o} data-i={i} role="option" aria-selected={o === value} onMouseEnter={() => setHot(i)} onClick={() => pick(o)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[14px] font-semibold cursor-pointer transition-colors ${o === value ? 'text-[#68092A] bg-[#F8E9EF]' : i === hot ? 'bg-[#FBF1F5] text-slate-900' : 'text-slate-700'}`}>
              {flags && <span className="w-6 h-6 rounded-full overflow-hidden shrink-0 ring-1 ring-slate-200"><CountryFlag name={o} className="w-full h-full" /></span>}
              <span className="flex-1 truncate">{o}</span>
              {o === value && <Check className="w-4 h-4 shrink-0" strokeWidth={3} />}
            </li>
          ))}
        </motion.ul>, document.body)}
    </>
  );
};

const control = 'appearance-none absolute inset-0 w-full h-full bg-transparent outline-none text-[14px] sm:text-base text-slate-900 !border-0 !shadow-none !bg-transparent !px-0 pr-8';

export const StudyAbroadLeadLandingPage: React.FC = () => {
  useForceLight();
  const stageRef = React.useRef<HTMLDivElement>(null);
  const fitRef = React.useRef(1);
  const [fit, setFit] = useState(1);
  const [topPx, setTopPx] = useState(0);
  const [short, setShort] = useState(false);
  useEffect(() => {
    // The page never scrolls: if the content is taller than the screen it is scaled down to fit, and widened by the same
    // amount so the form still fills the screen width instead of shrinking into the middle.
    const measure = () => {
      const el = stageRef.current; if (!el) return;
      const vh = window.innerHeight;
      setShort(vh < 700 && window.innerWidth < 1024);
      const h = el.offsetHeight || vh;   // layout height at the current width
      const f = Math.max(0.6, Math.min(1, vh / h));
      if (Math.abs(f - fitRef.current) > 0.015) { fitRef.current = f; setFit(f); }
      setTopPx(window.innerWidth >= 1024 ? Math.max(0, (vh - h * fitRef.current) / 2.2) : 0);
    };
    measure();
    const ro = new ResizeObserver(measure); if (stageRef.current) ro.observe(stageRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  const { destinations } = useDestinations();
  const [cfg, setCfg] = useState<LeadFormConfig>(DEFAULT_LEAD_FORM_CONFIG);
  const [name, setName] = useState('');
  const [code, setCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState('');
  const [country, setCountry] = useState('');
  const [intake, setIntake] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadCfg = React.useCallback(() => { getLeadFormConfig().then(setCfg).catch(() => {}); }, []);
  useEffect(loadCfg, [loadCfg]);
  useRealtimeTable('system_config', loadCfg);

  const { countries, chips } = useMemo(() => {
    const live = sortByFeatured(destinations.filter(d => d.is_active !== false && d.name.trim().toLowerCase() !== 'india'), destinations, d => d.name).map(d => d.name.trim());
    const all = live.length ? live : FALLBACK_COUNTRIES;
    const picked = (cfg.highlighted_countries || []).map(n => all.find(a => a.toLowerCase() === n.trim().toLowerCase())).filter(Boolean) as string[];
    const first = picked.length ? picked : all.slice(0, 6);
    return { countries: [...first, ...all.filter(c => !first.includes(c))], chips: first.slice(0, MAX_BUBBLES) };
  }, [destinations, cfg.highlighted_countries]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (cfg.name_enabled && !name.trim()) return setError('Please enter your name.');
    if (phone.replace(/\D/g, '').length < 8) return setError('Please enter a valid WhatsApp number.');
    if (cfg.degree_level_enabled && !course) return setError('Please choose a course.');
    if (cfg.country_enabled && !country) return setError('Please choose a destination.');
    if (cfg.intake_enabled && !intake) return setError('Please choose an intake.');
    setBusy(true);
    try {
      const lead = await createEducationLead({
        name: cfg.name_enabled ? name.trim() : 'Prospective Student',
        phone: `${code} ${phone.trim()}`,
        email: cfg.email_enabled ? email.trim() || undefined : undefined,
        preferred_country: cfg.country_enabled ? country : 'Europe',
        degree_level: cfg.degree_level_enabled ? course : undefined,
        source: 'Admissions Lead Landing Page',
        notes: [cfg.degree_level_enabled && `Course: ${course}`, cfg.intake_enabled && `Intake: ${intake}`].filter(Boolean).join(' · '),
      });
      setDone((lead.name || name).split(' ')[0] || 'there');
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  };

  const headWords = (cfg.headline || 'Get Expert Admission & Visa Support').trim().split(/\s+/);
  const headSplit = Math.max(1, Math.ceil(headWords.length / 3));
  const features = [
    { icon: FileCheck2, label: 'Admission Support' },
    { icon: BookOpenCheck, label: 'Visa Assistance' },
    { icon: Headphones, label: 'Personal Guidance' },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#FBF7F8] text-slate-900 font-sans antialiased selection:bg-[#68092A] selection:text-white">
      <style>{`
        @keyframes lead-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
        @keyframes lead-shimmer { 0% { transform: translateX(-120%) } 60%,100% { transform: translateX(220%) } }
        @keyframes lead-spin { to { transform: rotate(360deg) } }
        .lead-ring { animation: lead-spin 5s linear infinite; }
        html, body { overflow: hidden; height: 100%; overscroll-behavior: none; }
        @media (prefers-reduced-motion: reduce) { .lead-ring { animation: none } }
        .lead-cta::after { content:''; position:absolute; inset:0; width:40%; background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent); animation: lead-shimmer 3.2s ease-in-out infinite; }
      `}</style>

      {/* soft background: clipped so it can never widen the page */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#F3D9E2]/70 blur-3xl" style={{ animation: 'lead-float 9s ease-in-out infinite' }} />
        <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-[#F7E7C8]/50 blur-3xl" style={{ animation: 'lead-float 11s ease-in-out infinite 1s' }} />
        <div className="absolute -bottom-40 left-1/4 w-[32rem] h-[32rem] rounded-full bg-[#EBC9D6]/50 blur-3xl" style={{ animation: 'lead-float 13s ease-in-out infinite 2s' }} />
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <Swoosh className="absolute top-0 right-0 w-36 sm:w-[22rem] lg:w-[34rem] h-14 sm:h-40 lg:h-56" />
        <Swoosh flip className="absolute bottom-0 right-0 w-40 sm:w-[26rem] lg:w-[38rem] h-10 sm:h-36 lg:h-52 opacity-95" />
      </div>

      <div ref={stageRef} style={{ transform: `scale(${fit})`, transformOrigin: 'top left', top: topPx, width: `${100 / fit}%` }} className="absolute left-0 z-10 px-3 sm:px-8 pt-3 sm:pt-5 pb-3">
        <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-start">
          <div className="w-full lg:w-auto flex justify-start">
            <motion.div initial={{ opacity: 0, y: -14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7 }} className="inline-flex items-center gap-3">
              <motion.span animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 4 }}><FerexVectorMark color="#5A0122" size="md" /></motion.span>
              <span className="flex flex-col leading-none">
                <span className="font-serif font-black tracking-wider text-[#5A0122] text-2xl sm:text-4xl">FEREX</span>
                <span className="mt-0.5 text-[9px] sm:text-xs font-extrabold tracking-[0.4em] text-[#5A0122]">EDUCATION</span>
              </span>
            </motion.div>
          </div>
        </header>

        <div className="mt-3 lg:mt-8 grid lg:grid-cols-[1.05fr_minmax(0,30rem)] gap-4 lg:gap-14 items-center">
          {/* Headline */}
          <motion.div variants={stagger(0.1, 0.15)} initial="hidden" animate="show" className="text-center lg:text-left">
            <motion.span variants={rise} className={`${short ? "hidden" : "inline-flex"} items-center gap-2 rounded-full bg-[#E3BFCB] px-4 py-1.5 text-sm font-semibold text-[#5A0122]`}>
              <GraduationCap className="w-4 h-4" /> Study Abroad
            </motion.span>
            <motion.h1 variants={rise} className="mt-2 lg:mt-4 font-extrabold tracking-tight leading-[1.08] text-[1.65rem] sm:text-4xl lg:text-[3.4rem] text-[#1A1A1A]">
              {headWords.slice(0, headSplit).join(' ')} <span className="text-[#68092A]">{headWords.slice(headSplit).join(' ')}</span>
            </motion.h1>
            {cfg.subheadline?.trim() && <motion.p variants={rise} className="mt-3 text-base text-slate-600 max-w-xl mx-auto lg:mx-0">{cfg.subheadline}</motion.p>}

            {/* desktop-only extras */}
            <motion.ul variants={stagger(0.1)} className="hidden lg:flex mt-8 gap-7">
              {features.map(f => (
                <motion.li key={f.label} variants={rise} className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
                  <f.icon className="w-5 h-5 text-[#68092A]" strokeWidth={1.6} />{f.label}
                </motion.li>
              ))}
            </motion.ul>
            {chips.length > 0 && (
              <div className="hidden lg:block mt-12">
                <p className="text-xs font-bold tracking-[0.3em] uppercase text-slate-500 mb-5">Top Study Destinations</p>
                <div className="flex flex-wrap gap-x-5 gap-y-5 max-w-2xl">
                  {chips.map((c, i) => <FlagBubble key={c} name={c} size="lg" index={i} active={country === c} onClick={() => setCountry(c)} />)}
                </div>
              </div>
            )}
          </motion.div>

          {/* Form card */}
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-[1.75rem] sm:rounded-[2rem] bg-white/95 backdrop-blur border border-white shadow-[0_30px_80px_-30px_rgba(87,2,41,0.45)] p-4 sm:p-6">
            <AnimatePresence mode="wait">
              {done ? (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-10 text-center space-y-4" role="status">
                  <div className="relative mx-auto w-20 h-20">
                    {[0, 1].map(i => <motion.span key={i} className="absolute inset-0 rounded-full bg-emerald-400/30" animate={{ scale: [1, 1.9], opacity: [0.6, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.9 }} />)}
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="absolute inset-0 rounded-full bg-emerald-500 flex items-center justify-center text-white"><Check className="w-10 h-10" strokeWidth={3} /></motion.span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900">Thank you, {done}!</h2>
                  <p className="text-slate-600">We’ll call you on WhatsApp shortly.</p>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={submit} variants={stagger(0.07, 0.4)} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-2.5 sm:space-y-3" noValidate>
                  <motion.div variants={rise} className="text-center pb-2">
                    <p className="text-xs sm:text-sm font-semibold tracking-[0.32em] text-slate-600">REQUEST FREE</p>
                    <h2 className="mt-1 text-[1.4rem] sm:text-[2rem] font-extrabold tracking-tight text-[#1A1A1A]">Study Abroad <span className="text-[#68092A]">Counselling</span></h2>
                    <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.9, duration: 0.7 }} className="block mx-auto mt-3 h-[3px] w-20 rounded-full bg-gradient-to-r from-transparent via-[#68092A] to-transparent" />
                  </motion.div>

                  {cfg.name_enabled && (
                    <Field icon={<User className="w-6 h-6" />} label="Full Name" required filled={!!name}>
                      <input aria-label="Full name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} className={control} />
                    </Field>
                  )}

                  <Field icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="#22A559" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.8-.1 1.4Z" /></svg>} label="WhatsApp Number" required filled={!!phone}
                    leading={<Picker compact label="Country code" value={code} options={CODES.map(c => c.code)} onChange={setCode} />}>
                    <input aria-label="WhatsApp number" type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={e => setPhone(e.target.value)} className={control} />
                  </Field>

                  {cfg.email_enabled && (
                    <Field icon={<Mail className="w-6 h-6" />} label="Email Address" filled={!!email}>
                      <input aria-label="Email address" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={control} />
                    </Field>
                  )}

                  {cfg.degree_level_enabled && (
                    <Field icon={<GraduationCap className="w-6 h-6" />} label="Preferred Course / Program" required select filled={!!course}>
                      <Picker label="Preferred course" value={course} options={COURSES} onChange={setCourse} />
                    </Field>
                  )}
                  {cfg.country_enabled && (
                    <Field icon={<MapPin className="w-6 h-6" />} label="Preferred Study Destination" required select filled={!!country}>
                      <Picker flags label="Preferred destination" value={country} options={countries} onChange={setCountry} />
                    </Field>
                  )}
                  {cfg.intake_enabled && (
                    <Field icon={<CalendarDays className="w-6 h-6" />} label="Preferred Intake" required select filled={!!intake}>
                      <Picker label="Preferred intake" value={intake} options={INTAKES} onChange={setIntake} />
                    </Field>
                  )}

                  {error && <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -5, 5, -3, 0] }} role="alert" className="text-sm font-semibold text-rose-700 text-center">{error}</motion.p>}

                  <motion.button variants={rise} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} type="submit" disabled={busy}
                    className="lead-cta relative overflow-hidden w-full h-12 sm:h-14 rounded-full bg-gradient-to-r from-[#68092A] via-[#68092A] to-[#5A0122] text-white text-lg sm:text-xl font-bold shadow-[0_16px_34px_-14px_rgba(87,2,41,0.8)] inline-flex items-center justify-center gap-3 disabled:opacity-70 cursor-pointer">
                    {busy ? <CapLoader size="sm" tone="light" /> : <>{cfg.submit_button_text?.trim() || 'Get Free Counselling'} <motion.span animate={{ x: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}><ArrowRight className="w-6 h-6" /></motion.span></>}
                  </motion.button>


                  <motion.ul variants={rise} className={`${short ? "hidden" : "grid"} lg:hidden grid-cols-3 pt-2 divide-x divide-slate-200`}>
                    {features.map(f => (
                      <li key={f.label} className="px-2 flex flex-col items-center gap-1.5 text-center">
                        <f.icon className="w-8 h-8 text-[#68092A]" strokeWidth={1.5} />
                        <span className="text-sm font-bold text-slate-800 leading-tight">{f.label.split(' ')[0]}<br />{f.label.split(' ')[1]}</span>
                      </li>
                    ))}
                  </motion.ul>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Mobile destinations */}
        {chips.length > 0 && (
          <div className="lg:hidden mt-3 text-center">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Top Study Destinations</h3>
            <div className="grid grid-cols-6 gap-x-1.5 gap-y-2 justify-items-center">
              {chips.slice(0, 12).map((c, i) => <FlagBubble key={c} name={c} index={i} compact active={country === c} onClick={() => setCountry(c)} />)}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default StudyAbroadLeadLandingPage;
