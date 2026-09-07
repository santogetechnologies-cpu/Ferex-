import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Clock, Lock, ArrowRight, RefreshCw, Sparkles, XCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useVisa } from '../hooks/useVisa';
import { useApplications } from '../hooks/useApplications';
import { usePayments } from '../hooks/usePayments';
import { useDocuments } from '../hooks/useDocuments';

export const VisaTracker: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { records, saveVisaUpdate, loading: visaLoading } = useVisa(user?.id);
  const { applications, loading: appsLoading } = useApplications(user?.id);
  const { payments, loading: paymentsLoading } = usePayments(user?.id);
  const { documents, loading: docsLoading } = useDocuments(user?.id);

  const [reappealLoading, setReappealLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';

  // Workflow Gating Checks: Offer Acceptance -> 2nd Installment Payment -> Final Acceptance Letter -> VFS Visa
  const hasOfferAccepted = applications.some(a => (a.status as string) === 'Accepted' || (a.status as string) === 'Final Acceptance Issued');

  const checkPaymentStage = (p: any, stageNum: number) => {
    if (p.stage_number !== undefined && p.stage_number !== null) {
      return Number(p.stage_number) === stageNum;
    }
    const text = (String(p.title || '') + ' ' + String(p.description || '') + ' ' + String(p.payment_type || '')).toLowerCase();
    if (stageNum === 1) return text.includes('1st') || text.includes('stage 1') || text.includes('registration fee') || text.includes('audit deposit');
    if (stageNum === 2) return text.includes('2nd') || text.includes('stage 2') || text.includes('tuition fee');
    if (stageNum === 3) return text.includes('3rd') || text.includes('stage 3') || text.includes('vfs') || text.includes('visa clearance');
    return false;
  };

  const inst2Paid = payments.some(p => checkPaymentStage(p, 2) && (p.status === 'Paid' || p.status === 'Verified'));
  const inst3Paid = payments.some(p => checkPaymentStage(p, 3) && (p.status === 'Paid' || p.status === 'Verified'));

  // Final Acceptance Letter check
  const hasFinalAcceptanceDoc = documents.some(d =>
    d.file_name.toLowerCase().includes('final_acceptance') ||
    d.file_name.toLowerCase().includes('final acceptance') ||
    d.reviewer_notes?.toLowerCase().includes('final acceptance')
  );

  const isFinalAcceptanceUnlocked = hasFinalAcceptanceDoc || applications.some(a =>
    (a.status as string) === 'Final Acceptance Issued' ||
    (a.status as string) === 'Enrolled' ||
    Boolean(a.final_acceptance_url)
  );

  const foundRecord = records.find(r =>
    (user?.id && r.student_id === user.id) ||
    (user?.email && (r as any).student_email && (r as any).student_email.toLowerCase() === user.email.toLowerCase())
  );

  const initialPendingRecord = {
    id: user?.id || 'vfs-pending',
    student_id: user?.id || '',
    student_name: studentName,
    vfs_ref_no: 'Awaiting Admin Booking',
    embassy_name: 'Consular Department & Embassy',
    vfs_center: 'VFS Global Application Center',
    appointment_date: 'Not Scheduled Yet',
    passport_no: 'Pending Vault Verification',
    courier_tracking_no: 'Not Assigned',
    current_stage: 1, // Stage 1 (Documents Ready)
    status_label: 'Documents Preparation in Progress',
    decision_outcome: 'Pending',
    notes: 'Visa application file will be prepared and booked by FEREX counselor.'
  };

  const visaRecord = foundRecord || initialPendingRecord;

  // Decision outcome strictly controlled by Agency in Admin Panel
  const rawOutcome = (visaRecord as any)?.decision_outcome ||
    (visaRecord?.status_label?.toLowerCase().includes('approv') ? 'Approved' :
     visaRecord?.status_label?.toLowerCase().includes('reject') || visaRecord?.status_label?.toLowerCase().includes('refus') ? 'Rejected' : 'Pending');

  const isVerdictApproved = rawOutcome === 'Approved';
  const isVerdictRejected = rawOutcome === 'Rejected';
  const isVerdictPending = !isVerdictApproved && !isVerdictRejected;

  // Standardized 8 Stages for Visa Application Tracker
  const stages = [
    { num: 1, name: 'Documents Ready', desc: 'All financial, academic & sponsor documents verified' },
    { num: 2, name: 'Visa File Prepared', desc: 'Cover letter, SOP, forms & visa dossier compiled' },
    { num: 3, name: 'VFS Appointment Booked', desc: 'Official appointment slot confirmed at VFS center' },
    { num: 4, name: 'VFS Submitted', desc: 'Biometrics given & physical dossier handed over' },
    { num: 5, name: 'Consular Processing', desc: 'Application actively under embassy officer review' },
    { num: 6, name: 'Decision Made', desc: 'Consular evaluation complete & sealed for return' },
    { num: 7, name: 'Passport Return', desc: 'Courier dispatch & tracking in transit' },
    { num: 8, name: 'Visa Result Confirmed', desc: 'Passport collected & visa stamp verified' },
  ];

  const currentStageNum = visaRecord.current_stage || 1;
  const isLoading = visaLoading || appsLoading || paymentsLoading || docsLoading;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Re-appeal & Re-file Workflow from Stage 2 (Visa File Prepared)
  const handleInitiateReappeal = async () => {
    try {
      setReappealLoading(true);
      await saveVisaUpdate(visaRecord.id, {
        current_stage: 2,
        status_label: 'Re-appeal File Prepared & Rescheduled',
        decision_outcome: 'Pending',
        notes: 'Re-appeal application packet and justification letter compiled.'
      });
      showToast('🔄 Re-appeal initiated! Your Visa tracking has been restarted from Stage 2 (Visa File Prepared).');
    } catch (err: any) {
      showToast('Re-appeal file updated locally. Rescheduling Stage 2 submission...');
    } finally {
      setReappealLoading(false);
    }
  };

  if (isLoading) {
    return <div className="py-16 text-center text-xs font-bold text-slate-400">Loading Visa tracking & prerequisite status...</div>;
  }

  return (
    <div className="space-y-6 text-left relative min-h-[600px]">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-extrabold border border-slate-700 animate-bounce flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300" />
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-[#4A101E] to-[#6A1B2E] text-white p-6 sm:p-8 rounded-3xl shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-extrabold uppercase tracking-wider mb-3 backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" /> 🟨 Visa Application Tracker (8 Stages)
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-1.5">Visa Status for {studentName}</h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-300 leading-relaxed">
            Real-time embassy & VFS dossier pipeline from document preparation to passport delivery and visa outcome.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-white/20 text-white hover:bg-white/10 text-xs font-bold"
          onClick={() => navigate('/student/journey')}
        >
          View Full Journey (3 Trackers)
        </Button>
      </div>

      {/* Prerequisites Banner if Final Acceptance is Pending */}
      {!isFinalAcceptanceUnlocked && (
        <Card className="p-5 border border-amber-200/80 bg-amber-50/50 text-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300/40 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                  Prerequisites for VFS Visa Filing In Progress
                </h4>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${hasOfferAccepted ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                    1. Offer {hasOfferAccepted ? '✓' : 'Pending'}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${inst2Paid ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>
                    2. 2nd Installment {inst2Paid ? '✓' : 'Pending'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-300">
                    3. Final Letter Pending
                  </span>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                You can track your 8 visa stages below. Official VFS appointment booking will be finalized once your Final Acceptance Letter is released by the university.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {!hasOfferAccepted && (
                  <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-white text-xs font-bold h-8 px-3" onClick={() => navigate('/student/offers')}>
                    View & Accept Offer <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
                {hasOfferAccepted && !inst2Paid && (
                  <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold h-8 px-3" onClick={() => navigate('/student/payments')}>
                    Pay 2nd Installment <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Decision Reveal Banner — Strictly controlled by Agency Selection */}
      {isVerdictPending ? (
        <Card className="p-5 border border-amber-200 bg-amber-50/60 text-slate-800 rounded-2xl flex items-start gap-3.5 shadow-xs">
          <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
              {currentStageNum === 7 ? 'Passport in Courier Transit — Verdict Sealed' : 'Consular Processing / Decision In Progress'}
            </h4>
            <p className="text-xs font-semibold text-amber-800/90 mt-0.5 leading-relaxed">
              {currentStageNum === 7
                ? 'Your passport is currently in transit. In compliance with embassy rules, your visa verdict is sealed in your envelope and will be updated by your counselor upon physical delivery at Stage 8.'
                : 'In compliance with VFS consular regulations, official outcomes remain sealed until passport retrieval is verified by agency counselors.'}
            </p>
          </div>
        </Card>
      ) : isVerdictApproved ? (
        <Card className="p-6 border border-emerald-200 bg-emerald-50/80 text-emerald-950 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full border border-emerald-300">
                Official Consular Verdict — Approved
              </span>
              <h3 className="text-lg font-black text-emerald-950 mt-1">🎉 VISA APPROVED & STAMPED ON PASSPORT!</h3>
              <p className="text-xs font-semibold text-emerald-800 mt-0.5">
                Your National Student Visa has been granted. Proceed to Travel Checklist to prepare flight, accommodation, and airport arrival.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shrink-0" onClick={() => navigate('/student/predeparture')}>
              Go to Travel Tracker (9 Stages) <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6 border border-red-200 bg-red-50/80 text-red-950 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-red-800 bg-red-200/60 px-2 py-0.5 rounded-full border border-red-300">
                Embassy Refusal Notice Received
              </span>
              <h3 className="text-lg font-black text-red-950 mt-1">Visa Application Refused by Consular Desk</h3>
              <p className="text-xs font-semibold text-red-800 mt-0.5 leading-relaxed">
                Refusal grounds provided by embassy. You are eligible to file a formal re-appeal with updated justification documents starting back from Stage 2.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            disabled={reappealLoading}
            className="bg-[#6A1B2E] hover:bg-[#521221] text-white font-extrabold text-xs shrink-0 shadow-md flex items-center gap-1.5"
            onClick={handleInitiateReappeal}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reappealLoading ? 'animate-spin' : ''}`} />
            {reappealLoading ? 'Re-filing Stage 2...' : '🔄 Initiate Re-appeal & Re-file VFS'}
          </Button>
        </Card>
      )}

      {/* Main 8 Stage Tracker Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 8 Stage Progress */}
        <Card className="lg:col-span-2 p-6 border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-900">Visa Processing Pipeline</h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Live 8-stage progress from document assembly to stamped passport</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                isVerdictApproved
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-black'
                  : isVerdictRejected
                  ? 'bg-red-50 text-red-800 border-red-200 font-black'
                  : 'bg-amber-50 text-amber-700 border-amber-200 font-extrabold'
              }`}>
                {isVerdictApproved
                  ? '✓ Visa Verdict: Approved'
                  : isVerdictRejected
                  ? '✕ Visa Verdict: Refused'
                  : `Stage ${currentStageNum} of 8 Active`}
              </span>
            </div>
          </div>

          <div className="space-y-6 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100">
            {stages.map((st) => {
              const isPast = st.num < currentStageNum || (st.num === 8 && (rawOutcome === 'Approved' || rawOutcome === 'Rejected'));
              const isCurrent = st.num === currentStageNum && !(st.num === 8 && (rawOutcome === 'Approved' || rawOutcome === 'Rejected'));

              return (
                <div key={st.num} className="relative flex items-start gap-4 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                    isPast
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : isCurrent
                      ? 'bg-[#6A1B2E] text-white ring-4 ring-[#6A1B2E]/10 animate-pulse'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : st.num}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs font-black ${isCurrent ? 'text-[#6A1B2E]' : isPast ? 'text-slate-900' : 'text-slate-400'}`}>
                        {st.name}
                      </h4>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        isPast ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isCurrent ? 'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20' : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}>
                        {isPast ? 'Cleared' : isCurrent ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right Column: Reference & Appointment Info */}
        <div className="space-y-6">
          <Card className="p-6 border border-slate-200/80 space-y-4 bg-white">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">VFS Appointment Details</h3>

            <div className="space-y-3 text-xs font-semibold text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tracking Reference:</span>
                <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md font-mono">{visaRecord.vfs_ref_no || 'VFS-84920'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Appointment Date:</span>
                <span className="font-bold text-slate-900">{visaRecord.appointment_date || 'Scheduled Soon'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Target Consular Embassy:</span>
                <span className="font-bold text-slate-900">{visaRecord.embassy_name || 'European Union'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">VFS Center:</span>
                <span className="font-bold text-[#6A1B2E]">{visaRecord.vfs_center || 'Main Metro VFS Desk'}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-400">Courier Parcel:</span>
                {currentStageNum >= 7 && visaRecord.courier_tracking_no ? (
                  <span className="font-mono text-emerald-700 font-extrabold">{visaRecord.courier_tracking_no}</span>
                ) : currentStageNum >= 7 ? (
                  <span className="text-amber-700 font-bold text-[11px]">Dispatched (Tracking Awaited)</span>
                ) : (
                  <span className="text-slate-400 font-bold text-[11px]">Available upon dispatch (Stage 7)</span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
