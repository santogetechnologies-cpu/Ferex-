import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, MapPin, Calendar, ArrowRight, X, Check, Building2, Plus, LogOut, Sparkles, Download, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApplications } from '../hooks/useApplications';

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'Offer Issued':
    case 'Accepted':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100 font-bold';
    case 'Under Review':
    case 'Submitted':
      return 'bg-blue-50 text-blue-700 border-blue-100 font-bold';
    case 'Rejected':
      return 'bg-red-50 text-red-700 border-red-100 font-bold';
    case 'Withdrawn':
      return 'bg-slate-100 text-slate-500 border-slate-200 font-bold';
    default:
      return 'bg-amber-50 text-amber-700 border-amber-100 font-bold';
  }
};

export const UniversityApplications: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { applications, changeStatus, loading } = useApplications(user?.id);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState<string | null>(null);

  const activeApp = applications.find(app => app.id === selectedAppId);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleWithdraw = async (appId: string, uniName: string) => {
    try {
      setIsWithdrawing(appId);
      await changeStatus(appId, 'Withdrawn');
      showToast(`Application for ${uniName} has been withdrawn.`);
    } catch (err: any) {
      showToast(`Error withdrawing application: ${err.message || 'Failed'}`);
    } finally {
      setIsWithdrawing(null);
    }
  };

  return (
    <div className="space-y-6 text-left relative min-h-[500px]">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

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
            Track submitted portfolios, admission timelines, and active reviewing status.
          </p>
        </div>

        <button
          onClick={() => navigate('/student/select-university')}
          className="flex items-center gap-2 h-9 px-4 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] transition-all shadow-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Apply to University
        </button>
      </div>

      {/* Grid of Applications */}
      {loading && applications.length === 0 ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400">Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-2xl p-12 text-center shadow-xs">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Applications Submitted Yet</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto mb-5">
            Browse our catalog of accredited partner universities in Europe and submit your application for the upcoming intake.
          </p>
          <button
            onClick={() => navigate('/student/select-university')}
            className="inline-flex items-center gap-2 h-9.5 px-5 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] transition-all shadow-sm"
          >
            Explore & Select Universities <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {applications.map((app) => (
            <Card key={app.id} className="p-6 flex flex-col justify-between hover:border-slate-200 transition-all select-none bg-white">
              <div>
                {/* Top Row: Icon & Status */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] font-black flex items-center justify-center text-base shadow-xs shrink-0">
                    {app.university_name?.[0] || 'U'}
                  </div>
                  <span className={`text-[9px] uppercase font-extrabold tracking-wider px-2.5 py-1 border rounded-full ${getStatusStyle(app.status)}`}>
                    {app.status}
                  </span>
                </div>

                {/* Title Detail */}
                <h3 className="text-base font-extrabold text-slate-900 leading-snug mb-1">
                  {app.university_name || app.universities?.name}
                </h3>
                <p className="text-xs font-bold text-[#6A1B2E] mb-5">
                  Course Selected: <span className="text-slate-700 font-extrabold">{app.course || app.program_name || 'Selected Program'}</span>
                </p>

                {/* Specs */}
                <div className="space-y-2 text-xs text-slate-500 font-semibold mb-6">
                  {app.universities?.country && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{app.universities.city ? `${app.universities.city}, ` : ''}{app.universities.country}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Intake: {app.intake || 'October Intake'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Applied Date: {new Date(app.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1 justify-center text-xs font-bold group"
                  onClick={() => setSelectedAppId(app.id)}
                >
                  Track Timeline
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ml-1" />
                </Button>

                {app.status !== 'Withdrawn' && app.status !== 'Approved' && app.status !== 'Closed' && (
                  <button
                    onClick={() => handleWithdraw(app.id, app.university_name || 'University')}
                    disabled={isWithdrawing === app.id}
                    className="h-9 px-3 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all flex items-center gap-1"
                    title="Withdraw Application"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Withdraw
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Drawer Overlay for Application Timeline */}
      <AnimatePresence>
        {activeApp && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAppId(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50"
            />

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-50 shadow-2xl border-l border-slate-100 flex flex-col justify-between text-left"
            >
              <div>
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] font-black flex items-center justify-center text-sm shadow-xs">
                      {activeApp.university_name?.[0] || 'U'}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">{activeApp.university_name}</h3>
                      <p className="text-xs font-semibold text-[#6A1B2E]">{activeApp.program_name}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedAppId(null)}
                    className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Status Summary Banner */}
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Current Status</span>
                    <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border inline-block ${getStatusStyle(activeApp.status)}`}>
                      {activeApp.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Target Intake</span>
                    <span className="text-xs font-extrabold text-slate-800">{activeApp.intake || 'October Intake'}</span>
                  </div>
                </div>

                {/* Progress Checklist */}
                <div className="p-6">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-5">
                    Admission Progress Milestones
                  </h4>

                  <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-100">
                    {[
                      { 
                        name: 'Application Form Submission', 
                        done: true, 
                        time: 'Completed' 
                      },
                      { 
                        name: 'University Document Review', 
                        done: activeApp.status !== 'Submitted' && activeApp.status !== 'Withdrawn', 
                        time: activeApp.status === 'Submitted' ? 'In Progress' : 'Completed' 
                      },
                      { 
                        name: 'Faculty Admissions Board Evaluation', 
                        done: ['Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status), 
                        time: ['Submitted', 'Under Review'].includes(activeApp.status) ? 'In Progress' : 'Completed' 
                      },
                      { 
                        name: 'Official Offer Letter Issuance', 
                        done: ['Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status), 
                        time: ['Submitted', 'Under Review'].includes(activeApp.status) ? 'Pending' : 'Completed' 
                      },
                      { 
                        name: 'Final Acceptance Letter Released', 
                        done: ['Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status), 
                        time: ['Submitted', 'Under Review', 'Offer Issued', 'Accepted'].includes(activeApp.status) ? 'Pending' : 'Completed' 
                      },
                      { 
                        name: 'VFS Visa Processing & Embassy Submission', 
                        done: ['Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status), 
                        time: ['Submitted', 'Under Review', 'Offer Issued', 'Accepted', 'Final Acceptance Issued'].includes(activeApp.status) ? 'Pending' : 'Completed' 
                      },
                      { 
                        name: 'Visa Stamped & Admission Finalized', 
                        done: ['Visa Approved', 'Approved', 'Closed'].includes(activeApp.status), 
                        time: ['Visa Approved', 'Approved', 'Closed'].includes(activeApp.status) ? 'Completed' : 'Pending' 
                      }
                    ].map((step, idx) => (
                      <div key={idx} className="relative flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 transition-colors ${step.done ? 'bg-emerald-500 text-white shadow-xs' : 'bg-slate-100 text-slate-400 border border-slate-200'
                            }`}>
                            {step.done ? <Check className="w-4 h-4 stroke-[3]" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                          </div>
                          <span className={`font-semibold ${step.done ? 'text-slate-900 font-extrabold' : 'text-slate-400'}`}>
                            {step.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{step.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
                {(activeApp.offer_letter_url || activeApp.status === 'Offer Issued' || activeApp.status === 'Accepted') && (
                  <a
                    href={activeApp.offer_letter_url || '#'}
                    download={`Offer_Letter_${activeApp.university_name || 'University'}.pdf`}
                    onClick={(e) => {
                      if (!activeApp.offer_letter_url) {
                        e.preventDefault();
                        alert(`Official Offer Letter from ${activeApp.university_name || 'University'} is attached. (Status: ${activeApp.status})`);
                      }
                    }}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all"
                  >
                    <Download className="w-4 h-4" /> Download Official Offer Letter (PDF)
                  </a>
                )}
                {activeApp.status !== 'Withdrawn' && activeApp.status !== 'Approved' && activeApp.status !== 'Closed' && (
                  <button
                    onClick={() => {
                      handleWithdraw(activeApp.id, activeApp.university_name || 'University');
                      setSelectedAppId(null);
                    }}
                    className="w-full h-9 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <LogOut className="w-4 h-4" /> Withdraw Application
                  </button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-center text-xs font-bold"
                  onClick={() => setSelectedAppId(null)}
                >
                  Close Tracker
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
