import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, CheckCircle2, Upload, X, Folder, Eye, Check, XCircle, Clock, AlertCircle, Search } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useDocuments } from '../../hooks/useDocuments';
import { useAuth } from '../../contexts/AuthContext';
import { getStudents } from '../../lib/api/students';

export const StaffDocuments: React.FC = () => {
  const { user } = useAuth();
  const { documents: dbDocs, loading, changeStatus, addDoc } = useDocuments();
  const [students, setStudents] = useState<any[]>([]);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [rejectionModalDoc, setRejectionModalDoc] = useState<any | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    getStudents().then(setStudents).catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Map documents with student names
  const documentsList = useMemo(() => {
    const studentMap = new Map(students.map(s => [s.id, s.full_name || s.email?.split('@')[0] || 'Student']));

    return dbDocs.map(d => {
      const studentName = studentMap.get(d.student_id) || (d as any).users?.full_name || (d as any).student_name || 'Student Candidate';
      const rawStatus = (d.status || 'Pending').toLowerCase();
      
      let normStatus = 'Pending Review';
      if (rawStatus.includes('verified') || rawStatus.includes('approved')) normStatus = 'Approved';
      else if (rawStatus.includes('reject') || rawStatus.includes('re-upload')) normStatus = 'Rejected';
      else if (rawStatus.includes('under review')) normStatus = 'Under Review';
      else if (rawStatus.includes('submitted')) normStatus = 'Pending Review';

      return {
        id: d.id,
        rawDoc: d,
        title: d.file_name || d.doc_type || 'Document File',
        student: studentName,
        studentId: d.student_id,
        category: d.doc_type || 'Academic File',
        status: normStatus,
        notes: d.reviewer_notes || '',
        size: d.file_size || '1.2 MB',
        date: new Date(d.uploaded_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        url: d.file_url || '',
      };
    });
  }, [dbDocs, students]);

  // Dynamic Folder Categories
  const folderCategories = useMemo(() => {
    const counts = {
      sop: documentsList.filter(d => d.category.toLowerCase().includes('sop') || d.category.toLowerCase().includes('statement') || d.category.toLowerCase().includes('transcript')).length,
      identity: documentsList.filter(d => d.category.toLowerCase().includes('identity') || d.category.toLowerCase().includes('passport') || d.category.toLowerCase().includes('id')).length,
      financial: documentsList.filter(d => d.category.toLowerCase().includes('financial') || d.category.toLowerCase().includes('bank') || d.category.toLowerCase().includes('solvency')).length,
      language: documentsList.filter(d => d.category.toLowerCase().includes('language') || d.category.toLowerCase().includes('ielts') || d.category.toLowerCase().includes('toefl') || d.category.toLowerCase().includes('certificate')).length,
    };

    return [
      { key: 'sop', name: 'Academic Transcripts & SOPs', count: counts.sop, color: 'text-amber-600 bg-amber-50 border-amber-200' },
      { key: 'identity', name: 'Passport & Identity Scans', count: counts.identity, color: 'text-blue-600 bg-blue-50 border-blue-200' },
      { key: 'financial', name: 'Financial Solvency & Banks', count: counts.financial, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
      { key: 'language', name: 'Language & Certificates', count: counts.language, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    ];
  }, [documentsList]);

  const tabs = ['All', 'Pending Review', 'Under Review', 'Approved', 'Rejected'];

  const filteredDocs = useMemo(() => {
    return documentsList.filter(d => {
      const matchesTab = activeTab === 'All' || d.status === activeTab;
      const matchesSearch = !searchQuery ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesFolder = true;
      if (selectedFolder === 'sop') {
        matchesFolder = d.category.toLowerCase().includes('sop') || d.category.toLowerCase().includes('statement') || d.category.toLowerCase().includes('transcript');
      } else if (selectedFolder === 'identity') {
        matchesFolder = d.category.toLowerCase().includes('identity') || d.category.toLowerCase().includes('passport') || d.category.toLowerCase().includes('id');
      } else if (selectedFolder === 'financial') {
        matchesFolder = d.category.toLowerCase().includes('financial') || d.category.toLowerCase().includes('bank') || d.category.toLowerCase().includes('solvency');
      } else if (selectedFolder === 'language') {
        matchesFolder = d.category.toLowerCase().includes('language') || d.category.toLowerCase().includes('ielts') || d.category.toLowerCase().includes('toefl') || d.category.toLowerCase().includes('certificate');
      }

      return matchesTab && matchesSearch && matchesFolder;
    });
  }, [documentsList, activeTab, searchQuery, selectedFolder]);

  const handleApprove = async (doc: any) => {
    try {
      setIsProcessing(true);
      await changeStatus(doc.id, 'Approved', 'Verified by Admissions Counselor');
      showToast(`✅ "${doc.title}" for ${doc.student} approved!`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to approve document'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionModalDoc) return;
    try {
      setIsProcessing(true);
      const notes = rejectionNote.trim() || 'Re-upload requested: please provide a clearer scan with valid stamps.';
      await changeStatus(rejectionModalDoc.id, 'Re-upload Requested', notes);
      showToast(`✕ Re-upload requested for "${rejectionModalDoc.title}"`);
      setRejectionModalDoc(null);
      setRejectionNote('');
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to reject document'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 text-left antialiased select-none min-h-[600px]">
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
            <FileText className="w-5 h-5 text-[#6A1B2E]" /> Document Verification Workspace
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Review student visa files, academic transcripts, bank solvency letters, and apostille authentications.</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedFolder && (
            <button
              onClick={() => setSelectedFolder(null)}
              className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
            >
              <X className="w-3.5 h-3.5" /> Clear Folder Filter
            </button>
          )}
        </div>
      </div>

      {/* Folder Experience Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {folderCategories.map((folder) => {
          const isSelected = selectedFolder === folder.key;
          return (
            <Card
              key={folder.key}
              className={`p-4 border transition-all flex items-center gap-3 cursor-pointer ${
                isSelected ? 'ring-2 ring-[#6A1B2E] bg-rose-50/40 border-[#6A1B2E]' : 'border-slate-200/80 shadow-xs hover:shadow-md'
              }`}
              onClick={() => setSelectedFolder(isSelected ? null : folder.key)}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold border ${folder.color}`}>
                <Folder className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 line-clamp-1">{folder.name}</h4>
                <span className="text-[10px] text-slate-400 font-bold block">{folder.count} Documents</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Controls: Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === tab ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search documents or student..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#6A1B2E]/20"
          />
        </div>
      </div>

      {/* Main Document Table */}
      <Card className="p-6 border border-slate-200/80 shadow-xs space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs font-bold text-slate-400">Loading student documents...</div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-12 text-center text-xs font-bold text-slate-400 space-y-1">
            <p>No documents found matching your criteria.</p>
            <p className="text-[11px] text-slate-300 font-normal">Student uploads will appear here in real-time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase text-slate-400">
                  <th className="py-2.5 px-3">Document Title</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Category / Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Verification Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3">
                      <div className="font-extrabold text-slate-900">{doc.title}</div>
                      <span className="text-[10px] text-slate-400">{doc.id.slice(0, 8)} • {doc.size}</span>
                      {doc.notes && (
                        <p className="text-[10.5px] text-slate-500 italic mt-0.5">Note: {doc.notes}</p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800">{doc.student}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10.5px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">{doc.category}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{doc.date}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black inline-block ${
                        doc.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        doc.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold flex items-center gap-1 transition-all"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        {doc.status !== 'Approved' && (
                          <button
                            onClick={() => handleApprove(doc)}
                            disabled={isProcessing}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-bold flex items-center gap-1 transition-all"
                          >
                            <Check className="w-3 h-3" /> Approve
                          </button>
                        )}
                        {doc.status !== 'Rejected' && (
                          <button
                            onClick={() => { setRejectionModalDoc(doc); setRejectionNote(doc.notes || ''); }}
                            disabled={isProcessing}
                            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10.5px] font-bold flex items-center gap-1 transition-all"
                          >
                            <XCircle className="w-3 h-3" /> Request Re-upload
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Rejection / Re-upload Request Modal */}
      <AnimatePresence>
        {rejectionModalDoc && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setRejectionModalDoc(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">Request Document Re-upload</h3>
                <button onClick={() => setRejectionModalDoc(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <span className="font-bold">{rejectionModalDoc.title}</span> for <span className="font-bold">{rejectionModalDoc.student}</span>
              </div>

              <form onSubmit={handleRejectSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Reason / Instructions for Student</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Please upload higher resolution scan with visible university seal/apostille..."
                    value={rejectionNote}
                    onChange={e => setRejectionNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setRejectionModalDoc(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold" disabled={isProcessing}>
                    Send Re-upload Request
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setPreviewDoc(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{previewDoc.title}</h3>
                  <p className="text-xs text-slate-500">{previewDoc.student} • {previewDoc.category}</p>
                </div>
                <button onClick={() => setPreviewDoc(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
                <FileText className="w-12 h-12 text-[#6A1B2E] mx-auto opacity-80" />
                <div>
                  <p className="text-xs font-black text-slate-800">{previewDoc.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Status: <span className="font-bold">{previewDoc.status}</span></p>
                </div>
                {previewDoc.url ? (
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6A1B2E] text-white text-xs font-bold hover:bg-[#521221] transition-all"
                  >
                    Open Document File ↗
                  </a>
                ) : (
                  <span className="text-xs text-slate-400 italic">No direct file URL attached.</span>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
