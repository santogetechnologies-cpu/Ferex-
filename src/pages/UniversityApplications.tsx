import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, MapPin, Calendar, ArrowRight, X, Check } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const UniversityApplications: React.FC = () => {
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);

  // Mock applications data
  const mockApps = [
    {
      id: 1,
      university: 'University of Warsaw',
      course: 'M.Sc. in Computer Science',
      country: 'Poland',
      date: 'Jun 28, 2026',
      status: 'Offer Issued',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      initials: 'UW',
      avatarBg: 'bg-red-50 text-red-700',
      checklist: [
        { name: 'Application Form Submission', done: true, time: 'Jun 28' },
        { name: 'Application Fee Payment (₹7,500)', done: true, time: 'Jun 28' },
        { name: 'IELTS Test Score Verification', done: true, time: 'Jul 12' },
        { name: 'Academic Transcript Clearance', done: true, time: 'Jul 18' },
        { name: 'Admissions Faculty Board Review', done: true, time: 'Aug 02' },
        { name: 'Offer Letter Issuance', done: true, time: 'Aug 04' },
      ]
    },
    {
      id: 2,
      university: 'TU Berlin (Technical University of Berlin)',
      course: 'M.Sc. in Data Engineering',
      country: 'Germany',
      date: 'Jul 04, 2026',
      status: 'Under Review',
      statusColor: 'bg-blue-50 text-blue-700 border-blue-100',
      initials: 'TUB',
      avatarBg: 'bg-indigo-50 text-indigo-700',
      checklist: [
        { name: 'Uni-Assist Online Submission', done: true, time: 'Jul 04' },
        { name: 'Processing Fee (₹6,500)', done: true, time: 'Jul 04' },
        { name: 'APS / Credential Records', done: true, time: 'Jul 15' },
        { name: 'Faculty Committee Evaluation', done: false, time: 'In Progress' },
      ]
    }
  ];

  const activeApp = mockApps.find(app => app.id === selectedAppId);

  return (
    <div className="space-y-6 text-left relative min-h-[500px]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </span>
            University Applications
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Ferex Education • Track submitted portfolios, dates, and active reviewing status.
          </p>
        </div>
      </div>

      {/* Grid of Applications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockApps.map((app) => (
          <Card key={app.id} className="p-6 flex flex-col justify-between hover:border-slate-200 transition-all select-none">
            <div>
              {/* Top Row: Icon & Status */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl ${app.avatarBg} font-extrabold flex items-center justify-center text-sm shadow-xs`}>
                  {app.initials}
                </div>
                <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2.5 py-1 border rounded-full ${app.statusColor}`}>
                  {app.status}
                </span>
              </div>

              {/* Title Detail */}
              <h3 className="text-base font-extrabold text-slate-900 leading-snug mb-1">{app.university}</h3>
              <p className="text-xs font-bold text-[#6A1B2E] mb-5">{app.course}</p>

              {/* Specs */}
              <div className="space-y-2 text-xs text-slate-500 font-semibold mb-6">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{app.country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Applied Date: {app.date}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button
                size="sm"
                className="text-xs flex items-center gap-1.5"
                onClick={() => setSelectedAppId(app.id)}
              >
                View Details <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* SLIDING DETAILS DRAWER OVERLAY */}
      <AnimatePresence>
        {selectedAppId && activeApp && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAppId(null)}
              className="fixed inset-0 bg-black z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
              className="fixed right-0 top-0 h-screen w-full max-w-[440px] bg-white border-l border-slate-100 shadow-2xl z-50 p-6 flex flex-col justify-between text-left"
            >
              <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                {/* Header info */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${activeApp.avatarBg} font-extrabold flex items-center justify-center text-xs shadow-xs`}>
                      {activeApp.initials}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{activeApp.university}</h3>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">{activeApp.country}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAppId(null)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Sub info */}
                <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[9px] uppercase font-black tracking-widest text-[#6A1B2E] bg-[#6A1B2E]/10 border border-[#6A1B2E]/20 px-2 py-0.5 rounded-md">
                    Active Portfolio
                  </span>
                  <h4 className="text-xs font-black text-slate-900 pt-1.5">{activeApp.course}</h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold pt-1">
                    <Calendar className="w-3.5 h-3.5 text-[#6A1B2E]" />
                    <span>Applied Date: {activeApp.date}</span>
                  </div>
                </div>

                {/* Premium Vertical Progress Timeline Checklist */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <h5 className="text-[10.5px] uppercase font-black text-slate-400 tracking-wider">
                      Application Progress Timeline
                    </h5>
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {activeApp.checklist.filter(i => i.done).length} / {activeApp.checklist.length} Completed
                    </span>
                  </div>

                  <div className="space-y-1 relative px-1">
                    {activeApp.checklist.map((item, idx) => {
                      const isLast = idx === activeApp.checklist.length - 1;
                      const isDone = item.done;
                      const isCurrent = !item.done && (idx === 0 || activeApp.checklist[idx - 1].done);

                      return (
                        <div key={idx} className="relative flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50/90 transition-all duration-200 group cursor-default">
                          {/* Vertical Connector Line */}
                          {!isLast && (
                            <div
                              className={`absolute left-[25.5px] top-[34px] bottom-[-10px] w-[2px] z-0 transition-colors ${
                                isDone && activeApp.checklist[idx + 1]?.done ? 'bg-emerald-500' : 'bg-slate-200'
                              }`}
                            />
                          )}

                          {/* Left: 28px Node Icon */}
                          <div className="flex items-center gap-3 min-w-0 flex-1 z-10">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-2xs transition-transform duration-200 group-hover:scale-105 ${
                              isDone
                                ? 'bg-emerald-500 text-white border-2 border-emerald-500'
                                : isCurrent
                                  ? 'bg-[#6A1B2E] text-white border-2 border-[#6A1B2E] ring-4 ring-[#6A1B2E]/15'
                                  : 'bg-white border-2 border-slate-300 text-transparent'
                            }`}>
                              {isDone ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : isCurrent ? (
                                <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-slate-300" />
                              )}
                            </div>

                            {/* Center: Title & Description */}
                            <div className="min-w-0 flex-1">
                              <h5 className={`text-xs font-black leading-snug transition-colors ${
                                isDone ? 'text-slate-800' : isCurrent ? 'text-[#6A1B2E]' : 'text-slate-400'
                              }`}>
                                {item.name}
                              </h5>
                              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                                {isDone ? 'Verified Step' : isCurrent ? 'Under Faculty Review' : 'Pending Step'}
                              </p>
                            </div>
                          </div>

                          {/* Right: Completion Date / Status */}
                          <div className="text-right shrink-0 pl-2 select-none z-10">
                            <span className={`text-[11px] font-extrabold transition-colors ${
                              isDone ? 'text-slate-500' : isCurrent ? 'text-[#6A1B2E] font-black' : 'text-slate-400'
                            }`}>
                              {item.time}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom footer button */}
              <div className="border-t border-slate-100 pt-4 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-bold"
                  onClick={() => setSelectedAppId(null)}
                >
                  Close Details
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
