import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, CheckCircle2, XCircle, X, RefreshCw, Sparkles, FileText, MessageSquare, AlertCircle, Clock } from 'lucide-react';
import { useDocuments } from '../../hooks/useDocuments';
import { useApplications } from '../../hooks/useApplications';
import { createNawaRecord } from '../../lib/api/nawa';
import { getStudents } from '../../lib/api/students';
import { getAllDocumentRequirements, calculateDossierStatus, type DocumentRequirement } from '../../lib/api/documentRequirements';
import { ToastNotification } from '../../components/ToastNotification';

type DocStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';

interface DocItem {
  id: string;
  studentId: string;
  studentName: string;
  docType: string;
  category: string;
  status: DocStatus;
  uploaded: string;
  size: string;
  comment?: string;
  fileUrl?: string;
}

const STATUS_COLORS: Record<DocStatus, string> = {
  'Submitted': 'bg-blue-50 text-blue-700 border-blue-200 font-bold',
  'Under Review': 'bg-amber-50 text-amber-700 border-amber-200 font-extrabold animate-pulse',
  'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold',
  'Rejected': 'bg-red-50 text-red-700 border-red-200 font-bold',
};

const normalizeDocStatus = (rawStatus: string, rawNotes?: string): DocStatus => {
  const s = (rawStatus || '').toLowerCase();
  const n = (rawNotes || '').toLowerCase();
  if (s.includes('verified') || s.includes('approved')) return 'Approved';
  if (s.includes('under review') || s.includes('underreview')) return 'Under Review';
  if (s.includes('reject') || s.includes('re-upload') || s.includes('reupload') || s.includes('request') || n.includes('re-upload') || n.includes('reupload')) {
    return 'Rejected';
  }
  return 'Submitted';
};

