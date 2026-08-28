import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle2, Lock, Eye, X, FileText } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getStudents } from '../../lib/api/students';

export const StaffStudents: React.FC = () => {
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await getStudents();
      setStudents(data);
      setLoading(false);
    };
    loadData();
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div className="space-y-6 text-left antialiased select-none">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6A1B2E]" /> Assigned Student Profiles
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Enterprise view of student university applications, visa progression, and document audit trails.</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-bold">
          <Lock className="w-3.5 h-3.5" /> Read-Only Financial Data Scope
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading assigned students...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {students.map(student => {
            const stuName = student.full_name || student.name || 'Student Candidate';
            const stuId = student.id;
            const country = student.country || 'Poland';
            const uni = student.target_university || 'Vistula University';
            const course = student.target_course || 'BSc International Relations';
            const status = student.status || 'Application Submitted';
            const completion = 85;

            return (
              <Card key={student.id} className="p-6 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🇵🇱</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-900">{stuName}</h3>
                        <span className="text-[10px] font-black uppercase text-[#6A1B2E] bg-[#6A1B2E]/10 px-2.5 py-0.5 rounded-full border border-[#6A1B2E]/20">{stuId.slice(0, 8)}</span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Verified Profile</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">{uni} • {course}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 block">{status}</span>
                    <span className="text-[10.5px] font-bold text-slate-400 mt-1 block">Application Completion: {completion}%</span>
                  </div>
                </div>

                {/* Application Completion Bar */}
                <div className="space-y-1">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-2 rounded-full bg-[#6A1B2E]" style={{ width: `${completion}%` }} />
                  </div>
                </div>

                {/* Document Chips & Read-Only Payment */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-semibold text-slate-600">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Payment Record (Read Only)</span>
                    <span className="font-black text-slate-900 block">Ledger Verified</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 md:col-span-2">
                    <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Verified Document Vault</span>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {['Passport Scan', 'Academic Transcripts', 'SOP Statement'].map((doc, idx) => (
                        <span key={idx} className="text-[10.5px] font-bold bg-white text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-[#6A1B2E]" /> {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold">
                  <span className="text-slate-400">Restricted Staff Access Level</span>
                  <button onClick={() => setSelectedStudent({ name: stuName, id: stuId, country, uni, course, status, notes: 'Assigned counselor review in progress.' })} className="text-[#6A1B2E] font-black hover:underline flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Inspect Timeline & Audit Logs →
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Profile Inspection Drawer */}
      <AnimatePresence>
        {selectedStudent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedStudent(null)} />
            <motion.div initial={{ translateX: '100%' }} animate={{ translateX: 0 }} exit={{ translateX: '100%' }} transition={{ duration: 0.25 }} className="fixed top-0 right-0 h-screen w-full max-w-md bg-white z-50 shadow-2xl p-6 overflow-y-auto space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">{selectedStudent.name} ({selectedStudent.id})</h3>
                <button onClick={() => setSelectedStudent(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs font-semibold">
                <p>Country: <span className="font-bold text-slate-900">{selectedStudent.flag} {selectedStudent.country}</span></p>
                <p>University: <span className="font-bold text-slate-900">{selectedStudent.uni}</span></p>
                <p>Course: <span className="font-bold text-slate-900">{selectedStudent.course}</span></p>
                <p>Status: <span className="font-bold text-emerald-700">{selectedStudent.status}</span></p>
                <p>Advisor Notes: <span className="font-bold text-slate-800">{selectedStudent.notes}</span></p>
              </div>

              <Button size="sm" className="w-full bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => { showToast(`Note added to ${selectedStudent.name}`); setSelectedStudent(null); }}>
                Add Official Advisory Note
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
