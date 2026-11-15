import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  User, Mail, GraduationCap, MapPin, CalendarDays, ChevronDown, ArrowRight, ShieldCheck, FileCheck2, BookOpenCheck, Headphones, Loader2, Check,
} from 'lucide-react';
import { FerexVectorMark } from '../components/Logo';
import { getLeadFormConfig, createEducationLead, type LeadFormConfig, DEFAULT_LEAD_FORM_CONFIG } from '../lib/api/educationLeads';
import { useDestinations } from '../hooks/useDestinations';
import { sortByFeatured } from '../lib/api/destinations';

const FLAGS: Record<string, string> = {
  poland: '🇵🇱', germany: '🇩🇪', italy: '🇮🇹', france: '🇫🇷', spain: '🇪🇸', 'united kingdom': '🇬🇧', uk: '🇬🇧', ireland: '🇮🇪', moldova: '🇲🇩', hungary: '🇭🇺',
  lithuania: '🇱🇹', latvia: '🇱🇻', albania: '🇦🇱', australia: '🇦🇺', austria: '🇦🇹', bulgaria: '🇧🇬', finland: '🇫🇮', georgia: '🇬🇪', greece: '🇬🇷', malaysia: '🇲🇾',
  malta: '🇲🇹', mauritius: '🇲🇺', montenegro: '🇲🇪', 'new zealand': '🇳🇿', sweden: '🇸🇪', 'czech republic': '🇨🇿', czechia: '🇨🇿', canada: '🇨🇦', usa: '🇺🇸',
};
const flagOf = (name: string) => FLAGS[name.trim().toLowerCase()] || '🌍';
const FALLBACK_COUNTRIES = ['Poland', 'United Kingdom', 'Germany', 'Italy', 'Spain', 'France'];
const COURSES = ['Medicine (MBBS / MD)', 'Engineering', 'Computer Science / IT', 'Business / MBA', 'Nursing & Health', 'Other'];
const INTAKES = ['February / March 2027', 'September / October 2027', 'Not sure yet'];
const CODES = [
  { code: '+91', label: '🇮🇳 +91' }, { code: '+971', label: '🇦🇪 +971' }, { code: '+966', label: '🇸🇦 +966' }, { code: '+44', label: '🇬🇧 +44' },
  { code: '+49', label: '🇩🇪 +49' }, { code: '+48', label: '🇵🇱 +48' }, { code: '+1', label: '🇺🇸 +1' }, { code: '+373', label: '🇲🇩 +373' }, { code: '+39', label: '🇮🇹 +39' },
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
      <linearGradient id={`sw${flip ? 'b' : 't'}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8C1D4F" /><stop offset="1" stopColor="#4a0220" /></linearGradient>
    </defs>
    <motion.path d="M400 0 L400 150 C330 150 250 110 200 60 C170 30 120 10 90 0 Z" fill={`url(#sw${flip ? 'b' : 't'})`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
    <motion.path d="M90 0 C120 10 170 30 200 60 C250 110 330 150 400 150" fill="none" stroke="#E6B566" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 0.3, ease: 'easeInOut' }} />
    <motion.path d="M60 0 C100 14 160 36 190 74 C240 130 320 170 400 168" fill="none" stroke="#8C1D4F" strokeOpacity="0.25" strokeWidth="1.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.8, delay: 0.5, ease: 'easeInOut' }} />
  </svg>
);

const Field: React.FC<{ icon: React.ReactNode; label: string; required?: boolean; filled: boolean; select?: boolean; children: React.ReactNode; leading?: React.ReactNode }> = ({ icon, label, required, filled, select, children, leading }) => (
  <motion.div variants={rise} className="group relative flex items-center h-14 sm:h-[3.75rem] rounded-full bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 focus-within:border-[#8C1D4F] focus-within:shadow-[0_0_0_4px_rgba(140,29,79,0.10),0_8px_24px_-12px_rgba(87,2,41,0.35)] hover:border-slate-300">
    <span className="pl-5 pr-3 text-[#4a0b24] shrink-0 transition-transform duration-300 group-focus-within:scale-110 group-focus-within:text-[#8C1D4F]">{icon}</span>
    {leading}
    <span className="relative flex-1 h-full min-w-0">
      {children}
      <span aria-hidden className={`pointer-events-none absolute inset-y-0 left-0 right-8 flex items-center text-[15px] sm:text-base text-slate-600 transition-opacity duration-200 ${filled ? 'opacity-0' : 'opacity-100'}`}>
        <span className="truncate">{label}{required && <span className="text-[#C01048] font-bold"> *</span>}</span>
      </span>
    </span>
    {select && <ChevronDown className="absolute right-5 w-5 h-5 text-slate-700 pointer-events-none transition-transform duration-300 group-focus-within:rotate-180" />}
  </motion.div>
);

