import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, MapPin, Calendar, CheckCircle2, Clock, ArrowRight, X } from 'lucide-react';
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
        { name: 'Application Fee Payment (€85)', done: true, time: 'Jun 28' },
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
        { name: 'Processing Fee (€75)', done: true, time: 'Jul 04' },
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
              className="fixed right-0 top-0 h-screen w-full max-w-[420px] bg-white border-l border-slate-100 shadow-2xl z-50 p-6 flex flex-col justify-between text-left"
            >
              <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                {/* Header info */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${activeApp.avatarBg} font-extrabold flex items-center justify-center text-xs`}>
                      {activeApp.initials}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{activeApp.university}</h3>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">{activeApp.country}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAppId(null)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Sub info */}
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-[#6A1B2E] bg-[#6A1B2E]/5 px-2 py-0.5 rounded">
                    Active Application
                  </span>
                  <h4 className="text-sm font-bold text-slate-800 pt-1">{activeApp.course}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold pt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Submitted: {activeApp.date}</span>
                  </div>
                </div>

                {/* Checklist steps */}
                <div className="space-y-4 pt-2">
                  <h5 className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                    Application Checklist
                  </h5>

                  <div className="space-y-4 pl-1 border-l border-slate-100">
                    {activeApp.checklist.map((item, idx) => {
                      return (
                        <div key={idx} className="relative pl-5 text-xs">
                          {/* Circle bullet node */}
                          <div className="absolute -left-[10.5px] top-0.5 bg-white shrink-0">
                            {item.done ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-amber-500 bg-white" />
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-bold ${item.done ? 'text-slate-700' : 'text-slate-900'}`}>
                              {item.name}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
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
