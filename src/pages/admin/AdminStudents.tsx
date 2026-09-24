import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, Edit3, Trash2, X, Save, CheckCircle2, UserPlus, ChevronLeft, ChevronRight, UserCheck, Headphones, Globe, Sparkles, Check, GraduationCap, ShieldCheck } from 'lucide-react';
import { useStudents } from '../../hooks/useStudents';
import { useApplications } from '../../hooks/useApplications';
import { useDocuments } from '../../hooks/useDocuments';
import { getStaffMembers, createStaffMember, DEFAULT_COUNSELOR_ROSTER, assignCounselorToStudent, getDefaultCounselorForCountry } from '../../lib/api/students';
import { getAllDocumentRequirements, calculateDossierStatus, type DocumentRequirement } from '../../lib/api/documentRequirements';
import type { UserProfile } from '../../lib/types';
import { ToastNotification } from '../../components/ToastNotification';

interface StudentItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  originCountry: string;
  targetCountry: string;
  targetFlag: string;
  workflowAuthority: string;
  university: string;
  course: string;
  intake: string;
  status: string;
  statusColor: string;
  counselor: string;
  counselorEmail?: string;
  joined: string;
  appStatus: string;
}

const COUNTRY_FLAGS: Record<string, { flag: string; authority: string }> = {
  'Poland': { flag: 'PL', authority: 'Document Legalization' },
  'Germany': { flag: 'DE', authority: 'APS Certificate' },
  'United Kingdom': { flag: 'UK', authority: 'CAS / UKVI' },
  'UK': { flag: 'UK', authority: 'CAS / UKVI' },
  'France': { flag: 'FR', authority: 'Campus France EEF' },
  'Italy': { flag: 'IT', authority: 'CIMEA / Universitaly' },
  'United States': { flag: 'US', authority: 'I-20 / SEVIS' },
  'USA': { flag: 'US', authority: 'I-20 / SEVIS' },
  'Canada': { flag: 'CA', authority: 'PAL / SDS' },
  'Hungary': { flag: 'HU', authority: 'EU Direct' },
};

interface AdminStudentsProps {
  isStaff?: boolean;
}

