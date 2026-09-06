import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Building2, MapPin, Trash2, X, CheckCircle2, Edit2,
  Calendar, DollarSign, Layers, ChevronRight, Eye, GraduationCap, Image, Globe, Shield, Sparkles
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

const PRESET_COUNTRIES = [
  'Poland',
  'Germany',
  'Czech Republic',
  'Italy',
  'Spain',
  'France',
  'Lithuania',
  'Hungary',
  'Austria',
  'Netherlands',
  'United Kingdom',
  'United States'
];

const PRESET_BADGES = [
  'Top Choice',
  'AACSB Accredited',
  'High Acceptance',
  'Research Hub',
  'Industry Partner',
  'Top European Rank',
  'Historic Heritage',
  'Affordable Living',
  'DSU Scholarship Eligible',
  'Zero Tuition Candidate'
];

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
  const [isCustomCountry, setIsCustomCountry] = useState(false);
  const [customCountryInput, setCustomCountryInput] = useState('');
  const [badge, setBadge] = useState('Top Choice');
  const [category, setCategory] = useState('Engineering');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState('4.8');
  const [ranking, setRanking] = useState('100');
  const [tuition, setTuition] = useState('€3,200 / yr');
  const [livingCostMonthly, setLivingCostMonthly] = useState('€350 - €500 / mo');
  const [nawaRequired, setNawaRequired] = useState(true);

  // Intakes state
  const [selectedIntakes, setSelectedIntakes] = useState<string[]>(['October 2026', 'February 2027']);
  const [customIntakeInput, setCustomIntakeInput] = useState('');

  // Course programs fee structure list state
  const [courseProgramsList, setCourseProgramsList] = useState<CourseProgram[]>([]);

  // Fee breakdown states
  const [universityFee, setUniversityFee] = useState('€3,200 / yr');
  const [vfsFee, setVfsFee] = useState('₹15,000');
  const [agencyFee, setAgencyFee] = useState('₹25,000');

  // Installments state
  const [installmentsList, setInstallmentsList] = useState<PaymentInstallment[]>([]);

  // Semester details state
  const [semestersList, setSemestersList] = useState<CourseSemester[]>([]);

  // Collect all unique countries from existing list + presets
  const availableCountries = Array.from(
    new Set([...PRESET_COUNTRIES, ...universities.map(u => u?.country).filter(Boolean)])
  );

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
        tuition_fee: '€3,500 / yr',
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

  const handleAddInstallment = () => {
    const nextId = 'inst_' + Date.now();
    setInstallmentsList(prev => [
      ...prev,
      {
        id: nextId,
        title: `Installment Stage #${prev.length + 1}`,
        amount: '€1,000',
        due_stage: 'On Offer Letter Approval'
      }
    ]);
  };

  const handleUpdateInstallment = (index: number, field: keyof PaymentInstallment, val: string) => {
    setInstallmentsList(prev => prev.map((inst, i) => i === index ? { ...inst, [field]: val } : inst));
  };

  const handleRemoveInstallment = (index: number) => {
    setInstallmentsList(prev => prev.filter((_, i) => i !== index));
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
    setIsCustomCountry(false);
    setCustomCountryInput('');
    setBadge('Top Choice');
    setCategory('Engineering');
    setImageUrl('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80');
    setDescription('');
    setRanking('100');
    setRating('4.8');
    setTuition('€3,200 / yr');
    setLivingCostMonthly('€350 - €500 / mo');
    setNawaRequired(true);
    setSelectedIntakes(['October 2026', 'February 2027']);
    setCustomIntakeInput('');
    setUniversityFee('€3,200 / yr');
    setVfsFee(config.default_vfs_fee || '₹15,000');
    setAgencyFee(config.default_agency_fee || '₹25,000');
    setCourseProgramsList([
      { id: 'cp-1', name: 'B.Sc Computer Science & Engineering', degree_level: 'Bachelor', tuition_fee: '€3,000 / yr', duration: '3.5 Years' },
      { id: 'cp-2', name: 'M.Sc Artificial Intelligence & Data Systems', degree_level: 'Master', tuition_fee: '€3,500 / yr', duration: '2 Years' }
    ]);
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
    
    if (availableCountries.includes(u.country)) {
      setCountry(u.country);
      setIsCustomCountry(false);
      setCustomCountryInput('');
    } else {
      setCountry(u.country);
      setIsCustomCountry(true);
      setCustomCountryInput(u.country);
    }

    setBadge(u.badge || 'Top Choice');
    setCategory(u.category || 'Engineering');
    setImageUrl(u.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80');
    setDescription(u.description || '');
    setRanking(String(u.ranking || 100));
    setRating(String(u.rating || 4.8));
    setTuition(u.tuition_range || u.university_fee || '€3,200 / yr');
    setLivingCostMonthly(u.living_cost_monthly || '€350 - €500 / mo');
    setNawaRequired(u.nawa_required !== undefined ? u.nawa_required : u.country.toLowerCase() === 'poland');
    setSelectedIntakes(u.intakes || ['October 2026', 'February 2027']);
    setUniversityFee(u.university_fee || u.tuition_range || '€3,200 / yr');
    setVfsFee(u.vfs_fee || config.default_vfs_fee || '₹15,000');
    setAgencyFee(u.agency_fee || config.default_agency_fee || '₹25,000');

    if (u.course_programs && u.course_programs.length > 0) {
      setCourseProgramsList(u.course_programs);
    } else {
      setCourseProgramsList(
        u.programs?.map((p, idx) => ({
          id: 'cp_' + idx,
          name: p,
          degree_level: 'Master',
          tuition_fee: u.university_fee || '€3,500 / yr',
          duration: '2 Years'
        })) || []
      );
    }

    setInstallmentsList(u.installments || []);
    setSemestersList(u.semesters || []);
    setActiveFormTab('general');
    setShowAddModal(true);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const resolvedCountry = isCustomCountry ? (customCountryInput.trim() || 'Europe') : country;

    try {
      const parsedPrograms = courseProgramsList.map(c => c.name);

      const payload = {
        name: name.trim(),
        city: city.trim() || 'Main Campus',
        country: resolvedCountry,
        badge,
        category,
        image_url: imageUrl.trim() || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80',
        description: description.trim() || `${name} is an accredited European institution offering English-taught degrees.`,
        rating: parseFloat(rating) || 4.8,
        ranking: parseInt(ranking) || 100,
        tuition_range: tuition.trim() || universityFee,
        living_cost_monthly: livingCostMonthly.trim() || '€350 - €500 / mo',
        nawa_required: nawaRequired,
        programs: parsedPrograms.length > 0 ? parsedPrograms : ['Computer Science', 'Business Management'],
        intakes: selectedIntakes.length > 0 ? selectedIntakes : ['October 2026', 'February 2027'],
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
        showToast(`University "${name}" created and published to Landing Page!`);
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
      showToast('University removed from portal and landing page.');
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
        <div className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">University & Destination Management</h1>
            <span className="text-[10.5px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-md border border-amber-300/80">
              Live Public Sync
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            SuperAdmin controls: Add custom countries, configure universities, tuition in EUR/INR, course programs, living costs, and landing page visibility.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 h-9.5 px-4 bg-[#6A1B2E] rounded-xl text-xs font-bold text-white hover:bg-[#521221] active:scale-98 transition-all shadow-md shadow-[#6A1B2E]/20 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Country & University
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
            <option value="All">All Destinations ({universities.length})</option>
            {countriesList.map(c => (
              <option key={c} value={c}>{c} ({universities.filter(u => u.country === c).length})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Universities Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400">Loading dynamic university catalog...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-2xl p-12 text-center shadow-xs">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Universities Found</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
            No active universities match your search. Click "Add Country & University" above to publish a new European partner institution.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(u => {
            const displayIntakes = u.intakes || ['October 2026', 'February 2027'];
            const vFee = u.vfs_fee || '₹15,000';
            const aFee = u.agency_fee || '₹25,000';

            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group text-left"
              >
                <div>
                  {/* Card Image Banner */}
                  <div className="h-32 relative overflow-hidden bg-slate-900">
                    <img
                      src={u.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80'}
                      alt={u.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                    
                    <span className="absolute top-2.5 right-2.5 text-[9.5px] font-black bg-[#6A1B2E] text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-300/40 shadow-xs">
                      {u.badge || 'Top Choice'}
                    </span>

                    <div className="absolute bottom-2 left-3 text-white">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 bg-black/40 px-2 py-0.5 rounded">
                        {u.category || 'Engineering'}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 leading-snug group-hover:text-[#6A1B2E] transition-colors">
                          {u.name}
                        </h3>
                        <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          {u.city ? `${u.city}, ${u.country}` : u.country}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          title="Edit University, Country, Fees & Courses"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewUniversity(u)}
                          title="View Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#6A1B2E] hover:bg-[#6A1B2E]/5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(u.id)}
                          title="Remove University"
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Intakes Row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {displayIntakes.map(intake => (
                        <span key={intake} className="text-[9.5px] font-extrabold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/60">
                          {intake}
                        </span>
                      ))}
                    </div>

                    {/* Fee Breakdown Matrix */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1.5 text-xs font-semibold">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">Tuition Fee:</span>
                        <span className="font-black text-slate-900 text-right text-[11px] bg-white px-2 py-0.5 rounded-md border border-slate-200/80 shrink-0">
                          {formatFeeEURandINR(u.tuition_range || u.university_fee || u.course_programs?.[0]?.tuition_fee)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">Living Cost:</span>
                        <span className="font-extrabold text-slate-700 text-right text-[10.5px]">
                          {u.living_cost_monthly || '€350 - €500 / mo'}
                        </span>
                      </div>
                      {u.nawa_required && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Shield className="w-3 h-3 text-amber-600" /> NAWA Legalization Required
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-100 mt-2">
                  <button
                    onClick={() => setViewUniversity(u)}
                    className="text-xs font-bold text-[#6A1B2E] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    View Details & Programs <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(u)}
                    className="text-[10.5px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    Configure Fees
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
              className="fixed right-0 top-0 bottom-0 w-full md:w-[560px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100 text-left">
              
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
                <button onClick={() => setViewUniversity(null)} className="p-1.5 rounded-full hover:bg-slate-200/60 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-left">
                {/* Image Banner */}
                {viewUniversity.image_url && (
                  <div className="h-44 rounded-2xl overflow-hidden relative shadow-md">
                    <img src={viewUniversity.image_url} alt={viewUniversity.name} className="w-full h-full object-cover" />
                    <span className="absolute top-3 right-3 text-[10px] font-black bg-[#6A1B2E] text-amber-300 px-3 py-1 rounded-full shadow-md">
                      {viewUniversity.badge || 'Accredited'}
                    </span>
                  </div>
                )}

                {/* Description */}
                {viewUniversity.description && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs font-semibold text-slate-700 leading-relaxed">
                    {viewUniversity.description}
                  </div>
                )}

                {/* Course Programs & Tuition */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#6A1B2E]" /> Course Programs & Tuition Fees
                  </h4>
                  <div className="space-y-2">
                    {(viewUniversity.course_programs || []).map((prog, idx) => (
                      <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{prog.name}</p>
                          <p className="text-[10px] font-semibold text-slate-400">{prog.degree_level} • {prog.duration || '2 Years'}</p>
                        </div>
                        <span className="text-xs font-black text-[#6A1B2E] bg-[#6A1B2E]/5 px-2.5 py-1 rounded-lg border border-[#6A1B2E]/20">
                          {formatFeeEURandINR(prog.tuition_fee)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cost of Living */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex justify-between items-center">
                  <span>Estimated Monthly Living Expenses:</span>
                  <span className="font-black text-emerald-800">{viewUniversity.living_cost_monthly || '€350 - €500 / mo'}</span>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                <button
                  onClick={() => {
                    const uni = viewUniversity;
                    setViewUniversity(null);
                    handleOpenEditModal(uni);
                  }}
                  className="flex-1 h-9 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221]"
                >
                  Edit University & Fees
                </button>
                <button onClick={() => setViewUniversity(null)} className="h-9 px-4 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100">
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Comprehensive Add / Edit University, Country & Fees Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
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
                    {editingId ? 'Edit European Partner Institution & Fees' : 'Add European Country & University'}
                  </h3>
                  <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">
                    Configure country destination, programs, tuition in EUR/INR, and live public landing page display.
                  </p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4 overflow-x-auto">
                {[
                  { id: 'general', label: '1. Destination & Campus' },
                  { id: 'courses', label: '2. Degree Programs & Fees' },
                  { id: 'fees', label: '3. Cost Breakdown & VFS' },
                  { id: 'installments', label: '4. Installment Stages' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFormTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
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
                {/* TAB 1: Destination & Campus */}
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
                          placeholder="e.g. Warsaw or Krakow"
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                            Country / Destination *
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsCustomCountry(!isCustomCountry)}
                            className="text-[10px] font-bold text-[#6A1B2E] hover:underline"
                          >
                            {isCustomCountry ? '← Select from list' : '+ Add Custom Country'}
                          </button>
                        </div>
                        
                        {isCustomCountry ? (
                          <input
                            required
                            type="text"
                            value={customCountryInput}
                            onChange={(e) => setCustomCountryInput(e.target.value)}
                            placeholder="Enter Country (e.g. Switzerland)..."
                            className="w-full h-9 px-3 bg-slate-50 border border-[#6A1B2E]/40 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                          />
                        ) : (
                          <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                          >
                            {availableCountries.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          Academic Category
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                        >
                          <option value="Engineering">Engineering</option>
                          <option value="Business">Business</option>
                          <option value="IT & CS">IT & CS</option>
                          <option value="Humanities">Humanities</option>
                          <option value="Medicine">Medicine</option>
                          <option value="General">General / Multi-Disciplinary</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          Highlight Badge
                        </label>
                        <input
                          type="text"
                          value={badge}
                          onChange={(e) => setBadge(e.target.value)}
                          placeholder="e.g. Top Choice, AACSB, Research Hub"
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        Campus Photo / Image URL
                      </label>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        Short Institution Bio / Description
                      </label>
                      <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Overview of English taught programs, campus location, and European ranking..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <input
                        type="checkbox"
                        id="nawaReq"
                        checked={nawaRequired}
                        onChange={(e) => setNawaRequired(e.target.checked)}
                        className="w-4 h-4 text-[#6A1B2E] rounded accent-[#6A1B2E]"
                      />
                      <label htmlFor="nawaReq" className="text-xs font-bold text-amber-900 cursor-pointer">
                        NAWA Legalization / Polish Ministry Qualification Audit Required
                      </label>
                    </div>

                    {/* Intakes Selection */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                        Admissions Intakes
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {selectedIntakes.map(intake => (
                          <div
                            key={intake}
                            className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#6A1B2E] text-white flex items-center gap-1.5"
                          >
                            <span>✓ {intake}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedIntakes(prev => prev.filter(i => i !== intake))}
                              className="w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customIntakeInput}
                          onChange={(e) => setCustomIntakeInput(e.target.value)}
                          placeholder="Add custom intake (e.g. October 2026, February 2027)..."
                          className="flex-1 h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomIntake}
                          className="h-8 px-3 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
                        >
                          Add
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
                        Add degree courses with specific annual tuition fees. Used directly in the Landing Page Fee Calculator!
                      </p>
                      <button
                        type="button"
                        onClick={handleAddCourseProgram}
                        className="h-8 px-3 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1 hover:bg-slate-800"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Degree Program
                      </button>
                    </div>

                    <div className="space-y-3">
                      {courseProgramsList.map((course, index) => (
                        <div key={course.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase">Program #{index + 1}</span>
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
                              placeholder="Course Name (e.g. B.Sc Data Science)"
                              className="h-8.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                            <select
                              value={course.degree_level}
                              onChange={(e) => handleUpdateCourseProgram(index, 'degree_level', e.target.value)}
                              className="h-8.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            >
                              <option value="Bachelor">Bachelor Degree</option>
                              <option value="Master">Master Degree</option>
                              <option value="Diploma">Diploma / Foundation</option>
                              <option value="PhD">Doctorate / PhD</option>
                            </select>
                            <input
                              type="text"
                              value={course.tuition_fee}
                              onChange={(e) => handleUpdateCourseProgram(index, 'tuition_fee', e.target.value)}
                              placeholder="Fee (e.g. €3,200 / yr)"
                              className="h-8.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: Cost Breakdown & VFS */}
                {activeFormTab === 'fees' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          Default Annual Tuition Range
                        </label>
                        <input
                          type="text"
                          value={tuition}
                          onChange={(e) => setTuition(e.target.value)}
                          placeholder="e.g. €3,000 - €4,500 / yr"
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          Estimated Monthly Living Cost
                        </label>
                        <input
                          type="text"
                          value={livingCostMonthly}
                          onChange={(e) => setLivingCostMonthly(e.target.value)}
                          placeholder="e.g. €350 - €500 / mo"
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          VFS Visa Fee
                        </label>
                        <input
                          type="text"
                          value={vfsFee}
                          onChange={(e) => setVfsFee(e.target.value)}
                          placeholder="e.g. ₹15,000"
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          Agency / Processing Fee
                        </label>
                        <input
                          type="text"
                          value={agencyFee}
                          onChange={(e) => setAgencyFee(e.target.value)}
                          placeholder="e.g. ₹25,000"
                          className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: Installment Stages */}
                {activeFormTab === 'installments' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500">
                        Configure milestones and stage payment installments for students.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddInstallment}
                        className="h-8 px-3 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center gap-1 hover:bg-slate-800"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Milestone
                      </button>
                    </div>

                    <div className="space-y-3">
                      {installmentsList.length === 0 ? (
                        <div className="p-6 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-xl">
                          No custom installment stages defined. Standard 3-stage fee distribution will apply.
                        </div>
                      ) : (
                        installmentsList.map((inst, index) => (
                          <div key={inst.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase">Stage #{index + 1}</span>
                              <button type="button" onClick={() => handleRemoveInstallment(index)} className="text-slate-400 hover:text-red-600">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={inst.title}
                                onChange={(e) => handleUpdateInstallment(index, 'title', e.target.value)}
                                placeholder="Milestone Title"
                                className="h-8.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                              />
                              <input
                                type="text"
                                value={inst.due_stage}
                                onChange={(e) => handleUpdateInstallment(index, 'due_stage', e.target.value)}
                                placeholder="Due Event / Stage"
                                className="h-8.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                              />
                              <input
                                type="text"
                                value={inst.amount}
                                onChange={(e) => handleUpdateInstallment(index, 'amount', e.target.value)}
                                placeholder="Amount (e.g. €1,000)"
                                className="h-8.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="h-9.5 px-4 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="h-9.5 px-6 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] shadow-md shadow-[#6A1B2E]/20 cursor-pointer"
                  >
                    {editingId ? 'Save & Sync Live' : 'Publish to Portal & Landing Page'}
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Remove University?</h3>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-5">
                This will remove this university from both the portal and the public landing page.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button onClick={handleDelete} className="flex-1 h-9 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 cursor-pointer">Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
