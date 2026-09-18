import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Eye, Edit3, Trash2, X, CheckCircle2, RefreshCw, GraduationCap, Check, AlertCircle } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getStudentsConsolidatedOversight,
  reassignStudentCounselor,
  createStudent,
  deleteStudent,
  getStaffMembers,
  type StudentOversightItem
} from '../../lib/api/students';
import { supabase } from '../../lib/supabase';

export const CentralStudents: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentOversightItem | null>(null);
  const [reassignModalStudent, setReassignModalStudent] = useState<StudentOversightItem | null>(null);
  const [selectedCounselorName, setSelectedCounselorName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [students, setStudents] = useState<StudentOversightItem[]>([]);
  const [counselorsList, setCounselorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('All');

  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    phone: '',
    targetUni: 'University of Warsaw',
    course: 'M.Sc. Computer Science',
    counselor: 'Rahul Mehta'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [data, staff] = await Promise.all([
        getStudentsConsolidatedOversight(),
        getStaffMembers()
      ]);
      setStudents(data || []);
      setCounselorsList(staff || []);
      if (staff && staff.length > 0 && !selectedCounselorName) {
        setSelectedCounselorName(staff[0].full_name || staff[0].email);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCounselorName]);

  useEffect(() => {
    loadData();

    // Supabase Realtime synchronization
    const channel = supabase
      .channel('central_students_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_documents' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_students_change', handleSync);
    window.addEventListener('ferex_staff_change', handleSync);
    window.addEventListener('ferex_payment_change', handleSync);
    window.addEventListener('ferex_document_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_students_change', handleSync);
      window.removeEventListener('ferex_staff_change', handleSync);
      window.removeEventListener('ferex_payment_change', handleSync);
      window.removeEventListener('ferex_document_change', handleSync);
    };
  }, [loadData]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.email) return;
    try {
      await createStudent({
        full_name: newStudent.name.trim(),
        email: newStudent.email.trim(),
        phone: newStudent.phone.trim(),
        assigned_counselor: newStudent.counselor,
      });
      setShowAddModal(false);
      showToastMsg(`Enrolled student ${newStudent.name}`);
      setNewStudent({ name: '', email: '', phone: '', targetUni: 'University of Warsaw', course: 'M.Sc. Computer Science', counselor: 'Rahul Mehta' });
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error: ${err.message || 'Failed to create student'}`);
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassignModalStudent || !selectedCounselorName) return;
    try {
      await reassignStudentCounselor(reassignModalStudent.id, selectedCounselorName);
      setStudents(prev => prev.map(s => s.id === reassignModalStudent.id ? { ...s, counselor: selectedCounselorName } : s));
      showToastMsg(`Reassigned ${reassignModalStudent.name} to counselor ${selectedCounselorName}!`);
      setReassignModalStudent(null);
    } catch (err: any) {
      showToastMsg(`Failed to reassign: ${err.message}`);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete student ${name}?`)) return;
    try {
      await deleteStudent(id);
      setStudents(prev => prev.filter(s => s.id !== id));
      showToastMsg(`Removed student record for ${name}`);
    } catch (err: any) {
      showToastMsg(`Error: ${err.message || 'Failed to delete'}`);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.displayId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.targetUni.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.counselor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStage = stageFilter === 'All' || s.stage === stageFilter;
    return matchSearch && matchStage;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-[#58051E]" /> Ferex Education Central Student Oversight
            </h1>
            <span className="text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full">
              Live Supabase Sync
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Consolidated oversight of student journeys, process stages, tuition fee settlements, document compliance, and counselor assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={loadData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
          <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            Add New Student
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, email, target university, counselor..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['All', 'Application Submitted', 'Offer Letter Received', 'NAWA Legalization', 'Visa Processing', 'Enrolled & Verified'].map((st) => (
            <button
              key={st}
              onClick={() => setStageFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                stageFilter === st ? 'bg-[#58051E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </Card>

      {/* Main Consolidated Table */}
      <Card className="overflow-hidden border border-slate-200/70 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                <th className="py-3 px-4">Student & ID</th>
                <th className="py-3 px-4">Target University & Program</th>
                <th className="py-3 px-4">Process Journey Stage</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
                <th className="py-3 px-4 text-center">Document Status</th>
                <th className="py-3 px-4">Assigned Counselor</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs font-bold text-slate-400">
                    Loading consolidated student records from Supabase...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs font-bold text-slate-400">
                    No student records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#58051E] text-white font-black text-xs flex items-center justify-center shadow-xs">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900">
                            {student.name}
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-400">{student.displayId} · {student.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{student.targetUni}</div>
                      <div className="text-[10px] font-semibold text-slate-400">{student.course}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${student.stageBadge}`}>
                        {student.stage}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${student.paymentBadge}`}>
                        {student.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${student.docBadge}`}>
                        {student.docStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-slate-800">{student.counselor}</strong>
                        <button
                          onClick={() => {
                            setReassignModalStudent(student);
                            setSelectedCounselorName(student.counselor || (counselorsList[0]?.full_name || 'Rahul Mehta'));
                          }}
                          className="text-[10px] font-bold text-[#58051E] hover:underline cursor-pointer"
                        >
                          (Reassign)
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="View Full Student Journey & Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setReassignModalStudent(student);
                            setSelectedCounselorName(student.counselor || (counselorsList[0]?.full_name || 'Rahul Mehta'));
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Reassign Counselor"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id, student.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Permanently Remove Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reassign Counselor Modal */}
      <AnimatePresence>
        {reassignModalStudent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setReassignModalStudent(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-black text-slate-900">Reassign Student Counselor</h3>
                <button onClick={() => setReassignModalStudent(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4 text-xs">
                <p className="font-bold text-slate-700">Student: <span className="text-slate-900 font-extrabold">{reassignModalStudent.name}</span> ({reassignModalStudent.displayId})</p>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Select Admissions Counselor / Staff</label>
                  <select
                    value={selectedCounselorName}
                    onChange={(e) => setSelectedCounselorName(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {counselorsList.map((c: any) => (
                      <option key={c.id || c.email} value={c.full_name || c.name || c.email}>
                        {c.full_name || c.name || c.email} ({c.roleLabel || c.role || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setReassignModalStudent(null)}>Cancel</Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]"
                    onClick={handleConfirmReassign}
                  >
                    Confirm Reassignment
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Enroll New Student</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleAddStudent} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Student Full Name *</label>
                  <input type="text" required value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} placeholder="e.g. Vikram Sharma" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Email Address *</label>
                  <input type="email" required value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} placeholder="e.g. vikram@gmail.com" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Phone Number</label>
                  <input type="text" value={newStudent.phone} onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })} placeholder="e.g. +91 98765 43210" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Assigned Counselor</label>
                  <select value={newStudent.counselor} onChange={(e) => setNewStudent({ ...newStudent, counselor: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    {counselorsList.map((c: any) => (
                      <option key={c.id || c.email} value={c.full_name || c.name || c.email}>
                        {c.full_name || c.name || c.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Save & Enroll</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Student Drawer Detail View */}
      <AnimatePresence>
        {selectedStudent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedStudent(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <h3 className="text-sm font-black text-slate-900">Student File Inspector</h3>
                <button onClick={() => setSelectedStudent(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-5">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-[#58051E] text-white font-black text-base flex items-center justify-center">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900">{selectedStudent.name}</h4>
                    <p className="text-xs font-semibold text-slate-500">{selectedStudent.displayId} · {selectedStudent.email}</p>
                    <p className="text-xs font-semibold text-slate-400">{selectedStudent.phone}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Target Institution & Course</span>
                    <span className="text-xs font-black text-slate-900">{selectedStudent.targetUni}</span>
                    <span className="text-xs font-semibold text-slate-500 block mt-0.5">{selectedStudent.course}</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Admissions Process Stage</span>
                    <span className="text-xs font-black text-slate-900">{selectedStudent.stage}</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Tuition Fee Settlement</span>
                    <span className="text-xs font-black text-slate-900">{selectedStudent.paymentStatus}</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Document Audit Compliance</span>
                    <span className="text-xs font-black text-slate-900">{selectedStudent.docStatus}</span>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-0.5">Assigned Counselor</span>
                    <span className="text-xs font-black text-slate-900">{selectedStudent.counselor}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
