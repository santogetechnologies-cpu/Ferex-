import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, MapPin, Calendar, ArrowRight, X, Check, Building2, Plus, LogOut, Sparkles, Download, Clock, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ToastNotification } from '../components/ToastNotification';
import { useAuth } from '../contexts/AuthContext';
import { useActiveStudentScope } from '../hooks/useActiveStudentScope';
import { useApplications } from '../hooks/useApplications';
import { isRealApplication } from '../lib/api/applications';

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'Legalization Cleared':
    case 'Legalization Approved':
    case 'NAWA Approved':
    case 'Offer Issued':
    case 'Accepted':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100 font-bold';
    case 'Legalization Lodged':
    case 'Legalization Submitted':
    case 'NAWA Submitted':
      return 'bg-indigo-50 text-indigo-700 border-indigo-100 font-bold';
    case 'Legalization Reviewed':
    case 'Legalization Review':
    case 'NAWA Review':
      return 'bg-amber-50 text-amber-800 border-amber-100 font-bold';
    case 'Under Review':
    case 'Submitted':
      return 'bg-blue-50 text-blue-700 border-blue-100 font-bold';
    case 'Rejected':
      return 'bg-red-50 text-red-700 border-red-100 font-bold';
    case 'Withdrawn':
      return 'bg-red-50 text-red-700 border-red-200 font-bold';
    default:
      return 'bg-amber-50 text-amber-700 border-amber-100 font-bold';
  }
};

