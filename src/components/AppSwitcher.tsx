import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, GraduationCap, Monitor, Globe, Snowflake,
  ArrowUpRight, Check
} from 'lucide-react';

interface AppItem {
  id: string;
  name: string;
  subtitle: string;
  path: string;
  matchPrefixes: string[];
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
  tagClass: string;
}

const FEREX_APPS: AppItem[] = [
  {
    id: 'central',
    name: 'Central Super Admin',
    subtitle: 'HQ Governance, Multi-App Finance & Audits',
    path: '/central/dashboard',
    matchPrefixes: ['/central'],
    icon: Crown,
    tag: 'HQ',
    tagClass: 'bg-amber-50 text-amber-700 border-amber-200/70',
  },
  {
    id: 'education',
    name: 'Ferex Education',
    subtitle: 'Universities, Admissions, Visas & Student CRM',
    path: '/admin/dashboard',
    matchPrefixes: ['/admin', '/student', '/staff'],
    icon: GraduationCap,
    tag: 'Education',
    tagClass: 'bg-[#58051E]/8 text-[#58051E] border-[#58051E]/20',
  },
  {
    id: 'digital',
    name: 'Ferex Digital',
    subtitle: 'Tech Agency, Sprints, Retainers & Invoices',
    path: '/digital/dashboard',
    matchPrefixes: ['/digital'],
    icon: Monitor,
    tag: 'Agency',
    tagClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
  },
  {
    id: 'trade',
    name: 'Global Trade',
    subtitle: 'Export/Import, Letters of Credit & Cargo',
    path: '/trade/dashboard',
    matchPrefixes: ['/trade'],
    icon: Globe,
    tag: 'Trade',
    tagClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
  },
  {
    id: 'rimi',
    name: 'Rimi Frozen',
    subtitle: 'FMCG Cold Chain, Distribution & Warehouses',
    path: '/rimi/dashboard',
    matchPrefixes: ['/rimi'],
    icon: Snowflake,
    tag: 'Cold Chain',
    tagClass: 'bg-sky-50 text-sky-700 border-sky-200/70',
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
      {/* 9-Dots Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Ferex Multi-App Switcher"
        title="Switch Ferex Enterprise Applications"
        className={`relative p-2 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-[#58051E] text-white border-[#58051E] shadow-sm'
            : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200/90 shadow-2xs'
        }`}
      >
        <div className="grid grid-cols-3 gap-0.5 w-3.5 h-3.5 p-0.5">
          {[...Array(9)].map((_, i) => (
            <span
              key={i}
              className={`w-0.5 h-0.5 rounded-[0.5px] transition-colors ${
                isOpen ? 'bg-white' : 'bg-slate-500 group-hover:bg-[#58051E]'
              }`}
            />
          ))}
        </div>
      </button>

      {/* Dropdown Popup */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-80 sm:w-88 bg-white border border-slate-200/90 rounded-2xl shadow-card p-3 z-50 text-left overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 px-1">
              <div>
                <h4 className="text-xs font-bold text-slate-900 tracking-tight">Enterprise Portals</h4>
                <p className="text-[10px] text-slate-400 font-medium">Switch subsidiary workspace</p>
              </div>
              <span className="text-[9.5px] font-bold text-[#58051E] bg-[#58051E]/5 px-2 py-0.5 rounded border border-[#58051E]/15">
                SSO Active
              </span>
            </div>

            {/* Apps List */}
            <div className="space-y-1">
              {FEREX_APPS.map((app) => {
                const isCurrent = activeApp.id === app.id;
                const Icon = app.icon;

                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => handleSelectApp(app.path)}
                    className={`w-full p-2.5 rounded-xl border transition-all duration-150 text-left flex items-center justify-between cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-transparent hover:border-slate-200/70 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                        isCurrent
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'bg-slate-50 border-slate-200/70 text-slate-700'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-xs font-bold truncate ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                            {app.name}
                          </p>
                          <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border ${
                            isCurrent ? 'bg-white/15 text-white border-white/25' : app.tagClass
                          }`}>
                            {app.tag}
                          </span>
                        </div>
                        <p className={`text-[10.5px] truncate mt-0.5 ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                          {app.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      {isCurrent ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

