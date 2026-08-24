import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, TrendingUp, Download, Eye, FileText, X, BarChart2 } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const employees = [
  { name: 'Arun Patel', role: 'Senior Web Developer', rating: 9.2, projects: 3, tasks: 18, kpi: 94, feedback: 'Exceptional delivery speed and code quality. Client satisfaction is consistently high.' },
  { name: 'Sneha Roy', role: 'UI/UX Designer', rating: 9.5, projects: 2, tasks: 14, kpi: 97, feedback: 'Outstanding design sensibility. Clients love the interfaces she creates.' },
  { name: 'Vivek Sharma', role: 'Mobile App Developer', rating: 8.8, projects: 2, tasks: 12, kpi: 89, feedback: 'Strong technical skills. Needs to improve on documentation speed.' },
  { name: 'Riya Thomas', role: 'SEO & Content Lead', rating: 9.0, projects: 3, tasks: 22, kpi: 92, feedback: 'Excellent keyword strategy and content output. Growth metrics consistently positive.' },
  { name: 'Karthik Menon', role: 'Digital Marketing Analyst', rating: 8.4, projects: 2, tasks: 16, kpi: 85, feedback: 'Good performance on paid campaigns. Ad efficiency is improving quarter over quarter.' },
];

export const DigitalPerformance: React.FC = () => {
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div className="space-y-4 text-left antialiased select-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Title & Header Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#6A1B2E]" /> Performance Reviews & KPI Tracking
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Evaluate agency team performance across project delivery, client satisfaction, and KPI achievement.
          </p>
        </div>
      </div>

      {/* Top Refined KPI Widget Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-3.5 border border-emerald-100 bg-emerald-50/40 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] font-extrabold uppercase text-emerald-800/80 tracking-wider">Team Avg Rating</div>
            <div className="text-xl font-black text-emerald-700">9.0 <span className="text-xs font-semibold text-emerald-600">/ 10</span></div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
            <BarChart2 className="w-4 h-4 text-emerald-600" />
          </div>
        </Card>

        <Card className="p-3.5 border border-blue-100 bg-blue-50/40 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] font-extrabold uppercase text-blue-800/80 tracking-wider">Avg KPI Score</div>
            <div className="text-xl font-black text-blue-700">91.4%</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </Card>

        <Card className="p-3.5 border border-amber-100 bg-amber-50/40 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-[10px] font-extrabold uppercase text-amber-800/80 tracking-wider">Reviews Due</div>
            <div className="text-xl font-black text-amber-700">2 <span className="text-xs font-semibold text-amber-600">Pending</span></div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        </Card>
      </div>

      {/* 30-40% Compact Employee Performance Cards - Enterprise Styling */}
      <div className="space-y-3">
        {employees.map((emp, idx) => (
          <Card key={idx} className="p-3.5 sm:p-4 border border-slate-200/80 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-all space-y-3">
            {/* Top Row: Avatar + Employee Info & Rating Pill */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6A1B2E] to-[#9B3A50] text-white flex items-center justify-center text-xs font-black shadow-2xs shrink-0">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 leading-none">{emp.name}</h3>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{emp.role}</p>
                </div>
              </div>

              {/* Enterprise Rating Badge (No Stars) */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-50 border border-slate-200/80 rounded-lg text-slate-800 text-xs font-black shrink-0">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">Rating</span>
                <span className="text-emerald-700 font-black">{emp.rating}</span>
                <span className="text-[10px] text-slate-400 font-semibold">/ 10</span>
              </div>
            </div>

            {/* KPI Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10.5px] font-extrabold text-slate-700">
                <span className="text-slate-400 uppercase tracking-wider text-[9.5px]">KPI Achievement</span>
                <span className="text-emerald-700 font-black">{emp.kpi}%</span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-1 rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${emp.kpi}%` }}
                />
              </div>
            </div>

            {/* Manager Feedback Section (Clean Container) */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-lg p-2.5 space-y-0.5">
              <span className="text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider block">Manager Feedback</span>
              <p className="text-[11.5px] font-medium text-slate-700 leading-relaxed">
                "{emp.feedback}"
              </p>
            </div>

            {/* Bottom Row: Aligned Metric Widgets & Compact Enterprise Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
              {/* Aligned Enterprise KPI Metrics */}
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                  <span className="text-slate-400 font-bold text-[10px]">Projects:</span>
                  <span className="font-black text-slate-900 text-xs">{emp.projects}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                  <span className="text-slate-400 font-bold text-[10px]">Tasks:</span>
                  <span className="font-black text-slate-900 text-xs">{emp.tasks}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                  <span className="text-slate-400 font-bold text-[10px]">KPI Score:</span>
                  <span className="font-black text-emerald-700 text-xs">{emp.kpi}%</span>
                </div>
              </div>

              {/* Compact Action Buttons */}
              <div className="flex items-center gap-2 justify-end shrink-0">
                <button
                  onClick={() => setSelectedEmp(emp)}
                  className="px-3 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 hover:border-[#6A1B2E] hover:text-[#6A1B2E] rounded-lg transition-all flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  View Review
                </button>
                <button
                  onClick={() => showToast(`Performance report for ${emp.name} exported!`)}
                  className="px-3 py-1 text-[11px] font-bold text-[#6A1B2E] bg-[#6A1B2E]/10 hover:bg-[#6A1B2E] hover:text-white rounded-lg transition-all flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Export
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Review Detail Drawer Modal */}
      <AnimatePresence>
        {selectedEmp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900 z-40"
              onClick={() => setSelectedEmp(null)}
            />
            <motion.div
              initial={{ translateX: '100%' }}
              animate={{ translateX: 0 }}
              exit={{ translateX: '100%' }}
              transition={{ duration: 0.25 }}
              className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto text-left space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#6A1B2E]" /> Performance Review — {selectedEmp.name}
                </h3>
                <button onClick={() => setSelectedEmp(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{selectedEmp.name}</h4>
                      <div className="text-xs font-semibold text-slate-600">{selectedEmp.role}</div>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                      {selectedEmp.rating} / 10
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div className="text-center p-2.5 bg-white rounded-lg border border-slate-100">
                      <div className="text-base font-black text-emerald-700">{selectedEmp.rating}/10</div>
                      <div className="text-[9.5px] font-extrabold text-slate-400 uppercase mt-0.5">Rating</div>
                    </div>
                    <div className="text-center p-2.5 bg-white rounded-lg border border-slate-100">
                      <div className="text-base font-black text-blue-700">{selectedEmp.kpi}%</div>
                      <div className="text-[9.5px] font-extrabold text-slate-400 uppercase mt-0.5">KPI Score</div>
                    </div>
                    <div className="text-center p-2.5 bg-white rounded-lg border border-slate-100">
                      <div className="text-base font-black text-slate-900">{selectedEmp.tasks}</div>
                      <div className="text-[9.5px] font-extrabold text-slate-400 uppercase mt-0.5">Tasks Done</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Manager Assessment</div>
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed">{selectedEmp.feedback}</p>
                </div>

                <Button
                  size="sm"
                  className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]"
                  onClick={() => {
                    showToast(`Review submitted for ${selectedEmp.name}`);
                    setSelectedEmp(null);
                  }}
                >
                  Submit Performance Audit
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
