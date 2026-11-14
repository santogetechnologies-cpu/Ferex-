import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit3, Save, X, CheckCircle2, Camera, Eye, Trash2, Upload,
  Shield, Lock, Mail, Phone, MapPin,
  User, GraduationCap, AlertTriangle, FileText,
  Calendar, Globe, ArrowRight, MessageSquare, ExternalLink,
  KeyRound, ShieldCheck
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ToastNotification } from '../components/ToastNotification';
import { useAuth } from '../contexts/AuthContext';
import { useActiveStudentScope } from '../hooks/useActiveStudentScope';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useDocuments } from '../hooks/useDocuments';
import { useApplications } from '../hooks/useApplications';

// ─── Interfaces ──────────────────────────────────────────────────────────────
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

interface EmergencyInfo {
  guardianName: string;
  relationship: string;
  phone: string;
  email: string;
  address: string;
}

export const MyProfile: React.FC<{ defaultTab?: string }> = ({ defaultTab }) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { activeStudentId, activeStudentEmail, activeStudentName, isImpersonating, impersonatedStudent } = useActiveStudentScope();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { documents: dbDocs } = useDocuments(activeStudentId);
  const { applications } = useApplications(activeStudentId);

  // ── States ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(defaultTab || 'Personal Information');
  const [toast, setToast] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Avatar Photo
  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => {
    const key = activeStudentId ? `ferex_student_profile_photo_${activeStudentId}` : 'ferex_student_profile_photo';
    return localStorage.getItem(key) || profile?.avatar_url || null;
  });
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Personal Info State
  const fullNameParts = (activeStudentName || '').split(' ');
  const defaultFirstName = fullNameParts[0] || activeStudentEmail?.split('@')[0] || 'Student';
  const defaultLastName = fullNameParts.slice(1).join(' ') || '';

  const [personal, setPersonal] = useState<PersonalInfo>({
    firstName: defaultFirstName,
    lastName: defaultLastName,
    gender: (impersonatedStudent as any)?.gender || (profile as any)?.gender || 'Not Specified',
    dob: (impersonatedStudent as any)?.dob || (profile as any)?.dob || '2001-01-01',
    nationality: (impersonatedStudent as any)?.nationality || (profile as any)?.nationality || 'Indian',
    passportNo: (impersonatedStudent as any)?.passport_no || (profile as any)?.passport_no || '',
    phone: (impersonatedStudent as any)?.phone || (profile as any)?.phone || '',
    email: activeStudentEmail || profile?.email || '',
    address: (impersonatedStudent as any)?.address || (profile as any)?.address || '',
    city: (impersonatedStudent as any)?.city || (profile as any)?.city || '',
    country: (impersonatedStudent as any)?.country || (profile as any)?.country || 'India',
    postalCode: (impersonatedStudent as any)?.postal_code || (profile as any)?.postal_code || '',
  });

  const [editingPersonal, setEditingPersonal] = useState(false);
  const [tempPersonal, setTempPersonal] = useState<PersonalInfo>({ ...personal });

  // Emergency Contact State
  const [emergency, setEmergency] = useState<EmergencyInfo>(() => {
    const saved = activeStudentId ? localStorage.getItem(`ferex_student_emergency_${activeStudentId}`) : null;
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      guardianName: (impersonatedStudent as any)?.guardian_name || (profile as any)?.guardian_name || '',
      relationship: (impersonatedStudent as any)?.guardian_relationship || (profile as any)?.guardian_relationship || 'Parent / Guardian',
      phone: (impersonatedStudent as any)?.guardian_phone || (profile as any)?.guardian_phone || '',
      email: (impersonatedStudent as any)?.guardian_email || (profile as any)?.guardian_email || '',
      address: (impersonatedStudent as any)?.guardian_address || (profile as any)?.guardian_address || '',
    };
  });
  const [editingEmergency, setEditingEmergency] = useState(false);
  const [tempEmergency, setTempEmergency] = useState<EmergencyInfo>({ ...emergency });

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({ newPwd: '', confirmPwd: '' });
  const [passwordMsg, setPasswordMsg] = useState({ text: '', isError: false });
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  // ── Sync Profile from Database ──────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      const activeId = activeStudentId;
      const activeEmail = activeStudentEmail;
      if (!activeId && !activeEmail) return;

      try {
        let query = supabase.from('users').select('*');
        if (activeId) query = query.eq('id', activeId);
        else if (activeEmail) query = query.ilike('email', activeEmail);

        const { data: dbUser } = await query.maybeSingle();
        const active = dbUser || profile;

        if (active) {
          const names = (active.full_name || '').split(' ');
          const fName = names[0] || active.email?.split('@')[0] || 'Student';
          const lName = names.slice(1).join(' ') || '';

          const pInfo: PersonalInfo = {
            firstName: fName,
            lastName: lName,
            email: active.email || user?.email || '',
            phone: active.phone || active.mobile_number || (profile as any)?.phone || '',
            passportNo: active.passport_no || (profile as any)?.passport_no || '',
            address: active.address || (profile as any)?.address || '',
            city: active.city || (profile as any)?.city || '',
            country: active.country || (profile as any)?.country || 'India',
            gender: active.gender || 'Not Specified',
            dob: active.dob || '2001-01-01',
            nationality: active.nationality || 'Indian',
            postalCode: active.postal_code || '',
          };
          setPersonal(pInfo);
          setTempPersonal(pInfo);

          if (active.emergency_contact && typeof active.emergency_contact === 'object') {
            setEmergency(active.emergency_contact);
            setTempEmergency(active.emergency_contact);
          }
        }
      } catch (err) {
        console.warn('[MyProfile] Sync error:', err);
      }
    };

    fetchProfile();
    window.addEventListener('ferex_auth_change', fetchProfile);
    return () => window.removeEventListener('ferex_auth_change', fetchProfile);
  }, [user, profile]);

  // Derived Active Education Application
  const activeApp = applications?.[0];
  const targetCountry = activeApp?.universities?.country || (activeApp as any)?.country || (profile as any)?.target_country || 'Not Set';
  const targetUniversity = activeApp?.universities?.name || activeApp?.university_name || (profile as any)?.target_university || 'Pending Selection';
  const targetProgram = (activeApp as any)?.program_name || (activeApp as any)?.program || (activeApp as any)?.course || (profile as any)?.desired_program || 'Higher Studies';
  const targetIntake = activeApp?.intake || 'Upcoming Intake';
  const appStatus = activeApp?.status || 'In Progress';
  const counselor = (profile as any)?.assigned_counselor || (profile as any)?.counselor_name || 'Assigned Admissions Desk';

  // ── Dynamic Profile Completeness ───────────────────────────────────────────
  const calculateCompleteness = () => {
    let score = 0;
    if (personal.firstName && personal.lastName) score += 20;
    if (personal.phone) score += 15;
    if (personal.passportNo) score += 15;
    if (personal.address && personal.city) score += 15;
    if (emergency.guardianName && emergency.phone) score += 15;
    if (dbDocs && dbDocs.length > 0) score += 20;
    return Math.min(score, 100);
  };

  const completeness = calculateCompleteness();

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // ── Save Personal Info ─────────────────────────────────────────────────────
  const handleSavePersonal = async () => {
    setIsSaving(true);
    try {
      const activeId = activeStudentId;
      const fullName = `${tempPersonal.firstName.trim()} ${tempPersonal.lastName.trim()}`.trim();

      if (activeId) {
        await supabase.from('users').update({
          full_name: fullName,
          phone: tempPersonal.phone.trim(),
          passport_no: tempPersonal.passportNo.trim(),
          address: tempPersonal.address.trim(),
          city: tempPersonal.city.trim(),
          country: tempPersonal.country.trim(),
          postal_code: tempPersonal.postalCode.trim(),
          gender: tempPersonal.gender,
          dob: tempPersonal.dob,
          nationality: tempPersonal.nationality.trim(),
          updated_at: new Date().toISOString()
        }).eq('id', activeId);
      }

      setPersonal({ ...tempPersonal });
      setEditingPersonal(false);
      showToastMsg('Personal profile saved successfully!');
      window.dispatchEvent(new Event('ferex_auth_change'));
    } catch (e: any) {
      showToastMsg(`Failed to save: ${e?.message || 'Error occurred'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save Emergency Info ────────────────────────────────────────────────────
  const handleSaveEmergency = async () => {
    setEmergency({ ...tempEmergency });
    setEditingEmergency(false);
    if (activeStudentId) {
      localStorage.setItem(`ferex_student_emergency_${activeStudentId}`, JSON.stringify(tempEmergency));
      try {
        await supabase.from('users').update({
          emergency_contact: tempEmergency,
          updated_at: new Date().toISOString()
        }).eq('id', activeStudentId);
      } catch (err) {}
    }
    showToastMsg('Emergency contact details saved!');
  };

  // ── Avatar Photo Handler ───────────────────────────────────────────────────
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToastMsg('Image must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setProfilePhoto(dataUrl);
      const activeId = activeStudentId;
      if (activeId) {
        localStorage.setItem(`ferex_student_profile_photo_${activeId}`, dataUrl);
      }
      setShowPhotoModal(false);
      showToastMsg('Profile photo updated!');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    const activeId = activeStudentId;
    if (activeId) {
      localStorage.removeItem(`ferex_student_profile_photo_${activeId}`);
    }
    setShowPhotoModal(false);
    showToastMsg('Profile photo removed.');
  };

  // ── Password Update Handler ────────────────────────────────────────────────
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isImpersonating) {
      setPasswordMsg({
        text: 'Password changes are disabled while impersonating a student to protect your administrator session credentials. To reset student credentials, use the Admissions Counselor or Admin CRM desk.',
        isError: true
      });
      return;
    }

    if (!passwordForm.newPwd || passwordForm.newPwd.length < 6) {
      setPasswordMsg({ text: 'Password must be at least 6 characters long.', isError: true });
      return;
    }
    if (passwordForm.newPwd !== passwordForm.confirmPwd) {
      setPasswordMsg({ text: 'Passwords do not match.', isError: true });
      return;
    }

    setIsUpdatingPwd(true);
    setPasswordMsg({ text: '', isError: false });

    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPwd });
      if (error) throw error;
      setPasswordForm({ newPwd: '', confirmPwd: '' });
      setPasswordMsg({ text: 'Password successfully updated!', isError: false });
      showToastMsg('Password changed successfully.');
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Failed to update password.', isError: true });
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  const initials = `${personal.firstName[0] || 'S'}${personal.lastName[0] || ''}`.toUpperCase();

  const TABS = [
    'Personal Information',
    'Education & Roadmap',
    'Emergency Contact',
    'Uploaded Documents',
    'Account & Security',
  ];

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto pb-12">
      {/* Toast */}
      {toast && <ToastNotification message={toast} onClose={() => setToast('')} />}

      {/* ── Executive Hero Card ─────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden relative">
        {/* Banner */}
        <div className="h-32 md:h-40 bg-linear-to-r from-[#58051E] via-[#7a0d2e] to-slate-900 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute right-6 top-6 flex items-center gap-2">
            <span className="px-3 py-1 bg-white/15 backdrop-blur-md text-white rounded-full text-[11px] font-bold tracking-wide border border-white/20">
              Student ID: STU-{activeStudentId?.slice(0, 6).toUpperCase() || '1001'}
            </span>
          </div>
        </div>

        {/* Profile Content Bar */}
        <div className="px-6 md:px-8 pb-6 pt-0 relative flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-14">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="w-26 h-26 rounded-2xl bg-white p-1.5 shadow-md border border-slate-100">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-linear-to-br from-[#58051E] to-[#800a2d] text-white flex items-center justify-center text-2xl font-black shadow-inner">
                    {initials}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowPhotoModal(true)}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm flex items-center justify-center hover:bg-slate-50 cursor-pointer transition-all hover:scale-105"
                title="Change Photo"
              >
                <Camera className="w-4 h-4 text-[#58051E]" />
              </button>
            </div>

            {/* Profile Identity Details */}
            <div className="text-center sm:text-left space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                  {personal.firstName} {personal.lastName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active Student
                </span>
              </div>
              <p className="text-xs md:text-sm font-semibold text-slate-500 flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {personal.email}</span>
                {personal.phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {personal.phone}</span>
                )}
                <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-slate-400" /> {targetCountry !== 'Not Set' ? targetCountry : 'Global Admission'}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center justify-center sm:justify-end gap-3 shrink-0">
            {/* Completeness Meter */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 px-4 min-w-[170px] text-left">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                <span>Profile Completion</span>
                <span className="font-extrabold text-[#58051E]">{completeness}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linear-to-r from-[#58051E] to-rose-600 rounded-full transition-all duration-500"
                  style={{ width: `${completeness}%` }}
                />
              </div>
            </div>

            <Button
              size="sm"
              className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold h-10 px-4 rounded-xl flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
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
      </div>

      {/* ── Modern Navigation Tabs ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-1.5 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-hide select-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setEditingPersonal(false);
                setEditingEmergency(false);
              }}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap flex items-center gap-2
                ${isActive
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
            >
              {tab === 'Personal Information' && <User className="w-3.5 h-3.5" />}
              {tab === 'Education & Roadmap' && <GraduationCap className="w-3.5 h-3.5" />}
              {tab === 'Emergency Contact' && <Phone className="w-3.5 h-3.5" />}
              {tab === 'Uploaded Documents' && <FileText className="w-3.5 h-3.5" />}
              {tab === 'Account & Security' && <Shield className="w-3.5 h-3.5" />}
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content Panels ────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* TAB 1: Personal Information */}
        {activeTab === 'Personal Information' && (
          <Card className="p-6 md:p-8 bg-white border border-slate-200/80 rounded-3xl shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
              <div>
                <h3 className="text-base font-black text-slate-900">Personal & Identity Details</h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Your official verified details used for university files and visa filing.</p>
              </div>
              <div>
                {editingPersonal ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold h-9 px-3.5 rounded-xl"
                      onClick={() => setEditingPersonal(false)}
                      disabled={isSaving}
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-xs"
                      onClick={handleSavePersonal}
                      disabled={isSaving}
                    >
                      <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs font-bold h-9 px-3.5 rounded-xl flex items-center gap-1.5"
                    onClick={() => {
                      setEditingPersonal(true);
                      setTempPersonal({ ...personal });
                    }}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#58051E]" /> Edit
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">First Name</label>
                {editingPersonal ? (
                  <input
                    type="text"
                    value={tempPersonal.firstName}
                    onChange={(e) => setTempPersonal({ ...tempPersonal, firstName: e.target.value })}
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center">
                    {personal.firstName || '—'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Last Name</label>
                {editingPersonal ? (
                  <input
                    type="text"
                    value={tempPersonal.lastName}
                    onChange={(e) => setTempPersonal({ ...tempPersonal, lastName: e.target.value })}
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center">
                    {personal.lastName || '—'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 flex items-center justify-between">
                  <span>{personal.email}</span>
                  <span className="text-[10px] font-extrabold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">Primary</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Phone / WhatsApp</label>
                {editingPersonal ? (
                  <input
                    type="text"
                    value={tempPersonal.phone}
                    onChange={(e) => setTempPersonal({ ...tempPersonal, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center">
                    {personal.phone || <span className="text-slate-400 font-normal italic">Not provided</span>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Passport Number</label>
                {editingPersonal ? (
                  <input
                    type="text"
                    value={tempPersonal.passportNo}
                    onChange={(e) => setTempPersonal({ ...tempPersonal, passportNo: e.target.value.toUpperCase() })}
                    placeholder="e.g. Z1234567"
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 uppercase focus:outline-none focus:border-[#58051E]"
                  />
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center font-mono">
                    {personal.passportNo || <span className="text-slate-400 font-sans font-normal italic">Not provided</span>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Nationality</label>
                {editingPersonal ? (
                  <input
                    type="text"
                    value={tempPersonal.nationality}
                    onChange={(e) => setTempPersonal({ ...tempPersonal, nationality: e.target.value })}
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center">
                    {personal.nationality}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Date of Birth</label>
                {editingPersonal ? (
                  <input
                    type="date"
                    value={tempPersonal.dob}
                    onChange={(e) => setTempPersonal({ ...tempPersonal, dob: e.target.value })}
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center">
                    {personal.dob}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Gender</label>
                {editingPersonal ? (
                  <select
                    value={tempPersonal.gender}
                    onChange={(e) => setTempPersonal({ ...tempPersonal, gender: e.target.value })}
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Not Specified">Not Specified</option>
                  </select>
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center">
                    {personal.gender}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">City / Town</label>
                {editingPersonal ? (
                  <input
                    type="text"
                    value={tempPersonal.city}
                    onChange={(e) => setTempPersonal({ ...tempPersonal, city: e.target.value })}
                    placeholder="e.g. Kochi"
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center">
                    {personal.city || '—'}
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Residential Street Address</label>
                {editingPersonal ? (
                  <input
                    type="text"
                    value={tempPersonal.address}
                    onChange={(e) => setTempPersonal({ ...tempPersonal, address: e.target.value })}
                    placeholder="House / Apartment name, Street"
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center">
                    {personal.address || <span className="text-slate-400 font-normal italic">Not provided</span>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Postal Code</label>
                {editingPersonal ? (
                  <input
                    type="text"
                    value={tempPersonal.postalCode}
                    onChange={(e) => setTempPersonal({ ...tempPersonal, postalCode: e.target.value })}
                    placeholder="682001"
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center">
                    {personal.postalCode || '—'}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* TAB 2: Education & Target Roadmap */}
        {activeTab === 'Education & Roadmap' && (
          <div className="space-y-6">
            <Card className="p-6 md:p-8 bg-white border border-slate-200/80 rounded-3xl shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
                <div>
                  <h3 className="text-base font-black text-slate-900">Academic Destination & Enrolled Program</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Your chosen university, admission track, and intake status.</p>
                </div>
                <Button
                  size="sm"
                  className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold h-9 px-3.5 rounded-xl flex items-center gap-1.5"
                  onClick={() => navigate('/student/select-university')}
                >
                  <GraduationCap className="w-3.5 h-3.5" /> Explore Universities
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                  <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Target Country</span>
                  <p className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-[#58051E]" />
                    {targetCountry}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                  <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Selected University</span>
                  <p className="text-base font-black text-slate-900 mt-1 truncate" title={targetUniversity}>
                    {targetUniversity}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                  <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Course / Degree Program</span>
                  <p className="text-base font-bold text-slate-800 mt-1 truncate" title={targetProgram}>
                    {targetProgram}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                  <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Intake Term</span>
                  <p className="text-base font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    {targetIntake}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                  <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Application Status</span>
                  <div className="mt-1.5">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> {appStatus}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
                  <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider">Admissions Counselor</span>
                  <p className="text-sm font-black text-slate-800 mt-1 flex items-center justify-between">
                    <span>{counselor}</span>
                    <button
                      onClick={() => navigate('/student/chat')}
                      className="text-[10px] font-bold text-[#58051E] hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3 h-3" /> Chat
                    </button>
                  </p>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-bold h-9 px-4 rounded-xl flex items-center gap-1.5"
                  onClick={() => navigate('/student/journey-tracker')}
                >
                  <ArrowRight className="w-3.5 h-3.5" /> View Admission Roadmap
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-bold h-9 px-4 rounded-xl flex items-center gap-1.5"
                  onClick={() => navigate('/student/offers')}
                >
                  <FileText className="w-3.5 h-3.5" /> My Offer Letters
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: Emergency & Guardian Contact */}
        {activeTab === 'Emergency Contact' && (
          <Card className="p-6 md:p-8 bg-white border border-slate-200/80 rounded-3xl shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
              <div>
                <h3 className="text-base font-black text-slate-900">Emergency & Guardian Contacts</h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Primary contact person in case of urgent admission, travel, or medical communication.</p>
              </div>
              <div>
                {editingEmergency ? (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold h-9 px-3.5 rounded-xl"
                      onClick={() => setEditingEmergency(false)}
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-4 rounded-xl flex items-center gap-1.5 shadow-xs"
                      onClick={handleSaveEmergency}
                    >
                      <Save className="w-3.5 h-3.5" /> Save Contact
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs font-bold h-9 px-3.5 rounded-xl flex items-center gap-1.5"
                    onClick={() => {
                      setEditingEmergency(true);
                      setTempEmergency({ ...emergency });
                    }}
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#58051E]" /> Edit
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Guardian / Parent Full Name</label>
                {editingEmergency ? (
                  <input
                    type="text"
                    value={tempEmergency.guardianName}
                    onChange={(e) => setTempEmergency({ ...tempEmergency, guardianName: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center">
                    {emergency.guardianName || <span className="text-slate-400 font-normal italic">Not provided</span>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Relationship</label>
                {editingEmergency ? (
                  <select
                    value={tempEmergency.relationship}
                    onChange={(e) => setTempEmergency({ ...tempEmergency, relationship: e.target.value })}
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Parent / Guardian">Parent / Guardian</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                  </select>
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center">
                    {emergency.relationship}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Emergency Phone</label>
                {editingEmergency ? (
                  <input
                    type="text"
                    value={tempEmergency.phone}
                    onChange={(e) => setTempEmergency({ ...tempEmergency, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center">
                    {emergency.phone || <span className="text-slate-400 font-normal italic">Not provided</span>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Emergency Email</label>
                {editingEmergency ? (
                  <input
                    type="email"
                    value={tempEmergency.email}
                    onChange={(e) => setTempEmergency({ ...tempEmergency, email: e.target.value })}
                    placeholder="guardian@example.com"
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center">
                    {emergency.email || <span className="text-slate-400 font-normal italic">Not provided</span>}
                  </div>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Residential Address</label>
                {editingEmergency ? (
                  <input
                    type="text"
                    value={tempEmergency.address}
                    onChange={(e) => setTempEmergency({ ...tempEmergency, address: e.target.value })}
                    placeholder="Permanent family address"
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                ) : (
                  <div className="h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-800 flex items-center">
                    {emergency.address || <span className="text-slate-400 font-normal italic">Not provided</span>}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* TAB 4: Uploaded Documents */}
        {activeTab === 'Uploaded Documents' && (
          <Card className="p-6 md:p-8 bg-white border border-slate-200/80 rounded-3xl shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
              <div>
                <h3 className="text-base font-black text-slate-900">Academic & KYC Documents</h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Documents uploaded for university review and consular visa validation.</p>
              </div>
              <Button
                size="sm"
                className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold h-9 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                onClick={() => navigate('/student/documents')}
              >
                <Upload className="w-3.5 h-3.5" /> Upload Document
              </Button>
            </div>

            {dbDocs && dbDocs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dbDocs.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-[#58051E] flex items-center justify-center shrink-0 shadow-xs">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate" title={doc.file_name || doc.doc_type}>
                          {doc.file_name || doc.doc_type || 'Document File'}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                          {doc.doc_type || 'Academic File'} • {doc.file_size || 'PDF'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                        doc.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : doc.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {doc.status || 'Under Review'}
                      </span>
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors"
                          title="View Document"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No documents uploaded yet</p>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">Upload your 10th, 12th, degree marksheets, and passport to start applications.</p>
                <Button
                  size="sm"
                  className="mt-4 bg-[#58051E] text-white text-xs font-bold"
                  onClick={() => navigate('/student/documents')}
                >
                  Go to Documents Page
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* TAB 5: Account & Security */}
        {activeTab === 'Account & Security' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Change Password Card */}
            <Card className="p-6 md:p-8 bg-white border border-slate-200/80 rounded-3xl shadow-xs">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Change Account Password</h3>
                  <p className="text-xs font-semibold text-slate-500">Update your student authentication password.</p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">New Password</label>
                  <input
                    type="password"
                    value={passwordForm.newPwd}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPwd: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPwd}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPwd: e.target.value })}
                    placeholder="Repeat new password"
                    className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                {passwordMsg.text && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${passwordMsg.isError ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {passwordMsg.text}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isUpdatingPwd}
                  className="w-full bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold h-10 rounded-xl mt-2 cursor-pointer shadow-xs"
                >
                  {isUpdatingPwd ? 'Updating Password...' : 'Update Password'}
                </Button>
              </form>
            </Card>

            {/* Session & Security Details */}
            <Card className="p-6 md:p-8 bg-white border border-slate-200/80 rounded-3xl shadow-xs">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Account Security Overview</h3>
                  <p className="text-xs font-semibold text-slate-500">Authentication state and security safeguards.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-extrabold text-slate-400 uppercase">Registered Email</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{user?.email || 'Student Account'}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">Verified</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10.5px] font-extrabold text-slate-400 uppercase">Security Role</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">Enrolled Student</p>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-extrabold rounded-md">Active</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10.5px] font-extrabold text-slate-400 uppercase">Protection Recommendations</span>
                  <ul className="text-xs font-medium text-slate-600 space-y-1.5 mt-2">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Never share admission portal credentials with unverified agents.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Always ensure tuition fee payments are made to official university accounts.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── Photo Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPhotoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-sm font-black text-slate-900">Profile Photo</h4>
                <button onClick={() => setShowPhotoModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex justify-center py-2">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Current" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#58051E] text-white flex items-center justify-center text-xl font-black">
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />

              <div className="space-y-2 pt-2">
                <Button
                  className="w-full bg-[#58051E] text-white text-xs font-bold h-9.5 rounded-xl cursor-pointer"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload New Photo
                </Button>
                {profilePhoto && (
                  <Button
                    variant="outline"
                    className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 text-xs font-bold h-9.5 rounded-xl cursor-pointer"
                    onClick={handleRemovePhoto}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove Current Photo
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
