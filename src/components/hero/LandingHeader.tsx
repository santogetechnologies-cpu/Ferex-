import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, ChevronDown, LogIn, LogOut, Menu, Moon, Sun, User, X } from 'lucide-react';
import { Logo } from '../Logo';
import { useTheme } from '../../contexts/ThemeContext';
import './hero.css';

const LINKS: { id: string; label: string }[] = [
  { id: 'about', label: 'About Ferex' }, { id: 'destinations', label: 'Schengen Destinations' }, { id: 'calculator', label: 'Cost Calculator' },
  { id: 'universities', label: 'Partner Universities' }, { id: 'roadmap', label: 'Admissions Roadmap' }, { id: 'faq', label: 'FAQ' },
];

interface Props {
  signedIn: boolean;
  countries: string[];
  onGoto: (id: string) => void;
  onPickCountry: (country: string) => void;
  onHome: () => void;
  onLogin: () => void;
  onApply: () => void;
  onDashboard: () => void;
  onSignOut: (e: React.MouseEvent) => void;
}

const ThemeSwitch: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button type="button" className="fx-icon-btn" onClick={toggleTheme} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={isDark}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={isDark ? 'moon' : 'sun'} initial={{ rotate: -80, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} exit={{ rotate: 80, scale: 0.4, opacity: 0 }} transition={{ duration: 0.28 }} className="grid place-items-center">
          {isDark ? <Moon className="w-[18px] h-[18px]" /> : <Sun className="w-[18px] h-[18px] text-amber-500" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
};

export const LandingHeader: React.FC<Props> = ({ signedIn, countries, onGoto, onPickCountry, onHome, onLogin, onApply, onDashboard, onSignOut }) => {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState('');
  const [menu, setMenu] = useState(false);
  const [drop, setDrop] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => { const m = window.matchMedia('(max-width: 639px)'); const f = () => setNarrow(m.matches); f(); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Marks the section being read, so the matching link carries the underline.
  useEffect(() => {
    const els = LINKS.map(l => document.getElementById(l.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }); }, { rootMargin: '-35% 0px -55% 0px' });
    els.forEach(e => io.observe(e));
    const top = () => { if (window.scrollY < 200) setActive(''); };
    window.addEventListener('scroll', top, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', top); };
  }, []);

  useEffect(() => {
    if (!drop) return;
    const close = (e: MouseEvent) => { if (!dropRef.current?.contains(e.target as Node)) setDrop(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrop(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [drop]);

  useEffect(() => { document.body.style.overflow = menu ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [menu]);

  const go = (id: string) => { setMenu(false); setDrop(false); onGoto(id); };

  return (
    <motion.header className="fx fx-header" data-scrolled={scrolled} initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
      <div className="fx-header-bar" style={{ height: scrolled ? '4rem' : '5rem' }}>
        <div className="mx-auto max-w-[120rem] h-full px-3 sm:px-8 lg:px-[4vw] flex items-center justify-between gap-2 sm:gap-4">
          <button type="button" onClick={onHome} aria-label="FEREX Education home" className="cursor-pointer shrink-0 flex items-center gap-5">
            <Logo size={scrolled || narrow ? 'sm' : 'md'} variant="full" />
            <span aria-hidden className="hidden xl:block h-8 w-px bg-[var(--fx-border)]" />
          </button>

          <nav aria-label="Primary" className="hidden lg:flex items-center gap-6 xl:gap-8">
            {LINKS.map(l => l.id === 'destinations' ? (
              <div key={l.id} ref={dropRef} className="relative">
                <button type="button" className="fx-nav-link inline-flex items-center gap-1" data-active={active === l.id || drop} aria-haspopup="menu" aria-expanded={drop} onClick={() => setDrop(v => !v)}>
                  {l.label}<ChevronDown className="w-3.5 h-3.5 transition-transform duration-300" style={{ transform: drop ? 'rotate(180deg)' : 'none' }} />
                </button>
                <AnimatePresence>
                  {drop && (
                    <motion.div role="menu" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.22 }} className="fx-pop absolute left-1/2 -translate-x-1/2 top-full mt-3 w-64 rounded-2xl p-2">
                      <button role="menuitem" type="button" onClick={() => go('destinations')} className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold hover:bg-[var(--fx-lav)] cursor-pointer">All destinations</button>
                      <div className="my-1 h-px bg-[var(--fx-border)]" />
                      <div className="max-h-72 overflow-y-auto">
                        {countries.slice(0, 12).map(c => <button key={c} role="menuitem" type="button" onClick={() => { setDrop(false); onPickCountry(c); }} className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium hover:bg-[var(--fx-lav)] cursor-pointer">{c}</button>)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button key={l.id} type="button" className="fx-nav-link" data-active={active === l.id} onClick={() => go(l.id)}>{l.label}</button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <ThemeSwitch />
            {signedIn ? (
              <>
                <button type="button" onClick={onDashboard} className="fx-btn fx-btn-primary h-10 px-5 text-sm"><User className="w-4 h-4" />Dashboard</button>
                <button type="button" onClick={onSignOut} aria-label="Sign out" className="fx-icon-btn max-sm:!hidden"><LogOut className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <button type="button" onClick={onLogin} className="fx-btn fx-btn-ghost h-10 px-4 text-sm max-sm:!hidden"><LogIn className="w-4 h-4 text-[var(--fx-accent)]" />Portal Login</button>
                <button type="button" onClick={onApply} className="fx-btn fx-btn-primary h-10 px-4 sm:px-5 text-sm"><span className="sm:hidden">Apply</span><span className="hidden sm:inline">Apply Online</span><ArrowRight className="w-4 h-4" /></button>
              </>
            )}
            <button type="button" className="fx-icon-btn lg:!hidden" onClick={() => setMenu(v => !v)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>{menu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menu && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="lg:hidden fixed left-3 right-3 top-[4.5rem] fx-pop rounded-3xl p-4 max-h-[78vh] overflow-y-auto">
            <ul className="space-y-1">
              {LINKS.map((l, i) => (
                <motion.li key={l.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                  <button type="button" onClick={() => go(l.id)} className="w-full text-left px-4 py-3 rounded-2xl text-base font-semibold hover:bg-[var(--fx-lav)] flex items-center justify-between cursor-pointer" style={{ color: 'var(--fx-text)' }}>{l.label}<ArrowRight className="w-4 h-4 opacity-50" /></button>
                </motion.li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {signedIn
                ? <><button type="button" onClick={() => { setMenu(false); onDashboard(); }} className="fx-btn fx-btn-primary h-12 justify-center text-sm">Dashboard</button><button type="button" onClick={(e) => { setMenu(false); onSignOut(e); }} className="fx-btn fx-btn-ghost h-12 justify-center text-sm">Sign out</button></>
                : <><button type="button" onClick={() => { setMenu(false); onLogin(); }} className="fx-btn fx-btn-ghost h-12 justify-center text-sm">Portal Login</button><button type="button" onClick={() => { setMenu(false); onApply(); }} className="fx-btn fx-btn-primary h-12 justify-center text-sm">Apply Online</button></>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};
