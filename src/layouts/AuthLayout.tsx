import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Globe, Snowflake, Cpu } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Card } from '../components/Card';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const brandServices = [
    {
      title: 'Ferex Education',
      description: 'Streamlining academic operations and learning management systems.',
      icon: GraduationCap,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Ferex Global Trade',
      description: 'Managing international logistics, compliance, and multi-currency billing.',
      icon: Globe,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Rimi Frozen',
      description: 'Optimizing cold chain storage, supply management, and dispatch.',
      icon: Snowflake,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    },
    {
      title: 'Ferex Digital',
      description: 'Accelerating cloud operations, analytics, and platform API services.',
      icon: Cpu,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* LEFT SIDE: Brand presentation and abstract artwork (hidden on mobile/tablet below lg) */}
      <div className="hidden lg:flex lg:w-1/2 p-12 xl:p-16 flex-col justify-between relative overflow-hidden bg-slate-50 border-r border-slate-100">
        {/* Abstract vector background artwork */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6A1B2E" strokeWidth="1.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {/* Soft geometric accent lines */}
            <circle cx="80%" cy="20%" r="300" fill="none" stroke="#6A1B2E" strokeWidth="2" strokeDasharray="10, 15" />
            <circle cx="20%" cy="80%" r="200" fill="none" stroke="#6A1B2E" strokeWidth="1" />
          </svg>
        </div>

        {/* Top: Brand Logo */}
        <div className="relative z-10">
          <Logo size="lg" />
        </div>

        {/* Middle: Welcoming & Brand Cards */}
        <div className="relative z-10 my-auto py-12 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <h1 className="text-4xl xl:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-4">
              Welcome to <span className="text-primary">Ferex Unified ERP</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium mb-12 max-w-xl">
              One platform powering Education, Global Trade, Rimi Frozen, and Ferex Digital.
            </p>
          </motion.div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {brandServices.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index, ease: 'easeOut' }}
              >
                <Card hoverEffect className="h-full border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className={`w-10 h-10 rounded-lg ${service.bg} flex items-center justify-center mb-4`}>
                      <service.icon className={`w-5.5 h-5.5 ${service.color}`} />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1.5">{service.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                      {service.description}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom: Minimal aesthetic signature */}
        <div className="relative z-10 text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Enterprise Integration Suite
        </div>
      </div>

      {/* RIGHT SIDE: Central Login Interface */}
      <div className="flex-1 flex flex-col justify-between p-6 md:p-12 lg:p-16 xl:p-24 relative">
        {/* Top bar with mobile logo */}
        <div className="flex justify-between items-center lg:justify-end">
          <Logo size="md" className="lg:hidden" />
          
          <a
            href="#support"
            className="text-sm font-semibold text-slate-600 hover:text-primary hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded px-1"
          >
            Need Help?
          </a>
        </div>

        {/* Form Container */}
        <div className="my-auto py-12 flex justify-center items-center">
          <div className="w-full max-w-[440px]">
            {children}
          </div>
        </div>

        {/* Footer & Extra Links */}
        <div className="mt-auto pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-400 select-none">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">Ferex Ventures</span>
            <span>•</span>
            <span>Version 1.0</span>
            <span>•</span>
            <span>© 2026</span>
          </div>
          
          <div className="flex gap-4">
            <a href="#privacy" className="hover:text-slate-600 hover:underline transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-slate-600 hover:underline transition-colors">Terms of Service</a>
            <a href="#support" className="hover:text-slate-600 hover:underline transition-colors">Support Portal</a>
          </div>
        </div>
      </div>
    </div>
  );
};
