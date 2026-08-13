import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap, Calendar, Clock, ArrowRight, ShieldAlert,
  Compass, FileCheck, CreditCard, BookOpen, CheckCircle2, Circle, Search, XCircle, ShieldCheck
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApplications } from '../hooks/useApplications';
import { useDocuments } from '../hooks/useDocuments';
import { usePayments } from '../hooks/usePayments';
import { useMeetings } from '../hooks/useMeetings';
import { useVisa } from '../hooks/useVisa';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const { applications } = useApplications(user?.id);
  const { documents } = useDocuments(user?.id);
  const { payments } = usePayments(user?.id);
  const { meetings } = useMeetings(user?.id);
  const { records: visaRecords } = useVisa(user?.id);

  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';
  const approvedDocs = documents.filter(d => d.status === 'Approved' || d.status === 'Verified').length;
  const paidSum = payments.filter(p => p.status === 'Paid' || p.status === 'Verified' || p.status === 'Completed').reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const upcomingMeeting = meetings.find(m => m.status === 'Scheduled' || m.status === 'Confirmed') || meetings[0];

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

  const isUniSelected = applications.length > 0;
  const hasOffer = applications.some(a => (a.status as string) === 'Offer Issued' || (a.status as string) === 'Accepted');
  const isOfferAccepted = applications.some(a => (a.status as string) === 'Accepted');

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

  const checklistItems = [
    { title: '1. Student Profile Registration', isDone: isProfileDone, path: '/student/profile', tag: isProfileDone ? 'Completed' : 'Pending' },
    { title: '2. Mandatory Document Vault (Passport & Marksheets)', isDone: hasApprovedDocs, path: '/student/documents', tag: hasApprovedDocs ? 'Verified' : isDocsUnderReview ? 'Under Review' : 'Mandatory' },
    { title: '3. 1st Installment Fee Payment (₹15,000)', isDone: inst1Paid, path: '/student/payments', tag: inst1Paid ? 'Paid' : 'Due' },
    { title: '4. University Selection & Course Application', isDone: isUniSelected, path: '/student/select-university', tag: isUniSelected ? 'Submitted' : 'Action Needed' },
    { title: '5. Official Admission Offer Issued & Accepted', isDone: isOfferAccepted, path: '/student/offers', tag: isOfferAccepted ? 'Accepted' : hasOffer ? 'Offer Released' : 'Pending' },
    { title: '6. 2nd Installment Tuition Deposit & Visa Status', isDone: inst2Paid, path: '/student/payments', tag: inst2Paid ? `Cleared (${visaRecord?.status_label || 'Visa Ready'})` : 'Due' },
    { title: '7. Final Acceptance Letter from University', isDone: isFinalAcceptanceIssued, path: '/student/offers', tag: isFinalAcceptanceIssued ? 'Released' : inst2Paid ? 'Awaiting Release' : 'Pending Deposit' },
    { title: '8. VFS Embassy Visa Application Filed', isDone: isVisaFiled, path: '/student/visa-tracker', tag: isVisaFiled ? 'Filed' : 'Pending' },
    { title: '9. Embassy Visa Decision (Approved / Rejected)', isDone: isVisaApproved, isRejected: isVisaRejected, path: '/student/visa-tracker', tag: isVisaApproved ? 'Approved' : isVisaRejected ? 'Rejected' : 'Review' },
    { title: '10. 3rd Installment & Pre-Departure Packet', isDone: inst3Paid, path: '/student/payments', tag: inst3Paid ? 'Paid' : 'Due' },
    { title: '11. European Campus Enrolled & Departure', isDone: inst3Paid && isVisaApproved, path: '/student/journey-tracker', tag: inst3Paid && isVisaApproved ? 'Arrival Ready' : 'Final Milestone' },
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
                Track 10-Stage Journey <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
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
          { title: 'Journey Progress', value: `${completedCount} / 10`, sub: 'Checklist Stages Done', icon: Compass, color: 'text-blue-600 bg-blue-50 border-blue-100', path: '/student/journey-tracker' },
          { title: 'Documents Verified', value: `${approvedDocs} / ${documents.length}`, sub: `${documents.filter(d => d.status === 'Pending Verification' || d.status === 'Pending').length} Pending`, icon: FileCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', path: '/student/documents' },
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

      {/* Main Workspace Division */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 10-Stage Journey Checklist */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div>
                <h3 className="text-sm font-black text-slate-900">10-Stage Journey Checklist</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Comprehensive admission, installment, and visa roadmap</p>
              </div>
              <span className="text-[10px] font-extrabold text-[#6A1B2E] bg-[#6A1B2E]/10 px-2.5 py-1 rounded-full uppercase border border-[#6A1B2E]/20">
                {completedCount} of 10 Completed
              </span>
            </div>

            {/* Checklist Items Grid */}
            <div className="space-y-2">
              {checklistItems.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer hover:border-slate-300 ${
                    item.isDone
                      ? 'bg-slate-50/60 border-slate-200/60 text-slate-900'
                      : item.isRejected
                      ? 'bg-red-50/50 border-red-200 text-red-900'
                      : 'bg-white border-slate-100 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      item.isDone
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
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                      item.isDone
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

        {/* Right Column: Quick Status & Meetings */}
        <motion.div variants={itemVariants} className="space-y-6">
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3">Upcoming Counselor Session</h3>
            {upcomingMeeting ? (
              <div className="p-4 bg-[#6A1B2E]/5 rounded-xl border border-[#6A1B2E]/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-[#6A1B2E] tracking-wider">Scheduled Session</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{upcomingMeeting.status || 'Confirmed'}</span>
                </div>
                <h4 className="text-xs font-black text-slate-900">{upcomingMeeting.title || 'European Admissions Strategy'}</h4>
                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#6A1B2E]" /> {upcomingMeeting.date || 'Tomorrow'}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#6A1B2E]" /> {upcomingMeeting.time || '3:00 PM'}</span>
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
