import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Search, MapPin, Award, Sparkles, Heart, X, ShieldCheck, Upload, CreditCard, CheckCircle2, Globe, Check, UserCheck, ArrowRight, Lock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUniversities } from '../hooks/useUniversities';
import { useDestinations } from '../hooks/useDestinations';
import { useApplications } from '../hooks/useApplications';
import { usePayments } from '../hooks/usePayments';
import { useDocuments } from '../hooks/useDocuments';
import { useAuth } from '../contexts/AuthContext';
import { useCountryWorkflows } from '../hooks/useCountryWorkflows';
import { useFeeConfig } from '../hooks/useFeeConfig';
import { Card } from '../components/Card';
import { UnifiedPaymentModal } from '../components/UnifiedPaymentModal';
import { canAccessPage, checkPaymentStage } from '../lib/paymentUnlock';

export const SelectUniversity: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { universities } = useUniversities();
  const { destinations } = useDestinations();
  const { addApp } = useApplications(user?.id);
  const { payments, refresh: refreshPayments } = usePayments(user?.id);
  const { documents } = useDocuments(user?.id);
  const { getWorkflowForCountry } = useCountryWorkflows();
  const { config } = useFeeConfig();

  // Active destinations from database + countries present in universities
  const availableDestinations = useMemo(() => {
    const destMap = new Map<string, { country: string; flag: string; authority: string; desk: string; badge: string }>();
    
    // Add destinations from registry
    destinations.forEach(d => {
      if (d.name) {
        destMap.set(d.name.toLowerCase(), {
          country: d.name,
          flag: d.flag || '🌍',
          authority: d.authority || `${d.name} Legalization`,
          desk: d.desk || `${d.name} Desk`,
          badge: d.badge || 'Accredited'
        });
      }
    });

    // Add any countries from universities not already in destinations
    universities.forEach(u => {
      if (u.country && !destMap.has(u.country.toLowerCase())) {
        destMap.set(u.country.toLowerCase(), {
          country: u.country,
          flag: '🌍',
          authority: `${u.country} Higher Education`,
          desk: `${u.country} Desk`,
          badge: u.badge || 'Partner'
        });
      }
    });

    return Array.from(destMap.values());
  }, [destinations, universities]);

  // Get current active target country
  const savedTargetCountry = localStorage.getItem('ferex_student_target_country') || 'All';
  const [selectedCountry, setSelectedCountry] = useState(savedTargetCountry);

  // Check if mandatory documents (Passport & Marksheets/Transcripts) are uploaded
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

  const hasMandatoryDocs = (hasPassport && hasMarksheets) || documents.length >= 2;

  // Check if 1st Installment (Advance Registration Fee) is paid
  const inst1Paid = payments.some(p => {
    const desc = (String(p.description || '') + ' ' + String(p.title || '') + ' ' + String(p.payment_type || '')).toLowerCase();
    const isStage1 = desc.includes('1st') || desc.includes('1') || desc.includes('registration') || desc.includes('advance') || (p as any).stage_number === 1;
    return isStage1 && (p.status === 'Paid' || p.status === 'Verified');
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [savedUnis, setSavedUnis] = useState<string[]>([]);
  const [successToast, setSuccessToast] = useState('');
  const [drawerUni, setDrawerUni] = useState<any>(null);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Apply Modal state
  const [applyUni, setApplyUni] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [degreeLevel, setDegreeLevel] = useState("Bachelor's Degree");
  const [intake, setIntake] = useState('October 2026');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate Advance Fee for chosen country or default
  const effectiveCountryKey = selectedCountry === 'All' ? 'Poland' : selectedCountry;
  const countryFeeConfig = config.country_fees?.[effectiveCountryKey] || config.country_fees?.[effectiveCountryKey.replace('United Kingdom', 'UK').replace('United States', 'USA')];
  const requiredAdvanceInr = countryFeeConfig?.registration_fee_inr || config.advance_registration_fee_inr || 15000;
  const requiredAdvanceEur = countryFeeConfig?.registration_fee_eur || config.advance_registration_fee_eur || 150;

  // Payment Guard Check - 1st Installment Required
  const paymentAccess = canAccessPage('/select-university', payments, effectiveCountryKey);
  const payment1Status = checkPaymentStage(payments, 1, effectiveCountryKey);

  // If payment not verified, show locked state
  if (!paymentAccess.allowed) {
    return (
      <div className="space-y-6 text-left">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          {/* Locked State Card */}
          <Card className="p-8 text-center space-y-6 bg-gradient-to-br from-amber-50 via-white to-rose-50 border-2 border-amber-200">
            <div className="w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-300 mx-auto flex items-center justify-center">
              <Lock className="w-10 h-10 text-amber-600" />
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-black text-slate-900">
                University Selection Locked
              </h2>
              <p className="text-base font-semibold text-slate-600 max-w-lg mx-auto">
                {paymentAccess.reason || 'Please complete 1st Installment payment to unlock university selection.'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border-2 border-amber-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">Required Payment:</span>
                <span className="text-sm font-extrabold text-amber-700">{payment1Status.requiredPayment}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">Amount:</span>
                <span className="text-lg font-black text-[#6A1B2E]">
                  ₹{requiredAdvanceInr.toLocaleString('en-IN')} <span className="text-sm text-slate-500">or</span> €{requiredAdvanceEur}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">Status:</span>
                <span className={`text-sm font-extrabold px-3 py-1 rounded-full ${
                  payment1Status.paymentStatus === 'pending' 
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}>
                  {payment1Status.paymentStatus === 'pending' ? 'Pending Verification' : 'Not Submitted'}
                </span>
              </div>

              {payment1Status.paymentStatus === 'pending' && (
                <div className="pt-4 border-t border-amber-200">
                  <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-blue-900 mb-1">Payment Under Review</p>
                      <p className="text-xs font-semibold text-blue-700">
                        Your payment is currently being verified by our admin team. 
                        You will receive a notification once verification is complete.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              {payment1Status.paymentStatus === 'not_found' && (
                <button
                  onClick={() => navigate('/student/payments')}
                  className="px-6 py-3 bg-[#6A1B2E] text-white rounded-xl font-bold text-sm hover:bg-[#521221] transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Make Payment Now
                </button>
              )}
              
              <button
                onClick={() => navigate('/student/dashboard')}
                className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all"
              >
                Return to Dashboard
              </button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Dedicated counselor - strictly from admin assignment, NO country defaults
  const assignedCounselorName = (profile as any)?.assigned_counselor && 
                                 (profile as any)?.assigned_counselor !== 'Admin' &&
                                 (profile as any)?.assigned_counselor !== '--'
    ? (profile as any).assigned_counselor
    : 'Admissions Counselor (Pending Assignment)';

  const hasCounselorAssigned = assignedCounselorName !== 'Admissions Counselor (Pending Assignment)';

  const handleCountrySelect = (c: string) => {
    setSelectedCountry(c);
    if (c !== 'All') {
      localStorage.setItem('ferex_student_target_country', c);
      window.dispatchEvent(new Event('ferex_country_change'));
    }
  };

  const toggleSave = (id: string, name: string) => {
    if (savedUnis.includes(id)) {
      setSavedUnis(prev => prev.filter(i => i !== id));
      setSuccessToast(`Removed ${name} from saved shortlist.`);
    } else {
      setSavedUnis(prev => [...prev, id]);
      setSuccessToast(`Saved ${name} to your university shortlist!`);
    }
    setTimeout(() => setSuccessToast(''), 2500);
  };

  const handleOpenApply = (uni: any) => {
    setApplyUni(uni);
    setSelectedCourse(uni.programs?.[0] || 'Computer Science & Engineering');
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyUni || !user) return;

    try {
      setIsSubmitting(true);
      const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';

      const matchedProg = applyUni.course_programs?.find((p: any) => p.name === selectedCourse);
      const rawTuition = matchedProg?.tuition_fee || applyUni.university_fee || applyUni.tuition_range || '€3,500 / yr';

      await addApp({
        student_id: user.id,
        student_name: studentName,
        university_id: applyUni.id,
        university_name: applyUni.name,
        program_name: `${degreeLevel} - ${selectedCourse || 'Higher Studies'}`,
        course: `${degreeLevel} - ${selectedCourse || 'Higher Studies'}`,
        intake: intake || 'October 2026',
        tuition_fee: rawTuition,
        course_fee: rawTuition,
      });

      // Save target country
      if (applyUni.country) {
        localStorage.setItem('ferex_student_target_country', applyUni.country);
        window.dispatchEvent(new Event('ferex_country_change'));
      }

      setApplyUni(null);
      const successMsg = hasCounselorAssigned 
        ? `🎉 Application submitted successfully to ${applyUni.name}! Routed to ${assignedCounselorName}`
        : `🎉 Application submitted successfully to ${applyUni.name}! Pending counselor assignment.`;
      setSuccessToast(successMsg);
      setTimeout(() => navigate('/student/applications'), 1200);
    } catch (err: any) {
      setSuccessToast(`Error: ${err.message || 'Failed to submit application'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allCountryNames = ['All', ...Array.from(new Set(universities.map(u => u?.country).filter(Boolean)))];

  const filteredUnis = universities.filter(u => {
    if (!u) return false;
    const nameStr = (u.name || '').toLowerCase();
    const cityStr = (u.city || '').toLowerCase();
    const countryStr = (u.country || '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    const matchesSearch = !query ||
                          nameStr.includes(query) ||
                          cityStr.includes(query) ||
                          countryStr.includes(query) ||
                          (Array.isArray(u.programs) && u.programs.some(p => typeof p === 'string' && p.toLowerCase().includes(query)));
    const matchesCountry = selectedCountry === 'All' || u.country?.toLowerCase() === selectedCountry.toLowerCase();
    return matchesSearch && matchesCountry;
  });

  return (
    <div className="space-y-6 text-left relative min-h-[600px]">
      {/* Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {successToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center border border-[#6A1B2E]/20">
              <Target className="w-5 h-5" />
            </span>
            University Selection & Course Application Catalog
          </h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Browse accredited European partner universities and select your target program for upcoming intakes.
          </p>
        </div>
      </div>

      {/* Multi-Country Linear Workflow Stepper */}
      <div className="bg-gradient-to-r from-slate-900 via-[#3B0713] to-slate-900 text-white p-5 md:p-6 rounded-3xl border border-rose-950/40 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C5A059] to-[#8C6D2B] text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300/90 block">Multi-Country Admissions Engine</span>
              <h2 className="text-base font-black text-white tracking-tight">Structured 6-Stage Student Admission Flow</h2>
            </div>
          </div>

          {/* Assigned Counselor Desk Pill - Only show if actually assigned */}
          {hasCounselorAssigned && (
            <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/15">
              <div className="w-8 h-8 rounded-full bg-[#C5A059] text-slate-950 flex items-center justify-center font-black text-xs shrink-0">
                {assignedCounselorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <span className="text-[9.5px] font-extrabold text-amber-200 block uppercase tracking-wider">Dedicated Counselor</span>
                <span className="text-xs font-black text-white truncate block">{assignedCounselorName}</span>
              </div>
            </div>
          )}
          
          {!hasCounselorAssigned && (
            <div className="flex items-center gap-2.5 bg-amber-500/20 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-amber-300/30">
              <div className="w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shrink-0">
                ⏳
              </div>
              <div className="text-left min-w-0">
                <span className="text-[9.5px] font-extrabold text-amber-200 block uppercase tracking-wider">Counselor Assignment</span>
                <span className="text-xs font-black text-amber-100 truncate block">Pending Admin Assignment</span>
              </div>
            </div>
          )}
        </div>

        {/* 6 Step Linear Pipeline */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {[
            { step: '01', title: 'Target Country', status: selectedCountry !== 'All' ? `${selectedCountry}` : 'Global Catalog', isDone: true, badge: 'Step 1' },
            { step: '02', title: 'Counselor Assignment', status: hasCounselorAssigned ? assignedCounselorName.split('(')[0].trim() : 'Pending Admin', isDone: hasCounselorAssigned, badge: hasCounselorAssigned ? 'Assigned' : 'Pending' },
            { step: '03', title: 'Document Vault', status: hasMandatoryDocs ? 'Passport & Transcripts Ready' : 'Upload Needed', isDone: hasMandatoryDocs, badge: hasMandatoryDocs ? 'Verified' : 'Action Req', path: '/student/documents' },
            { step: '04', title: 'Registration Fee', status: inst1Paid ? 'Cleared & Verified' : `₹${requiredAdvanceInr.toLocaleString('en-IN')}`, isDone: inst1Paid, badge: inst1Paid ? 'Paid' : 'Due' },
            { step: '05', title: 'Course Application', status: 'Select Program', isDone: false, badge: 'Current' },
            { step: '06', title: 'Offer & Legalization', status: `${getWorkflowForCountry(effectiveCountryKey)?.authority_acronym || 'NAWA'} / Visa`, isDone: false, badge: 'Next Stage' },
          ].map((s, idx) => (
            <div
              key={idx}
              onClick={() => s.path && navigate(s.path)}
              className={`p-2.5 rounded-2xl border transition-all text-left ${
                s.isDone
                  ? 'bg-white/10 border-white/20 text-white'
                  : s.badge === 'Current'
                    ? 'bg-gradient-to-br from-[#6A1B2E] to-[#4A101E] border-amber-400/40 text-white shadow-md'
                    : 'bg-white/5 border-white/10 text-white/60'
              } ${s.path ? 'cursor-pointer hover:border-amber-400/60' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-amber-300 font-mono">{s.step}</span>
                <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                  s.isDone ? 'bg-emerald-500/20 text-emerald-300' : s.badge === 'Current' ? 'bg-amber-400/20 text-amber-200' : 'bg-white/10 text-white/50'
                }`}>
                  {s.badge}
                </span>
              </div>
              <h4 className="text-[11px] font-black truncate">{s.title}</h4>
              <p className="text-[9.5px] font-medium text-white/70 truncate mt-0.5">{s.status}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Destination Country Selection Hub */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#6A1B2E]" />
            <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
              Step 1: Choose Target Destination Country & Admission Desk
            </h2>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            Selected: <strong className="text-[#6A1B2E] font-black">{selectedCountry === 'All' ? 'All Global Destinations' : selectedCountry}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          <button
            onClick={() => handleCountrySelect('All')}
            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
              selectedCountry === 'All'
                ? 'bg-[#6A1B2E] text-white border-[#6A1B2E] shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
            }`}
          >
            <span className="text-lg block mb-0.5">🌍</span>
            <span className="text-xs font-extrabold block">All Countries</span>
            <span className={`text-[9.5px] block ${selectedCountry === 'All' ? 'text-white/80' : 'text-slate-400'}`}>
              Browse Entire Catalog
            </span>
          </button>

          {availableDestinations.map(d => {
            const isSelected = selectedCountry.toLowerCase() === d.country.toLowerCase();
            return (
              <button
                key={d.country}
                onClick={() => handleCountrySelect(d.country)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#6A1B2E] text-white border-[#6A1B2E] shadow-md scale-[1.02]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg">{d.flag}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-300" />}
                </div>
                <span className="text-xs font-black block truncate">{d.country}</span>
                <span className={`text-[9.5px] font-bold block truncate ${isSelected ? 'text-amber-200' : 'text-slate-500'}`}>
                  {d.authority}
                </span>
                <span className={`text-[8.5px] font-semibold block truncate mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                  {d.desk || `${d.country} Desk`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advance & Registration Fee Status Banner */}
      <div className={`p-5 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
        inst1Paid
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          : 'bg-gradient-to-r from-amber-50 via-rose-50/40 to-slate-50 border-amber-200 text-slate-900'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {inst1Paid ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-extrabold shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" /> Advance Advisory & Registration Fee Settled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold shadow-xs">
                <CreditCard className="w-3.5 h-3.5" /> Step 4: Advance Registration Fee
              </span>
            )}
            <span className="text-xs font-black text-slate-700">
              Fee: <strong className="text-[#6A1B2E]">₹{requiredAdvanceInr.toLocaleString('en-IN')} (€{requiredAdvanceEur})</strong>
            </span>
          </div>
          <p className="text-xs font-medium text-slate-600 max-w-2xl">
            {inst1Paid
              ? 'Your admission file is cleared. You can select your university course and submit formal applications.'
              : `Covers eligibility audit, SOP/LOR drafting, university fee verification, and embassy visa file preparation for ${selectedCountry === 'All' ? 'European Universities' : selectedCountry}.`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!inst1Paid ? (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="h-10 px-5 bg-[#6A1B2E] hover:bg-[#521221] text-white text-xs font-bold rounded-xl shadow-md shadow-[#6A1B2E]/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-amber-300" />
              <span>Pay Advance Registration (₹{requiredAdvanceInr.toLocaleString('en-IN')})</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/student/payments')}
              className="h-9 px-4 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-4 h-4" /> View Payment Receipt
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search university name, city, or course (e.g. Computer Science, Warsaw)..."
            className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {allCountryNames.map(c => (
            <button
              key={c}
              onClick={() => handleCountrySelect(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCountry === c
                  ? 'bg-[#6A1B2E] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Universities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUnis.map((uni) => {
          const isSaved = savedUnis.includes(uni.id);
          const wf = getWorkflowForCountry(uni.country);

          return (
            <Card key={uni.id} className="p-5 flex flex-col justify-between border border-slate-200/80 hover:border-[#6A1B2E]/30 transition-all hover:shadow-md group bg-white">
              <div>
                {/* Image / Logo & Bookmark */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    {uni.logo_url ? (
                      <img src={uni.logo_url} alt={uni.name} className="w-10 h-10 object-contain p-1 bg-slate-50 border border-slate-100 rounded-xl" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-black text-sm border border-[#6A1B2E]/20">
                        {uni.name[0]}
                      </div>
                    )}
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200">
                      {wf.authority_acronym}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleSave(uni.id, uni.name)}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      isSaved
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <h3 className="text-base font-black text-slate-900 leading-snug mb-1 group-hover:text-[#6A1B2E] transition-colors">
                  {uni.name}
                </h3>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{uni.city}, {uni.country}</span>
                  <span className="text-slate-300">•</span>
                  <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Rank #{uni.ranking}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4 space-y-1.5 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tuition Fee:</span>
                    <span className="font-bold text-slate-900">{uni.tuition_range || uni.university_fee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Procedure:</span>
                    <span className="font-bold text-[#6A1B2E]">{wf.authority_badge}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => setDrawerUni(uni)}
                  className="flex-1 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  View Details
                </button>

                <button
                  onClick={() => handleOpenApply(uni)}
                  className="flex-1 h-9 bg-[#6A1B2E] hover:bg-[#521221] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
                >
                  Apply Now <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* University Detail Drawer with Country Legalization Summary */}
      <AnimatePresence>
        {drawerUni && (() => {
          const uniWf = getWorkflowForCountry(drawerUni.country);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-end">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={() => setDrawerUni(null)} />
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="relative bg-white w-full max-w-lg h-full shadow-2xl z-10 p-6 overflow-y-auto flex flex-col justify-between text-left">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-black text-sm border border-[#6A1B2E]/20">
                        {drawerUni.name?.[0] || 'U'}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900">{drawerUni.name}</h3>
                        <p className="text-xs font-bold text-slate-400">{drawerUni.city}, {drawerUni.country}</p>
                      </div>
                    </div>
                    <button onClick={() => setDrawerUni(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
                  </div>

                  {/* Country Procedure Banner */}
                  <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 mb-4 space-y-1">
                    <div className="flex items-center gap-1.5 font-black text-amber-900 text-xs">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>{uniWf.authority_name}</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                      {uniWf.authority_description}
                    </p>
                  </div>

                  <div className="space-y-4 text-xs font-semibold text-slate-600">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <span className="text-slate-400 font-extrabold uppercase text-[10px]">World Ranking</span>
                      <span className="text-sm font-black text-slate-900">Rank #{drawerUni.ranking}</span>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Degree Programs</h4>
                      <div className="space-y-1.5">
                        {drawerUni.programs?.map((p: string) => (
                          <div key={p} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-800 flex items-center justify-between">
                            <span>{p}</span>
                            <span className="text-[10px] font-black text-[#6A1B2E] bg-[#6A1B2E]/5 px-2 py-0.5 rounded-md border border-[#6A1B2E]/20">Master / Bachelor</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Available Intakes</h4>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {(drawerUni.intakes && drawerUni.intakes.length > 0) ? (
                          drawerUni.intakes.map((i: string) => (
                            <span key={i} className="px-2.5 py-1 bg-[#6A1B2E]/5 border border-[#6A1B2E]/20 text-[#6A1B2E] text-xs font-bold rounded-lg">
                              {i}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic font-medium">October 2026 / February 2027</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      const u = drawerUni;
                      setDrawerUni(null);
                      handleOpenApply(u);
                    }}
                    className="w-full h-10 text-xs font-black rounded-xl shadow-md bg-[#6A1B2E] text-white hover:bg-[#521221] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Proceed to Course Application</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Apply Course & Program Modal with Guided Multi-Step Checklist */}
      <AnimatePresence>
        {applyUni && (() => {
          const targetWf = getWorkflowForCountry(applyUni.country);

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setApplyUni(null)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl z-10 p-6 sm:p-7 text-left border border-slate-200 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-black text-base border border-[#6A1B2E]/20 shrink-0">
                      {applyUni.name?.[0] || 'U'}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">Apply to {applyUni.name}</h3>
                      <p className="text-xs font-semibold text-slate-400">{applyUni.city}, {applyUni.country} • {targetWf.authority_acronym} Authority Flow</p>
                    </div>
                  </div>
                  <button onClick={() => setApplyUni(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>

                {/* Step Verification & Counselor Review Pill */}
                <div className="p-3.5 bg-gradient-to-r from-amber-50 via-rose-50/40 to-slate-50 rounded-2xl border border-amber-200/80 mb-4 space-y-2">
                  {hasCounselorAssigned && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-[#6A1B2E]" />
                        <span className="text-xs font-black text-slate-900">Assigned Review Desk:</span>
                      </div>
                      <span className="text-[11px] font-black text-[#6A1B2E] bg-white px-2.5 py-0.5 rounded-full border border-rose-200">
                        {assignedCounselorName}
                      </span>
                    </div>
                  )}
                  
                  {!hasCounselorAssigned && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-black text-slate-900">Counselor Assignment:</span>
                      </div>
                      <span className="text-[11px] font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                        Pending Admin
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-semibold">
                    <div className={`p-2 rounded-xl border flex items-center justify-between ${
                      hasMandatoryDocs ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}>
                      <span>Passport & Transcripts:</span>
                      <span className="font-black">{hasMandatoryDocs ? '✅ Ready' : '⚠️ Missing Docs'}</span>
                    </div>
                    <div className={`p-2 rounded-xl border flex items-center justify-between ${
                      inst1Paid ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-blue-50 border-blue-200 text-blue-900'
                    }`}>
                      <span>Advance Registration:</span>
                      <span className="font-black">{inst1Paid ? '✅ Settled' : `₹${requiredAdvanceInr.toLocaleString('en-IN')}`}</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleApplySubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Degree Level</label>
                      <select
                        value={degreeLevel}
                        onChange={(e) => setDegreeLevel(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                      >
                        <option value="Bachelor's Degree">Bachelor's Degree (3-4 Yrs)</option>
                        <option value="Master's Degree">Master's Degree (1.5-2 Yrs)</option>
                        <option value="Doctorate / PhD">Doctorate / PhD (3-4 Yrs)</option>
                        <option value="Undergraduate Diploma">Undergraduate Diploma (1-2 Yrs)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Select Admission Intake</label>
                      <select
                        value={intake}
                        onChange={(e) => setIntake(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                      >
                        {(applyUni.intakes && applyUni.intakes.length > 0) ? (
                          applyUni.intakes.map((i: string) => <option key={i} value={i}>{i}</option>)
                        ) : (
                          <>
                            <option value="October 2026">October 2026 (Fall Semester)</option>
                            <option value="February 2027">February 2027 (Spring Semester)</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Select Program / Major</label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer"
                    >
                      {applyUni.programs?.map((prog: string) => (
                        <option key={prog} value={prog}>{prog}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#6A1B2E]" />
                      <span>{targetWf.authority_badge} Procedure</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                      {hasCounselorAssigned 
                        ? `Your dossier will be reviewed by ${assignedCounselorName} and submitted to ${applyUni.name} admissions board.`
                        : `Your dossier will be reviewed by our admissions team and submitted to ${applyUni.name} admissions board. A counselor will be assigned by admin.`
                      }
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    {!hasMandatoryDocs && (
                      <button
                        type="button"
                        onClick={() => {
                          setApplyUni(null);
                          navigate('/student/documents');
                        }}
                        className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload Missing Documents
                      </button>
                    )}

                    <div className="flex items-center gap-2 ml-auto">
                      <button type="button" onClick={() => setApplyUni(null)} className="h-10 px-4 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
                      <button type="submit" disabled={isSubmitting} className="h-10 px-6 bg-[#6A1B2E] text-white text-xs font-black rounded-xl hover:bg-[#521221] shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                        <Check className="w-4 h-4" />
                        <span>{isSubmitting ? 'Submitting Application...' : 'Confirm & Submit Application'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Unified Payment Modal for Advance Registration Settlement */}
      <UnifiedPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        division="education"
        amount={requiredAdvanceInr}
        currency="INR"
        title="Advance Advisory & Registration Fee"
        invoiceNo={`REG-ADV-${(user?.id || 'GUEST').slice(0, 5).toUpperCase()}-${Date.now().toString().slice(-4)}`}
        purpose={`Advance Advisory & University Registration Fee for ${selectedCountry === 'All' ? 'European Universities' : selectedCountry}`}
        payerName={profile?.full_name || user?.email?.split('@')[0] || 'Student Account'}
        payerEmail={user?.email || 'student@ferex.com'}
        studentId={user?.id}
        onSuccess={() => {
          setShowPaymentModal(false);
          refreshPayments();
          setSuccessToast('🎉 Advance Registration Fee paid and verified successfully! You can now apply to any university.');
          window.dispatchEvent(new Event('ferex_payment_change'));
        }}
      />
    </div>
  );
};
