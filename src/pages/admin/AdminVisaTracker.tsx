import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, User, Save, Sparkles, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useStudents } from '../../hooks/useStudents';
import { getApplications, updateApplicationStatus } from '../../lib/api/applications';
import { useVisa } from '../../hooks/useVisa';
import { generateUUID } from '../../utils/uuid';

export const AdminVisaTracker: React.FC = () => {
  const { students } = useStudents();
  const { records, saveVisaUpdate } = useVisa();

  // Selected student state
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [toast, setToast] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form fields for selected student VFS tracker
  const [vfsRefNo, setVfsRefNo] = useState('');
  const [embassyName, setEmbassyName] = useState('Embassy of the Republic of Poland, New Delhi');
  const [vfsCenter, setVfsCenter] = useState('VFS Global Center, Kochi / Mumbai');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [passportNo, setPassportNo] = useState('');
  const [courierTrackingNo, setCourierTrackingNo] = useState('');
  const [currentStage, setCurrentStage] = useState<number>(1);
  const [notes, setNotes] = useState('');

  const [decisionOutcome, setDecisionOutcome] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');



  // Load record when selected student changes
  useEffect(() => {
    if (!selectedStudentId) return;
    const studentObj = students.find(s => s.id === selectedStudentId);
    const sName = studentObj?.full_name || studentObj?.email?.split('@')[0] || 'Student';
    const existingRec = records.find(r => r.student_id === selectedStudentId || (r.student_name && r.student_name.toLowerCase() === sName.toLowerCase()));

    if (existingRec) {
      setVfsRefNo(existingRec.vfs_ref_no || '');
      setEmbassyName(existingRec.embassy_name || 'Embassy of Poland');
      setVfsCenter(existingRec.vfs_center || 'VFS Global Center');
      setAppointmentDate(existingRec.appointment_date || '');
      setPassportNo(existingRec.passport_no || 'Z-8901240');
      setCourierTrackingNo(existingRec.courier_tracking_no || '');
      setCurrentStage(existingRec.current_stage || 1);
      setNotes(existingRec.notes || '');
      setDecisionOutcome(
        existingRec.decision_outcome ||
        (existingRec.status_label?.toLowerCase().includes('approv') ? 'Approved' :
         existingRec.status_label?.toLowerCase().includes('reject') || existingRec.status_label?.toLowerCase().includes('refus') ? 'Rejected' : 'Pending')
      );
    } else {
      // Clean defaults for new student selection
      setVfsRefNo(`VFS-POL-2026-${Math.floor(10000 + Math.random() * 90000)}`);
      setEmbassyName('Embassy of the Republic of Poland, New Delhi');
      setVfsCenter('VFS Global Center, Kochi / Mumbai');
      setAppointmentDate(new Date().toISOString().split('T')[0]);
      setPassportNo('Z-8901240');
      setCourierTrackingNo('');
      setCurrentStage(1);
      setNotes('VFS appointment slot allocated. Awaiting document submission.');
      setDecisionOutcome('Pending');
    }
  }, [selectedStudentId, records, students]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleSaveVfs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    const studentObj = students.find(s => s.id === selectedStudentId);
    const sName = studentObj?.full_name || studentObj?.email?.split('@')[0] || 'Student';

    const stagesMap: Record<number, string> = {
      1: 'VFS Appointment Booked',
      2: 'Documents Submitted at VFS',
      3: 'Under Verification at Embassy',
      4: 'Visa Decision Sealed in Envelope',
      5: 'Passport Dispatched via Courier',
      6: 'Passport Received & Verdict Confirmed',
    };

    try {
      setIsSaving(true);
      const existingRec = records.find(r => r.student_id === selectedStudentId || (r.student_name && r.student_name.toLowerCase() === sName.toLowerCase()));
      const recId = existingRec ? existingRec.id : generateUUID();
      const statusLabel = decisionOutcome === 'Approved'
        ? 'Visa Approved & Stamped'
        : decisionOutcome === 'Rejected'
        ? 'Visa Application Refused by Embassy'
        : (stagesMap[currentStage] || 'VFS Processing');

      await saveVisaUpdate(recId, {
        student_id: selectedStudentId,
        student_name: sName,
        vfs_ref_no: vfsRefNo,
        embassy_name: embassyName,
        vfs_center: vfsCenter,
        appointment_date: appointmentDate,
        passport_no: passportNo,
        courier_tracking_no: courierTrackingNo,
        current_stage: currentStage,
        status_label: statusLabel,
        decision_outcome: decisionOutcome,
        notes: notes,
      });

      showToast(`🎉 VFS Visa status & ${decisionOutcome} verdict saved for ${sName}!`);
      setSelectedStudentId('');

      if (decisionOutcome === 'Approved') {
        try {
          const studentApps = await getApplications(selectedStudentId);
          const activeApp = studentApps.find(a =>
            a.status !== 'Rejected' &&
            a.status !== 'Withdrawn' &&
            a.status !== 'Closed' &&
            a.status !== 'Approved'
          );
          if (activeApp) {
            await updateApplicationStatus(activeApp.id, 'Approved', 'Visa approved! Application auto-promoted to Approved status.');
          }
        } catch (e) {
          console.warn('Failed to auto-update student application to Approved:', e);
        }
      }
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to save VFS status'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdminResetToStage2 = async () => {
    if (!selectedStudentId) return;
    const studentObj = students.find(s => s.id === selectedStudentId);
    const sName = studentObj?.full_name || studentObj?.email?.split('@')[0] || 'Student';

    try {
      setIsSaving(true);
      const existingRec = records.find(r => r.student_id === selectedStudentId || (r.student_name && r.student_name.toLowerCase() === sName.toLowerCase()));
      const recId = existingRec ? existingRec.id : generateUUID();

      setCurrentStage(2);
      setDecisionOutcome('Pending');
      const newNotes = 'Re-appeal application packet and justification letter submitted at VFS Global center.';
      setNotes(newNotes);

      await saveVisaUpdate(recId, {
        student_id: selectedStudentId,
        student_name: sName,
        current_stage: 2,
        status_label: 'Re-appeal Submitted at VFS (Cycle 2)',
        decision_outcome: 'Pending',
        notes: newNotes
      });

      showToast(`🔄 Re-appeal initiated! ${sName} VFS stage reset back to Stage 2.`);
      setSelectedStudentId('');
    } catch (err: any) {
      showToast(`Notice: Updated locally for ${sName}`);
    } finally {
      setIsSaving(false);
    }
  };

  const activeStudent = students.find(s => s.id === selectedStudentId);
  const activeStudentName = activeStudent?.full_name || activeStudent?.email?.split('@')[0] || 'Student';

  return (
    <div className="space-y-6 text-left relative min-h-[600px]">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </span>
            VFS & Embassy Visa Management
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Select an enrolled student to update their VFS Global appointment slots, embassy stage, and official visa verdict.
          </p>
        </div>
      </div>

      {/* Edit Form Drawer for Selected Student */}
      <AnimatePresence>
        {activeStudent && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudentId('')}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50"
            />

            {/* Slide-over Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white z-50 shadow-2xl border-l border-slate-100 flex flex-col justify-between text-left"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-base font-black text-slate-950">VFS Status Config: {activeStudentName}</h3>
                  <span className="text-xs font-semibold text-slate-400">Registered Account: {activeStudent.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  {decisionOutcome === 'Rejected' && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAdminResetToStage2}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-lg shadow-xs"
                    >
                      🔄 Re-appeal (Reset to Stage 2)
                    </Button>
                  )}
                  <button
                    onClick={() => setSelectedStudentId('')}
                    className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 flex-1 space-y-6 overflow-y-auto">
                <form onSubmit={handleSaveVfs} className="space-y-6">
                  {/* Interactive Visual Timeline for VFS Stages */}
                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100/80 space-y-3">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                      Quick-Select Processing Stage (Click milestone to update)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { num: 1, label: '1. Appt Booked' },
                        { num: 2, label: '2. Submitted VFS' },
                        { num: 3, label: '3. Embassy Review' },
                        { num: 4, label: '4. Verdict Sealed' },
                        { num: 5, label: '5. Courier Dispatch' },
                        { num: 6, label: '6. Verdict Confirmed' },
                      ].map((st) => {
                        const isActive = currentStage === st.num;
                        return (
                          <button
                            key={st.num}
                            type="button"
                            onClick={() => {
                              setCurrentStage(st.num);
                              if (st.num !== 6) {
                                setDecisionOutcome('Pending');
                              }
                            }}
                            className={`py-2 px-3 rounded-xl text-[10px] font-black border transition-all text-center flex items-center justify-center min-h-[44px] ${
                              isActive
                                ? 'bg-[#6A1B2E] text-white border-[#6A1B2E] shadow-sm scale-[1.02]'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <span>{st.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">Consular Processing Stage</label>
                      <select
                        value={currentStage}
                        onChange={(e) => setCurrentStage(Number(e.target.value))}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
                      >
                        <option value={1}>Stage 1 — VFS Appointment Booked</option>
                        <option value={2}>Stage 2 — Documents Submitted at VFS (Re-file Start)</option>
                        <option value={3}>Stage 3 — Under Verification at Embassy</option>
                        <option value={4}>Stage 4 — Visa Decision Sealed in Envelope</option>
                        <option value={5}>Stage 5 — Passport Dispatched via Courier (In Transit)</option>
                        <option value={6}>Stage 6 — Passport Received & Verdict Confirmed (Verdict Unsealed)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                        Agency Visa Verdict (Revealed to Student in Portal)
                      </label>
                      <select
                        value={decisionOutcome}
                        onChange={(e) => {
                          const val = e.target.value as 'Pending' | 'Approved' | 'Rejected';
                          setDecisionOutcome(val);
                          if (val !== 'Pending') {
                            setCurrentStage(6);
                          }
                        }}
                        className={`w-full h-10 px-3 border rounded-xl text-xs font-black focus:outline-none ${
                          decisionOutcome === 'Approved'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : decisionOutcome === 'Rejected'
                            ? 'bg-red-50 border-red-300 text-red-800'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <option value="Pending">⌛ Pending Verdict</option>
                        <option value="Approved">🎉 Approved & Stamped</option>
                        <option value="Rejected">❌ Rejected / Refused</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">VFS Reference Number</label>
                      <input
                        type="text"
                        value={vfsRefNo}
                        onChange={(e) => setVfsRefNo(e.target.value)}
                        placeholder="e.g. POL/DEL/26/0812/01"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Appointment & Submission Date</label>
                      <input
                        type="date"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Embassy / Consulate Name</label>
                      <input
                        type="text"
                        value={embassyName}
                        onChange={(e) => setEmbassyName(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">VFS Application Center Office</label>
                      <input
                        type="text"
                        value={vfsCenter}
                        onChange={(e) => setVfsCenter(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Passport Number</label>
                      <input
                        type="text"
                        value={passportNo}
                        onChange={(e) => setPassportNo(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Courier Airway Tracking Number</label>
                      <input
                        type="text"
                        value={courierTrackingNo}
                        onChange={(e) => setCourierTrackingNo(e.target.value)}
                        placeholder="e.g. BLUEDART-89041256"
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">Counselor Briefing Notes for Student</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      placeholder="Add notes for student..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedStudentId('')}
                      className="h-10 text-xs font-bold px-4"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="h-10 bg-[#6A1B2E] text-white hover:bg-[#521221] font-bold text-xs px-5"
                    >
                      <Save className="w-4 h-4 mr-1.5" /> {isSaving ? 'Saving...' : 'Save VFS Status'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* VFS Status Summary Directory */}
      <Card className="p-6 border border-slate-200/80 bg-white">
        <div className="border-b border-slate-100 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">All Students VFS Visa Statuses</h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Overview of VFS and Embassy status across all registered applicants.</p>
          </div>
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, ref no, or status..."
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/60 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">VFS Reference</th>
                <th className="py-3 px-4">Consular Embassy</th>
                <th className="py-3 px-4 text-center">Stage</th>
                <th className="py-3 px-4">Status Label</th>
                <th className="py-3 px-4">Visa Verdict</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.filter(rec =>
                !searchQuery ||
                rec.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                rec.vfs_ref_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                rec.embassy_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                rec.status_label?.toLowerCase().includes(searchQuery.toLowerCase())
              ).length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                    No matching VFS Visa records found.
                  </td>
                </tr>
              ) : (
                records.filter(rec =>
                  !searchQuery ||
                  rec.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  rec.vfs_ref_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  rec.embassy_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  rec.status_label?.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((rec) => {
                  const decision = rec.decision_outcome ||
                    (rec.status_label?.toLowerCase().includes('approv') ? 'Approved' :
                     rec.status_label?.toLowerCase().includes('reject') || rec.status_label?.toLowerCase().includes('refus') ? 'Rejected' : 'Pending');

                  return (
                    <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-all font-semibold">
                      <td className="py-3.5 px-4 text-slate-950 font-black">
                        {rec.student_name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] text-slate-600 bg-slate-50/80 px-2.5 py-1 rounded-lg">
                          {rec.vfs_ref_no || 'Pending'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-[180px] truncate">
                        {rec.embassy_name}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        Stage {rec.current_stage || 1} of 6
                      </td>
                      <td className="py-3.5 px-4 text-[#6A1B2E] font-extrabold">
                        {rec.status_label}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          decision === 'Approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : decision === 'Rejected'
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {decision}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (rec.student_id) setSelectedStudentId(rec.student_id);
                          }}
                          className="h-8 font-black text-[10px]"
                        >
                          Select & Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
