import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass, CheckCircle2, ArrowRight, ShieldCheck,
  Plane, GraduationCap, Building, User, ChevronRight,
  Clock, AlertCircle
} from 'lucide-react';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useApplications } from '../hooks/useApplications';
import { useDocuments } from '../hooks/useDocuments';
import { useVisa } from '../hooks/useVisa';
import { useMeetings } from '../hooks/useMeetings';

export const JourneyTracker: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { applications } = useApplications(user?.id);
  const { documents } = useDocuments(user?.id);
  const { records: visaRecords } = useVisa(user?.id);
  const { meetings } = useMeetings(user?.id);

  // Active tracker tab: 'university', 'visa', 'travel'
  const [activeTracker, setActiveTracker] = useState<'university' | 'visa' | 'travel'>('university');

  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';
  const isProfileDone = Boolean(profile?.full_name);

  // Meeting verification states for Counselling stage
  const hasCompletedMeeting = meetings.some(m =>
    m.status === 'Completed' || (m.status as string) === 'Done' || (m.status as string) === 'Attended'
  );
  const hasScheduledMeeting = meetings.some(m =>
    m.status === 'Scheduled' || (m.status as string) === 'Confirmed'
  );

  const activeApp = applications[0];
  const targetCountry = localStorage.getItem('ferex_student_target_country') || activeApp?.universities?.country || (activeApp as any)?.country || '';
  const targetUniversity = activeApp?.university_name || (targetCountry ? `${targetCountry} Partner University` : 'University Applied For');

  // Verification helper states
  const hasUploadedDocs = documents.length > 0;
  const approvedDocsCount = documents.filter(d => (d.status as string) === 'Approved' || (d.status as string) === 'Verified').length;
  const hasApprovedDocs = documents.length >= 2 && approvedDocsCount >= 2;

  const hasOffer = applications.some(a =>
    (a.status as string) === 'Offer Issued' ||
    (a.status as string) === 'Accepted' ||
    (a.status as string) === 'Final Acceptance Issued' ||
    Boolean(a.offer_letter_url)
  );

  const isOfferAccepted = applications.some(a =>
    (a.status as string) === 'Accepted' ||
    (a.status as string) === 'Final Acceptance Issued' ||
    Boolean(a.final_acceptance_url)
  );

  const visaRecord = visaRecords.find(r =>
    (user?.id && r.student_id === user.id) ||
    (r.student_name && studentName.toLowerCase().includes(r.student_name.toLowerCase()))
  );

  const rawOutcome = (visaRecord as any)?.decision_outcome ||
    (visaRecord?.status_label?.toLowerCase().includes('approv') ? 'Approved' : 'Pending');
  const isVisaApproved = rawOutcome === 'Approved';

  // TRACKER 1: University Application (8 Stages)
  const universityStages = [
    {
      id: 'u1',
      num: 1,
      title: 'Lead Inquiry',
      status: isProfileDone ? 'completed' : 'current',
      desc: 'Student profile created and initial academic inquiry logged.',
      actionLabel: isProfileDone ? 'View Profile' : 'Complete Profile',
      actionRoute: '/student/profile',
    },
    {
      id: 'u2',
      num: 2,
      title: 'Academic Counselling',
      status: hasCompletedMeeting ? 'completed' : (hasScheduledMeeting ? 'in_progress' : (isProfileDone ? 'current' : 'upcoming')),
      desc: 'One-on-one session with dedicated European education counsellor.',
      actionLabel: hasCompletedMeeting ? 'View Notes' : (hasScheduledMeeting ? 'View Session' : 'Schedule Session'),
      actionRoute: '/student/meetings',
    },
    {
      id: 'u3',
      num: 3,
      title: 'University Shortlisting',
      status: activeApp ? 'completed' : (isProfileDone ? 'current' : 'upcoming'),
      desc: 'Target universities and accredited degree programs selected.',
      actionLabel: activeApp ? 'View Shortlist' : 'Select University',
      actionRoute: '/student/select-university',
    },
    {
      id: 'u4',
      num: 4,
      title: 'Dossier Preparation',
      status: hasApprovedDocs ? 'completed' : (hasUploadedDocs ? 'in_progress' : (activeApp ? 'current' : 'upcoming')),
      desc: 'Transcripts, SOP, and passport verified in Document Vault.',
      actionLabel: 'Document Vault',
      actionRoute: '/student/documents',
    },
    {
      id: 'u5',
      num: 5,
      title: 'Application Submission',
      status: activeApp ? 'completed' : 'upcoming',
      desc: 'Formal application dossier submitted to University Admissions.',
      actionLabel: 'View Applications',
      actionRoute: '/student/applications',
    },
    {
      id: 'u6',
      num: 6,
      title: 'University Review',
      status: hasOffer ? 'completed' : (activeApp ? 'current' : 'upcoming'),
      desc: 'Admissions Committee evaluating academic qualifications.',
      actionLabel: 'Check Status',
      actionRoute: '/student/applications',
    },
    {
      id: 'u7',
      num: 7,
      title: 'Offer Decision',
      status: hasOffer ? 'completed' : 'upcoming',
      desc: 'Official University Offer Letter issued with tuition schedule.',
      actionLabel: hasOffer ? 'Review Offer' : 'Awaiting Release',
      actionRoute: '/student/offers',
    },
    {
      id: 'u8',
      num: 8,
      title: 'Admission Confirmation',
      status: isOfferAccepted ? 'completed' : (hasOffer ? 'current' : 'upcoming'),
      desc: 'Offer accepted, initial fee settled & Final Acceptance issued.',
      actionLabel: isOfferAccepted ? 'Download Acceptance' : 'Accept & Confirm',
      actionRoute: '/student/offers',
    },
  ];

  // TRACKER 2: Visa Application (8 Stages)
  const visaStages = [
    {
      id: 'v1',
      num: 1,
      title: 'Prerequisite Verification',
      status: isOfferAccepted ? 'completed' : (hasApprovedDocs ? 'in_progress' : 'upcoming'),
      desc: 'Final Acceptance, financial declarations, and apostilles gathered.',
      actionLabel: 'Check Vault',
      actionRoute: '/student/documents',
    },
    {
      id: 'v2',
      num: 2,
      title: 'Visa File Compilation',
      status: isOfferAccepted ? 'completed' : 'upcoming',
      desc: 'National visa dossier, motivation statement & insurance structured.',
      actionLabel: 'View Visa File',
      actionRoute: '/student/visa-tracker',
    },
    {
      id: 'v3',
      num: 3,
      title: 'VFS Appointment Scheduled',
      status: (visaRecord?.current_stage && visaRecord.current_stage >= 1) ? 'completed' : (isOfferAccepted ? 'current' : 'upcoming'),
      desc: 'Appointment slot confirmed at VFS Global Visa Center.',
      actionLabel: 'Appointment Details',
      actionRoute: '/student/visa-tracker',
    },
    {
      id: 'v4',
      num: 4,
      title: 'Biometrics & Submission',
      status: (visaRecord?.current_stage && visaRecord.current_stage >= 2) ? 'completed' : 'upcoming',
      desc: 'Passport, physical dossier and biometric capture lodged.',
      actionLabel: 'Submission Receipt',
      actionRoute: '/student/visa-tracker',
    },
    {
      id: 'v5',
      num: 5,
      title: 'Consular Processing',
      status: (visaRecord?.current_stage && visaRecord.current_stage >= 3) ? 'completed' : 'upcoming',
      desc: 'Embassy consular section performing background evaluation.',
      actionLabel: 'Consular Status',
      actionRoute: '/student/visa-tracker',
    },
    {
      id: 'v6',
      num: 6,
      title: 'Adjudication Finalized',
      status: (visaRecord?.current_stage && visaRecord.current_stage >= 4) ? 'completed' : 'upcoming',
      desc: 'Embassy decision concluded and sealed for courier dispatch.',
      actionLabel: 'View Status',
      actionRoute: '/student/visa-tracker',
    },
    {
      id: 'v7',
      num: 7,
      title: 'Passport Dispatch',
      status: (visaRecord?.current_stage && visaRecord.current_stage >= 5) ? 'completed' : 'upcoming',
      desc: 'Passport dispatched via secure courier to delivery point.',
      actionLabel: 'Track Courier',
      actionRoute: '/student/visa-tracker',
    },
    {
      id: 'v8',
      num: 8,
      title: 'Visa Verification',
      status: isVisaApproved ? 'completed' : ((visaRecord?.current_stage && visaRecord.current_stage >= 6) ? 'completed' : 'upcoming'),
      desc: 'Passport received and entry vignette verified.',
      actionLabel: isVisaApproved ? 'Visa Confirmed' : 'Awaiting Delivery',
      actionRoute: '/student/visa-tracker',
    },
  ];

  // TRACKER 3: Travel & Arrival (9 Stages)
  const travelStages = [
    {
      id: 't1',
      num: 1,
      title: 'Visa Authorization',
      status: isVisaApproved ? 'completed' : 'upcoming',
      desc: 'National visa granted and pre-departure protocol initiated.',
      actionLabel: 'View Visa Grant',
      actionRoute: '/student/visa-tracker',
    },
    {
      id: 't2',
      num: 2,
      title: 'Flight Itinerary',
      status: isVisaApproved ? 'completed' : 'upcoming',
      desc: 'Flight reservations locked and travel itinerary submitted.',
      actionLabel: 'Flight Details',
      actionRoute: '/student/pre-departure',
    },
    {
      id: 't3',
      num: 3,
      title: 'Accommodation Allotment',
      status: isVisaApproved ? 'completed' : 'upcoming',
      desc: 'Campus dormitory room or verified student residence secured.',
      actionLabel: 'Dorm Allotment',
      actionRoute: '/student/pre-departure',
    },
    {
      id: 't4',
      num: 4,
      title: 'Travel Insurance',
      status: 'completed',
      desc: 'European health and emergency repatriation coverage active.',
      actionLabel: 'Policy Certificate',
      actionRoute: '/student/documents',
    },
    {
      id: 't5',
      num: 5,
      title: 'Airport Concierge',
      status: isVisaApproved ? 'completed' : 'upcoming',
      desc: 'Dedicated arrival welfare representative and transfer arranged.',
      actionLabel: 'Pickup Contacts',
      actionRoute: '/student/pre-departure',
    },
    {
      id: 't6',
      num: 6,
      title: 'Transit & Flight',
      status: isVisaApproved ? 'in_progress' : 'upcoming',
      desc: 'Boarding check-in, international transit, and immigration clearance.',
      actionLabel: 'Travel Guide',
      actionRoute: '/student/pre-departure',
    },
    {
      id: 't7',
      num: 7,
      title: 'Arrival Confirmation',
      status: 'upcoming',
      desc: 'Touchdown confirmed, airport rendezvous and dorm check-in.',
      actionLabel: 'Arrival Checklist',
      actionRoute: '/student/pre-departure',
    },
    {
      id: 't8',
      num: 8,
      title: 'University Registration',
      status: 'upcoming',
      desc: 'Dean office orientation, formal registration and student ID.',
      actionLabel: 'Campus Checklist',
      actionRoute: '/student/pre-departure',
    },
    {
      id: 't9',
      num: 9,
      title: 'Settlement & TRC',
      status: 'upcoming',
      desc: 'Local SIM, bank account setup, and TRC legal assistance.',
      actionLabel: 'Welfare Coordinator',
      actionRoute: '/student/pre-departure',
    },
  ];

  // Calculate completion percentages
  const getCompletedCount = (stages: any[]) => stages.filter(s => s.status === 'completed').length;
  const uniCompleted = getCompletedCount(universityStages);
  const visaCompleted = getCompletedCount(visaStages);
  const travelCompleted = getCompletedCount(travelStages);

  const activeStageList =
    activeTracker === 'university' ? universityStages :
    activeTracker === 'visa' ? visaStages : travelStages;

  const activeCompleted = getCompletedCount(activeStageList);
  const activePercent = Math.round((activeCompleted / activeStageList.length) * 100);

  const trackers = [
    {
      key: 'university' as const,
      index: '01',
      title: 'University Admissions',
      subtitle: 'Lead to Acceptance',
      icon: GraduationCap,
      completed: uniCompleted,
      total: universityStages.length,
      stagesSummary: 'Inquiry • Shortlisting • Dossier • Submission • Offer • Confirmation',
    },
    {
      key: 'visa' as const,
      index: '02',
      title: 'Visa Processing',
      subtitle: 'Documentation to Stamping',
      icon: ShieldCheck,
      completed: visaCompleted,
      total: visaStages.length,
      stagesSummary: 'Prerequisites • VFS Slot • Biometrics • Embassy • Adjudication • Stamping',
    },
    {
      key: 'travel' as const,
      index: '03',
      title: 'Arrival & Settlement',
      subtitle: 'Transit to TRC Support',
      icon: Plane,
      completed: travelCompleted,
      total: travelStages.length,
      stagesSummary: 'Flight • Dorm • Concierge Pickup • Campus Registration • TRC',
    },
  ];

  return (
    <div className="space-y-6 text-left relative min-h-[600px] pb-10">
      {/* Executive Header Banner */}
      <div className="p-6 md:p-8 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-card relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-5 pointer-events-none">
          <Compass className="w-80 h-80 text-white" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-slate-200 border border-white/10 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#58051E]" />
            Admissions & Mobility Lifecycle
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Student Journey Tracker
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
            Monitor real-time progress across the three sequential operational pillars: University Application, Consular Visa Filing, and Travel & Settlement.
          </p>

          <div className="mt-5 flex items-center gap-3 flex-wrap text-xs font-medium text-slate-300">
            <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-300" /> {targetUniversity} ({targetCountry})
            </span>
            <span className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-300" /> Student: {studentName}
            </span>
          </div>
        </div>
      </div>

      {/* 3 Pillar Bento Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {trackers.map((tracker) => {
          const isSelected = activeTracker === tracker.key;
          const Icon = tracker.icon;
          const percent = Math.round((tracker.completed / tracker.total) * 100);

          return (
            <button
              key={tracker.key}
              type="button"
              onClick={() => setActiveTracker(tracker.key)}
              className={`p-5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-white border-[#58051E] shadow-sm ring-1 ring-[#58051E]/20'
                  : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-subtle'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-[#58051E] text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[11px] font-semibold font-mono px-2 py-0.5 rounded border ${
                    isSelected
                      ? 'bg-[#58051E]/10 text-[#58051E] border-[#58051E]/20'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    Phase {tracker.index}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{tracker.title}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  {tracker.stagesSummary}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-500">Progress</span>
                  <span className="text-slate-800 font-semibold">{tracker.completed} of {tracker.total} ({percent}%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#58051E] rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Pipeline Milestone Timeline */}
      <Card className="p-6 md:p-7 bg-white border border-slate-200/80 rounded-xl shadow-subtle space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#58051E]" />
              <h2 className="text-base font-semibold text-slate-900">
                {activeTracker === 'university' && 'University Admissions Pipeline'}
                {activeTracker === 'visa' && 'Consular Visa Pipeline'}
                {activeTracker === 'travel' && 'Travel & Post-Arrival Pipeline'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sequential operational milestones from intake to successful execution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="neutral">
              {activeCompleted} of {activeStageList.length} Milestones Complete ({activePercent}%)
            </Badge>
          </div>
        </div>

        {/* Milestone Rows */}
        <div className="space-y-2.5">
          {activeStageList.map((stage) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current' || stage.status === 'in_progress';

            return (
              <div
                key={stage.id}
                className={`p-4 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCompleted
                    ? 'bg-slate-50/50 border-slate-200/70'
                    : isCurrent
                    ? 'bg-white border-[#58051E]/30 shadow-subtle ring-1 ring-[#58051E]/10'
                    : 'bg-white/40 border-slate-200/50 opacity-75'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-medium shrink-0 text-xs border ${
                    isCompleted
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isCurrent
                      ? 'bg-[#58051E] text-white border-[#58051E]'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : stage.num}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-slate-900">{stage.title}</h4>
                      {isCompleted && (
                        <Badge variant="success" dot>Completed</Badge>
                      )}
                      {isCurrent && (
                        <Badge variant="brand" dot>In Progress</Badge>
                      )}
                      {!isCompleted && !isCurrent && (
                        <Badge variant="neutral">Pending</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {stage.desc}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
                  <Button
                    size="sm"
                    variant={isCurrent ? 'primary' : 'outline'}
                    onClick={() => navigate(stage.actionRoute)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    {stage.actionLabel}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
