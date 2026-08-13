import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, CheckCircle2, Clock, ArrowRight, Lock, ShieldCheck, FileCheck, XCircle, Award } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApplications } from '../hooks/useApplications';
import { useDocuments } from '../hooks/useDocuments';
import { usePayments } from '../hooks/usePayments';
import { useVisa } from '../hooks/useVisa';

export const JourneyTracker: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { applications } = useApplications(user?.id);
  const { documents } = useDocuments(user?.id);
  const { payments } = usePayments(user?.id);
  const { records: visaRecords } = useVisa(user?.id);

  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';
  const isProfileDone = Boolean(profile?.full_name);

  // Mandatory document verification check
  const hasPassport = documents.some(d =>
    d.doc_type === 'Identification' ||
    d.file_name.toLowerCase().includes('passport') ||
    d.file_name.toLowerCase().includes('id')
  );

  const hasMarksheets = documents.some(d =>
    d.doc_type === 'Transcripts' ||
    d.file_name.toLowerCase().includes('marksheet') ||
    d.file_name.toLowerCase().includes('transcript') ||
    d.file_name.toLowerCase().includes('certificate') ||
    d.file_name.toLowerCase().includes('degree')
  );

  const hasUploadedDocs = documents.length > 0;
  const approvedDocsCount = documents.filter(d => d.status === 'Approved' || d.status === 'Verified' || d.status === 'Passed').length;
  const hasApprovedDocs = documents.length >= 2 && approvedDocsCount === documents.length;
  const isDocsUnderReview = hasUploadedDocs && !hasApprovedDocs;

  const inst1Paid = payments.some(p =>
    (p.description?.includes('1st') || p.description?.includes('1') || p.payment_type?.includes('1st')) &&
    (p.status === 'Paid' || p.status === 'Verified')
  );

  const inst2Paid = payments.some(p =>
    (p.description?.includes('2nd') || p.description?.includes('2') || p.payment_type?.includes('2nd')) &&
    (p.status === 'Paid' || p.status === 'Verified')
  );

  const inst3Paid = payments.some(p =>
    (p.description?.includes('3rd') || p.description?.includes('3') || p.payment_type?.includes('3rd')) &&
    (p.status === 'Paid' || p.status === 'Verified')
  );

  const hasApp = applications.length > 0;
  const hasOffer = applications.some(a => (a.status as string) === 'Offer Issued' || (a.status as string) === 'Accepted' || (a.status as string) === 'Final Acceptance Issued');
  const isOfferAccepted = applications.some(a => (a.status as string) === 'Accepted' || (a.status as string) === 'Final Acceptance Issued');

  // Final Acceptance Letter from University logic (after 2nd Installment & before VFS)
  const hasFinalAcceptanceDoc = documents.some(d =>
    d.file_name.toLowerCase().includes('final_acceptance') ||
    d.file_name.toLowerCase().includes('final acceptance') ||
    d.reviewer_notes?.toLowerCase().includes('final acceptance')
  );

  const isFinalAcceptanceIssued = hasFinalAcceptanceDoc || applications.some(a =>
    (a.status as string) === 'Final Acceptance Issued' ||
    (a.status as string) === 'Enrolled' ||
    Boolean(a.final_acceptance_url)
  );

  // Visa Status Logic
  const visaRecord = visaRecords.find(r =>
    (user?.id && r.student_id === user.id) ||
    (r.student_name && studentName.toLowerCase().includes(r.student_name.toLowerCase()))
  );

  const visaStatusStr = String(visaRecord?.status_label || visaRecord?.visa_status || '').toLowerCase();
  const currentStageNum = visaRecord?.current_stage || 0;

  const rawOutcome = (visaRecord as any)?.decision_outcome ||
    (visaStatusStr.includes('approv') ? 'Approved' :
     visaStatusStr.includes('reject') || visaStatusStr.includes('refus') ? 'Rejected' : 'Pending');

  const isVisaFiled = currentStageNum >= 2 || visaStatusStr.includes('filed') || visaStatusStr.includes('subm') || rawOutcome === 'Approved' || rawOutcome === 'Rejected';
  const isVisaApproved = currentStageNum >= 6 && rawOutcome === 'Approved';
  const isVisaRejected = currentStageNum >= 6 && rawOutcome === 'Rejected';

  const steps = [
    {
      id: 1,
      name: '1. Profile & Student Registration',
      status: isProfileDone ? 'completed' : 'current',
      date: isProfileDone ? 'Completed' : 'Action Needed',
      desc: 'Fill out personal information, passport details, and contact address.',
      detail: isProfileDone ? `${studentName} profile registered.` : 'Complete profile details in settings.',
      path: '/student/profile'
    },
    {
      id: 2,
      name: '2. Mandatory Document Vault (Passport & Marksheets)',
      status: hasApprovedDocs ? 'completed' : isDocsUnderReview ? 'current' : isProfileDone ? 'current' : 'pending',
      date: hasApprovedDocs ? '✓ Uploaded & Verified' : isDocsUnderReview ? '⏳ Under Admin Review' : 'Mandatory Step',
      desc: 'Upload passport scans, bachelor transcripts, and degree certificates before university selection.',
      detail: hasApprovedDocs
        ? `${approvedDocsCount} document file(s) verified & approved in vault.`
        : isDocsUnderReview
        ? `⏳ ${documents.length} document file(s) uploaded — awaiting Admin verification.`
        : '🔒 Mandatory: Upload Passport & Marksheets to unlock University Selection.',
      path: '/student/documents'
    },
    {
      id: 3,
      name: '3. 1st Installment Fee Payment (₹15,000)',
      status: inst1Paid ? 'completed' : (hasApprovedDocs || isDocsUnderReview) ? 'current' : 'pending',
      date: inst1Paid ? 'Paid & Verified' : 'Due Before Application',
      desc: 'Pay registration, choice allocation, and legalization audit fee.',
      detail: inst1Paid ? '1st Installment cleared!' : 'Submit 1st Installment payment proof to unlock course application.',
      path: '/student/payments'
    },
    {
      id: 4,
      name: '4. University Selection & Course Application',
      status: hasApp ? 'completed' : inst1Paid ? 'current' : 'pending',
      date: hasApp ? 'Submitted' : 'Action Needed',
      desc: 'Select target European university courses and submit application for upcoming intakes.',
      detail: hasApp ? `${applications.length} university application(s) active.` : 'Explore partner universities catalog and apply.',
      path: '/student/select-university'
    },
    {
      id: 5,
      name: '5. Official Admission Offer Issued & Accepted',
      status: isOfferAccepted ? 'completed' : hasOffer ? 'current' : 'pending',
      date: isOfferAccepted ? 'Offer Accepted' : hasOffer ? 'Offer Released' : 'Pending Review',
      desc: 'Review official university admission offer letter PDF and accept offer.',
      detail: isOfferAccepted
        ? 'Official Admission Offer Accepted!'
        : hasOffer
        ? '🎉 Admission Offer Letter issued by university! Action needed.'
        : 'Awaiting university admissions decision.',
      path: '/student/offers'
    },
    {
      id: 6,
      name: '6. 2nd Installment Tuition Deposit Fee & Visa Filing Status',
      status: inst2Paid ? 'completed' : isOfferAccepted ? 'current' : 'pending',
      date: inst2Paid ? 'Cleared & Visa Ready' : 'Due After Offer',
      desc: 'Pay university tuition deposit installment to secure enrollment seat & authorize VFS visa filing.',
      detail: inst2Paid
        ? `2nd Installment tuition deposit cleared! Live VFS Visa status: ${visaRecord?.status_label || 'Ready for Filing'}.`
        : 'Submit 2nd Installment payment proof in payments portal.',
      path: '/student/payments'
    },
    {
      id: 7,
      name: '7. Final Acceptance Letter from University (Post-Tuition Deposit)',
      status: isFinalAcceptanceIssued ? 'completed' : inst2Paid ? 'current' : 'pending',
      date: isFinalAcceptanceIssued ? '✓ Released by University' : inst2Paid ? '⏳ Awaiting University Release' : 'Pending Deposit',
      desc: 'Official Final Acceptance & Enrollment Certificate released by European University upon 2nd installment deposit, mandatory for VFS visa filing.',
      detail: isFinalAcceptanceIssued
        ? '🎉 Official Final Acceptance Letter released by European University! You may now proceed to VFS Visa Application.'
        : inst2Paid
        ? '⏳ Tuition deposit verified! Admissions team is processing your Official Final Acceptance Letter with University.'
        : 'Clear 2nd Installment tuition deposit to issue Final Acceptance Letter.',
      path: '/student/offers'
    },
    {
      id: 8,
      name: '8. VFS Embassy Visa Application Filed',
      status: isVisaFiled ? 'completed' : isFinalAcceptanceIssued ? 'current' : 'pending',
      date: isVisaFiled ? 'Visa File Submitted' : 'Pending Filing',
      desc: 'Book VFS appointment slot and submit physical visa file (with Final Acceptance Letter) at embassy VFS desk.',
      detail: isVisaFiled
        ? `VFS File Submitted! Reference: ${visaRecord?.tracking_number || 'VFS-84920'}`
        : 'Prepare VFS appointment file & checklist.',
      path: '/student/visa-tracker'
    },
    {
      id: 9,
      name: '9. Embassy Visa Decision (Visa Approved / Visa Rejected)',
      status: isVisaApproved ? 'completed' : isVisaRejected ? 'rejected' : isVisaFiled ? 'current' : 'pending',
      date: isVisaApproved ? 'Visa Approved & Stamped' : isVisaRejected ? 'Visa Decision Declined' : 'Under Embassy Review',
      desc: 'Embassy consular officer evaluation and visa decision stamping.',
      detail: isVisaApproved
        ? '🎉 National Student Visa Granted & Stamped!'
        : isVisaRejected
        ? '❌ Visa Application Declined by Embassy. Contact counselor for appeal.'
        : isVisaFiled
        ? 'Consular evaluation in progress at Embassy desk.'
        : 'Awaiting visa file submission at VFS.',
      path: '/student/visa-tracker'
    },
    {
      id: 10,
      name: '10. 3rd Installment & Pre-Departure Clearance',
      status: inst3Paid ? 'completed' : isVisaApproved ? 'current' : 'pending',
      date: inst3Paid ? 'Cleared & Paid' : 'Due Before Departure',
      desc: 'Clear final service fee installment and receive pre-departure briefing packet.',
      detail: inst3Paid ? '3rd Installment cleared!' : 'Submit 3rd Installment payment proof to receive departure packet.',
      path: '/student/payments'
    },
    {
      id: 11,
      name: '11. European Campus Enrolled & Departure Complete',
      status: inst3Paid && isVisaApproved ? 'completed' : 'pending',
      date: inst3Paid && isVisaApproved ? 'Journey Complete' : 'Final Milestone',
      desc: 'Flight ticket booking, university dorm room key handover, and European campus arrival orientation.',
      detail: inst3Paid && isVisaApproved ? '🎉 Student Journey Fully Completed! Welcome to Campus.' : 'Complete previous stages to unlock flight departure.',
      path: '/student/dashboard'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05, duration: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 text-left"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center border border-[#6A1B2E]/20">
              <Compass className="w-5 h-5" />
            </span>
            Complete Step-by-Step Student Journey Checklist
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            11-Stage Roadmap: Registration ➔ Document Vault ➔ 1st Installment ➔ University Application ➔ Offer Letter ➔ 2nd Installment ➔ Final Acceptance Letter ➔ VFS Visa ➔ Visa Decision ➔ 3rd Installment ➔ Departure.
          </p>
        </div>
      </div>

      {/* Vertical Steps Checklist */}
      <div className="space-y-3.5">
        {steps.map((step) => {
          const isDone = step.status === 'completed';
          const isCurrent = step.status === 'current';
          const isRejected = step.status === 'rejected';

          return (
            <motion.div key={step.id} variants={itemVariants}>
              <Card className={`p-4 border transition-all ${
                isDone
                  ? 'border-slate-200/80 bg-white'
                  : isRejected
                  ? 'border-red-200 bg-red-50/40 shadow-xs'
                  : isCurrent
                  ? 'border-[#6A1B2E]/40 bg-[#6A1B2E]/5 shadow-xs'
                  : 'border-slate-100 bg-slate-50/50'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isRejected
                        ? 'bg-red-600 text-white'
                        : isCurrent
                        ? 'bg-[#6A1B2E] text-white ring-4 ring-[#6A1B2E]/10 animate-pulse'
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : isRejected ? <XCircle className="w-4 h-4" /> : isCurrent ? <Clock className="w-3.5 h-3.5" /> : step.id}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h3 className="text-xs sm:text-sm font-black text-slate-900">{step.name}</h3>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                          isDone
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isRejected
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : isCurrent
                            ? 'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20'
                            : 'bg-slate-100 text-slate-400 border-slate-200'
                        }`}>
                          {step.date}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500">{step.desc}</p>
                      <p className="text-[10.5px] font-bold text-[#6A1B2E] bg-white/70 px-2.5 py-1 rounded-lg border border-slate-200/60 mt-1.5 inline-block">
                        {step.detail}
                      </p>
                    </div>
                  </div>

                  <Button size="sm" variant="outline" className="shrink-0 text-xs font-bold self-end sm:self-center" onClick={() => navigate(step.path)}>
                    Proceed <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