const control = 'appearance-none absolute inset-0 w-full h-full bg-transparent outline-none text-[15px] sm:text-base text-slate-900 !border-0 !shadow-none !bg-transparent !px-0 pr-8';

export const StudyAbroadLeadLandingPage: React.FC = () => {
  useForceLight();
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

  useEffect(() => { getLeadFormConfig().then(setCfg).catch(() => {}); }, []);

  const countries = useMemo(() => {
    const live = sortByFeatured(destinations.filter(d => d.is_active !== false && d.name.trim().toLowerCase() !== 'india'), destinations, d => d.name).map(d => d.name.trim());
    return live.length ? live : FALLBACK_COUNTRIES;
  }, [destinations]);
  const chips = countries.slice(0, 6);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (cfg.name_enabled && !name.trim()) return setError('Please enter your name.');
    if (phone.replace(/\D/g, '').length < 8) return setError('Please enter a valid WhatsApp number.');
    if (!course || !country || !intake) return setError('Please choose a course, destination and intake.');
    setBusy(true);
    try {
      const lead = await createEducationLead({
        name: cfg.name_enabled ? name.trim() : 'Prospective Student',
        phone: `${code} ${phone.trim()}`,
        email: cfg.email_enabled ? email.trim() || undefined : undefined,
        preferred_country: country,
        degree_level: course,
        source: 'Admissions Lead Landing Page',
        notes: `Course: ${course} · Intake: ${intake}`,
      });
      setDone((lead.name || name).split(' ')[0] || 'there');
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  };

  const features = [
    { icon: FileCheck2, label: 'Admission Support' },
    { icon: BookOpenCheck, label: 'Visa Assistance' },
    { icon: Headphones, label: 'Personal Guidance' },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FBF7F8] text-slate-900 font-sans antialiased selection:bg-[#8C1D4F] selection:text-white">
      <style>{`
        @keyframes lead-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
        @keyframes lead-shimmer { 0% { transform: translateX(-120%) } 60%,100% { transform: translateX(220%) } }
        .lead-cta::after { content:''; position:absolute; inset:0; width:40%; background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent); animation: lead-shimmer 3.2s ease-in-out infinite; }
      `}</style>

      {/* soft background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#F3D9E2]/70 blur-3xl" style={{ animation: 'lead-float 9s ease-in-out infinite' }} />
        <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-[#F7E7C8]/50 blur-3xl" style={{ animation: 'lead-float 11s ease-in-out infinite 1s' }} />
        <div className="absolute -bottom-40 left-1/4 w-[32rem] h-[32rem] rounded-full bg-[#EBC9D6]/50 blur-3xl" style={{ animation: 'lead-float 13s ease-in-out infinite 2s' }} />
      </div>
      <Swoosh className="pointer-events-none absolute top-0 right-0 w-[16rem] sm:w-[22rem] lg:w-[34rem] h-28 sm:h-40 lg:h-56" />
      <Swoosh flip className="pointer-events-none absolute bottom-0 right-0 w-[18rem] sm:w-[26rem] lg:w-[38rem] h-24 sm:h-36 lg:h-52 opacity-95" />

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8 pt-6 pb-24 lg:pb-28">
        <header className="flex items-center justify-between lg:justify-start lg:gap-8">
          <div className="w-full lg:w-auto flex justify-center lg:justify-start">
            <motion.div initial={{ opacity: 0, y: -14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7 }} className="inline-flex items-center gap-3">
              <motion.span animate={{ rotate: [0, -6, 6, 0] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 4 }}><FerexVectorMark color="#570229" size="lg" /></motion.span>
              <span className="flex flex-col leading-none">
                <span className="font-serif font-black tracking-wider text-[#570229] text-3xl sm:text-4xl">FEREX</span>
                <span className="mt-1 text-[11px] sm:text-xs font-extrabold tracking-[0.42em] text-[#570229]">EDUCATION</span>
              </span>
            </motion.div>
          </div>
          <Link to="/login" className="hidden lg:inline-flex h-10 px-5 items-center rounded-full border border-[#570229]/20 bg-white/70 text-sm font-semibold text-[#570229] hover:bg-white transition-colors">Student login</Link>
        </header>

        <div className="mt-8 lg:mt-14 grid lg:grid-cols-[1.05fr_minmax(0,30rem)] gap-10 lg:gap-16 items-center">
          {/* Headline */}
          <motion.div variants={stagger(0.1, 0.15)} initial="hidden" animate="show" className="text-center lg:text-left">
            <motion.span variants={rise} className="inline-flex items-center gap-2 rounded-full bg-[#F3DCE5] px-4 py-1.5 text-sm font-semibold text-[#570229]">
              <GraduationCap className="w-4 h-4" /> Study Abroad
            </motion.span>
            <motion.h1 variants={rise} className="mt-4 font-extrabold tracking-tight leading-[1.08] text-[2.1rem] sm:text-5xl lg:text-[3.6rem] text-[#1F2937]">
              Get Expert <span className="text-[#6B0F36]">Admission &amp; Visa Support</span>
            </motion.h1>

            {/* desktop-only extras */}
            <motion.ul variants={stagger(0.1)} className="hidden lg:flex mt-10 gap-4">
              {features.map(f => (
                <motion.li key={f.label} variants={rise} whileHover={{ y: -4 }} className="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur border border-white shadow-[0_10px_30px_-18px_rgba(87,2,41,0.5)] px-4 py-3">
                  <span className="w-10 h-10 rounded-xl bg-[#F3DCE5] text-[#6B0F36] flex items-center justify-center"><f.icon className="w-5 h-5" /></span>
                  <span className="text-sm font-bold text-slate-800 leading-tight">{f.label}</span>
                </motion.li>
              ))}
            </motion.ul>
            <motion.div variants={rise} className="hidden lg:block mt-10">
              <p className="text-sm font-bold text-slate-700 mb-3">Top Study Destinations</p>
              <div className="flex flex-wrap gap-2.5">
                {chips.map((c, i) => (
                  <motion.button key={c} type="button" onClick={() => setCountry(c)} whileHover={{ y: -3, scale: 1.04 }} whileTap={{ scale: 0.97 }} animate={{ y: [0, -3, 0] }} transition={{ y: { duration: 3 + (i % 3), repeat: Infinity, delay: i * 0.3 } }}
                    className={`inline-flex items-center gap-2 rounded-full px-4 h-11 text-sm font-semibold shadow-[0_6px_18px_-10px_rgba(15,23,42,0.4)] cursor-pointer transition-colors ${country === c ? 'bg-[#6B0F36] text-white' : 'bg-white text-slate-800'}`}>
                    <span className="text-lg">{flagOf(c)}</span>{c}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Form card */}
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-[2rem] sm:rounded-[2.25rem] bg-white/95 backdrop-blur border border-white shadow-[0_30px_80px_-30px_rgba(87,2,41,0.45)] p-5 sm:p-8">
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
                <motion.form key="form" onSubmit={submit} variants={stagger(0.07, 0.4)} initial="hidden" animate="show" exit={{ opacity: 0, y: -10 }} className="space-y-3.5" noValidate>
                  <motion.div variants={rise} className="text-center pb-2">
                    <p className="text-sm sm:text-base font-semibold tracking-[0.32em] text-slate-600">REQUEST FREE</p>
                    <h2 className="mt-1 text-[1.7rem] sm:text-4xl font-extrabold tracking-tight text-[#1F2937]">Study Abroad <span className="text-[#6B0F36]">Counselling</span></h2>
                    <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.9, duration: 0.7 }} className="block mx-auto mt-3 h-[3px] w-20 rounded-full bg-gradient-to-r from-transparent via-[#8C1D4F] to-transparent" />
                  </motion.div>

                  {cfg.name_enabled && (
                    <Field icon={<User className="w-6 h-6" />} label="Full Name" required filled={!!name}>
                      <input aria-label="Full name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} className={control} />
                    </Field>
                  )}

                  <Field icon={<svg viewBox="0 0 24 24" className="w-6 h-6" fill="#22A559" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.4.1.6-.1l.8-1c.2-.2.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.8-.1 1.4Z" /></svg>} label="WhatsApp Number" required filled={!!phone}
                    leading={<select aria-label="Country code" value={code} onChange={e => setCode(e.target.value)} className="appearance-none !w-[4.2rem] h-9 !px-1 text-sm font-semibold text-slate-800 !border-0 !bg-transparent !shadow-none outline-none cursor-pointer shrink-0">{CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}</select>}>
                    <input aria-label="WhatsApp number" type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={e => setPhone(e.target.value)} className={control} />
                  </Field>

                  {cfg.email_enabled && (
                    <Field icon={<Mail className="w-6 h-6" />} label="Email Address" filled={!!email}>
                      <input aria-label="Email address" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={control} />
                    </Field>
                  )}

                  <Field icon={<GraduationCap className="w-6 h-6" />} label="Preferred Course / Program" required select filled={!!course}>
                    <select aria-label="Preferred course" value={course} onChange={e => setCourse(e.target.value)} className={`${control} cursor-pointer`}><option value="" /> {COURSES.map(c => <option key={c}>{c}</option>)}</select>
                  </Field>
                  <Field icon={<MapPin className="w-6 h-6" />} label="Preferred Study Destination" required select filled={!!country}>
                    <select aria-label="Preferred destination" value={country} onChange={e => setCountry(e.target.value)} className={`${control} cursor-pointer`}><option value="" /> {countries.map(c => <option key={c}>{c}</option>)}</select>
                  </Field>
                  <Field icon={<CalendarDays className="w-6 h-6" />} label="Preferred Intake" required select filled={!!intake}>
                    <select aria-label="Preferred intake" value={intake} onChange={e => setIntake(e.target.value)} className={`${control} cursor-pointer`}><option value="" /> {INTAKES.map(c => <option key={c}>{c}</option>)}</select>
                  </Field>

                  {error && <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [0, -5, 5, -3, 0] }} role="alert" className="text-sm font-semibold text-rose-700 text-center">{error}</motion.p>}

                  <motion.button variants={rise} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.98 }} type="submit" disabled={busy}
                    className="lead-cta relative overflow-hidden w-full h-14 sm:h-16 rounded-full bg-gradient-to-r from-[#8C1D4F] via-[#6B0F36] to-[#4a0220] text-white text-lg sm:text-xl font-bold shadow-[0_16px_34px_-14px_rgba(87,2,41,0.8)] inline-flex items-center justify-center gap-3 disabled:opacity-70 cursor-pointer">
                    {busy ? <><Loader2 className="w-5 h-5 animate-spin" />Sending…</> : <>Get Free Counselling <motion.span animate={{ x: [0, 6, 0] }} transition={{ duration: 1.6, repeat: Infinity }}><ArrowRight className="w-6 h-6" /></motion.span></>}
                  </motion.button>

                  <motion.p variants={rise} className="flex items-center justify-center gap-2 text-sm text-slate-600"><ShieldCheck className="w-5 h-5 text-emerald-600 fill-emerald-100" />Your details are 100% confidential.</motion.p>

                  <motion.ul variants={rise} className="lg:hidden grid grid-cols-3 pt-3 divide-x divide-slate-200">
                    {features.map(f => (
                      <li key={f.label} className="px-2 flex flex-col items-center gap-1.5 text-center">
                        <f.icon className="w-8 h-8 text-[#8C1D4F]" strokeWidth={1.5} />
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
        <motion.div variants={stagger(0.06, 0.9)} initial="hidden" animate="show" className="lg:hidden mt-10 text-center">
          <motion.div variants={rise} className="flex items-center justify-center gap-4 mb-4">
            <span className="h-px w-10 bg-[#8C1D4F]/50" /><h3 className="text-xl font-bold text-slate-800">Top Study Destinations</h3><span className="h-px w-10 bg-[#8C1D4F]/50" />
          </motion.div>
          <div className="flex flex-wrap justify-center gap-2.5">
            {chips.map(c => (
              <motion.button key={c} type="button" variants={rise} whileTap={{ scale: 0.95 }} onClick={() => setCountry(c)}
                className={`inline-flex items-center gap-2 rounded-full px-4 h-12 text-base font-semibold shadow-[0_6px_18px_-10px_rgba(15,23,42,0.45)] cursor-pointer ${country === c ? 'bg-[#6B0F36] text-white' : 'bg-white text-slate-800'}`}>
                <span className="text-xl">{flagOf(c)}</span>{c}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default StudyAbroadLeadLandingPage;
