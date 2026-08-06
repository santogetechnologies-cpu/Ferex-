import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Calendar, Clock, ArrowRight, ShieldAlert,
  Compass, FileCheck, CreditCard, Search, BookOpen
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, duration: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } }
  };

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Banner */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6A1B2E] to-[#4A101E] text-white p-6 md:p-8 shadow-md">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
            <svg width="240" height="240" viewBox="0 0 100 100" fill="none">
              <path d="M50 5 L92 23 L50 41 L8 23 Z" fill="white" />
              <path d="M30 36.5 C30 47.5, 70 47.5, 70 36.5 C70 42 63.5 46.5, 50 46.5 C36.5 46.5, 30 42, 30 36.5 Z" fill="white" />
            </svg>
          </div>

          <div className="relative z-10 max-w-xl text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                FX-2026-001 · Student Console
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
              Welcome back, Ashly
            </h1>
            <p className="text-xs md:text-sm text-white/80 leading-relaxed font-semibold">
              You are currently at stage <span className="font-extrabold text-white">4 of 7 (University Offer Received)</span> for your target European universities. Next: Visa appointment prep.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="sm"
                className="text-xs text-[#6A1B2E] font-bold shadow-xs hover:scale-105 active:scale-98 transition-transform"
                onClick={() => handleQuickAction('/student/journey-tracker')}
              >
                Track Journey <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
              <button
                onClick={() => handleQuickAction('/student/select-university')}
                className="h-9 px-4 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 active:bg-white/10 border border-white/30 transition-all shadow-xs"
              >
                Browse Universities
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Target Universities', value: '3', sub: '2 Apps Submitted', icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { title: 'Journey Progress', value: '57%', sub: 'Stage 4 / 7 Active', icon: Compass, color: 'text-blue-600 bg-blue-50 border-blue-100' },
          { title: 'Documents Verified', value: '4 / 5', sub: '1 Pending Review', icon: FileCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
          { title: 'Fees & Payments', value: '₹15,000', sub: 'Paid · 0 Overdue', icon: CreditCard, color: 'text-[#6A1B2E] bg-[#6A1B2E]/10 border-[#6A1B2E]/20' },
        ].map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <Card className="flex items-center gap-4 p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${stat.color} group-hover:scale-105 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="text-left">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">{stat.title}</span>
                <span className="text-xl font-black text-slate-900 leading-none">{stat.value}</span>
                <span className="text-[10px] font-extrabold text-slate-500 block mt-1">{stat.sub}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Workspace Division */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Charts & Analytics Widget */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <Card className="p-6 text-left border border-slate-200/70 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-sm font-black text-slate-900">Application Evaluation Score</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Admissions eligibility index over time</p>
              </div>
              <span className="text-[10px] font-extrabold text-[#6A1B2E] bg-[#6A1B2E]/10 px-2.5 py-1 rounded-full uppercase border border-[#6A1B2E]/20">
                Index: 89/100
              </span>
            </div>

            {/* SVG Line Chart */}
            <div className="h-[200px] w-full relative">
              <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6A1B2E" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#6A1B2E" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="90" x2="500" y2="90" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="0" y1="140" x2="500" y2="140" stroke="#f1f5f9" strokeWidth="1" />

                <path d="M 0 160 Q 100 120, 200 130 T 400 60 T 500 40 L 500 200 L 0 200 Z" fill="url(#chart-grad)" />
                <path d="M 0 160 Q 100 120, 200 130 T 400 60 T 500 40" fill="none" stroke="#6A1B2E" strokeWidth="3" strokeLinecap="round" />
                <circle cx="200" cy="130" r="5" fill="#6A1B2E" stroke="white" strokeWidth="2" />
                <circle cx="400" cy="60" r="5" fill="#6A1B2E" stroke="white" strokeWidth="2" />
              </svg>

              <div className="absolute top-[35px] left-[350px] bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded shadow-md pointer-events-none select-none">
                Warsaw Admission Index: 89%
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mt-2 px-1 select-none">
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug (Current)</span>
              <span>Sep</span>
            </div>
          </Card>

          {/* Quick Action Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            {[
              { title: 'Search Universities', desc: 'Find target European courses', path: '/student/select-university', icon: Search },
              { title: 'Upload Documents', desc: 'Manage passport & certificates', path: '/student/documents', icon: BookOpen },
              { title: 'Support & Help', desc: 'Contact assigned counselor', path: '/student/support', icon: ShieldAlert },
            ].map((action, idx) => (
              <Card
                key={idx}
                hoverEffect
                onClick={() => handleQuickAction(action.path)}
                className="cursor-pointer group hover:border-[#6A1B2E]/30 p-5 flex flex-col justify-between border border-slate-200/70"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-[#6A1B2E] group-hover:text-white flex items-center justify-center mb-4 transition-colors">
                    <action.icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-[#6A1B2E] transition-colors">{action.title}</h4>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1 leading-relaxed">{action.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#6A1B2E] mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open module <ArrowRight className="w-3 h-3" />
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Sidebar Panels */}
        <motion.div variants={itemVariants} className="space-y-6 text-left">

          {/* Upcoming Meeting Card */}
          <Card className="p-5 border-l-4 border-l-[#6A1B2E] border-slate-200/70 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase font-extrabold text-[#6A1B2E] tracking-wider">
                Upcoming Advisory
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h3 className="text-sm font-black text-slate-900 mb-3">Visa Guidance Session</h3>

            <div className="space-y-2 text-xs text-slate-600 font-semibold mb-5 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Aug 12, 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>10:00 AM – 10:45 AM</span>
              </div>
            </div>

            <Button
              size="sm"
              className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]"
              onClick={() => handleQuickAction('/student/meetings')}
            >
              Access Meeting Briefing
            </Button>
          </Card>

          {/* Recent Milestones Preview */}
          <Card className="p-5 border border-slate-200/70 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              Recent Milestones
              <span className="text-[10px] font-extrabold text-[#6A1B2E] hover:underline cursor-pointer" onClick={() => handleQuickAction('/student/journey-tracker')}>
                See Full
              </span>
            </h3>

            <div className="relative border-l border-slate-200/80 pl-4 py-1.5 space-y-4 select-none">
              {[
                { time: 'Aug 04', title: 'Offer Letter Issued', desc: 'University of Warsaw offer released.', color: 'bg-emerald-500' },
                { time: 'Jul 28', title: 'Passport Verified', desc: 'Ferex team approved identity document.', color: 'bg-blue-500' },
                { time: 'Jul 15', title: 'Portal Enrollment', desc: 'Ashly registered in Ferex platform.', color: 'bg-[#6A1B2E]' },
              ].map((milestone, idx) => (
                <div key={idx} className="relative">
                  <span className={`absolute -left-[20.5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${milestone.color}`} />
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase">{milestone.time}</span>
                  <h4 className="text-xs font-black text-slate-800 mt-0.5">{milestone.title}</h4>
                  <p className="text-[10.5px] text-slate-500 font-semibold mt-0.5">{milestone.desc}</p>
                </div>
              ))}
            </div>
          </Card>

        </motion.div>

      </div>
    </motion.div>
  );
};

