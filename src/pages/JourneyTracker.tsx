import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, CheckCircle2, Circle, Loader2, Calendar, ShieldCheck } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const JourneyTracker: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    {
      id: 1,
      name: 'Select University',
      status: 'completed',
      date: 'Jun 15, 2026',
      desc: 'Explore catalog details, select target courses, and save choices to portal shortlist.',
      detail: 'Ashly completed selections for University of Warsaw (M.Sc. CS) and TU Berlin.'
    },
    {
      id: 2,
      name: 'Application Submitted',
      status: 'completed',
      date: 'Jun 28, 2026',
      desc: 'Submit target application materials to selected European institutions.',
      detail: 'University of Warsaw and TU Berlin applications submitted.'
    },
    {
      id: 3,
      name: 'Documents Uploaded',
      status: 'completed',
      date: 'Jul 10, 2026',
      desc: 'Upload passport verification, IELTS scores, and bachelor transcripts.',
      detail: 'IELTS certificate and academic transcripts uploaded to portal files.'
    },
    {
      id: 4,
      name: 'Offer Letter Received',
      status: 'completed',
      date: 'Aug 04, 2026',
      desc: 'University admissions selection decision and formal offer letter issued.',
      detail: 'University of Warsaw issued unconditional offer letter for M.Sc. Computer Science.'
    },
    {
      id: 5,
      name: 'Visa Processing',
      status: 'current',
      date: 'In Progress',
      desc: 'Prepare embassy appointment documentation, financial statements, and visa application.',
      detail: 'Visa guidance appointment scheduled for August 12, 2026.'
    },
    {
      id: 6,
      name: 'Pre-Departure Orientation',
      status: 'pending',
      date: 'Pending',
      desc: 'Obtain housing confirmation, flight tickets, and pre-departure checklist.',
      detail: 'Dormitory options dispatched for review.'
    },
    {
      id: 7,
      name: 'Enrolled & Arrived',
      status: 'pending',
      date: 'Pending',
      desc: 'Complete campus arrival registration and start classes.',
      detail: 'Feb 2026 intake orientation.'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, duration: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center border border-[#6A1B2E]/20">
              <Compass className="w-4 h-4" />
            </span>
            Journey Tracker
          </h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Ferex Roadmap • Step-by-step guidance from selection to campus arrival.
          </p>
        </div>
      </div>

      {/* Overview Progress Card */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 bg-white border border-slate-200/70 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="text-left space-y-1.5">
            <span className="text-[10px] uppercase font-black text-[#6A1B2E] tracking-wider block">Admissions Journey</span>
            <h3 className="text-lg font-black text-slate-900">Current Phase: Visa Processing (Stage 5)</h3>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed max-w-xl">
              Congratulations! Offer letter received from University of Warsaw. You are currently preparing your visa application package.
            </p>
          </div>
          <div className="flex flex-col items-center shrink-0">
            <div className="relative w-20 h-20 flex items-center justify-center select-none">
              <svg className="w-full h-full transform -rotate-95" viewBox="0 0 36 36">
                <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-[#6A1B2E]" strokeDasharray="65, 100" strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span className="absolute text-sm font-black text-slate-900">65%</span>
            </div>
            <span className="text-[10px] font-extrabold text-slate-400 mt-2">Overall Completion</span>
          </div>
        </Card>
      </motion.div>

      {/* Visual Timeline Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
          <Card className="p-6 border border-slate-200/70 shadow-xs">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-4 mb-6">
              Milestone Progress Flow
            </h3>

            <div className="relative border-l-2 border-slate-200/80 pl-6 ml-4 py-2 space-y-7 text-left select-none">
              {steps.map((step) => {
                const isCompleted = step.status === 'completed';
                const isCurrent = step.status === 'current';

                return (
                  <div key={step.id} className="relative">
                    <div className="absolute -left-[35px] top-0.5 shrink-0 bg-white">
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 bg-white rounded-full" />
                      ) : isCurrent ? (
                        <div className="w-6 h-6 rounded-full border-2 border-[#6A1B2E] flex items-center justify-center bg-white">
                          <Loader2 className="w-3.5 h-3.5 text-[#6A1B2E] animate-spin" />
                        </div>
                      ) : (
                        <Circle className="w-6 h-6 text-slate-300 bg-white rounded-full" />
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-400">Step {step.id}</span>
                        <h4 className="text-sm font-black text-slate-900">{step.name}</h4>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px] font-extrabold">
                        {isCompleted && (
                          <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                            Completed • {step.date}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[#6A1B2E] bg-[#6A1B2E]/10 px-2.5 py-0.5 rounded-full border border-[#6A1B2E]/20 animate-pulse">
                            In Progress
                          </span>
                        )}
                        {!isCompleted && !isCurrent && (
                          <span className="text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-100">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Right Detail Panel */}
        <motion.div variants={itemVariants} className="space-y-6 text-left">
          <Card className="p-5 border-l-4 border-l-[#6A1B2E] border-slate-200/70 shadow-xs">
            <h4 className="text-xs font-black text-[#6A1B2E] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Active Phase Highlight
            </h4>
            <h3 className="text-sm font-black text-slate-900 mb-4">Step 5: Visa Processing</h3>
            
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-400 block uppercase">Sub-Task Status</span>
                <p className="text-xs text-slate-700 font-bold leading-relaxed">
                  Financial proof and university acceptance letter submitted for embassy appointment booking.
                </p>
              </div>

              <div className="space-y-2 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Briefing Appointment: Aug 12, 2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Assigned Counselor: Education Team</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 border border-slate-200/70 shadow-xs">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-3">
              Need Assistance?
            </h3>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed mb-4">
              If you have any questions regarding visa documentation or embassy guidelines, please open a support ticket.
            </p>
            <Button size="sm" className="w-full text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => navigate('/student/support')}>
              Open Support Ticket
            </Button>
          </Card>
        </motion.div>

      </div>
    </motion.div>
  );
};