export const UniversityApplications: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeStudentId } = useActiveStudentScope();
  const { applications, changeStatus, loading } = useApplications(activeStudentId);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState<string | null>(null);

  const validApplications = React.useMemo(() => {
    return applications.filter(isRealApplication);
  }, [applications]);

  const activeApp = validApplications.find(app => app.id === selectedAppId);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleDownloadOffer = async (app: any) => {
    if (app.offer_letter_url) {
      try {
        const { getSignedFileUrl } = await import('../lib/storage');
        const secureUrl = await getSignedFileUrl('offer-letters', app.offer_letter_url);
        if (secureUrl) {
          window.open(secureUrl, '_blank');
          return;
        }
      } catch {}
    }
    navigate('/student/offers');
  };

  const handleWithdraw = async (appId: string, uniName: string) => {
    try {
      setIsWithdrawing(appId);
      const app = applications.find(a => a.id === appId);
      const prevStatus = app?.status || 'Submitted';
      await changeStatus(appId, 'Withdrawn', `Withdrawn from ${prevStatus}`);
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
      <ToastNotification message={toastMessage} onClose={() => setToastMessage('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#58051E]/5 text-[#58051E] flex items-center justify-center">
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
          className="flex items-center gap-2 h-9 px-4 bg-[#58051E] text-white text-xs font-bold rounded-xl hover:bg-[#430316] transition-all shadow-sm self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Apply to University
        </button>
      </div>

      {/* Grid of Applications */}
      {loading && validApplications.length === 0 ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400">Loading applications...</div>
      ) : validApplications.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-2xl p-12 text-center shadow-xs">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Applications Submitted Yet</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto mb-5">
            Browse our catalog of accredited partner universities in Europe and submit your application for the upcoming intake.
          </p>
          <button
            onClick={() => navigate('/student/select-university')}
            className="inline-flex items-center gap-2 h-9.5 px-5 bg-[#58051E] text-white text-xs font-bold rounded-xl hover:bg-[#430316] transition-all shadow-sm"
          >
            Explore & Select Universities <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {validApplications.map((app) => (
            <Card key={app.id} className="p-6 flex flex-col justify-between hover:border-slate-200 transition-all select-none bg-white">
              <div>
                {/* Top Row: Icon & Status */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#58051E]/10 text-[#58051E] font-black flex items-center justify-center text-base shadow-xs shrink-0">
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
                <p className="text-xs font-bold text-[#58051E] mb-5">
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

                {app.status !== 'Withdrawn' && (app.status as string) !== 'Approved' && (app.status as string) !== 'Closed' && (
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
                    <div className="w-10 h-10 rounded-xl bg-[#58051E]/10 text-[#58051E] font-black flex items-center justify-center text-sm shadow-xs">
                      {activeApp.university_name?.[0] || 'U'}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">{activeApp.university_name}</h3>
                      <p className="text-xs font-semibold text-[#58051E]">{activeApp.program_name}</p>
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

                  <div className="space-y-4 relative">
                    {(() => {
                      const isWithdrawn = activeApp.status === 'Withdrawn';
                      const notes = (activeApp.notes || '').toLowerCase();
                      
                      let withdrawnIdx = -1;
                      if (isWithdrawn) {
                        if (notes.includes('visa stamped') || notes.includes('admission finalized') || notes.includes('visa approved') || notes.includes('enrolled') || notes.includes('stage 6')) {
                          withdrawnIdx = 6;
                        } else if (notes.includes('vfs') || notes.includes('visa processing') || notes.includes('embassy') || notes.includes('stage 5') || activeApp.final_acceptance_url) {
                          withdrawnIdx = 5;
                        } else if (notes.includes('final acceptance') || notes.includes('accepted') || notes.includes('stage 4') || activeApp.offer_letter_url) {
                          withdrawnIdx = 4;
                        } else if (notes.includes('offer issued') || notes.includes('offer letter') || notes.includes('stage 3') || notes.includes('offer')) {
                          withdrawnIdx = 3;
                        } else if (notes.includes('board') || notes.includes('faculty') || notes.includes('evaluation') || notes.includes('under review') || notes.includes('stage 2')) {
                          withdrawnIdx = 2;
                        } else if (notes.includes('application form') || notes.includes('draft') || notes.includes('stage 0')) {
                          withdrawnIdx = 0;
                        } else {
                          // Default for submitted application is Stage 1 (University Document Review)
                          withdrawnIdx = 1;
                        }
                      }

                      const stepsDef = [
                        { name: 'Application Form Submission' },
                        { name: 'University Document Review' },
                        { name: 'Faculty Admissions Board Evaluation' },
                        { name: 'Official Offer Letter Issuance' },
                        { name: 'Final Acceptance Letter Released' },
                        { name: 'VFS Visa Processing & Embassy Submission' },
                        { name: 'Visa Stamped & Admission Finalized' },
                      ];

                      const milestones = isWithdrawn
                        ? stepsDef.slice(0, withdrawnIdx + 1).map((step, idx) => {
                            if (idx < withdrawnIdx) {
                              return {
                                name: step.name,
                                time: 'Completed',
                                icon: <Check className="w-4 h-4 stroke-[3]" />,
                                circleClass: 'bg-emerald-500 text-white shadow-xs',
                                titleClass: 'text-slate-900 font-extrabold',
                                timeClass: 'font-bold text-slate-400',
                                lineColor: idx === withdrawnIdx - 1 ? 'bg-red-500' : 'bg-emerald-500',
                              };
                            }
                            return {
                              name: step.name,
                              time: 'Withdrawn',
                              icon: <X className="w-4 h-4 stroke-[3]" />,
                              circleClass: 'bg-red-500 text-white shadow-xs ring-4 ring-red-100',
                              titleClass: 'text-red-700 font-extrabold',
                              timeClass: 'font-extrabold text-red-600',
                              lineColor: 'bg-slate-100',
                            };
                          })
                        : [
                            {
                              name: 'Application Form Submission',
                              time: 'Completed',
                              icon: <Check className="w-4 h-4 stroke-[3]" />,
                              circleClass: 'bg-emerald-500 text-white shadow-xs',
                              titleClass: 'text-slate-900 font-extrabold',
                              timeClass: 'font-bold text-slate-400',
                              lineColor: !['Submitted', 'Draft'].includes(activeApp.status) ? 'bg-emerald-500' : 'bg-slate-100',
                            },
                            {
                              name: 'University Document Review',
                              time: activeApp.status === 'Submitted' ? 'In Progress' : 'Completed',
                              icon: !['Submitted', 'Draft'].includes(activeApp.status) ? <Check className="w-4 h-4 stroke-[3]" /> : <span className="text-[10px] font-bold">2</span>,
                              circleClass: !['Submitted', 'Draft'].includes(activeApp.status) ? 'bg-emerald-500 text-white shadow-xs' : 'bg-[#58051E] text-white shadow-xs',
                              titleClass: 'text-slate-900 font-extrabold',
                              timeClass: activeApp.status === 'Submitted' ? 'font-bold text-[#58051E]' : 'font-bold text-slate-400',
                              lineColor: ['Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status) ? 'bg-emerald-500' : 'bg-slate-100',
                            },
                            {
                              name: 'Faculty Admissions Board Evaluation',
                              time: activeApp.status === 'Submitted' ? 'Pending' : activeApp.status === 'Under Review' ? 'In Progress' : 'Completed',
                              icon: ['Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status)
                                ? <Check className="w-4 h-4 stroke-[3]" />
                                : <span className="text-[10px] font-bold">3</span>,
                              circleClass: ['Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status)
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : activeApp.status === 'Under Review' ? 'bg-[#58051E] text-white shadow-xs' : 'bg-slate-100 text-slate-400 border border-slate-200',
                              titleClass: ['Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed', 'Under Review'].includes(activeApp.status) ? 'text-slate-900 font-extrabold' : 'text-slate-400',
                              timeClass: activeApp.status === 'Under Review' ? 'font-bold text-[#58051E]' : 'font-bold text-slate-400',
                              lineColor: ['Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status) ? 'bg-emerald-500' : 'bg-slate-100',
                            },
                            {
                              name: 'Official Offer Letter Issuance',
                              time: ['Submitted', 'Under Review'].includes(activeApp.status) ? 'Pending' : 'Completed',
                              icon: ['Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status)
                                ? <Check className="w-4 h-4 stroke-[3]" />
                                : <span className="text-[10px] font-bold">4</span>,
                              circleClass: ['Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status)
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-400 border border-slate-200',
                              titleClass: ['Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status) ? 'text-slate-900 font-extrabold' : 'text-slate-400',
                              timeClass: 'font-bold text-slate-400',
                              lineColor: ['Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status) ? 'bg-emerald-500' : 'bg-slate-100',
                            },
                            {
                              name: 'Final Acceptance Letter Released',
                              time: ['Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status) ? 'Completed' : 'Pending',
                              icon: ['Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status)
                                ? <Check className="w-4 h-4 stroke-[3]" />
                                : <span className="text-[10px] font-bold">5</span>,
                              circleClass: ['Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status)
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-400 border border-slate-200',
                              titleClass: ['Final Acceptance Issued', 'Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status) ? 'text-slate-900 font-extrabold' : 'text-slate-400',
                              timeClass: 'font-bold text-slate-400',
                              lineColor: ['Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status) ? 'bg-emerald-500' : 'bg-slate-100',
                            },
                            {
                              name: 'VFS Visa Processing & Embassy Submission',
                              time: ['Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status) ? 'Completed' : 'Pending',
                              icon: ['Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status)
                                ? <Check className="w-4 h-4 stroke-[3]" />
                                : <span className="text-[10px] font-bold">6</span>,
                              circleClass: ['Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status)
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-400 border border-slate-200',
                              titleClass: ['Visa Processing', 'Visa Approved', 'Approved', 'Closed'].includes(activeApp.status) ? 'text-slate-900 font-extrabold' : 'text-slate-400',
                              timeClass: 'font-bold text-slate-400',
                              lineColor: ['Visa Approved', 'Approved', 'Closed'].includes(activeApp.status) ? 'bg-emerald-500' : 'bg-slate-100',
                            },
                            {
                              name: 'Visa Stamped & Admission Finalized',
                              time: ['Visa Approved', 'Approved', 'Closed'].includes(activeApp.status) ? 'Completed' : 'Pending',
                              icon: ['Visa Approved', 'Approved', 'Closed'].includes(activeApp.status)
                                ? <Check className="w-4 h-4 stroke-[3]" />
                                : <span className="text-[10px] font-bold">7</span>,
                              circleClass: ['Visa Approved', 'Approved', 'Closed'].includes(activeApp.status)
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-400 border border-slate-200',
                              titleClass: ['Visa Approved', 'Approved', 'Closed'].includes(activeApp.status) ? 'text-slate-900 font-extrabold' : 'text-slate-400',
                              timeClass: 'font-bold text-slate-400',
                              lineColor: 'bg-slate-100',
                            },
                          ];

                      return milestones.map((step, idx) => (
                        <div key={idx} className="relative flex items-center justify-between gap-3 text-xs">
                          {idx < milestones.length - 1 && (
                            <div
                              className={`absolute left-[13px] top-7 h-4 w-0.5 z-0 transition-colors ${step.lineColor}`}
                            />
                          )}
                          <div className="flex items-center gap-3 relative z-10">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${step.circleClass}`}>
                              {step.icon}
                            </div>
                            <span className={`font-semibold ${step.titleClass}`}>
                              {step.name}
                            </span>
                          </div>
                          <span className={`text-[10px] ${step.timeClass}`}>{step.time}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2.5">
                {/* Official Offer Letter Card */}
                {activeApp.status === 'Withdrawn' ? (
                  <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-1 text-left shadow-xs">
                    <span className="text-[10px] font-black uppercase text-red-800 tracking-wider flex items-center gap-1.5">
                      <X className="w-3.5 h-3.5 text-red-600" />
                      Application Withdrawn
                    </span>
                    <p className="text-[11px] text-red-950 font-medium">
                      This application has been formally withdrawn. No further admissions evaluation or visa processing will be conducted.
                    </p>
                  </div>
                ) : (activeApp.offer_letter_url || activeApp.status === 'Offer Issued' || activeApp.status === 'Accepted') ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        Official Admission Offer Letter Issued!
                      </span>
                      <span className="text-[9.5px] font-extrabold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                        Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-950 font-semibold">
                      Your official admission offer letter for {activeApp.course || activeApp.university_name} is released by the university admissions council.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDownloadOffer(activeApp)}
                      className="w-full h-9.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" /> Download Official Offer Letter (PDF)
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 bg-white border border-indigo-100 rounded-xl space-y-2 text-left shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-indigo-900 tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        Official Offer Letter Status
                      </span>
                      <span className="text-[9.5px] font-extrabold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                        Admissions Review
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                      Your university admission file is currently under review by the admissions board. Once approved, your official Offer Letter will appear here and under the Offer Letters tab.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/student/offers')}
                      className="text-[11px] font-bold text-[#58051E] hover:underline flex items-center gap-1 pt-0.5 cursor-pointer"
                    >
                      Go to Offer Letters & Acceptance Hub &rarr;
                    </button>
                  </div>
                )}
                {activeApp.status !== 'Withdrawn' && (activeApp.status as string) !== 'Approved' && (activeApp.status as string) !== 'Closed' && (
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
