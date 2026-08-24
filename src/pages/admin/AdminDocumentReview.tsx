import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, CheckCircle2, XCircle, X, RefreshCw, Sparkles, FileText, MessageSquare, AlertCircle, Clock } from 'lucide-react';
import { useDocuments } from '../../hooks/useDocuments';
import { createNawaRecord } from '../../lib/api/nawa';

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

  useEffect(() => {
    if (dbDocs.length > 0) {
      const mapped = dbDocs.map(d => ({
        id: d.id,
        studentId: d.student_id || 'STU-1001',
        studentName: d.users?.full_name || d.users?.email?.split('@')[0] || 'Student',
        docType: d.file_name || d.doc_type || 'Document File',
        category: d.doc_type || 'Academic File',
        status: normalizeDocStatus(d.status, d.reviewer_notes),
        uploaded: new Date(d.uploaded_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        size: '1.2 MB',
        comment: d.reviewer_notes || '',
        fileUrl: d.file_url,
      }));
      setDocs(mapped);
    } else {
      setDocs([]);
    }
  }, [dbDocs]);

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

      // If document is approved, automatically initiate NAWA process & student application in Supabase
      if (newStatus === 'Approved') {
        const targetDoc = docs.find(d => d.id === id);
        if (targetDoc && targetDoc.studentId) {
          try {
            await createNawaRecord({
              student_id: targetDoc.studentId,
              student_name: targetDoc.studentName,
              document_type: targetDoc.category || targetDoc.docType,
              notes: 'Mandatory documents verified. NAWA legalization & admission initiation started.'
            });
            showToast(`🎉 Document approved & NAWA legalization + student application initiated!`);
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
      showToast('⚠️ Re-upload reason notes are required for student instructions.');
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
      showToast(`🎉 Re-upload/rejection request with notes sent to student!`);
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

  return (
    <div className="space-y-5 relative text-left">
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

      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Student Document Verification Hub</h1>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">Review, verify, approve, or request re-uploads with mandatory reviewer notes</p>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {statusCounts.map(({ label, count }) => (
          <button
            key={label}
            onClick={() => setStatusFilter(label)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${statusFilter === label ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
              }`}
          >
            <span>{label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === label ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, document title, or category..."
            className="w-full h-10 pl-9.5 pr-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40"
          />
        </div>
      </div>

      {/* Table */}
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
                    <div className="w-7 h-7 rounded-lg bg-[#6A1B2E] flex items-center justify-center text-white text-[9px] font-extrabold shrink-0">
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
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-650 hover:bg-blue-50 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateStatus(d.id, 'Under Review')}
                      title="Mark Under Review"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateStatus(d.id, 'Approved')}
                      title="Approve Document"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateStatus(d.id, 'Rejected')}
                      title="Reject & Request Re-upload"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
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
                <div className="w-full h-44 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-3">
                  <FileText className="w-14 h-14 text-[#6A1B2E]/25" />
                  <p className="text-xs font-bold text-slate-400">Document Preview — {viewDoc.docType}</p>
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
                  <div className="p-3 bg-[#6A1B2E]/5 border border-[#6A1B2E]/20 rounded-xl">
                    <p className="text-[10px] font-extrabold text-[#6A1B2E] uppercase tracking-wider mb-1 flex items-center gap-1">
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
