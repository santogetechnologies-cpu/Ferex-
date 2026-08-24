import React from 'react';
import { motion } from 'framer-motion';
import { Logo } from '../components/Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 antialiased select-none font-sans overflow-x-hidden">
      {/* ── LEFT SIDE (45%): Official Deep Maroon Brand Panel ────────────── */}
      <div className="w-full lg:w-[45%] min-h-[300px] lg:min-h-screen bg-[#50001D] relative flex items-center justify-center p-8 overflow-hidden shrink-0 shadow-2xl">
        {/* Subtle radial lighting glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[140px] pointer-events-none" />

        {/* Centered Official Ferex Education Logo Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center justify-center py-6 text-center space-y-4"
        >
          <Logo size="xl" />
          <p className="text-xs font-bold text-rose-100/80 tracking-widest uppercase pt-2">
            Premier European Higher Education Portal
          </p>
        </motion.div>
      </div>

      {/* ── RIGHT SIDE (55%): Clean Floating Card Container ───────────────── */}
      <div className="w-full lg:w-[55%] flex-1 flex flex-col justify-center items-center p-6 sm:p-10 md:p-12 lg:p-16 xl:p-24 bg-slate-50/50 relative">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md lg:max-w-[540px] xl:max-w-[560px] bg-white border border-slate-200/80 rounded-[28px] shadow-2xl shadow-slate-200/60 p-8 sm:p-12 text-left relative z-10 transition-all duration-300"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};
