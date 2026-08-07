import React from 'react';
import { motion } from 'framer-motion';
import { Logo } from '../components/Logo';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white antialiased select-none font-sans overflow-x-hidden">
      {/* ── LEFT SIDE (45%): Solid Maroon Brand Panel ─────────────────────── */}
      <div className="w-full lg:w-[45%] min-h-[280px] lg:min-h-screen bg-[#6A1B2E] relative flex items-center justify-center p-8 overflow-hidden shrink-0">
        {/* Extremely subtle (3-5% opacity) oversized watermark background pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] flex items-center justify-center">
          <svg
            width="600"
            height="420"
            viewBox="0 0 100 70"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transform scale-150 rotate-[-12deg]"
          >
            <path d="M50 5 L92 23 L50 41 L8 23 Z" fill="#FFFFFF" />
            <path d="M30 36.5 C30 47.5, 70 47.5, 70 36.5 C70 42 63.5 46.5, 50 46.5 C36.5 46.5, 30 42, 30 36.5 Z" fill="#FFFFFF" />
            <path d="M50 23 C42.5 23, 34 32.5, 34.5 43.5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="34.5" cy="45.5" r="2.5" fill="#FFFFFF" />
            <path d="M34.5 46.5 L37 60 C37 61, 30.5 65.5, 29.5 60.5 L32 46.5 Z" fill="#FFFFFF" />
          </svg>
        </div>

        {/* Centered Original Ferex Education Logo with soft fade + subtle scale animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative z-10 flex items-center justify-center py-6"
        >
          <Logo variant="full" color="white" size="xl" align="center" />
        </motion.div>
      </div>

      {/* ── RIGHT SIDE (55%): Clean Floating Card Container ───────────────── */}
      <div className="w-full lg:w-[55%] flex-1 flex flex-col justify-center items-center p-6 sm:p-10 md:p-12 lg:p-16 xl:p-24 bg-white relative">
        {/* Extremely subtle (2.5% opacity) dot pattern texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#6A1B2E_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.025] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md lg:max-w-[540px] xl:max-w-[560px] lg:bg-white lg:border lg:border-slate-100 lg:rounded-[28px] lg:shadow-2xl lg:shadow-slate-200/50 lg:p-[56px] text-left relative z-10 transition-all duration-300"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};
