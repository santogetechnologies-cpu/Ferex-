import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Building2, MapPin, Trash2, X, CheckCircle2, Edit2,
  Calendar, DollarSign, Layers, ChevronRight, Eye, GraduationCap
} from 'lucide-react';
import { useUniversities } from '../../hooks/useUniversities';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import type { University, PaymentInstallment, CourseSemester, CourseProgram } from '../../lib/types';

export function formatFeeEURandINR(feeStr?: string): string {
  if (!feeStr || feeStr === 'N/A' || feeStr === '—') return '—';
  if (feeStr.includes('₹') && feeStr.includes('€')) return feeStr;

  const cleanStr = feeStr.replace(/,/g, '');
  const numMatch = cleanStr.match(/(\d+)/);
  if (!numMatch) return feeStr;

  const amount = parseInt(numMatch[1], 10);
  if (isNaN(amount) || amount === 0) return feeStr;

  const hasPerYear = feeStr.includes('/ yr') || feeStr.includes('/yr') || feeStr.includes('year') || feeStr.includes('/ year');
  const suffix = hasPerYear ? ' / yr' : '';

  if (feeStr.includes('€') || feeStr.toLowerCase().includes('eur') || feeStr.toLowerCase().includes('euro')) {
    const inrVal = Math.round(amount * 90);
    return `€${amount.toLocaleString('en-US')}${suffix} (~₹${inrVal.toLocaleString('en-IN')}${suffix})`;
  } else if (feeStr.includes('₹') || feeStr.toLowerCase().includes('inr') || feeStr.toLowerCase().includes('rs')) {
    const eurVal = Math.round(amount / 90);
    return `₹${amount.toLocaleString('en-IN')}${suffix} (~€${eurVal.toLocaleString('en-US')}${suffix})`;
  } else if (feeStr.includes('$') || feeStr.toLowerCase().includes('usd')) {
    const eurVal = Math.round(amount * 0.92);
    const inrVal = Math.round(amount * 83);
    return `$${amount.toLocaleString('en-US')} (€${eurVal.toLocaleString('en-US')} / ~₹${inrVal.toLocaleString('en-IN')})`;
  }

  const inrVal = Math.round(amount * 90);
  return `€${amount.toLocaleString('en-US')}${suffix} (~₹${inrVal.toLocaleString('en-IN')}${suffix})`;
}

