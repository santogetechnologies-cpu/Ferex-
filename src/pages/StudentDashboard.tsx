import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Calendar, Clock, ArrowRight,
  Compass, FileCheck, CreditCard, CheckCircle2, Circle, XCircle
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApplications } from '../hooks/useApplications';
import { useDocuments } from '../hooks/useDocuments';
import { usePayments } from '../hooks/usePayments';
import { useMeetings } from '../hooks/useMeetings';
import { useVisa } from '../hooks/useVisa';
import { getNawaRecords } from '../lib/api/nawa';
import type { NawaRecord } from '../lib/api/nawa';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { applications } = useApplications(user?.id);
  const { documents } = useDocuments(user?.id);
  const { payments } = usePayments(user?.id);
  const { meetings } = useMeetings(user?.id);
  const { records: visaRecords } = useVisa(user?.id);

  const [nawaRecord, setNawaRecord] = React.useState<NawaRecord | null>(null);

  React.useEffect(() => {
    const fetchNawa = () => {
      getNawaRecords(user?.id).then(recs => {
        const myRec = recs.find(r => r.student_id === user?.id || (user?.email && r.student_email === user.email) || r.id === user?.id);
        if (myRec) setNawaRecord(myRec);
      });
    };

    fetchNawa();
    window.addEventListener('ferex_nawa_change', fetchNawa);
    return () => window.removeEventListener('ferex_nawa_change', fetchNawa);
  }, [user?.id, user?.email]);

  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';
  const approvedDocs = documents.filter(d => (d.status as string) === 'Approved' || (d.status as string) === 'Verified').length;
  const paidSum = payments.filter(p => (p.status as string) === 'Paid' || (p.status as string) === 'Verified' || (p.status as string) === 'Completed').reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const upcomingMeeting = meetings.find(m => (m.status as string) === 'Scheduled' || (m.status as string) === 'Confirmed') || null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, duration: 0.3 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } }
  };

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  // Dynamic 10-Stage Journey Checklist Status
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

  const isUniSelected = applications.length > 0;
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

  const isNawaApproved = applications.some(a =>
    ['NAWA Approved', 'Approved', 'Under Review', 'Offer Issued', 'Accepted', 'Final Acceptance Issued', 'Visa Processing', 'Visa Approved'].includes(String(a.status || ''))
  );
  const isNawaSubmitted = applications.some(a => String(a.status || '') === 'NAWA Submitted');
  const isNawaInReview = applications.some(a => String(a.status || '') === 'NAWA Review');

  const checklistItems = [
    { title: '1. Student Profile Registration', isDone: isProfileDone, path: '/student/profile', tag: isProfileDone ? 'Completed' : 'Pending' },
    { title: '2. Mandatory Document Vault (Passport & Marksheets)', isDone: hasApprovedDocs, path: '/student/documents', tag: hasApprovedDocs ? 'Verified' : isDocsUnderReview ? 'Under Review' : 'Mandatory' },
    { title: '3. 1st Installment Fee Payment (₹15,000)', isDone: inst1Paid, path: '/student/payments', tag: inst1Paid ? 'Paid' : 'Due' },
    { title: '4. NAWA Process — Apostille & Legalization Audit', isDone: isNawaApproved, path: '/student/documents', tag: isNawaApproved ? 'Approved' : isNawaSubmitted ? 'Submitted' : isNawaInReview ? 'Under Review' : inst1Paid ? 'Initiated' : 'Locked' },
    { title: '5. University Selection & Course Application', isDone: isUniSelected, path: '/student/select-university', tag: isUniSelected ? 'Submitted' : 'Action Needed' },
    { title: '6. Official Admission Offer Issued & Accepted', isDone: isOfferAccepted, path: '/student/offers', tag: isOfferAccepted ? 'Accepted' : hasOffer ? 'Offer Released' : 'Pending' },
    { title: '7. 2nd Installment Tuition Deposit & Visa Status', isDone: inst2Paid, path: '/student/payments', tag: inst2Paid ? `Cleared (${visaRecord?.status_label || 'Visa Ready'})` : 'Due' },
    { title: '8. Final Acceptance Letter from University', isDone: isFinalAcceptanceIssued, path: '/student/offers', tag: isFinalAcceptanceIssued ? 'Released' : inst2Paid ? 'Awaiting Release' : 'Pending Deposit' },
    { title: '9. VFS Embassy Visa Application Filed', isDone: isVisaFiled, path: '/student/visa-tracker', tag: isVisaFiled ? 'Filed' : 'Pending' },
    { title: '10. Embassy Visa Decision (Approved / Rejected)', isDone: isVisaApproved, isRejected: isVisaRejected, path: '/student/visa-tracker', tag: isVisaApproved ? 'Approved' : isVisaRejected ? 'Rejected' : 'Review' },
    { title: '11. 3rd Installment & Departure Clearance', isDone: inst3Paid, path: '/student/payments', tag: inst3Paid ? 'Paid' : 'Due' },
    { title: '12. Post Travel & Campus Arrival', isDone: inst3Paid && isVisaApproved, path: '/student/pre-departure', tag: inst3Paid && isVisaApproved ? 'Arrival Ready' : 'Final Milestone' },
  ];

  const completedCount = checklistItems.filter(i => i.isDone).length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 text-left"
    >
      {/* Welcome Banner */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6A1B2E] to-[#4A101E] text-white p-6 md:p-8 shadow-md">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-2">
              Welcome back, {studentName}
            </h1>
            <p className="text-xs md:text-sm text-white/80 leading-relaxed font-semibold">
              Track your admission & visa progress for target European universities.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="sm"
                className="text-xs text-[#6A1B2E] font-bold shadow-xs hover:scale-105 active:scale-98 transition-transform"
                onClick={() => handleQuickAction('/student/journey-tracker')}
              >
                Track 12-Stage Journey <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
              <button
                onClick={() => handleQuickAction('/student/select-university')}
                className="h-9 px-4 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 active:bg-white/10 border border-white/30 transition-all shadow-xs"
              >
                Browse Universities
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Target Universities', value: `${applications.length}`, sub: `${applications.filter(a => a.status !== 'Draft').length} Apps Active`, icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', path: '/student/applications' },
          { title: 'Journey Progress', value: `${completedCount} / 12`, sub: 'Checklist Stages Done', icon: Compass, color: 'text-blue-600 bg-blue-50 border-blue-100', path: '/student/journey-tracker' },
          { title: 'Documents Verified', value: `${approvedDocs} / ${documents.length}`, sub: `${documents.filter(d => (d.status as string) === 'Submitted' || (d.status as string) === 'Under Review').length} Pending`, icon: FileCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', path: '/student/documents' },
          { title: 'Fees & Payments', value: `₹${paidSum.toLocaleString()}`, sub: 'Paid Total', icon: CreditCard, color: 'text-[#6A1B2E] bg-[#6A1B2E]/10 border-[#6A1B2E]/20', path: '/student/payments' },
        ].map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants} onClick={() => navigate(stat.path)}>
            <Card className="flex items-center gap-4 p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${stat.color} group-hover:scale-105 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">{stat.title}</span>
                <span className="text-xl font-black text-slate-900 leading-none">{stat.value}</span>
                <span className="text-[10px] font-extrabold text-slate-500 block mt-1">{stat.sub}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* NAWA Legalization Progress Card */}
      {nawaRecord && (
        <motion.div variants={itemVariants}>
          <Card className="p-4 border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shrink-0">
                  📜
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">NAWA Legalization & Sworn Translation Audit</span>
                    <span className="px-2 py-0.5 rounded text-[9.5px] font-black bg-indigo-100 text-indigo-800 uppercase">
                      {nawaRecord.nawa_ref_no}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Stage Progress: <span className="font-bold text-slate-900">Step {nawaRecord.current_step} of 4 — {nawaRecord.status}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/student/journey-tracker')}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-transform active:scale-95"
                >
                  View NAWA Tracking <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
                </button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Main Workspace Division */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 12-Stage Journey Checklist */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h3 className="text-sm font-black text-slate-900">12-Stage Journey Checklist</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Comprehensive admission, NAWA audit, installment, and visa roadmap</p>
              </div>
              <span className="text-[10px] font-extrabold text-[#6A1B2E] bg-[#6A1B2E]/10 px-2.5 py-1 rounded-full uppercase border border-[#6A1B2E]/20">
                {completedCount} of 12 Completed
              </span>
            </div>

            {/* Checklist Items Grid */}
            <div className="space-y-2">
              {checklistItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer hover:border-slate-300 ${item.isDone
                    ? 'bg-slate-50/60 border-slate-200/60 text-slate-900'
                    : item.isRejected
                      ? 'bg-red-50/50 border-red-200 text-red-900'
                      : 'bg-white border-slate-100 text-slate-500'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${item.isDone
                      ? 'bg-emerald-500 text-white'
                      : item.isRejected
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 border border-slate-200 text-slate-300'
                      }`}>
                      {item.isDone ? <CheckCircle2 className="w-4 h-4" /> : item.isRejected ? <XCircle className="w-4 h-4" /> : <Circle className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-xs font-extrabold ${item.isDone ? 'text-slate-900' : item.isRejected ? 'text-red-900' : 'text-slate-600'}`}>
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${item.isDone
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : item.isRejected
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                      }`}>
                      {item.tag}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Right Column: NAWA Status & Meetings */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* NAWA Process Live Status Card */}
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span>NAWA Evaluation Status</span>
              <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${isNawaApproved
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isNawaSubmitted
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : isNawaInReview
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : inst1Paid
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                {isNawaApproved ? 'Approved' : isNawaSubmitted ? 'Submitted to Agency' : isNawaInReview ? 'Under Review' : inst1Paid ? 'Initiated' : 'Locked'}
              </span>
            </h3>

            <div className="p-4 rounded-xl border space-y-2 bg-slate-50 border-slate-100">
              <p className="text-xs font-black text-slate-900">
                {isNawaApproved
                  ? '✅ NAWA Apostille & Legalization Audit Approved'
                  : isNawaSubmitted
                    ? '📩 Submitted to NAWA Agency for Apostille'
                    : isNawaInReview
                      ? '⏳ NAWA Eligibility & Legalization Under Review'
                      : inst1Paid
                        ? '⏳ NAWA Evaluation Initiated (Awaiting Admin Review)'
                        : '🔒 1st Installment Payment Required'}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                {isNawaApproved
                  ? 'Your educational documents and apostille legalization audit have been verified and approved.'
                  : isNawaSubmitted
                    ? 'Your files have been submitted to the Polish NAWA Evaluation Board for official equivalency verification.'
                    : isNawaInReview
                      ? 'FEREX admissions team is currently conducting your apostille legalization and eligibility audit.'
                      : inst1Paid
                        ? '1st Installment cleared. NAWA process is now queued for review.'
                        : 'Complete 1st Installment payment (₹15,000) to unlock NAWA process.'}
              </p>
              <Button size="sm" variant="outline" className="w-full mt-2 text-xs font-bold" onClick={() => navigate('/student/documents')}>
                View Document Vault
              </Button>
            </div>
          </Card>

          {/* Assigned Counselor Card */}
          <Card className="p-5 border border-slate-200/70 shadow-xs space-y-3 bg-gradient-to-br from-white to-slate-50/50 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Assigned Counselor</span>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">● Active & Available</span>
            </div>
            {(() => {
              const rawCounselor = (profile as any)?.assigned_counselor || 'Admin';
              const hasCounselor = Boolean(rawCounselor && rawCounselor !== '--');
              const namePart = hasCounselor ? rawCounselor.split('(')[0].trim() : '--';
              const titlePart = hasCounselor
                ? (rawCounselor.includes('(') ? rawCounselor.split('(')[1].replace(')', '').trim() : 'Admissions Counselor')
                : '--';
              const initials = hasCounselor
                ? namePart.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                : '--';

              return (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#6A1B2E] text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black text-slate-900 truncate">
                      {namePart}
                    </h4>
                    <p className="text-[10.5px] font-bold text-slate-500 truncate">{titlePart}</p>
                    <p className="text-[9.5px] font-semibold text-emerald-600">FEREX Admissions Desk</p>
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button size="sm" variant="outline" className="text-xs font-bold h-8" onClick={() => navigate('/student/meetings')}>
                💬 Chat / Notes
              </Button>
              <Button size="sm" className="text-xs font-bold h-8 bg-[#6A1B2E] text-white" onClick={() => navigate('/student/meetings')}>
                📅 Book Call
              </Button>
            </div>
          </Card>

          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">Upcoming Counselor Session</h3>
            {upcomingMeeting ? (
              <div className="p-4 bg-[#6A1B2E]/5 rounded-xl border border-[#6A1B2E]/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-[#6A1B2E] tracking-wider">Scheduled Session</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{upcomingMeeting.status || 'Confirmed'}</span>
                </div>
                <h4 className="text-xs font-black text-slate-900">{upcomingMeeting.subject || 'European Admissions Strategy'}</h4>
                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#6A1B2E]" /> {upcomingMeeting.scheduled_date || 'Tomorrow'}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#6A1B2E]" /> {upcomingMeeting.start_time || '3:00 PM'}</span>
                </div>
                <Button size="sm" className="w-full mt-2 text-xs font-bold bg-[#6A1B2E] text-white" onClick={() => navigate('/student/meetings')}>
                  Join Session Portal
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-500">No upcoming meetings scheduled.</p>
                <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => navigate('/student/meetings')}>
                  Schedule Counselor Meeting
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};
