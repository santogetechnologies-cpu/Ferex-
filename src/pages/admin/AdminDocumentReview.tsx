import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, CheckCircle2, XCircle, RefreshCw, X, FileText } from 'lucide-react';

type DocStatus = 'Pending' | 'Approved' | 'Rejected' | 'Re-upload Requested';

interface DocRecord {
  id: string; studentId: string; studentName: string;
  docType: string; category: string; status: DocStatus; uploaded: string; size: string; comment: string;
}

const DOCS: DocRecord[] = [
  { id: 'DOC-001', studentId: 'FX-2026-001', studentName: 'Ashly', docType: 'Passport', category: 'Identity', status: 'Pending', uploaded: 'Aug 1, 2026', size: '1.2 MB', comment: '' },
  { id: 'DOC-002', studentId: 'FX-2026-002', studentName: 'Rahul Mehta', docType: 'IELTS Certificate', category: 'Language', status: 'Approved', uploaded: 'Jul 28, 2026', size: '0.8 MB', comment: '' },
  { id: 'DOC-003', studentId: 'FX-2026-003', studentName: 'Priya Sharma', docType: 'Academic Transcript', category: 'Academic', status: 'Pending', uploaded: 'Aug 2, 2026', size: '1.7 MB', comment: '' },
  { id: 'DOC-004', studentId: 'FX-2026-004', studentName: 'Amir Hassan', docType: "Bachelor's Degree", category: 'Academic', status: 'Approved', uploaded: 'Jul 20, 2026', size: '2.1 MB', comment: '' },
  { id: 'DOC-005', studentId: 'FX-2026-005', studentName: 'Fatima Al-Rashid', docType: 'Passport Photo', category: 'Identity', status: 'Re-upload Requested', uploaded: 'Jul 15, 2026', size: '0.3 MB', comment: 'Photo resolution is too low. Please re-upload a high-resolution image.' },
  { id: 'DOC-006', studentId: 'FX-2026-006', studentName: 'Carlos Rivera', docType: 'Bank Statement', category: 'Financial', status: 'Pending', uploaded: 'Aug 3, 2026', size: '0.9 MB', comment: '' },
  { id: 'DOC-007', studentId: 'FX-2026-007', studentName: 'Nadia Kowalski', docType: 'Curriculum Vitae', category: 'Professional', status: 'Rejected', uploaded: 'Jul 10, 2026', size: '0.4 MB', comment: 'CV does not meet the university format requirements.' },
  { id: 'DOC-008', studentId: 'FX-2026-008', studentName: 'Yusuf Al-Farsi', docType: 'Recommendation Letter', category: 'Academic', status: 'Pending', uploaded: 'Aug 4, 2026', size: '0.5 MB', comment: '' },
];

const STATUS_COLORS: Record<DocStatus, string> = {
  'Pending': 'bg-amber-50 text-amber-700 border-amber-100',
  'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Rejected': 'bg-red-50 text-red-700 border-red-100',
  'Re-upload Requested': 'bg-blue-50 text-blue-700 border-blue-100',
};

export const AdminDocumentReview: React.FC = () => {
  const [docs, setDocs] = useState(DOCS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewDoc, setViewDoc] = useState<DocRecord | null>(null);
  const [commentText, setCommentText] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const filtered = docs.filter(d =>
    (statusFilter === 'All' || d.status === statusFilter) &&
    (d.studentName.toLowerCase().includes(search.toLowerCase()) || d.docType.toLowerCase().includes(search.toLowerCase()))
  );

  const updateStatus = (id: string, status: DocStatus, comment = '') => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, status, comment: comment || d.comment } : d));
    setViewDoc(null);
  };

  const statusCounts = ['All', 'Pending', 'Approved', 'Rejected', 'Re-upload Requested'].map(s => ({
    label: s, count: s === 'All' ? docs.length : docs.filter(d => d.status === s).length
  }));

  return (
    <div className="space-y-5 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}

      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Documents Review</h1>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">Verify and manage student documents</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pending', count: docs.filter(d => d.status === 'Pending').length, color: 'text-amber-600 bg-amber-50' },
          { label: 'Approved', count: docs.filter(d => d.status === 'Approved').length, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Rejected', count: docs.filter(d => d.status === 'Rejected').length, color: 'text-red-600 bg-red-50' },
          { label: 'Re-upload', count: docs.filter(d => d.status === 'Re-upload Requested').length, color: 'text-blue-600 bg-blue-50' },
        ].map(({ label, count, color }) => (
          <div key={label} className={`${color} border border-current/10 rounded-2xl p-4`}>
            <p className="text-2xl font-extrabold">{count}</p>
            <p className="text-[10px] font-extrabold uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {statusCounts.map(({ label, count }) => (
          <button key={label} onClick={() => setStatusFilter(label)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-[10px] font-extrabold border transition-all
              ${statusFilter === label ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            {label} <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${statusFilter === label ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
          </button>
        ))}
        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-300 focus:outline-none focus:border-[#6A1B2E]/40 w-52" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-xs min-w-[700px]">
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
                    <div>
                      <p className="font-extrabold text-slate-900">{d.studentName}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{d.studentId}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#6A1B2E] shrink-0" />
                    <p className="font-bold text-slate-800">{d.docType}</p>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-500 font-semibold">{d.category}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[d.status]}`}>{d.status}</span>
                </td>
                <td className="px-5 py-4 text-slate-500 font-semibold">{d.uploaded}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { setViewDoc(d); setCommentText(''); }} title="Preview" className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Eye className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { updateStatus(d.id, 'Approved'); showToast(`${d.docType} approved!`); }} title="Approve" className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { updateStatus(d.id, 'Rejected'); showToast(`${d.docType} rejected.`); }} title="Reject" className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"><XCircle className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { updateStatus(d.id, 'Re-upload Requested', 'Please re-upload a clearer version.'); showToast('Re-upload requested.'); }} title="Request Re-upload" className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all"><RefreshCw className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View/Review Drawer */}
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
                {/* Preview simulation */}
                <div className="w-full h-44 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-3">
                  <FileText className="w-14 h-14 text-[#6A1B2E]/25" />
                  <p className="text-xs font-bold text-slate-400">Document Preview — {viewDoc.docType}</p>
                  <p className="text-[10px] font-semibold text-slate-400">{viewDoc.size}</p>
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
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider mb-1">Previous Comment</p>
                    <p className="text-xs font-semibold text-amber-800">{viewDoc.comment}</p>
                  </div>
                )}

                {/* Comment for rejection / re-upload */}
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">Add Review Comment</label>
                  <div className="flex gap-2">
                    <textarea rows={2} value={commentText} onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Enter a comment for the student..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40 resize-none" />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { updateStatus(viewDoc.id, 'Approved'); showToast('Document approved!'); }}
                    className="h-9 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => { updateStatus(viewDoc.id, 'Rejected', commentText); showToast('Document rejected.'); }}
                    className="h-9 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 flex items-center justify-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
                <button onClick={() => { updateStatus(viewDoc.id, 'Re-upload Requested', commentText || 'Please re-upload the document.'); showToast('Re-upload requested.'); }}
                  className="w-full h-9 border border-[#6A1B2E]/30 text-[#6A1B2E] text-xs font-bold rounded-xl hover:bg-[#6A1B2E]/5 flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Request Re-upload
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
