import React from 'react';
import { motion } from 'framer-motion';
import { Logo } from '../components/Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="h-screen max-h-screen w-full flex flex-col lg:flex-row bg-slate-50 antialiased font-sans overflow-hidden">
      {/* ── LEFT SIDE (45%): Official FEREX Wine Brand Panel ────────────── */}
      <div className="w-full lg:w-[42%] xl:w-[45%] h-auto lg:h-full py-4 lg:py-0 bg-[#58051E] relative flex items-center justify-center p-6 lg:p-8 overflow-hidden shrink-0 shadow-2xl">
        {/* Subtle radial lighting glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-[140px] pointer-events-none" />

        {/* Centered Official Ferex Education Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center justify-center py-2 lg:py-6 text-center space-y-2"
        >
          <Logo size="xl" variant="white" />
          <p className="text-xs font-bold text-white/80 tracking-widest uppercase pt-1">
            Global Ventures & Higher Education Portal
          </p>
        </motion.div>
      </div>

      {/* ── RIGHT SIDE (55%): Clean Floating Card Container ───────────────── */}
      <div className="w-full lg:w-[58%] xl:w-[55%] flex-1 h-full flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 bg-white relative overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md lg:max-w-[480px] bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/50 p-6 sm:p-7 text-left relative z-10 transition-all duration-300 my-auto"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};
