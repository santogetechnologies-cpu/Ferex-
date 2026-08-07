import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Eye, EyeOff, Shield, Mail, Phone, Building, Calendar, MapPin, Award, Sparkles } from 'lucide-react';
import { Card } from '../../components/Card';

export const StaffProfile: React.FC = () => {
  const [toast, setToast] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOnDuty, setIsOnDuty] = useState(true);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div className="space-y-8 text-left antialiased select-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Executive Profile Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-3xl bg-white/10 border-2 border-white/20 text-white flex items-center justify-center text-3xl font-black shadow-2xl backdrop-blur-md shrink-0">
            AP
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase bg-white/20 text-white px-3 py-0.5 rounded-full border border-white/20">
                Staff ID: STF-8420
              </span>
              <span className="text-[10px] font-bold text-amber-300">★ 98.4% Exceptional SLA Score</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Arun Patel</h1>
            <p className="text-xs text-white/80 font-bold">Senior Student Advisor • Overseas Education Counseling</p>
          </div>
        </div>

        <div className="shrink-0 space-y-2">
          <button
            onClick={() => { setIsOnDuty(!isOnDuty); showToast(isOnDuty ? 'Status updated to Away' : 'Status updated to On Duty'); }}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${isOnDuty ? 'bg-emerald-500 text-white shadow-md' : 'bg-amber-500 text-white'}`}
          >
            <span>{isOnDuty ? '● Available / On Duty' : '○ Away / Busy'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Skills & Certifications */}
        <div className="space-y-6">
          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#6A1B2E]" /> Verified Skills & Competencies
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {['UKVI CAS Filing', 'Canada SDS Portal', 'IELTS Score Verification', 'SOP Writing Audit', 'Bank Solvency Verification', 'VFS Biometric Prep'].map((skill, idx) => (
                <span key={idx} className="text-[10.5px] font-bold bg-slate-100 text-slate-800 px-2.5 py-1 rounded-xl border border-slate-200">
                  ✓ {skill}
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-5 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" /> Professional Certifications
            </h3>
            <div className="space-y-2 text-xs font-semibold">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-black text-slate-900 block">ICEF Trained Agent Counselor</span>
                <span className="text-[10px] text-slate-400 font-bold block">License #ICEF-84291</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-black text-slate-900 block">British Council Certified Advisor</span>
                <span className="text-[10px] text-slate-400 font-bold block">Valid thru 2028</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 2 Columns: Employment Details & Demo Credentials */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2">Employment & Contact Details</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Official Email</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-[#6A1B2E]" /> staff.education@ferex.com</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Phone Number</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-[#6A1B2E]" /> +91 98765 43210</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Reporting Manager</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-[#6A1B2E]" /> Ananya Sharma (Central Director)</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Joining Date</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[#6A1B2E]" /> Jan 15, 2024</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 sm:col-span-2">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Work Location</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#6A1B2E]" /> FEREX International HQ — Bengaluru, Karnataka</span>
              </div>
            </div>
          </Card>

          {/* Demo Credentials Section */}
          <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#6A1B2E]" /> UI Demo Credentials (Read-Only UI Display)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Demo Official Email</span>
                <span className="font-mono font-black text-[#6A1B2E]">staff.education@ferex.com</span>
              </div>

              {/* Masked Password Field with Eye Toggle */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 relative">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Temporary Password</span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-slate-900">
                    {showPassword ? 'Staff@12345' : '••••••••••••'}
                  </span>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[10.5px] font-semibold text-slate-400">
              * Note: These credentials are for UI demonstration purposes only. No backend authentication logic is connected.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
