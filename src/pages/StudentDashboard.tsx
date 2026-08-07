import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Calendar, Clock, ArrowRight, ShieldAlert,
  Compass, FileCheck, CreditCard, Search, BookOpen, CheckCircle2, Circle
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
          { title: 'Target Universities', value: '3', sub: '2 Apps Submitted', icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', path: '/student/applications' },
          { title: 'Journey Progress', value: '57%', sub: 'Stage 4 / 7 Active', icon: Compass, color: 'text-blue-600 bg-blue-50 border-blue-100', path: '/student/journey-tracker' },
          { title: 'Documents Verified', value: '4 / 5', sub: '1 Pending Review', icon: FileCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', path: '/student/documents' },
          { title: 'Fees & Payments', value: '₹15,000', sub: 'Paid · 0 Overdue', icon: CreditCard, color: 'text-[#6A1B2E] bg-[#6A1B2E]/10 border-[#6A1B2E]/20', path: '/student/payments' },
        ].map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants} onClick={() => navigate(stat.path)}>
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
          <Card className="p-6 text-left border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h3 className="text-sm font-black text-slate-900">Journey Checklist</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Track your step-by-step admission & visa milestone progress</p>
              </div>
              <span className="text-[10px] font-extrabold text-[#6A1B2E] bg-[#6A1B2E]/10 px-2.5 py-1 rounded-full uppercase border border-[#6A1B2E]/20">
                4 of 7 Completed
              </span>
            </div>

            {/* Checklist Items Stream */}
            <div className="space-y-2">
              {[
                { title: 'Profile Completed', status: 'Completed', path: '/student/profile' },
                { title: 'University Selected', status: 'Completed', path: '/student/select-university' },
                { title: 'Application Submitted', status: 'Completed', path: '/student/applications' },
                { title: 'Offer Letter Received', status: 'Completed', path: '/student/offers' },
                { title: 'Documents Verified', status: 'In Progress', path: '/student/documents' },
                { title: 'Visa Appointment', status: 'Pending', path: '/student/meetings' },
                { title: 'Visa Approved', status: 'Pending', path: '/student/journey-tracker' },
              ].map((item, idx) => {
                const isDone = item.status === 'Completed';
                const isProgress = item.status === 'In Progress';

                return (
                  <div
                    key={idx}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer hover:border-slate-300 ${
                      isDone
                        ? 'bg-slate-50/60 border-slate-200/60 text-slate-900'
                        : isProgress
                        ? 'bg-amber-50/40 border-amber-200/60 text-amber-950 font-bold'
                        : 'bg-white border-slate-100 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isProgress
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 border border-slate-200 text-slate-300'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : isProgress ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : (
                          <Circle className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="text-xs font-bold">{item.title}</span>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        isDone
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isProgress
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                );
              })}
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
                <div key={idx} onClick={() => handleQuickAction('/student/journey-tracker')} className="relative cursor-pointer group hover:bg-slate-50 p-1 rounded-lg transition-colors">
                  <span className={`absolute -left-[16.5px] top-2 w-2.5 h-2.5 rounded-full border-2 border-white ${milestone.color}`} />
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase">{milestone.time}</span>
                  <h4 className="text-xs font-black text-slate-800 group-hover:text-[#6A1B2E] transition-colors mt-0.5">{milestone.title}</h4>
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

