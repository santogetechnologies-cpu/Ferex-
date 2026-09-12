import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Building2, MapPin, Trash2, X, CheckCircle2, Edit2,
  Calendar, Eye, Globe, Upload, Image as ImageIcon, RefreshCw
} from 'lucide-react';
import { useUniversities } from '../../hooks/useUniversities';
import { useDestinations } from '../../hooks/useDestinations';
import { useFeeConfig } from '../../hooks/useFeeConfig';
import { uploadFileToBucket } from '../../lib/storage';
import type { University, PaymentInstallment, CourseSemester, CourseProgram } from '../../lib/types';
import type { DestinationItem } from '../../lib/api/destinations';

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

export type CountryItem = DestinationItem;

export const AdminUniversities: React.FC = () => {
  const { universities, loading, addUniversity, updateUniversity, removeUniversity, clearAll: clearAllUniversitiesData, refresh } = useUniversities();
  const { destinations: countryList, addDestination, editDestination, removeDestination, clearAll: clearAllDestinationsData, refresh: refreshDestinations } = useDestinations();
  const { config } = useFeeConfig();

  // Top view tab: 'universities' or 'countries'
  const [activeMainTab, setActiveMainTab] = useState<'universities' | 'countries'>('universities');

  // Add / Edit Country modal state
  const [showAddCountryModal, setShowAddCountryModal] = useState(false);
  const [editingCountryId, setEditingCountryId] = useState<string | null>(null);
  const [newCountryName, setNewCountryName] = useState('');
  const [newCountryCode, setNewCountryCode] = useState('');
  const [newCountryFlag, setNewCountryFlag] = useState('🌍');
  const [newCountryCurrency, setNewCountryCurrency] = useState('EUR');
  const [newCountryAuthority, setNewCountryAuthority] = useState('');
  const [newCountryAcronym, setNewCountryAcronym] = useState('');
  const [newCountryProcessing, setNewCountryProcessing] = useState('15-30 Days');
  const [newCountryFee, setNewCountryFee] = useState('€50');

  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewUniversity, setViewUniversity] = useState<University | null>(null);
  const [toast, setToast] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<University | null>(null);

  // Modal active tab for university form
  const [activeFormTab, setActiveFormTab] = useState<'general' | 'courses' | 'fees' | 'installments' | 'semesters'>('general');

  // Form states for university
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

  const [uploadingImage, setUploadingImage] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // REMOVED PRESET CAMPUS IMAGES - Admin must upload custom images only

  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = reject;

      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 800;
        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(img.src);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('Image file size must be under 15MB.');
      return;
    }

    try {
      setUploadingImage(true);
      // 1. Client-side compression to permanent, high-resolution base64 Data URL
      const dataUrl = await compressImageFile(file);

      // 2. Also attempt upload to Supabase storage bucket
      try {
        const res = await uploadFileToBucket('digital-assets', file, `uni_${Date.now()}`);
        if (res.url && !res.url.startsWith('blob:')) {
          setImageUrl(res.url);
          showToast('🎉 Cover picture uploaded! Click "Save Changes" below to save.');
          return;
        }
      } catch (uploadErr) {
        console.warn('Storage bucket upload notice, using persistent compressed image:', uploadErr);
      }

      // 3. Fallback to compressed Data URL (permanent, works on all browsers and offline)
      setImageUrl(dataUrl);
      showToast('🎉 Picture updated! Click "Save Changes" below to apply.');
    } catch (err: any) {
      showToast(`Could not process image: ${err.message || 'Please choose a different photo'}`);
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  // Intakes state
  const [selectedIntakes, setSelectedIntakes] = useState<string[]>(['October 2026', 'February 2027']);

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

  // Collect all unique countries
  const availableCountryNames = Array.from(
    new Set([...countryList.map(c => c.name), ...universities.map(u => u?.country).filter(Boolean)])
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleOpenEditCountry = (c: DestinationItem) => {
    setEditingCountryId(c.id);
    setNewCountryName(c.name);
    setNewCountryCode(c.code);
    setNewCountryFlag(c.flag || '🌍');
    setNewCountryCurrency(c.currency || 'EUR');
    setNewCountryAuthority(c.authority || '');
    setNewCountryAcronym(c.acronym || '');
    setNewCountryProcessing(c.processing || '15-30 Days');
    setNewCountryFee(c.fee || '€50');
    setShowAddCountryModal(true);
  };

  const handleOpenAddCountry = () => {
    setEditingCountryId(null);
    setNewCountryName('');
    setNewCountryCode('');
    setNewCountryFlag('🌍');
    setNewCountryCurrency('EUR');
    setNewCountryAuthority('');
    setNewCountryAcronym('');
    setNewCountryProcessing('15-30 Days');
    setNewCountryFee('€50');
    setShowAddCountryModal(true);
  };

  const handleAddCountrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCountryName.trim()) return;

    const trimmed = newCountryName.trim();

    if (!editingCountryId && countryList.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      showToast(`Destination "${trimmed}" is already registered.`);
      return;
    }

    try {
      if (editingCountryId) {
        await editDestination(editingCountryId, {
          name: trimmed,
          code: newCountryCode.trim().toUpperCase() || trimmed.substring(0, 2).toUpperCase(),
          flag: newCountryFlag.trim() || '🌍',
          currency: newCountryCurrency.trim() || 'EUR',
          authority: newCountryAuthority.trim() || `${trimmed} Higher Education Ministry`,
          acronym: newCountryAcronym.trim() || trimmed.substring(0, 4).toUpperCase(),
          processing: newCountryProcessing.trim() || '15-30 Days',
          fee: newCountryFee.trim() || '€50',
          desk: `${trimmed} Desk`,
          badge: 'Accredited',
          is_active: true
        });
        showToast(`🎉 Destination "${trimmed}" updated successfully!`);
      } else {
        await addDestination({
          name: trimmed,
          code: newCountryCode.trim().toUpperCase() || trimmed.substring(0, 2).toUpperCase(),
          flag: newCountryFlag.trim() || '🌍',
          currency: newCountryCurrency.trim() || 'EUR',
          authority: newCountryAuthority.trim() || `${trimmed} Higher Education Ministry`,
          acronym: newCountryAcronym.trim() || trimmed.substring(0, 4).toUpperCase(),
          processing: newCountryProcessing.trim() || '15-30 Days',
          fee: newCountryFee.trim() || '€50',
          desk: `${trimmed} Desk`,
          badge: 'Accredited',
          is_active: true
        });
        showToast(`🎉 Destination "${trimmed}" registered successfully!`);
      }

      setShowAddCountryModal(false);
      setEditingCountryId(null);
      setNewCountryName('');
      setNewCountryCode('');
      setNewCountryAuthority('');
      setNewCountryAcronym('');
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Could not save destination'}`);
    }
  };

  const handleDeleteCountry = async (id: string, cName: string) => {
    if (!window.confirm(`Are you sure you want to remove destination "${cName}"?`)) return;
    try {
      await removeDestination(id, cName);
      showToast(`Destination "${cName}" removed.`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Could not remove destination'}`);
    }
  };

  const handleClearAllData = async () => {
    if (!window.confirm("⚠️ Clear All University & Destination Data?\n\nThis will purge all universities and destination countries from Supabase and clear local caches for a completely fresh start. Continue?")) {
      return;
    }
    try {
      await Promise.all([
        clearAllUniversitiesData(),
        clearAllDestinationsData()
      ]);
      showToast('✨ All university & destination data purged. Clean slate ready.');
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Could not purge data'}`);
    }
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

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCity('');
    setCountry(availableCountryNames[0] || 'Poland');
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
    setUniversityFee('€3,200 / yr');
    setVfsFee(config.default_vfs_fee || '₹15,000');
    setAgencyFee(config.default_agency_fee || '₹25,000');
    setCourseProgramsList([
      { id: 'cp-1', name: 'B.Sc Computer Science & Engineering', degree_level: 'Bachelor', tuition_fee: '€3,000 / yr', duration: '3.5 Years' },
      { id: 'cp-2', name: 'M.Sc Artificial Intelligence & Data Systems', degree_level: 'Master', tuition_fee: '€3,500 / yr', duration: '2 Years' }
    ]);
    installmentsList.length > 0 && setInstallmentsList([]);
    semestersList.length > 0 && setSemestersList([]);
    setActiveFormTab('general');
  };

  const handleOpenAddModal = (presetCountry?: string) => {
    resetForm();
    if (presetCountry) {
      setCountry(presetCountry);
    }
    setShowAddModal(true);
  };

  const handleOpenEditModal = (u: University) => {
    setEditingId(u.id);
    setName(u.name);
    setCity(u.city || '');
    setCountry(u.country);
    setBadge(u.badge || 'Top Choice');
    setCategory(u.category || 'Engineering');
    setImageUrl(u.image_url || ''); // No default image URL
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const parsedPrograms = courseProgramsList.map(c => c.name);
      const targetCountry = isCustomCountry ? (customCountryInput.trim() || 'Europe') : country;
      const payload = {
        name: name.trim(),
        country: targetCountry || 'Poland',
        city: city.trim() || 'Capital Campus',
        badge: badge.trim() || 'Top Choice',
        category: category.trim() || 'Engineering',
        image_url: imageUrl.trim() || '', // NO DEFAULT IMAGE - Admin must upload
        description: description.trim() || `${name} offers accredited degree programs with global post-study work opportunities.`,
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
        showToast(`University "${name}" created and published!`);
      }

      setShowAddModal(false);
      setEditingId(null);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to save university'}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await removeUniversity(target.id, target.name);
      showToast(`"${target.name}" removed from catalog.`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to remove university'}`);
    }
  };

  // Filter logic for universities
  const filteredUniversities = universities.filter(u => {
    if (!u) return false;
    const nameStr = (u.name || '').toLowerCase();
    const cityStr = (u.city || '').toLowerCase();
    const countryStr = (u.country || '').toLowerCase();
    const q = search.toLowerCase().trim();

    const matchesSearch = !q || nameStr.includes(q) || cityStr.includes(q) || countryStr.includes(q);
    const matchesCountry = countryFilter === 'All' || u.country === countryFilter;
    return matchesSearch && matchesCountry;
  });

  // Filter logic for countries
  const filteredCountries = countryList.filter(c => {
    const q = search.toLowerCase().trim();
    return !q || c.name.toLowerCase().includes(q) || c.authority.toLowerCase().includes(q) || c.acronym.toLowerCase().includes(q);
  });

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
              Live Global Catalog
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Separately manage registered destination countries and partner universities with multi-currency fees & course programs.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleClearAllData}
            className="flex items-center gap-1.5 h-9.5 px-3 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold text-rose-700 transition-all cursor-pointer border border-rose-200"
            title="Clear all mock / test data for fresh setup"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Clear All Data
          </button>
          <button
            onClick={async () => {
              await Promise.all([refresh(), refreshDestinations()]);
              showToast('Catalog refreshed from live database.');
            }}
            className="flex items-center gap-1.5 h-9.5 px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer border border-slate-200"
            title="Refresh catalog"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Refresh
          </button>
          <button
            onClick={handleOpenAddCountry}
            className="flex items-center gap-1.5 h-9.5 px-3.5 bg-slate-900 rounded-xl text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-xs cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-amber-300" /> Add Country
          </button>
          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 h-9.5 px-4 bg-[#6A1B2E] rounded-xl text-xs font-bold text-white hover:bg-[#521221] active:scale-98 transition-all shadow-md shadow-[#6A1B2E]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add University
          </button>
        </div>
      </div>

      {/* Top Module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        <button
          onClick={() => setActiveMainTab('universities')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
            activeMainTab === 'universities'
              ? 'bg-[#6A1B2E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" /> Universities ({universities.length})
        </button>
        <button
          onClick={() => setActiveMainTab('countries')}
          className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
            activeMainTab === 'countries'
              ? 'bg-[#6A1B2E] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Globe className="w-4 h-4 text-emerald-600" /> Countries & Legalization ({countryList.length})
        </button>
      </div>

      {/* TAB 1: UNIVERSITIES MANAGEMENT */}
      {activeMainTab === 'universities' && (
        <div className="space-y-4">
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

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Country:</span>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="h-9 px-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none max-w-xs"
              >
                <option value="All">All Countries ({universities.length})</option>
                {availableCountryNames.map(c => {
                  const count = universities.filter(u => u.country === c).length;
                  return (
                    <option key={c} value={c}>
                      {c} {count > 0 ? `(${count})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Universities Grid */}
          {loading ? (
            <div className="py-16 text-center text-xs font-bold text-slate-400">Loading university catalog...</div>
          ) : filteredUniversities.length === 0 ? (
            <div className="bg-white border border-slate-200/70 rounded-2xl p-12 text-center shadow-xs">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-800">No Universities Found</h3>
              <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                No institutions match the current search or country filter.
              </p>
              <button
                onClick={() => handleOpenAddModal(countryFilter !== 'All' ? countryFilter : undefined)}
                className="px-4 py-2 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221]"
              >
                + Add University to {countryFilter !== 'All' ? countryFilter : 'Catalog'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredUniversities.map(u => {
                const displayIntakes = u.intakes || ['October 2026', 'February 2027'];

                return (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group text-left"
                  >
                    <div>
                      {/* Card Image Banner */}
                      <div className="h-32 relative overflow-hidden bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900">
                        {u.image_url ? (
                          <img
                            src={u.image_url}
                            alt={u.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ImageIcon className="w-12 h-12 opacity-30" />
                          </div>
                        )}
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
                              title="Edit University"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setViewUniversity(u)}
                              title="View Details"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(u)}
                              title="Delete University"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Tuition & Cost Banner */}
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-medium">Tuition Fee:</span>
                            <span className="font-extrabold text-[#6A1B2E]">
                              {formatFeeEURandINR(u.tuition_range || u.university_fee)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-medium">Living Cost:</span>
                            <span className="font-bold text-slate-700">{u.living_cost_monthly || '€350 - €500 / mo'}</span>
                          </div>
                        </div>

                        {/* Intakes */}
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 flex-wrap">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-400">Intakes:</span>
                          {displayIntakes.map(intk => (
                            <span key={intk} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
                              {intk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-500">
                        {u.course_programs?.length || u.programs?.length || 2} Degree Programs
                      </span>
                      <button
                        onClick={() => handleOpenEditModal(u)}
                        className="font-extrabold text-[#6A1B2E] hover:underline flex items-center gap-1"
                      >
                        Manage Programs & Fees →
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COUNTRIES & LEGALIZATION WORKFLOWS */}
      {activeMainTab === 'countries' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/70 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search registered countries, legalization authorities, or acronyms..."
                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>
            <button
              onClick={() => setShowAddCountryModal(true)}
              className="h-9 px-4 bg-[#6A1B2E] text-white rounded-xl text-xs font-bold hover:bg-[#521221] flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add New Country
            </button>
          </div>

          {filteredCountries.length === 0 ? (
            <div className="bg-white border border-slate-200/70 rounded-2xl p-12 text-center shadow-xs">
              <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-black text-slate-800">No Destination Countries Registered</h3>
              <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                Register study destination countries with their legalization authorities, currencies, and visa guidelines.
              </p>
              <button
                onClick={() => setShowAddCountryModal(true)}
                className="px-4 py-2 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221]"
              >
                + Register First Destination Country
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCountries.map((c) => {
                const count = universities.filter(u => u.country.toLowerCase() === c.name.toLowerCase()).length;

                return (
                  <div key={c.id || c.name} className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{c.flag}</span>
                          <div>
                            <h3 className="text-sm font-black text-slate-900">{c.name}</h3>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">ISO: {c.code} • {c.currency}</span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 bg-[#6A1B2E]/10 text-[#6A1B2E] rounded-md text-[10px] font-extrabold border border-[#6A1B2E]/20">
                          {c.acronym}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Legalization Authority:</span>
                          <span className="font-bold text-slate-800 text-xs">{c.authority}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                          <span className="text-slate-500 font-medium">Processing Time:</span>
                          <span className="font-bold text-emerald-700">{c.processing}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Govt / Legal Fee:</span>
                          <span className="font-bold text-slate-800">{c.fee}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-4">
                      <span className="text-xs font-bold text-slate-600">
                        {count} {count === 1 ? 'University' : 'Universities'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCountryFilter(c.name);
                            setActiveMainTab('universities');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          View Universities
                        </button>
                        <button
                          onClick={() => handleOpenAddModal(c.name)}
                          className="px-2.5 py-1 bg-[#6A1B2E] hover:bg-[#521221] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          + Add Uni
                        </button>
                        <button
                          onClick={() => handleOpenEditCountry(c)}
                          title="Edit Destination"
                          className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCountry(c.id, c.name)}
                          title="Remove Destination"
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT COUNTRY MODAL */}
      <AnimatePresence>
        {showAddCountryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddCountryModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#6A1B2E]" />
                  <h3 className="text-base font-black text-slate-900">
                    {editingCountryId ? 'Edit Destination Country' : 'Register New Destination Country'}
                  </h3>
                </div>
                <button onClick={() => setShowAddCountryModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleAddCountrySubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Country Name</label>
                  <input
                    type="text"
                    required
                    value={newCountryName}
                    onChange={(e) => setNewCountryName(e.target.value)}
                    placeholder="e.g. Switzerland"
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Flag Emoji</label>
                    <input
                      type="text"
                      value={newCountryFlag}
                      onChange={(e) => setNewCountryFlag(e.target.value)}
                      placeholder="🇨🇭"
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-center focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Country Code</label>
                    <input
                      type="text"
                      value={newCountryCode}
                      onChange={(e) => setNewCountryCode(e.target.value)}
                      placeholder="CH"
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Currency</label>
                    <input
                      type="text"
                      value={newCountryCurrency}
                      onChange={(e) => setNewCountryCurrency(e.target.value)}
                      placeholder="CHF"
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Legalization Body / Agency</label>
                  <input
                    type="text"
                    value={newCountryAuthority}
                    onChange={(e) => setNewCountryAuthority(e.target.value)}
                    placeholder="e.g. State Secretariat for Education (SERI)"
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Acronym</label>
                    <input
                      type="text"
                      value={newCountryAcronym}
                      onChange={(e) => setNewCountryAcronym(e.target.value)}
                      placeholder="SERI"
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Processing Time</label>
                    <input
                      type="text"
                      value={newCountryProcessing}
                      onChange={(e) => setNewCountryProcessing(e.target.value)}
                      placeholder="20-35 Days"
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Authority Fee</label>
                    <input
                      type="text"
                      value={newCountryFee}
                      onChange={(e) => setNewCountryFee(e.target.value)}
                      placeholder="€80"
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button type="button" onClick={() => setShowAddCountryModal(false)} className="h-9 px-4 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
                  <button type="submit" className="h-9 px-5 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] shadow-xs cursor-pointer">
                    {editingCountryId ? 'Save Country Changes' : 'Register Country'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD / EDIT UNIVERSITY MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl border border-slate-100 z-10 text-left space-y-4 max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingId ? 'Edit University Details & Programs' : 'Add New Partner University'}
                  </h3>
                  <p className="text-xs text-slate-400">Configure university profile, course programs, and fee milestones</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>

              {/* Form Tab switcher */}
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                {[
                  { id: 'general', label: '1. General Info' },
                  { id: 'courses', label: `2. Course Programs (${courseProgramsList.length})` },
                  { id: 'fees', label: '3. Fees & Invoicing' },
                  { id: 'installments', label: '4. Installment Stages' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveFormTab(t.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                      activeFormTab === t.id ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <form id="university-admin-form" onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4">
                {activeFormTab === 'general' && (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">University Name</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Warsaw University of Technology"
                        className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Country</label>
                        <select
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                        >
                          {availableCountryNames.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Campus City</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Warsaw"
                          className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Badge Tag</label>
                        <input
                          type="text"
                          value={badge}
                          onChange={(e) => setBadge(e.target.value)}
                          placeholder="e.g. Top Choice / NAWA Verified"
                          className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Category Domain</label>
                        <input
                          type="text"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder="e.g. Engineering & IT"
                          className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* University Picture / Cover Upload Section */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                          University Cover Picture
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowUrlInput(!showUrlInput)}
                          className="text-[10px] font-bold text-[#6A1B2E] hover:underline"
                        >
                          {showUrlInput ? 'Hide URL input' : 'Paste custom image URL'}
                        </button>
                      </div>

                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png, image/jpeg, image/webp, image/jpg"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />

                      {/* Live Preview & Upload Dropzone */}
                      {imageUrl ? (
                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
                          <img
                            src={imageUrl}
                            alt="University Campus Preview"
                            className="w-full h-36 object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-3.5">
                            <div className="text-white">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600/90 px-2 py-0.5 rounded text-white flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Active Picture Preview
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingImage}
                                className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 rounded-xl text-xs font-bold shadow-md flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Upload className="w-3.5 h-3.5 text-[#6A1B2E]" />
                                {uploadingImage ? 'Uploading...' : 'Change Picture'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setImageUrl('')}
                                className="p-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-xl shadow-md transition-colors"
                                title="Remove Image"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-300 hover:border-[#6A1B2E] bg-slate-50/70 hover:bg-slate-50 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-[#6A1B2E]/10 group-hover:bg-[#6A1B2E] text-[#6A1B2E] group-hover:text-white flex items-center justify-center transition-colors">
                            {uploadingImage ? (
                              <RefreshCw className="w-6 h-6 animate-spin" />
                            ) : (
                              <Upload className="w-6 h-6" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800">
                              {uploadingImage ? 'Uploading image...' : 'Click to Upload University Picture from Computer'}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                              Supports PNG, JPG, JPEG, WEBP up to 10MB
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={uploadingImage}
                            className="mt-1 px-4 py-1.5 bg-[#6A1B2E] hover:bg-[#521221] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> Choose Picture File
                          </button>
                        </div>
                      )}

                      {/* Optional Direct URL Input */}
                      {showUrlInput && (
                        <div className="pt-1">
                          <input
                            type="text"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://example.com/university-photo.jpg"
                            className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief summary of academic rankings and campus life..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {activeFormTab === 'courses' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-600">Offered Degree Programs & Tuition</p>
                      <button
                        type="button"
                        onClick={handleAddCourseProgram}
                        className="px-3 py-1.5 bg-[#6A1B2E] text-white text-xs font-bold rounded-lg hover:bg-[#521221] flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Program
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {courseProgramsList.map((cp, idx) => (
                        <div key={cp.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase text-slate-400">Program #{idx + 1}</span>
                            <button type="button" onClick={() => handleRemoveCourseProgram(idx)} className="text-slate-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <input
                              type="text"
                              value={cp.name}
                              onChange={(e) => handleUpdateCourseProgram(idx, 'name', e.target.value)}
                              placeholder="Course Program Name"
                              className="h-8.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold sm:col-span-2"
                            />
                            <select
                              value={cp.degree_level}
                              onChange={(e) => handleUpdateCourseProgram(idx, 'degree_level', e.target.value as any)}
                              className="h-8.5 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            >
                              <option value="Bachelor">Bachelor (B.Sc / BA)</option>
                              <option value="Master">Master (M.Sc / MA / MBA)</option>
                              <option value="Doctorate">Doctorate / PhD</option>
                              <option value="Diploma">Diploma / Foundation</option>
                            </select>
                            <input
                              type="text"
                              value={cp.tuition_fee}
                              onChange={(e) => handleUpdateCourseProgram(idx, 'tuition_fee', e.target.value)}
                              placeholder="€3,500 / yr"
                              className="h-8.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeFormTab === 'fees' && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">University Tuition Fee</label>
                        <input
                          type="text"
                          value={universityFee}
                          onChange={(e) => setUniversityFee(e.target.value)}
                          placeholder="€3,200 / yr"
                          className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                        />
                        <p className="text-[10px] font-semibold text-slate-400 mt-1">{formatFeeEURandINR(universityFee)}</p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">VFS / Visa Gov Fee</label>
                        <input
                          type="text"
                          value={vfsFee}
                          onChange={(e) => setVfsFee(e.target.value)}
                          placeholder="₹15,000"
                          className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Agency Processing Fee</label>
                        <input
                          type="text"
                          value={agencyFee}
                          onChange={(e) => setAgencyFee(e.target.value)}
                          placeholder="₹25,000"
                          className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Monthly Living Cost Estimate</label>
                      <input
                        type="text"
                        value={livingCostMonthly}
                        onChange={(e) => setLivingCostMonthly(e.target.value)}
                        placeholder="€350 - €500 / mo"
                        className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {activeFormTab === 'installments' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-600">Custom Payment Milestones / Installments</p>
                      <button
                        type="button"
                        onClick={handleAddInstallment}
                        className="px-3 py-1.5 bg-[#6A1B2E] text-white text-xs font-bold rounded-lg hover:bg-[#521221] flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Milestone
                      </button>
                    </div>

                    <div className="space-y-2.5">
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
                                placeholder="Due Event"
                                className="h-8.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                              />
                              <input
                                type="text"
                                value={inst.amount}
                                onChange={(e) => handleUpdateInstallment(index, 'amount', e.target.value)}
                                placeholder="Amount (€1,000)"
                                className="h-8.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </form>

              {/* Modal Persistent Sticky Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0 bg-white">
                <span className="text-[11px] font-bold text-slate-400 truncate max-w-[200px]">
                  {editingId ? `Editing: ${name || 'University'}` : 'New University Profile'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="h-9 px-4 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    form="university-admin-form"
                    type="submit"
                    className="h-9 px-6 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-98"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {editingId ? 'Save Changes' : 'Publish University'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW UNIVERSITY DRAWER */}
      <AnimatePresence>
        {viewUniversity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setViewUniversity(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 z-10 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">{viewUniversity.name}</h3>
                  <p className="text-xs font-semibold text-slate-400">{viewUniversity.city}, {viewUniversity.country}</p>
                </div>
                <button onClick={() => setViewUniversity(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              {viewUniversity.image_url && (
                <div className="h-32 rounded-xl overflow-hidden relative">
                  <img src={viewUniversity.image_url} alt={viewUniversity.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-2 left-2.5 px-2 py-0.5 bg-[#6A1B2E] text-amber-300 rounded text-[10px] font-black">
                    {viewUniversity.badge || 'Top Choice'}
                  </span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex justify-between"><span>Annual Tuition:</span><span className="font-bold text-[#6A1B2E]">{formatFeeEURandINR(viewUniversity.university_fee || viewUniversity.tuition_range)}</span></div>
                  <div className="flex justify-between"><span>VFS Govt Fee:</span><span className="font-bold text-slate-800">{viewUniversity.vfs_fee || '₹15,000'}</span></div>
                  <div className="flex justify-between"><span>Agency Fee:</span><span className="font-bold text-slate-800">{viewUniversity.agency_fee || '₹25,000'}</span></div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 uppercase text-[10px] text-slate-400 mb-1">Degree Programs</h4>
                  <div className="space-y-1">
                    {(viewUniversity.course_programs || viewUniversity.programs || []).map((p: any, idx: number) => (
                      <div key={idx} className="p-2 bg-slate-50 rounded-lg flex justify-between font-semibold">
                        <span>{typeof p === 'string' ? p : p.name}</span>
                        {typeof p !== 'string' && <span className="text-[#6A1B2E] font-bold">{p.tuition_fee}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => setViewUniversity(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE UNIVERSITY CONFIRMATION */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setDeleteTarget(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Remove University?</h3>
                  <p className="text-xs font-bold text-slate-700 line-clamp-1">{deleteTarget.name}</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-5">
                This will remove <strong className="text-slate-800">{deleteTarget.name}</strong> ({deleteTarget.city ? `${deleteTarget.city}, ` : ''}{deleteTarget.country}) from the portal and student view.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button onClick={handleDelete} className="flex-1 h-9 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all shadow-md shadow-red-600/20 cursor-pointer">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
