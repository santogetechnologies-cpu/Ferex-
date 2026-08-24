import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, RefreshCw, X, Trash2, CheckCircle2,
  Clock, FileText, Stamp, ChevronRight, ShieldCheck
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getStudents } from '../../lib/api/students';
import {
  getNawaRecords, createNawaRecord, updateNawaStep, deleteNawaRecord
} from '../../lib/api/nawa';
import type { NawaRecord } from '../../lib/api/nawa';
import type { UserProfile } from '../../lib/types';

export const AdminNawaTracker: React.FC = () => {
  const [records, setRecords] = useState<NawaRecord[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [toast, setToast] = useState('');

  // Modal state: Add Student
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [nawaRefNo, setNawaRefNo] = useState('');
  const [documentType, setDocumentType] = useState('High School Diploma & Transcripts');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal state: Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [recs, stds] = await Promise.all([getNawaRecords(), getStudents()]);
      setRecords(recs);
      setStudents(stds);
    } catch (e) {
      console.warn('Load NAWA data error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setSelectedStudentId(students[0]?.id || '');
    setNawaRefNo('');
    setDocumentType('High School Diploma & Transcripts');
    setNotes('');
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      showToast('Please select a student.');
      return;
    }

    try {
      setIsSubmitting(true);
      const studentObj = students.find(s => s.id === selectedStudentId);
      const newRec = await createNawaRecord({
        student_id: selectedStudentId,
        student_name: studentObj?.full_name || studentObj?.email?.split('@')[0] || 'Student',
        student_email: studentObj?.email,
        nawa_ref_no: nawaRefNo,
        document_type: documentType,
        notes: notes.trim() || 'Initiated NAWA legalization & sworn translation audit.',
      });

      setRecords(prev => [newRec, ...prev]);
      setShowAddModal(false);
      showToast(`Student ${newRec.student_name} added to NAWA Legalization process!`);
    } catch (err: any) {
      showToast(`Error adding student: ${err.message || 'Failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStepChange = async (id: string, step: number, status: NawaRecord['status']) => {
    try {
      const updated = await updateNawaStep(id, step, status);
      if (updated) {
        setRecords(prev => prev.map(r => r.id === id ? updated : r));
        showToast(`Updated NAWA process for ${updated.student_name} to Step ${step} (${status}).`);
      }
    } catch (e) {
      showToast('Failed to update step.');
    }
  };

  const handleDeleteRecord = async () => {
    if (!deleteId) return;
    try {
      await deleteNawaRecord(deleteId);
      const cleanId = deleteId.replace('nawa-app-', '').replace('nawa-std-', '');
      setRecords(prev => prev.filter(r => r.id !== deleteId && r.id !== cleanId && r.student_id !== cleanId));
      setDeleteId(null);
      showToast('🎉 NAWA record permanently removed from database.');
    } catch (e) {
      showToast('Could not remove record.');
    }
  };

  // Filtered dataset
  const filtered = records.filter(r => {
    const matchesSearch = !search ||
      r.student_name.toLowerCase().includes(search.toLowerCase()) ||
      r.nawa_ref_no.toLowerCase().includes(search.toLowerCase()) ||
      (r.student_email && r.student_email.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = records.length;
  const inReviewCount = records.filter(r => r.status === 'In Review' || r.status === 'Submitted').length;
  const approvedCount = records.filter(r => r.status === 'Approved').length;

  return (
    <div className="space-y-6 text-left">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-extrabold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">NAWA Legalization Portal</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#6A1B2E] text-white">
              POLISH ACADEMIC EXCHANGE
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Manage Polish NAWA degree recognition, sworn translations, apostille verification, and legalization certificates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
            title="Refresh NAWA Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button
            onClick={handleOpenAddModal}
            className="bg-[#6A1B2E] text-white hover:bg-[#521221] font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Initiate NAWA Process
          </Button>
        </div>
      </div>

      {/* Header Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total NAWA Files</span>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{totalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
              <Stamp className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Under Verification</span>
              <p className="text-2xl font-black text-amber-600 mt-0.5">{inReviewCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Approved & Legalized</span>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">{approvedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Directory Table */}
      <Card className="p-6 border border-slate-200/80 bg-white">
        <div className="border-b border-slate-100 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">NAWA Student Legalization Directory</h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Track application progress, update stage milestones, and issue recognition certificates.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student, email or NAWA ref..."
                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Submitted">Submitted</option>
              <option value="In Review">In Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-bold text-slate-400">Loading NAWA legalization records...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs font-bold text-slate-800">No NAWA records found.</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Click "+ Initiate NAWA Process" above to add a student to the NAWA legalization queue.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/60 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">NAWA Ref No</th>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4 text-center">Process Step</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {filtered.map((r, index) => {
                  const isApproved = r.status === 'Approved' || r.current_step === 4;

                  return (
                    <tr key={`${r.id}_${index}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-slate-900 font-black">
                        <div>
                          <p>{r.student_name}</p>
                          {r.student_email && <p className="text-[10px] font-medium text-slate-400">{r.student_email}</p>}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {r.nawa_ref_no}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 max-w-[200px]">
                        <p className="font-bold text-slate-900 truncate">{r.document_type}</p>
                        <p className="text-[10px] text-slate-400 truncate">{r.notes}</p>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <select
                          value={r.current_step}
                          onChange={(e) => handleStepChange(r.id, Number(e.target.value), Number(e.target.value) === 4 ? 'Approved' : 'In Review')}
                          className="px-2.5 py-1 rounded-lg text-[10.5px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200 cursor-pointer"
                        >
                          <option value={1}>Step 1: Translation Audit</option>
                          <option value={2}>Step 2: NAWA Submission</option>
                          <option value={3}>Step 3: Board Verification</option>
                          <option value={4}>Step 4: Legalized & Issued</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        <select
                          value={r.status}
                          onChange={(e) => handleStepChange(r.id, r.current_step, e.target.value as NawaRecord['status'])}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border cursor-pointer ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : r.status === 'Rejected'
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <option value="Submitted">Submitted</option>
                          <option value="In Review">In Review</option>
                          <option value="Approved">✓ NAWA Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {r.submission_date}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {r.current_step < 4 && (
                            <button
                              onClick={() => handleStepChange(r.id, r.current_step + 1, r.current_step + 1 === 4 ? 'Approved' : 'In Review')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black shadow-3xs flex items-center gap-1 active:scale-95 transition-transform"
                            >
                              Step {r.current_step + 1} <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteId(r.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Student to NAWA Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-black">
                    <Stamp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Add Student to NAWA Legalization</h3>
                    <p className="text-[10.5px] text-slate-400 font-semibold">Initiate Polish academic degree recognition & apostille tracking</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Select Student *</label>
                  <select
                    required
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name || s.email} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">NAWA Application Ref No *</label>
                  <input
                    type="text"
                    required
                    value={nawaRefNo}
                    onChange={(e) => setNawaRefNo(e.target.value)}
                    placeholder="e.g. NAWA/POL/2026/8941"
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Document Category *</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="High School Diploma & Transcripts">High School Diploma & Transcripts</option>
                    <option value="Bachelor Degree & Transcripts">Bachelor Degree & Transcripts</option>
                    <option value="Master Degree Certificate">Master Degree Certificate</option>
                    <option value="Apostilled MEA Legalization Certificates">Apostilled MEA Legalization Certificates</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Sworn Translation & Audit Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter briefing notes regarding sworn Polish translation, Ministry apostille, or NAWA review..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="text-xs font-bold h-9">Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} className="bg-[#6A1B2E] text-white hover:bg-[#521221] text-xs font-bold h-9 px-5">
                    {isSubmitting ? 'Adding Student...' : 'Initiate NAWA Tracking'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setDeleteId(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 z-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto font-black">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Remove NAWA Record?</h3>
                <p className="text-xs font-semibold text-slate-400 mt-1">This will remove this student from the active NAWA tracking queue.</p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} className="text-xs font-bold">Cancel</Button>
                <Button size="sm" onClick={handleDeleteRecord} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold">Yes, Remove</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
