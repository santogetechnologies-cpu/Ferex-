import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, GraduationCap, Monitor, Globe, Snowflake,
  ArrowUpRight, Sparkles, Check
} from 'lucide-react';

interface AppItem {
  id: string;
  name: string;
  subtitle: string;
  path: string;
  matchPrefixes: string[];
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  tagColor: string;
  bgGradient: string;
  iconBg: string;
  accentColor: string;
}

const FEREX_APPS: AppItem[] = [
  {
    id: 'central',
    name: 'Central Super Admin',
    subtitle: 'HQ Governance, Multi-App Finance & Admins',
    path: '/central/dashboard',
    matchPrefixes: ['/central'],
    icon: Crown,
    tag: 'HQ Command',
    tagColor: 'bg-amber-100 text-amber-800 border-amber-300',
    bgGradient: 'from-amber-500/10 to-amber-600/5 hover:border-amber-400/60',
    iconBg: 'bg-amber-500 text-white shadow-amber-500/30 shadow-md',
    accentColor: '#B45309',
  },
  {
    id: 'education',
    name: 'Ferex Education',
    subtitle: 'Universities, Admissions, Visas & Student CRM',
    path: '/admin/dashboard',
    matchPrefixes: ['/admin', '/student', '/staff'],
    icon: GraduationCap,
    tag: 'Global Study',
    tagColor: 'bg-rose-100 text-rose-800 border-rose-300',
    bgGradient: 'from-rose-500/10 to-rose-600/5 hover:border-rose-400/60',
    iconBg: 'bg-[#6A1B2E] text-white shadow-[#6A1B2E]/30 shadow-md',
    accentColor: '#6A1B2E',
  },
  {
    id: 'digital',
    name: 'Ferex Digital',
    subtitle: 'Tech Agency, Sprints, Retainers & Invoices',
    path: '/digital/dashboard',
    matchPrefixes: ['/digital'],
    icon: Monitor,
    tag: 'Tech Agency',
    tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    bgGradient: 'from-emerald-500/10 to-emerald-600/5 hover:border-emerald-400/60',
    iconBg: 'bg-emerald-600 text-white shadow-emerald-600/30 shadow-md',
    accentColor: '#059669',
  },
  {
    id: 'trade',
    name: 'Global Trade',
    subtitle: 'Export/Import, LCs, Cargo Vessels & Commodities',
    path: '/trade/dashboard',
    matchPrefixes: ['/trade'],
    icon: Globe,
    tag: 'Trade ERP',
    tagColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    bgGradient: 'from-indigo-500/10 to-indigo-600/5 hover:border-indigo-400/60',
    iconBg: 'bg-indigo-600 text-white shadow-indigo-600/30 shadow-md',
    accentColor: '#4F46E5',
  },
  {
    id: 'rimi',
    name: 'Rimi Frozen',
    subtitle: 'FMCG Distribution, Cold Chain & Warehouses',
    path: '/rimi/dashboard',
    matchPrefixes: ['/rimi'],
    icon: Snowflake,
    tag: 'Frozen Dist.',
    tagColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    bgGradient: 'from-cyan-500/10 to-cyan-600/5 hover:border-cyan-400/60',
    iconBg: 'bg-cyan-600 text-white shadow-cyan-600/30 shadow-md',
    accentColor: '#0891B2',
  },
];

