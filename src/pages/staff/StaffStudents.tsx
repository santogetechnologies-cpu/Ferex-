import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle2, Eye, X, FileText, GraduationCap,
  Search, ShieldCheck, Plane, Building2, Clock, AlertCircle,
  Send, RotateCcw, Phone, Mail, MapPin, UserCheck
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { getStudents } from '../../lib/api/students';
import { getApplications } from '../../lib/api/applications';
import { getDocumentsForAdmin } from '../../lib/api/documents';
import { getVisaRecords } from '../../lib/api/visa';
import { getPreDepartureRecords } from '../../lib/api/preDeparture';
import { createNotification } from '../../lib/api/notifications';

interface StudentJourneyData {
  student: any;
  applications: any[];
  documents: any[];
  visaRecord: any | null;
  preDepartureRecord: any | null;
}

export const StaffStudents: React.FC = () => {
  const { user, profile } = useAuth();
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [students, setStudents] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [visaRecords, setVisaRecords] = useState<any[]>([]);
  const [preDepRecords, setPreDepRecords] = useState<any[]>([]);

  const [scopeFilter, setScopeFilter] = useState<'assigned' | 'all'>('assigned');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJourney, setSelectedJourney] = useState<StudentJourneyData | null>(null);
  const [counselorNoteInput, setCounselorNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const staffName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admissions Counselor';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stds, apps, docs, visas, predeps] = await Promise.all([
        getStudents(),
        getApplications(),
        getDocumentsForAdmin(),
        getVisaRecords(),
        getPreDepartureRecords(),
      ]);
      setStudents(stds || []);
      setApplications(apps || []);
      setDocuments(docs || []);
      setVisaRecords(visas || []);
      setPreDepRecords(predeps || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load students from Supabase database');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    window.addEventListener('ferex_students_change', loadAllData);
    window.addEventListener('ferex_application_change', loadAllData);
    window.addEventListener('ferex_docs_change', loadAllData);
    return () => {
      window.removeEventListener('ferex_students_change', loadAllData);
      window.removeEventListener('ferex_application_change', loadAllData);
      window.removeEventListener('ferex_docs_change', loadAllData);
    };
  }, []);

  // Filter students based on assignment
  const myAssignedStudents = useMemo(() => {
    return students.filter(s => {
      if (!s.assigned_counselor) return false;
      const c = s.assigned_counselor.toLowerCase().trim();
      const meName = staffName.toLowerCase().trim();
      const meEmail = (user?.email || '').toLowerCase().trim();
      const mePrefix = meEmail.split('@')[0];
      return (
        c === meName ||
        c.includes(meName) ||
        meName.includes(c) ||
        (mePrefix && c.includes(mePrefix)) ||
        c === user?.id
      );
    });
  }, [students, staffName, user?.email, user?.id]);

  const displayedStudents = useMemo(() => {
    const list = scopeFilter === 'assigned' ? myAssignedStudents : students;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;

    return list.filter(s => {
      const name = (s.full_name || s.name || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      const uni = (s.target_university || '').toLowerCase();
      const country = (s.target_country || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || uni.includes(q) || country.includes(q);
    });
  }, [scopeFilter, myAssignedStudents, students, searchQuery]);

  // Open journey modal for a student
  const handleOpenJourney = (student: any) => {
    const sId = student.id;
    const sEmail = (student.email || '').toLowerCase().trim();
    const sName = (student.full_name || student.name || '').toLowerCase().trim();

    const studentApps = applications.filter(a =>
      a.student_id === sId ||
      (sEmail && a.student_email && a.student_email.toLowerCase() === sEmail)
    );

    const studentDocs = documents.filter(d =>
      d.student_id === sId ||
      (sEmail && (d as any).student_email && (d as any).student_email.toLowerCase() === sEmail)
    );

    const studentVisa = visaRecords.find(v =>
      v.student_id === sId ||
      (sEmail && (v as any).student_email && (v as any).student_email.toLowerCase() === sEmail) ||
      (sName && v.student_name && v.student_name.toLowerCase() === sName)
    ) || null;

    const studentPreDep = preDepRecords.find(p =>
      p.student_id === sId ||
      (sEmail && p.student_email && p.student_email.toLowerCase() === sEmail) ||
      (sName && p.student_name && p.student_name.toLowerCase() === sName)
    ) || null;

    setSelectedJourney({
      student,
      applications: studentApps,
      documents: studentDocs,
      visaRecord: studentVisa,
      preDepartureRecord: studentPreDep,
    });
  };

  // Dispatch advisory directive via Supabase notifications (zero localStorage!)
  const handleSendDirective = async () => {
    if (!counselorNoteInput.trim() || !selectedJourney?.student?.id) return;
    try {
      setIsSavingNote(true);
      const studentId = selectedJourney.student.id;
      const studentName = selectedJourney.student.full_name || selectedJourney.student.email?.split('@')[0] || 'Student';

      await createNotification({
        user_id: studentId,
        title: `Admissions Counselor Directive from ${staffName}`,
        body: counselorNoteInput.trim(),
        category: 'Counselor Advisory',
      });

      showToast(`Admissions directive dispatched to ${studentName} via Supabase.`);
      setCounselorNoteInput('');
    } catch (err: any) {
      showToast(`Error dispatching advisory: ${err.message || 'Failed'}`);
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="space-y-6 text-left antialiased select-none font-sans">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2.5 py-0.5 rounded-md border border-[#58051E]/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#58051E]" /> ADMISSIONS COUNSELING DESK
            </span>
            <span className="text-[10px] font-bold text-slate-400">● Realtime Education Records</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#58051E]" /> Assigned Students
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Student applicant profiles, university choices, submitted documents, and counseling advisory directives.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={loadAllData}
            disabled={loading}
            className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#58051E]' : ''}`} />
            Refresh Directory
          </Button>
        </div>
      </div>

      {/* Toolbar & Filter Tabs */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Scope Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setScopeFilter('assigned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scopeFilter === 'assigned'
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'
              }`}
            >
              My Assigned Students ({myAssignedStudents.length})
            </button>
            <button
              onClick={() => setScopeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scopeFilter === 'all'
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Education Applicants ({students.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, target..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
            />
          </div>
        </div>
      </Card>

      {/* Database Error State with Retry Button */}
      {error && (
        <Card className="p-6 border border-red-200 bg-red-50/40 shadow-xs text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-red-900">Database Connection Notice</h3>
            <p className="text-xs font-semibold text-red-700 mt-1 max-w-md mx-auto leading-relaxed">
              {error}
            </p>
          </div>
          <Button
            size="sm"
            onClick={loadAllData}
            className="bg-[#58051E] text-white hover:bg-[#430316] font-bold text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Retry Connection
          </Button>
        </Card>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-5 border border-slate-200/80 shadow-xs animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State — Strictly no mock fallback */}
      {!loading && !error && displayedStudents.length === 0 && (
        <Card className="p-12 border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">No students found</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {scopeFilter === 'assigned'
                ? 'No students are currently assigned to your counselor account. Switch to "All Education Applicants" or wait for assignment.'
                : 'No student records exist in the database yet.'}
            </p>
          </div>
        </Card>
      )}

      {/* Real Students Table */}
      {!loading && !error && displayedStudents.length > 0 && (
        <Card className="border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Target Destination</th>
                  <th className="py-3 px-4">Assigned Counselor</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {displayedStudents.map(std => {
                  const name = std.full_name || std.name || std.email?.split('@')[0] || 'Student Candidate';
                  const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'ST';
                  const isAssignedToMe = myAssignedStudents.some(s => s.id === std.id);

                  return (
                    <tr key={std.id} className="hover:bg-slate-50/70 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#58051E]/10 text-[#58051E] font-black flex items-center justify-center text-xs shrink-0 border border-[#58051E]/20">
                            {initials}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight">{name}</span>
                            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">ID: {std.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{std.email || '—'}</span>
                          </div>
                          {std.phone && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{std.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">
                          {std.target_country || std.country || 'International'}
                        </span>
                        <span className="text-[10.5px] text-slate-400 font-medium block">
                          {std.target_university || 'University to be finalized'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isAssignedToMe ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <UserCheck className="w-3 h-3 text-emerald-600" /> Assigned to You
                          </span>
                        ) : std.assigned_counselor ? (
                          <span className="text-[11px] font-bold text-slate-600">
                            {std.assigned_counselor}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenJourney(std)}
                          className="text-xs font-bold text-[#58051E] border-[#58051E]/30 hover:bg-[#58051E]/5"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Profile & Journey
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Student Profile & Journey Detail Modal */}
      <AnimatePresence>
        {selectedJourney && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900 z-50"
              onClick={() => setSelectedJourney(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl p-6 shadow-2xl space-y-5 overflow-y-auto text-left"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#58051E] text-white font-black flex items-center justify-center text-sm shadow-xs">
                    {(selectedJourney.student.full_name || 'ST').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {selectedJourney.student.full_name || selectedJourney.student.email}
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Admissions Journey & Dossier • Student ID: {selectedJourney.student.id.slice(0, 8)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedJourney(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Email</span>
                  <span className="font-bold text-slate-800 break-all">{selectedJourney.student.email || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Phone</span>
                  <span className="font-bold text-slate-800">{selectedJourney.student.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Target Country</span>
                  <span className="font-bold text-slate-800">{selectedJourney.student.target_country || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Target University</span>
                  <span className="font-bold text-slate-800">{selectedJourney.student.target_university || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Target Degree</span>
                  <span className="font-bold text-slate-800">{selectedJourney.student.target_degree || 'Bachelors / Masters'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Counselor Assigned</span>
                  <span className="font-bold text-emerald-700">{selectedJourney.student.assigned_counselor || 'Unassigned'}</span>
                </div>
              </div>

              {/* Real Applications Submitted */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-blue-600" /> Real Applications ({selectedJourney.applications.length})
                </h4>
                {selectedJourney.applications.length === 0 ? (
                  <p className="text-xs font-semibold text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    No applications submitted by this student yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedJourney.applications.map(app => (
                      <div key={app.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-black text-slate-900 block">{app.university_name || 'University Application'}</span>
                          <span className="text-[11px] text-slate-500 font-medium block">{app.program_name || 'Degree Course'} • Intake: {app.intake || '2026'}</span>
                        </div>
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {app.status || 'Submitted'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Real Documents Uploaded */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600" /> Student Documents ({selectedJourney.documents.length})
                </h4>
                {selectedJourney.documents.length === 0 ? (
                  <p className="text-xs font-semibold text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    No documents uploaded by this student yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedJourney.documents.map(doc => (
                      <div key={doc.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div className="truncate mr-2">
                          <span className="font-bold text-slate-800 block truncate">{doc.file_name || doc.doc_type || 'Document'}</span>
                          <span className="text-[10px] text-slate-400 block">{doc.doc_type || 'Academic File'}</span>
                        </div>
                        <span className={`text-[9.5px] font-black px-2 py-0.5 rounded border shrink-0 ${
                          String(doc.status).toLowerCase().includes('verified') || String(doc.status).toLowerCase().includes('approved')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {doc.status || 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Counselor Directive / Advisory Dispatcher (Supabase Realtime) */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-[#58051E]" /> Dispatch Counselor Advisory & Follow-Up
                </h4>
                <p className="text-[11px] font-semibold text-slate-400">
                  Sends an official admissions directive directly to the student's portal notification inbox via Supabase.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={counselorNoteInput}
                    onChange={e => setCounselorNoteInput(e.target.value)}
                    placeholder="e.g. Please upload notarized bank solvency certificate by Friday..."
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendDirective}
                    disabled={isSavingNote || !counselorNoteInput.trim()}
                    className="bg-[#58051E] hover:bg-[#430316] text-white font-black text-xs shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    {isSavingNote ? 'Dispatching...' : 'Dispatch'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
