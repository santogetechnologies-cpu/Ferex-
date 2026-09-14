import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle2, Lock, Eye, X, FileText, GraduationCap,
  Sparkles, Search, Compass, ShieldCheck, Plane, Building,
  Clock, AlertCircle, Send, CheckSquare, Calendar, ChevronRight
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getStudents } from '../../lib/api/students';
import { getApplications } from '../../lib/api/applications';
import { getDocumentsForAdmin } from '../../lib/api/documents';
import { getVisaRecords } from '../../lib/api/visa';
import { getNawaRecords } from '../../lib/api/nawa';
import { getPreDepartureRecords } from '../../lib/api/preDeparture';
import { createNotification } from '../../lib/api/notifications';

interface StudentJourneyData {
  student: any;
  applications: any[];
  documents: any[];
  visaRecord: any | null;
  nawaRecord: any | null;
  preDepartureRecord: any | null;
}

export const StaffStudents: React.FC = () => {
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [visaRecords, setVisaRecords] = useState<any[]>([]);
  const [nawaRecords, setNawaRecords] = useState<any[]>([]);
  const [preDepRecords, setPreDepRecords] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJourney, setSelectedJourney] = useState<StudentJourneyData | null>(null);
  const [counselorNoteInput, setCounselorNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'applied' | 'visa' | 'predeparture'>('all');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [stds, apps, docs, visas, nawas, predeps] = await Promise.all([
        getStudents(),
        getApplications(),
        getDocumentsForAdmin(),
        getVisaRecords(),
        getNawaRecords(),
        getPreDepartureRecords(),
      ]);
      setStudents(stds || []);
      setApplications(apps || []);
      setDocuments(docs || []);
      setVisaRecords(visas || []);
      setNawaRecords(nawas || []);
      setPreDepRecords(predeps || []);
    } catch (err) {
      console.warn('Error fetching staff student journey data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    window.addEventListener('ferex_application_change', loadAllData);
    window.addEventListener('ferex_visa_change', loadAllData);
    window.addEventListener('ferex_nawa_change', loadAllData);
    window.addEventListener('ferex_docs_change', loadAllData);
    return () => {
      window.removeEventListener('ferex_application_change', loadAllData);
      window.removeEventListener('ferex_visa_change', loadAllData);
      window.removeEventListener('ferex_nawa_change', loadAllData);
      window.removeEventListener('ferex_docs_change', loadAllData);
    };
  }, []);

  // Build full journey data per student
  const studentJourneys = useMemo(() => {
    return students.map(s => {
      const sId = s.id;
      const sEmail = (s.email || '').toLowerCase().trim();
      const sName = (s.full_name || '').toLowerCase().trim();

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

      const studentNawa = nawaRecords.find(n =>
        n.student_id === sId ||
        (sEmail && (n as any).student_email && (n as any).student_email.toLowerCase() === sEmail) ||
        (sName && n.student_name && n.student_name.toLowerCase() === sName)
      ) || null;

      const studentPreDep = preDepRecords.find(p =>
        p.student_id === sId ||
        (sEmail && p.student_email && p.student_email.toLowerCase() === sEmail) ||
        (sName && p.student_name && p.student_name.toLowerCase() === sName)
      ) || null;

      return {
        student: s,
        applications: studentApps,
        documents: studentDocs,
        visaRecord: studentVisa,
        nawaRecord: studentNawa,
        preDepartureRecord: studentPreDep,
      };
    });
  }, [students, applications, documents, visaRecords, nawaRecords, preDepRecords]);

  // Filtered journeys based on search & tab
  const filteredJourneys = useMemo(() => {
    return studentJourneys.filter(item => {
      const s = item.student;
      const name = (s.full_name || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const uni = (item.applications[0]?.university_name || s.target_university || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || name.includes(q) || email.includes(q) || uni.includes(q);
      if (!matchesSearch) return false;

      if (activeTab === 'applied') {
        return item.applications.length > 0;
      }
      if (activeTab === 'visa') {
        return item.visaRecord !== null || item.applications.some(a => String(a.status || '').includes('Visa'));
      }
      if (activeTab === 'predeparture') {
        return item.preDepartureRecord !== null || item.visaRecord?.decision_outcome === 'Approved';
      }
      return true;
    });
  }, [studentJourneys, searchQuery, activeTab]);

  const handleSendDirective = async () => {
    if (!counselorNoteInput.trim() || !selectedJourney?.student?.id) return;
    try {
      setIsSavingNote(true);
      const studentId = selectedJourney.student.id;
      const studentName = selectedJourney.student.full_name || selectedJourney.student.email?.split('@')[0] || 'Student';

      await createNotification({
        user_id: studentId,
        title: 'Admissions Counselor Directive & Advisory',
        body: counselorNoteInput.trim(),
        category: 'Counselor Session'
      });

      // Also persist to local notes log
      try {
        const key = `ferex_counselor_notes_${studentId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.unshift({
          id: Date.now().toString(),
          date: new Date().toISOString(),
          note: counselorNoteInput.trim(),
          counselor: 'Senior Admissions Counselor'
        });
        localStorage.setItem(key, JSON.stringify(existing));
      } catch {}

      showToast(`Admissions directive dispatched & logged for ${studentName}!`);
      setCounselorNoteInput('');
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to dispatch directive'}`);
    } finally {
      setIsSavingNote(false);
    }
  };

  const getSavedCounselorNotes = (studentId: string) => {
    try {
      const raw = localStorage.getItem(`ferex_counselor_notes_${studentId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-6 text-left antialiased select-none pb-12">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#58051E]/10 text-[#58051E] text-[10.5px] font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Admissions Counselor Operations Desk
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#58051E]" /> Student Caseload & Journey Hub
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Complete lifecycle monitoring across Profile, Documents Vault, University Applications, Legalization, Visa Tracker, and Pre-Departure.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold shrink-0">
          <Lock className="w-3.5 h-3.5 text-amber-600" />
          <span>Read-Only Financial Scope</span>
        </div>
      </div>

      {/* Search & Tabs Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search students by name, email, or target university..."
            className="w-full h-10 pl-9 pr-3.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all' ? 'bg-[#58051E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Students ({studentJourneys.length})
          </button>
          <button
            onClick={() => setActiveTab('applied')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'applied' ? 'bg-[#58051E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Applications Active
          </button>
          <button
            onClick={() => setActiveTab('visa')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'visa' ? 'bg-[#58051E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Visa In-Progress
          </button>
          <button
            onClick={() => setActiveTab('predeparture')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'predeparture' ? 'bg-[#58051E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pre-Departure
          </button>
        </div>
      </div>

      {/* Students List */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading student caseload and journey milestones...</div>
      ) : filteredJourneys.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No students match your criteria</h3>
          <p className="text-xs text-slate-400">Try adjusting your search query or switching active filter tabs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredJourneys.map(journey => {
            const st = journey.student;
            const stuName = st.full_name || st.email?.split('@')[0] || 'Student Candidate';
            const stuId = st.id || 'STU';
            const primaryApp = journey.applications[0];
            const targetUni = primaryApp?.university_name || st.target_university || 'University Pending';
            const targetCourse = primaryApp?.course || st.target_course || 'Degree Program';
            const appStatus = primaryApp?.status || (st.country ? 'Profile Registered' : 'Onboarding');

            const verifiedDocsCount = journey.documents.filter(d =>
              String(d.status || '').toLowerCase().includes('approved') || String(d.status || '').toLowerCase().includes('verified')
            ).length;
            const totalDocsCount = journey.documents.length;

            const visaStage = journey.visaRecord?.current_stage || 0;
            const visaVerdict = journey.visaRecord?.decision_outcome || 'Pending';

            return (
              <Card
                key={stuId}
                className="p-5 border border-slate-200/80 shadow-xs hover:border-[#58051E]/40 hover:shadow-md transition-all space-y-4 bg-white rounded-2xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#58051E]/10 border border-[#58051E]/20 text-[#58051E] flex items-center justify-center shrink-0 font-black text-sm">
                      {stuName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-slate-900">{stuName}</h3>
                        <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded-full border border-[#58051E]/20">
                          {stuId.slice(0, 8)}
                        </span>
                        {st.email && (
                          <span className="text-[11px] font-medium text-slate-400 font-mono">
                            {st.email}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{targetUni}</span>
                        <span className="text-slate-300">•</span>
                        <span>{targetCourse}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-xs font-black text-[#58051E] bg-[#58051E]/10 px-3 py-1 rounded-full border border-[#58051E]/20 inline-block">
                      {appStatus}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                      Target Country: <strong className="text-slate-700">{st.country || st.target_country || 'Europe'}</strong>
                    </span>
                  </div>
                </div>

                {/* Micro Journey Status Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Documents Vault</span>
                    <span className="font-extrabold text-slate-900 block">
                      {totalDocsCount > 0 ? `${verifiedDocsCount}/${totalDocsCount} Verified` : 'No uploads yet'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Applications</span>
                    <span className="font-extrabold text-slate-900 block">
                      {journey.applications.length} Submissions
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Legalization</span>
                    <span className="font-extrabold text-slate-900 block">
                      {journey.nawaRecord ? `Step ${journey.nawaRecord.current_step || 1} / 4` : 'Not Lodged'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
                    <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Visa Tracker</span>
                    <span className="font-extrabold text-slate-900 block">
                      {visaVerdict === 'Approved' ? 'Visa Stamped' : visaStage > 0 ? `Stage ${visaStage} of 8` : 'Awaiting Filing'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold">
                  <span className="text-slate-400 text-[11px]">
                    Assigned Desk: <strong className="text-slate-700">{st.assigned_counselor || 'Senior Admissions Desk'}</strong>
                  </span>
                  <button
                    onClick={() => setSelectedJourney(journey)}
                    className="text-[#58051E] hover:text-[#430316] font-black hover:underline flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Eye className="w-4 h-4" /> Inspect Full Journey & Advisory Timeline →
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Comprehensive Full Student Journey Drawer */}
      <AnimatePresence>
        {selectedJourney && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950 z-40"
              onClick={() => setSelectedJourney(null)}
            />
            <motion.div
              initial={{ translateX: '100%' }}
              animate={{ translateX: 0 }}
              exit={{ translateX: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed top-0 right-0 h-screen w-full max-w-xl bg-white z-50 shadow-2xl overflow-y-auto text-left flex flex-col"
            >
              {/* Drawer Top Header */}
              <div className="p-6 bg-gradient-to-r from-[#58051E] to-[#3D0016] text-white flex items-start justify-between sticky top-0 z-10 shadow-sm">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider mb-2 border border-white/15">
                    <Compass className="w-3 h-3 text-amber-300" /> Full Journey Inspection
                  </div>
                  <h2 className="text-lg font-black text-white">
                    {selectedJourney.student.full_name || selectedJourney.student.email?.split('@')[0]}
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {selectedJourney.student.email} • ID: {selectedJourney.student.id?.slice(0, 8)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedJourney(null)}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6 flex-1">
                {/* 1. Student Profile Dossier */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-[#58051E]" /> Student Academic Profile
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">Target Country</span>
                      <span className="font-extrabold text-slate-900">{selectedJourney.student.country || selectedJourney.student.target_country || 'Europe'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">Intended Degree</span>
                      <span className="font-extrabold text-slate-900">{selectedJourney.student.target_course || 'Higher Education'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">Telephone / WhatsApp</span>
                      <span className="font-extrabold text-slate-900">{selectedJourney.student.phone || '+91 Unspecified'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10.5px]">Assigned Counselor</span>
                      <span className="font-extrabold text-slate-900">{selectedJourney.student.assigned_counselor || 'Senior Counselor Desk'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Interactive 6-Stage Journey Tracker */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center justify-between">
                    <span>6-Stage Application Milestone Progression</span>
                  </h4>

                  <div className="space-y-2.5 text-xs font-semibold">
                    {/* Stage 1: Registration */}
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-black text-slate-900 block">Stage 1: Student Account Registration</span>
                          <span className="text-[10.5px] text-slate-500">Student authenticated & GDPR consent acknowledged</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Completed
                      </span>
                    </div>

                    {/* Stage 2: Document Vault */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-[#58051E] shrink-0" />
                          <div>
                            <span className="font-black text-slate-900 block">Stage 2: Academic Transcripts & Document Vault</span>
                            <span className="text-[10.5px] text-slate-500">{selectedJourney.documents.length} files in repository</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full">
                          {selectedJourney.documents.length > 0 ? 'Uploaded' : 'Pending'}
                        </span>
                      </div>
                      {selectedJourney.documents.length > 0 && (
                        <div className="grid grid-cols-1 gap-1.5 pt-1 border-t border-slate-200/60">
                          {selectedJourney.documents.map((d, i) => (
                            <div key={i} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px]">
                              <span className="font-bold text-slate-800 truncate max-w-[220px]">{d.file_name || d.doc_type}</span>
                              <span className={`text-[9.5px] font-black uppercase px-2 py-0.2 rounded ${
                                String(d.status || '').toLowerCase().includes('approved') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
                              }`}>
                                {d.status || 'Under Review'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stage 3: University Application */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Building className="w-4 h-4 text-[#58051E] shrink-0" />
                          <div>
                            <span className="font-black text-slate-900 block">Stage 3: University Applications & Offer Letters</span>
                            <span className="text-[10.5px] text-slate-500">{selectedJourney.applications.length} official submissions</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full">
                          {selectedJourney.applications[0]?.status || 'Not Applied'}
                        </span>
                      </div>
                      {selectedJourney.applications.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                          {selectedJourney.applications.map((app, i) => (
                            <div key={i} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-black text-slate-900">{app.university_name || 'Partner University'}</span>
                                <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded">
                                  {app.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium">{app.course || 'Degree Program'}</p>
                              {app.offer_letter_url && (
                                <a
                                  href={app.offer_letter_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-700 hover:underline pt-0.5"
                                >
                                  <FileText className="w-3 h-3" /> View Official Offer Letter PDF →
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Stage 4: Legalization */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-[#58051E] shrink-0" />
                        <div>
                          <span className="font-black text-slate-900 block">Stage 4: Country Academic Legalization</span>
                          <span className="text-[10.5px] text-slate-500">
                            {selectedJourney.nawaRecord
                              ? `Step ${selectedJourney.nawaRecord.current_step || 1} / 4 — ${selectedJourney.nawaRecord.status || 'Active'}`
                              : 'Legalization docket pending lodgement'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full">
                        {selectedJourney.nawaRecord?.status || 'Awaiting'}
                      </span>
                    </div>

                    {/* Stage 5: VFS Visa */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Plane className="w-4 h-4 text-[#58051E] shrink-0" />
                          <div>
                            <span className="font-black text-slate-900 block">Stage 5: VFS Visa Filing & Embassy Evaluation</span>
                            <span className="text-[10.5px] text-slate-500">
                              {selectedJourney.visaRecord
                                ? `Milestone ${selectedJourney.visaRecord.current_stage || 1} of 8 — ${selectedJourney.visaRecord.status_label || 'In Progress'}`
                                : 'Awaiting VFS appointment booking'}
                            </span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          selectedJourney.visaRecord?.decision_outcome === 'Approved'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-slate-200 text-slate-800'
                        }`}>
                          {selectedJourney.visaRecord?.decision_outcome || 'Pending'}
                        </span>
                      </div>
                      {selectedJourney.visaRecord && (
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] font-semibold space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Consular Embassy:</span>
                            <span className="text-slate-800 font-bold">{selectedJourney.visaRecord.embassy_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">VFS Ref No:</span>
                            <span className="text-slate-800 font-mono font-bold">{selectedJourney.visaRecord.vfs_ref_no || 'Pending'}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Stage 6: Pre-Departure */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Compass className="w-4 h-4 text-[#58051E] shrink-0" />
                        <div>
                          <span className="font-black text-slate-900 block">Stage 6: Pre-Departure, Flight & Dorm Placement</span>
                          <span className="text-[10.5px] text-slate-500">
                            {selectedJourney.preDepartureRecord?.dorm_name || 'Campus room allotment in progress'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full">
                        {selectedJourney.preDepartureRecord?.clearance_status || 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Counselor Advisory Directive Box */}
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-[#58051E]" /> Issue Official Counselor Advisory Directive
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Directives logged here trigger immediate notifications to the student portal and are archived in the student's audit trail.
                  </p>
                  <textarea
                    rows={3}
                    placeholder="Type official guidance, interview prep notes, or document deficiency reminders for student..."
                    value={counselorNoteInput}
                    onChange={e => setCounselorNoteInput(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#58051E]/20 bg-slate-50 focus:bg-white"
                  />
                  <Button
                    size="sm"
                    className="w-full bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold py-2.5 cursor-pointer disabled:opacity-50"
                    disabled={isSavingNote || !counselorNoteInput.trim()}
                    onClick={handleSendDirective}
                  >
                    {isSavingNote ? 'Dispatching Directive...' : 'Send Official Directive to Student'}
                  </Button>
                </div>

                {/* 4. Historical Counselor Notes Log */}
                {selectedJourney.student.id && (
                  <div className="space-y-2 pt-2">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      Counselor Directive History
                    </h5>
                    {getSavedCounselorNotes(selectedJourney.student.id).length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No previous advisory directives recorded for this candidate.</p>
                    ) : (
                      <div className="space-y-2">
                        {getSavedCounselorNotes(selectedJourney.student.id).map((item: any) => (
                          <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                              <span>{item.counselor || 'Counselor'}</span>
                              <span>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="font-semibold text-slate-800">{item.note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
