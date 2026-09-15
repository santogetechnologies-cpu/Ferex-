import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, CheckCircle2, Clock, Lock, ArrowRight,
  RefreshCw, XCircle, AlertCircle, CreditCard, Building,
  Calendar, MapPin, Truck
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useVisa } from '../hooks/useVisa';
import { useApplications } from '../hooks/useApplications';
import { usePayments } from '../hooks/usePayments';
import { useDocuments } from '../hooks/useDocuments';
import { canAccessPage, checkPaymentStage as checkPayment } from '../lib/paymentUnlock';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Workflow Gating Checks
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

  const targetCountry = (profile as any)?.target_country || localStorage.getItem('ferex_student_target_country') || '';
  const payment2Status = checkPayment(payments, 2, targetCountry);

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

  const myId = (user?.id || profile?.id || '').toLowerCase().trim();
  const myEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const myName = (profile?.full_name || (user as any)?.user_metadata?.full_name || '').toLowerCase().trim();

  const foundRecord = records.find(r =>
    (myId && (r.student_id?.toLowerCase().trim() === myId || r.id?.toLowerCase().trim() === myId)) ||
    (myEmail && (
      (r.student_email && r.student_email.toLowerCase().trim() === myEmail) ||
      (r.student_id && r.student_id.toLowerCase().trim() === myEmail) ||
      (r.student_name && r.student_name.toLowerCase().trim() === myEmail)
    )) ||
    (myName && r.student_name && r.student_name.toLowerCase().trim() === myName)
  ) || (records.length > 0 ? records[0] : null);

  const initialPendingRecord = {
    id: user?.id || 'vfs-pending',
    student_id: user?.id || '',
    student_name: studentName,
    vfs_ref_no: 'Awaiting Counselor Booking',
    embassy_name: 'Consular Department & Embassy',
    vfs_center: 'VFS Global Application Center',
    appointment_date: 'Scheduling in Progress',
    passport_no: 'Pending Vault Verification',
    courier_tracking_no: 'Not Assigned',
    current_stage: 1,
    status_label: 'Documents Preparation in Progress',
    decision_outcome: 'Pending',
    notes: 'Visa application file will be compiled and booked by FEREX counselor.'
  };

  const visaRecord = foundRecord || initialPendingRecord;

  const rawOutcome = (visaRecord as any)?.decision_outcome ||
    (visaRecord?.status_label?.toLowerCase().includes('approv') ? 'Approved' :
     visaRecord?.status_label?.toLowerCase().includes('reject') || visaRecord?.status_label?.toLowerCase().includes('refus') ? 'Rejected' :
     (visaRecord?.current_stage === 8 ? 'Approved' : 'Pending'));

  const isVerdictApproved = rawOutcome === 'Approved';
  const isVerdictRejected = rawOutcome === 'Rejected';
  const isVerdictPending = !isVerdictApproved && !isVerdictRejected;

  const stages = [
    { num: 1, name: 'Documents Ready', desc: 'Financial proofs, transcripts, apostilles verified' },
    { num: 2, name: 'Visa File Prepared', desc: 'Motivation statement, application forms & dossier compiled' },
    { num: 3, name: 'VFS Appointment Booked', desc: 'Official biometric appointment slot confirmed' },
    { num: 4, name: 'VFS Submission', desc: 'Biometric capture & physical file lodged' },
    { num: 5, name: 'Consular Processing', desc: 'Application undergoing embassy evaluation' },
    { num: 6, name: 'Decision Made', desc: 'Consular review completed and parcel sealed' },
    { num: 7, name: 'Passport Return', desc: 'Secure courier dispatch in transit' },
    { num: 8, name: 'Visa Verification', desc: 'Passport retrieved & entry vignette verified' },
  ];

  const currentStageNum = visaRecord.current_stage || 1;
  const isLoading = visaLoading || appsLoading || paymentsLoading || docsLoading;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const handleInitiateReappeal = async () => {
    try {
      setReappealLoading(true);
      await saveVisaUpdate(visaRecord.id, {
        current_stage: 2,
        status_label: 'Re-appeal File Prepared & Rescheduled',
        decision_outcome: 'Pending',
        notes: 'Re-appeal application packet and justification letter compiled.'
      });
      showToast('Re-appeal initiated. Visa tracking reset to Stage 2 (File Prepared).');
    } catch (err: any) {
      showToast('Re-appeal file updated locally. Rescheduling Stage 2 submission.');
    } finally {
      setReappealLoading(false);
    }
  };

  if (isLoading) {
    return <div className="py-16 text-center text-xs font-semibold text-slate-400">Loading visa processing status...</div>;
  }

  return (
    <div className="space-y-6 text-left relative min-h-[600px] pb-10">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-card text-xs font-semibold flex items-center gap-2 border border-slate-700"
          >
            <ShieldCheck className="w-4 h-4 text-[#58051E]" />
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 md:p-7 rounded-xl border border-slate-800 shadow-card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-[11px] font-semibold mb-2.5 border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
            Consular Phase 02 • 8 Sequential Milestones
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-1 text-white">
            Visa Processing Status
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Live consular and VFS dossier pipeline tracking from document compilation to biometric submission and passport dispatch.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-white/20 text-white hover:bg-white/10 text-xs shrink-0"
          onClick={() => navigate('/student/journey')}
        >
          View Full Lifecycle
        </Button>
      </div>

      {/* Prerequisites Banner if Final Acceptance is Pending */}
      {!isFinalAcceptanceUnlocked && (
        <Card className="p-4 border border-amber-200/80 bg-amber-50/40 text-slate-800 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300/40 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-xs font-semibold text-amber-950 uppercase tracking-wide">
                  Prerequisites in Progress
                </h4>
                <div className="flex items-center gap-2">
                  <Badge variant={hasOfferAccepted ? 'success' : 'neutral'} dot>
                    Offer Acceptance {hasOfferAccepted ? 'Complete' : 'Pending'}
                  </Badge>
                  <Badge variant={inst2Paid ? 'success' : 'neutral'} dot>
                    Tuition Settlement {inst2Paid ? 'Complete' : 'Pending'}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                You can review the 8 visa milestones below. Official VFS appointment booking will be locked in once your university issues the Final Acceptance Letter.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {!hasOfferAccepted && (
                  <Button size="xs" onClick={() => navigate('/student/offers')} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Review Offer Letter
                  </Button>
                )}
                {hasOfferAccepted && !inst2Paid && (
                  <Button size="xs" onClick={() => navigate('/student/payments')} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Settle 2nd Installment
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Decision Reveal Banner */}
      {isVerdictPending ? (
        <Card className="p-4 border border-slate-200 bg-slate-50 text-slate-800 rounded-xl flex items-start gap-3">
          <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              {currentStageNum === 7 ? 'Passport in Courier Dispatch' : 'Consular Processing In Progress'}
            </h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              {currentStageNum === 7
                ? 'Your passport has been dispatched by the consular desk. The decision envelope will be verified upon physical delivery at Stage 8.'
                : 'Your dossier is currently undergoing consular review. Updates will reflect automatically as the embassy concludes evaluation.'}
            </p>
          </div>
        </Card>
      ) : isVerdictApproved ? (
        <Card className="p-5 border border-emerald-200 bg-emerald-50/50 text-emerald-950 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <Badge variant="success" dot>Consular Verdict: Granted</Badge>
              <h3 className="text-base font-bold text-emerald-950 mt-1">Visa Approved & Verified</h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Your National Student Visa has been granted. Proceed to pre-departure planning for flights and accommodation.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/student/predeparture')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Pre-Departure Plan
          </Button>
        </Card>
      ) : (
        <Card className="p-5 border border-red-200 bg-red-50/50 text-red-950 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <Badge variant="error" dot>Consular Refusal Notice</Badge>
              <h3 className="text-base font-bold text-red-950 mt-1">Visa Refused by Consular Desk</h3>
              <p className="text-xs text-red-800 mt-0.5 leading-relaxed">
                Refusal grounds provided by the embassy. You are eligible to file a formal re-appeal with updated justification documents starting from Stage 2.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="destructive"
            disabled={reappealLoading}
            onClick={handleInitiateReappeal}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${reappealLoading ? 'animate-spin' : ''}`} />}
          >
            {reappealLoading ? 'Re-filing...' : 'Initiate Re-appeal'}
          </Button>
        </Card>
      )}

      {/* Main 8-Stage Tracker Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 8 Stage Timeline */}
        <Card className="lg:col-span-2 p-5 md:p-6 border border-slate-200/80 bg-white rounded-xl shadow-subtle">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Visa Processing Pipeline</h3>
              <p className="text-xs text-slate-400 mt-0.5">Live progression across 8 consular milestones</p>
            </div>
            <div>
              {isVerdictApproved ? (
                <Badge variant="success" dot>Approved</Badge>
              ) : isVerdictRejected ? (
                <Badge variant="error" dot>Refused</Badge>
              ) : (
                <Badge variant="neutral">Milestone {currentStageNum} of 8</Badge>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {stages.map((st) => {
              const isPast = st.num < currentStageNum || (st.num === 8 && (rawOutcome === 'Approved' || rawOutcome === 'Rejected'));
              const isCurrent = st.num === currentStageNum && !(st.num === 8 && (rawOutcome === 'Approved' || rawOutcome === 'Rejected'));

              return (
                <div
                  key={st.num}
                  className={`p-3.5 rounded-lg border transition-all flex items-start gap-3.5 ${
                    isPast
                      ? 'bg-slate-50/50 border-slate-200/60'
                      : isCurrent
                      ? 'bg-white border-[#58051E]/30 shadow-subtle ring-1 ring-[#58051E]/10'
                      : 'bg-white/40 border-slate-200/40 opacity-70'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-semibold text-xs shrink-0 border ${
                    isPast
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isCurrent
                      ? 'bg-[#58051E] text-white border-[#58051E]'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : st.num}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-xs font-semibold ${isCurrent ? 'text-[#58051E]' : isPast ? 'text-slate-900' : 'text-slate-500'}`}>
                        {st.name}
                      </h4>
                      {isPast && <Badge variant="success">Cleared</Badge>}
                      {isCurrent && <Badge variant="brand" dot>In Progress</Badge>}
                      {!isPast && !isCurrent && <Badge variant="neutral">Pending</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Right Column: Appointment & Logistics Details */}
        <div className="space-y-4">
          <Card className="p-5 border border-slate-200/80 space-y-4 bg-white rounded-xl shadow-subtle">
            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-3">
              VFS Appointment File
            </h3>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tracking Reference:</span>
                <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {visaRecord.vfs_ref_no || 'VFS-84920'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Appointment Date:</span>
                <span className="font-medium text-slate-900">{visaRecord.appointment_date || 'Scheduling in progress'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Target Mission:</span>
                <span className="font-medium text-slate-900">{visaRecord.embassy_name || 'European Union'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">VFS Center:</span>
                <span className="font-medium text-[#58051E]">{visaRecord.vfs_center || 'Main Metro VFS Desk'}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-400">Courier Dispatch:</span>
                {currentStageNum >= 7 && visaRecord.courier_tracking_no ? (
                  <span className="font-mono text-emerald-700 font-semibold">{visaRecord.courier_tracking_no}</span>
                ) : currentStageNum >= 7 ? (
                  <span className="text-amber-700 font-medium text-[11px]">Dispatched (Tracking Awaited)</span>
                ) : (
                  <span className="text-slate-400 text-[11px]">Dispatched at Stage 7</span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