export const AdminDocumentReview: React.FC = () => {
  const { documents: dbDocs, changeStatus } = useDocuments();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const { applications: allApps } = useApplications();
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

  const [studentsMap, setStudentsMap] = useState<Record<string, { full_name: string; email: string }>>({});

  const refreshStudentsMap = React.useCallback(() => {
    getStudents().then(list => {
      if (list && Array.isArray(list)) {
        const map: Record<string, { full_name: string; email: string }> = {};
        list.forEach((s: any) => {
          if (s.id) {
            map[s.id] = {
              full_name: s.full_name || s.name || s.email?.split('@')[0] || 'Student',
              email: s.email || ''
            };
          }
        });
        setStudentsMap(map);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshStudentsMap();
    window.addEventListener('ferex_students_change', refreshStudentsMap);
    return () => {
      window.removeEventListener('ferex_students_change', refreshStudentsMap);
    };
  }, [refreshStudentsMap]);

  const getStudentCountry = React.useCallback((studentId?: string) => {
    if (!studentId) return 'ind';
    const app = allApps.find(a => a.student_id === studentId);
    const country = app?.universities?.country || (app as any)?.country;
    if (country && country.toLowerCase().trim() !== 'not set') return country.trim();
    return localStorage.getItem('ferex_student_target_country') || 'ind';
  }, [allApps]);

  const getDossierForStudent = React.useCallback((studentId: string, studentDocs: DocItem[]) => {
    const country = getStudentCountry(studentId);
    const countryNorm = country.toLowerCase().trim();
    const countryReqs = allRequirements.filter(r => {
      const c = r.country.toLowerCase().trim();
      return c === countryNorm ||
        ((countryNorm === 'ind' || countryNorm === 'india') && (c === 'ind' || c === 'india')) ||
        (countryNorm.includes('poland') && c === 'poland') ||
        (countryNorm.includes('germany') && c === 'germany') ||
        (countryNorm.includes('canada') && c === 'canada');
    });

    return {
      country,
      dossier: calculateDossierStatus(countryReqs, studentDocs)
    };
  }, [allRequirements, getStudentCountry]);

  useEffect(() => {
    if (dbDocs.length > 0) {
      const mapped = dbDocs.map(d => {
        const dbStudent = studentsMap[d.student_id] || (d as any).users;
        const resolvedName = dbStudent?.full_name || (d as any).student_name || dbStudent?.email?.split('@')[0] || 'Student';

        return {
          id: d.id,
          studentId: d.student_id || 'STU-1001',
          studentName: resolvedName,
          docType: d.file_name || d.doc_type || 'Document File',
          category: d.doc_type || 'Academic File',
          status: normalizeDocStatus(d.status, d.reviewer_notes),
          uploaded: new Date(d.uploaded_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          size: d.file_size || '1.2 MB',
          comment: d.reviewer_notes || '',
          fileUrl: d.file_url,
        };
      }).filter(d => {
        const sName = d.studentName.toLowerCase();
        if (sName.includes('jishi') || sName.includes('ajay') || sName.includes('navaneeth') || sName === 'rahul sharma') return false;
        if (d.studentId === 'f1ccbfe4-caa9-4f9c-b92c-e4f139e7b496') return false;
        return true;
      });
      setDocs(mapped);
    } else {
      setDocs([]);
    }
  }, [dbDocs, studentsMap]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewDoc, setViewDoc] = useState<DocItem | null>(null);
  const [toast, setToast] = useState('');

  // Re-upload Request Modal state
  const [reuploadModalDoc, setReuploadModalDoc] = useState<DocItem | null>(null);
  const [reuploadNotesInput, setReuploadNotesInput] = useState('');
  const [isSubmittingReupload, setIsSubmittingReupload] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const triggerReuploadModal = (docItem: DocItem) => {
    setReuploadNotesInput(docItem.comment || '');
    setReuploadModalDoc(docItem);
  };

  const updateStatus = async (id: string, newStatus: DocStatus, notes?: string) => {
    // If rejecting, ensure modal note popup is triggered
    if (newStatus === 'Rejected' && !notes) {
      const targetDoc = docs.find(d => d.id === id);
      if (targetDoc) {
        triggerReuploadModal(targetDoc);
        return;
      }
    }

    try {
      await changeStatus(id, newStatus as any, notes);
      setDocs(prev => prev.map(d => d.id === id ? { ...d, status: newStatus, comment: notes ?? d.comment } : d));
      if (viewDoc?.id === id) {
        setViewDoc(prev => prev ? { ...prev, status: newStatus, comment: notes ?? prev.comment } : null);
      }

      // If document is approved, automatically initiate Legalization process & student application in Supabase
      if (newStatus === 'Approved') {
        const targetDoc = docs.find(d => d.id === id);
        if (targetDoc && targetDoc.studentId) {
          try {
            await createNawaRecord({
              student_id: targetDoc.studentId,
              student_name: targetDoc.studentName,
              document_type: targetDoc.category || targetDoc.docType,
              notes: 'Mandatory documents verified. Legalization & admission initiation started.'
            });
            showToast(`Document approved & legalization initialized.`);
            return;
          } catch (e) {}
        }
      }

      showToast(`Document status updated to "${newStatus}".`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to update status'}`);
    }
  };

  const handleConfirmReuploadNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reuploadModalDoc) return;
    if (!reuploadNotesInput.trim()) {
      showToast('Re-upload reason notes are required for student instructions.');
      return;
    }

    try {
      setIsSubmittingReupload(true);
      const notes = reuploadNotesInput.trim();
      await changeStatus(reuploadModalDoc.id, 'Rejected' as any, notes);
      setDocs(prev => prev.map(d => d.id === reuploadModalDoc.id ? { ...d, status: 'Rejected', comment: notes } : d));
      if (viewDoc?.id === reuploadModalDoc.id) {
        setViewDoc(prev => prev ? { ...prev, status: 'Rejected', comment: notes } : null);
      }
      setReuploadModalDoc(null);
      showToast(`Re-upload request with notes sent to student.`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to send rejection'}`);
    } finally {
      setIsSubmittingReupload(false);
    }
  };

  const filtered = docs.filter(d =>
    (statusFilter === 'All' || d.status === statusFilter) &&
    (d.studentName.toLowerCase().includes(search.toLowerCase()) || d.docType.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase()))
  );

  const statusCounts = ['All', 'Submitted', 'Under Review', 'Approved', 'Rejected'].map(s => ({
    label: s, count: s === 'All' ? docs.length : docs.filter(d => d.status === s).length
  }));

  const [viewMode, setViewMode] = useState<'folders' | 'table'>('folders');
  const [selectedStudentFolder, setSelectedStudentFolder] = useState<string | null>(null);

  const studentFolders = React.useMemo(() => {
    const map = new Map<string, { studentId: string; studentName: string; docs: DocItem[] }>();
    docs.forEach(d => {
      const sKey = d.studentId || d.studentName;
      if (!map.has(sKey)) {
        map.set(sKey, { studentId: d.studentId, studentName: d.studentName, docs: [] });
      }
      map.get(sKey)!.docs.push(d);
    });
    return Array.from(map.values());
  }, [docs]);

  return (
    <div className="space-y-5 relative text-left">
      {/* Toast */}
      <ToastNotification message={toast} onClose={() => setToast('')} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Student Document Verification Hub</h1>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Review, verify, approve, or request re-uploads with mandatory reviewer notes
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('folders')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'folders' ? 'bg-[#58051E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📁 Student Folders ({studentFolders.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'table' ? 'bg-[#58051E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 All Documents Table ({docs.length})
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {statusCounts.map(({ label, count }) => (
          <button
            key={label}
            onClick={() => setStatusFilter(label)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${statusFilter === label ? 'bg-[#58051E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
              }`}
          >
            <span>{label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === label ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* FOLDER WORKSPACE VIEW */}
      {viewMode === 'folders' && (
        <div className="space-y-4">
          {selectedStudentFolder ? (
            /* Inside a specific student's folder */
            (() => {
              const currentFolder = studentFolders.find(f => (f.studentId || f.studentName) === selectedStudentFolder);
              if (!currentFolder) {
                return (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold">Student folder not found.</p>
                    <button onClick={() => setSelectedStudentFolder(null)} className="mt-2 text-xs font-bold text-[#58051E]">← Back to Student Folders</button>
                  </div>
                );
              }

              // Categorize documents
              const categories = [
                { name: 'Identification', label: 'Passport & Identity Proof', icon: '🛂' },
                { name: 'Academic', label: 'Degrees & Graduation Certificates', icon: '🎓' },
                { name: 'Transcripts', label: 'Academic Marksheets & Transcripts', icon: '📜' },
                { name: 'Language', label: 'Medium of Instruction (MOI) / English', icon: '🗣️' },
                { name: 'Financial', label: 'Bank Statement & Solvency Proof', icon: '💰' },
                { name: 'Insurance', label: 'Health Insurance & Medical', icon: '🏥' },
                { name: 'Other', label: 'Other Supporting Documents', icon: '📁' },
              ];

              const { country: currentFolderCountry, dossier: studentDossier } = getDossierForStudent(currentFolder.studentId, currentFolder.docs);

              return (
                <div className="space-y-4">
                  {/* Breadcrumb Navigation */}
                  <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentFolder(null)}
                        className="text-[#58051E] hover:underline flex items-center gap-1"
                      >
                        📁 All Students
                      </button>
                      <span className="text-slate-300">/</span>
                      <span className="text-slate-900 font-black">{currentFolder.studentName}</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-slate-500 font-semibold">Document Vault ({currentFolder.docs.length})</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedStudentFolder(null)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      ← Back to Folders
                    </button>
                  </div>

                  {/* Dossier Completeness Overview */}
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    studentDossier.isComplete
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/80 border-amber-200 text-amber-950'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {studentDossier.isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                      )}
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider">
                          {studentDossier.isComplete ? 'Dossier Status: Complete' : 'Dossier Status: Incomplete'}
                        </h3>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          {studentDossier.isComplete
                            ? `All ${studentDossier.mandatoryCount} mandatory document requirements for ${currentFolderCountry} are uploaded and ready for staff review.`
                            : `Student has uploaded ${studentDossier.uploadedMandatoryCount} of ${studentDossier.mandatoryCount} mandatory documents for ${currentFolderCountry}. Missing documents required.`}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border shrink-0 self-start sm:self-auto ${
                      studentDossier.isComplete
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {studentDossier.isComplete ? 'Ready to Verify' : `${studentDossier.missingMandatoryCount} Missing Mandatory Docs`}
                    </span>
                  </div>

                  {/* Configured Requirements Checklist for this country */}
                  {studentDossier.results.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">📋</span>
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                            {currentFolderCountry} Configured Requirements Checklist ({studentDossier.results.length})
                          </h3>
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-500">
                          {studentDossier.uploadedCount} / {studentDossier.totalCount} Uploaded
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {studentDossier.results.map(item => (
                          <div key={item.requirement.id} className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                            item.isSatisfied ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/40 border-amber-200'
                          }`}>
                            <div>
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <span className="font-extrabold text-xs text-slate-900">{item.requirement.document_name}</span>
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                                  item.requirement.is_required ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {item.requirement.is_required ? 'MANDATORY' : 'OPTIONAL'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 line-clamp-2">{item.requirement.description}</p>
                            </div>

                            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className={`text-[10px] font-black ${item.isSatisfied ? 'text-emerald-700' : 'text-amber-700'}`}>
                                {item.isSatisfied ? `✅ ${item.status}` : '❌ Missing'}
                              </span>
                              {item.doc && (
                                <button
                                  type="button"
                                  onClick={() => setViewDoc({
                                    id: item.doc.id,
                                    studentId: currentFolder.studentId,
                                    studentName: currentFolder.studentName,
                                    docType: item.doc.name || item.doc.file_name,
                                    category: item.doc.type || item.doc.doc_type,
                                    status: normalizeDocStatus(item.doc.status, item.doc.reviewer_notes),
                                    uploaded: item.doc.date || 'Recent',
                                    size: item.doc.size || '1 MB',
                                    comment: item.doc.reviewer_notes,
                                    fileUrl: item.doc.url || item.doc.file_url,
                                  })}
                                  className="text-[10px] font-bold text-[#58051E] hover:underline cursor-pointer"
                                >
                                  Inspect Doc →
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Folder Categories Grid */}
                  <div className="space-y-4">
                    {categories.map(cat => {
                      const catDocs = currentFolder.docs.filter(d =>
                        d.category.toLowerCase().includes(cat.name.toLowerCase()) ||
                        (cat.name === 'Other' && !categories.slice(0, 6).some(c => d.category.toLowerCase().includes(c.name.toLowerCase())))
                      );

                      if (catDocs.length === 0) return null;

                      return (
                        <div key={cat.name} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{cat.icon}</span>
                              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">{cat.label}</h3>
                            </div>
                            <span className="text-[10.5px] font-extrabold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                              {catDocs.length} {catDocs.length === 1 ? 'file' : 'files'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {catDocs.map(doc => (
                              <div
                                key={doc.id}
                                className="p-3.5 bg-slate-50 hover:bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-3 text-left"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-xs font-black text-slate-900 truncate" title={doc.docType}>
                                      {doc.docType}
                                    </h4>
                                    <span className={`text-[9.5px] px-2 py-0.5 rounded-md border shrink-0 ${STATUS_COLORS[doc.status]}`}>
                                      {doc.status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-semibold">
                                    Uploaded: {doc.uploaded} • {doc.size}
                                  </p>
                                  {doc.comment && (
                                    <p className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200/60 font-medium">
                                      <strong>Notes:</strong> {doc.comment}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                                  <button
                                    type="button"
                                    onClick={() => setViewDoc(doc)}
                                    className="text-xs font-extrabold text-[#58051E] hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View File
                                  </button>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => updateStatus(doc.id, 'Approved')}
                                      className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                                      title="Verify & Approve"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => triggerReuploadModal(doc)}
                                      className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
                                      title="Reject with Notes"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          ) : (
            /* Overview Grid of all Student Folders */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentFolders.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200 p-8">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-700">No Student Documents Found</h3>
                  <p className="text-xs text-slate-400 mt-1">Students will appear here once they upload verification documents.</p>
                </div>
              ) : (
                studentFolders.map(sf => {
                  const approvedCount = sf.docs.filter(d => d.status === 'Approved').length;
                  const underReviewCount = sf.docs.filter(d => d.status === 'Under Review' || d.status === 'Submitted').length;
                  const rejectedCount = sf.docs.filter(d => d.status === 'Rejected').length;

                  const { country: folderCountry, dossier: folderDossier } = getDossierForStudent(sf.studentId, sf.docs);

                  return (
                    <div
                      key={sf.studentId || sf.studentName}
                      onClick={() => setSelectedStudentFolder(sf.studentId || sf.studentName)}
                      className="bg-white rounded-2xl border border-slate-200 hover:border-[#58051E]/40 hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer group text-left"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#58051E]/10 text-[#58051E] flex items-center justify-center font-black text-sm group-hover:bg-[#58051E] group-hover:text-white transition-colors shrink-0">
                              {sf.studentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-slate-900 group-hover:text-[#58051E] transition-colors">
                                {sf.studentName}
                              </h3>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-400 font-mono">
                                  ID: {sf.studentId}
                                </span>
                                <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded uppercase">
                                  {folderCountry}
                                </span>
                              </div>
                              <div className="mt-1">
                                <span className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold border inline-block ${
                                  folderDossier.isComplete
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {folderDossier.isComplete
                                    ? '✅ Dossier Complete'
                                    : `⚠️ Incomplete (${folderDossier.uploadedMandatoryCount}/${folderDossier.mandatoryCount || 2} Req Docs)`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <span className="text-xs font-bold text-slate-400">
                            {sf.docs.length} docs
                          </span>
                        </div>

                        {/* Progress Stats */}
                        <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs">
                          <div>
                            <span className="text-[9.5px] font-black uppercase text-emerald-600 block">Approved</span>
                            <span className="font-extrabold text-emerald-700">{approvedCount}</span>
                          </div>
                          <div>
                            <span className="text-[9.5px] font-black uppercase text-amber-600 block">Pending</span>
                            <span className="font-extrabold text-amber-700">{underReviewCount}</span>
                          </div>
                          <div>
                            <span className="text-[9.5px] font-black uppercase text-rose-600 block">Action Req</span>
                            <span className="font-extrabold text-rose-700">{rejectedCount}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500">Student Folder</span>
                        <span className="font-extrabold text-[#58051E] group-hover:translate-x-0.5 transition-transform">
                          Open Folder →
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-xs">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, document title, or category..."
                className="w-full h-10 pl-9.5 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]/40"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/50">
                  {['Student', 'Document', 'Category', 'Status', 'Uploaded', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#58051E] flex items-center justify-center text-white text-[9px] font-extrabold shrink-0">
                          {d.studentName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="font-extrabold text-slate-900">{d.studentName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-800 max-w-[180px] truncate">{d.docType}</td>
                    <td className="px-5 py-4 text-slate-500 font-semibold">{d.category}</td>

                    <td className="px-5 py-4">
                      <select
                        value={d.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as DocStatus;
                          if (newStatus === 'Rejected') {
                            triggerReuploadModal(d);
                          } else {
                            updateStatus(d.id, newStatus);
                          }
                        }}
                        className={`h-8 px-2.5 rounded-lg text-[11px] font-bold border focus:outline-none cursor-pointer ${STATUS_COLORS[d.status]}`}
                      >
                        <option value="Submitted">Submitted</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected (Request Re-upload)</option>
                      </select>
                    </td>

                    <td className="px-5 py-4 text-slate-500 font-semibold">{d.uploaded}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewDoc(d)}
                          title="Preview Document & Notes"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-650 hover:bg-blue-50 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateStatus(d.id, 'Under Review')}
                          title="Mark Under Review"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all cursor-pointer"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateStatus(d.id, 'Approved')}
                          title="Approve Document"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => updateStatus(d.id, 'Rejected')}
                          title="Reject & Request Re-upload"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-sm font-semibold text-slate-400">No documents match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MANDATORY RE-UPLOAD FEEDBACK NOTES MODAL */}
      <AnimatePresence>
        {reuploadModalDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setReuploadModalDoc(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Request Document Re-upload</h3>
                    <p className="text-xs font-bold text-slate-400">{reuploadModalDoc.studentName} · {reuploadModalDoc.docType}</p>
                  </div>
                </div>
                <button onClick={() => setReuploadModalDoc(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleConfirmReuploadNotes} className="space-y-4">
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs font-semibold text-blue-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <span>Please provide detailed instructions for the student regarding why a re-upload is required.</span>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1.5">
                    Admin Feedback & Re-upload Instructions *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={reuploadNotesInput}
                    onChange={(e) => setReuploadNotesInput(e.target.value)}
                    placeholder="e.g. Passport scan is blurry. Please re-upload a clear high-resolution color scan of pages 1 and 2."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button type="button" onClick={() => setReuploadModalDoc(null)} className="h-9 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                  <button type="submit" disabled={isSubmittingReupload} className="h-9 px-5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 shadow-xs flex items-center gap-1.5">
                    {isSubmittingReupload ? 'Sending...' : 'Send Re-upload Request & Notes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Drawer */}
      <AnimatePresence>
        {viewDoc && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50" onClick={() => setViewDoc(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[440px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900">Document Review</h3>
                <button onClick={() => setViewDoc(null)} className="p-2 rounded-full hover:bg-slate-50 text-slate-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="w-full min-h-[220px] max-h-[360px] bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-2 relative overflow-hidden">
                  {viewDoc.fileUrl ? (
                    viewDoc.fileUrl.match(/\.(jpg|jpeg|png|webp|gif)($|\?)/i) || viewDoc.fileUrl.startsWith('data:image') ? (
                      <img src={viewDoc.fileUrl} alt={viewDoc.docType} className="max-w-full max-h-[260px] object-contain rounded-lg shadow-xs" />
                    ) : (
                      <iframe
                        src={viewDoc.fileUrl}
                        title={viewDoc.docType}
                        className="w-full h-64 border-0 rounded-xl bg-white"
                      />
                    )
                  ) : (
                    <div className="text-center p-4">
                      <FileText className="w-12 h-12 text-[#58051E]/40 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">Compliance Document File Registered</p>
                      <p className="text-[10px] text-slate-400 mt-1">{viewDoc.docType}</p>
                    </div>
                  )}
                  {viewDoc.fileUrl && (
                    <div className="pt-2">
                      <button
                        onClick={async () => {
                          const { getSignedFileUrl } = await import('../../lib/storage');
                          const signed = await getSignedFileUrl('student-documents', viewDoc.fileUrl || '');
                          if (signed) window.open(signed, '_blank');
                        }}
                        className="px-3.5 py-1.5 bg-[#58051E] text-white text-xs font-bold rounded-lg hover:bg-[#430316] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Open Full Screen / Download
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'Student', value: viewDoc.studentName },
                    { label: 'Document', value: viewDoc.docType },
                    { label: 'Category', value: viewDoc.category },
                    { label: 'Uploaded', value: viewDoc.uploaded },
                    { label: 'Current Status', value: viewDoc.status },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase">{label}</span>
                      <span className="text-xs font-bold text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>

                {viewDoc.comment && (
                  <div className="p-3 bg-[#58051E]/5 border border-[#58051E]/20 rounded-xl">
                    <p className="text-[10px] font-extrabold text-[#58051E] uppercase tracking-wider mb-1 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Admin Feedback Notes
                    </p>
                    <p className="text-xs font-semibold text-slate-800">{viewDoc.comment}</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { updateStatus(viewDoc.id, 'Approved'); }}
                    className="h-9 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => { updateStatus(viewDoc.id, 'Rejected'); }}
                    className="h-9 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 flex items-center justify-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
                <button onClick={() => { triggerReuploadModal(viewDoc); }}
                  className="w-full h-9 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Request Re-upload (Add Notes)
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