export const AppSwitcher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Determine which app is currently active
  const activeApp = FEREX_APPS.find(app =>
    app.matchPrefixes.some(prefix => location.pathname.startsWith(prefix))
  ) || FEREX_APPS[0];

  const handleSelectApp = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* 9-Dots Google-Style (:::) Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Ferex Multi-App Switcher"
        title="Switch Ferex Enterprise Applications"
        className={`relative p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center group ${
          isOpen
            ? 'bg-[#6A1B2E] text-white border-[#6A1B2E] shadow-md shadow-[#6A1B2E]/20 scale-105'
            : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200/80 shadow-xs hover:shadow-sm'
        }`}
      >
        {/* Google-Style 3x3 Waffle Grid */}
        <div className="grid grid-cols-3 gap-0.5 w-4 h-4 p-0.5">
          <span className={`w-1 h-1 rounded-[1px] transition-all duration-200 ${isOpen ? 'bg-white' : 'bg-slate-600 group-hover:bg-[#6A1B2E]'}`} />
          <span className={`w-1 h-1 rounded-[1px] transition-all duration-200 ${isOpen ? 'bg-white' : 'bg-slate-600 group-hover:bg-[#6A1B2E]'}`} />
          <span className={`w-1 h-1 rounded-[1px] transition-all duration-200 ${isOpen ? 'bg-white' : 'bg-slate-600 group-hover:bg-[#6A1B2E]'}`} />
          <span className={`w-1 h-1 rounded-[1px] transition-all duration-200 ${isOpen ? 'bg-white' : 'bg-slate-600 group-hover:bg-[#6A1B2E]'}`} />
          <span className={`w-1 h-1 rounded-[1px] transition-all duration-200 ${isOpen ? 'bg-white' : 'bg-slate-600 group-hover:bg-[#6A1B2E]'}`} />
          <span className={`w-1 h-1 rounded-[1px] transition-all duration-200 ${isOpen ? 'bg-white' : 'bg-slate-600 group-hover:bg-[#6A1B2E]'}`} />
          <span className={`w-1 h-1 rounded-[1px] transition-all duration-200 ${isOpen ? 'bg-white' : 'bg-slate-600 group-hover:bg-[#6A1B2E]'}`} />
          <span className={`w-1 h-1 rounded-[1px] transition-all duration-200 ${isOpen ? 'bg-white' : 'bg-slate-600 group-hover:bg-[#6A1B2E]'}`} />
          <span className={`w-1 h-1 rounded-[1px] transition-all duration-200 ${isOpen ? 'bg-white' : 'bg-slate-600 group-hover:bg-[#6A1B2E]'}`} />
        </div>
      </button>

      {/* Dropdown Popup: 4 Apps Showcase */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 mt-2.5 w-[330px] sm:w-[360px] bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl shadow-2xl p-4 z-50 text-left overflow-hidden ring-1 ring-black/5"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#6A1B2E]/10 flex items-center justify-center text-[#6A1B2E]">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 tracking-tight">Ferex Enterprise Ecosystem</h4>
                  <p className="text-[10px] font-semibold text-slate-400">Jump seamlessly across all 4 operational platforms</p>
                </div>
              </div>
            </div>

            {/* 4 Apps Grid */}
            <div className="grid grid-cols-1 gap-2">
              {FEREX_APPS.map((app) => {
                const isCurrent = activeApp.id === app.id;
                const Icon = app.icon;

                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleSelectApp(app.path)}
                    className={`w-full group p-3 rounded-2xl border transition-all duration-200 text-left flex items-center justify-between cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : `bg-slate-50/70 hover:bg-gradient-to-r ${app.bgGradient} border-slate-200/70 text-slate-800`
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${app.iconBg}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-xs font-black truncate ${isCurrent ? 'text-white' : 'text-slate-900 group-hover:text-[#6A1B2E] transition-colors'}`}>
                            {app.name}
                          </p>
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md border ${
                            isCurrent ? 'bg-white/20 text-white border-white/30' : app.tagColor
                          }`}>
                            {app.tag}
                          </span>
                        </div>
                        <p className={`text-[10.5px] font-semibold truncate mt-0.5 ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                          {app.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      {isCurrent ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center gap-1 shadow-xs">
                          <Check className="w-2.5 h-2.5" /> ACTIVE
                        </span>
                      ) : (
                        <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-white text-slate-400 group-hover:text-slate-900 flex items-center justify-center transition-colors shadow-xs">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 px-1">
              <span>Single Sign-On (SSO) Active</span>
              <span className="text-[#6A1B2E] font-black">FEREX GLOBAL HQ</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
