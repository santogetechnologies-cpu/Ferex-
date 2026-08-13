import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Search, MapPin, Award, ArrowRight, Sparkles, Heart, X, Star, Lock, CreditCard, FileText, Upload, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUniversities } from '../hooks/useUniversities';
import { useApplications } from '../hooks/useApplications';
import { usePayments } from '../hooks/usePayments';
import { useDocuments } from '../hooks/useDocuments';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/Card';

export const SelectUniversity: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { universities } = useUniversities();
  const { addApp } = useApplications(user?.id);
  const { payments } = usePayments(user?.id);
  const { documents } = useDocuments(user?.id);

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

  // Check if 1st Installment (Registration & Application Fee) is paid
  const inst1Paid = payments.some(p =>
    (p.description?.includes('1st') || p.description?.includes('1') || p.payment_type?.includes('1st')) &&
    (p.status === 'Paid' || p.status === 'Verified')
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [savedUnis, setSavedUnis] = useState<string[]>([]);
  const [successToast, setSuccessToast] = useState('');
  const [drawerUni, setDrawerUni] = useState<any>(null);

  // Apply Modal state
  const [applyUni, setApplyUni] = useState<any>(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [intake, setIntake] = useState('October 2026');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (!hasMandatoryDocs) {
      setSuccessToast('🔒 Mandatory Step Required: Please upload your Passport and Academic Marksheets in Document Vault before selecting a university.');
      setTimeout(() => navigate('/student/documents'), 2000);
      return;
    }
    if (!inst1Paid) {
      setSuccessToast('1st Installment Fee (₹15,000) required before applying. Please clear payment in Payments page.');
      setTimeout(() => setSuccessToast(''), 3500);
      return;
    }
    setApplyUni(uni);
    setSelectedCourse(uni.programs?.[0] || 'Computer Science');
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMandatoryDocs) {
      setSuccessToast('🔒 Mandatory Step: Please upload your Passport & Marksheets first.');
      navigate('/student/documents');
      return;
    }
    if (!inst1Paid) {
      setSuccessToast('1st Installment Fee payment required to submit university application.');
      return;
    }
    if (!applyUni || !user) return;

    try {
      setIsSubmitting(true);
      const studentName = profile?.full_name || user?.email?.split('@')[0] || 'Student';

      const matchedProg = applyUni.course_programs?.find((p: any) => p.name === selectedCourse);
      const rawTuition = matchedProg?.tuition_fee || applyUni.university_fee || applyUni.tuition_range || '750000';

      await addApp({
        student_id: user.id,
        student_name: studentName,
        university_id: applyUni.id,
        university_name: applyUni.name,
        program_name: selectedCourse || 'Higher Studies',
        intake: intake || 'October 2026',
        tuition_fee: rawTuition,
        course_fee: rawTuition
      });

      setApplyUni(null);
      setSuccessToast(`Application submitted successfully to ${applyUni.name}!`);
      setTimeout(() => navigate('/student/applications'), 1200);
    } catch (err: any) {
      setSuccessToast(`Error: ${err.message || 'Failed to submit application'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const countries = ['All', ...Array.from(new Set(universities.map(u => u.country)))];

  const filteredUnis = universities.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.programs.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCountry = selectedCountry === 'All' || u.country === selectedCountry;
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

      {/* NON-SKIPPABLE MANDATORY DOCUMENT SUBMISSION BANNER */}
      {!hasMandatoryDocs && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-amber-500 text-white rounded-2xl shadow-lg border border-amber-600 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-100 shrink-0 mt-0.5 animate-bounce" />
            <div>
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                🔒 Mandatory Pre-requisite Step Required Before University Selection
              </h3>
              <p className="text-xs font-semibold text-amber-100 mt-1 leading-relaxed">
                You must upload your <span className="font-black underline">Passport</span> and <span className="font-black underline">Academic Marksheets/Transcripts</span> in the Document Vault before you can select or apply to universities.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/student/documents')}
            className="h-10 px-5 bg-white text-amber-950 rounded-xl text-xs font-black hover:bg-amber-100 shadow-md whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0"
          >
            <Upload className="w-4 h-4 text-amber-800" /> Upload Required Documents Now →
          </button>
        </motion.div>
      )}

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
            Browse accredited partner universities and select your target program for upcoming intakes.
          </p>
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
            placeholder="Search university name, city, or course (e.g. Data Science, Warsaw)..."
            className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {countries.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCountry(c)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
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

          return (
            <Card key={uni.id} className="p-5 flex flex-col justify-between border border-slate-200/80 hover:border-[#6A1B2E]/30 transition-all hover:shadow-md group bg-white">
              <div>
                {/* Logo & Bookmark */}
                <div className="flex items-center justify-between mb-4">
                  {uni.logo_url ? (
                    <img src={uni.logo_url} alt={uni.name} className="w-10 h-10 object-contain p-1 bg-slate-50 border border-slate-100 rounded-xl" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-black text-sm border border-[#6A1B2E]/20">
                      {uni.name[0]}
                    </div>
                  )}
                  <button
                    onClick={() => toggleSave(uni.id, uni.name)}
                    className={`p-2 rounded-xl border transition-colors ${
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
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{uni.city}, {uni.country}</span>
                  <span className="text-slate-300">•</span>
                  <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Rank #{uni.ranking}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4 space-y-1.5 text-xs font-semibold">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tuition Fee:</span>
                    <span className="font-bold text-slate-900">{uni.tuition_range}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Programs Offered:</span>
                    <span className="font-bold text-slate-800">{uni.programs?.length || 0} Degree Courses</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => setDrawerUni(uni)}
                  className="flex-1 h-9 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                >
                  View Details
                </button>

                {!hasMandatoryDocs ? (
                  <button
                    onClick={() => handleOpenApply(uni)}
                    className="flex-1 h-9 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-xs transition-all"
                  >
                    <Lock className="w-3.5 h-3.5" /> Upload Documents First
                  </button>
                ) : (
                  <button
                    onClick={() => handleOpenApply(uni)}
                    disabled={!inst1Paid}
                    className={`flex-1 h-9 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all ${
                      inst1Paid
                        ? 'bg-[#6A1B2E] text-white hover:bg-[#521221] shadow-xs'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {!inst1Paid && <Lock className="w-3 h-3 mr-0.5" />} Apply Now
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* University Detail Drawer */}
      <AnimatePresence>
        {drawerUni && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={() => setDrawerUni(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="relative bg-white w-full max-w-lg h-full shadow-2xl z-10 p-6 overflow-y-auto flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    {drawerUni.logo_url ? (
                      <img src={drawerUni.logo_url} alt="" className="w-10 h-10 object-contain p-1 bg-slate-50 border border-slate-100 rounded-xl" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-black text-sm border border-[#6A1B2E]/20">
                        {drawerUni.name?.[0] || 'U'}
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-black text-slate-900">{drawerUni.name}</h3>
                      <p className="text-xs font-bold text-slate-400">{drawerUni.city}, {drawerUni.country}</p>
                    </div>
                  </div>
                  <button onClick={() => setDrawerUni(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
                </div>

                <div className="space-y-4 text-xs font-semibold text-slate-600">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
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
                        <span className="text-xs text-slate-400 italic font-medium">No active intake listed</span>
                      )}
                    </div>

                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Fee Breakdown</h4>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5 mb-4">
                      <div className="flex justify-between"><span className="text-slate-600">University Tuition:</span><span className="font-extrabold text-slate-900">{drawerUni.university_fee || drawerUni.tuition_range || '₹3,50,000 / yr'}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                {!hasMandatoryDocs ? (
                  <button
                    onClick={() => {
                      setDrawerUni(null);
                      navigate('/student/documents');
                    }}
                    className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" /> Upload Passport & Marksheets First
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const u = drawerUni;
                      setDrawerUni(null);
                      handleOpenApply(u);
                    }}
                    disabled={!inst1Paid}
                    className={`w-full h-10 text-xs font-extrabold rounded-xl shadow-xs transition-all ${
                      inst1Paid
                        ? 'bg-[#6A1B2E] text-white hover:bg-[#521221]'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {!inst1Paid ? '🔒 Clear 1st Installment Fee to Apply' : `Apply to ${drawerUni.name}`}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Apply Course & Program Modal */}
      <AnimatePresence>
        {applyUni && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={() => setApplyUni(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Apply to {applyUni.name}</h3>
                  <p className="text-xs font-semibold text-slate-400">{applyUni.city}, {applyUni.country}</p>
                </div>
                <button onClick={() => setApplyUni(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Select Degree Course *</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                  >
                    {applyUni.programs?.map((p: string) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Select Target Intake</label>
                  <select
                    value={intake}
                    onChange={(e) => setIntake(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                  >
                    {(applyUni.intakes && applyUni.intakes.length > 0 ? applyUni.intakes : ['October 2026', 'Fall 2026', 'Spring 2026']).map((i: string) => (
                      <option key={i} value={i}>{i} Intake</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setApplyUni(null)} className="h-9 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="h-9 px-5 bg-[#6A1B2E] text-white rounded-xl text-xs font-bold hover:bg-[#521221] shadow-xs">
                    {isSubmitting ? 'Submitting...' : 'Confirm & Submit Application'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
