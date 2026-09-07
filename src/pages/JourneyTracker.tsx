import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass, CheckCircle2, ArrowRight, ShieldCheck,
  Plane, GraduationCap, Sparkles, Building, User
} from 'lucide-react';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { useApplications } from '../hooks/useApplications';
import { useDocuments } from '../hooks/useDocuments';
import { useVisa } from '../hooks/useVisa';

export const JourneyTracker: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { applications } = useApplications(user?.id);
  const { documents } = useDocuments(user?.id);
  const { records: visaRecords } = useVisa(user?.id);

  // Active tracker tab: 'university' (🟦), 'visa' (🟨), 'travel' (🟩)
  const [activeTracker, setActiveTracker] = useState<'university' | 'visa' | 'travel'>('university');

  const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';
  const isProfileDone = Boolean(profile?.full_name);

  const activeApp = applications[0];
  const targetCountry = localStorage.getItem('ferex_student_target_country') || activeApp?.universities?.country || (activeApp as any)?.country || 'Poland';
  const targetUniversity = activeApp?.university_name || (targetCountry === 'Poland' ? 'Warsaw University of Technology' : `${targetCountry} Partner University`);

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

  // 🟦 TRACKER 1: University Application (8 Stages)
  const universityStages = [
    {
      id: 'u1',
      num: 1,
      title: 'Lead',
      status: isProfileDone ? 'completed' : 'current',
      desc: 'Student profile created and initial academic inquiry logged into FEREX.',
      actionLabel: isProfileDone ? 'View Profile' : 'Complete Profile',
      actionRoute: '/student/profile',
    },
    {
      id: 'u2',
      num: 2,
      title: 'Counselling',
      status: isProfileDone ? 'completed' : 'upcoming',
      desc: 'One-on-one session with dedicated European education counsellor.',
      actionLabel: 'Schedule Session',
      actionRoute: '/student/meetings',
    },
    {
      id: 'u3',
      num: 3,
      title: 'University Shortlisted',
      status: activeApp ? 'completed' : (isProfileDone ? 'current' : 'upcoming'),
      desc: 'Target universities and accredited degree programs selected.',
      actionLabel: activeApp ? 'View Shortlist' : 'Select University',
      actionRoute: '/student/select-university',
    },
    {
      id: 'u4',
      num: 4,
      title: 'Application Prepared',
      status: hasApprovedDocs ? 'completed' : (hasUploadedDocs ? 'in_progress' : (activeApp ? 'current' : 'upcoming')),
      desc: 'Academic transcripts, SOP, and passport verified in Document Vault.',
      actionLabel: 'Document Vault',
      actionRoute: '/student/documents',
    },
    {
      id: 'u5',
      num: 5,
      title: 'Application Submitted',
      status: activeApp ? 'completed' : 'upcoming',
      desc: 'Formal application dossier submitted to University Admissions Department.',
      actionLabel: 'View Applications',
      actionRoute: '/student/applications',
    },
    {
      id: 'u6',
      num: 6,
      title: 'University Review',
      status: hasOffer ? 'completed' : (activeApp ? 'current' : 'upcoming'),
      desc: 'University Admissions Committee & Faculty Board evaluating qualifications.',
      actionLabel: 'Check Status',
      actionRoute: '/student/applications',
    },
    {
      id: 'u7',
      num: 7,
      title: 'Conditional/Unconditional Offer',
      status: hasOffer ? 'completed' : 'upcoming',
      desc: 'Official University Offer Letter issued with tuition breakdown.',
      actionLabel: hasOffer ? 'Review Offer Letter' : 'Awaiting Release',
      actionRoute: '/student/offers',
    },
    {
      id: 'u8',
      num: 8,
      title: 'Admission Confirmed',
      status: isOfferAccepted ? 'completed' : (hasOffer ? 'current' : 'upcoming'),
      desc: 'Offer accepted, 1st tuition installment settled & Final Acceptance issued.',
      actionLabel: isOfferAccepted ? 'Download Acceptance' : 'Accept & Confirm',
      actionRoute: '/student/offers',
    },
  ];

  // 🟨 TRACKER 2: Visa Application (8 Stages)
  const visaStages = [
    {
      id: 'v1',
      num: 1,
      title: 'Documents Ready',
      status: isOfferAccepted ? 'completed' : (hasApprovedDocs ? 'in_progress' : 'upcoming'),
      desc: 'Final Acceptance Letter, financial proofs, and apostilles gathered.',
      actionLabel: 'Check Vault',
      actionRoute: '/student/documents',
    },
    {
      id: 'v2',
      num: 2,
      title: 'Visa File Prepared',
      status: isOfferAccepted ? 'completed' : 'upcoming',
      desc: 'National visa application dossier, cover letter & insurance prepared.',
      actionLabel: 'View Visa File',
      actionRoute: '/student/visa-tracker',
    },
    {
      id: 'v3',
      num: 3,
      title: 'VFS Appointment Booked',
      status: (visaRecord?.current_stage && visaRecord.current_stage >= 1) ? 'completed' : (isOfferAccepted ? 'current' : 'upcoming'),
      desc: 'Appointment slot confirmed at VFS Global Visa Application Center.',
      actionLabel: 'Appointment Details',
      actionRoute: '/student/visa-tracker',
    },
    {
      id: 'v4',
      num: 4,
      title: 'VFS Submitted',
      status: (visaRecord?.current_stage && visaRecord.current_stage >= 2) ? 'completed' : 'upcoming',
      desc: 'Physical passport, original documents & biometric submission completed.',
      actionLabel: 'Submission Receipt',
      actionRoute: '/student/visa-tracker',
    },
    {
      id: 'v5',
      num: 5,
      title: 'Consular Processing',
      status: (visaRecord?.current_stage && visaRecord.current_stage >= 3) ? 'completed' : 'upcoming',
      desc: 'Consular Embassy department evaluating visa application.',
      actionLabel: 'Consular Status',
      actionRoute: '/student/visa-tracker',
    },
    {
      id: 'v6',
      num: 6,
      title: 'Decision Made',
      status: (visaRecord?.current_stage && visaRecord.current_stage >= 4) ? 'completed' : 'upcoming',
      desc: 'Embassy evaluation finalized and sealed in confidential envelope.',
      actionLabel: 'View Status',
      actionRoute: '/student/visa-tracker',
    },
    {
      id: 'v7',
      num: 7,
      title: 'Passport Return',
      status: (visaRecord?.current_stage && visaRecord.current_stage >= 5) ? 'completed' : 'upcoming',
      desc: 'Passport dispatched via secure courier to applicant collection point.',
      actionLabel: 'Track Courier',
      actionRoute: '/student/visa-tracker',
    },
    {
      id: 'v8',
      num: 8,
      title: 'Visa Result Confirmed',
      status: isVisaApproved ? 'completed' : ((visaRecord?.current_stage && visaRecord.current_stage >= 6) ? 'completed' : 'upcoming'),
      desc: 'Passport delivered in hand & official Schengen / National visa verified.',
      actionLabel: isVisaApproved ? 'Visa Confirmed 🎉' : 'Awaiting Delivery',
      actionRoute: '/student/visa-tracker',
    },
  ];

  // 🟩 TRACKER 3: Travel (9 Stages)
  const travelStages = [
    {
      id: 't1',
      num: 1,
      title: 'Visa Approved',
      status: isVisaApproved ? 'completed' : 'upcoming',
      desc: 'Entry visa stamping granted and pre-departure protocol initiated.',
      actionLabel: 'View Visa Grant',
      actionRoute: '/student/visa-tracker',
    },
    {
      id: 't2',
      num: 2,
      title: 'Flight Planning',
      status: isVisaApproved ? 'completed' : 'upcoming',
      desc: 'Flight routes scheduled & international airline tickets booked.',
      actionLabel: 'Flight Itinerary',
      actionRoute: '/student/pre-departure',
    },
    {
      id: 't3',
      num: 3,
      title: 'Accommodation',
      status: isVisaApproved ? 'completed' : 'upcoming',
      desc: 'University campus dormitory room or student residence allotment confirmed.',
      actionLabel: 'Dorm Allotment',
      actionRoute: '/student/pre-departure',
    },
    {
      id: 't4',
      num: 4,
      title: 'Travel Insurance',
      status: 'completed',
      desc: 'Comprehensive European health & emergency travel medical coverage active.',
      actionLabel: 'Policy Certificate',
      actionRoute: '/student/documents',
    },
    {
      id: 't5',
      num: 5,
      title: 'Airport/Travel Support',
      status: isVisaApproved ? 'completed' : 'upcoming',
      desc: 'Airport concierge team & dedicated student welfare driver allocated.',
      actionLabel: 'Pickup Contacts',
      actionRoute: '/student/pre-departure',
    },
    {
      id: 't6',
      num: 6,
      title: 'Student Travels',
      status: isVisaApproved ? 'in_progress' : 'upcoming',
      desc: 'Boarding pass check-in, international transit, and customs arrival.',
      actionLabel: 'Travel Guide',
      actionRoute: '/student/pre-departure',
    },
    {
      id: 't7',
      num: 7,
      title: 'Arrival Confirmed',
      status: 'upcoming',
      desc: 'Safe touchdown at destination airport & dormitory room keys collected.',
      actionLabel: 'Arrival Checklist',
      actionRoute: '/student/pre-departure',
    },
    {
      id: 't8',
      num: 8,
      title: 'University Reporting',
      status: 'upcoming',
      desc: 'Dean office in-person registration, student ID card issuance & orientation.',
      actionLabel: 'Campus Checklist',
      actionRoute: '/student/pre-departure',
    },
    {
      id: 't9',
      num: 9,
      title: 'Post-Arrival Support',
      status: 'upcoming',
      desc: 'Local SIM card, bank account opening, and Temporary Residence Card (TRC) assistance.',
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

  return (
    <div className="space-y-6 text-left relative min-h-[600px] pb-10">
      {/* Header Banner */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-wine-950 to-[#6A1B2E] text-white rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
          <Compass className="w-96 h-96 text-white" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-black text-amber-300 border border-white/15 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> 3-Stage Lifecycle Tracker
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Student Journey & Milestone Tracker
          </h1>
          <p className="text-xs md:text-sm font-medium text-slate-200 mt-2 leading-relaxed">
            Track your progress across the 3 sequential pillars: University Application, Visa Application, and Travel & Arrival Support.
          </p>

          <div className="mt-5 flex items-center gap-3 flex-wrap text-xs font-bold text-slate-300">
            <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-amber-300" /> {targetUniversity} ({targetCountry})
            </span>
            <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" /> Student: {studentName}
            </span>
          </div>
        </div>
      </div>

      {/* 3 TRACKERS SELECTOR CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 🟦 TRACKER 1 */}
        <div
          onClick={() => setActiveTracker('university')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            activeTracker === 'university'
              ? 'bg-blue-50/90 border-blue-400 shadow-md ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                🟦 Tracker 1
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900">University Application</h3>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              Lead ➔ Counselling ➔ Shortlist ➔ Submit ➔ Offer ➔ Acceptance
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-500">Progress</span>
              <span className="text-blue-700">{uniCompleted} / {universityStages.length} Stages</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${(uniCompleted / universityStages.length) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* 🟨 TRACKER 2 */}
        <div
          onClick={() => setActiveTracker('visa')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            activeTracker === 'visa'
              ? 'bg-amber-50/90 border-amber-400 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                🟨 Tracker 2
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900">Visa Application</h3>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              Docs ➔ File Prep ➔ VFS Slot ➔ Submit ➔ Embassy ➔ Visa Result
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-500">Progress</span>
              <span className="text-amber-800">{visaCompleted} / {visaStages.length} Stages</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${(visaCompleted / visaStages.length) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* 🟩 TRACKER 3 */}
        <div
          onClick={() => setActiveTracker('travel')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
            activeTracker === 'travel'
              ? 'bg-emerald-50/90 border-emerald-400 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                <Plane className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                🟩 Tracker 3
              </span>
            </div>
            <h3 className="text-sm font-black text-slate-900">Travel & Arrival</h3>
            <p className="text-[11px] font-semibold text-slate-500 mt-1">
              Visa Grant ➔ Flights ➔ Dorm ➔ Airport Pickup ➔ Campus Arrival
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-500">Progress</span>
              <span className="text-emerald-800">{travelCompleted} / {travelStages.length} Stages</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${(travelCompleted / travelStages.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE TRACKER ROADMAP LIST */}
      <Card className="p-6 md:p-8 bg-white border border-slate-200/80 rounded-3xl shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                activeTracker === 'university' ? 'bg-blue-600' :
                activeTracker === 'visa' ? 'bg-amber-500' : 'bg-emerald-600'
              }`} />
              <h2 className="text-lg font-black text-slate-900">
                {activeTracker === 'university' && '🟦 University Application Pipeline'}
                {activeTracker === 'visa' && '🟨 Visa Application Pipeline'}
                {activeTracker === 'travel' && '🟩 Travel & Post-Arrival Pipeline'}
              </h2>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              Stage by stage breakdown in sequential order.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
              {activeCompleted} of {activeStageList.length} Stages Completed ({activePercent}%)
            </span>
          </div>
        </div>

        {/* Sequential Stages Grid */}
        <div className="space-y-3">
          {activeStageList.map((stage) => {
            const isCompleted = stage.status === 'completed';
            const isCurrent = stage.status === 'current' || stage.status === 'in_progress';

            const badgeColor =
              isCompleted ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
              isCurrent ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse' :
              'bg-slate-50 text-slate-500 border-slate-200';

            return (
              <div
                key={stage.id}
                className={`p-4 md:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCompleted ? 'bg-emerald-50/40 border-emerald-200/80' :
                  isCurrent ? 'bg-white border-amber-300 shadow-sm ring-1 ring-amber-400/30' :
                  'bg-slate-50/60 border-slate-200/60 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 text-xs border ${
                    isCompleted ? 'bg-emerald-600 text-white border-emerald-700' :
                    isCurrent ? 'bg-amber-500 text-white border-amber-600' :
                    'bg-slate-200 text-slate-600 border-slate-300'
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : stage.num}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-slate-900">{stage.title}</h4>
                      <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md border ${badgeColor}`}>
                        {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">
                      {stage.desc}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => navigate(stage.actionRoute)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                      isCompleted ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' :
                      isCurrent ? 'bg-[#6A1B2E] text-white hover:bg-[#521221]' :
                      'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {stage.actionLabel} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
