import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit3, Save, X, CheckCircle2, Camera, Eye, Trash2, Upload, Download,
  Shield, Smartphone, Monitor, Globe, Lock, Mail, Phone, MapPin,
  User, GraduationCap, AlertTriangle, FileText, RefreshCw,
  ToggleLeft, ToggleRight, Plus, Clock, Info
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PersonalInfo {
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  nationality: string;
  passportNo: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
}

interface EducationInfo {
  studyCountry: string;
  university: string;
  course: string;
  intake: string;
  campus: string;
  studentNumber: string;
  applicationStatus: string;
  visaStatus: string;
  counselor: string;
}

interface EmergencyInfo {
  guardianName: string;
  relationship: string;
  phone: string;
  email: string;
  address: string;
}

interface Document {
  id: number;
  name: string;
  type: string;
  status: 'Verified' | 'Pending' | 'Missing';
  size: string;
  uploaded: string;
}

// ─── Helper Components ────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.12em] mb-4 flex items-center gap-2">
    <span className="w-4 h-[2px] bg-[#6A1B2E]/30 rounded-full" />
    {children}
  </h3>
);

const FieldGroup: React.FC<{
  label: string;
  value: string;
  editing: boolean;
  type?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, editing, type = 'text', onChange, placeholder }) => (
  <div>
    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
    {editing ? (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/50 focus:ring-4 focus:ring-[#6A1B2E]/5 transition-all placeholder-slate-300"
      />
    ) : (
      <div className="w-full h-10 px-3.5 bg-slate-50/70 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center">
        {value || <span className="text-slate-300 italic font-normal text-xs">Not provided</span>}
      </div>
    )}
  </div>
);

const SelectGroup: React.FC<{
  label: string;
  value: string;
  editing: boolean;
  options: string[];
  onChange: (v: string) => void;
}> = ({ label, value, editing, options, onChange }) => (
  <div>
    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
    {editing ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/50 focus:ring-4 focus:ring-[#6A1B2E]/5 transition-all cursor-pointer appearance-none"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <div className="w-full h-10 px-3.5 bg-slate-50/70 border border-slate-100 rounded-lg text-sm font-semibold text-slate-700 flex items-center">
        {value || <span className="text-slate-300 italic font-normal text-xs">Not selected</span>}
      </div>
    )}
  </div>
);

const StatusBadge: React.FC<{ status: 'Verified' | 'Pending' | 'Missing' }> = ({ status }) => {
  const map = {
    Verified: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Pending:  'bg-amber-50 text-amber-700 border-amber-100',
    Missing:  'bg-red-50 text-red-600 border-red-100',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'Verified' ? 'bg-emerald-500' : status === 'Pending' ? 'bg-amber-500' : 'bg-red-500'}`} />
      {status}
    </span>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button type="button" onClick={onChange} className="focus:outline-none">
    {checked
      ? <ToggleRight className="w-10 h-10 text-[#6A1B2E]" />
      : <ToggleLeft className="w-10 h-10 text-slate-300" />}
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const MyProfile: React.FC = () => {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    return localStorage.getItem('ferex_student_profile_photo') || null;
  });
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('Personal Information');
  const [completionPct] = useState(78);

  // Editing states
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingEmergency, setEditingEmergency] = useState(false);

  // Personal Information
  const [personal, setPersonal] = useState<PersonalInfo>({
    firstName: 'Ashly',
    lastName: '',
    gender: 'Female',
    dob: '2000-06-14',
    nationality: 'Indian',
    passportNo: 'PS-890412A',
    phone: '+91 98765 43210',
    email: 'student@gmail.com',
    address: '24 Greenfield Avenue',
    city: 'Kochi',
    country: 'India',
    postalCode: '682001',
  });
  const [tempPersonal, setTempPersonal] = useState<PersonalInfo>({ ...personal });

  // Education Details
  const [education] = useState<EducationInfo>({
    studyCountry: 'Poland',
    university: 'University of Warsaw',
    course: 'M.Sc. in Computer Science',
    intake: 'February 2026',
    campus: 'Main Campus, Warsaw',
    studentNumber: 'UW-CS-2026-1042',
    applicationStatus: 'Offer Letter Received',
    visaStatus: 'Visa Processing',
    counselor: 'Education Team',
  });

  // Emergency Contact
  const [emergency, setEmergency] = useState<EmergencyInfo>({
    guardianName: 'Jeshma',
    relationship: 'Mother',
    phone: '+91 98765 10000',
    email: 'jeshma@gmail.com',
    address: '24 Greenfield Avenue, Kochi, India',
  });
  const [tempEmergency, setTempEmergency] = useState<EmergencyInfo>({ ...emergency });

  // Documents
  const [documents, setDocuments] = useState<Document[]>([
    { id: 1, name: 'Passport', type: 'Identity', status: 'Verified', size: '1.2 MB', uploaded: 'Jan 12, 2026' },
    { id: 2, name: 'IELTS Certificate', type: 'Language', status: 'Verified', size: '0.8 MB', uploaded: 'Jan 15, 2026' },
    { id: 3, name: 'Bachelor\'s Degree', type: 'Academic', status: 'Verified', size: '2.1 MB', uploaded: 'Jan 10, 2026' },
    { id: 4, name: 'Academic Transcript', type: 'Academic', status: 'Pending', size: '1.7 MB', uploaded: 'Feb 2, 2026' },
    { id: 5, name: 'Curriculum Vitae', type: 'Professional', status: 'Verified', size: '0.4 MB', uploaded: 'Jan 8, 2026' },
    { id: 6, name: 'Passport Photo', type: 'Identity', status: 'Missing', size: '—', uploaded: '—' },
  ]);
  const [docToDelete, setDocToDelete] = useState<number | null>(null);
  const [docToReplace, setDocToReplace] = useState<number | null>(null);
  const [docToPreview, setDocToPreview] = useState<Document | null>(null);

  // Account & Security
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [showTwoFaModal, setShowTwoFaModal] = useState(false);

  // Preferences
  const [prefs, setPrefs] = useState({
    language: 'English',
    theme: 'Light',
    emailNotif: true,
    smsNotif: false,
    timezone: 'Asia/Kolkata (IST, UTC+5:30)',
  });

  // Photo modals
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showDeletePhotoModal, setShowDeletePhotoModal] = useState(false);
  const [showViewPhotoModal, setShowViewPhotoModal] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const photoData = ev.target?.result as string;
      setProfilePhoto(photoData);
      localStorage.setItem('ferex_student_profile_photo', photoData);
      window.dispatchEvent(new Event('ferex_avatar_change'));
      setShowPhotoModal(false);
      showToast('Profile photo updated successfully!');
    };
    reader.readAsDataURL(file);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleDeletePhoto = () => {
    setProfilePhoto(null);
    localStorage.removeItem('ferex_student_profile_photo');
    window.dispatchEvent(new Event('ferex_avatar_change'));
    setShowDeletePhotoModal(false);
    showToast('Profile photo removed.');
  };

  const handleSavePersonal = (e: React.FormEvent) => {
    e.preventDefault();
    setPersonal({ ...tempPersonal });
    setEditingPersonal(false);
    showToast('Personal information saved successfully!');
  };

  const handleSaveEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    setEmergency({ ...tempEmergency });
    setEditingEmergency(false);
    showToast('Emergency contact updated successfully!');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (passwordForm.newPwd !== passwordForm.confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.newPwd.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    setPasswordForm({ current: '', newPwd: '', confirm: '' });
    setShowPasswordModal(false);
    showToast('Password updated securely!');
  };

  const handleDocReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || docToReplace === null) return;
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const size = `${(e.target.files[0].size / 1024 / 1024).toFixed(1)} MB`;
    setDocuments(prev => prev.map(d =>
      d.id === docToReplace ? { ...d, status: 'Pending', size, uploaded: now } : d
    ));
    setDocToReplace(null);
    if (docInputRef.current) docInputRef.current.value = '';
    showToast('Document replaced. Pending verification.');
  };

  const handleDocDelete = () => {
    if (docToDelete === null) return;
    setDocuments(prev => prev.map(d =>
      d.id === docToDelete ? { ...d, status: 'Missing', size: '—', uploaded: '—' } : d
    ));
    setDocToDelete(null);
    showToast('Document removed from records.');
  };

  // ── Config ─────────────────────────────────────────────────────────────────
  const TABS = [
    'Personal Information',
    'Education Details',
    'Documents',
    'Emergency Contact',
    'Account & Security',
    'Preferences',
  ];

  const appStatusColor: Record<string, string> = {
    'Offer Letter Received': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Under Review': 'bg-blue-50 text-blue-700 border-blue-100',
    'Pending Documents': 'bg-amber-50 text-amber-700 border-amber-100',
  };
  const visaStatusColor: Record<string, string> = {
    'Visa Processing': 'bg-violet-50 text-violet-700 border-violet-100',
    'Visa Approved': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Not Started': 'bg-slate-50 text-slate-600 border-slate-200',
  };

  // ── Initials ───────────────────────────────────────────────────────────────
  const initials = `${personal.firstName[0]}${personal.lastName[0]}`.toUpperCase();

  // ── Timeline for Education tab ─────────────────────────────────────────────
  const timeline = [
    { label: 'Application Submitted', date: 'Nov 15, 2025', done: true },
    { label: 'Documents Verified', date: 'Dec 3, 2025', done: true },
    { label: 'Offer Letter Issued', date: 'Jan 20, 2026', done: true },
    { label: 'Visa Application Filed', date: 'Feb 5, 2026', done: true },
    { label: 'Visa Decision', date: 'Pending', done: false },
    { label: 'Pre-Departure Briefing', date: 'Pending', done: false },
  ];

  const recentLogins = [
    { device: 'MacBook Pro', location: 'Kochi, India', time: 'Just now', icon: Monitor },
    { device: 'iPhone 15 Pro', location: 'Kochi, India', time: '2 hours ago', icon: Smartphone },
    { device: 'Chrome / Windows', location: 'Kochi, India', time: 'Yesterday 10:32 AM', icon: Globe },
  ];

  return (
    <div className="space-y-0 text-left relative min-h-screen">

      {/* ── Hidden Inputs ─────────────────────────────────────────────────── */}
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
      <input ref={docInputRef} type="file" className="hidden" onChange={handleDocReplace} />

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-[100] bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-3 border border-slate-800"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Profile Hero Header ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm mb-6 bg-white"
      >
        {/* Banner */}
        <div className="h-40 bg-gradient-to-br from-[#6A1B2E] via-[#7d2036] to-[#4A101E] relative overflow-hidden">
          {/* decorative circles */}
          <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-white/5" />
          <div className="absolute top-8 -right-4 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 left-32 w-24 h-24 rounded-full bg-white/5" />

          {/* Student ID chip */}
          <div className="absolute top-4 left-6 flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1.5">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white text-[11px] font-bold tracking-wide">FX-2026-001 · Active Student</span>
          </div>

          {/* Completion indicator */}
          <div className="absolute top-4 right-6 flex flex-col items-end gap-1">
            <span className="text-white/60 text-[10px] font-bold">Profile Completion</span>
            <div className="flex items-center gap-2">
              <div className="w-28 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
              </div>
              <span className="text-white text-xs font-extrabold">{completionPct}%</span>
            </div>
          </div>
        </div>

        {/* Profile row */}
        <div className="px-6 pb-6 -mt-14 relative z-10 flex flex-col sm:flex-row items-start sm:items-end gap-4">
          {/* Avatar */}
          <div className="relative shrink-0 group">
            <div className="w-[88px] h-[88px] rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-[#6A1B2E] flex items-center justify-center">
              {profilePhoto
                ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                : <span className="text-white font-extrabold text-3xl select-none">{initials}</span>
              }
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" />

            {/* hover overlay */}
            <button
              onClick={() => setShowPhotoModal(true)}
              className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Camera className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Info */}
          <div className="flex-1 space-y-1 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-slate-900">
                {personal.firstName} {personal.lastName}
              </h2>
              <span className="text-xl">🇮🇳</span>
            </div>
            <p className="text-sm font-semibold text-slate-500">{education.course} · {education.university}</p>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${appStatusColor[education.applicationStatus] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                <CheckCircle2 className="w-3 h-3" />
                {education.applicationStatus}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${visaStatusColor[education.visaStatus] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                <Globe className="w-3 h-3" />
                {education.visaStatus}
              </span>
              <span className="text-[10px] font-bold text-slate-400">Counselor: {education.counselor}</span>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2 shrink-0 pb-1">
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-bold h-9 flex items-center gap-1.5"
              onClick={() => setShowPhotoModal(true)}
            >
              <Camera className="w-4 h-4" />
              Photo
            </Button>
            <Button
              size="sm"
              className="text-xs font-bold h-9 flex items-center gap-1.5"
              onClick={() => {
                setActiveTab('Personal Information');
                setEditingPersonal(true);
                setTempPersonal({ ...personal });
              }}
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Tab Bar ───────────────────────────────────────────────────────── */}
      <div className="mb-6 bg-white border border-slate-100 rounded-xl p-1.5 shadow-sm flex items-center gap-1 overflow-x-auto scrollbar-hide select-none">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setEditingPersonal(false);
              setEditingEmergency(false);
            }}
            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap
              ${activeTab === tab
                ? 'bg-[#6A1B2E] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >

          {/* ══════ PERSONAL INFORMATION ══════════════════════════════════ */}
          {activeTab === 'Personal Information' && (
            <form onSubmit={handleSavePersonal}>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Personal Information</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage your identity and contact details</p>
                  </div>
                  {!editingPersonal ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold flex items-center gap-1.5"
                      onClick={() => { setEditingPersonal(true); setTempPersonal({ ...personal }); }}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" className="text-xs font-bold flex items-center gap-1.5" onClick={() => setEditingPersonal(false)}>
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" className="text-xs font-bold flex items-center gap-1.5">
                        <Save className="w-3.5 h-3.5" />
                        Save
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-8">
                  {/* Identity */}
                  <div>
                    <SectionLabel>Identity Details</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <FieldGroup label="First Name" value={editingPersonal ? tempPersonal.firstName : personal.firstName}
                        editing={editingPersonal} onChange={(v) => setTempPersonal(p => ({ ...p, firstName: v }))} />
                      <FieldGroup label="Last Name" value={editingPersonal ? tempPersonal.lastName : personal.lastName}
                        editing={editingPersonal} onChange={(v) => setTempPersonal(p => ({ ...p, lastName: v }))} />
                      <SelectGroup label="Gender" value={editingPersonal ? tempPersonal.gender : personal.gender}
                        editing={editingPersonal} options={['Female', 'Male', 'Non-binary', 'Prefer not to say']}
                        onChange={(v) => setTempPersonal(p => ({ ...p, gender: v }))} />
                      <FieldGroup label="Date of Birth" value={editingPersonal ? tempPersonal.dob : personal.dob}
                        editing={editingPersonal} type="date" onChange={(v) => setTempPersonal(p => ({ ...p, dob: v }))} />
                      <FieldGroup label="Nationality" value={editingPersonal ? tempPersonal.nationality : personal.nationality}
                        editing={editingPersonal} onChange={(v) => setTempPersonal(p => ({ ...p, nationality: v }))} />
                      <FieldGroup label="Passport Number" value={editingPersonal ? tempPersonal.passportNo : personal.passportNo}
                        editing={editingPersonal} onChange={(v) => setTempPersonal(p => ({ ...p, passportNo: v }))} />
                    </div>
                  </div>

                  <div className="border-t border-slate-50" />

                  {/* Contact */}
                  <div>
                    <SectionLabel>Contact Information</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldGroup label="Email Address" value={editingPersonal ? tempPersonal.email : personal.email}
                        editing={editingPersonal} type="email" onChange={(v) => setTempPersonal(p => ({ ...p, email: v }))} />
                      <FieldGroup label="Phone Number" value={editingPersonal ? tempPersonal.phone : personal.phone}
                        editing={editingPersonal} type="tel" onChange={(v) => setTempPersonal(p => ({ ...p, phone: v }))} />
                    </div>
                  </div>

                  <div className="border-t border-slate-50" />

                  {/* Address */}
                  <div>
                    <SectionLabel>Residential Address</SectionLabel>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="sm:col-span-2 lg:col-span-4">
                        <FieldGroup label="Street Address" value={editingPersonal ? tempPersonal.address : personal.address}
                          editing={editingPersonal} onChange={(v) => setTempPersonal(p => ({ ...p, address: v }))} />
                      </div>
                      <FieldGroup label="City" value={editingPersonal ? tempPersonal.city : personal.city}
                        editing={editingPersonal} onChange={(v) => setTempPersonal(p => ({ ...p, city: v }))} />
                      <FieldGroup label="Country" value={editingPersonal ? tempPersonal.country : personal.country}
                        editing={editingPersonal} onChange={(v) => setTempPersonal(p => ({ ...p, country: v }))} />
                      <FieldGroup label="Postal Code" value={editingPersonal ? tempPersonal.postalCode : personal.postalCode}
                        editing={editingPersonal} onChange={(v) => setTempPersonal(p => ({ ...p, postalCode: v }))} />
                    </div>
                  </div>
                </div>
              </Card>
            </form>
          )}

          {/* ══════ EDUCATION DETAILS ═════════════════════════════════════ */}
          {activeTab === 'Education Details' && (
            <div className="space-y-5">
              {/* Top info cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Country', value: education.studyCountry, icon: Globe, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Intake', value: education.intake, icon: Clock, color: 'text-violet-600 bg-violet-50' },
                  { label: 'Student Number', value: education.studentNumber, icon: User, color: 'text-amber-600 bg-amber-50' },
                  { label: 'Counselor', value: education.counselor, icon: Info, color: 'text-[#6A1B2E] bg-[#6A1B2E]/10' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <Card key={label} className="p-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color} mb-3`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{value}</p>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Program details */}
                <Card className="lg:col-span-2 p-6">
                  <SectionLabel>Program Details</SectionLabel>
                  <div className="space-y-3">
                    {[
                      { label: 'University', value: education.university, icon: GraduationCap },
                      { label: 'Course', value: education.course, icon: FileText },
                      { label: 'Campus', value: education.campus, icon: MapPin },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="flex items-center gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                        <div className="w-9 h-9 rounded-lg bg-[#6A1B2E]/10 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-[#6A1B2E]" />
                        </div>
                        <div>
                          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</p>
                          <p className="text-sm font-bold text-slate-900">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 pt-5 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Application Status</p>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${appStatusColor[education.applicationStatus] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {education.applicationStatus}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Visa Status</p>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${visaStatusColor[education.visaStatus] ?? 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        <Globe className="w-3.5 h-3.5" />
                        {education.visaStatus}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Timeline */}
                <Card className="p-6">
                  <SectionLabel>Application Timeline</SectionLabel>
                  <div className="space-y-0">
                    {timeline.map((step, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${step.done ? 'bg-emerald-100 border-2 border-emerald-500' : 'bg-slate-100 border-2 border-slate-300'}`}>
                            {step.done
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              : <span className="w-2 h-2 rounded-full bg-slate-400" />
                            }
                          </div>
                          {idx < timeline.length - 1 && (
                            <div className={`w-0.5 h-8 ${step.done ? 'bg-emerald-200' : 'bg-slate-100'}`} />
                          )}
                        </div>
                        <div className="pb-4">
                          <p className={`text-xs font-bold ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                          <p className="text-[10px] font-semibold text-slate-400">{step.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ══════ DOCUMENTS ═════════════════════════════════════════════ */}
          {activeTab === 'Documents' && (
            <div className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">My Documents</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">{documents.filter(d => d.status === 'Verified').length} of {documents.length} verified</p>
                  </div>
                  <Button
                    size="sm"
                    className="text-xs font-bold flex items-center gap-1.5"
                    onClick={() => { setDocToReplace(-1); docInputRef.current?.click(); }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Upload New
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="border border-slate-100 rounded-xl p-4 bg-slate-50/40 hover:border-slate-200 hover:bg-white transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#6A1B2E]/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[#6A1B2E]" />
                        </div>
                        <StatusBadge status={doc.status} />
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 mb-0.5">{doc.name}</h4>
                      <p className="text-[10px] font-semibold text-slate-400">{doc.type} · {doc.size}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Uploaded: {doc.uploaded}</p>

                      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => setDocToPreview(doc)}
                          className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-bold text-slate-600 bg-white border border-slate-200 hover:border-[#6A1B2E]/30 hover:text-[#6A1B2E] transition-all"
                        >
                          <Eye className="w-3 h-3" /> Preview
                        </button>
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = 'data:text/plain,Ferex Document Download Simulation';
                            a.download = `${doc.name.replace(/\s+/g, '_')}.pdf`;
                            a.click();
                          }}
                          className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-bold text-slate-600 bg-white border border-slate-200 hover:border-[#6A1B2E]/30 hover:text-[#6A1B2E] transition-all"
                        >
                          <Download className="w-3 h-3" /> Download
                        </button>
                        <button
                          onClick={() => { setDocToReplace(doc.id); docInputRef.current?.click(); }}
                          className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-bold text-slate-600 bg-white border border-slate-200 hover:border-amber-400/40 hover:text-amber-600 transition-all"
                        >
                          <RefreshCw className="w-3 h-3" /> Replace
                        </button>
                        <button
                          onClick={() => setDocToDelete(doc.id)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 bg-white border border-slate-200 hover:border-red-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ══════ EMERGENCY CONTACT ═════════════════════════════════════ */}
          {activeTab === 'Emergency Contact' && (
            <form onSubmit={handleSaveEmergency}>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Emergency Contact</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Person to contact in case of emergency</p>
                  </div>
                  {!editingEmergency ? (
                    <Button type="button" size="sm" variant="outline" className="text-xs font-bold flex items-center gap-1.5"
                      onClick={() => { setEditingEmergency(true); setTempEmergency({ ...emergency }); }}>
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" className="text-xs font-bold flex items-center gap-1.5" onClick={() => setEditingEmergency(false)}>
                        <X className="w-3.5 h-3.5" /> Cancel
                      </Button>
                      <Button type="submit" size="sm" className="text-xs font-bold flex items-center gap-1.5">
                        <Save className="w-3.5 h-3.5" /> Save
                      </Button>
                    </div>
                  )}
                </div>

                {/* Guardian card */}
                {!editingEmergency && (
                  <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl mb-6">
                    <div className="w-14 h-14 rounded-xl bg-[#6A1B2E] flex items-center justify-center">
                      <span className="text-white font-extrabold text-xl">{emergency.guardianName[0]}</span>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900">{emergency.guardianName}</h4>
                      <p className="text-xs font-bold text-slate-500">{emergency.relationship}</p>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">{emergency.phone}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-5">
                  <SectionLabel>Guardian Details</SectionLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldGroup label="Guardian Name" value={editingEmergency ? tempEmergency.guardianName : emergency.guardianName}
                      editing={editingEmergency} onChange={(v) => setTempEmergency(p => ({ ...p, guardianName: v }))} />
                    <SelectGroup label="Relationship" value={editingEmergency ? tempEmergency.relationship : emergency.relationship}
                      editing={editingEmergency} options={['Mother', 'Father', 'Sibling', 'Spouse', 'Guardian', 'Other']}
                      onChange={(v) => setTempEmergency(p => ({ ...p, relationship: v }))} />
                    <FieldGroup label="Phone Number" value={editingEmergency ? tempEmergency.phone : emergency.phone}
                      editing={editingEmergency} type="tel" onChange={(v) => setTempEmergency(p => ({ ...p, phone: v }))} />
                    <FieldGroup label="Email Address" value={editingEmergency ? tempEmergency.email : emergency.email}
                      editing={editingEmergency} type="email" onChange={(v) => setTempEmergency(p => ({ ...p, email: v }))} />
                    <div className="sm:col-span-2">
                      <FieldGroup label="Address" value={editingEmergency ? tempEmergency.address : emergency.address}
                        editing={editingEmergency} onChange={(v) => setTempEmergency(p => ({ ...p, address: v }))} />
                    </div>
                  </div>
                </div>
              </Card>
            </form>
          )}

          {/* ══════ ACCOUNT & SECURITY ════════════════════════════════════ */}
          {activeTab === 'Account & Security' && (
            <div className="space-y-5">
              {/* Account info + password */}
              <Card className="p-6">
                <h3 className="text-base font-extrabold text-slate-900 mb-5">Account & Security</h3>

                <div className="space-y-3">
                  {/* Email */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Mail className="w-4.5 h-4.5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">Email Address</p>
                        <p className="text-[11px] font-semibold text-slate-500">{personal.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">Verified</span>
                  </div>

                  {/* Password */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#6A1B2E]/10 flex items-center justify-center">
                        <Lock className="w-4.5 h-4.5 text-[#6A1B2E]" />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">Password</p>
                        <p className="text-[11px] font-semibold text-slate-500">Last changed 3 months ago</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs font-bold flex items-center gap-1.5" onClick={() => setShowPasswordModal(true)}>
                      <RefreshCw className="w-3.5 h-3.5" /> Change
                    </Button>
                  </div>

                  {/* 2FA */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${twoFaEnabled ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                        <Shield className={`w-4.5 h-4.5 ${twoFaEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">Two-Factor Authentication</p>
                        <p className="text-[11px] font-semibold text-slate-500">{twoFaEnabled ? 'Enabled — extra secure' : 'Disabled — click to enable'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {twoFaEnabled && (
                        <span className="text-[10px] font-extrabold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">Active</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowTwoFaModal(true)}
                        className="focus:outline-none"
                      >
                        {twoFaEnabled
                          ? <ToggleRight className="w-10 h-10 text-emerald-500" />
                          : <ToggleLeft className="w-10 h-10 text-slate-300" />}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Recent Login Activity */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Recent Login Activity</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-0.5">Devices and sessions for your account</p>
                  </div>
                  <span className="text-[10px] font-bold text-[#6A1B2E] bg-[#6A1B2E]/10 px-2.5 py-1 rounded-full">{recentLogins.length} Sessions</span>
                </div>
                <div className="space-y-3">
                  {recentLogins.map((log, idx) => {
                    const Icon = log.icon;
                    return (
                      <div key={idx} className="flex items-center gap-3 p-3.5 border border-slate-100 rounded-xl hover:border-slate-200 hover:bg-slate-50/50 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <Icon className="w-4.5 h-4.5 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-extrabold text-slate-900">{log.device}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <p className="text-[10px] font-semibold text-slate-400">{log.location} · {log.time}</p>
                          </div>
                        </div>
                        {idx === 0 && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 shrink-0">Current</span>
                        )}
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => showToast('Session terminated securely.')}
                            className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-red-500 hover:underline transition-opacity shrink-0"
                          >
                            Sign Out
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* ══════ PREFERENCES ════════════════════════════════════════════ */}
          {activeTab === 'Preferences' && (
            <Card className="p-6">
              <h3 className="text-base font-extrabold text-slate-900 mb-5">Preferences</h3>

              <div className="space-y-8 max-w-2xl">
                {/* Display preferences */}
                <div>
                  <SectionLabel>Display & Locale</SectionLabel>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SelectGroup label="Language" value={prefs.language} editing={true}
                      options={['English', 'Hindi', 'Malayalam', 'Polish', 'German', 'French']}
                      onChange={(v) => setPrefs(p => ({ ...p, language: v }))} />
                    <SelectGroup label="Theme" value={prefs.theme} editing={true}
                      options={['Light', 'Dark', 'System Default']}
                      onChange={(v) => setPrefs(p => ({ ...p, theme: v }))} />
                    <div className="sm:col-span-2">
                      <SelectGroup label="Timezone" value={prefs.timezone} editing={true}
                        options={[
                          'Asia/Kolkata (IST, UTC+5:30)',
                          'Europe/Warsaw (CET, UTC+1)',
                          'America/New_York (EST, UTC-5)',
                          'UTC',
                        ]}
                        onChange={(v) => setPrefs(p => ({ ...p, timezone: v }))} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-50" />

                {/* Notifications */}
                <div>
                  <SectionLabel>Notification Preferences</SectionLabel>
                  <div className="space-y-3">
                    {[
                      {
                        label: 'Email Notifications',
                        desc: 'Receive updates, reminders and alerts via email',
                        value: prefs.emailNotif,
                        icon: Mail,
                        toggle: () => setPrefs(p => ({ ...p, emailNotif: !p.emailNotif })),
                      },
                      {
                        label: 'SMS Notifications',
                        desc: 'Receive urgent alerts and deadline reminders via SMS',
                        value: prefs.smsNotif,
                        icon: Phone,
                        toggle: () => setPrefs(p => ({ ...p, smsNotif: !p.smsNotif })),
                      },
                    ].map(({ label, desc, value, icon: Icon, toggle }) => (
                      <div key={label} className="flex items-center justify-between gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-slate-500" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900">{label}</h4>
                            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{desc}</p>
                          </div>
                        </div>
                        <Toggle checked={value} onChange={toggle} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button className="text-xs font-bold flex items-center gap-2" onClick={() => showToast('Preferences saved successfully!')}>
                    <Save className="w-4 h-4" />
                    Save Preferences
                  </Button>
                </div>
              </div>
            </Card>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════════ */}

      {/* ── Photo Action Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showPhotoModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowPhotoModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900">Profile Photo</h3>
                <button onClick={() => setShowPhotoModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview */}
              <div className="p-5 flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-2xl border-4 border-slate-100 shadow overflow-hidden bg-[#6A1B2E] flex items-center justify-center">
                  {profilePhoto
                    ? <img src={profilePhoto} alt="Preview" className="w-full h-full object-cover" />
                    : <span className="text-white font-extrabold text-3xl">{initials}</span>}
                </div>
              </div>

              <div className="px-5 pb-5 space-y-2">
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-[#6A1B2E]/30 hover:bg-[#6A1B2E]/5 text-sm font-bold text-slate-700 hover:text-[#6A1B2E] transition-all"
                >
                  <Upload className="w-4 h-4" />
                  {profilePhoto ? 'Replace Photo' : 'Upload Photo'}
                </button>
                {profilePhoto && (
                  <>
                    <button
                      onClick={() => { setShowPhotoModal(false); setShowViewPhotoModal(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-sm font-bold text-slate-700 hover:text-blue-700 transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      View Full Photo
                    </button>
                    <button
                      onClick={() => { setShowPhotoModal(false); setShowDeletePhotoModal(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-100 hover:bg-red-50 text-sm font-bold text-red-600 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove Photo
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── View Photo Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showViewPhotoModal && profilePhoto && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-50" onClick={() => setShowViewPhotoModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 rounded-2xl overflow-hidden shadow-2xl">
              <img src={profilePhoto} alt="Full profile" className="max-w-sm max-h-[70vh] object-contain rounded-2xl" />
              <button onClick={() => setShowViewPhotoModal(false)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete Photo Confirmation ───────────────────────────────────── */}
      <AnimatePresence>
        {showDeletePhotoModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowDeletePhotoModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 mb-1">Remove Profile Photo?</h3>
                  <p className="text-xs font-semibold text-slate-500">Your photo will be removed and your initials will be shown instead. This action can be undone by uploading a new photo.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <Button variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowDeletePhotoModal(false)}>Cancel</Button>
                <Button size="sm" className="flex-1 text-xs font-bold bg-red-600 hover:bg-red-700" onClick={handleDeletePhoto}>Remove</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Change Password Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showPasswordModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowPasswordModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#6A1B2E]/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-[#6A1B2E]" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">Change Password</h3>
                </div>
                <button onClick={() => { setShowPasswordModal(false); setPasswordError(''); }}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                {(['current', 'newPwd', 'confirm'] as const).map((field, idx) => (
                  <div key={field}>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                      {idx === 0 ? 'Current Password' : idx === 1 ? 'New Password' : 'Confirm New Password'}
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordForm[field]}
                      onChange={(e) => setPasswordForm(p => ({ ...p, [field]: e.target.value }))}
                      className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]/50 focus:ring-4 focus:ring-[#6A1B2E]/5 transition-all"
                    />
                  </div>
                ))}

                {passwordError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs font-bold text-red-600">{passwordError}</p>
                  </div>
                )}

                <div className="pt-2">
                  <Button type="submit" className="w-full text-sm font-bold">
                    Update Password
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── 2FA Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showTwoFaModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowTwoFaModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {twoFaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </h3>
                </div>
                <button onClick={() => setShowTwoFaModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-5">
                {twoFaEnabled
                  ? 'Disabling two-factor authentication will reduce the security of your account. Are you sure?'
                  : 'Two-factor authentication adds an extra layer of security. An OTP will be sent to your phone each time you log in.'}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowTwoFaModal(false)}>Cancel</Button>
                <Button size="sm" className={`flex-1 text-xs font-bold ${twoFaEnabled ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  onClick={() => {
                    setTwoFaEnabled(!twoFaEnabled);
                    setShowTwoFaModal(false);
                    showToast(twoFaEnabled ? '2FA disabled for this account.' : '2FA enabled! Your account is more secure.');
                  }}>
                  {twoFaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Document Preview Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {docToPreview && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setDocToPreview(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900">{docToPreview.name}</h3>
                <button onClick={() => setDocToPreview(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 flex flex-col items-center gap-4">
                <div className="w-full h-40 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-3">
                  <FileText className="w-12 h-12 text-[#6A1B2E]/30" />
                  <p className="text-xs font-bold text-slate-400">Preview Simulation</p>
                </div>
                <div className="w-full space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between"><span className="text-slate-400">Document</span><span>{docToPreview.name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Type</span><span>{docToPreview.type}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Size</span><span>{docToPreview.size}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Uploaded</span><span>{docToPreview.uploaded}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Status</span><StatusBadge status={docToPreview.status} /></div>
                </div>
              </div>
              <div className="px-5 pb-5">
                <Button className="w-full text-xs font-bold flex items-center gap-2"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = 'data:text/plain,Ferex Document Download Simulation';
                    a.download = `${docToPreview.name.replace(/\s+/g, '_')}.pdf`;
                    a.click();
                    setDocToPreview(null);
                  }}>
                  <Download className="w-4 h-4" /> Download Document
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Document Delete Confirmation ────────────────────────────────── */}
      <AnimatePresence>
        {docToDelete !== null && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setDocToDelete(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 mb-1">Remove Document?</h3>
                  <p className="text-xs font-semibold text-slate-500">This document will be marked as missing. You can replace it by uploading a new one.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setDocToDelete(null)}>Cancel</Button>
                <Button size="sm" className="flex-1 text-xs font-bold bg-red-600 hover:bg-red-700" onClick={handleDocDelete}>Remove</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