export const AdminStudents: React.FC<AdminStudentsProps> = ({ isStaff = false }) => {
  const { students: dbStudents, removeStudent, editStudent: updateDbStudent, addStudent } = useStudents();
  const { applications: dbApps } = useApplications();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [staffMembers, setStaffMembers] = useState<UserProfile[]>([]);

  // Add Student Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addTargetCountry, setAddTargetCountry] = useState('Poland');
  const [addUniversity, setAddUniversity] = useState('Warsaw University of Technology');
  const [addCourse, setAddCourse] = useState('B.Sc Computer Science & Engineering');
  const [addCounselor, setAddCounselor] = useState('');
  const [addIntake, setAddIntake] = useState('October 2026');
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // 1-Click Quick Counselor Assignment Modal
  const [counselorModalStudent, setCounselorModalStudent] = useState<StudentItem | null>(null);
  const [selectedCounselorToAssign, setSelectedCounselorToAssign] = useState('');
  const [isAssigningCounselor, setIsAssigningCounselor] = useState(false);

  // Counselor On-The-Fly Provisioning Form
  const [showCreateCounselorForm, setShowCreateCounselorForm] = useState(false);
  const [newCounselorName, setNewCounselorName] = useState('');
  const [newCounselorEmail, setNewCounselorEmail] = useState('');
  const [newCounselorPassword, setNewCounselorPassword] = useState('ferex2026!');
  const [newCounselorRole, setNewCounselorRole] = useState('Senior Admissions Counselor');
  const [newCounselorDesk, setNewCounselorDesk] = useState('Poland & European Desk');
  const [newCounselorPhone, setNewCounselorPhone] = useState('');
  const [isCreatingCounselor, setIsCreatingCounselor] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [countryFilter, setCountryFilter] = useState('All');
  const [counselorFilter, setCounselorFilter] = useState('All');

  const { documents: allDocs } = useDocuments();
  const [allRequirements, setAllRequirements] = useState<DocumentRequirement[]>([]);

  useEffect(() => {
    getAllDocumentRequirements().then(setAllRequirements).catch(() => {});
    const handleReqChange = () => {
      getAllDocumentRequirements().then(setAllRequirements).catch(() => {});
    };
    window.addEventListener('ferex_doc_requirements_change', handleReqChange);
    return () => {
      window.removeEventListener('ferex_doc_requirements_change', handleReqChange);
    };
  }, []);

  const getStudentDossier = React.useCallback((studentId: string, targetCountry: string) => {
    const studentDocs = allDocs.filter(d => d.student_id === studentId);
    const countryNorm = (targetCountry || '').toLowerCase().trim();
    const reqs = allRequirements.filter(r => {
      const c = r.country.toLowerCase().trim();
      return c === countryNorm ||
        ((countryNorm === 'ind' || countryNorm === 'india') && (c === 'ind' || c === 'india')) ||
        (countryNorm.includes('poland') && c === 'poland') ||
        (countryNorm.includes('germany') && c === 'germany');
    });
    return calculateDossierStatus(reqs, studentDocs);
  }, [allDocs, allRequirements]);

  useEffect(() => {
    const fetchStaff = () => {
      getStaffMembers().then(setStaffMembers).catch(() => {});
    };
    fetchStaff();
    window.addEventListener('ferex_staff_change', fetchStaff);
    window.addEventListener('ferex_admin_created', fetchStaff);
    window.addEventListener('storage', fetchStaff);
    return () => {
      window.removeEventListener('ferex_staff_change', fetchStaff);
      window.removeEventListener('ferex_admin_created', fetchStaff);
      window.removeEventListener('storage', fetchStaff);
    };
  }, []);

  useEffect(() => {
    const mapped = dbStudents.map((s) => {
      const studentApp = dbApps.find(a => a.student_id === s.id);
      const rawCountry = studentApp?.universities?.country || (studentApp as any)?.country || (studentApp?.university_name?.includes('Warsaw') || studentApp?.university_name?.includes('Poland') ? 'Poland' : studentApp?.university_name?.includes('Munich') || studentApp?.university_name?.includes('Berlin') ? 'Germany' : 'Poland');
      const countryMeta = COUNTRY_FLAGS[rawCountry] || { flag: 'EU', authority: 'Academic Legalization' };
      
      const assignedCounselor = (s.assigned_counselor && s.assigned_counselor !== 'Admin' && s.assigned_counselor !== '--')
        ? s.assigned_counselor
        : getDefaultCounselorForCountry(rawCountry);

      return {
        id: s.id,
        name: s.full_name || s.email.split('@')[0],
        email: s.email,
        phone: s.phone || '—',
        originCountry: (s as any).origin_country || (s as any).country || 'Global',
        targetCountry: rawCountry,
        targetFlag: countryMeta.flag,
        workflowAuthority: countryMeta.authority,
        university: (studentApp?.university_name && studentApp.university_name !== 'Pending University Selection') ? studentApp.university_name : (studentApp?.universities?.name || 'Not Selected'),
        course: studentApp?.program_name || studentApp?.course || 'Program Pending Selection',
        intake: studentApp?.intake || 'Upcoming Intake',
        status: studentApp?.status || 'Active',
        statusColor: studentApp?.status === 'Offer Issued' ? 'bg-[#58051E]/10 text-[#58051E] border-[#58051E]/20' : 'bg-emerald-50 text-emerald-700 border-emerald-100',
        counselor: assignedCounselor,
        joined: s.created_at ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
        appStatus: studentApp?.status || 'Submitted',
      };
    });
    setStudents(mapped);
  }, [dbStudents, dbApps]);

  const [viewStudent, setViewStudent] = useState<StudentItem | null>(null);
  const [editStudent, setEditStudent] = useState<StudentItem | null>(null);
  const [editTemp, setEditTemp] = useState<StudentItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [studentStages, setStudentStages] = useState<any[]>([]);
  const [loadingStages, setLoadingStages] = useState(false);

  useEffect(() => {
    const loadStages = async () => {
      if (!viewStudent?.id) return;
      try {
        setLoadingStages(true);
        const { supabase } = await import('../../lib/supabase');

        const { data: existing } = await supabase
          .from('journey_stages')
          .select('*')
          .eq('student_id', viewStudent.id)
          .order('stage_number', { ascending: true });

        const REQUIRED_STAGES = [
          { stage_number: 1, stage_name: 'Application Submitted', status: 'In Progress', notes: 'Initial submission of visa & university application files.' },
          { stage_number: 2, stage_name: 'Document Legalization', status: 'Pending',     notes: 'Verification of eligibility and consular/legalization audit.' },
          { stage_number: 3, stage_name: 'Decision',              status: 'Pending',     notes: 'University admissions and visa officer eligibility decision.' },
          { stage_number: 4, stage_name: 'Visa Outcome',          status: 'Pending',     notes: 'Passport stamping and visa grant status.' },
        ];

        const existingNums = new Set((existing || []).map((s: any) => s.stage_number));
        const missing = REQUIRED_STAGES.filter(r => !existingNums.has(r.stage_number));
        if (missing.length > 0) {
          const toInsert = missing.map(m => ({ ...m, student_id: viewStudent.id }));
          await supabase.from('journey_stages').insert(toInsert);
        }

        const { data: final } = await supabase
          .from('journey_stages')
          .select('*')
          .eq('student_id', viewStudent.id)
          .order('stage_number', { ascending: true });

        setStudentStages((final || []) as any[]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStages(false);
      }
    };
    loadStages();
  }, [viewStudent]);

  const handleConfirmStage = async (stage: any) => {
    if (!viewStudent?.id) return;
    try {
      const { updateJourneyStageStatus } = await import('../../lib/api/journey');
      const { createNotification } = await import('../../lib/api/notifications');

      // 1. Mark current stage as Completed
      await updateJourneyStageStatus(stage.id, 'Completed');

      // 2. Find and advance the next stage (stage_number = stage.stage_number + 1)
      const nextStage = studentStages.find(s => s.stage_number === stage.stage_number + 1);
      if (nextStage) {
        await updateJourneyStageStatus(nextStage.id, 'In Progress');
      }

      // 3. Automatically notify the student and log automated email
      await createNotification({
        user_id: viewStudent.id,
        title: `Stage Completed: ${stage.stage_name}`,
        body: `Your visa/application stage "${stage.stage_name}" has been successfully reviewed and confirmed completed. Next stage "${nextStage ? nextStage.stage_name : 'Arrival Preparation'}" is now In Progress.`,
        category: 'Journey'
      });

      const { sendEducationProcessEmail } = await import('../../lib/api/automatedEmails');
      await sendEducationProcessEmail({
        studentEmail: viewStudent.email,
        studentName: viewStudent.name,
        stepName: stage.stage_name,
        stepStatus: 'Completed',
        notes: `Step completed. Next milestone: ${nextStage ? nextStage.stage_name : 'Arrival Preparation'}`
      });

      // Refresh local stages
      const { getJourneyStages } = await import('../../lib/api/journey');
      const list = await getJourneyStages(viewStudent.id);
      setStudentStages(list);

      showToast(`Journey step "${stage.stage_name}" confirmed. Automated notification sent to ${viewStudent.email}.`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to confirm journey stage'}`);
    }
  };

  const [toast, setToast] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 6;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleSaveEdit = async () => {
    if (!editTemp) return;
    try {
      await updateDbStudent(editTemp.id, {
        full_name: editTemp.name,
        phone: editTemp.phone,
        assigned_counselor: editTemp.counselor,
      });
      setStudents(prev => prev.map(s => s.id === editTemp.id ? editTemp : s));
      setEditStudent(null);
      setEditTemp(null);
      showToast('Student record updated.');
    } catch (err: any) {
      showToast(`Error updating: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await removeStudent(deleteId);
      setStudents(prev => prev.filter(s => s.id !== deleteId));
      setDeleteId(null);
      showToast('Student removed from records.');
    } catch (err: any) {
      showToast(`Error deleting: ${err.message}`);
    }
  };

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim()) {
      showToast('Student name and email are required.');
      return;
    }

    try {
      setIsSubmittingAdd(true);
      const chosenCounselor = addCounselor || getDefaultCounselorForCountry(addTargetCountry);
      const created = await addStudent({
        full_name: addName.trim(),
        email: addEmail.trim(),
        phone: addPhone.trim() || '',
        assigned_counselor: chosenCounselor
      });

      // If admin selected a specific target university and course, create a real application record
      if (addUniversity && addUniversity.trim()) {
        try {
          const { createApplication } = await import('../../lib/api/applications');
          await createApplication({
            student_id: created.id,
            student_name: addName.trim(),
            university_name: addUniversity.trim(),
            program_name: addCourse.trim() || 'Higher Degree Studies',
            intake: addIntake.trim() || 'October 2026'
          });
        } catch (e) {}
      }

      setShowAddModal(false);
      setAddName('');
      setAddEmail('');
      setAddPhone('');
      showToast(`Student ${addName} added successfully. Assigned to ${chosenCounselor}.`);
    } catch (err: any) {
      showToast(`Error adding student: ${err.message || 'Failed'}`);
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleQuickAssignCounselor = async (student: StudentItem, counselorName: string) => {
    try {
      setIsAssigningCounselor(true);
      await assignCounselorToStudent(student.id, counselorName);
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, counselor: counselorName } : s));
      if (viewStudent && viewStudent.id === student.id) {
        setViewStudent({ ...viewStudent, counselor: counselorName });
      }
      setCounselorModalStudent(null);
      showToast(`Assigned ${counselorName} to ${student.name}.`);
    } catch (err: any) {
      showToast(`Error assigning counselor: ${err.message || 'Failed'}`);
    } finally {
      setIsAssigningCounselor(false);
    }
  };

  const handleCreateAndAssignCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCounselorName.trim() || !newCounselorEmail.trim()) {
      showToast('Please provide both Counselor Full Name and Login Email.');
      return;
    }
    try {
      setIsCreatingCounselor(true);
      const deskVal = newCounselorDesk.trim() || 'Admissions Desk';
      const created = await createStaffMember({
        full_name: newCounselorName.trim(),
        email: newCounselorEmail.trim(),
        role: 'counselor',
        password: newCounselorPassword.trim() || 'ferex2026!',
        desk: deskVal,
        department: `Admissions:${deskVal}`,
        phone: newCounselorPhone.trim(),
      });

      const updatedRoster = await getStaffMembers();
      setStaffMembers(updatedRoster);

      const assignedLabel = `${created.full_name || newCounselorName.trim()} (${deskVal})`;
      setSelectedCounselorToAssign(assignedLabel);

      if (counselorModalStudent) {
        await handleQuickAssignCounselor(counselorModalStudent, assignedLabel);
      }

      showToast(`Counselor ${newCounselorName} created & login provisioned.`);
      setShowCreateCounselorForm(false);
      setNewCounselorName('');
      setNewCounselorEmail('');
      setNewCounselorPhone('');
    } catch (err: any) {
      showToast(`Error creating counselor: ${err.message || 'Failed to create'}`);
    } finally {
      setIsCreatingCounselor(false);
    }
  };

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.university.toLowerCase().includes(search.toLowerCase()) ||
      s.targetCountry.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchCountry = countryFilter === 'All' || s.targetCountry.toLowerCase() === countryFilter.toLowerCase();
    const matchCounselor = counselorFilter === 'All' || s.counselor.toLowerCase().includes(counselorFilter.toLowerCase());
    return matchSearch && matchStatus && matchCountry && matchCounselor;
  });

  const pages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const ALL_DESTINATIONS = ['All', 'Poland', 'Germany', 'United Kingdom', 'France', 'Italy', 'United States', 'Canada', 'Hungary'];

  return (
    <div className="space-y-5 relative text-left">
      {/* Toast */}
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-[#58051E]" /> Student Directory & Enrollments
            </h1>
            <span className="text-[10px] font-extrabold bg-[#58051E]/10 text-[#58051E] px-2.5 py-0.5 rounded-full border border-[#58051E]/20">
              {isStaff ? 'Counselor CRM' : 'Multi-Country CRM'}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {isStaff
              ? 'Student dossiers, destination routing, document verification audit, and counselor guidance.'
              : 'Global Student Applications • Destination Routing, Auto Counselor Assignment, Document Audit & Country Legalization.'}
          </p>
        </div>

        {!isStaff && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 h-9.5 px-4 bg-[#58051E] text-white text-xs font-bold rounded-xl hover:bg-[#430316] active:scale-98 transition-all shadow-md shadow-[#58051E]/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Add Student
            </button>
          </div>
        )}
      </div>

      {/* Multi-Country Destination Filter Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
          <Globe className="w-3.5 h-3.5 text-[#58051E]" /> Destination:
        </span>
        {ALL_DESTINATIONS.map(c => {
          const flag = COUNTRY_FLAGS[c]?.flag || 'ALL';
          const isActive = countryFilter === c;
          return (
            <button
              key={c}
              onClick={() => { setCountryFilter(c); setCurrentPage(1); }}
              className={`h-8 px-3 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`text-[9.5px] font-mono font-black px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{flag}</span>
              <span>{c === 'United Kingdom' ? 'UK' : c === 'United States' ? 'USA' : c}</span>
            </button>
          );
        })}
      </div>

      {/* Search + Counselor + Status Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by student name, ID, email, destination or university..."
            className="w-full h-10 pl-9.5 pr-4 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#58051E]/40 focus:ring-4 focus:ring-[#58051E]/5 transition-all shadow-xs"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={counselorFilter}
            onChange={(e) => { setCounselorFilter(e.target.value); setCurrentPage(1); }}
            className="w-full h-10 px-3 bg-white border border-slate-200/90 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="All">All Counselors (Roster)</option>
            {DEFAULT_COUNSELOR_ROSTER.map((c: any) => (
              <option key={c.id} value={c.name}>{c.name} ({c.country})</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3 flex gap-1.5">
          {['All', 'Active', 'Pending'].map(f => (
            <button key={f} onClick={() => { setStatusFilter(f); setCurrentPage(1); }}
              className={`flex-1 h-10 rounded-xl text-xs font-bold border transition-all duration-150 active:scale-98 ${statusFilter === f ? 'bg-[#58051E] text-white border-[#58051E] shadow-sm shadow-[#58051E]/20' : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container with Horizontal Scroll & Sticky Actions */}
      <div className="bg-white border border-slate-200/70 rounded-2xl shadow-xs overflow-x-auto scrollbar-thin">
        <table className="w-full text-xs min-w-[1150px] border-collapse">
          <thead>
            <tr className="border-b border-slate-150 bg-slate-50 text-slate-500 uppercase text-[9.5px] font-extrabold tracking-wider">
              <th className="text-left px-5 py-3.5 min-w-[200px]">Student Name</th>
              <th className="text-left px-4 py-3.5 min-w-[180px]">Contact</th>
              <th className="text-left px-4 py-3.5 min-w-[220px]">Target Country & University</th>
              <th className="text-left px-4 py-3.5 min-w-[140px]">Status</th>
              <th className="text-left px-4 py-3.5 min-w-[180px]">Assigned Counselor</th>
              <th className="text-left px-4 py-3.5 min-w-[110px]">Joined</th>
              <th className="text-center px-4 py-3.5 min-w-[170px] w-[170px] whitespace-nowrap sticky right-0 bg-slate-50 z-20 border-l border-slate-200 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
            {paged.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400 font-bold">No students match your filter.</td></tr>
            ) : (
              paged.map((s) => (
                <tr key={s.id} className="group hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#58051E] text-white flex items-center justify-center font-black text-xs shadow-2xs shrink-0">
                        {s.name[0]?.toUpperCase() || 'S'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-slate-900 leading-tight truncate max-w-[160px]">{s.name}</p>
                        <p className="text-[10px] font-semibold text-slate-400 truncate max-w-[140px]">{s.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-slate-800 font-bold truncate max-w-[160px]">{s.email}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{s.phone}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      <span className="text-[10px] font-mono font-black text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{s.targetFlag}</span>
                      <span className="font-black text-slate-900">{s.targetCountry}</span>
                      <span className="text-[9px] font-extrabold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                        {s.workflowAuthority}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 truncate max-w-[200px]">{s.university}</p>
                    <p className="text-[9.5px] font-semibold text-slate-400 truncate max-w-[200px]">{s.course}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    {(() => {
                      const dossier = getStudentDossier(s.id, s.targetCountry);
                      return (
                        <div className="space-y-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border inline-block ${s.statusColor}`}>
                            {s.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border block w-fit ${
                            dossier.isComplete
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {dossier.isComplete ? '✅ Docs Complete' : `⚠️ Incomplete (${dossier.uploadedMandatoryCount}/${dossier.mandatoryCount || 2})`}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3.5">
                    <div
                      onClick={() => {
                        if (!isStaff) {
                          setCounselorModalStudent(s);
                          setSelectedCounselorToAssign(s.counselor);
                        }
                      }}
                      className={`group/c inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/80 transition-colors ${
                        !isStaff ? 'cursor-pointer hover:bg-rose-50 hover:border-rose-200' : ''
                      }`}
                      title={!isStaff ? 'Click to change or reassign counselor' : 'Assigned Counselor'}
                    >
                      <Headphones className="w-3 h-3 text-[#58051E]" />
                      <span className="text-[11px] font-bold text-slate-800 group-hover/c:text-[#58051E] max-w-[140px] truncate">
                        {s.counselor.split('(')[0].trim()}
                      </span>
                      {!isStaff && <span className="text-[9px] font-extrabold text-[#58051E] underline ml-1">Change</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 font-semibold whitespace-nowrap">{s.joined}</td>
                  <td className="px-4 py-3.5 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50/95 transition-colors z-10 border-l border-slate-150 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.06)]">
                    <div className="flex items-center justify-center gap-1.5 shrink-0">
                      {!isStaff && (
                        <button
                          onClick={() => { setCounselorModalStudent(s); setSelectedCounselorToAssign(s.counselor); }}
                          title="Assign Counselor"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#58051E] hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setViewStudent(s)}
                        title="View Student Dossier"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditStudent(s); setEditTemp({ ...s }); }}
                        title="Edit Student Info"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {!isStaff && (
                        <button
                          onClick={() => setDeleteId(s.id)}
                          title="Delete Student Record"
                          className="p-1.5 rounded-lg text-red-500 hover:text-white hover:bg-red-600 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/40">
            <span className="text-[11px] font-semibold text-slate-400">Page {currentPage} of {pages}</span>
            <div className="flex items-center gap-1.5">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1 rounded-lg text-slate-500 hover:bg-slate-200/60 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <button disabled={currentPage === pages} onClick={() => setCurrentPage(p => p + 1)} className="p-1 rounded-lg text-slate-500 hover:bg-slate-200/60 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* View Drawer */}
      <AnimatePresence>
        {viewStudent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setViewStudent(null)} />
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 border-l border-slate-100 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#58051E] text-white flex items-center justify-center font-black text-lg shadow-md">{viewStudent.name[0]}</div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{viewStudent.name}</h3>
                    <p className="text-xs font-semibold text-slate-400">{viewStudent.email}</p>
                  </div>
                </div>
                <button onClick={() => setViewStudent(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div><span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Phone</span><span className="text-slate-800 font-bold">{viewStudent.phone}</span></div>
                  <div><span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Country</span><span className="text-slate-800 font-bold">{viewStudent.targetCountry}</span></div>
                  <div><span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">University</span><span className="text-slate-800 font-bold">{viewStudent.university}</span></div>
                  <div><span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Course</span><span className="text-slate-800 font-bold">{viewStudent.course}</span></div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Assigned Counselor</span>
                    {!isStaff && (
                      <button
                        onClick={() => {
                          const sToEdit = viewStudent;
                          setViewStudent(null);
                          setEditStudent(sToEdit);
                          setEditTemp({ ...sToEdit });
                        }}
                        className="text-[10px] font-extrabold text-[#58051E] hover:underline"
                      >
                        Change Counselor
                      </button>
                    )}
                  </div>
                  <p className="text-slate-900 font-extrabold">{viewStudent.counselor}</p>
                </div>

                {/* Dossier Compliance Status */}
                {(() => {
                  const viewDossier = getStudentDossier(viewStudent.id, viewStudent.targetCountry);
                  return (
                    <div className={`p-4 rounded-xl border space-y-1.5 ${
                      viewDossier.isComplete
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-amber-50/70 border-amber-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider block text-slate-700">
                          {viewDossier.isComplete ? 'Dossier Complete' : 'Dossier Incomplete'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          viewDossier.isComplete
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {viewDossier.isComplete ? 'Ready for Legalization' : `${viewDossier.missingMandatoryCount} Missing Docs`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        {viewDossier.isComplete
                          ? `All ${viewDossier.mandatoryCount} mandatory compliance files for ${viewStudent.targetCountry} are uploaded.`
                          : `Student has uploaded ${viewDossier.uploadedMandatoryCount} of ${viewDossier.mandatoryCount} mandatory files for ${viewStudent.targetCountry}.`}
                      </p>
                    </div>
                  );
                })()}

                {/* Stepper with Confirm buttons */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Official Visa & Application Progress</span>
                  {loadingStages ? (
                    <p className="text-xs text-slate-400 font-bold">Syncing stages...</p>
                  ) : studentStages.length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold">No stages active. Seeded automatically when student visits Journey Tracker page.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {studentStages.map(stage => {
                        const isCompleted = stage.status === 'Completed';
                        const isInProgress = stage.status === 'In Progress';
                        return (
                          <div key={stage.id} className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-xl border border-slate-200/60 shadow-3xs">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[8.5px] font-black text-slate-400">STAGE 0{stage.stage_number}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${
                                  isCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                                  isInProgress ? 'bg-amber-50 text-amber-700 border border-amber-150 animate-pulse' :
                                  'bg-slate-100 text-slate-500'
                                }`}>
                                  {stage.status}
                                </span>
                              </div>
                              <p className="text-[10.5px] font-black text-slate-800 truncate">{stage.stage_name}</p>
                            </div>

                            {isInProgress && (
                              <button
                                onClick={() => handleConfirmStage(stage)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black shadow-3xs transition-all flex items-center gap-1 shrink-0"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm Step
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editStudent && editTemp && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setEditStudent(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900">Edit Student Info</h3>
                <button onClick={() => setEditStudent(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                  <input type="text" value={editTemp.name} onChange={(e) => setEditTemp({ ...editTemp, name: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Phone</label>
                  <input type="text" value={editTemp.phone} onChange={(e) => setEditTemp({ ...editTemp, phone: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Assigned Counselor (From Company Staff List) *</label>
                  <select
                    value={editTemp.counselor}
                    onChange={(e) => setEditTemp({ ...editTemp, counselor: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none"
                  >
                    {staffMembers.map(s => {
                      const label = `${s.full_name || s.email} (${s.department?.split(':')[1] || s.role})`;
                      const val = `${s.full_name || s.email} (${s.department?.split(':')[1] || 'Senior Counselor'})`;
                      return <option key={s.id} value={val}>{label}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditStudent(null)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                <button onClick={handleSaveEdit} className="flex-1 h-9 bg-[#58051E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] flex items-center justify-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#58051E]" />
                  <h3 className="text-base font-black text-slate-900">Add New Student Profile</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleAddStudentSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Sneakha S.R"
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      placeholder="e.g. student@gmail.com"
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Target Country *</label>
                    <select
                      value={addTargetCountry}
                      onChange={(e) => {
                        setAddTargetCountry(e.target.value);
                        if (!addCounselor) {
                          setAddCounselor(getDefaultCounselorForCountry(e.target.value));
                        }
                      }}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      {['Poland', 'Germany', 'United Kingdom', 'France', 'Italy', 'United States', 'Canada', 'Hungary'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Target Intake</label>
                    <select
                      value={addIntake}
                      onChange={(e) => setAddIntake(e.target.value)}
                      className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="October 2026">October 2026</option>
                      <option value="February 2027">February 2027</option>
                      <option value="October 2027">October 2027</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Target University</label>
                  <input
                    type="text"
                    value={addUniversity}
                    onChange={(e) => setAddUniversity(e.target.value)}
                    placeholder="e.g. Warsaw University of Technology"
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Program / Course</label>
                  <input
                    type="text"
                    value={addCourse}
                    onChange={(e) => setAddCourse(e.target.value)}
                    placeholder="B.Sc Computer Science"
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Assigned Counselor</label>
                  <select
                    value={addCounselor}
                    onChange={(e) => setAddCounselor(e.target.value)}
                    className="w-full h-9.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                  >
                    <option value="">Auto-Assign by Country Desk</option>
                    {staffMembers.map(s => {
                      const label = `${s.full_name || s.email} (${s.department?.split(':')[1] || s.role})`;
                      return <option key={s.id} value={s.full_name || s.email}>{label}</option>;
                    })}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="h-9 px-4 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAdd}
                    className="h-9 px-5 bg-[#58051E] text-white text-xs font-bold rounded-xl hover:bg-[#430316] shadow-xs"
                  >
                    {isSubmittingAdd ? 'Adding Student...' : 'Create Student Profile'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Quick Assign / Reassign Counselor Modal */}
        {counselorModalStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={() => setCounselorModalStudent(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 z-10 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#58051E] text-white flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Assign Dedicated Counselor</h3>
                    <p className="text-xs font-semibold text-slate-400">
                      Student: <span className="text-slate-800 font-bold">{counselorModalStudent.name}</span> ({counselorModalStudent.targetCountry})
                    </p>
                  </div>
                </div>
                <button onClick={() => setCounselorModalStudent(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-950">Recommended Desk for {counselorModalStudent.targetCountry}</p>
                      <p className="text-[10px] font-semibold text-amber-700">{getDefaultCounselorForCountry(counselorModalStudent.targetCountry)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCounselorToAssign(getDefaultCounselorForCountry(counselorModalStudent.targetCountry))}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black cursor-pointer"
                  >
                    Select
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Available Admissions Counselors & Specialized Desks:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCreateCounselorForm(!showCreateCounselorForm)}
                    className="px-2.5 py-1 text-[10px] font-bold text-[#58051E] bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <UserPlus className="w-3 h-3" />
                    {showCreateCounselorForm ? 'Close Form' : '+ Add New Counselor & Login'}
                  </button>
                </div>

                {showCreateCounselorForm && (
                  <form onSubmit={handleCreateAndAssignCounselor} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-[#58051E]" />
                        Create Counselor & Provision Login
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Immediate Access
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Full Name</label>
                        <input
                          required
                          type="text"
                          value={newCounselorName}
                          onChange={(e) => setNewCounselorName(e.target.value)}
                          placeholder="e.g. Dr. Maria Kowalska"
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Login Email</label>
                        <input
                          required
                          type="email"
                          value={newCounselorEmail}
                          onChange={(e) => setNewCounselorEmail(e.target.value)}
                          placeholder="counselor@ferex.com"
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Desk Specialization</label>
                        <select
                          value={newCounselorDesk}
                          onChange={(e) => setNewCounselorDesk(e.target.value)}
                          className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none"
                        >
                          <option value="Poland & European Desk">Poland & European Desk</option>
                          <option value="Germany APS & Technical Desk">Germany APS & Technical Desk</option>
                          <option value="UK CAS & Ireland Desk">UK CAS & Ireland Desk</option>
                          <option value="France & Italy Desk">France & Italy Desk</option>
                          <option value="USA & Canada Desk">USA & Canada Desk</option>
                          <option value="Schengen Visa & Compliance Desk">Schengen Visa & Compliance Desk</option>
                          <option value="General Admissions Desk">General Admissions Desk</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Role / Designation</label>
                        <input
                          type="text"
                          value={newCounselorRole}
                          onChange={(e) => setNewCounselorRole(e.target.value)}
                          placeholder="Senior Admissions Lead"
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-extrabold text-slate-500 uppercase">Login Password</label>
                          <button
                            type="button"
                            onClick={() => setNewCounselorPassword(`ferex${Math.floor(1000 + Math.random() * 9000)}!`)}
                            className="text-[9px] font-bold text-[#58051E] hover:underline"
                          >
                            Generate
                          </button>
                        </div>
                        <input
                          type="text"
                          value={newCounselorPassword}
                          onChange={(e) => setNewCounselorPassword(e.target.value)}
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={newCounselorPhone}
                          onChange={(e) => setNewCounselorPhone(e.target.value)}
                          placeholder="+48 22 123 4567"
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowCreateCounselorForm(false)}
                        className="h-7 px-3 border border-slate-200 text-[10px] font-bold text-slate-600 rounded-lg hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingCounselor}
                        className="h-7 px-3 bg-[#58051E] text-white text-[10px] font-bold rounded-lg hover:bg-[#430316] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {isCreatingCounselor ? 'Provisioning...' : 'Create & Assign to Student'}
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {staffMembers.map(s => {
                    const parts = (s.department || '').split(':');
                    const deskLabel = parts[1] || parts[0] || 'Admissions Desk';
                    const counselorVal = `${s.full_name || s.email} (${deskLabel})`;
                    const isSelected = selectedCounselorToAssign.includes(s.full_name || s.email);
                    const hasLocalCred = typeof localStorage !== 'undefined' && !!localStorage.getItem(`ferex_admin_cred_${s.email.toLowerCase()}`);

                    return (
                      <div
                        key={s.id || s.email}
                        onClick={() => setSelectedCounselorToAssign(counselorVal)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-rose-50/70 border-[#58051E] ring-2 ring-[#58051E]/10'
                            : 'bg-white border-slate-200/80 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                            isSelected ? 'bg-[#58051E] text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {(s.full_name || s.email)[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-black text-slate-900">{s.full_name || s.email}</p>
                              {hasLocalCred && (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                                  Login Active
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-[#58051E]">{deskLabel}</p>
                            <p className="text-[9.5px] font-semibold text-slate-400">{s.role} • {s.email}</p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-[#58051E] bg-[#58051E] text-white' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCounselorModalStudent(null)}
                  className="h-9 px-4 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedCounselorToAssign || isAssigningCounselor}
                  onClick={() => handleQuickAssignCounselor(counselorModalStudent, selectedCounselorToAssign)}
                  className="h-9 px-5 bg-[#58051E] text-white text-xs font-bold rounded-xl hover:bg-[#430316] shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  {isAssigningCounselor ? 'Assigning...' : 'Assign & Notify Student'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setDeleteId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 z-10 text-left space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Delete Student Record</h3>
                  <p className="text-xs font-semibold text-slate-400">Are you sure you want to remove this student?</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">This action will remove the student profile from active CRM records.</p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setDeleteId(null)} className="h-8.5 px-3 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleDelete} className="h-8.5 px-4 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 shadow-xs">Delete Student</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