export const AdminUniversities: React.FC = () => {
  const { universities, loading, addUniversity, updateUniversity, removeUniversity } = useUniversities();
  const { config } = useFeeConfig();

  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewUniversity, setViewUniversity] = useState<University | null>(null);
  const [toast, setToast] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Modal active tab
  const [activeFormTab, setActiveFormTab] = useState<'general' | 'courses' | 'fees' | 'installments' | 'semesters'>('general');

  // Form states
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Poland');
  const [rating, setRating] = useState('');
  const [ranking, setRanking] = useState('');
  const [tuition, setTuition] = useState('');

  // Intakes state
  const [selectedIntakes, setSelectedIntakes] = useState<string[]>(config.global_active_intakes || []);
  const [customIntakeInput, setCustomIntakeInput] = useState('');

  // Course programs fee structure list state
  const [courseProgramsList, setCourseProgramsList] = useState<CourseProgram[]>([]);

  // Fee breakdown states
  const [universityFee, setUniversityFee] = useState('');
  const [vfsFee, setVfsFee] = useState(config.default_vfs_fee || '');
  const [agencyFee, setAgencyFee] = useState(config.default_agency_fee || '');

  // Installments state
  const [installmentsList, setInstallmentsList] = useState<PaymentInstallment[]>([]);

  // Semester details state
  const [semestersList, setSemestersList] = useState<CourseSemester[]>([]);

  const handleAddCustomIntake = () => {
    if (!customIntakeInput.trim()) return;
    const val = customIntakeInput.trim();
    if (!selectedIntakes.includes(val)) {
      setSelectedIntakes(prev => [...prev, val]);
    }
    setCustomIntakeInput('');
  };

  const handleAddCourseProgram = () => {
    const nextId = 'c_' + Date.now();
    setCourseProgramsList(prev => [
      ...prev,
      {
        id: nextId,
        name: 'New Degree Program',
        degree_level: 'Master',
        tuition_fee: '€4,800 / yr',
        duration: '2 Years'
      }
    ]);
  };

  const handleUpdateCourseProgram = (index: number, field: keyof CourseProgram, val: string) => {
    setCourseProgramsList(prev => prev.map((c, i) => i === index ? { ...c, [field]: val } : c));
  };

  const handleRemoveCourseProgram = (index: number) => {
    setCourseProgramsList(prev => prev.filter((_, i) => i !== index));
  };



  const handleUpdateSemesterSubject = (semIndex: number, subIndex: number, val: string) => {
    setSemestersList(prev => prev.map((sem, i) => {
      if (i === semIndex) {
        const nextSubs = [...sem.subjects];
        nextSubs[subIndex] = val;
        return { ...sem, subjects: nextSubs };
      }
      return sem;
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCity('');
    setCountry('Poland');
    setRanking('');
    setRating('');
    setTuition('');
    setSelectedIntakes([]);
    setCustomIntakeInput('');
    setUniversityFee('');
    setVfsFee(config.default_vfs_fee || '');
    setAgencyFee(config.default_agency_fee || '');
    setCourseProgramsList([]);
    setInstallmentsList([]);
    setSemestersList([]);
    setActiveFormTab('general');
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (u: University) => {
    setEditingId(u.id);
    setName(u.name);
    setCity(u.city || '');
    setCountry(u.country || 'Poland');
    setRanking(String(u.ranking || 100));
    setRating(String(u.rating || 4.8));
    setTuition(u.tuition_range || '₹3,50,000 / yr');
    setSelectedIntakes(u.intakes || config.global_active_intakes || []);
    setUniversityFee(u.university_fee || '₹3,50,000');
    setVfsFee(u.vfs_fee || config.default_vfs_fee || '₹28,000');
    setAgencyFee(u.agency_fee || config.default_agency_fee || '₹25,000');

    if (u.course_programs && u.course_programs.length > 0) {
      setCourseProgramsList(u.course_programs);
    } else {
      setCourseProgramsList(
        u.programs?.map((p, idx) => ({
          id: 'cp_' + idx,
          name: p,
          degree_level: 'Master',
          tuition_fee: u.university_fee || '€4,500 / yr',
          duration: '2 Years'
        })) || []
      );
    }

    if (u.installments && u.installments.length > 0) {
      setInstallmentsList(u.installments);
    }
    if (u.semesters && u.semesters.length > 0) {
      setSemestersList(u.semesters);
    }

    setActiveFormTab('general');
    setShowAddModal(true);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const parsedPrograms = courseProgramsList.map(c => c.name);

      const payload = {
        name: name.trim(),
        city: city.trim() || 'Main Campus',
        country,
        rating: parseFloat(rating) || 4.8,
        ranking: parseInt(ranking) || 150,
        tuition_range: tuition.trim() || `${universityFee} / yr`,
        programs: parsedPrograms.length > 0 ? parsedPrograms : ['Computer Science', 'Business Management'],
        intakes: selectedIntakes.length > 0 ? selectedIntakes : ['Fall 2026', 'Spring 2026'],
        university_fee: universityFee,
        vfs_fee: vfsFee,
        agency_fee: agencyFee,
        course_programs: courseProgramsList,
        installments: installmentsList,
        semesters: semestersList,
      };

      if (editingId) {
        await updateUniversity(editingId, payload);
        showToast(`University "${name}" updated successfully!`);
      } else {
        await addUniversity(payload);
        showToast(`University "${name}" created with custom courses & fees!`);
      }

      setShowAddModal(false);
      setEditingId(null);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to save university'}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await removeUniversity(deleteId);
      setDeleteId(null);
      showToast('University removed from portal.');
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to remove university'}`);
    }
  };

  // Filter logic
  const filtered = universities.filter(u => {
    if (!u) return false;
    const nameStr = (u.name || '').toLowerCase();
    const cityStr = (u.city || '').toLowerCase();
    const countryStr = (u.country || '').toLowerCase();
    const q = search.toLowerCase().trim();

    const matchesSearch = !q || nameStr.includes(q) || cityStr.includes(q) || countryStr.includes(q);
    const matchesCountry = countryFilter === 'All' || u.country === countryFilter;
    return matchesSearch && matchesCountry;
  });

  const countriesList = Array.from(new Set(universities.map(u => u?.country).filter(Boolean)));

  return (
    <div className="space-y-6 relative text-left">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">University & Fee Management</h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">Add, edit intakes, course fee structures, VFS & agency fees, installment plans, and curriculum.</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 h-9.5 px-4 bg-[#6A1B2E] rounded-xl text-xs font-bold text-white hover:bg-[#521221] active:scale-98 transition-all shadow-md shadow-[#6A1B2E]/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add University & Fees
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/70 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by university name, city, or country..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Country:</span>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="All">All Countries</option>
            {countriesList.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Universities Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400">Loading university catalog...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-2xl p-12 text-center shadow-xs">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Universities Found</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
            No active universities match your search. Click "Add University & Fees" above to catalog a new institution.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(u => {
            const displayIntakes = u.intakes || ['Fall 2026', 'Spring 2026'];
            const vFee = u.vfs_fee || '$190';
            const aFee = u.agency_fee || '$500';

            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#6A1B2E]/10 border border-[#6A1B2E]/20 flex items-center justify-center text-[#6A1B2E] shrink-0 font-black text-sm">
                        {u.name[0]}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 leading-snug group-hover:text-[#6A1B2E] transition-colors">
                          {u.name}
                        </h3>
                        <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {u.city ? `${u.city}, ${u.country}` : u.country}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        title="Edit Intakes, Courses & Fee Structure"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewUniversity(u)}
                        title="View Details"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#6A1B2E] hover:bg-[#6A1B2E]/5 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(u.id)}
                        title="Remove University"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Intakes Row */}
                  <div className="flex items-center gap-1.5 flex-wrap my-3">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {displayIntakes.map(intake => (
                      <span key={intake} className="text-[9.5px] font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/60">
                        {intake}
                      </span>
                    ))}
                  </div>

                  {/* Fee Breakdown Matrix */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-2 text-xs font-semibold my-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">Tuition Range:</span>
                      <span className="font-black text-slate-900 text-right text-[11px] bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/80 shadow-2xs truncate">
                        {formatFeeEURandINR(u.tuition_range || u.university_fee || u.course_programs?.[0]?.tuition_fee)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">VFS Visa Fee:</span>
                      <span className="font-extrabold text-slate-800 text-right text-[11px] bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/80 shrink-0">
                        {formatFeeEURandINR(vFee)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">Agency Fee:</span>
                      <span className="font-extrabold text-slate-800 text-right text-[11px] bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/80 shrink-0">
                        {formatFeeEURandINR(aFee)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setViewUniversity(u)}
                    className="text-xs font-bold text-[#6A1B2E] hover:underline flex items-center gap-1"
                  >
                    View Details & Courses <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(u)}
                    className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    Edit Fees & Intakes
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* View University Drawer */}
      <AnimatePresence>
        {viewUniversity && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-50" onClick={() => setViewUniversity(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[540px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100 text-left">
              
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#6A1B2E] text-white font-black flex items-center justify-center text-sm shadow-sm">
                    {viewUniversity.name[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{viewUniversity.name}</h3>
                    <p className="text-xs font-semibold text-slate-400">{viewUniversity.city}, {viewUniversity.country}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const u = viewUniversity;
                      setViewUniversity(null);
                      handleOpenEditModal(u);
                    }}
                    className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100"
                  >
                    Edit Fees & Intakes
                  </button>
                  <button onClick={() => setViewUniversity(null)} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400"><X className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Intakes */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#6A1B2E]" /> Configured Admissions Intakes
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(viewUniversity.intakes || ['Fall 2026', 'Spring 2026']).map(i => (
                      <span key={i} className="px-3 py-1 bg-[#6A1B2E]/5 border border-[#6A1B2E]/20 text-[#6A1B2E] text-xs font-bold rounded-lg">
                        {i}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Course Programs with Specific Tuition Fees */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#6A1B2E]" /> Offered Courses & Specific Tuition Fees (EUR & INR)
                  </h4>
                  <div className="space-y-2">
                    {(viewUniversity.course_programs || viewUniversity.programs?.map((p, i) => ({
                      id: String(i), name: p, degree_level: 'Master', tuition_fee: '€4,500 / yr', duration: '2 Years'
                    })) || []).map((course, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-extrabold text-slate-900">{course.name}</p>
                          <p className="text-[10px] font-semibold text-slate-400">{course.degree_level} · {course.duration || '2 Years'}</p>
                        </div>
                        <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          {formatFeeEURandINR(course.tuition_fee)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Standard Fee Matrix */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-[#6A1B2E]" /> Standard Fee Matrix (VFS Visa & Agency Services)
                  </h4>
                  <div className="bg-slate-50 rounded-xl border border-slate-200/80 overflow-hidden text-xs divide-y divide-slate-100">
                    <div className="flex justify-between p-3">
                      <span className="font-bold text-slate-600">VFS Visa Process Fee</span>
                      <span className="font-extrabold text-slate-900">{formatFeeEURandINR(viewUniversity.vfs_fee || '$190')}</span>
                    </div>
                    <div className="flex justify-between p-3">
                      <span className="font-bold text-slate-600">Agency Counseling & Legalization Fee</span>
                      <span className="font-extrabold text-slate-900">{formatFeeEURandINR(viewUniversity.agency_fee || '$500')}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Installments (if configured) */}
                {viewUniversity.installments && viewUniversity.installments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#6A1B2E]" /> Payment Installment Plan
                    </h4>
                    <div className="space-y-2">
                      {viewUniversity.installments.map((inst, idx) => (
                        <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-900">{inst.title}</p>
                            <p className="text-[10px] font-semibold text-slate-400">Due: {inst.due_stage}</p>
                          </div>
                          <span className="text-xs font-extrabold text-[#6A1B2E] bg-[#6A1B2E]/5 px-2.5 py-1 rounded-lg border border-[#6A1B2E]/20">
                            {inst.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <button onClick={() => setViewUniversity(null)} className="w-full h-9 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800">
                  Close Details
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Comprehensive Add / Edit University, Courses & Fees Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {editingId ? 'Edit University, Intakes & Fee Structure' : 'Add University, Intakes & Fee Splits'}
                  </h3>
                  <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">Configure intake dates, course-specific tuition fees, VFS fee, agency fee, installment plan, and semester syllabus</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 overflow-x-auto">
                {[
                  { id: 'general', label: '1. General & Intakes' },
                  { id: 'courses', label: '2. Courses & Tuition Fees' },
                  { id: 'semesters', label: '3. Syllabus' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFormTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      activeFormTab === tab.id
                        ? 'bg-[#6A1B2E] text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* TAB 1: General & Intakes */}
                {activeFormTab === 'general' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        University Name *
                      </label>
                      <input
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Warsaw University of Technology"
                        className="w-full h-9.5 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          City / Campus *
                        </label>
                        <input
                          required
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Warsaw"
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          Country *
                        </label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                        >
                          <option value="Poland">Poland</option>
                          <option value="Germany">Germany</option>
                          <option value="Netherlands">Netherlands</option>
                          <option value="France">France</option>
                          <option value="Italy">Italy</option>
                          <option value="Spain">Spain</option>
                          <option value="United Kingdom">United Kingdom</option>
                          <option value="United States">United States</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          Global Ranking (#)
                        </label>
                        <input
                          type="number"
                          value={ranking}
                          onChange={(e) => setRanking(e.target.value)}
                          placeholder="e.g. 150"
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          Rating (1.0 - 5.0)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="1"
                          max="5"
                          value={rating}
                          onChange={(e) => setRating(e.target.value)}
                          placeholder="e.g. 4.8"
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                        />
                      </div>
                    </div>

                    {/* Intakes Selection & Custom Intake Add Option */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                        Configure Available Admissions Intakes
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {selectedIntakes.map(intake => (
                          <div
                            key={intake}
                            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-[#6A1B2E] text-white border border-[#6A1B2E] shadow-xs flex items-center gap-2"
                          >
                            <span>✓ {intake}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedIntakes(prev => prev.filter(i => i !== intake))}
                              title={`Remove ${intake}`}
                              className="w-4 h-4 rounded-full bg-white/20 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Custom Intake Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customIntakeInput}
                          onChange={(e) => setCustomIntakeInput(e.target.value)}
                          placeholder="Add custom intake (e.g. March 2026)..."
                          className="flex-1 h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomIntake}
                          className="h-8 px-3 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
                        >
                          Add Intake
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Courses & Tuition Fees */}
                {activeFormTab === 'courses' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500">
                        Add individual courses / degree programs with specific tuition fees.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddCourseProgram}
                        className="h-8 px-3 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1 hover:bg-slate-800"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Course Program
                      </button>
                    </div>

                    <div className="space-y-3">
                      {courseProgramsList.map((course, index) => (
                        <div key={course.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Course Program #{index + 1}</span>
                            {courseProgramsList.length > 1 && (
                              <button type="button" onClick={() => handleRemoveCourseProgram(index)} className="text-slate-400 hover:text-red-600">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={course.name}
                              onChange={(e) => handleUpdateCourseProgram(index, 'name', e.target.value)}
                              placeholder="Course Name (e.g. M.Sc Data Science)"
                              className="h-8.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                            <select
                              value={course.degree_level}
                              onChange={(e) => handleUpdateCourseProgram(index, 'degree_level', e.target.value)}
                              className="h-8.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            >
                              <option value="Bachelor">Bachelor Degree</option>
                              <option value="Master">Master Degree</option>
                              <option value="Diploma">Diploma / Cert</option>
                              <option value="PhD">Doctorate / PhD</option>
                            </select>
                            <input
                              type="text"
                              value={course.tuition_fee}
                              onChange={(e) => handleUpdateCourseProgram(index, 'tuition_fee', e.target.value)}
                              placeholder="Course Fee (e.g. €4,500 / yr)"
                              className="h-8.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}



                {/* TAB 5: Semester Details */}
                {activeFormTab === 'semesters' && (
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-slate-500">
                      Configure course semester syllabus and subject module details.
                    </p>

                    <div className="space-y-3">
                      {semestersList.map((sem, sIndex) => (
                        <div key={sem.semester_number} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-extrabold text-slate-900">{sem.title}</span>
                            <span className="text-[10px] font-bold text-slate-500">{sem.credits || '30 ECTS'}</span>
                          </div>
                          <div className="space-y-1.5">
                            {sem.subjects.map((sub, subIdx) => (
                              <input
                                key={subIdx}
                                type="text"
                                value={sub}
                                onChange={(e) => handleUpdateSemesterSubject(sIndex, subIdx, e.target.value)}
                                placeholder={`Subject ${subIdx + 1}`}
                                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="h-9.5 px-4 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="h-9.5 px-6 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] shadow-md shadow-[#6A1B2E]/20"
                  >
                    {editingId ? 'Save & Update University Record' : 'Save Complete University Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setDeleteId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Remove University?</h3>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-5">
                This will remove this university and its fee breakdown from the active catalog.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                <button onClick={handleDelete} className="flex-1 h-9 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700">Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
