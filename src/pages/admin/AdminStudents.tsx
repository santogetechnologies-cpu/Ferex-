import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Eye, Edit3, Trash2, X, Save, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStudents } from '../../hooks/useStudents';
import { useApplications } from '../../hooks/useApplications';
import { getStaffMembers } from '../../lib/api/students';
import type { UserProfile } from '../../lib/types';

interface StudentItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  university: string;
  course: string;
  intake: string;
  status: string;
  statusColor: string;
  counselor: string;
  joined: string;
  appStatus: string;
}

export const AdminStudents: React.FC = () => {
  const { students: dbStudents, addStudent, removeStudent, editStudent: updateDbStudent } = useStudents();
  const { applications: dbApps } = useApplications();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [staffMembers, setStaffMembers] = useState<UserProfile[]>([]);

  useEffect(() => {
    getStaffMembers().then(setStaffMembers).catch(() => {});
  }, []);

  useEffect(() => {
    const mapped = dbStudents.map((s) => {
      const studentApp = dbApps.find(a => a.student_id === s.id);
      return {
        id: s.id,
        name: s.full_name || s.email.split('@')[0],
        email: s.email,
        phone: s.phone || '—',
        country: 'India',
        university: (studentApp?.university_name && studentApp.university_name !== 'Pending University Selection') ? studentApp.university_name : (studentApp?.universities?.name || 'University Applied For'),
        course: studentApp?.program_name || studentApp?.course || 'Higher Studies',
        intake: studentApp?.intake || 'Oct 2026',
        status: studentApp?.status || 'Active',
        statusColor: studentApp?.status === 'Offer Issued' ? 'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20' : 'bg-emerald-50 text-emerald-700 border-emerald-100',
        counselor: s.assigned_counselor || 'Admin',
        joined: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        appStatus: studentApp?.status || 'Submitted',
      };
    });
    setStudents(mapped);
  }, [dbStudents, dbApps]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
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
          { stage_number: 2, stage_name: 'NAWA Process',          status: 'Pending',     notes: 'Verification of eligibility and NAWA apostille/legalization audit.' },
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

      // 3. Automatically notify the student (writes to Supabase & triggers mock email toast)
      await createNotification({
        user_id: viewStudent.id,
        title: `Stage Completed: ${stage.stage_name}`,
        body: `Your visa/application stage "${stage.stage_name}" has been successfully reviewed and confirmed completed. Next stage "${nextStage ? nextStage.stage_name : 'Arrival Preparation'}" is now In Progress.`,
        category: 'Journey'
      });

      // Refresh local stages
      const { getJourneyStages } = await import('../../lib/api/journey');
      const list = await getJourneyStages(viewStudent.id);
      setStudentStages(list);

      showToast(`🎉 Journey step "${stage.stage_name}" confirmed! Student notified via email.`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to confirm journey stage'}`);
    }
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 6;

  // Add Student Controlled Inputs
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addCountry, setAddCountry] = useState('India');
  const [addUniversity, setAddUniversity] = useState('Warsaw University of Technology');
  const [addCourse, setAddCourse] = useState('B.Sc Computer Science');
  const [addCounselor, setAddCounselor] = useState('Admin');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim()) return;

    try {
      setIsSubmitting(true);
      const created = await addStudent({
        full_name: addName.trim(),
        email: addEmail.trim(),
        phone: addPhone.trim(),
        assigned_counselor: addCounselor,
      });

      // Optimistically add to UI list immediately
      const newStudentItem: StudentItem = {
        id: created.id,
        name: created.full_name || addName.trim(),
        email: created.email || addEmail.trim(),
        phone: addPhone.trim() || '—',
        country: addCountry,
        university: addUniversity,
        course: addCourse,
        intake: '2026',
        status: 'Active',
        statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        counselor: addCounselor,
        joined: 'Just now',
        appStatus: 'Active',
      };

      setStudents(prev => [newStudentItem, ...prev]);

      // Reset form
      setAddName('');
      setAddEmail('');
      setAddPhone('');
      setShowAddModal(false);
      showToast(`Student ${addName} saved successfully!`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Could not save student'}`);
    } finally {
      setIsSubmitting(false);
    }
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

  const filtered = students.filter(s =>
    (statusFilter === 'All' || s.status === statusFilter) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))
  );
  const pages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <div className="space-y-5 relative text-left">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Students</h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">{students.length} total students enrolled</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 h-9 px-4 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] active:scale-98 transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Add Student
        </button>
      </div>

      {/* Search + Filter Header */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name, ID or email..."
            className="w-full h-10 pl-9.5 pr-4 bg-white border border-slate-200/90 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]/40 focus:ring-4 focus:ring-[#6A1B2E]/5 transition-all shadow-xs"
          />
        </div>
        <div className="flex gap-1.5">
          {['All', 'Active', 'Pending', 'Inactive'].map(f => (
            <button key={f} onClick={() => { setStatusFilter(f); setCurrentPage(1); }}
              className={`h-10 px-4 rounded-xl text-xs font-bold border transition-all duration-150 active:scale-98 ${statusFilter === f ? 'bg-[#6A1B2E] text-white border-[#6A1B2E] shadow-sm shadow-[#6A1B2E]/20' : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/70 rounded-2xl shadow-xs overflow-hidden">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-400 uppercase text-[9.5px] font-extrabold tracking-wider">
              <th className="text-left px-5 py-3">Student Name</th>
              <th className="text-left px-4 py-3">Contact</th>
              <th className="text-left px-4 py-3">Target University</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Counselor</th>
              <th className="text-left px-4 py-3">Joined</th>
              <th className="text-right px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
            {paged.length === 0 ? (
              <tr><td colSpan={7} className="py-8 text-center text-slate-400 font-bold">No students found.</td></tr>
            ) : (
              paged.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#6A1B2E] text-white flex items-center justify-center font-extrabold text-xs shadow-2xs">
                        {s.name[0]?.toUpperCase() || 'S'}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900 leading-tight">{s.name}</p>
                        <p className="text-[10px] font-semibold text-slate-400 truncate max-w-[140px]">{s.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-slate-800 font-bold">{s.email}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{s.phone}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-extrabold text-slate-800">{s.university}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{s.course}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${s.statusColor}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 font-bold">{s.counselor}</td>
                  <td className="px-4 py-3.5 text-slate-500 font-semibold">{s.joined}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewStudent(s)} title="View Student" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setEditStudent(s); setEditTemp({ ...s }); }} title="Edit Student" className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(s.id)} title="Delete Student" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
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
                  <div className="w-12 h-12 rounded-2xl bg-[#6A1B2E] text-white flex items-center justify-center font-black text-lg shadow-md">{viewStudent.name[0]}</div>
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
                  <div><span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Country</span><span className="text-slate-800 font-bold">{viewStudent.country}</span></div>
                  <div><span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">University</span><span className="text-slate-800 font-bold">{viewStudent.university}</span></div>
                  <div><span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Course</span><span className="text-slate-800 font-bold">{viewStudent.course}</span></div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Assigned Counselor</span>
                    <button
                      onClick={() => {
                        const sToEdit = viewStudent;
                        setViewStudent(null);
                        setEditStudent(sToEdit);
                        setEditTemp({ ...sToEdit });
                      }}
                      className="text-[10px] font-extrabold text-[#6A1B2E] hover:underline"
                    >
                      Change Counselor
                    </button>
                  </div>
                  <p className="text-slate-900 font-extrabold">{viewStudent.counselor}</p>
                </div>

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
                <button onClick={handleSaveEdit} className="flex-1 h-9 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] flex items-center justify-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setDeleteId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-500" /></div>
                <h3 className="text-sm font-extrabold text-slate-900">Remove Student?</h3>
              </div>
              <p className="text-xs font-semibold text-slate-500 mb-5">This will permanently remove this student record.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 h-9 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50">Cancel</button>
                <button onClick={handleDelete} className="flex-1 h-9 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700">Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Add New Student</h3>
                  <p className="text-[10.5px] font-semibold text-slate-400 mt-0.5">Enroll a student into the education portal database</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleAddStudentSubmit} className="space-y-3.5">
                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs font-semibold text-amber-800 flex items-center justify-between">
                  <span>Default initial password:</span>
                  <code className="bg-amber-100 text-[#6A1B2E] font-black px-2 py-0.5 rounded border border-amber-300">Student123</code>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Full Name *</label>
                  <input
                    required
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Email Address *</label>
                  <input
                    required
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="rahul.sharma@gmail.com"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Country</label>
                    <input
                      type="text"
                      value={addCountry}
                      onChange={(e) => setAddCountry(e.target.value)}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Target University</label>
                  <input
                    type="text"
                    value={addUniversity}
                    onChange={(e) => setAddUniversity(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Target Course</label>
                  <input
                    type="text"
                    value={addCourse}
                    onChange={(e) => setAddCourse(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Assigned Counselor *</label>
                  <select
                    value={addCounselor}
                    onChange={(e) => setAddCounselor(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                  >
                    <option value="Admin">Admin (System Default)</option>
                    {staffMembers.map(s => {
                      const nameStr = s.full_name || s.email;
                      const label = `${nameStr} (${s.role || 'Staff'})`;
                      return <option key={s.id} value={nameStr}>{label}</option>;
                    })}
                  </select>
                </div>

                <div className="flex gap-3 pt-3">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 h-9.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 h-9.5 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] transition-colors shadow-sm disabled:opacity-50">
                    {isSubmitting ? 'Saving...' : 'Save Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
