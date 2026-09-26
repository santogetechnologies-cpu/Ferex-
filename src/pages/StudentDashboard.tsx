import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Calendar, Clock, ArrowRight,
  Compass, FileCheck, CreditCard, CheckCircle2, Circle, XCircle,
  ScrollText, Lock, MessageSquare, Bot, Sparkles, AlertCircle
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApplications } from '../hooks/useApplications';
import { useDocuments } from '../hooks/useDocuments';
import { usePayments } from '../hooks/usePayments';
import { useMeetings } from '../hooks/useMeetings';
import { useVisa } from '../hooks/useVisa';
import { useCountryWorkflows } from '../hooks/useCountryWorkflows';
import { useSystemConfig } from '../hooks/useSystemConfig';
import { getNawaRecords } from '../lib/api/nawa';
import type { NawaRecord } from '../lib/api/nawa';
import { getDocumentRequirements, calculateDossierStatus } from '../lib/api/documentRequirements';
import { isRealApplication } from '../lib/api/applications';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { config } = useSystemConfig();

  const { applications } = useApplications(user?.id);
  const { documents } = useDocuments(user?.id);
  const { payments } = usePayments(user?.id);
  const { meetings } = useMeetings(user?.id);
  const { records: visaRecords } = useVisa(user?.id);
  const { getWorkflowForCountry } = useCountryWorkflows();

  const targetCountry = localStorage.getItem('ferex_student_target_country') || applications[0]?.universities?.country || (applications[0] as any)?.country || '';
  const targetWf = targetCountry ? getWorkflowForCountry(targetCountry) : null;

  const [configuredReqs, setConfiguredReqs] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (targetCountry) {
      getDocumentRequirements(targetCountry).then(setConfiguredReqs);
    }
  }, [targetCountry]);

  const dossierStatus = React.useMemo(() => {
    return calculateDossierStatus(configuredReqs, documents);
  }, [configuredReqs, documents]);

  const [legalizationRecord, setLegalizationRecord] = React.useState<NawaRecord | null>(null);

  React.useEffect(() => {
    const fetchLegalization = () => {
      getNawaRecords(user?.id).then(recs => {
        const myRec = recs.find(r => r.student_id === user?.id || (user?.email && r.student_email === user.email) || r.id === user?.id);
        if (myRec) setLegalizationRecord(myRec);
      });
    };

    fetchLegalization();
    window.addEventListener('ferex_nawa_change', fetchLegalization);
    window.addEventListener('ferex_legalization_change', fetchLegalization);
    return () => {
      window.removeEventListener('ferex_nawa_change', fetchLegalization);
      window.removeEventListener('ferex_legalization_change', fetchLegalization);
    };
  }, [user?.id, user?.email]);

  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';
  const approvedDocs = documents.filter(d => (d.status as string) === 'Approved' || (d.status as string) === 'Verified').length;
  const paidSum = payments.filter(p => (p.status as string) === 'Paid' || (p.status as string) === 'Verified' || (p.status as string) === 'Completed').reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const upcomingMeeting = meetings.find(m => (m.status as string) === 'Scheduled' || (m.status as string) === 'Confirmed') || null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06, duration: 0.25 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } }
  };

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  // Dynamic 12-Stage Journey Checklist Status
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

  const inst1Paid = payments.some(p => checkPaymentStage(p, 1) && ((p.status as string) === 'Paid' || (p.status as string) === 'Verified'));
  const inst2Paid = payments.some(p => checkPaymentStage(p, 2) && ((p.status as string) === 'Paid' || (p.status as string) === 'Verified'));
  const inst3Paid = payments.some(p => checkPaymentStage(p, 3) && ((p.status as string) === 'Paid' || (p.status as string) === 'Verified'));

  const realApplications = applications.filter(isRealApplication);
  const isUniSelected = realApplications.length > 0;
  const hasOffer = realApplications.some(a =>
    (a.status as string) === 'Offer Issued' ||
    (a.status as string) === 'Accepted' ||
    (a.status as string) === 'Final Acceptance Issued' ||
    (a.status as string) === 'Visa Processing' ||
    (a.status as string) === 'Visa Approved' ||
    (a.status as string) === 'Approved' ||
    Boolean(a.offer_letter_url)
  );
  const isOfferAccepted = realApplications.some(a =>
    (a.status as string) === 'Accepted' ||
    (a.status as string) === 'Final Acceptance Issued' ||
    (a.status as string) === 'Visa Processing' ||
    (a.status as string) === 'Visa Approved' ||
    (a.status as string) === 'Approved' ||
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

  const isLegalizationApproved = applications.some(a =>
    ['Legalization Cleared', 'Legalization Approved', 'APS Approved', 'Approved', 'Under Review', 'Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved'].includes(String(a.status || ''))
  );
  const isLegalizationSubmitted = applications.some(a => String(a.status || '') === 'Legalization Lodged' || String(a.status || '') === 'Legalization Submitted');
  const isLegalizationInReview = applications.some(a => String(a.status || '') === 'Legalization Reviewed' || String(a.status || '') === 'Legalization Review');

  const checklistItems = [
    { title: '1. Student Profile Registration', isDone: isProfileDone, path: '/student/profile', tag: isProfileDone ? 'Completed' : 'Pending' },
    {
      title: '2. Mandatory Document Vault',
      isDone: dossierStatus.isComplete,
      path: '/student/documents',
      tag: dossierStatus.isComplete
        ? (approvedDocsCount === documents.length && documents.length > 0 ? 'Verified' : 'Submitted')
        : `Incomplete (${dossierStatus.uploadedMandatoryCount}/${dossierStatus.mandatoryCount || 2})`
    },
    { title: `3. Advanced Registration Fee Payment`, isDone: inst1Paid, path: '/student/payments', tag: inst1Paid ? 'Paid' : 'Due' },
    { title: `4. ${targetWf?.authority_acronym || 'Legalization'} Process — Qualification & Legalization Audit`, isDone: isLegalizationApproved, path: '/student/documents', tag: isLegalizationApproved ? 'Approved' : isLegalizationSubmitted ? 'Submitted' : isLegalizationInReview ? 'Under Review' : inst1Paid ? 'Initiated' : 'Pending' },
    { title: '5. University Selection & Course Application', isDone: isUniSelected, path: '/student/select-university', tag: isUniSelected ? 'Submitted' : 'Pending Selection' },
    { title: '6. Official Admission Offer Issued & Accepted', isDone: isOfferAccepted, path: '/student/offers', tag: isOfferAccepted ? 'Accepted' : hasOffer ? 'Offer Released' : 'Pending' },
    { title: '7. University Tuition Deposit & Visa Clearance', isDone: inst2Paid, path: '/student/payments', tag: inst2Paid ? `Cleared (${visaRecord?.status_label || 'Visa Ready'})` : 'Due' },
    { title: '8. Final Acceptance Letter from University', isDone: isFinalAcceptanceIssued, path: '/student/offers', tag: isFinalAcceptanceIssued ? 'Released' : inst2Paid ? 'Awaiting Release' : 'Pending Deposit' },
    { title: '9. VFS Embassy Visa Application Filed', isDone: isVisaFiled, path: '/student/visa-tracker', tag: isVisaFiled ? 'Filed' : 'Pending' },
    { title: '10. Embassy Visa Decision (Approved / Rejected)', isDone: isVisaApproved, isRejected: isVisaRejected, path: '/student/visa-tracker', tag: isVisaApproved ? 'Approved' : isVisaRejected ? 'Rejected' : 'Review' },
    { title: `11. Agency Processing & Departure Clearance`, isDone: inst3Paid, path: '/student/payments', tag: inst3Paid ? 'Paid' : 'Due' },
    { title: '12. Post Travel & Campus Arrival', isDone: inst3Paid && isVisaApproved, path: '/student/pre-departure', tag: inst3Paid && isVisaApproved ? 'Arrival Ready' : 'Final Milestone' },
  ];

  const completedCount = checklistItems.filter(i => i.isDone).length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 text-left"
    >
      {/* Welcome Hero Bento Banner */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#58051E] via-[#430316] to-[#2E020E] text-white p-6 md:p-7 shadow-card border border-[#58051E]/40">
          <div className="relative z-10 max-w-xl">
            <span className="text-[9.5px] font-bold uppercase tracking-wider text-amber-300/90 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15 inline-block mb-2.5">
              FEREX Global Education Portal
            </span>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-1.5 text-white">
              Welcome back, {studentName}
            </h1>
            <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-normal">
              Track your admission milestone roadmap, document compliance, and embassy visa readiness.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleQuickAction('/student/journey-tracker')}
              >
                12-Stage Journey <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
              <button
                onClick={() => handleQuickAction('/student/select-university')}
                className="h-8.5 px-3.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/15 active:bg-white/10 border border-white/25 transition-all cursor-pointer"
              >
                Browse Universities
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { title: 'Target Universities', value: `${realApplications.length}`, sub: `${realApplications.filter(a => a.status !== 'Draft').length} Active Applications`, icon: GraduationCap, path: '/student/applications' },
          { title: 'Journey Progress', value: `${completedCount} / 12`, sub: 'Milestones Completed', icon: Compass, path: '/student/journey-tracker' },
          {
            title: 'Documents Status',
            value: dossierStatus.isComplete ? 'Complete' : 'Incomplete',
            sub: dossierStatus.isComplete
              ? `${approvedDocs} / ${documents.length} Files Verified`
              : `${dossierStatus.uploadedMandatoryCount} / ${dossierStatus.mandatoryCount || 2} Mandatory Uploaded`,
            icon: FileCheck,
            path: '/student/documents'
          },
          { title: 'Payments Cleared', value: `₹${paidSum.toLocaleString()}`, sub: 'Fee Ledger Total', icon: CreditCard, path: '/student/payments' },
        ].map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants} onClick={() => navigate(stat.path)}>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle hover:shadow-card hover:border-slate-300 transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{stat.title}</span>
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-700 flex items-center justify-center group-hover:text-[#58051E] group-hover:border-[#58051E]/30 transition-colors">
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
              <span className="text-xl font-bold text-slate-900 leading-none tracking-tight block">{stat.value}</span>
              <span className="text-[10px] font-medium text-slate-400 block mt-1">{stat.sub}</span>
            </div>
          </motion.div>
        ))}
      </div>


      {/* Missing Target Country Prompt */}
      {!targetCountry && (
        <motion.div variants={itemVariants}>
          <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-subtle">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 text-sm">
                  Please select your target country to see specific compliance protocols & requirements
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Your admission roadmap, country-specific legalization rules, and embassy documentation checklist will configure automatically.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/student/profile')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
            >
              Select Country in Profile
            </button>
          </div>
        </motion.div>
      )}

      {/* Country Legalization Progress Banner */}
      {legalizationRecord && targetWf && (
        <motion.div variants={itemVariants}>
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-subtle">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <ScrollText className="w-4.5 h-4.5 text-[#58051E]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{targetWf?.authority_badge || 'Legalization Audit'}</span>
                    <span className="px-2 py-0.2 rounded text-[9.5px] font-bold bg-slate-100 text-slate-700 uppercase border border-slate-200">
                      {legalizationRecord.ref_no || legalizationRecord.nawa_ref_no}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Stage Progress: <span className="font-semibold text-slate-800">Step {legalizationRecord.current_step} of 4 — {legalizationRecord.status}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/student/journey-tracker')}
                  className="gap-1.5"
                >
                  View Workflow Tracking <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Workspace Division */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* 12-Stage Journey Checklist */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
          <Card className="p-5 border border-slate-200/80 shadow-subtle space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">12-Stage Admission Journey</h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Sequential milestones from inquiry to campus arrival</p>
              </div>
              <span className="text-[10px] font-bold text-[#58051E] bg-[#58051E]/5 px-2.5 py-1 rounded-full uppercase border border-[#58051E]/15">
                {completedCount} of 12 Completed
              </span>
            </div>

            {/* Checklist Items Grid */}
            <div className="space-y-1.5">
              {checklistItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer hover:border-slate-300 ${
                    item.isDone
                      ? 'bg-slate-50/70 border-slate-200/70 text-slate-900'
                      : item.isRejected
                        ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                        : 'bg-white border-slate-200/60 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 mr-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      item.isDone
                        ? 'bg-emerald-500 text-white'
                        : item.isRejected
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}>
                      {item.isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : item.isRejected ? <XCircle className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                    </div>
                    <span className={`text-xs truncate ${item.isDone ? 'font-semibold text-slate-900' : item.isRejected ? 'font-semibold text-rose-900' : 'font-medium text-slate-600'}`}>
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9.5px] font-bold px-2 py-0.2 rounded border ${
                      item.isDone
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : item.isRejected
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {item.tag}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Right Column: Legalization & Counselor Blocks */}
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Legalization & Verification Process Live Status Card */}
          <Card className="p-5 border border-slate-200/80 shadow-subtle space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900">{targetWf?.authority_acronym ? `${targetWf.authority_acronym} Legalization` : 'Legalization Status'}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                isLegalizationApproved
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isLegalizationSubmitted || isLegalizationInReview
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : inst1Paid
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {isLegalizationApproved ? 'Approved' : isLegalizationSubmitted ? 'Submitted' : isLegalizationInReview ? 'Under Review' : inst1Paid ? 'Initiated' : 'Locked'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200/70 space-y-1.5">
              <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                {!targetCountry ? (
                  <>
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Target Country Required</span>
                  </>
                ) : isLegalizationApproved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{targetWf?.authority_acronym || 'Authority'} Legalization Approved</span>
                  </>
                ) : isLegalizationSubmitted ? (
                  <>
                    <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Submitted to {targetWf?.authority_acronym || 'Agency'}</span>
                  </>
                ) : isLegalizationInReview ? (
                  <>
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Eligibility & Audit Under Review</span>
                  </>
                ) : inst1Paid ? (
                  <>
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Evaluation Initiated</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Advanced Registration Fee Required</span>
                  </>
                )}
              </p>
              <p className="text-[11px] font-normal text-slate-500 leading-relaxed">
                {!targetCountry
                  ? 'Select your target European country in your student profile to initialize your authority qualification audit.'
                  : isLegalizationApproved
                    ? `Your educational credentials and ${targetWf?.authority_acronym || 'legalization'} audit are officially verified.`
                    : isLegalizationSubmitted
                      ? `Files dispatched to ${targetWf?.authority_name || 'the evaluation board'} for official equivalency verification.`
                      : isLegalizationInReview
                        ? `FEREX admissions desk is reviewing your academic transcripts and eligibility for ${targetCountry}.`
                        : inst1Paid
                          ? `Advanced Registration Fee verified. ${targetWf?.authority_acronym || 'Legalization'} process is queued for audit.`
                          : `Complete Advanced Registration Fee payment to unlock ${targetWf?.authority_acronym || 'Legalization'} process.`}
              </p>
              <Button size="xs" variant="outline" className="w-full mt-2 font-semibold" onClick={() => navigate('/student/documents')}>
                Open Document Vault
              </Button>
            </div>
          </Card>

          {/* Assigned Counselor Card */}
          <Card className="p-5 border border-slate-200/80 shadow-subtle space-y-3 bg-white text-left">
            {(() => {
              const rawCounselor = (profile as any)?.assigned_counselor?.trim();
              const hasRealCounselor = rawCounselor && 
                rawCounselor !== 'Admin' && 
                !rawCounselor.toLowerCase().includes('desk counselor') &&
                !rawCounselor.toLowerCase().startsWith('admissions counselor');

              if (!hasRealCounselor) {
                return (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Admissions Counselor</span>
                      <span className="px-2 py-0.2 rounded text-[9.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Pending Assignment</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/80">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          Counselor Desk Allocation
                        </h4>
                        <p className="text-[10.5px] font-medium text-slate-500 truncate">Admissions Team ({targetCountry} Desk)</p>
                      </div>
                    </div>
                    <p className="text-[10.5px] text-slate-500 leading-relaxed bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                      Your counselor will be assigned shortly. Book an introductory session below.
                    </p>
                    <div className="pt-1">
                      <Button size="sm" className="w-full text-xs font-semibold h-8" onClick={() => navigate('/student/meetings')} icon={<Calendar className="w-3.5 h-3.5" />}>
                        Book Advisory Session
                      </Button>
                    </div>
                  </>
                );
              }

              const namePart = rawCounselor.split('(')[0].trim();
              const titlePart = rawCounselor.includes('(')
                ? rawCounselor.split('(')[1].replace(')', '').trim()
                : `${targetCountry} Desk`;
              const initials = namePart.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'FX';

              return (
                <>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Admissions Counselor</span>
                    <span className="px-2 py-0.2 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#58051E] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {namePart}
                      </h4>
                      <p className="text-[10.5px] font-medium text-[#58051E] truncate">{titlePart}</p>
                    </div>
                  </div>
                  {config.branding.operating_hours && (
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-[10px] font-medium text-slate-600 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Desk Hours:</span>
                        <span className="text-slate-800 font-semibold">{config.branding.operating_hours}</span>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button size="xs" variant="outline" className="h-8" onClick={() => navigate('/student/meetings')} icon={<MessageSquare className="w-3.5 h-3.5" />}>
                      Chat / Notes
                    </Button>
                    <Button size="xs" className="h-8" onClick={() => navigate('/student/meetings')} icon={<Calendar className="w-3.5 h-3.5" />}>
                      Book Session
                    </Button>
                  </div>
                </>
              );
            })()}
          </Card>

          {/* Upcoming Session */}
          <Card className="p-5 border border-slate-200/80 shadow-subtle space-y-3">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">Next Scheduled Session</h3>
            {upcomingMeeting ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold uppercase text-[#58051E]">Confirmed</span>
                  <span className="text-[9.5px] font-bold px-2 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">{upcomingMeeting.status || 'Confirmed'}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">{upcomingMeeting.subject || 'Admissions Strategy'}</h4>
                <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-[#58051E]" /> {upcomingMeeting.scheduled_date || 'Upcoming'}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-[#58051E]" /> {upcomingMeeting.start_time || '3:00 PM'}</span>
                </div>
                <Button size="xs" className="w-full mt-1.5" onClick={() => navigate('/student/meetings')}>
                  Join Session
                </Button>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 text-center space-y-2">
                <Clock className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-500">No session scheduled currently.</p>
                <Button size="xs" variant="outline" onClick={() => navigate('/student/meetings')}>
                  Schedule Session
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

