import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, CheckCircle2, Clock, ArrowRight, XCircle, Globe } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApplications } from '../hooks/useApplications';
import { useDocuments } from '../hooks/useDocuments';
import { usePayments } from '../hooks/usePayments';
import { useVisa } from '../hooks/useVisa';
import { useCountryWorkflows } from '../hooks/useCountryWorkflows';
import { getNawaRecords } from '../lib/api/nawa';
import type { NawaRecord } from '../lib/api/nawa';

export const JourneyTracker: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { applications } = useApplications(user?.id);
  const { documents } = useDocuments(user?.id);
  const { payments } = usePayments(user?.id);
  const { records: visaRecords } = useVisa(user?.id);
  const { workflows, getWorkflowForCountry } = useCountryWorkflows();

  const [nawaRecord, setNawaRecord] = useState<NawaRecord | null>(null);

  // Determine student target country and workflow
  const activeApp = applications[0];
  const targetCountry = useMemo(() => {
    if (activeApp?.universities?.country) return activeApp.universities.country;
    if (activeApp?.university_name) {
      const uName = activeApp.university_name.toLowerCase();
      if (uName.includes('germany') || uName.includes('munich') || uName.includes('tum')) return 'Germany';
      if (uName.includes('italy') || uName.includes('rome') || uName.includes('sapienza')) return 'Italy';
      if (uName.includes('czech') || uName.includes('charles') || uName.includes('prague')) return 'Czech Republic';
      if (uName.includes('france') || uName.includes('paris')) return 'France';
      if (uName.includes('spain') || uName.includes('madrid') || uName.includes('barcelona')) return 'Spain';
    }
    if (nawaRecord?.document_type) {
      for (const wf of workflows) {
        if (nawaRecord.document_type.toLowerCase().includes(wf.country.toLowerCase()) || nawaRecord.document_type.toLowerCase().includes(wf.authority_acronym.toLowerCase())) {
          return wf.country;
        }
      }
    }
    return 'Poland';
  }, [activeApp, nawaRecord, workflows]);

  const targetWorkflow = useMemo(() => {
    return getWorkflowForCountry(targetCountry);
  }, [targetCountry, getWorkflowForCountry]);

  useEffect(() => {
    const fetchNawa = () => {
      getNawaRecords(user?.id).then(recs => {
        const myRec = recs.find(r => r.student_id === user?.id || (user?.email && r.student_email === user.email) || r.id === user?.id);
        if (myRec) setNawaRecord(myRec);
      });
    };

    fetchNawa();
    window.addEventListener('ferex_nawa_change', fetchNawa);
    window.addEventListener('ferex_application_change', fetchNawa);
    return () => {
      window.removeEventListener('ferex_nawa_change', fetchNawa);
      window.removeEventListener('ferex_application_change', fetchNawa);
    };
  }, [user?.id, user?.email]);

  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';
  const isProfileDone = Boolean(profile?.full_name);

  const hasUploadedDocs = documents.length > 0;
  const approvedDocsCount = documents.filter(d => (d.status as string) === 'Approved' || (d.status as string) === 'Verified' || (d.status as string) === 'Passed').length;
  const hasApprovedDocs = documents.length >= 2 && approvedDocsCount === documents.length;
  const isDocsUnderReview = hasUploadedDocs && !hasApprovedDocs;

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

  const inst1Paid = payments.some(p => checkPaymentStage(p, 1) && (p.status === 'Paid' || p.status === 'Verified'));
  const inst2Paid = payments.some(p => checkPaymentStage(p, 2) && (p.status === 'Paid' || p.status === 'Verified'));
  const inst3Paid = payments.some(p => checkPaymentStage(p, 3) && (p.status === 'Paid' || p.status === 'Verified'));

  const hasApp = applications.length > 0;
  const hasOffer = applications.some(a =>
    (a.status as string) === 'Offer Issued' ||
    (a.status as string) === 'Accepted' ||
    (a.status as string) === 'Final Acceptance Issued' ||
    (a.status as string) === 'Visa Processing' ||
    (a.status as string) === 'Visa Approved' ||
    (a.status as string) === 'Approved' ||
    Boolean(a.offer_letter_url)
  );

  const isOfferAccepted = applications.some(a =>
    (a.status as string) === 'Accepted' ||
    (a.status as string) === 'Final Acceptance Issued' ||
    (a.status as string) === 'Visa Processing' ||
    (a.status as string) === 'Visa Approved' ||
    (a.status as string) === 'Approved' ||
    Boolean(a.final_acceptance_url)
  );

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

  const visaRecord = visaRecords.find(r =>
    (user?.id && r.student_id === user.id) ||
    (r.student_name && studentName.toLowerCase().includes(r.student_name.toLowerCase()))
  );

  const visaStatusStr = String(visaRecord?.status_label || (visaRecord as any)?.visa_status || '').toLowerCase();
  const currentStageNum = visaRecord?.current_stage || 0;

  const rawOutcome = (visaRecord as any)?.decision_outcome ||
    (visaStatusStr.includes('approv') ? 'Approved' :
      visaStatusStr.includes('reject') || visaStatusStr.includes('refus') ? 'Rejected' : 'Pending');

  const isVisaFiled = currentStageNum >= 2 || visaStatusStr.includes('filed') || visaStatusStr.includes('subm') || rawOutcome === 'Approved' || rawOutcome === 'Rejected';
  const isVisaApproved = currentStageNum >= 6 && rawOutcome === 'Approved';
  const isVisaRejected = currentStageNum >= 6 && rawOutcome === 'Rejected';

  const maxAuthSteps = targetWorkflow.stages?.length || 5;

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
      name: `2. Mandatory Document Vault (${targetWorkflow.country} Checklist)`,
      status: hasApprovedDocs ? 'completed' : isDocsUnderReview ? 'current' : isProfileDone ? 'current' : 'pending',
      date: hasApprovedDocs ? '✓ Uploaded & Verified' : isDocsUnderReview ? '⏳ Under Admin Review' : 'Mandatory Step',
      desc: `Upload passport scans, academic transcripts, and credentials required for ${targetWorkflow.country}.`,
      detail: hasApprovedDocs
        ? `${approvedDocsCount} document file(s) verified & approved in vault.`
        : isDocsUnderReview
          ? `⏳ ${documents.length} document file(s) uploaded — awaiting Admin verification.`
          : `🔒 Mandatory: Upload documents to unlock ${targetWorkflow.authority_acronym} Legalization & University Selection.`,
      path: '/student/documents'
    },
    {
      id: 3,
      name: '3. 1st Installment Fee Payment (₹15,000)',
      status: inst1Paid ? 'completed' : (hasApprovedDocs || isDocsUnderReview) ? 'current' : 'pending',
      date: inst1Paid ? 'Paid & Verified' : `Due Before ${targetWorkflow.authority_acronym} Process`,
      desc: `Pay registration, university matching, and ${targetWorkflow.authority_acronym} legalization audit fee.`,
      detail: inst1Paid ? `1st Installment cleared! ${targetWorkflow.authority_acronym} process is now initiated.` : `Submit 1st Installment payment proof to unlock ${targetWorkflow.authority_acronym} legal audit.`,
      path: '/student/payments'
    },
    {
      id: 4,
      name: `4. ${targetWorkflow.authority_acronym} Process — ${targetWorkflow.country} Legalization & Audit`,
      status: (() => {
        const hasApprovedApp = applications.some(a => String(a.status || '').toLowerCase().includes('approved'));
        if (nawaRecord?.status === 'Approved' || (nawaRecord?.current_step ?? 0) >= maxAuthSteps || hasApprovedApp) return 'completed';
        const activeAppRec = applications.find(a => String(a.status || '').toLowerCase().includes('review') || String(a.status || '').toLowerCase().includes('step'));
        if (nawaRecord || activeAppRec) return 'current';
        if (!inst1Paid && applications.length === 0) return 'pending';
        return 'current';
      })(),
      date: (() => {
        const hasApprovedApp = applications.some(a => String(a.status || '').toLowerCase().includes('approved'));
        if (nawaRecord?.status === 'Approved' || (nawaRecord?.current_step ?? 0) >= maxAuthSteps || hasApprovedApp) return `✓ ${targetWorkflow.authority_acronym} Approved`;
        if (nawaRecord) return `Step ${nawaRecord.current_step} of ${maxAuthSteps} — ${nawaRecord.status}`;
        if (!inst1Paid) return '🔒 Requires 1st Installment';
        return 'Initiated';
      })(),
      desc: `FEREX initiates ${targetWorkflow.authority_name} qualification verification, sworn translations, and comparability certificates.`,
      detail: (() => {
        if (nawaRecord?.status === 'Approved' || (nawaRecord?.current_step ?? 0) >= maxAuthSteps) {
          return `✅ ${targetWorkflow.authority_name} approved and certificate granted!`;
        }
        if (nawaRecord) {
          return `Ref: ${nawaRecord.nawa_ref_no} | Step ${nawaRecord.current_step} of ${maxAuthSteps}: ${nawaRecord.notes || 'In sworn translation & audit'}`;
        }
        if (!inst1Paid) return `🔒 Locked — Complete 1st Installment payment to initiate ${targetWorkflow.authority_acronym} process.`;
        return `${targetWorkflow.authority_acronym} audit initiated for ${targetWorkflow.country}. FEREX team will update status.`;
      })(),
      path: '/student/documents'
    },
    {
      id: 5,
      name: `5. University Selection & Course Application (${targetWorkflow.country})`,
      status: hasApp ? 'completed' : inst1Paid ? 'current' : 'pending',
      date: hasApp ? 'Submitted' : 'Action Needed',
      desc: `Select target ${targetWorkflow.country} partner university courses and submit application.`,
      detail: hasApp ? `${applications.length} application(s) active for ${applications[0]?.university_name && applications[0]?.university_name !== 'Pending University Selection' ? applications[0].university_name : 'applied university'}.` : 'Explore university catalog and apply for target course.',
      path: '/student/select-university'
    },
    {
      id: 6,
      name: '6. Official Admission Offer Issued & Accepted',
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
      id: 7,
      name: '7. 2nd Installment Tuition Deposit Fee & Visa Filing Status',
      status: inst2Paid ? 'completed' : isOfferAccepted ? 'current' : 'pending',
      date: inst2Paid ? 'Cleared & Visa Ready' : 'Due After Offer',
      desc: 'Pay university tuition deposit installment to secure enrollment seat & authorize visa filing.',
      detail: inst2Paid
        ? `2nd Installment tuition deposit cleared! Live Visa status: ${visaRecord?.status_label || 'Ready for Filing'}.`
        : 'Submit 2nd Installment payment proof in payments portal.',
      path: '/student/payments'
    },
    {
      id: 8,
      name: `8. Final Acceptance & Matriculation Certificate (${targetWorkflow.country})`,
      status: isFinalAcceptanceIssued ? 'completed' : inst2Paid ? 'current' : 'pending',
      date: isFinalAcceptanceIssued ? '✓ Released by University' : inst2Paid ? '⏳ Awaiting University Release' : 'Pending Deposit',
      desc: `Official Final Acceptance Certificate released by European University upon tuition deposit, mandatory for visa filing.`,
      detail: isFinalAcceptanceIssued
        ? '🎉 Official Final Acceptance Letter released! You may now proceed to Visa Application.'
        : inst2Paid
          ? '⏳ Tuition deposit verified! Admissions team is processing your Final Acceptance Letter.'
          : 'Clear 2nd Installment tuition deposit to issue Final Acceptance Letter.',
      path: '/student/offers'
    },
    {
      id: 9,
      name: `9. ${targetWorkflow.visa_procedures?.appointment_channel || 'VFS Embassy'} Visa Filing`,
      status: isVisaFiled ? 'completed' : isFinalAcceptanceIssued ? 'current' : 'pending',
      date: isVisaFiled ? 'Visa File Submitted' : 'Pending Filing',
      desc: `Book appointment slot and submit physical visa file at consular desk (${targetWorkflow.visa_procedures?.visa_type || 'National D Visa'}).`,
      detail: isVisaFiled
        ? `Visa File Submitted! Reference: ${(visaRecord as any)?.tracking_number || 'VFS-84920'}`
        : 'Prepare appointment file & checklist.',
      path: '/student/visa-tracker'
    },
    {
      id: 10,
      name: '10. Embassy Visa Decision (Approved / Stamped)',
      status: isVisaApproved ? 'completed' : isVisaRejected ? 'rejected' : isVisaFiled ? 'current' : 'pending',
      date: isVisaApproved ? 'Visa Approved & Stamped' : isVisaRejected ? 'Visa Decision Declined' : 'Under Embassy Review',
      desc: 'Embassy consular officer evaluation and visa decision stamping.',
      detail: isVisaApproved
        ? '🎉 National Student Visa Granted & Stamped!'
        : isVisaRejected
          ? '❌ Visa Application Declined by Embassy. Contact counselor for appeal.'
          : isVisaFiled
            ? 'Consular evaluation in progress at Embassy desk.'
            : 'Awaiting visa file submission.',
      path: '/student/visa-tracker'
    },
    {
      id: 11,
      name: '11. 3rd Installment & Pre-Departure Clearance',
      status: inst3Paid ? 'completed' : isVisaApproved ? 'current' : 'pending',
      date: inst3Paid ? 'Cleared & Paid' : 'Due Before Departure',
      desc: 'Clear final service fee installment and receive pre-departure briefing packet.',
      detail: inst3Paid ? '3rd Installment cleared!' : 'Submit 3rd Installment payment proof to receive departure packet.',
      path: '/student/payments'
    },
    {
      id: 12,
      name: `12. Arrival in ${targetWorkflow.country} — Campus Onboarding & Dorm Check-in`,
      status: inst3Paid && isVisaApproved ? 'completed' : 'pending',
      date: inst3Paid && isVisaApproved ? 'Journey Complete' : 'Final Milestone',
      desc: 'Flight ticket booking, university dorm room key handover, and local residence permit onboarding.',
      detail: inst3Paid && isVisaApproved ? `🎉 Student Journey Fully Completed! Welcome to ${targetWorkflow.country}.` : 'Complete previous stages to unlock flight departure.',
      path: '/student/pre-departure'
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
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center border border-[#6A1B2E]/20">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Student Journey Roadmap & Checklist
            </h1>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">
            Tailored European pathway for <strong className="text-[#6A1B2E]">{targetWorkflow.country}</strong> via <strong className="text-slate-800">{targetWorkflow.authority_name}</strong>.
          </p>
        </div>

        {/* Target Country Badge */}
        <div className="p-2.5 bg-white border border-slate-200 rounded-2xl shadow-xs flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#6A1B2E] text-white font-bold flex items-center justify-center text-xs">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase text-slate-400">Target Destination</div>
            <div className="text-xs font-black text-slate-900">{targetWorkflow.country} • {targetWorkflow.authority_acronym}</div>
          </div>
        </div>
      </div>

      {/* Dynamic Legalization Authority Status Banner */}
      <Card className="p-4 border-2 border-[#6A1B2E]/20 bg-gradient-to-r from-[#6A1B2E]/5 via-white to-amber-50/40 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-[#6A1B2E] text-white tracking-wider">
                {targetWorkflow.authority_badge}
              </span>
              {nawaRecord?.nawa_ref_no && (
                <span className="text-xs font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {nawaRecord.nawa_ref_no}
                </span>
              )}
            </div>
            <h3 className="text-sm font-black text-slate-900">
              {targetWorkflow.authority_name}
            </h3>
            <p className="text-xs font-semibold text-slate-500">
              {targetWorkflow.authority_description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {targetWorkflow.stages?.slice(0, 5).map((st) => {
              const currentStep = nawaRecord?.current_step || 1;
              const isApproved = nawaRecord?.status === 'Approved';
              const stepPassed = isApproved || currentStep >= st.step_number;

              return (
                <div key={st.step_number} className="flex items-center gap-1.5" title={st.title}>
                  <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center border transition-all ${
                    stepPassed
                      ? 'bg-[#6A1B2E] text-white border-[#6A1B2E] shadow-xs'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}>
                    {stepPassed ? '✓' : st.step_number}
                  </div>
                  {st.step_number < Math.min(5, targetWorkflow.stages.length) && (
                    <div className={`w-2.5 h-0.5 ${stepPassed ? 'bg-[#6A1B2E]' : 'bg-slate-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Vertical Steps Checklist */}
      <div className="space-y-3.5">
        {steps.map((step) => {
          const isDone = step.status === 'completed';
          const isCurrent = step.status === 'current';
          const isRejected = step.status === 'rejected';

          return (
            <motion.div key={step.id} variants={itemVariants}>
              <Card className={`p-4 border transition-all ${isDone
                  ? 'border-slate-200/80 bg-white'
                  : isRejected
                    ? 'border-red-200 bg-red-50/40 shadow-xs'
                    : isCurrent
                      ? 'border-[#6A1B2E]/40 bg-[#6A1B2E]/5 shadow-xs'
                      : 'border-slate-100 bg-slate-50/50'
                }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${isDone
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
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${isDone
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

                  <Button size="sm" variant="outline" className="shrink-0 text-xs font-bold self-end sm:self-center cursor-pointer" onClick={() => navigate(step.path)}>
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
